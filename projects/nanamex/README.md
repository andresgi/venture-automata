# Clin (Nanamex)

Web application for Clin — connecting families with niñeras in México. Next.js (App
Router) + TypeScript, single deployable (no separate backend/mobile client). See
`engineering/architecture.md` for the full architecture and `engineering/
implementation-plan.md` for the build plan.

## Local development

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # fill in real values — see "Supabase environments" below
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run lint          # ESLint
npm run typecheck     # next typegen + tsc --noEmit (TypeScript strict mode)
npm run test          # Vitest
npm run build          # next build (production build)
npm run check:secrets # scripts/check-no-public-secrets.mjs — no server-only key exposed client-side
```

CI (`.github/workflows/nanamex-ci.yml` at the repo root) runs all five on every pull
request that touches this project, plus a separate `migrations` job (below).

## Supabase environments

Per `engineering/architecture.md` §13, the intended split is `development` / `preview` /
`production`, each its own Supabase project (prod and preview never share a DB). Current
provisioning status (see `agent/DECISIONS.md` — E0-02 and the 2026-09-03 "E0-06
prerequisites" entry for the human decisions behind this):

| Environment | Status | Project ref | Region |
|---|---|---|---|
| `development` | **Provisioned** | `nanamex-dev` — `rgqncanghlvlzrzlgkzi` | South America (São Paulo) |
| `preview` | **Provisioned** | `nanamex-preview` — `okbwvbwxfywwvqaqpgcx` | South America (São Paulo) |
| `production` | **Not created** — Vercel Production env uses `nanamex-dev`'s credentials for now | — | — |

`nanamex-preview` was created for E0-06 (all 9 migrations pushed and confirmed applied via
`supabase migration list --linked`; its `zonas` table has the correct schema but has not
been seeded — same known gap already noted for `nanamex-dev` in earlier stories, not fixed
by this one either).

There is still no dedicated `nanamex-prod` project. Per the human's E0-06 direction, the
Vercel **Production** environment is deliberately configured to use `nanamex-dev`'s
Supabase credentials in the meantime. **This is an explicitly flagged, temporary
placeholder, not a permanent decision** — a real `nanamex-prod` project (never sharing a
database with `nanamex-dev`/`nanamex-preview`) must be provisioned and re-pointed before
`RELEASE_GATE`.

## Deployment (Vercel)

The app is deployed on Vercel (`engineering/architecture.md` §7, §13). Current state as of
E0-06 (2026-09-03):

- **Project:** `nanamex`, under the `andres-projects-5977be21` Vercel account/team.
- **Git integration:** connected to `github.com/andresgi/venture-automata` (this monorepo).
  **Root Directory** is set to `projects/nanamex` so Vercel builds only this subdirectory
  instead of trying to build from the monorepo root.
- **Production branch:** `main`.
- **Preview deployments:** every PR against `main` gets an automatic preview deployment
  (Vercel comments the preview URL directly on the PR — `gitComments.onPullRequest` is
  enabled). Preview deployments run against the `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` env
  vars scoped to `nanamex-preview` (see below). Verified for E0-06 with a real deploy: a
  manual `vercel deploy` produced a live preview URL that returned real app HTML when
  fetched with a deployment-protection bypass token (previews sit behind Vercel's default
  Deployment Protection / SSO, so an unauthenticated fetch gets a 302 to
  `vercel.com/sso-api` — expected behavior for a private, pre-launch project, not a broken
  deployment; any team member, or a request carrying a bypass token, can reach it).
- **Production deploys are a manual promotion, never automatic on merge to `main`.**
  Mechanism: the project's **Ignored Build Step** (Project Settings → Git) is set to
  (quoted verbatim, exactly as configured):
  ```
  if [ "$VERCEL_ENV" == "production" ]; then echo "Skipping automatic production deploy — production is a manual promotion (E0-06)."; exit 0; else exit 1; fi
  ```
  Per Vercel's own documentation, exit code `0` skips the build and exit code `1`+ lets it
  proceed — this command gates every deployment build regardless of how it was triggered
  (Git push, CLI, or API): when the target environment is `production` the build is
  skipped (deployment marked "Ignored", nothing goes live), so a push/merge to `main`
  cannot silently put a new build into production. The only way to actually release is
  `vercel promote <deployment-url-or-id>`, which re-aliases an already-built deployment
  (e.g. the preview build that was already reviewed on the merged PR) onto the production
  domain without triggering a new build — a genuine manual promotion step, not a rebuild.
  - **Verified logic, but disclosing an actual production-target deployment attempt made
    during this story's own setup.** While configuring this project (see full account
    below), one of my own CLI commands — run before I'd corrected my working directory —
    was itself targeted at `production` by Vercel and failed for an unrelated reason
    before the Ignored Build Step could even run. No content was ever built or served from
    it (confirmed: `curl` against the production alias returns `404
    DEPLOYMENT_NOT_FOUND`). See "Incident: an accidental production-target deployment
    during E0-06 setup" below for the full timeline, root cause, and why this specific
    failure mode is not expected to recur on a genuine GitHub-triggered build.

### Incident: an accidental production-target deployment during E0-06 setup

While building this story, two deployments were created for the brand-new `nanamex`
project, 27 seconds apart, both via the Vercel CLI (`source: "cli"` in both deployments'
metadata, confirmed via the Vercel API — neither was a GitHub-triggered auto-deploy):

1. `dpl_J9m4DuwYNfsAosVLKeVZrNju7fLS` — **`target: "production"`**, status **Error**,
   created first. This was my own `npx vercel deploy --yes` command, run (at that point in
   the story) from `projects/nanamex/` — i.e. before I had realized that Root Directory
   resolution requires deploying from the actual git repository root (see below) and had
   switched to doing that. It failed immediately with `"The specified Root Directory
   'projects/nanamex' does not exist. Please update your Project Settings"` — a file-setup
   error that happens before the Ignored Build Step is ever evaluated. **No build ran, no
   alias was ever updated** (`vercel inspect` shows `Builds: [0ms]`; `curl -I` against both
   the deployment URL and the project's production alias returns `404
   DEPLOYMENT_NOT_FOUND`) — nothing was ever served to the internet from this deployment.
2. `dpl_AsV7898sEapJNPfv7tFF1iPLGEJs` — `target: null` (preview), status **Ready**, created
   27 seconds later. This was the corrected `npx vercel deploy --yes`, run from the actual
   monorepo root (with a throwaway `.vercel/project.json` copied there so the CLI would
   upload the full repository tree, exactly as a Git-triggered clone would) — this is the
   deployment cited elsewhere in this doc as the working preview verification.

**Why deployment #1 targeted `production` at all** (I did not pass `--prod`, and the
current git branch was the feature branch `nanamex/e0-06-vercel-deployment`, not `main`):
both deployments' metadata show an identical, *correctly detected*
`meta.githubCommitRef: "nanamex/e0-06-vercel-deployment"` — ruling out branch
mis-detection as the cause. The one substantive difference between the two CLI invocations
is that deployment #1 was the **very first deployment ever created for this brand-new
project** (moments after `vercel link` created it), and deployment #2 was the second. This
matches Vercel's documented platform behavior that a new project's first deployment is
automatically assigned as the Production Deployment regardless of branch, so a project has
an initial production deployment to alias its primary domain to. This was not a
deliberate test of the manual-promotion mechanism, not a git-integration auto-deploy race,
and not caused by an inverted or misconfigured Ignored Build Step — it is a one-time
side effect of how a brand-new Vercel project's very first CLI deployment is classified,
combined with an unrelated Root Directory resolution error (below) that happened to fail
it before anything could be served.

**Why the Root Directory error itself occurred, and why it is CLI-specific, not a
Git-integration risk:** `vercel deploy` run from a subdirectory uploads only that
subdirectory's contents as the deployment's source tree (confirmed by the deployment's own
`meta.gitRootDirectory: "projects/nanamex"` on the failed deployment, vs. `""` on the
corrected one) — it does not upload the full repository. With Project Settings' Root
Directory set to `projects/nanamex`, the build step then looks for a `projects/nanamex`
directory *inside* that already-scoped-down upload, which does not exist, hence the error.
This is purely an artifact of where a human/agent happens to run `vercel deploy` locally
relative to the actual git root — it **cannot occur** for a genuine GitHub-triggered
deployment (preview-on-PR or a hypothetical production build), because Vercel's Git
integration always starts from a full clone of the repository at its root and applies Root
Directory against that complete tree, the same way the corrected, repo-root-run CLI
deployment above did (and succeeded). The "confirm the first real merge to `main` shows
status Ignored" verification step (above) still stands as originally planned — this
Root-Directory failure mode is not expected to be the reason it shows anything other than
"Ignored".

**Preventive note:** always run `vercel deploy`/`vercel` CLI commands for this project from
the monorepo root (`venture-automata/`), not from `projects/nanamex/`, given the configured
Root Directory. `projects/nanamex/.vercel/project.json` remains the canonical link (created
by `vercel link`); a temporary link was also placed at the monorepo root for this
verification and removed afterward — recreate it the same way (copy
`projects/nanamex/.vercel/project.json` to `venture-automata/.vercel/project.json`, both
paths are `.gitignore`d) if a root-run CLI deploy is needed again.
- **Environment variables set (Vercel dashboard/CLI, not committed):**

  | Variable | Production | Preview | Development |
  |---|---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | `nanamex-dev` | `nanamex-preview` | `nanamex-dev` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `nanamex-dev` | `nanamex-preview` | `nanamex-dev` |
  | `SUPABASE_URL` | `nanamex-dev` | `nanamex-preview` | `nanamex-dev` |
  | `SUPABASE_SERVICE_ROLE_KEY` | `nanamex-dev` | `nanamex-preview` | `nanamex-dev` |

  `CRON_SECRET`, `STRIPE_*`, `TWILIO_*`, `RESEND_API_KEY`, `NEXT_PUBLIC_POSTHOG_*`, and
  `SENTRY_DSN` are **not set** in any Vercel environment yet — confirmed `next build`
  succeeds without any of them (every read of these vars in `lib/` is lazy, inside a
  function body, not at module load time), and no real values exist for any of them yet (no
  Stripe/Twilio/Resend/PostHog/Sentry account has real credentials as of this story — same
  state as local dev). Set them per-environment once each service is actually wired with
  real credentials, rather than filling in placeholder-looking values now.
- **Requires human/GitHub-UI action:** none currently — `vercel link` connected the GitHub
  repository automatically without hitting a Vercel GitHub App permissions wall. If a
  future PR's preview deployment doesn't trigger, check that the Vercel GitHub App still
  has access to `andresgi/venture-automata` under
  https://github.com/settings/installations.

### Migrations pipeline

- **Canonical directory:** `db/migrations` (per `engineering/architecture.md` §2/§13).
  `supabase/migrations` is a symlink to `../db/migrations` — the Supabase CLI hardcodes
  `supabase/migrations` by convention with no way to relocate it, so the symlink lets the
  CLI operate on the architecture-mandated path instead of maintaining two copies.
- **Local development:** `supabase start` (Docker) then `supabase db reset --local` applies
  every migration in `db/migrations` to a fresh local Postgres instance. Local dev ports
  are shifted to the `55xxx` range in `supabase/config.toml` to avoid clashing with other
  Supabase projects run locally on the same machine.
- **Hosted (`nanamex-dev`):** `supabase link --project-ref rgqncanghlvlzrzlgkzi` once, then
  `supabase db push --linked` applies pending migrations to the real hosted dev project.
  Verified manually for E0-02 (`20260902000001_bootstrap_extensions.sql`) and again for
  E0-03 (`20260902000002`–`20260902000007`, core schema + security hardening) — `supabase
  migration list --linked` confirms all seven migrations as applied remotely. Note:
  `supabase db push` only pushes migrations, not seed data — `db/seed.sql` has been
  verified locally/in CI (below) but not run against the hosted `nanamex-dev` project's
  data.
- **CI:** the `migrations` job in `.github/workflows/nanamex-ci.yml` runs
  `supabase start` + `supabase db reset --local` against a fresh, ephemeral local stack on
  every PR, then queries `zonas` to assert the seed produced a non-zero row count — no
  hosted secrets needed in CI, and it's a genuine "clean instance" test each run.
- **Seed data (E0-03):** `db/seed.sql` (symlinked as `supabase/seed.sql`, same convention as
  migrations) seeds the `zonas` reference table — Monterrey's launch-city municipios (per
  `agent/DECISIONS.md` 2026-09-02) plus a representative subset of well-known colonias, each
  with an approximate real-world centroid. Runs automatically as the last step of
  `supabase db reset` (`[db.seed]` enabled in `supabase/config.toml`); idempotent via
  `ON CONFLICT DO NOTHING` against `zonas`' unique `(ciudad, alcaldia_municipio, colonia)`
  index, so re-running it is always safe.

## Repository layout

Per `engineering/architecture.md` §2 (single-project Next.js layout, no monorepo tooling):

- `app/` — Next.js App Router routes.
- `actions/` — server actions, grouped by domain.
- `lib/` — domain logic (matching engine, entitlement rules, auth helpers, Supabase
  clients).
- `db/` — SQL migrations and seed data.
- `emails/` — React Email templates.
- `components/` — UI components.
- `tests/` — unit + integration tests (Vitest + React Testing Library).

## Notes

- `next.config.ts` sets `agentRules: false`. This repo is nested under
  `projects/nanamex/` in a monorepo that relies on Claude Code's directory-walk-up to
  inherit the shared `AGENTS.md`/`CLAUDE.md` from the repo root. Next.js 16's `next dev`
  otherwise auto-writes its own `AGENTS.md`/`CLAUDE.md` into this directory, which would
  shadow the inherited framework files — keep this disabled.

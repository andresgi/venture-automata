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
provisioning status (E0-02, see `agent/DECISIONS.md` for the human decision behind this):

| Environment | Status | Project ref | Region |
|---|---|---|---|
| `development` | **Provisioned** | `nanamex-dev` — `rgqncanghlvlzrzlgkzi` | South America (São Paulo) |
| `preview` | **Deferred** — not created | — | — |
| `production` | **Deferred** — not created | — | — |

`preview` and `production` were deliberately not provisioned yet: the org this venture's
Supabase projects live in already contains two unrelated pre-existing projects, and
creating a 3rd project succeeded without Supabase's usual free-tier "upgrade required"
prompt — suggestive that the org is already on a paid plan where each additional project
adds ongoing compute cost, which couldn't be confirmed programmatically. The human decided
to defer `preview`/`production` until that's resolved, and scope E0-02 to `nanamex-dev`
only. **Do not assume `preview`/`production` exist** in any later story (e.g. E0-06 Vercel
deployment pipeline) until this is revisited — there is no `nanamex-preview` or
`nanamex-prod` project, ref, or URL to point anything at yet.

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
  Verified manually for E0-02: `db/migrations/20260902000001_bootstrap_extensions.sql`
  applied cleanly (`supabase migration list --linked` confirms it as applied remotely).
- **CI:** the `migrations` job in `.github/workflows/nanamex-ci.yml` runs
  `supabase start` + `supabase db reset --local` against a fresh, ephemeral local stack on
  every PR — no hosted secrets needed in CI, and it's a genuine "clean instance" test each
  run.

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

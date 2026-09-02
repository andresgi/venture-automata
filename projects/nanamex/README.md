# Clin (Nanamex)

Web application for Clin — connecting families with niñeras in México. Next.js (App
Router) + TypeScript, single deployable (no separate backend/mobile client). See
`engineering/architecture.md` for the full architecture and `engineering/
implementation-plan.md` for the build plan.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen + tsc --noEmit (TypeScript strict mode)
npm run test        # Vitest
npm run build        # next build (production build)
```

CI (`.github/workflows/nanamex-ci.yml` at the repo root) runs all four on every pull
request that touches this project.

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

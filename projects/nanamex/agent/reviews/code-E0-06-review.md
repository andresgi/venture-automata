# Code Review — E0-06 Vercel deployment pipeline (preview + production)

Reviewed against `main` (E0-01–E0-05 merged). This story is infra/config + docs only — no
application code changed. Review method: independently re-verified the Developer's claims
directly against the live Vercel project via the authenticated `vercel` CLI/API (not just
reading the docs), and against Vercel's own published documentation for the Ignored Build
Step exit-code convention. No secret values are reproduced in this report; comparisons
across environments were done via SHA-256 hashing or by comparing public project refs
(already published in `README.md`).

## Verdict

**PASS**

(Initial pass verdict was **REVISE**, for one Important issue: an undisclosed
production-target deployment attempt in the live Vercel history that contradicted the
documented "never tested" claim. The Developer investigated and corrected the
documentation; see "Targeted Re-Review" below, where I independently re-verified the
root-cause explanation against raw Vercel API metadata rather than trusting the writeup.
That verification confirms the correction is accurate, so the verdict is upgraded to PASS.)

The core safety mechanism (Ignored Build Step logic) is objectively correct against
Vercel's documented convention, and env var scoping/project linkage are all independently
confirmed accurate. The one factual gap found in the first pass (an undisclosed
production-target deployment attempt) has been investigated, root-caused, independently
corroborated against Vercel API metadata, and accurately disclosed in the documentation.

## Critical Issues

None. No evidence of a live/public production exposure, and no fundamental architectural
defect in the chosen mechanism.

## Important Issues

None remaining. (Originally: an undisclosed production-target deployment attempt
contradicted the documented "not tested" claim — see "Targeted Re-Review" for how this was
resolved and independently re-verified.)

## Minor Issues

None remaining. (Originally: the quoted `commandForIgnoringBuildStep` in the docs omitted
the live command's `echo` line — the Developer's fix now quotes it verbatim; independently
reconfirmed against the live Vercel API value.)

## Security Observations

- Preview deployments are correctly gated by Vercel's default Deployment Protection/SSO:
  independently confirmed an unauthenticated `curl` of the preview URL, and separately of
  the errored production-target deployment's own raw URL, both return `302` to
  `vercel.com/sso-api` with a `_vercel_sso_nonce` cookie — matches documented behavior and
  is appropriate for a private, pre-launch project.
- No secrets are committed to the repo; env vars are Vercel-managed only, matching
  `CLAUDE.md`/`AGENTS.md`'s "never commit secrets" rule.
- Independently confirmed via `vercel env ls` + `vercel env pull` (values compared via
  SHA-256 hash, never printed) that:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_URL` /
    `SUPABASE_SERVICE_ROLE_KEY` are set for exactly Production, Preview, and Development —
    no more, no fewer.
  - Preview's values point to `nanamex-preview` (ref `okbwvbwxfywwvqaqpgcx`) — distinct
    anon-key hash from Production/Development.
  - Production and Development both point to `nanamex-dev` (ref `rgqncanghlvlzrzlgkzi`) —
    identical anon-key hash, confirming Production is indeed (temporarily) reusing dev
    credentials, exactly as flagged in the docs. This is an already-approved, explicitly
    tracked pre-RELEASE_GATE gap (see `agent/DECISIONS.md`), not a silent shortcut.
  - Stripe/Twilio/Resend/PostHog/Sentry vars are confirmed absent from all three Vercel
    environments — matches the claim that no real credentials exist yet for those services.
- The production-target deployment that failed during initial setup (see "Targeted
  Re-Review") never resulted in publicly servable content: independently reconfirmed the
  production alias (`https://nanamex-andres-projects-5977be21.vercel.app`) returns `404
  DEPLOYMENT_NOT_FOUND`, and the raw failed-deployment URL itself is gated by the same
  Deployment Protection SSO redirect as any other deployment — no PII, secrets, or
  unreviewed code was ever exposed by it.
- I did not print any secret value at any point in this review; `SUPABASE_SERVICE_ROLE_KEY`
  and the Preview/Production `SUPABASE_URL` (configured as Vercel "Secret" type) could not
  even be pulled as plaintext by the CLI I used (shown as `[SENSITIVE]` placeholders).

## Test Coverage Observations

- No application code changed, so the existing suite (83 tests, per Developer's report) is
  unaffected by this story — appropriate scope for a pure infra/config change.
- The core acceptance criterion ("production deploy is a manual promotion, never automatic
  on merge to `main`") is inherently not unit-testable — it's a platform-configuration
  behavior. The compensating control (manually checking deployment status shows "Ignored"
  at the first real merge to `main`) remains the right control and is unaffected by this
  review's findings — the incident investigated here was root-caused to something else
  entirely (a CLI-local partial-tree upload issue plus new-project first-deploy
  auto-classification) and confirmed not to recur for Git-triggered builds.

## Acceptance Criteria Assessment

1. **"Every PR gets a working preview URL against the preview Supabase project."** — **PASS**.
   Independently verified: a `Ready` preview deployment exists; `gitComments.onPullRequest`
   is `true` on the live project (Vercel will comment the preview URL on PRs); the Preview
   environment's Supabase env vars are scoped to `nanamex-preview` (confirmed via ref
   comparison and anon-key hash, distinct from dev/prod); curling the preview URL returns
   the expected Deployment-Protection redirect (not an error), consistent with a working
   deployment behind SSO.

2. **"Production deploy is a manual promotion, never automatic on merge to `main`."** —
   **PASS**. The configured mechanism's logic is verified correct against Vercel's own
   documented Ignored Build Step convention (Vercel Knowledge Base, "How do I use the
   Ignored Build Step field on Vercel?": *"If the command returns 0, the build will be
   skipped. If a code 1 or greater is returned, then a new deployment will be built."* —
   the project's script exits `0` when `VERCEL_ENV == production` and `1` otherwise, which
   is exactly correct, not inverted). The one piece of evidence that initially looked like
   it might undermine this (an undisclosed production-target deployment in the project's
   history) has been root-caused and independently re-verified against raw Vercel API
   deployment metadata (see "Targeted Re-Review"): it was an unrelated CLI-local Root
   Directory resolution failure that occurred before the Ignored Build Step logic ever ran,
   not evidence of a misconfigured or inverted gate, and it never resulted in any content
   being served. The residual gap — the production-skip *branch specifically* has still
   never been observed succeeding end-to-end on a real deployment — is a pre-existing,
   already human-approved deferral (`agent/DECISIONS.md`, 2026-09-03 "production-skip
   mechanism accepted on documented behavior, not live-tested"), to be closed out at the
   first real merge to `main`, and is not a defect introduced by or discovered in this
   story.

3. **Validation: "a test PR produces a working preview deployment."** — **PASS**.
   Independently confirmed via the live Vercel project (not just the Developer's report): a
   real, `Ready` preview deployment exists, correctly gated by Deployment Protection, using
   `nanamex-preview` credentials.

## Required Changes

None outstanding. Both items from the first review pass are resolved and independently
re-verified (see below):

1. ~~Disclose the production-target deployment attempt and its cause.~~ Resolved:
   `README.md`/`architecture.md` now contain an "Incident: an accidental production-target
   deployment during E0-06 setup" section with both deployment IDs, root cause, and the
   404 confirmation. `agent/DECISIONS.md` has a corrected, accurate entry.
2. ~~Determine whether the Root Directory failure could recur on a genuine GitHub-triggered
   build.~~ Resolved: confirmed CLI-local-only (partial-tree upload from a subdirectory),
   cannot recur on a Git-triggered build (always a full repo clone). Consistent with
   general Vercel Git-integration behavior; nothing found that contradicts this.
3. ~~Quote `commandForIgnoringBuildStep` verbatim.~~ Resolved: doc now matches the live API
   value exactly (including the `echo` line), independently reconfirmed.

## Targeted Re-Review (after Developer's investigation)

Per the Developer's report, I independently re-verified the root-cause explanation against
raw Vercel API deployment metadata (not just the writeup), rather than accepting it at face
value:

- `dpl_J9m4DuwYNfsAosVLKeVZrNju7fLS` (the failed one): `source: "cli"`, `creator:
  "andresgi"`, `target: "production"`, `readyState: "ERROR"`, `meta.gitRootDirectory:
  "projects/nanamex"`, `meta.githubCommitRef: "nanamex/e0-06-vercel-deployment"`, created
  `2026-09-03T05:13:11.885Z`.
- `dpl_AsV7898sEapJNPfv7tFF1iPLGEJs` (the successful one): `source: "cli"`, `creator:
  "andresgi"`, `target: null` (preview), `readyState: "READY"`, `meta.gitRootDirectory:
  ""`, `meta.githubCommitRef: "nanamex/e0-06-vercel-deployment"` (**identical** to the
  failed deployment — rules out branch mis-detection as an alternative explanation),
  created `2026-09-03T05:13:38.242Z` (26.4s after the failed one).

This independently confirms every specific, checkable claim in the Developer's writeup:
both were CLI-sourced deploys by the same user off the same non-`main` feature branch (so
`target: production` cannot be explained by branch detection — consistent with "first
deployment of a brand-new project is auto-classified Production" being the actual cause);
the only meaningful metadata difference between them is `gitRootDirectory` (empty vs.
`projects/nanamex`), consistent with "ran from the wrong subdirectory the first time,
correctly from the repo root the second time." I also reconfirmed the production alias
still returns `404 DEPLOYMENT_NOT_FOUND`, and that the raw failed-deployment URL is gated
by the standard Deployment Protection SSO redirect (not serving content) — no exposure.

The updated `README.md`, `architecture.md`, and `agent/DECISIONS.md` were read in full and
accurately reflect what the metadata shows: both deployment IDs are cited correctly, the
root cause matches the independently-observed metadata, the "cannot recur on a
Git-triggered build" claim is consistent with standard Vercel Git-integration behavior, and
the 404/no-exposure confirmation is accurate. The `commandForIgnoringBuildStep` quote was
independently reconfirmed to match the live API value verbatim.

No further changes required. This story can be marked VERIFIED.

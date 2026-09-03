# Code Review

Story: E1-02 — AUTH-02/03 registration + verification (familia)
Branch: `nanamex/e1-02-registration-verification` vs `main`
Reviewer: independent Code Reviewer (no production code modified)

## Verdict

PASS

## Scope-reduction legitimacy check (done first, since it gates the whole review)

The story's literal acceptance criteria in `engineering/implementation-plan.md` (lines
105–114) require: (a) a family may proceed to FAM-01/necesidad creation before completing
both verifications, and (b) both are required before `Contactar` succeeds, enforced
server-side in E5's entitlement check.

Independently confirmed, not just taken on the Developer's word:

- `app/familia/page.tsx` is still the E0-04 placeholder ("Contenido completo llega en una
  historia de BUILD posterior") — FAM-01 (E1-03) and FAM-02 do not exist yet. `grep -rn
  "Contactar|entitlement"` across the whole app (excluding `.next`/`node_modules`) returns
  no matches outside this story's own note/test copy — E5-01's entitlement check genuinely
  does not exist yet.
- `agent/DECISIONS.md` (the 2026-09-02 E0-04 entry) explicitly redefines the soft-gate
  split (correo hard-gate at login, teléfono soft-gate) and states "E1-02 should build
  against teléfono-only soft-gating; correo-gating is already fully handled by E0-04's
  login flow and needs no further E1-02 work" — this is a recorded human/orchestrator
  decision, not the Developer unilaterally narrowing scope.

Given FAM-01 and the entitlement check are genuinely unbuildable today (their owning
stories, E1-03 and E5-01, haven't landed), scoping E1-02 down to "make teléfono a real
soft gate on `/verificar` itself, using what the app can currently do (redirect into the
still-placeholder role home)" is the correct and only buildable interpretation. This is not
the Developer dodging real work — it's the orchestrator's own recorded decision. Legitimate.

## Critical Issues

None.

## Important Issues

None.

## Minor Issues

1. `app/verificar/page.tsx` h1 is "Verifica tu cuenta" (line 51, unchanged by this diff)
   while `design/UI-SPEC.md` AUTH-03 (line 54) specifies "Confirma tus datos de contacto."
   Pre-existing from E0-04, not touched by this story's diff — flagging only for whichever
   story next touches this screen's copy, not a defect in this delivery.
2. The correo row still renders as a static "Correo verificado" line with no "Reenviar
   correo" action (UI-SPEC line 51-53 documents both checklist rows having a resend/verify
   action). Pre-existing from E0-04 and consistent with `agent/DECISIONS.md`'s E0-04
   redefinition ("correo-gating ... needs no further E1-02 work" — a session literally
   cannot exist with correo unconfirmed, so there is nothing to resend from this screen).
   Not a defect of this story.
3. `tests/app/verificar.test.tsx` mocks `@/lib/supabase/server` and
   `@/lib/supabase/auth-server` inline per-file rather than via a shared test helper — minor
   duplication against `tests/actions/auth.test.ts`'s similar mock shape, but trivial and
   consistent with the codebase's existing per-file mock convention (`tests/proxy.test.ts`
   does the same). Not worth abstracting for one extra file.

## Security Observations

- Confirmed independently (not just per Developer's description) that route-level
  authorization is genuinely role-only: `proxy.ts` (lines 34-40) selects only `role` from
  `profiles`, and `lib/auth/route-access.ts`'s `resolveRouteAccess` (lines 34-57) branches
  only on `currentRole` vs. the requested path's role prefix — `phone_verified` is never
  read or referenced anywhere in the routing/authorization path. There is no
  client-only enforcement risk here: the soft-gate is a genuine product decision reflected
  correctly at the only layer (routing) that could have defeated it, and the new
  "Continuar" link is a plain navigation `<a>` with no client-side state to bypass in the
  first place (nothing to "hack around" — the destination was never blocked server-side).
- `app/verificar/page.tsx` correctly keeps the hard redirect-to-`/login` for no session
  (line 30-32) and the correct role-home redirect once `phone_verified` is true (line 45-47)
  — no regression to the correo hard-gate or to the already-verified-teléfono fast path.
- No secrets, no new logging of PII, no new external calls introduced by this diff.

## Test Coverage Observations

`tests/app/verificar.test.tsx` (new, 5 tests) genuinely exercises the real Server Component
end-to-end (imports the actual `@/app/verificar/page` module, mocks only the two
Supabase-touching seams — session lookup and profile lookup — matching the established
`tests/proxy.test.ts`/`tests/actions/auth.test.ts` pattern), not a trivial rendering smoke
test:

- familia + `phone_verified: false` → no redirect fires, "Continuar" link present with
  `href="/familia"`, and the exact soft-gate note text is present (regex match against the
  literal UI-SPEC copy).
- Confirms "Verificar" (OTP submit) and "Continuar" (soft-gate link) are distinct,
  non-confusable controls on the same render (queries by accessible role, not raw text —
  correctly distinguishes a `button` from a `link` with the same/adjacent copy).
- niñera + unverified → "Continuar" points at `/ninera` (role-branching covered, not just
  the familia case named in the story title).
- `phone_verified: true` → still redirects straight to role home (regression guard on the
  pre-existing fast path — correctly proves the new code didn't disturb it).
- No session → redirects to `/login` (regression guard on the correo hard-gate entry).

Verified independently that the button-label rename ("Continuar" → "Verificar" in
`components/auth/phone-verification-form.tsx` line 130) does not break any pre-existing
test: `grep -n "Continuar|Verificar" tests/actions/phone-verification.test.ts
tests/actions/auth.test.ts` returns no matches — neither file asserts on button label text
(they test the server actions, not component markup), and there is no dedicated
`phone-verification-form` component test file that could have referenced the old label.
Ran the full suite myself: `npx vitest run` → 93/93 passed across 11 files, matching the
Developer's report exactly. Also independently ran `npx tsc --noEmit` (clean) and
`npx eslint` on the three changed/added files (clean).

One coverage gap worth naming (not blocking): there's no test asserting the new
"Continuar" link is *absent* of any `disabled`-like affordance or conditional wrapper —
the test only checks it's present and has the right href when unverified. Given the code
is a plain always-rendered `<a>` with no conditional around it (confirmed by direct
reading of `app/verificar/page.tsx` lines 76-87 — it sits after the early-return
`redirect()` at line 45-47, so if it renders at all, it's unconditionally there), this is a
theoretical gap only, not a real risk.

## Acceptance Criteria Assessment

Against the story's actual (orchestrator-scoped) delivered scope, not the epics-away
literal AC in implementation-plan.md:

1. Correo confirmation remains a hard gate at login, unchanged — PASS (verified no diff
   touched E0-04's login/auth-confirm flow; `agent/DECISIONS.md` confirms this needed no
   E1-02 work).
2. Teléfono verification is a genuine soft gate: a logged-in familia/niñera user with
   `phone_verified: false` is not redirected away from proceeding into the app — PASS
   (confirmed both via direct reading of `route-access.ts`/`proxy.ts`, which never consult
   `phone_verified`, and via `tests/app/verificar.test.tsx`'s explicit
   `expect(redirectMock).not.toHaveBeenCalled()` assertion).
3. `/verificar` exposes a primary "Continuar" action, per UI-SPEC AUTH-03, enabled/present
   regardless of teléfono status, routing to the correct role home, with the specified
   explanatory note — PASS (`app/verificar/page.tsx` lines 76-87; note text is a literal
   match to UI-SPEC's copy, not just paraphrase).
4. The OTP-submit action is disambiguated from the soft-gate "Continuar" action (no longer
   mislabeled) — PASS (`components/auth/phone-verification-form.tsx` line 130 now reads
   "Verificar"/"Verificando…", matching UI-SPEC's own literal spec text for that row's
   action, which was actually a pre-existing spec violation this fix corrects).
5. No regression to already-verified-teléfono fast path or no-session redirect — PASS
   (both explicitly covered by new tests and unchanged in the diff).
6. Deferred items (FAM-01, `Contactar`/entitlement server-side enforcement, "cuenta no
   verificada" banner) are genuinely out of reach given current codebase state, not
   silently-skipped in-scope work — PASS (independently confirmed: `/familia` is still an
   E0-04 placeholder, no `Contactar`/entitlement code exists anywhere in the app, and the
   "cuenta no verificada" banner per `design/UX-spec.md` line 189-194 is an app-home/
   dashboard-level concern (FAM-02/NIN-03) that doesn't exist as real content yet either).

No FAIL or UNCERTAIN items identified.

## Required Changes

None. This is ready to move forward as VERIFIED for its scoped acceptance criteria. The
minor items above are informational for future stories (E1-03/FAM-01 copy pass, FAM-02/
NIN-03 banner integration) and do not require rework of this diff.

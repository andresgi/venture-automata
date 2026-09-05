# Visual QA — E7-03 / NIN-08 Identidad + TrustBadge large variant

## Method and limitations

Final independent source-level review after the replacement-link touch-target fix. Compared `components/ninera/identity-upload.tsx`, `components/shared/trust-badge.tsx`, `app/ninera/perfil/identificacion/page.tsx`, and the E7-01 entry in `components/ninera/perfil-ninera-wizard.tsx` against `design/UX-spec.md`, `design/UI-SPEC.md`, and `design/UI-SYSTEM.md`. Responsive utility behavior was checked for 375, 430, 768, and 1440px. Browser screenshots, authenticated browser fixtures, and native camera/gallery chooser interaction were unavailable.

`config/CONSTRAINTS.md` confirms web-only V1 with agent-driven web QA; the manual native-mobile QA stop does not apply.

## Final verdict

**PASS_WITH_LIMITATIONS**

The replacement-link fix is present and verified: `Reemplazar documento` retains low-weight underlined styling while adding `min-h-11`, providing the required 44px action target. No remaining user-visible implementation defects were found in the requested source-level review.

## Findings

No findings. The previous touch-target finding is resolved.

## Passed checks / coverage

- **375/430px:** camera-first mobile path; `Tomar foto` primary and `Subir desde galería` secondary, both full-width `min-h-11` controls.
- **768px:** mobile/tablet camera/gallery path remains active; desktop drop zone is hidden until the `lg` breakpoint.
- **1440px:** camera/gallery controls are hidden; desktop drag/drop zone and `Seleccionar archivo` path are shown.
- **Preview/progress:** valid selection creates a stable fixed-height `h-48` preview region, preserves the image during submission, disables upload controls, and exposes an inline progressbar with “Subiendo…”.
- **Errors/retry:** client validation has warning icon, alert semantics, danger treatment, and retains controls; server failures retain the preview and expose `Intentar de nuevo`; invalid files do not expose misleading retry.
- **Status states:** no verificada, rejected/resubmit, en proceso read-only with 24–48h SLA, and verificada read-only with replacement action are represented and hierarchically ordered as specified.
- **TrustBadge large:** 48px icon, large label hierarchy, stable large geometry, and invariant Circle/Clock/filled ShieldCheck plus neutral/amber/teal semantics and tooltip behavior are present.
- **E7-01 entry:** `Subir ahora` routes to `/ninera/perfil/identificacion` and has a `min-h-11` primary target.
- **Replacement action:** `Reemplazar documento` now has `min-h-11` while preserving the approved low-visual-weight text-link treatment.

## Validation evidence

- Focused component suite: **PASS** — 5 tests.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**.

## Limitations

I could not perform pixel-level browser rendering at the four widths, exercise real camera/gallery chooser behavior, observe actual upload latency/image decoding, or render authenticated fixtures for every status in a browser. Source/tests cover the responsive ordering, state branching, preview/progress, error/retry, TrustBadge semantics, replacement target, and E7-01 route wiring. Document retention/deletion policy and admin review UI remain intentionally out of scope (E12/E8) and must be resolved before production collection of real identity documents.

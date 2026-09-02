# Screen Inventory — Clin (Nanamex)

Full behavioral specs (content hierarchy, inputs, actions, validation, system responses,
exit paths, states, responsive behavior) live in `design/UX-spec.md`. This document is the
canonical ID list and one-line purpose for every required V1 screen, grouped by role
prefix, matching `design/information-architecture.md`'s page hierarchy.

Prefixes: **AUTH** (shared, pre-role), **FAM** (familia), **NIN** (niñera), **ADM** (admin),
**SYS** (cross-cutting system screens).

## AUTH — Shared entry

| ID | Screen | Purpose |
|---|---|---|
| AUTH-01 | Landing | Marketing/entry point; role selection (Soy familia / Soy niñera) |
| AUTH-02 | Registro | Account creation, role-specific fields |
| AUTH-03 | Verificación de correo/teléfono | OTP + email-link verification; soft gate — not required to create a necesidad, but required before contacting a candidate (paid action) |
| AUTH-04 | Login | Returning-user sign-in |
| AUTH-05 | Recuperar contraseña | Password reset flow |

## FAM — Familia

| ID | Screen | Purpose |
|---|---|---|
| FAM-01 | Onboarding perfil familiar | Minimal post-registro profile (nombre, zona) |
| FAM-02 | Mis necesidades (dashboard) | List of created vacantes + pipeline summary per vacante; home screen |
| FAM-03 | Crear necesidad (wizard) | Multi-step form: niños (rango de edad), zona, días/horarios, modalidad, rango de pago, fecha de inicio, responsabilidades |
| FAM-04 | Listado de candidatas | Ranked, filterable list of matched niñeras for one necesidad, with Match Score + verification-status badge |
| FAM-05 | Filtros (panel/bottom sheet) | Zona, modalidad, rango de pago, disponibilidad refinement over FAM-04 |
| FAM-06 | Perfil de niñera (detail) | Full candidate profile: experience, disponibilidad, referencias (self-reported, visually distinct), verification-status badge, Match Score detail |
| FAM-07 | Favoritas | Saved niñeras across all necesidades |
| FAM-08 | Paywall / Desbloquear contacto | Contact-gate moment: MX$299/30-day offer, triggered by "Contactar"/"Solicitar entrevista" |
| FAM-09 | Checkout / Confirmación de pago | Payment flow (mechanics owned by TECH_ARCHITECTURE spike); success/failure states |
| FAM-10 | Solicitar entrevista | Post-unlock action to formally request contact/interview, including a one-time message field to the candidate (not an ongoing chat/thread — see PRD section 9 non-goal) |
| FAM-11 | Estado de candidatas (pipeline) | Nueva → Contactada → Entrevista → Contratada/Descartada, per necesidad |
| FAM-12 | Reportar niñera | Report form (reason category + detail) |
| FAM-13 | Cuenta | Verification status, entitlement/payment history, security settings |

## NIN — Niñera

| ID | Screen | Purpose |
|---|---|---|
| NIN-01 | Onboarding perfil (paso 1) | Fotografía, zona de trabajo, años de experiencia |
| NIN-02 | Completar perfil (paso 2) | Disponibilidad, expectativa salarial, modalidades, descripción, referencias |
| NIN-03 | Inicio (dashboard) | Verification status (incl. pending-verification state), % perfil completo, recent oportunidades |
| NIN-04 | Oportunidades recibidas | Pushed matches list (passive model), Match Score + checklist (niñera-facing) |
| NIN-05 | Explorar vacantes | Self-serve browse/search of open vacantes (UX Decision #1) |
| NIN-06 | Detalle de vacante | Anonymized family/vacante detail (from Explorar or Oportunidades) + "Mostrar interés" |
| NIN-07 | Mi perfil (view/edit) | Full profile editor; verification-status badge; referencias section (visually distinct from badge) |
| NIN-08 | Subir identificación | ID photo upload; shows pending/verified/rejected state and re-submit path |
| NIN-09 | Mis solicitudes | Mirrored, read-only pipeline status across all vacantes she's shown interest in |
| NIN-10 | Reportar familia | Report form, mirrors FAM-12 |
| NIN-11 | Cuenta | Contact verification, security settings |

## ADM — Admin

| ID | Screen | Purpose |
|---|---|---|
| ADM-01 | Admin login | Internally-provisioned access only, no public registration |
| ADM-02 | Cola de verificación de identidad | FIFO queue, SLA-color-coded (green/amber/red) |
| ADM-03 | Detalle de verificación | ID image + profile context; approve or reject (with reason code) |
| ADM-04 | Cola de reportes | FIFO queue, grouped/flagged by repeat-report volume |
| ADM-05 | Detalle de reporte | Report context + prior history; resolve (descartar/advertir/suspender/eliminar), with a confirmation step before eliminar cuenta (irreversible) |

## SYS — Cross-cutting

| ID | Screen/state | Purpose |
|---|---|---|
| SYS-01 | Error genérico (4xx/5xx) | Unrecoverable/unexpected error fallback |
| SYS-02 | Sesión expirada | Re-authentication prompt, preserves intended destination |
| SYS-03 | Sin conexión | Offline/network-loss state (mobile-first consideration) |

## Coverage check against PRD section 5 + addendum-mandated states

- Every familia MVP bullet (registro/login, perfil, crear vacante with the six specified
  fields, listado, filtros, perfil completo, favoritas, solicitar entrevista, estado de
  candidatas) → FAM-01 through FAM-13.
- Every niñera MVP bullet (registro/login, perfil con foto, zona, experiencia, disponibilidad,
  expectativa salarial, modalidades, descripción, referencias, aplicar/mostrar interés) →
  NIN-01 through NIN-11.
- "Confianza y seguridad" bullets (verificación teléfono/correo, verificación identidad +
  badge, referencias, reportar) → AUTH-03, NIN-08, FAM-06/NIN-07 (referencias display),
  FAM-12/NIN-10, plus ADM-02/03/04/05 for the operational side.
- Addendum-mandated states are not separate screens but explicit states within existing
  screens (see `design/UX-spec.md`): pending-verification (NIN-03, NIN-07, NIN-08,
  FAM-04, FAM-06), paywall/contact-gate (FAM-08), reported-profile handling (no visible
  state change on public screens; admin-internal only on ADM-04/05).
- Rango de edad (CONSTRAINTS) → FAM-03 field-level spec in UX-spec.md.

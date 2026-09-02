# Information Architecture — Clin (Nanamex)

Companion to `design/journeys.md`. Covers navigation, page hierarchy, account areas,
administrative areas, and the major objects the product manipulates.

## 1. Top-level structure

Clin is three separate authenticated areas plus a shared public shell. A user account has
exactly one role (familia or niñera) — there is no dual-role account in V1 (not specified
in PRD; do not invent it). Admin is a fully separate, internally-provisioned area (not
self-registerable).

```
Clin (public shell)
├── Landing / Marketing (role selection: "Soy familia" / "Soy niñera")
├── Auth (shared mechanics, role-specific fields)
│   ├── Registro
│   ├── Verificación (correo / teléfono)
│   ├── Login
│   └── Recuperar contraseña
├── Área Familia (authenticated, role = familia)
├── Área Niñera (authenticated, role = niñera)
└── Área Admin (authenticated, role = admin, no public entry point)
```

## 2. Primary navigation

### Familia (mobile: bottom tab bar; desktop: left sidebar)

1. **Mis necesidades** (home/dashboard) — list of created vacantes, each with candidate-pipeline summary.
2. **Favoritas** — saved niñeras across all necesidades.
3. **Cuenta** — perfil familiar, verificación de contacto, historial de pagos/entitlement status.

Candidate browsing, filters, profile detail, paywall, and pipeline management are reached
by drilling into a specific necesidad from "Mis necesidades" — they are not separate
top-level nav items, since PRD scopes matching as per-vacante, not a global niñera search.

### Niñera (mobile: bottom tab bar; desktop: left sidebar)

1. **Inicio** (dashboard) — verification status, % perfil completo, recent oportunidades.
2. **Oportunidades** — pushed matches (default sub-tab) + **Explorar** (browse/search, sub-tab — UX Decision #1).
3. **Mis solicitudes** — mirrored pipeline status for vacantes she's shown interest in.
4. **Mi perfil** — edit profile, referencias, disponibilidad, identificación/verificación.
5. **Cuenta** — verificación de contacto, configuración.

### Admin (desktop-first — internal tool, not part of the mobile-first public product; see
Responsive Behavior in UX-spec.md)

1. **Verificación de identidad** — queue + detail.
2. **Reportes** — queue + detail.

No public marketing content, no mobile-optimized layout required for admin (internal
operator tool, used by a small team per CONSTRAINTS — desktop assumption is acceptable and
avoids over-building V1 admin UI).

## 3. Page hierarchy

```
/                                   Landing
/registro                          Auth: registro (role param)
/verificar                         Auth: OTP/email verification
/login
/recuperar-password

Familia:
/familia                           Mis necesidades (dashboard)
/familia/necesidades/nueva         Crear necesidad (wizard)
/familia/necesidades/:id           Necesidad detail = listado de candidatas + filtros
/familia/necesidades/:id/candidatas/:ninId     Perfil de niñera (candidate detail)
/familia/necesidades/:id/candidatas/:ninId/contactar   Paywall / checkout flow
/familia/necesidades/:id/pipeline  Estado de candidatas (Nueva→Contactada→Entrevista→Contratada/Descartada)
/familia/favoritas
/familia/cuenta

Niñera:
/ninera                            Inicio (dashboard)
/ninera/perfil                     Mi perfil (view/edit)
/ninera/perfil/identificacion      Subir identificación
/ninera/oportunidades              Oportunidades recibidas (pushed)
/ninera/explorar                   Explorar vacantes (browse/search)
/ninera/explorar/:vacanteId        Detalle de vacante (anonymized family view)
/ninera/solicitudes                Mis solicitudes (mirrored pipeline)
/ninera/cuenta

Admin:
/admin/login
/admin/verificaciones              Cola de verificación de identidad
/admin/verificaciones/:id          Detalle de verificación
/admin/reportes                    Cola de reportes
/admin/reportes/:id                Detalle de reporte
```

## 4. Account areas

- **Familia > Cuenta:** contact verification status (email/phone), password/security,
  active paywall entitlement (days remaining on current 30-day contact unlock, if any —
  exact entitlement model per TECH_ARCHITECTURE spike), payment history.
- **Niñera > Cuenta:** contact verification status, password/security. Identity verification
  status lives on the **profile** (Mi perfil), not Cuenta, since it's a public-facing trust
  signal, not a private account setting.
- **Admin:** no self-service account area in V1 — admin accounts are provisioned manually
  (out of scope for this UX pass; an internal-only concern).

## 5. Administrative areas

Two operational queues, both required by the PRD's "Confianza y seguridad" section and
explicitly designed per the addendum:

- **Verificación de identidad** (ADM-02/ADM-03) — manual ID review queue with SLA-aware
  visual prioritization (see journeys.md J-ADM-1).
- **Reportes** (ADM-04/ADM-05) — moderation queue for reported profiles (see journeys.md
  J-ADM-2). SOP owns the operational runbook (escalation thresholds, action policy); this
  IA only defines that the screens and objects exist.

No broader "admin user management," analytics dashboard, or content-moderation-beyond-
reports screens are in V1 scope — not specified in the PRD, not added here to avoid
over-building admin tooling not required to test the core hypothesis.

## 6. Major objects

| Object | Description | Owned/edited by | Key states |
|---|---|---|---|
| **Cuenta de usuario** | Auth identity, role (familia/niñera/admin), contact verification | User (self), Admin (role provisioning) | activa, correo/teléfono no verificado |
| **Perfil familiar** | Family-side profile (name, zona) | Familia | — |
| **Perfil de niñera** | Public profile: photo, experience, availability, salary expectation, modalidad, descripción, referencias, verification badge | Niñera (self, except badge) | borrador (incompleto), publicado, no verificada, verificación en proceso, verificada, bajo reporte (admin-internal only) |
| **Necesidad / Vacante** | A family's childcare request (children age-range/count, zona, días/horarios, modalidad, rango de pago, fecha de inicio, responsabilidades) | Familia | borrador, activa, cerrada (contratada/cancelada) |
| **Match** | System-computed compatibility between a Necesidad and a Perfil de niñera (Match Score % + checklist) | System (rules engine, TECH_ARCHITECTURE-owned) | — (derived, not user-editable) |
| **Interés / Aplicación** | A niñera's "mostrar interés" on a Necesidad (via pushed opportunity or self-serve browse) | Niñera | interesada, descartada (silent dismiss) |
| **Solicitud de contacto/entrevista** | A family's paid contact/interview request to a specific candidate | Familia (gated by paywall) | — (advances an existing Pipeline record from Nueva to Contactada; does not create the record — see below) |
| **Estado de candidatura (Pipeline)** | Per family-necesidad-candidata tuple. **Created automatically, in state Nueva, the first time the family favorites or opens the candidate's full profile (FAM-06)** — a pipeline record exists as soon as the family has engaged with a match, not only once contacted. This makes "Nueva" a real, populated state (matching PRD section 5's literal sequence) and gives the addendum's "encontró candidata compatible" event a corresponding object-state transition, distinct from "contactó" (Nueva → Contactada). | Familia (state owner); Niñera sees mirrored read-only view | Nueva, Contactada, Entrevista, Contratada, Descartada |
| **Entitlement de pago** | Family's 30-day contact-unlock window (mechanics = TECH_ARCHITECTURE spike) | System (post-payment) | activo, expirado |
| **Solicitud de verificación de identidad** | Uploaded ID + review outcome | Niñera (submits), Admin (decides) | pendiente, en revisión, aprobada, rechazada |
| **Reporte** | A report filed against a profile | Familia/Niñera (files), Admin (resolves) | nuevo, en revisión (admin-internal), resuelto (descartado/advertido/suspendido/eliminado) |

## 7. Cross-cutting notes

- **Symmetry:** Wherever a capability is decided to exist for one side (e.g. browsing,
  reporting, Match Score display), the equivalent is designed for the other side too,
  unless the PRD explicitly makes it one-sided (e.g. the paywall is familia-only per PRD
  section 7's "niñeras gratis").
- **No in-app messaging/chat:** Per PRD section 9 non-goal, there is no object for
  "Conversación" or "Mensaje" beyond the discrete "Solicitud de contacto/entrevista" action
  and its state — coordination details (actual chat, scheduling) happen off-platform via
  the contact info revealed after payment.

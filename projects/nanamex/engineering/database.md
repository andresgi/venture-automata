# Database — Clin (Nanamex)

Postgres (Supabase). This document defines every entity: purpose, important fields,
relationships, ownership, and lifecycle. Enum-level constraints are used deliberately in
several places as a **structural** enforcement of product/legal rules (not just app-layer
validation) — most importantly children's age ranges (`config/CONSTRAINTS.md`).

Naming: snake_case tables/columns, matching Postgres/Supabase convention. Spanish domain
terms are kept where the product/UX docs use them (e.g. `necesidad`, `ninera`), to keep the
schema legible against the PRD/UX artifacts it implements.

---

## 1. `profiles`

**Purpose:** Extends `auth.users` (Supabase Auth) with Clin-specific identity: role,
contact-verification state, and role-specific denormalized display fields.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK, FK → `auth.users.id` | 1:1 with Supabase Auth user |
| `role` | enum(`familia`,`ninera`,`admin`) | Set at registration (familia/ninera) or manual provisioning (admin). Immutable after creation — no dual-role accounts in V1, per `information-architecture.md`. |
| `nombre` | text | Display name. For niñeras, this is the "identity-relevant" field per architecture §18. |
| `email_verified` | boolean | Mirrors Supabase Auth's confirmation state (denormalized for cheap reads). |
| `phone` | text | E.164 format. |
| `phone_verified` | boolean | Set true on successful Twilio Verify check. |
| `phone_otp_last_sent_at` | timestamptz, nullable | Added E0-05. Backs the app-layer OTP resend cooldown (`security.md`'s OTP-brute-force row) in addition to Twilio Verify's own native rate limiting. Not itself a trust signal. |
| `created_at` | timestamptz | |

**Relationships:** 1:1 `perfil_familiar` or `perfil_ninera` (based on `role`).
**Ownership:** self (user), except `role` (admin-provisioned for admin accounts) and
`email_verified`/`phone_verified`/`phone_otp_last_sent_at` (system-set, never user-editable
directly).
**Lifecycle:** created at registration; soft-deletable (see §12 Reports — `suspender`/
`eliminar cuenta` sets `status` rather than hard-deleting, to preserve report/pipeline
history integrity) — see `account_status` below.

Additional field: `account_status` enum(`activa`,`suspendida`,`eliminada`) default
`activa` — set by admin action (ADM-05). `eliminada` accounts are anonymized (nombre →
"Usuario eliminado", email/phone cleared) rather than row-deleted, to preserve referential
integrity of historical pipeline/report records without retaining PII past account
deletion.

---

## 2. `perfil_familiar`

**Purpose:** Family-side profile data (PRD section 5 "Perfil familiar").

| Field | Type | Notes |
|---|---|---|
| `profile_id` | uuid, PK, FK → `profiles.id` | |
| `zona_id` | uuid, FK → `zonas` | Family's general zone (from `FAM-01`). |

**Ownership:** familia (self). **Lifecycle:** created at `FAM-01` onboarding; edits are
self-service, no verification/badge implications (families are never subject to identity
verification in V1 — only niñeras are, per PRD section 5).

---

## 3. `perfil_ninera`

**Purpose:** Public candidate profile (PRD section 5 "Perfil con fotografía" etc.) — this
is what `FAM-06` renders.

| Field | Type | Notes |
|---|---|---|
| `profile_id` | uuid, PK, FK → `profiles.id` | |
| `foto_url` | text, nullable | Supabase Storage `profile-photos` public URL. Identity-relevant field per architecture §18. |
| `anos_experiencia` | int | General years of experience — feeds Match Score "Experiencia requerida" factor. |
| `disponibilidad` | jsonb | Array of `{dia: enum(lun..dom), hora_inicio: time, hora_fin: time}`. |
| `salario_min` / `salario_max` | int (MXN) | Expectativa salarial range. |
| `modalidades_aceptadas` | enum[] (`planta`,`entrada_salida`,`ocasional`) | Hard-filter input (architecture §15.1). |
| `descripcion` | text | Free text, capped length (per UI's 65ch-oriented copy, not a hard schema cap beyond a reasonable max, e.g. 1000 chars). |
| `perfil_completo` | boolean, generated/computed | True once all required fields (zona de trabajo, disponibilidad, modalidades, expectativa salarial, descripción, ≥1 experiencia_edad) are set — drives `% perfil completo` and publish eligibility (J-NIN-1). |
| `publicado` | boolean | True once `perfil_completo` — controls discoverability in matching/browsing. |
| `verification_status` | enum(`no_verificada`,`en_proceso`,`verificada`) | Denormalized, authoritative for display (`TrustBadge`). Source of truth for state transitions is `identity_verifications` (§10), but this column is what every read path (`FAM-04`, `FAM-06`, `NIN-03`, `NIN-07`) queries directly, avoiding a join+aggregate on every listing render. |
| `created_at` | timestamptz | Used in Match Score tie-break (architecture §15.4). |

**Relationships:** `experiencia_edades` (join table, below), `zonas_de_trabajo` (join
table, below), `referencias` (1:many, below), `identity_verifications` (1:many, §10).
**Ownership:** ninera (self, all fields) except `verification_status` and `publicado`
derivations, which are system/admin-driven.
**Lifecycle:** created at `NIN-01`/`NIN-02` onboarding (draft until `perfil_completo`);
editable indefinitely; `foto_url`/`nombre` edits after `verification_status = verificada`
trigger the re-review flow (architecture §18) via an `AFTER UPDATE` trigger comparing old
vs. new values on `profiles.nombre` / `perfil_ninera.foto_url`.

### 3a. `ninera_experiencia_edades` (join table)

`ninera_id` FK, `rango_edad` enum (see §7 — same fixed enum as necesidad children, so the
Match Score "Edad de los niños" factor is a set-intersection query). Unique
(`ninera_id`, `rango_edad`).

### 3b. `ninera_zonas` (join table)

`ninera_id` FK, `zona_id` FK → `zonas`. A niñera may work across multiple zonas. Unique
(`ninera_id`, `zona_id`).

### 3c. `referencias`

**Purpose:** Self-reported references (UX Decision 2 — never operator-verified in V1).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `ninera_id` | uuid, FK | |
| `nombre` | text | |
| `relacion` | text | e.g. "Familia anterior" |
| `periodo` | text | Free text, e.g. "2021–2023" (not a strict date range — matches UX's plain-row treatment). |
| `contacto` | text, nullable | Optional contact note. |

**Ownership:** ninera (self, full CRUD). **Never** has a status field — there is no
"verified/unverified" state per row, because the entire category is self-reported by
design (architecture does not introduce operator reference-checking, matching the UX/PRD
Critic resolution).

---

## 4. `zonas` (reference data)

**Purpose:** Seeded, static geographic reference table backing the "Zona" field on both
sides and the Match Score "Ubicación" factor (architecture §10).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `alcaldia_municipio` | text | The comparison granularity for matching. |
| `colonia` | text, nullable | Finer-grained label shown in autocomplete UI; not used for match comparison in V1 (alcaldía-level only, to avoid over-filtering thin supply). |
| `ciudad` | text | Launch-city scoping. |
| `lat` / `lng` | numeric, nullable | Seeded centroid for the map-pin display only (architecture §10) — never used in matching logic. |

**Ownership:** system (seeded via migration/seed script, not user-editable).
**Lifecycle:** append-only; expanding to a new city/alcaldía is a data-seed operation, not
a schema change.

---

## 5. `necesidades`

**Purpose:** A family's childcare request (PRD section 5's six required fields + status).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `familia_id` | uuid, FK → `profiles.id` | |
| `zona_id` | uuid, FK → `zonas` | |
| `dias_horarios` | jsonb | Array of `{dia, hora_inicio, hora_fin}`, same shape as `perfil_ninera.disponibilidad`. |
| `modalidad` | enum(`planta`,`entrada_salida`,`ocasional`) | Hard-filter input. |
| `pago_min` / `pago_max` | int (MXN) | |
| `fecha_inicio` | date | Must be ≥ today at creation/edit (app-layer validation; not a DB constraint since "today" is relative). |
| `responsabilidades` | text[] | Checklist selections + free-text "otros" appended as a final array element. |
| `estado` | enum(`borrador`,`activa`,`cerrada_contratada`,`cerrada_cancelada`) | |
| `created_at` / `updated_at` | timestamptz | `updated_at` bump on any matching-relevant field edit triggers re-match per architecture §17 (application-layer, not a DB trigger — re-matching needs to run application code, not pure SQL). |

**Relationships:** `necesidad_children` (1:many, below), `pipeline` (1:many, §11).
**Ownership:** familia (self, full CRUD on own necesidades only).
**Lifecycle:** draft (auto-saved per wizard step) → activa (published, triggers initial
match computation) → cerrada (contratada or cancelada, terminal). Editable in any
non-terminal state, including with an active pipeline (architecture §17).

### 5a. `necesidad_children`

**Purpose:** Structural enforcement of "age ranges only, never exact age/birthdate"
(`config/CONSTRAINTS.md` — the single most legally/ethically load-bearing schema decision
in this document).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `necesidad_id` | uuid, FK | |
| `rango_edad` | enum(`0-1`,`1-3`,`3-6`,`6-12`,`12+`) | **NOT NULL, no alternative column exists for exact age or birthdate anywhere in this schema.** One row per child (per UX-spec's "número de niños + rango de edad per child"). |

No `nombre`, `fecha_nacimiento`, or `edad_exacta` column exists on this table or anywhere
else in the schema — this is deliberate: the enum type makes it structurally impossible
for a developer to accidentally add exact-age collection later without a conscious schema
change (and a conscious decision to violate `config/CONSTRAINTS.md`).

**Ownership:** familia (self, via the necesidad). **Lifecycle:** created with the
necesidad; edits replace rows entirely (delete+reinsert) since children aren't individually
identified/tracked across edits — only the *set* of age ranges matters for matching.

---

## 6. `pipeline` (Estado de candidatura)

**Purpose:** Per family-necesidad-niñera engagement record — the object underlying
`FAM-11`/`NIN-09`. Created automatically on first favorite or first full-profile view
(`information-architecture.md`'s resolved model), not only at contact.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `necesidad_id` | uuid, FK | |
| `ninera_id` | uuid, FK | |
| `estado` | enum(`nueva`,`contactada`,`entrevista`,`contratada`,`descartada`) | |
| `match_score_snapshot` | int | Frozen at row-creation time (architecture §17) — never recomputed after creation. |
| `match_checklist_snapshot` | jsonb | Frozen checklist (which factors passed) at creation time. |
| `interes_ninera` | boolean, default false | Set true if the niñera separately showed interest via `NIN-04`/`NIN-05` (informational "interesada" flag — does not itself change `estado`, per J-NIN-3). |
| `created_at` / `updated_at` | timestamptz | |

Unique (`necesidad_id`, `ninera_id`) — one pipeline record per pair.

**Relationships:** `contacto` (1:1, nullable — exists once `estado` reaches `contactada`,
below). **Ownership:** state (`estado`) is family-owned/editable (niñera has read-only
mirrored access per `NIN-09`, per J-FAM-4's explicit "family-initiated only" decision).
**Lifecycle:** `nueva` → `contactada` (only via a successful `Contacto`, §16.2 — never a
free manual transition) → `entrevista`/`contratada`/`descartada` (family-driven manual
transitions, `descartada` reachable from any state).

### 6a. `contacto`

**Purpose:** Records the paid contact/interview request (`FAM-10`).

| Field | Type | Notes |
|---|---|---|
| `pipeline_id` | uuid, PK, FK | |
| `entitlement_id` | uuid, FK → `entitlements` | The entitlement active at the moment of contact — kept for audit/analytics even after that entitlement later expires. |
| `mensaje` | text, nullable | One-shot message field (not a thread — no `mensajes` table, per PRD section 9's no-chat non-goal). |
| `created_at` | timestamptz | This timestamp is the "contactó candidata" analytics event instant (`engineering/analytics.md`). |

**Lifecycle:** created once, immutable (a new message would be a new product feature —
in-app chat — explicitly out of scope).

---

## 7. Shared enum reference

`rango_edad`: `0-1`, `1-3`, `3-6`, `6-12`, `12+` — used identically by
`necesidad_children.rango_edad` and `ninera_experiencia_edades.rango_edad`, so the Match
Score "Edad de los niños" factor is a plain set-intersection, and so a family's stated need
and a niñera's stated experience are always comparable like-for-like (per `journeys.md`
J-NIN-1's explicit reasoning).

---

## 8. `entitlements`

**Purpose:** A family's paid contact-unlock window (architecture §16).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `familia_id` | uuid, FK | |
| `tier` | enum(`contacto_30d`) | Enum, not a free string — deliberately leaves room to add a second tier later (architecture §16.3) without a schema rewrite, without implying a second tier exists yet. |
| `activated_at` | timestamptz | |
| `expires_at` | timestamptz | `activated_at + 30 days`, extended (not duplicated) on stacked repurchase (architecture §16.1). |
| `payment_id` | uuid, FK → `payments` | |
| `status` | enum(`activo`,`expirado`) | Denormalized for cheap reads; also derivable live as `expires_at > now()` — kept as a column for simple indexing, refreshed lazily on read/write, not by a cron (architecture §4). |

**Ownership:** system (created only via successful payment webhook). **Lifecycle:**
`activo` while `now() < expires_at`; never deleted (retained for entitlement/payment
history, `FAM-13`).

## 9. `payments`

**Purpose:** Payment record backing an entitlement.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `familia_id` | uuid, FK | |
| `provider` | text | `stripe` |
| `provider_payment_id` | text, nullable | Stripe Checkout Session ID once created; nullable during recovery before the provider call/link succeeds. |
| `idempotency_key` | text, unique | Durable local/Stripe idempotency boundary, created before calling Stripe. |
| `checkout_url` | text, nullable | Hosted Checkout URL, persisted for safe retries. |
| `provider_session_status` | text | Local projection: `not_created`, `open`, `expired`, `complete`, or `unknown`; never grants entitlement. |
| `provider_session_expires_at` | timestamptz, nullable | Stripe Checkout `expires_at`, normalized from Unix seconds and persisted when the session is linked; a provider projection used as a local hint, never payment proof. |
| `checkout_claimed_at` | timestamptz, nullable | Short checkout-creation lease preventing concurrent provider calls. |
| `amount` | int (cents, MXN) | |
| `status` | enum(`pendiente`,`exitoso`,`fallido`) | |
| `created_at` | timestamptz | |

**Ownership:** system. **Lifecycle:** created on checkout initiation (`pendiente`),
 finalized by the Stripe webhook (`exitoso`/`fallido`), or marked `fallido` by the
 server-side stale-return cleanup only after a never-created or Stripe-confirmed-expired
 boundary. The webhook remains the only path that can mark a payment successful or create an
 entitlement; stale cleanup is guarded by `status = 'pendiente'` and never grants access.

---

## 10. `identity_verifications`

**Purpose:** Append-only submission history backing `ADM-02`/`ADM-03` and the 3-state
badge, plus the operational SLA metric.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `ninera_id` | uuid, FK | |
| `document_storage_path` | text | Supabase Storage `identity-documents` path (private bucket). |
| `status` | enum(`pendiente`,`en_revision`,`aprobada`,`rechazada`) | |
| `motivo` | enum(`primera_vez`,`re-revision_por_edicion_de_perfil`) | Distinguishes a fresh submission from an architecture-§18-triggered re-review (so admin sees context in `ADM-03`). |
| `submitted_at` | timestamptz | |
| `decided_at` | timestamptz, nullable | Null while pending — `decided_at - submitted_at` is the SLA/turnaround metric (`engineering/analytics.md`). |
| `decided_by` | uuid, FK → `profiles.id`, nullable | Admin who decided. |
| `rejection_reason_code` | enum(`foto_ilegible`,`nombre_no_coincide`,`documento_invalido`,`no_se_pudo_abrir`), nullable | Required if `status = rechazada` (app-layer constraint, per `ADM-03`'s "cannot submit empty"). |
| `rejection_note` | text, nullable | |

**Ownership:** niñera creates (`pendiente`); admin decides (`en_revision`→`aprobada`/
`rechazada`). **Lifecycle:** append-only — a rejection does not delete the row; a
re-submission (or re-review trigger) creates a **new** row. `perfil_ninera.
verification_status` is updated by the same transaction that writes the terminal
`aprobada`/`rechazada` decision (or `en_proceso` on the re-review trigger from §3/architecture
§18).

**Access control note (see `engineering/security.md`):** `document_storage_path` is never
returned to any client-facing query except the admin review action, which generates a
short-lived signed URL server-side — the raw path/bucket is not queryable by
niñera-role or familia-role sessions.

### 10a. `identity_document_access_log`

**Purpose:** Audit log of every admin view of a niñera's identity document image
(`engineering/security.md` §7) — one row per signed-URL generation for an
`identity-documents` object, generated whenever an admin opens `ADM-03`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `admin_id` | uuid, FK → `profiles.id` | The admin who viewed the document (role must be `admin`). |
| `document_path` | text | The `identity-documents` storage path viewed — matches the
corresponding `identity_verifications.document_storage_path` at the time of the view. |
| `viewed_at` | timestamptz | Set at signed-URL generation time — this *is* the audit event, not a derived timestamp. |

**Ownership:** system (written only by the server action that generates the signed URL for
`ADM-03`; no update/delete path exists — append-only). **Lifecycle:** append-only, retained
indefinitely in V1 (small volume, audit-only category, no PII beyond the `admin_id` FK —
same retention stance as `analytics_events`, §12).

---

### 10b. `identity_document_cleanup_queue`

**Purpose:** Durable reconciliation record for a private Storage object whose deletion
failed after the submission transaction was rejected or unavailable. The upload action
attempts immediate deletion first; only a failed attempt is queued. This table is
system-owned, has no browser RLS policy, and is intended for a future policy-gated worker.
It does not define or imply an identity-document retention period (that remains unresolved
per §8/security.md).

## 11. `reportes`

**Purpose:** Moderation queue object (`ADM-04`/`ADM-05`).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `reportante_id` | uuid, FK → `profiles.id` | |
| `reportado_id` | uuid, FK → `profiles.id` | |
| `categoria` | enum(`comportamiento_inapropiado`,`informacion_falsa`,`solicitud_pago_fuera_plataforma`,`otro`) | |
| `detalle` | text, nullable | Required if `categoria = otro` (app-layer). |
| `estado` | enum(`nuevo`,`en_revision`,`resuelto`) | `en_revision` is admin-internal only — never exposed on any public-facing profile query (UX Decision 5). |
| `resolucion` | enum(`descartado`,`advertido`,`suspendido`,`eliminado`), nullable | Set when `estado = resuelto`. |
| `created_at` | timestamptz | |

**Ownership:** reporter creates; admin resolves. **Lifecycle:** `nuevo` → `en_revision`
(admin picks up) → `resuelto`. `resolucion = suspendido`/`eliminado` updates the reported
user's `profiles.account_status` in the same transaction — the only path by which a
report changes a profile's public visibility (Decision 5: a single unreviewed report never
does).

---

## 12. `analytics_events` (thin, application-owned log — supplements PostHog)

**Migration ownership:** E4-03 creates this shared table and owns durable FAM-06 event
writes. E11-01 must consume and extend this schema in a follow-up migration; it must not
recreate the table. PostHog delivery is intentionally deferred to E11-01.

**Purpose:** Not a replacement for PostHog (the system of record for funnel analysis, per
`engineering/analytics.md`), but a durable, queryable Postgres log for the specific
addendum-mandated metrics that must survive independent of a third-party analytics vendor
(operational SLA metrics, North Star computation for internal dashboards/SOP reporting).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_name` | text | See `engineering/analytics.md` event catalog. |
| `profile_id` | uuid, FK, nullable | |
| `necesidad_id` / `ninera_id` | uuid, nullable | Context FKs, populated per event type. |
| `metadata` | jsonb | Event-specific payload (e.g. `match_score` at time of `compatible_match_found`). |
| `created_at` | timestamptz | |

**Ownership:** system (write-only from server actions, never user-editable).
**Lifecycle:** append-only, retained indefinitely in V1 (no PII beyond FKs already
retained elsewhere; revisit if this table's own retention becomes a concern at scale).

---

## 13. Entity-relationship summary

```
auth.users (Supabase Auth)
  └─ profiles (1:1) ─┬─ perfil_familiar (1:1, if role=familia)
                     │     └─ necesidades (1:many)
                     │           ├─ necesidad_children (1:many)
                     │           └─ pipeline (1:many) ── contacto (1:1, nullable)
                     │     └─ entitlements (1:many) ── payments (1:1)
                     │
                     └─ perfil_ninera (1:1, if role=ninera)
                           ├─ ninera_experiencia_edades (1:many)
                           ├─ ninera_zonas (1:many)
                           ├─ referencias (1:many)
                           ├─ identity_verifications (1:many)
                           └─ pipeline (1:many, via ninera_id)

zonas (reference) ── referenced by perfil_familiar.zona_id (via necesidad), necesidades.zona_id, ninera_zonas.zona_id
reportes: reportante_id/reportado_id → profiles.id (both roles)
analytics_events: profile_id/necesidad_id/ninera_id → respective tables
identity_document_access_log: admin_id → profiles.id (admin only); document_path references
  an identity-documents Storage object (not a DB FK — Storage objects aren't rows)
```

## 14. Row Level Security (RLS)

RLS is enabled on every table as **defense-in-depth**, not the primary authorization
mechanism (architecture §3 — primary authorization is enforced in Next.js server code,
which holds the service-role key and is the only thing with DB credentials). RLS policies
mirror the authorization matrix in `engineering/security.md` and specifically protect:

- `identity_verifications.document_storage_path` and the `identity-documents` Storage
  bucket — policy allows read only to `decided_by`-eligible admins and the owning niñera
  (via a signed-URL-issuing server action, never a direct client query).
- `reportes` — `estado`/`resolucion` never selectable by non-admin roles.
- `necesidades`/`pipeline` — a familia can only read/write rows where `familia_id = auth.uid()`.
- `identity_document_access_log` — insert-only via the signed-URL-issuing server action
  (service-role write, not a direct client insert); select restricted to admin role, and
  not exposed via any client-facing query in V1 (audit trail, not a UI feature).

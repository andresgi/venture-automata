# Security — Clin (Nanamex)

## 1. Authentication Model

- **Identity provider:** Supabase Auth (GoTrue), email + password. Passwords never
  touched by our own code (hashing/storage handled by Supabase Auth).
- **Session:** Supabase-issued JWT, verified server-side on every request by Next.js
  middleware before any route-group (`/familia/*`, `/ninera/*`, `/admin/*`) renders.
  No client-side-only auth checks — a role-mismatched request is rejected server-side
  before data is fetched, not hidden by the UI after the fact.
- **Phone verification** (Twilio Verify) is a secondary, non-login trust attribute —
  compromising it does not grant account access; it only affects the `phone_verified`
  gate on contacting a candidate (`journeys.md` J-FAM-1).
- **Admin accounts:** manually provisioned (direct Supabase Auth user creation +
  `profiles.role = 'admin'` set by a human with DB access) — **no self-registration route
  exists for admin** (`ADM-01` is login-only, confirmed in `information-architecture.md`).
  Admin accounts should additionally require MFA once Supabase Auth's MFA is enabled for
  the project (recommended before real user ID documents are reviewed in production —
  admins are the only role with any path to viewing identity documents).
- **Password reset:** standard Supabase Auth flow (emailed reset link), rate-limited by
  Supabase's built-in throttling.

## 2. Authorization Model

Primary enforcement layer: **application code** (server actions/API routes check
`profiles.role` and resource ownership before any read/write). Secondary layer:
**Postgres RLS**, enabled on every table (see `engineering/database.md` §14) as
defense-in-depth against a bug in the application layer, and as the mechanism protecting
Supabase Storage bucket access directly.

### 2.1 Authorization matrix (sensitive resources)

| Resource | Read | Create | Modify | Delete |
|---|---|---|---|---|
| **Perfil de niñera** (own) | Owner, any authenticated familia (public fields only), admin | Owner (at registration) | Owner; `verification_status` only by system/admin (§3 below) | Owner (soft — sets `account_status`, no hard delete of history-bearing rows) |
| **Perfil familiar** (own) | Owner, admin | Owner (at registration) | Owner | Owner (soft) |
| **Necesidad** | Owning familia, admin; matched niñeras see it anonymized (no familia contact info) via `NIN-06` | Owning familia | Owning familia (any state except `cerrada`) | Owning familia (soft — sets `estado = cerrada_cancelada`, never hard-deleted while any `pipeline`/`contacto` row references it) |
| **Pipeline record** | Owning familia (full); matching niñera (read-only mirror, `NIN-09`) | System (auto-created on first favorite/view) | Owning familia (`estado` transitions only) | Never (immutable history) |
| **Contacto** (revealed contact details) | Owning familia; the specific matched niñera (her own contact info being revealed is implicit — she already knows it; what she can see is that a request was made, via `NIN-09`) | System (on successful payment + `FAM-10` confirm) | Never | Never |
| **Identity document (image)** | Owning niñera (her own submission status, not the raw file by default), admin (via short-lived signed URL only, generated server-side, access-logged) | Owning niñera | Admin (decision fields only) | System (retention job only, once a policy is configured — see §8) |
| **identity_verifications row (metadata)** | Owning niñera (own), admin | Owning niñera (submit), system (re-review trigger) | Admin (decision), system | Never (append-only) |
| **Reporte** | Reportante (own submission confirmation only, not resolution detail), admin (full) | Any authenticated familia/niñera | Admin only (`estado`, `resolucion`) | Never |
| **Payment/Entitlement** | Owning familia (own history, `FAM-13`), admin | System (webhook-driven) | System only (webhook), never user-editable | Never |
| **Referencias** | Public (any authenticated user viewing the profile) | Owning niñera | Owning niñera | Owning niñera |
| **Admin queues (ADM-02/04)** | Admin only | N/A | Admin (decisions) | N/A |

### 2.2 Cross-role visibility rules worth stating explicitly

- A niñera **never** sees a family's real contact info or exact address — only `zona`
  (alcaldía-level) and the necesidad's fields, per `NIN-06`'s anonymized detail spec.
  Symmetric with the family-side paywall: contact info flows both ways only after the
  family's paid action.
- A familia **never** sees another familia's necesidades, favoritas, or pipeline.
- `reportes.estado = en_revision` is never returned by any query a non-admin role can
  execute — enforced at both the application layer and by RLS policy (belt-and-suspenders
  specifically because Decision 5's entire premise depends on this staying invisible).

## 3. Verification-Status Mutation Control

`perfil_ninera.verification_status` is one of the highest-trust fields in the schema (it
drives the "Identidad verificada" badge families rely on). It can only change via:

1. Admin decision on an `identity_verifications` row (`aprobada`→`verificada`,
   `rechazada`→`no_verificada`), recorded with `decided_by`.
2. The system-triggered re-review on identity-relevant profile edits (architecture §18) —
   `verificada`→`en_proceso`, never user-settable directly.

No server action or API route may set this column directly from user input — it is only
ever written by the two code paths above, both of which run under the service-role
connection with an explicit, logged actor (`decided_by`, or `system` for the trigger case).

## 4. Sensitive Information Inventory

| Category | Examples | Where stored | Special handling |
|---|---|---|---|
| Government ID images | Niñera's uploaded document | Supabase Storage `identity-documents` (private bucket) | Never public; signed URLs only, short TTL (5 min), access-logged (§7); retention policy pending (§8) |
| Contact PII | Phone, email, zona | `profiles`, `perfil_familiar`, `necesidades` | Standard PII handling; email/phone never rendered to a role that hasn't paid/been granted access (niñera's phone only revealed to family post-payment) |
| Indirect minor data | Children's age **ranges** (never exact age/birthdate/name) | `necesidad_children` | Structurally enforced enum, no exact-age column exists anywhere (`database.md` §5a) |
| Financial data | Salary ranges (both sides), payment amounts | `perfil_ninera`, `necesidades`, `payments` | Payment card data never touches our servers — Stripe Checkout/Elements handles PCI scope entirely; we only store Stripe's IDs/amounts |
| Moderation data | Report contents, admin decisions | `reportes` | Admin-internal only (§2.2) |

## 5. Secrets Management

- All third-party credentials (Supabase service-role key, Stripe secret key + webhook
  signing secret, Twilio auth token, Resend API key, PostHog project key used server-side,
  Sentry DSN) are Vercel environment variables, scoped per environment
  (production/preview/development), **never** committed to the repository and never
  prefixed `NEXT_PUBLIC_*` unless genuinely safe for the browser (e.g. Supabase anon key,
  which is meaningless without RLS bypass, and PostHog's client-side capture key, which is
  designed to be public).
- `.env` files are git-ignored (per AGENTS.md Implementation Rules — never commit secrets,
  never commit `.env` files); `.env.example` documents required variable names with
  placeholder values only.
- Cron endpoints (`/api/cron/*`) are protected by a shared-secret header checked against an
  env var, not by relying on Vercel Cron's IP alone.
- Stripe webhook signature verification is mandatory on `/api/webhooks/stripe` — no
  unsigned payload is ever trusted to create/modify an entitlement.

## 6. PII Considerations

- **Data minimization is already structurally enforced** for the most sensitive category
  (children's data — age ranges only, §4). No name, photo, or other identifying detail of
  a child is ever collected anywhere in the product (also enforced at the UI layer per
  `UI-SYSTEM.md`'s no-child-imagery rule, and now confirmed schema-level here).
- Account deletion (`ADM-05` "Eliminar cuenta," or a future self-service deletion request)
  anonymizes `profiles` (nombre, email, phone cleared/replaced) rather than hard-deleting,
  preserving referential integrity of `pipeline`/`reportes`/`payments` history that other
  users and financial/audit records legitimately depend on. This should be reviewed against
  applicable Mexican data-protection requirements (LFPDPPP) before RELEASE_GATE — flagged
  as a legal-review item, not resolved unilaterally here.
- No data is sold or shared with third parties beyond the operational vendors listed in
  `engineering/architecture.md` §14 (each processes data solely to provide their service to
  Clin — standard subprocessor relationship, not a data-sharing partnership).

## 7. Identity Document Access Logging

Every generation of a signed URL for an `identity-documents` object (i.e., every time an
admin opens `ADM-03`) is logged: `admin_id`, `document_path`, `viewed_at`. This is a new,
small audit table (`identity_document_access_log`, defined in `database.md` §10a) — cheap
to add, and the right default for a document category this sensitive, independent of
whatever retention period is eventually set.

## 8. Identity Document Retention/Deletion — UNRESOLVED, FLAGGED FOR HUMAN/LEGAL DECISION

**This is explicitly not decided in this document.** `config/CONSTRAINTS.md` names this as
an open item requiring human/legal confirmation before real user ID documents are
collected in production, and instructs the architecture to design for a configurable
policy rather than invent one. Per that instruction:

- `IDENTITY_DOC_RETENTION_DAYS` is an environment variable, **unset by default**.
- A scheduled job (`/api/cron/purge-identity-documents`, Vercel Cron) runs on a regular
  cadence and, **only if** the env var is set, deletes `identity-documents` storage
  objects (and clears `document_storage_path` on the corresponding
  `identity_verifications` row, keeping the row itself — status/decision/timestamps —
  for audit) once `decided_at + N days` has passed.
- If the env var is unset, the job **no-ops and logs a warning** on every run — a growing
  backlog of undeleted documents with no configured policy is a visible signal, not a
  silent default of "keep forever."
- **This project must not collect real (non-test) government ID documents in production
  until this policy is set by the founder in consultation with legal counsel**, per
  `config/CONSTRAINTS.md`'s explicit risk-tolerance statement. This is reiterated as a
  RELEASE_GATE blocker candidate, not a BUILD blocker — BUILD/UX/UI/QA may proceed using
  synthetic/test documents.
- Who can access the raw documents in the interim (beyond the admin reviewers already
  covered in §7) is itself part of the pending policy — e.g. whether a niñera can request
  her own document be deleted before the general policy triggers, whether documents are
  ever exported/backed up outside Supabase Storage, etc. Do not answer these
  unilaterally; surface them as the specific sub-questions the human/legal decision needs
  to cover.

## 9. Abuse Cases

| Abuse case | Mitigation |
|---|---|
| Bad-faith report used to get a competitor's profile suspended | Decision 5 (UX/architecture): a single report never changes public visibility; only an explicit admin `suspender`/`eliminar` action does. Repeat-report volume is surfaced to admin (`ADM-04` grouping) but does not auto-act. |
| OTP brute-force (phone verification) | Twilio Verify's built-in rate limiting/lockout; app-layer resend cooldown (UX-specified, e.g. 60s) in addition. |
| Credential stuffing / brute-force login | Supabase Auth's built-in rate limiting; standard password strength requirement (AUTH-02 validation). |
| Fake/duplicate accounts to bypass the paywall (e.g. re-registering after entitlement expires) | Email + verified-phone uniqueness constraints reduce trivial re-registration; not a hard technical block in V1 (no device fingerprinting) — accepted as a known, low-severity V1 risk given the low price point and manual-verification-backed trust model; revisit if abuse is observed post-launch. |
| Uploading someone else's ID document / mismatched identity | Admin manually compares stated name/photo against the document (`ADM-03`); rejection reason codes include "nombre no coincide." This is the core reason identity verification is manual in V1, not just a placeholder. |
| Scraping niñera contact info or profile photos at scale | Contact info is never exposed until paid `Contacto` exists (server-enforced); profile photos are public by design (needed for the product to function) — standard rate-limiting at the edge (Vercel/Next.js) is sufficient for V1 scale, no bespoke anti-scraping system justified yet. |
| Admin account compromise (highest-impact account type — can view ID documents, resolve reports, suspend accounts) | Recommend MFA for admin accounts before production (§1); access logging on every document view (§7); admin accounts are the only role that cannot self-register, limiting the attack surface to accounts a human deliberately provisioned. |
| Off-platform payment solicitation (niñera or familia asking to pay/transact outside Clin, evading the paywall) | Explicit report category exists (`solicitud_pago_fuera_plataforma`) for users to flag this; not technically preventable once contact info is revealed (inherent to the product's post-paywall model, same as any lead-gen marketplace) — accepted as a known limitation, not a build gap. |
| Stripe webhook replay/spoofing to grant a free entitlement | Signature verification (§5) + idempotency on `provider_payment_id` (`database.md` §9) — a redelivered or forged webhook cannot create a duplicate or unauthorized entitlement. |
| Checkout retry/concurrency or local DB outage | Durable `payments` boundary is inserted first; one pending row per family, a short DB claim lease, Stripe idempotency key, and `payment_boundary_id` metadata prevent duplicate charge attempts. Only a provider session proven `open` and unexpired may be reused. Failed links are re-read before compensation; E5-02 reconciles by `provider_payment_id` or metadata boundary ID. |

## 10. Summary of Explicit Open Items for Human Decision (not resolved by this document)

1. **Identity document retention/deletion period** (§8) — must be set before real user
   documents are collected in production.
2. **LFPDPPP (Mexican data protection law) compliance review** of the account-deletion/
   anonymization approach (§6) — recommend legal review before RELEASE_GATE.
3. **Admin MFA enablement** (§1) — recommended before production ID-document review; not a
   BUILD story for V1 (admin accounts are few and manually provisioned, so this is deferred
   as a pre-RELEASE_GATE checklist item rather than a build blocker — see
   `implementation-plan.md` Epic 8 note).

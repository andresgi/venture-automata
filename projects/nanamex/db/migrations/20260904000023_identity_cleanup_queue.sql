-- E7-03 durable compensation boundary. This queue records failed object deletion
-- attempts; a future policy-gated worker may consume it. It intentionally does not
-- decide how long identity documents are retained (E12/legal decision).
create table public.identity_document_cleanup_queue (
  id uuid primary key default extensions.gen_random_uuid(),
  document_storage_path text not null unique,
  reason text not null,
  attempts integer not null default 0 check (attempts >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.identity_document_cleanup_queue enable row level security;
-- No browser policy: this is a system-owned reconciliation queue.

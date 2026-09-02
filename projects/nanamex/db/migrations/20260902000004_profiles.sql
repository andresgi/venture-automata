-- profiles: extends auth.users with Clin-specific identity (engineering/database.md §1).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  nombre text not null,
  email_verified boolean not null default false,
  phone text,
  phone_verified boolean not null default false,
  account_status public.account_status not null default 'activa',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Extends auth.users (Supabase Auth) with Clin-specific identity: role, '
  'contact-verification state, and role-specific denormalized display fields '
  '(database.md §1).';

comment on column public.profiles.role is
  'Set at registration (familia/ninera) or manual provisioning (admin). Immutable after '
  'creation -- structurally enforced by the profiles_role_immutable trigger below (not just '
  'app-layer convention): no dual-role accounts in V1.';

comment on column public.profiles.account_status is
  'eliminada accounts are anonymized (nombre/email/phone cleared, per database.md §1) '
  'rather than row-deleted, to preserve referential integrity of historical '
  'pipeline/report records. Anonymization itself is an application-layer action (ADM-05, '
  'a later story) -- this column only records the resulting state.';

-- Structural enforcement of "role is immutable after creation" (database.md §1), mirroring
-- this schema's broader pattern of using the database itself (not just app-layer
-- convention) to enforce rules that matter (e.g. the rango_edad enum for children's ages).
create function public.profiles_prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'profiles.role is immutable after creation (attempted % -> %)', old.role, new.role;
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row
  execute function public.profiles_prevent_role_change();

alter table public.profiles enable row level security;

-- SECURITY DEFINER helper so admin-scoped RLS policies (here and on every other table in
-- this migration set) can check the caller's role without recursing into profiles' own RLS
-- (a plain subquery against profiles from within a profiles/other-table policy is a common
-- source of RLS recursion bugs in Postgres/Supabase).
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Defense-in-depth only (architecture.md §3: the app never queries Supabase directly from
-- the browser -- every read/write goes through the server-side Supabase client holding the
-- service-role key, which bypasses RLS entirely). These policies exist to protect against a
-- future accidental direct-client query, per database.md §14.
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- No delete policy: accounts are anonymized, never row-deleted (see account_status above).

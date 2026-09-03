-- Follow-up hardening from Code Review (agent/reviews/code-E0-03-review.md, Required
-- Changes #1-4). Written as a new migration rather than editing 20260902000004/000006
-- in place, since those were already applied to the hosted nanamex-dev project before
-- review -- editing an already-applied migration file would break the CLI's migration
-- checksum history; a follow-up migration is the safe, standard fix.
--
-- All four issues are the same root cause: RLS `with check`/`using` clauses can only see
-- the ownership condition (profile_id = auth.uid()), not "is this specific column being
-- changed" or "is the caller the privileged service-role client" -- so a handful of
-- system/admin-only columns were, in practice, self-writable by an authenticated client
-- at the RLS layer (defense-in-depth only, per architecture.md §3 -- the app itself never
-- writes these columns from a niñera/familia-role request -- but the whole point of this
-- layer is to catch exactly this class of mistake, per the review).

-- 1 & 2. Protect system/admin-only columns from non-privileged client writes.
--
-- "Privileged" here means the request is not scoped to the RLS-restricted `authenticated`/
-- `anon` Postgres roles: `auth.role()` returns 'service_role' for the server-side
-- service-role client (architecture.md §3's sole write path in the running app, and also
-- the Postgres role Supabase grants BYPASSRLS -- this trigger is an extra belt-and-suspenders
-- check even though RLS itself wouldn't apply), and returns NULL outside of a PostgREST
-- request context entirely (migrations, `psql`, the Supabase CLI's seed/reset flow) -- both
-- must remain able to set these columns; only a direct authenticated/anon client write is
-- blocked.

create function public.perfil_ninera_protect_system_fields()
returns trigger
language plpgsql
as $$
declare
  caller_role text := auth.role();
  is_privileged boolean := caller_role is null or caller_role = 'service_role';
begin
  if is_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verification_status is distinct from 'no_verificada'::public.ninera_verification_status
       or new.publicado is distinct from false then
      raise exception
        'perfil_ninera.verification_status/publicado cannot be set on insert by a '
        'non-privileged client -- system/admin-driven only (database.md §3, security.md §3)';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.verification_status is distinct from old.verification_status
       or new.publicado is distinct from old.publicado then
      raise exception
        'perfil_ninera.verification_status/publicado are system/admin-driven and cannot be '
        'changed by a non-privileged client (database.md §3, security.md §3)';
    end if;
  end if;

  return new;
end;
$$;

create trigger perfil_ninera_protect_system_fields
  before insert or update on public.perfil_ninera
  for each row
  execute function public.perfil_ninera_protect_system_fields();

create function public.profiles_protect_system_fields()
returns trigger
language plpgsql
as $$
declare
  caller_role text := auth.role();
  is_privileged boolean := caller_role is null or caller_role = 'service_role';
begin
  if is_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.email_verified is distinct from false or new.phone_verified is distinct from false then
      raise exception
        'profiles.email_verified/phone_verified cannot be set on insert by a non-privileged '
        'client -- system-set only (database.md §1)';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.email_verified is distinct from old.email_verified
       or new.phone_verified is distinct from old.phone_verified then
      raise exception
        'profiles.email_verified/phone_verified are system-set and cannot be changed by a '
        'non-privileged client (database.md §1)';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_system_fields
  before insert or update on public.profiles
  for each row
  execute function public.profiles_protect_system_fields();

-- 3. Close the admin self-provisioning path: an authenticated client could previously
-- insert their own profiles row with role = 'admin'. database.md §1: admin is "manual
-- provisioning," never self-registration.
drop policy profiles_insert_own on public.profiles;

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id and role in ('familia', 'ninera'));

-- 4. profiles.id -> auth.users.id was `on delete cascade`, in tension with the documented
-- "never hard-delete, always anonymize" lifecycle (database.md §1): a raw
-- `auth.admin.deleteUser` call would silently cascade-delete profiles and everything
-- hanging off it. Switched to `on delete restrict` so a hard delete of the auth.users row
-- is structurally blocked -- the only way to remove an account is the documented
-- anonymization code path (ADM-05, a later story), which never calls the Auth delete API.
alter table public.profiles drop constraint profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete restrict;

-- Optional/non-blocking hardening from Code Review Minor #2/#3: cheap, consistent
-- extensions of this schema's existing invariant-enforcement pattern (mirrors the
-- salario_min <= salario_max check already on perfil_ninera). Not mandated by
-- database.md, but low-risk and prevents a class of future data-integrity bugs.

-- database.md §3: "publicado ... True once perfil_completo." Both are plain columns on
-- the same row (unlike perfil_completo itself, this one *can* be a same-row check).
alter table public.perfil_ninera
  add constraint perfil_ninera_publicado_requires_completo
  check (not publicado or perfil_completo);

alter table public.perfil_ninera
  add constraint perfil_ninera_anos_experiencia_non_negative
  check (anos_experiencia is null or anos_experiencia >= 0);

alter table public.perfil_ninera
  add constraint perfil_ninera_salario_non_negative
  check (
    (salario_min is null or salario_min >= 0)
    and (salario_max is null or salario_max >= 0)
  );

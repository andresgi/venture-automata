-- E4-04 (FAM-07 favoritas): favoriting is a second, independent trigger (alongside
-- E4-03's first-profile-view) for the same underlying "create a pipeline row on first
-- engagement" behavior (database.md §6, architecture.md §17/§20). `es_favorita` is added
-- rather than reusing `estado` because favorite/unfavorite must be able to flip
-- independently of pipeline lifecycle state (`nueva` -> ... -> `descartada`) without ever
-- deleting the row (architecture.md §17's frozen-snapshot design treats a pipeline row as
-- permanent once created).
alter table public.pipeline
  add column es_favorita boolean not null default false;

-- Mirrors `record_candidate_profile_view` (20260903000012_candidate_profile_view.sql)'s
-- defense-in-depth trust boundary: re-validates ownership + current candidate eligibility
-- server-side rather than trusting the caller. Unlike the view RPC, this must handle both
-- directions (favorite/unfavorite) and must never overwrite an already-frozen snapshot --
-- if a pipeline row already exists (created by a prior favorite or profile view), only
-- `es_favorita` and `updated_at` are touched; `match_score_snapshot`/
-- `match_checklist_snapshot` are only ever written at row-creation time.
create or replace function public.set_candidate_favorite(
  p_necesidad_id uuid,
  p_familia_id uuid,
  p_ninera_id uuid,
  p_favorite boolean,
  p_match_score integer,
  p_match_checklist jsonb
) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from public.necesidades
    where id = p_necesidad_id and familia_id = p_familia_id and estado = 'activa'
  ) then raise exception 'candidate_view_not_allowed'; end if;

  if p_favorite then
    if not exists (
      select 1 from public.perfil_ninera pn
      join public.profiles p on p.id = pn.profile_id
      where pn.profile_id = p_ninera_id and pn.publicado = true
        and pn.perfil_completo = true and p.account_status = 'activa'
    ) then raise exception 'candidate_not_available'; end if;
    if p_match_score not between 0 and 100 then raise exception 'invalid_match_score'; end if;

    insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, es_favorita)
    values (p_necesidad_id, p_ninera_id, 'nueva', p_match_score, coalesce(p_match_checklist, '{}'::jsonb), true)
    on conflict (necesidad_id, ninera_id) do update set es_favorita = true, updated_at = now();
  else
    -- Unfavoriting a row that doesn't exist yet is a no-op, not an error -- there is
    -- nothing to un-favorite, and this keeps the client's optimistic toggle simple.
    update public.pipeline set es_favorita = false, updated_at = now()
    where necesidad_id = p_necesidad_id and ninera_id = p_ninera_id;
  end if;
end; $$;

revoke execute on function public.set_candidate_favorite(uuid, uuid, uuid, boolean, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.set_candidate_favorite(uuid, uuid, uuid, boolean, integer, jsonb)
  to service_role;

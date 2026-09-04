\set ON_ERROR_STOP on
begin;
delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502');
delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502');
delete from public.profiles where id in ('00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513');
delete from auth.users where id in ('00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513');
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token) values ('00000000-0000-0000-0000-000000000511','authenticated','authenticated','e4d-family-a@test.invalid','',''),('00000000-0000-0000-0000-000000000512','authenticated','authenticated','e4d-family-b@test.invalid','',''),('00000000-0000-0000-0000-000000000513','authenticated','authenticated','e4d-candidate@test.invalid','','');
insert into public.profiles (id,role,nombre) values ('00000000-0000-0000-0000-000000000511','familia','Familia A'),('00000000-0000-0000-0000-000000000512','familia','Familia B'),('00000000-0000-0000-0000-000000000513','ninera','Candidata');
insert into public.perfil_ninera (profile_id,perfil_completo,publicado) values ('00000000-0000-0000-0000-000000000513',true,true);
insert into public.necesidades (id,familia_id,estado) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000511','activa'),('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000512','activa');
commit;
set role service_role;

-- Wrong owner is rejected, same defense-in-depth as record_candidate_profile_view.
do $$ declare failed boolean := false; begin begin perform public.set_candidate_favorite('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513',true,80,'{}'); exception when others then failed := true; end; if not failed then raise exception 'wrong owner accepted'; end if; end $$;

-- Unpublished candidate cannot be favorited.
update public.perfil_ninera set publicado=false where profile_id='00000000-0000-0000-0000-000000000513';
do $$ declare failed boolean := false; begin begin perform public.set_candidate_favorite('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000513',true,80,'{}'); exception when others then failed := true; end; if not failed then raise exception 'unpublished candidate accepted'; end if; end $$;
update public.perfil_ninera set publicado=true where profile_id='00000000-0000-0000-0000-000000000513';

-- Favoriting with no prior pipeline row creates one, frozen with the given snapshot.
select public.set_candidate_favorite('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000513',true,80,'{"location":true}');
do $$ declare fav boolean; s int; begin
  select es_favorita, match_score_snapshot into fav, s from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000501' and ninera_id='00000000-0000-0000-0000-000000000513';
  if fav is distinct from true or s <> 80 then raise exception 'favorite creation assertion failed'; end if;
end $$;

-- A later favorite call never re-freezes the snapshot.
select public.set_candidate_favorite('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000513',true,10,'{}');
do $$ declare s int; begin
  select match_score_snapshot into s from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000501' and ninera_id='00000000-0000-0000-0000-000000000513';
  if s <> 80 then raise exception 'snapshot was re-frozen on repeat favorite'; end if;
end $$;

-- Unfavoriting flips the flag without deleting the row or touching the snapshot.
select public.set_candidate_favorite('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000513',false,80,'{}');
do $$ declare fav boolean; s int; cnt int; begin
  select es_favorita, match_score_snapshot into fav, s from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000501' and ninera_id='00000000-0000-0000-0000-000000000513';
  select count(*) into cnt from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000501' and ninera_id='00000000-0000-0000-0000-000000000513';
  if fav is distinct from false or s <> 80 or cnt <> 1 then raise exception 'unfavorite assertion failed'; end if;
end $$;

-- Unfavoriting a pair with no existing pipeline row is a no-op, not an error.
select public.set_candidate_favorite('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513',false,80,'{}');
do $$ declare cnt int; begin
  select count(*) into cnt from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000502';
  if cnt <> 0 then raise exception 'unfavorite-with-no-row created a row'; end if;
end $$;

-- Favoriting an existing (previously-viewed) pipeline row flips es_favorita without
-- touching its already-frozen snapshot.
insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, es_favorita)
values ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000513','nueva',55,'{"availability":true}',false);
select public.set_candidate_favorite('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513',true,99,'{}');
do $$ declare fav boolean; s int; c jsonb; begin
  select es_favorita, match_score_snapshot, match_checklist_snapshot into fav, s, c from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000502' and ninera_id='00000000-0000-0000-0000-000000000513';
  if fav is distinct from true or s <> 55 or c <> '{"availability":true}'::jsonb then raise exception 'favorite-existing-row assertion failed'; end if;
end $$;

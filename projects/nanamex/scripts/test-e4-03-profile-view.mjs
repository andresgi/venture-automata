import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
const setup = readFileSync(new URL("./test-e4-03-profile-view.sql", import.meta.url));
const probe = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-c", "select 1"], { env: { ...process.env, PGPASSWORD: "postgres" } });
const base = probe.status === 0 ? ["psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]] : ["docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]];
const run = (sql) => new Promise((resolve, reject) => { const p = spawn(base[0], base[1], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "inherit", "inherit"] }); p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))); p.stdin.end(sql); });
const teardown = "delete from public.analytics_events where necesidad_id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403'); delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403'); delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403'); delete from public.profiles where id in ('00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413'); delete from auth.users where id in ('00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413');";
try {
  await run(setup);
  const call = "set role service_role; select public.record_candidate_profile_view('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',75,'{}');";
  await Promise.all([run(call), run(call)]);
  await run("set role service_role; do $$ declare p int; v int; c int; begin select count(*) into p from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000403'; select count(*) into v from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000403' and event_name='candidate_profile_viewed'; select count(*) into c from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000403' and event_name='compatible_match_found'; if p<>1 or v<>2 or c<>1 then raise exception 'concurrency assertion failed'; end if; end $$;");
} finally {
  // Exception-safe cleanup (Code Review minor finding): always remove fixtures, even if an
  // assertion above failed, so a failed run doesn't leave stale rows for the next invocation.
  await run(teardown);
}

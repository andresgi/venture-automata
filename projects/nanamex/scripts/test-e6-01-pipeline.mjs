import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
const sql = readFileSync(new URL("./test-e6-01-pipeline.sql", import.meta.url));
const probe = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-c", "select 1"], { env: { ...process.env, PGPASSWORD: "postgres" } });
const base = probe.status === 0 ? ["psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]] : ["docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]];
const run = (input) => new Promise((resolve, reject) => { const p = spawn(base[0], base[1], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "inherit", "inherit"] }); p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))); p.stdin.end(input); });
try {
  await run(sql);
} finally {
  await run("delete from public.analytics_events where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702'); delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702'); delete from public.necesidad_children where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702'); delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702'); delete from public.ninera_zonas where ninera_id='00000000-0000-0000-0000-000000000723'; delete from public.ninera_experiencia_edades where ninera_id='00000000-0000-0000-0000-000000000723'; delete from public.perfil_ninera where profile_id='00000000-0000-0000-0000-000000000723'; delete from public.profiles where id in ('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000722','00000000-0000-0000-0000-000000000723'); delete from auth.users where id in ('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000722','00000000-0000-0000-0000-000000000723'); delete from public.zonas where id='00000000-0000-0000-0000-000000000741';");
}

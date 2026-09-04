import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
const setup = readFileSync(new URL("./test-e4-04-favorites.sql", import.meta.url));
const probe = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-c", "select 1"], { env: { ...process.env, PGPASSWORD: "postgres" } });
const base = probe.status === 0 ? ["psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]] : ["docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]];
const run = (sql) => new Promise((resolve, reject) => { const p = spawn(base[0], base[1], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "inherit", "inherit"] }); p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))); p.stdin.end(sql); });
const teardown = "delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502'); delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502'); delete from public.profiles where id in ('00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513'); delete from auth.users where id in ('00000000-0000-0000-0000-000000000511','00000000-0000-0000-0000-000000000512','00000000-0000-0000-0000-000000000513');";
try {
  await run(setup);
} finally {
  // Exception-safe cleanup, same pattern as test-e4-03-profile-view.mjs: always remove
  // fixtures, even if an assertion above failed.
  await run(teardown);
}

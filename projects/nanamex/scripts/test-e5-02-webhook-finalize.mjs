import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
const setup = readFileSync(new URL("./test-e5-02-webhook-finalize.sql", import.meta.url));
const probe = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-c", "select 1"], { env: { ...process.env, PGPASSWORD: "postgres" } });
const base = probe.status === 0 ? ["psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]] : ["docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]];
const run = (sql) => new Promise((resolve, reject) => { const p = spawn(base[0], base[1], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "inherit", "inherit"] }); p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))); p.stdin.end(sql); });
const familyId = "00000000-0000-0000-0000-000000000552";
const teardown = `delete from public.analytics_events where profile_id='${familyId}'; delete from public.entitlements where familia_id='${familyId}'; delete from public.payments where familia_id='${familyId}'; delete from public.profiles where id='${familyId}'; delete from auth.users where id='${familyId}';`;
try {
  await run(setup);
} finally {
  // Exception-safe cleanup, same pattern as test-e4-03-profile-view.mjs/test-e4-04-favorites.mjs.
  await run(teardown);
}

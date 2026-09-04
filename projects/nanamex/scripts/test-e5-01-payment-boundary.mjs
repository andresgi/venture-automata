import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const setup = readFileSync(new URL("./test-e5-01-payment-boundary.sql", import.meta.url));
const probe = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-c", "select 1"], { env: { ...process.env, PGPASSWORD: "postgres" } });
const base = probe.status === 0
  ? ["psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]]
  : ["docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]];
const run = (sql) => new Promise((resolve, reject) => {
  const child = spawn(base[0], base[1], { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "inherit", "inherit"] });
  child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`)));
  child.stdin.end(sql);
});
const familyId = "00000000-0000-0000-0000-000000000551";
const teardown = `delete from public.payments where familia_id='${familyId}'; delete from public.profiles where id='${familyId}'; delete from auth.users where id='${familyId}';`;
try {
  await run(setup);
  await run(`delete from public.payments where familia_id='${familyId}';`);
  const attempts = ["boundary-race-a", "boundary-race-b"].map((key) => run(`begin; insert into public.payments (familia_id, provider, idempotency_key, amount, status) values ('${familyId}', 'stripe', '${key}', 29900, 'pendiente'); select pg_sleep(0.2); commit;`));
  const results = await Promise.allSettled(attempts);
  if (results.filter((result) => result.status === "fulfilled").length !== 1) throw new Error("expected exactly one concurrent pending insert to commit");
  await run(`set role service_role; do $$ declare c int; begin select count(*) into c from public.payments where familia_id='${familyId}' and status='pendiente'; if c <> 1 then raise exception 'concurrent pending assertion failed'; end if; end $$;`);
} finally {
  await run(teardown);
}

import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const ninera = randomUUID();
const otherPath = `${ninera}/concurrent`;
const localPsql = spawnSync("psql", ["--version"], { stdio: "ignore" }).error?.code !== "ENOENT";
const command = localPsql ? "psql" : "docker";
const baseArgs = localPsql
  ? ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
  : ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];

function psql(sql, args = baseArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
    child.stdin.end(sql);
  });
}

const setup = `
insert into auth.users (id, aud, role, email, encrypted_password, confirmation_token)
values ('${ninera}', 'authenticated', 'authenticated', '${ninera}@concurrent.invalid', '', '');
insert into public.profiles (id, role, nombre) values ('${ninera}', 'ninera', 'Concurrent identity test');
insert into public.perfil_ninera (profile_id, publicado, perfil_completo) values ('${ninera}', true, true);
`;
const cleanup = `delete from public.identity_verifications where ninera_id = '${ninera}'; delete from public.perfil_ninera where profile_id = '${ninera}'; delete from public.profiles where id = '${ninera}'; delete from auth.users where id = '${ninera}';`;

await psql(setup);
const calls = [1, 2].map((index) => psql(`begin; select set_config('role', 'service_role', true); select public.submit_identity_verification('${ninera}', '${otherPath}-${index}.jpg'); select pg_sleep(0.05); commit;`));
const results = await Promise.all(calls);
const verification = await psql(`select count(*) from public.identity_verifications where ninera_id = '${ninera}' and status = 'pendiente';`);
const count = Number((await psql(`select count(*) from public.identity_verifications where ninera_id = '${ninera}' and status = 'pendiente';`)).stdout.match(/\n\s*(\d+)\s*\n/)?.[1] ?? NaN);
await psql(cleanup);

// One session succeeds and the other is rejected by the locked active-submission boundary.
if (results.filter(({ code }) => code === 0).length !== 1 || verification.code !== 0 || count !== 1) {
  console.error("E7-03 concurrent submission probe failed", { results, count });
  process.exit(1);
}
console.log("E7-03 concurrent submission probe passed");

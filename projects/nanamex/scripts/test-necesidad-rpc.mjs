import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const sql = readFileSync(new URL("./test-necesidad-rpc.sql", import.meta.url));
const psql = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, PGPASSWORD: "postgres" } });
if (psql.error?.code !== "ENOENT") process.exit(psql.status ?? 1);
const docker = spawnSync("docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
process.exit(docker.status ?? 1);

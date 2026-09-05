import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const sql = readFileSync(new URL("./test-e7-03-identity-verification.sql", import.meta.url));
const args = ["-h", "127.0.0.1", "-p", "55322", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const local = spawnSync("psql", args, { input: sql, stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, PGPASSWORD: "postgres" } });
if (local.error?.code !== "ENOENT") process.exit(local.status ?? 1);
const docker = spawnSync("docker", ["exec", "-i", "supabase_db_nanamex", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
process.exit(docker.status ?? 1);

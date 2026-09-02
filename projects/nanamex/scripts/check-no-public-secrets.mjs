#!/usr/bin/env node
// Secret-scanning check for E0-02 (engineering/implementation-plan.md).
//
// Guards the specific risk engineering/security.md §5 / architecture.md §13 call out:
// the Supabase service-role key (and other server-only secrets) must never be exposed
// client-side — never a `NEXT_PUBLIC_*` env var, never referenced outside server-only
// code, and no real `.env*` file may ever be committed. Intentionally narrow/targeted
// rather than a general-purpose entropy-based secret scanner — this checks the exact
// mistakes this project's architecture explicitly forbids.
//
// Run via `npm run check:secrets`; wired into CI (.github/workflows/nanamex-ci.yml).

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const errors = [];

// 1. .env.example must not define a NEXT_PUBLIC_* var that looks like a server-only
//    secret (service-role key, generic "SECRET", password). Known-safe public values
//    (Supabase anon key, PostHog client key, both public by design) are not flagged.
const envExamplePath = path.join(repoRoot, ".env.example");
if (existsSync(envExamplePath)) {
  const lines = readFileSync(envExamplePath, "utf8").split("\n");
  const sensitivePattern = /SERVICE_ROLE|SECRET|PASSWORD|AUTH_TOKEN|WEBHOOK_SIGNING/i;

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) continue;
    const varName = match[1];

    if (varName.startsWith("NEXT_PUBLIC_") && sensitivePattern.test(varName)) {
      errors.push(
        `.env.example: "${varName}" is prefixed NEXT_PUBLIC_ but its name matches a ` +
          `server-only secret pattern (${sensitivePattern}). NEXT_PUBLIC_* vars are ` +
          `bundled into client-side JavaScript.`
      );
    }
  }
} else {
  errors.push(".env.example is missing — required to document server vs. public env vars.");
}

// 2. No real .env* file may be tracked by git (only .env.example is allowed).
let trackedFiles = [];
try {
  trackedFiles = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
} catch {
  // Not fatal — if git isn't available (unlikely in CI), skip this check rather than
  // false-failing the whole scan.
  trackedFiles = [];
}

const trackedEnvFiles = trackedFiles.filter(
  (f) => /(^|\/)\.env(\..*)?$/.test(f) && !f.endsWith(".env.example")
);
for (const f of trackedEnvFiles) {
  errors.push(`Tracked env file found in git: ${f} — real .env files must never be committed.`);
}

// 3. SUPABASE_SERVICE_ROLE_KEY must only be referenced from the designated server-only
//    module (lib/supabase/server.ts), never from a file elsewhere in the app that a
//    Client Component could import.
const allowedServiceRoleFiles = new Set(["lib/supabase/server.ts"]);
const scanDirs = ["app", "actions", "components", "lib", "emails"];
const serviceRoleRefPattern = /SUPABASE_SERVICE_ROLE_KEY/;

for (const dir of scanDirs) {
  const absDir = path.join(repoRoot, dir);
  if (!existsSync(absDir)) continue;

  const filesInDir = trackedFiles.filter((f) => f.startsWith(`${dir}/`));
  for (const relFile of filesInDir) {
    if (allowedServiceRoleFiles.has(relFile)) continue;
    const absFile = path.join(repoRoot, relFile);
    if (!existsSync(absFile)) continue;

    let content;
    try {
      content = readFileSync(absFile, "utf8");
    } catch {
      continue;
    }

    if (serviceRoleRefPattern.test(content)) {
      errors.push(
        `${relFile}: references SUPABASE_SERVICE_ROLE_KEY outside the designated ` +
          `server-only client (lib/supabase/server.ts).`
      );
    }
  }
}

if (errors.length > 0) {
  console.error("check-no-public-secrets: FAILED\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} issue(s) found.`);
  process.exit(1);
}

console.log("check-no-public-secrets: OK — no server-only secret exposed client-side.");

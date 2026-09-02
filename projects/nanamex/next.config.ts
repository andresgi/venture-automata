import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is nested under projects/nanamex/ in a monorepo that relies on Claude
  // Code's directory-walk-up to inherit the shared AGENTS.md/CLAUDE.md from the repo
  // root (see repo root README.md, "Two ways to run a venture"). Next.js 16's `next dev`
  // auto-writes/upserts its own AGENTS.md + CLAUDE.md into this directory when it
  // detects an AI coding agent, which would shadow those inherited framework files.
  // Keep this disabled.
  agentRules: false,
};

export default nextConfig;

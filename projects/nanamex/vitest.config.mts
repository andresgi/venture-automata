import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // "server-only" throws unless resolved under Next.js's "react-server" build
      // condition, which real `next build` applies correctly (that's the actual
      // client/server enforcement — see lib/supabase/server.ts). Vitest runs in plain
      // Node, so alias it to its own no-op export here purely so server-only modules
      // remain unit-testable; this does not weaken the real Next.js build-time guard.
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js"
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});

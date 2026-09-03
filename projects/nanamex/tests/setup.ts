import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library unmounts rendered trees between tests automatically under Jest,
// but Vitest needs this wired explicitly. No test file needed this before E1-01 (AUTH-01
// landing) since it's the first suite with more than one `render()` call per file --
// without this, a second `render()` in the same file leaves the first tree mounted
// alongside it, causing false "multiple elements found" failures.
afterEach(() => {
  cleanup();
});

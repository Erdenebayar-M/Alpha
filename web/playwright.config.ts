import { defineConfig } from "@playwright/test";

/**
 * Narrow, local-only setup for the Reveal overshoot regression (see
 * components/animations/Reveal.tsx and docs/adr/0004-playwright-for-reveal-regression.md).
 * Chromium only, not wired into web-ci.yml yet — run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});

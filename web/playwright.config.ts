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
  // The fixture backend stands in for the real one so e2e needs no database;
  // the Next server is pointed at it via BACKEND_URL, which takes precedence
  // over .env.local. Not reused: a dev server already running against the
  // real backend would silently bypass the fixture, so stop it before running.
  webServer: [
    {
      command: "node e2e/fixture-backend/server.mjs",
      url: "http://localhost:3211/api/articles/fixture-article",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      // A (fake) public Google client ID, so the Google button renders; with
      // none it is hidden, which e2e doesn't cover (one Next server per run).
      env: { BACKEND_URL: "http://localhost:3211", GOOGLE_CLIENT_ID: "fixture-client-id.apps.googleusercontent.com" },
    },
  ],
});

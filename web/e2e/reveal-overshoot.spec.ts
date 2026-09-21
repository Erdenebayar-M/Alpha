import { test, expect } from "@playwright/test";

/**
 * Regression for the CategoryPills bug: a fast scroll can move a short,
 * near-the-fold Reveal target from below the trigger line straight to fully
 * above the viewport between two IntersectionObserver samples, so
 * `isIntersecting` never reports `true` and the target is stuck at
 * `opacity: 0` forever. A single `window.scrollTo` inside `page.evaluate`
 * does NOT reproduce this: Chromium skips re-invoking the observer callback
 * entirely when the intersection ratio never leaves 0 in one synchronous
 * jump, so there's nothing for the `hasScrolledPast` fallback to react to
 * (confirmed by instrumenting IntersectionObserver directly). A real wheel
 * scroll — `page.mouse.wheel` — goes through the compositor like an actual
 * fast flick and does trigger the callback, so that's what this reproduces
 * with; see components/animations/Reveal.tsx's `hasScrolledPast` fallback.
 *
 * `rise` mode gets the same `hasScrolledPast` fallback (Reveal.tsx) but has
 * no equivalent automated test here: its only current user, Pricing on `/`,
 * is the last section on its page, so there's no scroll room to ever land
 * "past" it — nothing after it to scroll into. Forcing an artificial
 * overshoot (a large injected spacer + scroll, or a forced viewport-resize
 * recheck) didn't reproduce the failure either; it just exercised unrelated
 * Chromium scroll-animation behavior for very large jumps. Covered by code
 * review instead — see docs/adr/0004-playwright-for-reveal-regression.md.
 */

test("sequence mode reveals items skipped by a fast scroll (/landing-new CategoryPills)", async ({
  page,
}) => {
  await page.goto("/landing-new");

  const wrapper = page.locator('nav [data-reveal="sequence"]').first();
  const items = wrapper.locator("[data-reveal-item]");
  await expect(items.first()).toBeAttached();

  // One large wheel delta, matching the fast flick that used to skip the
  // pills entirely (see the module doc comment for why scrollTo can't do this).
  await page.mouse.wheel(0, 6000);

  const count = await items.count();
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i)).toHaveAttribute("data-visible", "true");
  }
});

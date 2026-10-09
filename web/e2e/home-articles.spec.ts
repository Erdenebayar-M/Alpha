import { test, expect, type Page } from "@playwright/test";

// Mirrors e2e/fixture-backend/server.mjs's articleScenarios (a spec can't
// import the .mjs fixture), newest first.
const FIXTURE_PORT = 3211;
const TITLES = {
  normal: ["Normal newest article", "Normal featured article", "Normal second article", "Normal third article"],
  "bare-featured": ["Bare featured article"],
  "no-featured": ["No-featured first article", "No-featured second article"],
  down: [],
} as const satisfies Record<string, readonly string[]>;
type ArticleScenario = keyof typeof TITLES;

// Runs against e2e/fixture-backend (see playwright.config.ts). Each test
// switches the fixture's article list scenario, so this file runs serially
// and puts `normal` back afterwards. The scenario is global to the fixture,
// so a spec running in parallel that loads `/` can briefly see another
// scenario's Articles; none of those specs asserts on the article sections.
// Every scenario's titles are unique to it, so stale data from another
// scenario fails these checks instead of passing.
test.describe.configure({ mode: "serial" });

// The homepage's article fetches revalidate every ~5 minutes, and `next dev`
// keeps those in its Data Cache across requests too — so a scenario switch
// wouldn't show. In development a request carrying `cache-control: no-cache`
// makes Next ignore `next.revalidate` and fetch from source
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md).
test.use({ extraHTTPHeaders: { "cache-control": "no-cache" } });

async function useScenario(scenario: ArticleScenario) {
  const res = await fetch(`http://localhost:${FIXTURE_PORT}/__articles-scenario`, {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });
  expect(res.ok).toBe(true);
  // A stale mirror would make the absence checks pass vacuously.
  expect((await res.json()).data.titles).toEqual(TITLES[scenario]);
}

test.afterAll(() => useScenario("normal"));

const featuredSection = (page: Page) => page.getByRole("region", { name: "Онцлох нийтлэл" });

function otherScenarioTitles(scenario: ArticleScenario) {
  return Object.entries(TITLES).flatMap(([name, titles]) => (name === scenario ? [] : titles));
}

async function expectNoOtherScenario(page: Page, scenario: ArticleScenario) {
  for (const title of otherScenarioTitles(scenario)) {
    await expect(page.getByText(title)).toHaveCount(0);
  }
}

test("the Featured card shows the Featured Article and links to its reading page", async ({ page }) => {
  await useScenario("normal");
  await page.goto("/");
  const section = featuredSection(page);

  await expect(section.getByRole("heading", { level: 3, name: TITLES.normal[1] })).toBeVisible();
  await expect(section.getByText("Зөв бичих", { exact: true })).toBeVisible();
  await expect(section.getByText("Normal featured excerpt")).toBeVisible();
  await expect(section.getByRole("link", { name: `«${TITLES.normal[1]}» нийтлэлийг унших` })).toHaveAttribute(
    "href",
    "/articles/normal-featured"
  );

  // The Thumbnail fills the illustration box in place of the bespoke art; its
  // alt is the Article's own.
  const thumbnail = section.getByRole("img", { name: "Normal featured thumbnail" });
  await expect(thumbnail).toHaveAttribute("loading", "lazy");
  await expect(thumbnail).toHaveAttribute("src", `http://localhost:${FIXTURE_PORT}/content/images/fixture-thumbnail.svg`);
  await expect(section.getByRole("img", { name: /ОРто/ })).toHaveCount(0);
  await expectNoOtherScenario(page, "normal");
});

test("a Featured Article with no excerpt or Thumbnail still renders a complete card", async ({ page }) => {
  await useScenario("bare-featured");
  await page.goto("/");
  const section = featuredSection(page);

  await expect(section.getByRole("heading", { level: 3, name: TITLES["bare-featured"][0] })).toBeVisible();
  await expect(section.getByText("Унших", { exact: true })).toBeVisible();
  await expect(section.locator("p")).toHaveCount(0);
  await expect(section.getByRole("img", { name: /ОРто/ })).toBeVisible();
  await expect(section.getByRole("link")).toHaveAttribute("href", "/articles/bare-featured");
  await expectNoOtherScenario(page, "bare-featured");
});

test("with no Featured Article the Featured section is not rendered", async ({ page }) => {
  await useScenario("no-featured");
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "Онцлох нийтлэл" })).toHaveCount(0);
  await expect(page.locator("#featured-article-heading")).toHaveCount(0);
  await expectNoOtherScenario(page, "no-featured");
});

test("with the backend down the Featured section is hidden and the homepage still loads", async ({ page }) => {
  await useScenario("down");
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#featured-article-heading")).toHaveCount(0);
  for (const title of otherScenarioTitles("down")) await expect(page.getByText(title)).toHaveCount(0);
});

test("the Featured card fits every width and its link shows focus", async ({ page }) => {
  await useScenario("normal");
  await page.goto("/");
  const section = featuredSection(page);
  const link = section.getByRole("link");

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await section.scrollIntoViewIfNeeded();
    // Measure the card once its Reveal slide-in has settled. This checks the
    // Featured card's own box rather than the document's scrollWidth, which
    // other sections' unrevealed (offset) Reveal items also widen.
    await expect.poll(async () => (await link.boundingBox())!.x + 40, { message: `at ${width}px` }).toBeLessThanOrEqual(width);
    const card = (await section.boundingBox())!;
    expect(card.x, `at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width, `at ${width}px`).toBeLessThanOrEqual(width);
  }

  // Reached from the keyboard, so `:focus-visible` applies; the `focus-ring`
  // utility draws its ring as a box-shadow.
  await link.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await expect(link).not.toHaveCSS("box-shadow", "none");
});

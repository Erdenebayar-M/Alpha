import { test, expect, type Locator } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.

test("a Published Article shows its title and Body text", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  await expect(page.getByRole("heading", { level: 1, name: "Fixture article title" })).toBeVisible();
  await expect(page.getByText("Centered paragraph text")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Level two subheading" })).toBeVisible();
  await expect(page.getByText("Quoted words")).toBeVisible();
});

test("an unknown slug shows the not-found page", async ({ page }) => {
  const response = await page.goto("/articles/no-such-article");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

async function left(locator: Locator) {
  return (await locator.boundingBox())!.x;
}

test("at desktop width subheadings and Quotes hang left of the paragraphs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/articles/fixture-article");
  const paragraph = await left(page.getByText("Centered paragraph text"));
  expect(await left(page.getByRole("heading", { level: 2, name: "Level two subheading" }))).toBeLessThan(paragraph);
  expect(await left(page.getByText("Quoted words").locator("xpath=ancestor::blockquote"))).toBeLessThan(paragraph);
});

test("a centered paragraph stays centered within the reading column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/articles/fixture-article");
  const p = (await page.getByText("Centered paragraph text").boundingBox())!;
  const card = (await page.locator("article").boundingBox())!;
  expect(p.width).toBeLessThanOrEqual(775);
  expect(Math.abs(p.x + p.width / 2 - (card.x + card.width / 2))).toBeLessThan(1);
});

test("no horizontal page scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/articles/fixture-article");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a Quote is wrapped in site-drawn quotation marks with a dash attribution", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  const quote = page.locator("blockquote");
  await expect(quote.locator("p")).toHaveText("“Quoted words”");
  await expect(quote.locator("footer")).toHaveText("— Quote author");
});

test("split ordered Lists count 1, 2, 3, 4 across the paragraph between them", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  await expect(page.locator("ol > li")).toHaveText([
    "1.First ordered item",
    "2.Second ordered item",
    "3.Third ordered item",
    "4.Fourth ordered item",
  ]);
});

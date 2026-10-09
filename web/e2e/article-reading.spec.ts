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
  expect(p.width).toBeLessThanOrEqual(844);
  expect(Math.abs(p.x + p.width / 2 - (card.x + card.width / 2))).toBeLessThan(1);
  await expect(page.getByText("Centered paragraph text")).toHaveCSS("text-align", "center");
});

for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`no horizontal page scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/articles/fixture-article");
    // The Category pills slide in from 40px right; measure once they've settled.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(0);
  });
}

test("the reading page logs no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/articles/fixture-article");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
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

test("the Article's own Category pill is current and the other pills are not", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  const pills = page.getByRole("navigation", { name: "Ангилалын сонголтууд" });
  const current = pills.getByRole("link", { name: "Унших" });
  await expect(current).toHaveAttribute("aria-current", "true");
  // Figma 70:9442: the current pill keeps the lilac fill and gains a 6px green border.
  await expect(current).toHaveCSS("border-top-width", "6px");
  await expect(current).toHaveCSS("border-top-color", "rgb(164, 220, 106)");
  for (const name of ["Зөв бичих", "Оношилгоо", "Үсэглэх"]) {
    await expect(pills.getByRole("link", { name })).not.toHaveAttribute("aria-current", /.*/);
  }
});

test("the Оношилгоо pill leads to the Diagnostic", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  const href = await page.getByRole("navigation", { name: "Ангилалын сонголтууд" }).getByRole("link", { name: "Оношилгоо" }).getAttribute("href");
  expect(href).toBe("/register-child");
});

test("the reading page has the site nav and none of the listing chrome", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  await expect(page.getByRole("navigation", { name: "Үндсэн цэс" })).toBeVisible();
  await expect(page.locator("article img[alt]:not([alt='Fixture image'])")).toHaveCount(0);
  await expect(page.locator("article time")).toHaveCount(0);
});

test("the Category pills line up with the reading card at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/articles/fixture-article");
  const pills = (await page.getByRole("navigation", { name: "Ангилалын сонголтууд" }).locator("ul").boundingBox())!;
  const card = (await page.locator("article").boundingBox())!;
  expect(Math.abs(pills.x - card.x)).toBeLessThan(1);
  expect(Math.abs(pills.x + pills.width - (card.x + card.width))).toBeLessThan(1);
});

test("the reading card follows Figma 70:9243 at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/articles/fixture-article");
  const card = page.locator("article");
  await expect(card).toHaveCSS("border-top-left-radius", "32px");
  await expect(card).toHaveCSS("padding-top", "48px");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "36px");
  const paragraph = page.getByText("Centered paragraph text");
  await expect(paragraph).toHaveCSS("font-size", "18px");
  await expect(paragraph).toHaveCSS("line-height", "31px");
  await expect(page.getByRole("heading", { level: 2, name: "Level two subheading" })).toHaveCSS("font-size", "26px");
  await expect(page.locator("blockquote")).toHaveCSS("font-size", "40px");
});

test("at desktop width subheadings span the 962px column, centred in the card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/articles/fixture-article");
  const h2 = (await page.getByRole("heading", { level: 2, name: "Level two subheading" }).boundingBox())!;
  const card = (await page.locator("article").boundingBox())!;
  expect(Math.abs(h2.width - 962)).toBeLessThan(1);
  expect(Math.abs(h2.x + h2.width / 2 - (card.x + card.width / 2))).toBeLessThan(1);
});

test("every parent sees the whole Body: no locked or blurred block", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  await expect(page.getByText("Түгжээг тайлах")).toHaveCount(0);
  await expect(page.getByText("Онцлох нийтлэл")).toHaveCount(0);
  const blurred = await page
    .locator("article *")
    .evaluateAll((els) => els.filter((el) => getComputedStyle(el).filter.includes("blur")).length);
  expect(blurred).toBe(0);
  await expect(page.getByText("Plain bullet two")).toBeVisible();
});

test("the stray Collections heading is not shown above the card", async ({ page }) => {
  await page.goto("/articles/fixture-article");
  await expect(page.getByText("Сэдвээр нь судлаад илүү их ойлголттой болж аваарай")).toHaveCount(0);
});

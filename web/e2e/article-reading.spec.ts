import { test, expect } from "@playwright/test";

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

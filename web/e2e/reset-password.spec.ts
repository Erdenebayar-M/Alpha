import { test, expect, type Page } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
// The fixture accepts VALID_RESET_TOKEN and answers INVALID_RESET_TOKEN for
// anything else, as the real route does for an expired, used or unknown link.
const VALID_RESET_TOKEN = "fixture-reset-token";
const NEW_PASSWORD = "long-enough-pw";

async function setPassword(page: Page, password = NEW_PASSWORD, confirm = password) {
  await page.getByLabel("Шинэ нууц үг", { exact: true }).fill(password);
  await page.getByLabel("Нууц үг давтах").fill(confirm);
  await page.getByRole("button", { name: "Хадгалах" }).click();
}

async function expectInvalidState(page: Page) {
  await expect(page.getByText("Холбоосын хугацаа дууссан эсвэл хүчингүй байна.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Шинэ холбоос авах" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByLabel("Шинэ нууц үг", { exact: true })).toHaveCount(0);
}

test("renders the new-password form for a link with a token", async ({ page }) => {
  await page.goto(`/reset-password?token=${VALID_RESET_TOKEN}`);
  await expect(page.getByRole("heading", { level: 1, name: "Шинэ нууц үг үүсгэх" })).toBeVisible();
  await expect(page.getByText("Бүртгэлтэй юу?")).toBeVisible();
  await expect(page.getByLabel("Шинэ нууц үг", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.getByLabel("Нууц үг давтах")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Хадгалах" })).toBeVisible();
});

test("a short or mismatched password shows its message and does not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/reset-password", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto(`/reset-password?token=${VALID_RESET_TOKEN}`);

  await setPassword(page, "short");
  await expect(page.getByText("Нууц үг дор хаяж 8 тэмдэгттэй байна.")).toBeVisible();

  await setPassword(page, NEW_PASSWORD, "something-else");
  await expect(page.getByText("Нууц үг таарахгүй байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("a valid link sets the password, shows success, sets the session cookie and redirects to /", async ({ page, context }) => {
  await page.goto(`/reset-password?token=${VALID_RESET_TOKEN}`);
  await setPassword(page);

  await expect(page.getByText("Нууц үг амжилттай солигдлоо.")).toBeVisible();
  await page.waitForURL((url) => url.pathname === "/");

  const session = (await context.cookies()).find((c) => c.name === "orto_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", value: "fixture-session-token" });
});

test("an expired, used or unknown link shows the invalid state and offers a new link", async ({ page, context }) => {
  await page.goto("/reset-password?token=expired-or-used-token");
  await setPassword(page);

  await expectInvalidState(page);
  expect((await context.cookies()).find((c) => c.name === "orto_session")).toBeUndefined();
});

test("a link without a token shows the invalid state straight away", async ({ page }) => {
  await page.goto("/reset-password");
  await expectInvalidState(page);
});

test("the page keeps its token out of search results and Referer headers", async ({ page }) => {
  await page.goto(`/reset-password?token=${VALID_RESET_TOKEN}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
});

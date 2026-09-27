import { test, expect } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
// The fixture accepts VALID_CONFIRMATION_TOKEN and answers
// INVALID_CONFIRMATION_TOKEN for anything else, as the real route does for an
// expired, used or unknown link.
const VALID_CONFIRMATION_TOKEN = "fixture-confirmation-token";
const INVALID_MESSAGE = "Баталгаажуулах холбоосын хугацаа дууссан эсвэл хүчингүй байна.";

const confirmUrl = (params: Record<string, string>) => `/confirm-email?${new URLSearchParams(params)}`;

async function expectSignedIn(context: import("@playwright/test").BrowserContext) {
  const session = (await context.cookies()).find((c) => c.name === "orto_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", value: "fixture-session-token" });
}

test("a valid link signs the parent in and lands on /register-child", async ({ page, context }) => {
  await page.goto(confirmUrl({ token: VALID_CONFIRMATION_TOKEN }));
  await page.waitForURL((url) => url.pathname === "/register-child");
  await expectSignedIn(context);
});

test("a valid link with a safe `next` lands there", async ({ page, context }) => {
  await page.goto(confirmUrl({ token: VALID_CONFIRMATION_TOKEN, next: "/articles/fixture-article" }));
  await page.waitForURL((url) => url.pathname === "/articles/fixture-article");
  await expectSignedIn(context);
});

test("an unsafe `next` is ignored for /register-child", async ({ page }) => {
  await page.goto(confirmUrl({ token: VALID_CONFIRMATION_TOKEN, next: "//evil.example.com/" }));
  await page.waitForURL((url) => url.pathname === "/register-child");
});

test("the link is sent to the backend exactly once", async ({ page, request }) => {
  const token = `count-me-${Date.now()}`;
  await page.goto(confirmUrl({ token }));
  await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();
  await page.waitForTimeout(500);

  const tokens: string[] = await (await request.get("http://localhost:3211/__confirm-email-requests")).json();
  expect(tokens.filter((t) => t === token)).toHaveLength(1);
});

test("an expired, used or unknown link says so and signs no one in", async ({ page, context }) => {
  await page.goto(confirmUrl({ token: "expired-or-used-token" }));
  await expect(page.getByRole("heading", { level: 1, name: "Имэйл баталгаажуулах" })).toBeVisible();
  await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/confirm-email");
  expect((await context.cookies()).find((c) => c.name === "orto_session")).toBeUndefined();
});

test("a link without a token says the link is invalid, without calling the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/confirm-email", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/confirm-email");
  await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();
  expect(called).toBe(false);
});

test("a backend failure can be retried", async ({ page, context }) => {
  let failNext = true;
  await page.route("**/api/auth/confirm-email", (route) => {
    if (!failNext) return route.continue();
    failNext = false;
    return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "UPSTREAM_ERROR" }) });
  });
  await page.goto(confirmUrl({ token: VALID_CONFIRMATION_TOKEN }));
  await expect(page.getByText("Алдаа гарлаа. Дахин оролдоно уу.")).toBeVisible();

  await page.getByRole("button", { name: "Дахин оролдох" }).click();
  await page.waitForURL((url) => url.pathname === "/register-child");
  await expectSignedIn(context);
});

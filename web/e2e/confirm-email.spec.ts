import { test, expect } from "@playwright/test";
import { resendRequestsFor } from "./resendRequests";

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

test("an expired, used or unknown link offers a new one, sent to the given email", async ({ page, request }) => {
  const email = "resend-expired@example.com";
  await page.clock.install();
  await page.goto(confirmUrl({ token: "expired-or-used-token", next: "/articles/fixture-article" }));
  await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();

  const resend = page.getByRole("button", { name: /^Дахин илгээх/ });
  await expect(resend).toBeEnabled();
  await page.getByLabel("Имэйл хаяг").fill(email);
  await resend.click();

  await expect(page.getByRole("status").filter({ hasText: "шинэ холбоосыг илгээлээ" })).toBeVisible();
  await expect(resend).toBeDisabled();
  await expect(resend).toHaveText("Дахин илгээх (60)");
  await page.clock.fastForward(61_000);
  await expect(resend).toBeEnabled();
  expect(await resendRequestsFor(request, email)).toEqual([{ email, next: "/articles/fixture-article" }]);
});

test("a link without a token also offers a new one", async ({ page }) => {
  await page.goto("/confirm-email");
  await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Дахин илгээх" })).toBeVisible();
});

test("the resend asks for a valid email, without calling the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/resend-confirmation", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto(confirmUrl({ token: "expired-or-used-token" }));
  await page.getByLabel("Имэйл хаяг").fill("not-an-email");
  await page.getByRole("button", { name: "Дахин илгээх" }).click();
  await expect(page.getByText("Имэйл хаяг буруу байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("a rate-limited resend shows its message and can be retried at once", async ({ page }) => {
  await page.goto(confirmUrl({ token: "expired-or-used-token" }));
  await page.getByLabel("Имэйл хаяг").fill("limited@example.com");
  await page.getByRole("button", { name: "Дахин илгээх" }).click();
  await expect(page.getByText("Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Дахин илгээх" })).toBeEnabled();
});

test("the email used at sign-up is filled in for the resend", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Овог").fill("Бат");
  await page.getByLabel("Нэр", { exact: true }).fill("Болд");
  await page.getByLabel("Имэйл хаяг").fill("prefill@example.com");
  await page.getByLabel("Нууц үг", { exact: true }).fill("long-enough-pw");
  await page.getByLabel("Нууц үгээ давтах").fill("long-enough-pw");
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeVisible();

  await page.goto(confirmUrl({ token: "expired-or-used-token" }));
  await expect(page.getByLabel("Имэйл хаяг")).toHaveValue("prefill@example.com");
});

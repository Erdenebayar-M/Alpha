import { test, expect, type Page } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
const PARENT = { email: "parent@example.com", password: "correct-password" };

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Имэйл хаяг").fill(email);
  await page.getByLabel("Нууц үг").fill(password);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
}

test("renders the card without the Google button or divider", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { level: 1, name: "Нэвтрэх" })).toBeVisible();
  await expect(page.getByText("Бүртгэлгүй юу?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Бүртгүүлэх", exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Имэйл хаяг")).toBeVisible();
  await expect(page.getByLabel("Нууц үг")).toBeVisible();
  await expect(page.getByRole("link", { name: "Нууц үгээ мартсан уу?" })).toBeVisible();
  await expect(page.getByText("Google")).toHaveCount(0);
  await expect(page.getByText("Эсвэл")).toHaveCount(0);
});

test("the site's sign-in link goes to /signin", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Үндсэн цэс" }).getByRole("link", { name: "Нэвтрэх" })).toHaveAttribute("href", "/signin");
});

test("an invalid email shows its message and does not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/signin", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/signin");
  await signIn(page, "not-an-email", "whatever");
  await expect(page.getByText("Имэйл хаяг буруу байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("a wrong password shows the credentials message and sets no session", async ({ page, context }) => {
  await page.goto("/signin");
  await signIn(page, PARENT.email, "wrong-password");
  await expect(page.getByText("Имэйл эсвэл нууц үг буруу байна.")).toBeVisible();
  await expect(page).toHaveURL(/\/signin/);
  expect((await context.cookies()).find((c) => c.name === "orto_session")).toBeUndefined();
});

test("rate limiting shows its message", async ({ page }) => {
  await page.goto("/signin");
  await signIn(page, "limited@example.com", "whatever");
  await expect(page.getByText("Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.")).toBeVisible();
});

test("signing in sets an httpOnly session cookie, hidden from page scripts, and redirects to /", async ({ page, context }) => {
  await page.goto("/signin");
  await signIn(page, PARENT.email, PARENT.password);
  await page.waitForURL((url) => url.pathname === "/");

  const session = (await context.cookies()).find((c) => c.name === "orto_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", value: "fixture-session-token" });
  // 7 days, with a little slack for the time the request took.
  expect(session!.expires - Date.now() / 1000).toBeGreaterThan(60 * 60 * 24 * 7 - 60);
  expect(await page.evaluate(() => document.cookie)).not.toContain("orto_session");
});

test("a same-site `next` is followed", async ({ page }) => {
  await page.goto("/signin?next=/articles/fixture-article");
  await signIn(page, PARENT.email, PARENT.password);
  await page.waitForURL("**/articles/fixture-article");
});

test.describe("an unsafe `next` is ignored", () => {
  for (const next of ["https://evil.example/", "//evil.example/", "/\\evil.example", "evil.example", "/signin", "/api/auth/signin"]) {
    test(next, async ({ request }) => {
      const res = await request.post("/api/auth/signin", { data: { ...PARENT, next } });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ redirectTo: "/" });
    });
  }
});

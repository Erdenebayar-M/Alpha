import { test, expect, type Page } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
const NEW_PARENT = { surname: "Бат", name: "Болд", email: "new-parent@example.com", password: "long-enough-pw" };

async function fillForm(page: Page, values: Partial<typeof NEW_PARENT & { confirm: string }> = {}) {
  const v = { ...NEW_PARENT, confirm: NEW_PARENT.password, ...values };
  await page.getByLabel("Овог").fill(v.surname);
  await page.getByLabel("Нэр", { exact: true }).fill(v.name);
  await page.getByLabel("Имэйл хаяг").fill(v.email);
  await page.getByLabel("Нууц үг", { exact: true }).fill(v.password);
  await page.getByLabel("Нууц үгээ давтах").fill(v.confirm);
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
}

test("renders the card without the Google button or divider", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "Эцэг эхээр бүртгүүлэх" })).toBeVisible();
  await expect(page.getByText("Бүртгэлтэй юу?")).toBeVisible();
  await expect(page.getByLabel("Овог")).toBeVisible();
  await expect(page.getByLabel("Нууц үгээ давтах")).toBeVisible();
  await expect(page.getByText("Google")).toHaveCount(0);
  await expect(page.getByText("Эсвэл")).toHaveCount(0);
});

test("the site's sign-up link goes to /signup", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Үндсэн цэс" }).getByRole("link", { name: "Бүртгүүлэх" })).toHaveAttribute("href", "/signup");
});

test("invalid fields show their messages and do not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/signup", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/signup");
  await fillForm(page, { name: "Б", email: "not-an-email", password: "short", confirm: "short" });
  await expect(page.getByText("Нэр дор хаяж 2 тэмдэгттэй байна.")).toBeVisible();
  await expect(page.getByText("Имэйл хаяг буруу байна.")).toBeVisible();
  await expect(page.getByText("Нууц үг дор хаяж 8 тэмдэгттэй байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("a mismatched confirmation shows its message and does not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/signup", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/signup");
  await fillForm(page, { confirm: "something-else" });
  await expect(page.getByText("Нууц үг таарахгүй байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("a taken email links to /signin", async ({ page, context }) => {
  await page.goto("/signup");
  await fillForm(page, { email: "parent@example.com" });
  await expect(page.getByText("Энэ имэйл хаягаар бүртгэл үүссэн байна.")).toBeVisible();
  await expect(page.getByRole("alert").getByRole("link", { name: "Нэвтрэх" })).toHaveAttribute("href", "/signin");
  expect((await context.cookies()).find((c) => c.name === "orto_session")).toBeUndefined();
});

test("rate limiting shows its message", async ({ page }) => {
  await page.goto("/signup");
  await fillForm(page, { email: "limited@example.com" });
  await expect(page.getByText("Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.")).toBeVisible();
});

test("signing up sends the surname but not the confirmation, sets the session cookie and redirects to /", async ({ page, context, request }) => {
  await page.goto("/signup");
  await fillForm(page);
  await page.waitForURL((url) => url.pathname === "/");

  const session = (await context.cookies()).find((c) => c.name === "orto_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", value: "fixture-session-token" });

  const sent = await (await request.get("http://localhost:3211/__last-register")).json();
  expect(sent).toEqual({ email: NEW_PARENT.email, name: NEW_PARENT.name, surname: NEW_PARENT.surname, password: NEW_PARENT.password });
});

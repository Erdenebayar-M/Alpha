import { test, expect, type Page } from "@playwright/test";
import { resendRequestsFor } from "./resendRequests";

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

test("renders the card", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "Эцэг эхээр бүртгүүлэх" })).toBeVisible();
  await expect(page.getByText("Бүртгэлтэй юу?")).toBeVisible();
  await expect(page.getByLabel("Овог")).toBeVisible();
  await expect(page.getByLabel("Нууц үгээ давтах")).toBeVisible();
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

test("a password that is one run, or holds the parent's name, shows why and does not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/signup", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/signup");
  await fillForm(page, { password: "12345678", confirm: "12345678" });
  await expect(page.getByText("Нэг тэмдэгт давтсан эсвэл дараалсан тоо, үсэг нууц үг болохгүй.")).toBeVisible();
  await fillForm(page, { email: "tsetseg@example.com", password: "tsetseg-2026", confirm: "tsetseg-2026" });
  await expect(page.getByText("Нууц үгэнд нэр эсвэл имэйл хаягаа бүү ашиглаарай.")).toBeVisible();
  expect(called).toBe(false);
});

test("a common password the backend refuses shows why under the password field", async ({ page }) => {
  await page.goto("/signup");
  await fillForm(page, { email: "common-password@example.com", password: "password1", confirm: "password1" });
  await expect(page.getByLabel("Нууц үг", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Энэ нууц үг хэт түгээмэл байна. Өөр нууц үг сонгоно уу.")).toBeVisible();
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

test("signing up sends the surname but not the confirmation, sets no session and shows where the link went", async ({ page, context, request }) => {
  await page.goto("/signup");
  await fillForm(page);

  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeFocused();
  await expect(page.getByText("хаяг руу баталгаажуулах холбоос илгээлээ", { exact: false })).toBeVisible();
  await expect(page.locator("strong", { hasText: NEW_PARENT.email })).toBeVisible();
  await expect(page.getByLabel("Нууц үг", { exact: true })).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/signup");
  expect((await context.cookies()).find((c) => c.name === "orto_session")).toBeUndefined();

  const sent = await (await request.get(`http://localhost:3211/__register?${new URLSearchParams({ email: NEW_PARENT.email })}`)).json();
  expect(sent).toEqual({ email: NEW_PARENT.email, name: NEW_PARENT.name, surname: NEW_PARENT.surname, password: NEW_PARENT.password });
});

test("the check-your-email screen resends the link, with a cooldown", async ({ page, request }) => {
  const email = "resend-signup@example.com";
  await page.clock.install();
  await page.goto("/signup?next=/articles/fixture-article");
  await fillForm(page, { email });

  // A link has just gone out, so the button waits.
  const resend = page.getByRole("button", { name: /^Дахин илгээх/ });
  await expect(resend).toBeDisabled();
  await expect(resend).toHaveText("Дахин илгээх (60)");
  await page.clock.fastForward(5_000);
  await expect(resend).toHaveText("Дахин илгээх (55)");

  await page.clock.fastForward(56_000);
  await expect(resend).toBeEnabled();
  await expect(resend).toHaveText("Дахин илгээх");
  await resend.click();

  await expect(page.getByRole("status")).toContainText("шинэ холбоосыг илгээлээ");
  await expect(resend).toBeDisabled();
  expect(await resendRequestsFor(request, email)).toEqual([{ email, next: "/articles/fixture-article" }]);
});

test("a known domain typo offers a correction, and accepting it replaces the email", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Имэйл хаяг").fill("bat@gmial.com");

  await expect(page.getByText("гэж бичихийг хүссэн үү?", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "bat@gmail.com" }).click();

  await expect(page.getByLabel("Имэйл хаяг")).toHaveValue("bat@gmail.com");
  await expect(page.getByText("гэж бичихийг хүссэн үү?", { exact: false })).toHaveCount(0);
});

test("ignoring the domain typo suggestion still submits the email as typed", async ({ page }) => {
  await page.goto("/signup");
  await fillForm(page, { email: "bat@gmial.com" });

  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "bat@gmial.com" })).toBeVisible();
});

test("a correct or unknown domain shows no suggestion", async ({ page }) => {
  await page.goto("/signup");
  const email = page.getByLabel("Имэйл хаяг");

  await email.fill("bat@gmail.com");
  await expect(page.getByText("гэж бичихийг хүссэн үү?", { exact: false })).toHaveCount(0);

  await email.fill("bat@some-unusual-domain.com");
  await expect(page.getByText("гэж бичихийг хүссэн үү?", { exact: false })).toHaveCount(0);
});

test("'Wrong email? Start again' restores the form with what was typed", async ({ page }) => {
  await page.goto("/signup");
  await fillForm(page, { email: "mistyped@example.com" });
  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeVisible();

  await page.getByRole("button", { name: "Дахин эхлэх" }).click();

  await expect(page.getByLabel("Овог")).toHaveValue(NEW_PARENT.surname);
  await expect(page.getByLabel("Нэр", { exact: true })).toHaveValue(NEW_PARENT.name);
  await expect(page.getByLabel("Имэйл хаяг")).toHaveValue("mistyped@example.com");
  await expect(page.getByLabel("Нууц үг", { exact: true })).toHaveValue(NEW_PARENT.password);
  await expect(page.getByLabel("Нууц үгээ давтах")).toHaveValue(NEW_PARENT.password);
});

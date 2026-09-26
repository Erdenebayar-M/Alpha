import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
// Specs run in parallel, so each one requests with its own email and counts
// only its own requests.
const LIMITED = "limited@example.com";

async function requestLink(page: Page, email: string) {
  await page.getByLabel("Имэйл хаяг").fill(email);
  await page.getByRole("button", { name: "Сэргээх" }).click();
}

async function requestsFor(request: APIRequestContext, email: string): Promise<number> {
  const all: string[] = await (await request.get("http://localhost:3211/__forgot-password-requests")).json();
  return all.filter((sent) => sent === email).length;
}

test("renders frame 7:7189", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { level: 1, name: "Нууц үгээ мартсан уу?" })).toBeVisible();
  await expect(page.getByText("Бүртгэлтэй имэйл хаягаа оруулна уу. Бид нууц үг сэргээх холбоосыг танд илгээнэ.")).toBeVisible();
  await expect(page.getByText("Бүртгэлтэй юу?")).toBeVisible();
  await expect(page.getByLabel("Имэйл хаяг")).toBeVisible();
  await expect(page.getByRole("button", { name: "Сэргээх" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Нэвтрэх хэсэг рүү буцах" })).toHaveAttribute("href", "/signin");
});

test("sign-in's forgot link goes to /forgot-password", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("link", { name: "Нууц үгээ мартсан уу?" })).toHaveAttribute("href", "/forgot-password");
});

test("an invalid email shows its message and does not call the backend", async ({ page }) => {
  let called = false;
  await page.route("**/api/auth/forgot-password", (route) => {
    called = true;
    return route.continue();
  });
  await page.goto("/forgot-password");
  await requestLink(page, "not-an-email");
  await expect(page.getByText("Имэйл хаяг буруу байна.")).toBeVisible();
  expect(called).toBe(false);
});

test("requesting a link swaps the card to the confirmation in place", async ({ page, request }) => {
  const email = "swap@example.com";
  await page.goto("/forgot-password");
  await requestLink(page, email);

  await expect(page.getByRole("heading", { level: 1, name: "Имэйлээ шалгана уу" })).toBeVisible();
  await expect(page.getByText(`Таны ${email} хаяг руу нууц үг сэргээх холбоосыг илгээлээ. Холбоосын хүчинтэй хугацаа 30 минут`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Дахин илгээх" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Нэвтрэх хэсэг рүү буцах" })).toHaveAttribute("href", "/signin");
  await expect(page.getByRole("heading", { name: "Нууц үгээ мартсан уу?" })).toHaveCount(0);
  await expect(page.getByLabel("Имэйл хаяг")).toHaveCount(0);
  await expect(page).toHaveURL(/\/forgot-password$/);
  expect(await requestsFor(request, email)).toBe(1);
});

test("\"Дахин илгээх\" sends the request again", async ({ page, request }) => {
  const email = "resend@example.com";
  await page.goto("/forgot-password");
  await requestLink(page, email);
  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeVisible();

  await page.getByRole("button", { name: "Дахин илгээх" }).click();
  await expect.poll(() => requestsFor(request, email)).toBe(2);
  await expect(page.getByRole("heading", { name: "Имэйлээ шалгана уу" })).toBeVisible();
});

test("rate limiting shows its message and keeps the form", async ({ page }) => {
  await page.goto("/forgot-password");
  await requestLink(page, LIMITED);
  await expect(page.getByText("Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Нууц үгээ мартсан уу?" })).toBeVisible();
});

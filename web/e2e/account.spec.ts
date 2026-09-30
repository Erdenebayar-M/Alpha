import { test, expect } from "@playwright/test";

// Runs against e2e/fixture-backend — see parent-session.spec.ts.
test.beforeEach(({ context }) =>
  context.addCookies([{ name: "orto_session", value: "fixture-session-token", url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]),
);

const COMING_SOON = [
  { tab: "Дашбоард", path: "/account/dashboard" },
  { tab: "Суралцагч хүүхэд", path: "/account/children" },
  { tab: "Мэдэгдэл", path: "/account/notifications" },
];

test("/account opens the Нууцлал tab, and each other tab shows its own Coming soon screen", async ({ page }) => {
  await page.goto("/account");
  const menu = page.getByRole("navigation", { name: "Тохиргоо" });
  await expect(menu.getByRole("link", { name: "Нууцлал ба аюулгүй байдал" })).toHaveAttribute("aria-current", "page");

  for (const { tab, path } of COMING_SOON) {
    await menu.getByRole("link", { name: tab }).click();
    await page.waitForURL((url) => url.pathname === path);
    await expect(page.getByRole("heading", { level: 1, name: `${tab} тун удахгүй` })).toBeVisible();
    await expect(menu.getByRole("link", { name: tab })).toHaveAttribute("aria-current", "page");
    // The profile summary and menu stay put while the tab changes.
    await expect(page.getByText("parent@example.com")).toBeVisible();
  }

  await menu.getByRole("link", { name: "Нууцлал ба аюулгүй байдал" }).click();
  await page.waitForURL((url) => url.pathname === "/account");
  await expect(page.getByRole("heading", { level: 1, name: "Хувийн мэдээлэл" })).toBeVisible();
});

test("a Coming soon tab's address survives a reload, and an unknown tab is a 404", async ({ page }) => {
  await page.goto("/account/dashboard");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Дашбоард тун удахгүй" })).toBeVisible();

  expect((await page.goto("/account/nonsense"))?.status()).toBe(404);
  expect((await page.goto("/account/security"))?.status()).toBe(404);
});

test("the Нууцлал tab's controls respond without saving anything", async ({ page }) => {
  await page.goto("/account");
  const name = page.getByLabel("Нэр", { exact: true });

  await expect(name).not.toBeEditable();
  await page.getByRole("button", { name: "Засах" }).click();
  await expect(name).toBeEditable();
  await name.fill("Шинэ нэр");
  await page.getByRole("button", { name: "Хадгалах" }).click();
  await expect(page.getByRole("status")).toHaveText("Хадгалагдлаа");
  await expect(name).not.toBeEditable();

  const twoFactor = page.getByRole("switch", { name: "Хоёр шатлалт баталгаажуулалт" });
  await expect(twoFactor).toBeChecked();
  await twoFactor.click();
  await expect(twoFactor).not.toBeChecked();

  await page.getByRole("button", { name: "Өөрчлөх" }).click();
  await expect(page.getByRole("status")).toContainText("тун удахгүй");

  // Nothing was kept: a reload brings back the account's own name.
  await page.reload();
  await expect(name).toHaveValue("Болд");
});

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createHash } from "node:crypto";

// Runs against e2e/fixture-backend with a fake GOOGLE_CLIENT_ID (see
// playwright.config.ts). Google itself is never contacted: the start route's
// redirect is inspected without following it, and the callback is called
// directly with the `state` that redirect carried.
const FIXTURE = "http://localhost:3211";
const VALID_CODE = "fixture-google-code";
const FAILED = "Google-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.";

const sessionCookie = async (context: BrowserContext) => (await context.cookies()).find((c) => c.name === "orto_session");

/** Hits the start route as the Google button would, returning Google's authorize URL. */
async function startGoogle(page: Page, query: string): Promise<URL> {
  const res = await page.request.get(`/api/auth/google/start?${query}`, { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  return new URL(res.headers()["location"]);
}

for (const { path, label } of [
  { path: "/signin", label: "Google-ээр нэвтрэх" },
  { path: "/signup", label: "Google-ээр бүртгүүлэх" },
]) {
  test(`${path} shows the Google button and the "Эсвэл" divider`, async ({ page }) => {
    await page.goto(path);
    const button = page.getByRole("link", { name: label });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("href", `/api/auth/google/start?from=${encodeURIComponent(path)}`);
    await expect(page.getByText("Эсвэл", { exact: true })).toBeVisible();
    await expect(page.getByText(FAILED)).toHaveCount(0);
  });
}

test("the sign-in page's Google button carries `next` along", async ({ page }) => {
  await page.goto("/signin?next=/register-child");
  await expect(page.getByRole("link", { name: "Google-ээр нэвтрэх" })).toHaveAttribute(
    "href",
    "/api/auth/google/start?from=%2Fsignin&next=%2Fregister-child",
  );
});

test("start redirects to Google with a PKCE challenge and state, kept in an httpOnly cookie", async ({ page, context }) => {
  const google = await startGoogle(page, "from=/signin");

  expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  const params = Object.fromEntries(google.searchParams);
  expect(params).toMatchObject({
    client_id: "fixture-client-id.apps.googleusercontent.com",
    redirect_uri: "http://localhost:3000/api/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    code_challenge_method: "S256",
  });
  expect(params.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(params.code_challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);

  const flow = (await context.cookies("http://localhost:3000/api/auth/google/callback")).find((c) => c.name === "orto_google_flow");
  expect(flow).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/api/auth/google" });
  // Scoped to the Google routes: page scripts and other routes never see it.
  expect((await context.cookies("http://localhost:3000/signin")).find((c) => c.name === "orto_google_flow")).toBeUndefined();
});

test("the callback forwards the code and PKCE verifier, sets the session and follows `next`", async ({ page, context }) => {
  const google = await startGoogle(page, "from=/signin&next=/register-child");

  const res = await page.request.get(`/api/auth/google/callback?code=${VALID_CODE}&state=${google.searchParams.get("state")}`, { maxRedirects: 0 });

  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toBe("http://localhost:3000/register-child");
  expect(await sessionCookie(context)).toMatchObject({ value: "fixture-session-token", httpOnly: true, sameSite: "Lax" });

  // This flow's request is the one whose verifier hashes to the challenge sent to Google.
  const requests: { code: string; code_verifier: string; redirect_uri: string }[] = await (await page.request.get(`${FIXTURE}/__google-requests`)).json();
  const challenge = google.searchParams.get("code_challenge");
  const forwarded = requests.find((r) => createHash("sha256").update(r.code_verifier).digest("base64url") === challenge);
  expect(forwarded).toEqual({ code: VALID_CODE, code_verifier: expect.any(String), redirect_uri: "http://localhost:3000/api/auth/google/callback" });
});

test("the flow cookie works once: replaying the callback fails", async ({ page }) => {
  const google = await startGoogle(page, "from=/signin");
  const callback = `/api/auth/google/callback?code=${VALID_CODE}&state=${google.searchParams.get("state")}`;
  await page.request.get(callback, { maxRedirects: 0 });

  const replay = await page.request.get(callback, { maxRedirects: 0 });

  expect(new URL(replay.headers()["location"]).searchParams.get("google_error")).toBe("1");
});

test("a state that doesn't match sets no session and returns with the message", async ({ page, context }) => {
  await startGoogle(page, "from=/signup");

  await page.goto(`/api/auth/google/callback?code=${VALID_CODE}&state=forged-state`);

  await expect(page).toHaveURL(/\/signup\?google_error=1$/);
  await expect(page.getByText(FAILED)).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
});

test("cancelling on Google's consent screen returns to the originating page with the message, keeping `next`", async ({ page, context }) => {
  const google = await startGoogle(page, "from=/signin&next=/register-child");

  await page.goto(`/api/auth/google/callback?error=access_denied&state=${google.searchParams.get("state")}`);

  await expect(page).toHaveURL(/\/signin\?next=%2Fregister-child&google_error=1$/);
  await expect(page.getByText(FAILED)).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
});

test("a code the backend rejects returns with the message", async ({ page, context }) => {
  const google = await startGoogle(page, "from=/signup");

  await page.goto(`/api/auth/google/callback?code=bad-code&state=${google.searchParams.get("state")}`);

  await expect(page).toHaveURL(/\/signup\?google_error=1$/);
  await expect(page.getByText(FAILED)).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
});

test("an unsafe `next` is ignored after a Google sign-in", async ({ page }) => {
  const google = await startGoogle(page, `from=/signin&next=${encodeURIComponent("//evil.example.com")}`);

  const res = await page.request.get(`/api/auth/google/callback?code=${VALID_CODE}&state=${google.searchParams.get("state")}`, { maxRedirects: 0 });

  expect(res.headers()["location"]).toBe("http://localhost:3000/");
});

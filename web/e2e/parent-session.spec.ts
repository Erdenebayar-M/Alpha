import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

// Runs against e2e/fixture-backend (see playwright.config.ts) — no real backend.
// The fixture's learner/diagnostic stubs accept only the fixture parent's token.
const FIXTURE = "http://localhost:3211";
const PARENT = { email: "parent@example.com", password: "correct-password", token: "fixture-session-token" };

const sessionCookie = async (context: BrowserContext) => (await context.cookies()).find((c) => c.name === "orto_session");

/** Signs in without the form, as a returning parent's browser already would be. */
const withSession = (context: BrowserContext, token = PARENT.token) =>
  context.addCookies([{ name: "orto_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);

interface DiagnosticRequest {
  path: string;
  authorization: string | null;
  body: { name?: string; learner_id?: string } | null;
}

/** The fixture's learner and start calls made for one child (specs run in parallel, so each uses its own name). */
async function diagnosticRequestsFor(request: APIRequestContext, name: string) {
  const all = (await (await request.get(`${FIXTURE}/__diagnostic-requests`)).json()) as DiagnosticRequest[];
  return {
    learner: all.filter((r) => r.path === "/api/learner" && r.body?.name === name),
    start: all.filter((r) => r.path === "/api/diagnostic/start" && r.body?.learner_id === `fixture-learner:${name}`),
  };
}

test("a signed-out visit to /register-child goes to sign in, and signing in comes back", async ({ page, context }) => {
  await page.goto("/register-child");
  await page.waitForURL((url) => url.pathname === "/signin" && url.searchParams.get("next") === "/register-child");

  await page.getByLabel("Имэйл хаяг").fill(PARENT.email);
  await page.getByLabel("Нууц үг").fill(PARENT.password);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();

  await page.waitForURL((url) => url.pathname === "/register-child");
  expect(await sessionCookie(context)).toBeDefined();
});

test("a signed-in visit to /register-child stays there", async ({ page, context }) => {
  await withSession(context);
  await page.goto("/register-child");
  expect(new URL(page.url()).pathname).toBe("/register-child");
});

for (const path of ["/signin", "/signup", "/signin?next=/register-child"]) {
  test(`a signed-in visit to ${path} goes to /`, async ({ page, context }) => {
    await withSession(context);
    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe("/");
  });
}

test("signing out clears the session cookie", async ({ page, context }) => {
  await withSession(context);
  const res = await page.request.post("/api/auth/signout", { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(new URL(res.headers()["location"]).pathname).toBe("/");
  expect(await sessionCookie(context)).toBeUndefined();

  // Signed out, the guard applies again.
  await page.goto("/register-child");
  await page.waitForURL((url) => url.pathname === "/signin");
});

test("signing out from another site is refused", async ({ page, context }) => {
  await withSession(context);
  const res = await page.request.post("/api/auth/signout", { maxRedirects: 0, headers: { origin: "https://evil.example" } });
  expect(res.status()).toBe(403);
  expect(await sessionCookie(context)).toBeDefined();
});

test("the Diagnostic proxy acts as the signed-in parent", async ({ page, context }) => {
  await withSession(context);
  const name = `Child ${test.info().testId}`;

  const res = await page.request.post("/api/diagnostic/start", { data: { name, grade: 2 } });
  expect(res.status()).toBe(200);
  const started = await res.json();
  expect(started).toMatchObject({ session_id: "fixture-session", learner_id: `fixture-learner:${name}`, item_number: 1 });
  expect(started.task).not.toHaveProperty("correct_answer");

  const { learner, start } = await diagnosticRequestsFor(page.request, name);
  expect(learner).toHaveLength(1);
  expect(learner[0].authorization).toBe(`Bearer ${PARENT.token}`);
  expect(start).toHaveLength(1);
  expect(start[0].authorization).toBe(`Bearer ${PARENT.token}`);
});

test("a Diagnostic proxy call without a session is rejected before reaching the backend", async ({ page }) => {
  const name = `Child ${test.info().testId}`;
  for (const path of ["/api/diagnostic/start", "/api/diagnostic/submit"]) {
    const data = path.endsWith("start")
      ? { name, grade: 2 }
      : { session_id: "fixture-session", task_id: "fixture-task", input_text: "x", time_seconds: 1 };
    const res = await page.request.post(path, { data });
    expect(res.status()).toBe(401);
    expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
  }
  expect((await diagnosticRequestsFor(page.request, name)).learner).toHaveLength(0);
});

test("a session the backend rejects is cleared, so the parent can sign in again", async ({ page, context }) => {
  await withSession(context, "revoked-token");

  const res = await page.request.post("/api/diagnostic/start", { data: { name: `Child ${test.info().testId}`, grade: 2 } });
  expect(res.status()).toBe(401);
  expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
  expect(await sessionCookie(context)).toBeUndefined();

  await page.goto("/signin");
  expect(new URL(page.url()).pathname).toBe("/signin");
});

test("a revoked session on /register-child goes to sign in, and is cleared", async ({ page, context }) => {
  await withSession(context, "revoked-token");
  await page.goto("/register-child");
  await page.waitForURL((url) => url.pathname === "/signin" && url.searchParams.get("next") === "/register-child");
  expect(await sessionCookie(context)).toBeUndefined();
});

test("a session rejected mid-flow sends the parent to sign in, and back to /register-child", async ({ page, context }) => {
  await withSession(context, "expires-mid-flow-token");
  await page.goto("/register-child");

  const next = page.getByRole("button", { name: "Үргэлжлүүлэх" });
  await page.getByText("Эрэгтэй").click();
  await next.click();
  await page.getByLabel("Овог", { exact: true }).fill("Дорж");
  await page.getByLabel("Нэр", { exact: true }).fill("Бат");
  await next.click();
  await page.getByText("2-р анги").click();
  await next.click();

  await page.waitForURL((url) => url.pathname === "/signin" && url.searchParams.get("next") === "/register-child");
  expect(await sessionCookie(context)).toBeUndefined();
});

for (const path of ["/signin", "/signup"]) {
  test(`a session the backend rejects doesn't bounce ${path}, and is cleared`, async ({ page, context }) => {
    await withSession(context, "revoked-token");
    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(path);
    expect(await sessionCookie(context)).toBeUndefined();
  });
}

// A new parent sent to sign in from /register-child has no account yet: `next`
// has to survive the hop to sign-up and back.
const NEXT_QUERY = `next=${encodeURIComponent("/register-child")}`;

test("sign-in's sign-up link carries `next`", async ({ page }) => {
  await page.goto(`/signin?${NEXT_QUERY}`);
  await expect(page.getByRole("main").getByRole("link", { name: "Бүртгүүлэх", exact: true })).toHaveAttribute("href", `/signup?${NEXT_QUERY}`);
});

test("sign-up's sign-in link and Google button carry `next`", async ({ page }) => {
  await page.goto(`/signup?${NEXT_QUERY}`);
  await expect(page.getByRole("main").getByRole("link", { name: "Нэвтрэх", exact: true })).toHaveAttribute("href", `/signin?${NEXT_QUERY}`);
  await expect(page.getByRole("link", { name: "Google-ээр бүртгүүлэх" })).toHaveAttribute("href", `/api/auth/google/start?from=%2Fsignup&${NEXT_QUERY}`);
});

test("signing up with `next` goes there", async ({ page }) => {
  await page.goto(`/signup?${NEXT_QUERY}`);
  await page.getByLabel("Овог").fill("Бат");
  await page.getByLabel("Нэр", { exact: true }).fill("Болд");
  await page.getByLabel("Имэйл хаяг").fill("next-parent@example.com");
  await page.getByLabel("Нууц үг", { exact: true }).fill("long-enough-pw");
  await page.getByLabel("Нууц үгээ давтах").fill("long-enough-pw");
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/register-child");
});

test("an already-registered email's sign-in link carries `next`", async ({ page }) => {
  await page.goto(`/signup?${NEXT_QUERY}`);
  await page.getByLabel("Овог").fill("Бат");
  await page.getByLabel("Нэр", { exact: true }).fill("Болд");
  await page.getByLabel("Имэйл хаяг").fill(PARENT.email);
  await page.getByLabel("Нууц үг", { exact: true }).fill("long-enough-pw");
  await page.getByLabel("Нууц үгээ давтах").fill("long-enough-pw");
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await expect(page.getByRole("alert").getByRole("link", { name: "Нэвтрэх" })).toHaveAttribute("href", `/signin?${NEXT_QUERY}`);
});

test("an unsafe sign-up `next` is ignored", async ({ request }) => {
  const res = await request.post("/api/auth/signup", {
    data: { email: "unsafe-next@example.com", name: "Болд", password: "long-enough-pw", next: "https://evil.example/" },
  });
  expect(await res.json()).toEqual({ redirectTo: "/" });
});

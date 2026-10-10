import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

// The password gate only runs when DEV_SITE_PASSWORD is set, and the e2e Next
// server runs without it (one server per run), so these call proxy() directly.
// The ungated side is the rest of the suite, plus the last test below.
const PASSWORD = "fixture-dev-password";
const ORIGIN = "http://localhost:3000";

const isPassThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

function get(path: string, cookie?: string) {
  return new NextRequest(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
}

function submit(path: string, password: string) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "dev-gate-password": password }).toString(),
  });
}

/** Unlocks the gate as a browser would and returns the cookie it was given. */
async function unlock() {
  const res = await proxy(submit("/", PASSWORD));
  const cookie = res.cookies.get("orto_dev_gate");
  expect(cookie?.value).toBeTruthy();
  return `orto_dev_gate=${cookie!.value}`;
}

test.describe("with DEV_SITE_PASSWORD set", () => {
  test.beforeEach(() => {
    process.env.DEV_SITE_PASSWORD = PASSWORD;
  });
  test.afterEach(() => {
    delete process.env.DEV_SITE_PASSWORD;
  });

  for (const path of ["/", "/articles/fixture-article", "/signin", "/account/children"]) {
    test(`a locked visit to ${path} gets the password form, marked noindex`, async () => {
      const res = await proxy(get(path));
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(res.headers.get("x-robots-tag")).toContain("noindex");
      const html = await res.text();
      expect(html).toContain('type="password"');
      expect(html).toContain('name="dev-gate-password"');
    });
  }

  test("a locked API call is refused with JSON, not the form", async () => {
    const res = await proxy(get("/api/auth/signout"));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  test("the right password sets an httpOnly cookie, not holding the password, and goes back to the page", async () => {
    const res = await proxy(submit("/articles/fixture-article?x=1", PASSWORD));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/articles/fixture-article?x=1`);
    const cookie = res.cookies.get("orto_dev_gate");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
    expect(cookie?.value).not.toContain(PASSWORD);
  });

  test("unlocking stays on the deploy that was asked for, even when WEB_ORIGIN names another", async () => {
    process.env.WEB_ORIGIN = "https://www.orto.my";
    try {
      const res = await proxy(submit("/signup", PASSWORD));
      expect(res.headers.get("location")).toBe(`${ORIGIN}/signup`);
    } finally {
      delete process.env.WEB_ORIGIN;
    }
  });

  test("a form post that can't be read gets the form, not an error", async () => {
    const res = await proxy(
      new NextRequest(`${ORIGIN}/`, { method: "POST", headers: { "content-type": "multipart/form-data; boundary=x" }, body: "not multipart" }),
    );
    expect(res.status).toBe(401);
    expect(await res.text()).toContain('name="dev-gate-password"');
  });

  test("a wrong password shows the form again with an error, and sets no cookie", async () => {
    const res = await proxy(submit("/", "wrong"));
    expect(res.status).toBe(401);
    expect(res.cookies.get("orto_dev_gate")).toBeUndefined();
    expect(await res.text()).toContain('role="alert"');
  });

  test("a forged cookie doesn't unlock", async () => {
    const res = await proxy(get("/", `orto_dev_gate=${PASSWORD}`));
    expect(res.status).toBe(401);
  });

  test("a cookie stops working when the password changes", async () => {
    const cookie = await unlock();
    process.env.DEV_SITE_PASSWORD = "a-new-password";
    expect((await proxy(get("/", cookie))).status).toBe(401);
  });

  test("once unlocked, pages and API calls pass through, still marked noindex", async () => {
    const cookie = await unlock();
    for (const path of ["/", "/articles/fixture-article", "/api/auth/signout"]) {
      const res = await proxy(get(path, cookie));
      expect(isPassThrough(res)).toBe(true);
      expect(res.headers.get("x-robots-tag")).toContain("noindex");
    }
  });

  test("once unlocked, the session redirects still apply", async () => {
    const cookie = await unlock();
    const res = await proxy(get("/register-child", cookie));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/signin?next=%2Fregister-child`);
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });
});

// The matcher is only applied by the Next server, which runs ungated here, so
// this checks the pattern itself.
test("the proxy skips static assets but not pages whose path has a dot", async () => {
  const { config } = await import("@/proxy");
  const runsOn = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);
  for (const path of ["/", "/signin", "/account/children", "/articles/release-1.2", "/api/report.json"]) expect(runsOn(path), path).toBe(true);
  for (const path of ["/icon.svg", "/images/hero.png", "/audio/a.wav", "/_next/static/chunks/a.js", "/_next/image"]) expect(runsOn(path), path).toBe(false);
});

test("without DEV_SITE_PASSWORD there is no gate and no noindex", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  expect(res.headers()["x-robots-tag"]).toBeUndefined();
  expect(await res.text()).not.toContain("dev-gate-password");
});

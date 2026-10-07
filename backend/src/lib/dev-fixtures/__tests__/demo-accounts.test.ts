import { DEMO_PARENTS, demoPasswordProblem } from "../demo-accounts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("DEMO_PARENTS", () => {
  it("gives every demo Parent account at least one Learner", () => {
    expect(DEMO_PARENTS.length).toBeGreaterThan(1);
    for (const parent of DEMO_PARENTS) expect(parent.learners.length).toBeGreaterThan(0);
  });

  it("uses fixed UUID Learner ids, so re-runs update rather than duplicate and routes accept them", () => {
    const ids = DEMO_PARENTS.flatMap((p) => p.learners.map((l) => l.id));
    for (const id of ids) expect(id).toMatch(UUID_RE);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses addresses on the reserved example.com domain, which can never be a real parent's", () => {
    for (const parent of DEMO_PARENTS) expect(parent.email).toMatch(/@example\.com$/);
  });
});

describe("demoPasswordProblem", () => {
  it("accepts a password a parent could choose at Sign up", () => {
    expect(demoPasswordProblem("tsagaan-sar-2026")).toBeNull();
  });

  it("names the rule a weak password breaks", () => {
    expect(demoPasswordProblem("")).toBe("PASSWORD_TOO_SHORT");
    expect(demoPasswordProblem("password123")).toBe("PASSWORD_COMMON");
  });

  it("rejects a password containing a demo parent's own email name or name", () => {
    const [parent] = DEMO_PARENTS;
    expect(demoPasswordProblem(`${parent.email.split("@")[0]}-2026`)).toBe("PASSWORD_SIMILAR");
  });
});

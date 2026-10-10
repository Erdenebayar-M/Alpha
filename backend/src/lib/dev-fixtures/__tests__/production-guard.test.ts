import { assertNotProduction } from "../production-guard";

const PROD = "postgresql://owner:secret@ep-rapid-hall-aold7lhu-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

describe("assertNotProduction", () => {
  it("refuses the production URL itself", () => {
    expect(() => assertNotProduction(PROD, PROD)).toThrow(/production/);
  });

  it("refuses the same Neon endpoint reached directly instead of through the pooler", () => {
    const direct = "postgresql://owner:secret@ep-rapid-hall-aold7lhu.c-2.ap-southeast-1.aws.neon.tech/neondb";
    expect(() => assertNotProduction(direct, PROD)).toThrow(/production/);
  });

  it("refuses the same endpoint with other credentials, database or host case", () => {
    const other = "postgres://dev:pw@EP-RAPID-HALL-AOLD7LHU.c-2.ap-southeast-1.aws.neon.tech/otherdb";
    expect(() => assertNotProduction(other, PROD)).toThrow(/production/);
  });

  it("refuses the same Neon endpoint under another hostname for it", () => {
    const legacy = "postgresql://owner:secret@ep-rapid-hall-aold7lhu.ap-southeast-1.aws.neon.tech/neondb";
    expect(() => assertNotProduction(legacy, PROD)).toThrow(/production/);
  });

  it("tells two databases on one non-Neon server apart only by port, never by database name", () => {
    const prodLocal = "postgresql://postgres@localhost:5432/app";
    expect(() => assertNotProduction("postgresql://postgres@localhost:5432/other", prodLocal)).toThrow(/production/);
    expect(() => assertNotProduction("postgresql://postgres@localhost:5433/app", prodLocal)).not.toThrow();
  });

  it("allows a different Neon endpoint", () => {
    const dev = "postgresql://owner:secret@ep-quiet-moon-12345678-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb";
    expect(() => assertNotProduction(dev, PROD)).not.toThrow();
  });

  it("allows a local database", () => {
    expect(() => assertNotProduction("postgresql://postgres:pw@localhost:5433/mongolian_app", PROD)).not.toThrow();
  });

  it("refuses when either URL is missing or unparseable, rather than guessing", () => {
    expect(() => assertNotProduction("", PROD)).toThrow();
    expect(() => assertNotProduction("postgresql://localhost:5433/x", "")).toThrow();
    expect(() => assertNotProduction("not a url", PROD)).toThrow();
  });

  it("never puts a password in its error message", () => {
    expect(() => assertNotProduction(PROD, PROD)).toThrow(expect.objectContaining({
      message: expect.not.stringContaining("secret"),
    }));
  });
});

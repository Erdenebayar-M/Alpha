import { planSync } from "../sync-plan";

describe("planSync", () => {
  it("creates every source row when the target is empty", () => {
    const plan = planSync([{ id: "W1", word: "ах" }, { id: "W2", word: "эгч" }], []);
    expect(plan.create.map((r) => r.id)).toEqual(["W1", "W2"]);
    expect(plan.update).toEqual([]);
    expect(plan.unchanged).toBe(0);
  });

  it("changes nothing when the target already matches, so a re-run is a no-op", () => {
    const rows = [
      { id: "T1", options: { choices: ["а", "б"], answer: 0 }, tags: ["C1"], created_at: new Date("2026-01-01T00:00:00Z") },
    ];
    const copy = [
      { id: "T1", options: { answer: 0, choices: ["а", "б"] }, tags: ["C1"], created_at: new Date("2026-01-01T00:00:00Z") },
    ];
    expect(planSync(rows, copy)).toEqual({ create: [], update: [], unchanged: 1 });
  });

  it("updates a row whose content differs, including inside JSON and arrays", () => {
    type Row = { id: string; options: object; image_url: string | null };
    const plan = planSync<Row, Row>(
      [{ id: "T1", options: { choices: ["а", "б"] }, image_url: "https://x/a.png" }, { id: "T2", options: {}, image_url: null }],
      [{ id: "T1", options: { choices: ["б", "а"] }, image_url: "https://x/a.png" }, { id: "T2", options: {}, image_url: "https://x/old.png" }],
    );
    expect(plan.update.map((r) => r.id)).toEqual(["T1", "T2"]);
    expect(plan.create).toEqual([]);
  });

  it("leaves rows that exist only in the target alone", () => {
    const plan = planSync([{ id: "W1", word: "ах" }], [{ id: "W1", word: "ах" }, { id: "LOCAL", word: "дэвтэр" }]);
    expect(plan).toEqual({ create: [], update: [], unchanged: 1 });
  });
});

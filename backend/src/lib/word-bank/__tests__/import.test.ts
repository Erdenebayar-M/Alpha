import { wordBankPrefix, toWordRecord } from "../import";
import type { ClassifiedRow } from "../import";

function makeRow(overrides: Partial<ClassifiedRow> = {}): ClassifiedRow {
  return {
    no: 1,
    word: "тест",
    grade: null,
    grade_raw: "",
    app_level: "",
    meaning_complexity: null,
    spelling_complexity: null,
    morph_complexity: null,
    suggested_exercises: "",
    spelling_tag: "",
    topic: "",
    part_of_speech: "",
    meaning_type: "",
    ...overrides,
  };
}

// ─── wordBankPrefix ───────────────────────────────────────────────────────────

describe("wordBankPrefix", () => {
  it("numeric grade → WG{n}", () => {
    expect(wordBankPrefix(1)).toBe("WG1");
    expect(wordBankPrefix(2, "2")).toBe("WG2");
  });

  it("comma-separated multi-grade list → WMVP", () => {
    expect(wordBankPrefix(null, "1,2,3,4")).toBe("WMVP");
    expect(wordBankPrefix(null, "1,2")).toBe("WMVP");
  });

  it("non-numeric rawGrade → W{slug}", () => {
    expect(wordBankPrefix(null, "MVP")).toBe("WMVP");
  });

  it("empty rawGrade → WGX", () => {
    expect(wordBankPrefix(null, "")).toBe("WGX");
    expect(wordBankPrefix(null)).toBe("WGX");
  });
});

// ─── parseGradeBand (via toWordRecord) ───────────────────────────────────────

describe("toWordRecord — grade_band parsing", () => {
  it('Анги "1" → grade_band ["G1"]', () => {
    const row = makeRow({ grade: 1, grade_raw: "1" });
    const rec = toWordRecord(row, 1);
    expect(rec.grade_band).toEqual(["G1"]);
    expect(rec.id).toMatch(/^WG1-/);
  });

  it('Анги "1,2,3,4" → grade_band ["G1","G2","G3","G4"], id WMVP-', () => {
    const row = makeRow({ grade: null, grade_raw: "1,2,3,4" });
    const rec = toWordRecord(row, 1);
    expect(rec.grade_band).toEqual(["G1", "G2", "G3", "G4"]);
    expect(rec.id).toMatch(/^WMVP-/);
    expect(rec.grade).toBeNull();
  });

  it('Анги "2,3" → grade_band ["G2","G3"], id WMVP-', () => {
    const row = makeRow({ grade: null, grade_raw: "2,3" });
    const rec = toWordRecord(row, 5);
    expect(rec.grade_band).toEqual(["G2", "G3"]);
    expect(rec.id).toBe("WMVP-0005");
  });

  it("empty Анги → grade_band []", () => {
    const row = makeRow({ grade: null, grade_raw: "" });
    const rec = toWordRecord(row, 1);
    expect(rec.grade_band).toEqual([]);
  });
});

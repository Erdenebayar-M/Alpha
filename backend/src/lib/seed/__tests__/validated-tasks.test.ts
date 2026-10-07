import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VALIDATED_DIR, loadValidatedTasks } from "../validated-tasks";

const tmpDirs: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validated-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("VALIDATED_DIR", () => {
  it("resolves to the repo-root content-pipeline/validated folder", () => {
    expect(path.relative(path.join(__dirname, "../../../../.."), VALIDATED_DIR)).toBe(
      path.join("content-pipeline", "validated"),
    );
    expect(fs.existsSync(VALIDATED_DIR)).toBe(true);
  });

  it("loads at least one real validated variant", () => {
    expect(loadValidatedTasks().length).toBeGreaterThan(0);
  });
});

describe("loadValidatedTasks", () => {
  it("throws when the folder is missing", () => {
    expect(() => loadValidatedTasks(path.join(tmpDir(), "nope"))).toThrow(/not found/i);
  });

  it("throws when the folder has no task files", () => {
    expect(() => loadValidatedTasks(tmpDir())).toThrow(/no task files/i);
  });

  it("throws when files contain no variants", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify({ variants: [] }));
    expect(() => loadValidatedTasks(dir)).toThrow(/no variants/i);
  });

  it("throws naming the file when it has no variants array", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "bad.json"), JSON.stringify({ tasks: [] }));
    expect(() => loadValidatedTasks(dir)).toThrow(/bad\.json/);
  });

  it("throws naming the file when JSON is malformed", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "trunc.json"), "{");
    expect(() => loadValidatedTasks(dir)).toThrow(/trunc\.json/);
  });

  it("returns variants from every file", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify({ variants: [{ id: "1" }, { id: "2" }] }));
    fs.writeFileSync(path.join(dir, "b.json"), JSON.stringify({ variants: [{ id: "3" }] }));
    expect(loadValidatedTasks(dir).map((v) => v.id)).toEqual(["1", "2", "3"]);
  });
});

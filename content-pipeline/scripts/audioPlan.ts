import * as fs from "fs";
import * as path from "path";

const VALIDATED_DIR = path.resolve(__dirname, "../validated");
const AUDIO_DIR = path.resolve(__dirname, "../audio");

interface Variant {
  id: string;
  task_type: string;
  prompt_text: string;
  correct_answer: string;
  options: Record<string, unknown>;
}

interface TaskFile {
  task_id: string;
  variants: Variant[];
}

function variantSuffix(variantId: string): string {
  const match = variantId.match(/-v(\d+)$/);
  return match ? `v${match[1]}` : "v1";
}

function loadTasks(): TaskFile[] {
  const files = fs.readdirSync(VALIDATED_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(VALIDATED_DIR, f), "utf8"))
  );
}

function addPauses(audioText: string): string {
  return audioText
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .join(" [short pause] ");
}

function sanitize(v: string): string {
  return v.replace(/\r?\n/g, " ").trim();
}

function toCsv(headers: string[], rows: Record<string, string>[]): string {
  const escape = (v: string): string => {
    const s = sanitize(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

interface QueueRow {
  task_id: string;
  variant: string;
  slot: string;
  text: string;
  voice: string;
  language_code: string;
  filename: string;
  type: string;
}

function buildQueue(tasks: TaskFile[]): QueueRow[] {
  const rows: QueueRow[] = [];

  for (const task of tasks) {
    for (const v of task.variants) {
      const vSuffix = variantSuffix(v.id);

      // Dictation slot: TT4, TT5, TT1 with audio_trigger=true
      if (v.task_type === "TT4_DICTATION") {
        const opts = v.options as { audio_text: string };
        rows.push({
          task_id: task.task_id,
          variant: vSuffix,
          slot: "dictation",
          text: addPauses(opts.audio_text),
          voice: "Kore",
          language_code: "mn-MN",
          filename: `dict_${task.task_id}-${vSuffix}.wav`,
          type: v.task_type,
        });
      } else if (v.task_type === "TT5_MINI_TEXT") {
        const opts = v.options as { audio_text: string };
        rows.push({
          task_id: task.task_id,
          variant: vSuffix,
          slot: "dictation",
          text: opts.audio_text,
          voice: "Kore",
          language_code: "mn-MN",
          filename: `dict_${task.task_id}-${vSuffix}.wav`,
          type: v.task_type,
        });
      } else if (v.task_type === "TT1_CHOICE") {
        const opts = v.options as { audio_trigger: boolean };
        if (opts.audio_trigger) {
          rows.push({
            task_id: task.task_id,
            variant: vSuffix,
            slot: "dictation",
            text: v.correct_answer,
            voice: "Kore",
            language_code: "mn-MN",
            filename: `dict_${task.task_id}-${vSuffix}.wav`,
            type: v.task_type,
          });
        }
      }

      // Prompt slot: all variants
      rows.push({
        task_id: task.task_id,
        variant: vSuffix,
        slot: "prompt",
        text: v.prompt_text,
        voice: "Kore",
        language_code: "mn-MN",
        filename: `prompt_${task.task_id}-${vSuffix}.wav`,
        type: v.task_type,
      });
    }
  }

  return rows;
}

function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const tasks = loadTasks();
  const queue = buildQueue(tasks);

  const headers = ["task_id", "variant", "slot", "text", "voice", "language_code", "filename", "type"];
  const csv = toCsv(headers, queue as unknown as Record<string, string>[]);
  const csvPath = path.join(AUDIO_DIR, "audio-queue.csv");
  fs.writeFileSync(csvPath, csv, "utf8");

  const dictRows = queue.filter((r) => r.slot === "dictation");
  const promptRows = queue.filter((r) => r.slot === "prompt");

  // Rough cost estimate: Gemini TTS ~$0.000325/file (5s avg at $20/M output audio tokens)
  const estimatedCost = (queue.length * 5 * 32 / 1_000_000) * 20 + (queue.length * 50 / 1_000_000) * 1;

  console.log(`\nAudio Queue Plan`);
  console.log(`================`);
  console.log(`Total files:     ${queue.length}`);
  console.log(`  Dictation:     ${dictRows.length}`);
  console.log(`  Prompt:        ${promptRows.length}`);
  console.log(`Est. cost (TTS): $${estimatedCost.toFixed(4)}`);
  console.log(`\nOutput: ${csvPath}`);

  if (dictRows.length === 0) {
    console.log(`\nNote: No dictation rows — no TT4/TT5/TT1-audio tasks in validated/ yet.`);
    console.log(`Dictation audio will be added once those task types are validated.`);
  }
}

main();

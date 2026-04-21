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

function parseVariantSuffix(variantId: string): string {
  // "G12-009-v1" → "v1"
  const match = variantId.match(/-v(\d+)$/);
  return match ? `v${match[1]}` : "v1";
}

function loadTasks(): TaskFile[] {
  const files = fs.readdirSync(VALIDATED_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(VALIDATED_DIR, f), "utf8")));
}

interface Track1Row {
  task_id: string;
  variant: string;
  slot: string;
  text_to_record: string;
  filename: string;
  notes: string;
}

interface Track2Row {
  task_id: string;
  variant: string;
  text: string;
  voice: string;
  language_code: string;
  filename: string;
  dictation_text: string;
}

function buildTrack1(tasks: TaskFile[]): Track1Row[] {
  const rows: Track1Row[] = [];
  for (const task of tasks) {
    for (const v of task.variants) {
      const vSuffix = parseVariantSuffix(v.id);
      if (v.task_type === "TT4_DICTATION") {
        const opts = v.options as { audio_text: string };
        rows.push({
          task_id: task.task_id,
          variant: vSuffix,
          slot: "TT4",
          text_to_record: opts.audio_text,
          filename: `dict_${task.task_id}-${vSuffix}.mp3`,
          notes: "Dictation words — record with 1 sec gap between words",
        });
      } else if (v.task_type === "TT5_MINI_TEXT") {
        const opts = v.options as { audio_text: string };
        rows.push({
          task_id: task.task_id,
          variant: vSuffix,
          slot: "TT5",
          text_to_record: opts.audio_text,
          filename: `dict_${task.task_id}-${vSuffix}.mp3`,
          notes: "Mini-text passage — comfortable pace for 7-year-old",
        });
      } else if (v.task_type === "TT1_CHOICE") {
        const opts = v.options as { audio_trigger: boolean; audio_text?: string };
        if (opts.audio_trigger) {
          const text = opts.audio_text ?? v.correct_answer;
          rows.push({
            task_id: task.task_id,
            variant: vSuffix,
            slot: "TT1-audio",
            text_to_record: text,
            filename: `audio_${task.task_id}-${vSuffix}.mp3`,
            notes: "Audio-choice trigger word",
          });
        }
      }
    }
  }
  return rows;
}

function buildTrack2(tasks: TaskFile[]): Track2Row[] {
  const rows: Track2Row[] = [];
  for (const task of tasks) {
    for (const v of task.variants) {
      const vSuffix = parseVariantSuffix(v.id);
      let dictationText = "";
      if (v.task_type === "TT4_DICTATION") {
        const opts = v.options as { audio_text: string };
        // Convert comma-separated words to paused format
        dictationText = opts.audio_text
          .split(",")
          .map((w) => w.trim())
          .join(" [short pause] ");
      }
      rows.push({
        task_id: task.task_id,
        variant: vSuffix,
        text: v.prompt_text,
        voice: "Kore",
        language_code: "mn-MN",
        filename: `prompt_${task.task_id}-${vSuffix}.mp3`,
        dictation_text: dictationText,
      });
    }
  }
  return rows;
}

function sanitize(v: string): string {
  // Replace newlines with space so CSV stays single-line per row
  return v.replace(/\r?\n/g, " ").trim();
}

function toCsv(headers: string[], rows: Record<string, string>[]): string {
  const escape = (v: string) => {
    const s = sanitize(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const tasks = loadTasks();
  const track1 = buildTrack1(tasks);
  const track2 = buildTrack2(tasks);

  // Write Track 1 CSV
  const t1Headers = ["task_id", "variant", "slot", "text_to_record", "filename", "notes"];
  const t1Csv = toCsv(t1Headers, track1 as unknown as Record<string, string>[]);
  const t1Path = path.join(AUDIO_DIR, "human-recording-script.csv");
  fs.writeFileSync(t1Path, t1Csv, "utf8");

  // Write Track 2 CSV
  const t2Headers = ["task_id", "variant", "text", "voice", "language_code", "filename", "dictation_text"];
  const t2Csv = toCsv(t2Headers, track2 as unknown as Record<string, string>[]);
  const t2Path = path.join(AUDIO_DIR, "tts-queue.csv");
  fs.writeFileSync(t2Path, t2Csv, "utf8");

  const humanMinutes = Math.ceil((track1.length * 20) / 60);

  console.log(`\nAudio Plan Summary`);
  console.log(`==================`);
  console.log(`Track 1 (human): ${track1.length} files`);
  console.log(`Track 2 (Gemini TTS): ${track2.length} files`);
  console.log(`Estimated human recording time at 20 sec/file: ${humanMinutes} minutes`);
  console.log(`\nWritten:`);
  console.log(`  ${t1Path}`);
  console.log(`  ${t2Path}`);

  if (track1.length === 0) {
    console.log(`\nNote: Track 1 is empty — no TT4/TT5/TT1-audio tasks in validated/ yet.`);
    console.log(`Human recording will be needed once dictation tasks are added.`);
  }
}

main();

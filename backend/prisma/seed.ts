if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run seed in production!");
  process.exit(1);
}

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  TaskType,
  SkillCode,
  LessonSlot,
} from "../generated/prisma";

const isDryRun = process.argv.includes("--dry-run");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseGradeBand(raw: string): string[] {
  if (raw.includes("-")) return raw.split("-");
  return [raw];
}

const LEVEL_CODES = ["M0", "M1", "M2", "M3", "M4", "M5"];

function buildGradeLevels(gradeBand: string[], levelTarget: string): string[] {
  const rangeMatch = levelTarget.match(/^(M[0-5])-(M[0-5])$/);
  let levels: string[];
  if (rangeMatch) {
    const start = LEVEL_CODES.indexOf(rangeMatch[1]);
    const end = LEVEL_CODES.indexOf(rangeMatch[2]);
    levels =
      start >= 0 && end >= 0 ? LEVEL_CODES.slice(start, end + 1) : ["M0"];
  } else {
    levels = LEVEL_CODES.includes(levelTarget) ? [levelTarget] : ["M0"];
  }
  const cells: string[] = [];
  for (const g of gradeBand) {
    for (const l of levels) cells.push(`${g}:${l}`);
  }
  return cells;
}

interface ValidatedVariant {
  id: string;
  task_type: string;
  prompt_text: string;
  correct_answer: string;
  options: object;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: string;
  feedback_text: string;
  is_diagnostic?: boolean;
}

function loadValidatedTasks(): ValidatedVariant[] {
  const validatedDir = path.join(__dirname, "../content-pipeline/validated");
  const variants: ValidatedVariant[] = [];
  if (!fs.existsSync(validatedDir)) return variants;
  const files = fs.readdirSync(validatedDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(validatedDir, file), "utf-8"),
    );
    if (Array.isArray(raw.variants)) {
      variants.push(...raw.variants);
    }
  }
  return variants;
}

// â”€â”€â”€ Load words from content-pipeline/generated/seed-words.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SeedWordEntry {
  id: string;
  word: string;
  category: string;
  grade_band: string;
  letter_count: number;
  word_count: number;
  skills: string[];
  errors: string[];
  image_ok: boolean;
  audio_ok: boolean;
  image_prompt: string | null;
  audio_text: string | null;
  sentence: string | null;
  distractors: string[];
  blank_template: string | null;
}

function loadSeedWords(): SeedWordEntry[] {
  const seedFile = path.join(
    __dirname,
    "../content-pipeline/generated/seed-words.json",
  );
  if (!fs.existsSync(seedFile)) return [];
  const raw = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
  return Array.isArray(raw.words) ? raw.words : [];
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  let wordCreated = 0;
  let wordUpdated = 0;
  let wordErrored = 0;

  // ── Words from content-pipeline/generated/seed-words.json ──
  const seedWords = loadSeedWords();

  for (const w of seedWords) {
    const data = {
      word: w.word,
      category: w.category,
      grade_band: parseGradeBand(w.grade_band),
      char_count: w.letter_count,
      syllable_count: w.word_count,
      skill_tags: w.skills,
      error_tags: w.errors,
      image_ok: w.image_ok,
      audio_ok: w.audio_ok,
      image_prompt: w.image_prompt ?? null,
      audio_text: w.audio_text ?? null,
      sample_sentence: w.sentence ?? null,
      distractors: w.distractors,
      blank_hint: w.blank_template ?? null,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.word.findUnique({ where: { id: w.id } });
        console.log(
          `[DRY RUN] Word ${w.id} (${w.word}): ${exists ? "UPDATE" : "CREATE"}`,
        );
        exists ? wordUpdated++ : wordCreated++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id: w.id } });
        await prisma.word.upsert({
          where: { id: w.id },
          update: data,
          create: { id: w.id, ...data },
        });
        exists ? wordUpdated++ : wordCreated++;
      }
    } catch (e) {
      console.error(`  ERROR word ${w.id}:`, (e as Error).message);
      wordErrored++;
    }
  }

  const wordTotal = wordCreated + wordUpdated;

  // â”€â”€ Task variants from content-pipeline/validated/*.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let taskCreated = 0;
  let taskUpdated = 0;
  let taskErrored = 0;

  const validatedVariants = loadValidatedTasks();

  for (const v of validatedVariants) {
    const data = {
      task_type: v.task_type as TaskType,
      prompt_text: v.prompt_text,
      correct_answer: v.correct_answer,
      options: v.options,
      audio_url: v.audio_url,
      image_url: v.image_url,
      primary_skill: v.primary_skill as SkillCode,
      secondary_skill: v.secondary_skill
        ? (v.secondary_skill as SkillCode)
        : undefined,
      level_target: v.level_target,
      error_targets: v.error_targets,
      grade_band: v.grade_band,
      grade_levels: buildGradeLevels(v.grade_band, v.level_target),
      difficulty: v.difficulty,
      estimated_time_seconds: v.estimated_time_seconds,
      lesson_slot_fit: v.lesson_slot_fit as LessonSlot,
      feedback_text: v.feedback_text,
      is_diagnostic: v.is_diagnostic ?? false,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        console.log(
          `[DRY RUN] ValidatedTask ${v.id}: ${exists ? "UPDATE" : "CREATE"}`,
        );
        exists ? taskUpdated++ : taskCreated++;
      } else {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        await prisma.task.upsert({
          where: { id: v.id },
          update: data,
          create: { id: v.id, ...data },
        });
        exists ? taskUpdated++ : taskCreated++;
      }
    } catch (e) {
      console.error(`  ERROR validated task ${v.id}:`, (e as Error).message);
      taskErrored++;
    }
  }

  const taskTotal = taskCreated + taskUpdated;

  // â”€â”€ Test accounts (development only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (process.env.NODE_ENV === "development") {
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash("password123", 12);

    const parent = await prisma.parent.upsert({
      where: { email: "test@local.dev" },
      update: {},
      create: {
        email: "test@local.dev",
        password_hash: passwordHash,
        name: "Test Parent",
      },
    });

    await prisma.learner.upsert({
      where: { id: "test-learner-a" },
      update: {},
      create: {
        id: "test-learner-a",
        parent_id: parent.id,
        name: "Test A",
        grade: 1,
        variant: "A",
      },
    });

    await prisma.learner.upsert({
      where: { id: "test-learner-b" },
      update: {},
      create: {
        id: "test-learner-b",
        parent_id: parent.id,
        name: "Test B",
        grade: 3,
        variant: "B",
      },
    });

    console.log("Test accounts seeded (test@local.dev / password123)");
  }

  // â”€â”€ Coverage analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(
    "\nâ”€â”€â”€ Seed Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€",
  );
  console.log(
    `Words upserted:  ${wordTotal} (${wordCreated} created, ${wordUpdated} updated, ${wordErrored} errors)`,
  );
  console.log(
    `Tasks upserted:  ${taskTotal} (${taskCreated} created, ${taskUpdated} updated, ${taskErrored} errors)`,
  );

  if (!isDryRun) {
    // Compute coverage from DB
    const allTasks = await prisma.task.findMany({
      select: { primary_skill: true, level_target: true, error_targets: true },
    });

    const skillCounts = new Map<string, number>();
    const levelCounts = new Map<string, number>();
    const errorCounts = new Map<string, number>();

    for (const t of allTasks) {
      skillCounts.set(
        t.primary_skill,
        (skillCounts.get(t.primary_skill) ?? 0) + 1,
      );
      levelCounts.set(
        t.level_target,
        (levelCounts.get(t.level_target) ?? 0) + 1,
      );
      for (const e of t.error_targets) {
        errorCounts.set(e, (errorCounts.get(e) ?? 0) + 1);
      }
    }

    console.log(
      "\nâ”€â”€â”€ Coverage Warnings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€",
    );

    const skillsUnder10 = [...skillCounts.entries()]
      .filter(([, n]) => n < 10)
      .map(([s]) => s);
    if (skillsUnder10.length)
      console.log(`  Skills < 10 tasks: ${skillsUnder10.join(", ")}`);
    else console.log("  Skills < 10 tasks: none");

    const levelsUnder15 = [...levelCounts.entries()]
      .filter(([, n]) => n < 15)
      .map(([l]) => l);
    if (levelsUnder15.length)
      console.log(`  Levels < 15 tasks: ${levelsUnder15.join(", ")}`);
    else console.log("  Levels < 15 tasks: none");

    const mvpErrors = [
      "B1",
      "B3",
      "C1",
      "C2",
      "C4",
      "D3",
      "E1",
      "E2",
      "E7",
      "G1",
      "G2",
      "H4",
    ];
    const errorsUnder5 = mvpErrors.filter((e) => (errorCounts.get(e) ?? 0) < 5);
    if (errorsUnder5.length)
      console.log(`  Error codes < 5 tasks: ${errorsUnder5.join(", ")}`);
    else console.log("  Error codes < 5 tasks: none");
  }

  console.log(
    "â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

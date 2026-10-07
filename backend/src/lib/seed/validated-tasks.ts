import * as fs from "fs";
import * as path from "path";

// backend/src/lib/seed -> repo root. content-pipeline is not a workspace.
export const VALIDATED_DIR = path.join(
  __dirname,
  "../../../../content-pipeline/validated",
);

export interface ValidatedVariant {
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

/** Loads every variant from the validated task files. Throws rather than
 * returning an empty list, so a bad path can't masquerade as a clean seed. */
export function loadValidatedTasks(
  validatedDir: string = VALIDATED_DIR,
): ValidatedVariant[] {
  if (!fs.existsSync(validatedDir)) {
    throw new Error(`Validated tasks folder not found: ${validatedDir}`);
  }
  const files = fs.readdirSync(validatedDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    throw new Error(`No task files in validated tasks folder: ${validatedDir}`);
  }
  const variants: ValidatedVariant[] = [];
  for (const file of files) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(validatedDir, file), "utf-8"),
    );
    if (Array.isArray(raw.variants)) variants.push(...raw.variants);
  }
  if (variants.length === 0) {
    throw new Error(`No variants found in ${files.length} files: ${validatedDir}`);
  }
  return variants;
}

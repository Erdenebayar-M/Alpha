/**
 * Parent-facing Mongolian labels for the eight orthography skills (S1..S8).
 * Copied from mobile/src/features/plan/planFormat.ts rather than imported —
 * web isn't an npm workspace member and the labels live in mobile's source,
 * not shared/ (see web/scripts/check-shared-drift.mjs for the mirror check).
 *
 * Known discrepancy, flagged rather than silently resolved: S2's label here
 * ("Эгшгийн зохицол") doesn't match its semantics in
 * backend/src/lib/error-engine/error-skill-map.ts, where S2 is "үсгийн
 * бүтэц" (word structure) and S3 is the vowel-harmony skill. Kept as-is for
 * consistency with mobile; raise with design/product before changing either.
 */
export const SKILL_LABELS: Record<string, string> = {
  S1: "Үсэг таних",
  S2: "Эгшгийн зохицол",
  S3: "Гийгүүлэгч",
  S4: "Сонсох бичих",
  S5: "Үг зөв бичих",
  S6: "Нөхөх / угсрах",
  S7: "Том үсэг",
  S8: "Цэг таслал",
};

export const SKILL_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;

export function skillLabel(skillCode: string): string {
  return SKILL_LABELS[skillCode] ?? skillCode;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  LOW: "Бага",
  MEDIUM: "Дунд",
  HIGH: "Өндөр",
};

export function confidenceLabel(confidence: string): string {
  return CONFIDENCE_LABELS[confidence] ?? confidence;
}

/** "M0".."M5" -> a short parent-facing level label. */
export function levelLabel(level: string): string {
  const n = Number(level.replace(/\D/g, ""));
  return Number.isFinite(n) ? `Түвшин ${n}` : level;
}

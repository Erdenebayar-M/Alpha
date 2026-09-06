// Shared parent-facing labels/formatters for skills and the study plan. Used by both
// the dashboard summary card and the dedicated plan screen so the wording stays in sync.

// The dashboard and plan screens' "no plan/progress yet" states both end with this
// call-to-action, pointing at the same diagnostic route.
export const START_DIAGNOSTIC_LABEL = 'Онош эхлүүлэх';

// Short parent-facing labels for the eight orthography skills (S1..S8).
export const SKILL_LABELS: Record<number, string> = {
  1: 'Үсэг таних',
  2: 'Эгшгийн зохицол',
  3: 'Гийгүүлэгч',
  4: 'Сонсох бичих',
  5: 'Үг зөв бичих',
  6: 'Нөхөх / угсрах',
  7: 'Том үсэг',
  8: 'Цэг таслал',
};

const TEMPLATE_LABELS: Record<string, string> = {
  INTENSIVE: 'Эрчимжүүлсэн',
  BALANCED: 'Тэнцвэртэй',
  STABILIZATION: 'Бэхжүүлэх',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Хүлээгдэж буй',
  SCHEDULED: 'Хүлээгдэж буй',
  IN_PROGRESS: 'Хийж байгаа',
  COMPLETED: 'Дууссан',
  PASSED: 'Тэнцсэн',
  FAILED: 'Дахин',
};

// Accepts "S1".."S8" (or a bare digit) and returns the parent-facing skill name.
export function skillLabel(skill: string): string {
  return SKILL_LABELS[Number(skill.replace(/\D/g, ''))] ?? skill;
}

export function templateLabel(template: string): string {
  return TEMPLATE_LABELS[template] ?? template;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// A lesson/checkpoint is "done" when completed or passed — drives the green accent.
export function isDone(status: string): boolean {
  return status === 'COMPLETED' || status === 'PASSED';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

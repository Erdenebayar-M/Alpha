const PARENT_NAMES = [
  'Батмөнх','Энхтуяа','Гантулга','Оюунцэцэг','Болд','Сарнай','Дорж','Мөнхзул',
  'Баяр','Цэцэгмаа','Нарантуяа','Ганбаатар','Солонго','Алтантуяа','Буянтогтох',
];

const LEARNER_NAMES = [
  'Болд','Мөнх','Гэрэл','Наран','Тэнгис','Булган','Зул','Баяр',
  'Ганпүрэв','Ундрах','Номин','Цэнд','Өлзий','Дэлгэр','Эрдэнэ',
];

export function randomParentName(): string {
  return PARENT_NAMES[Math.floor(Math.random() * PARENT_NAMES.length)];
}

export function randomLearnerName(): string {
  return LEARNER_NAMES[Math.floor(Math.random() * LEARNER_NAMES.length)];
}

/** ~60% grades 1-2 (variant A), ~40% grades 3-4 (variant B) */
export function randomGrade(): number {
  return Math.random() < 0.6 ? Math.ceil(Math.random() * 2) : 3 + Math.floor(Math.random() * 2);
}

export function randomDailyMinutes(): number {
  // 5, 10, or 15 minutes — realistic for elementary school
  return [5, 10, 15][Math.floor(Math.random() * 3)];
}

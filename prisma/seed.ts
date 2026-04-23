if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
  console.error('Cannot run seed in production!');
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGradeBand(raw: string): string[] {
  if (raw.includes("-")) return raw.split("-");
  return [raw];
}

function parseStringArray(raw: string, sep = ","): string[] {
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Only S1–S8 are valid SkillCode enum values; drop stray tags.
function parseSkillTags(raw: string): string[] {
  const valid = new Set(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
  return parseStringArray(raw).filter((s) => valid.has(s));
}

// ─── Word seed data ───────────────────────────────────────────────────────────

const wordRows = [
  ["W001","ном","Нэр үг","G1","3","1","S1,S2","A2,B1","1","1","цагаан дэвсгэр дээр ганц ном, хүүхдэд ойлгомжтой энгийн зураг","ном","Энэ бол ном.","нум; мод","н_м"],
  ["W002","нум","Нэр үг","G1","3","1","S1,S2","A1,A2","1","1","цагаан дэвсгэр дээр нум сумгүйгээр, энгийн дүрслэл","нум","Нум өлгөөтэй байна.","ном; нуур","н_м"],
  ["W003","мод","Нэр үг","G1","3","1","S1,S2","A1,B1","1","1","ногоон навчтай ганц мод","мод","Хашаанд мод байна.","ном; мол","м_д"],
  ["W004","гэр","Нэр үг","G1","4","1","S2,S7","B1,D5","1","1","монгол гэрийг урдаас харуулсан энгийн зураг","гэр","Дулаахан гэр.","гар; гөл","гэ_"],
  ["W005","нар","Нэр үг","G1","3","1","S1,S2","A1,D5","1","1","инээмсэглэсэн биш, энгийн шар нар","нар","Нар мандлаа.","сар; нур","н_р"],
  ["W006","сар","Нэр үг","G1","3","1","S1,S2","A1,D5","1","1","шөнийн тэнгэргүйгээр ганц хавирган сар","сар","Сар тод байна.","нар; сор","с_р"],
  ["W007","ус","Нэр үг","G1","2","1","S1,S2","A1","1","1","устай аяга эсвэл усны дусал","ус","Ус тунгалаг.","үс; үнс","_с"],
  ["W008","цас","Нэр үг","G1","3","1","S2,S3","B1,C1","1","1","цагаан цасан овоо","цас","Цас орлоо.","цэц; тас","ц_с"],
  ["W009","мал","Нэр үг","G1","3","1","S2,S5","B1,E1","1","1","малын ерөнхий энгийн дүрс, олон амьтан биш","мал","Мал бэлчинэ.","малд; мол","м_л"],
  ["W010","гал","Нэр үг","G1","3","1","S1,S2","A1,B1","1","1","аюулгүй, жижиг галын дөл","гал","Гал дүрэлзэв.","гар; гол","г_л"],
  ["W011","тогоо","Нэр үг","G1-G2","5","2","S3,S2","C1,C2","1","1","гал дээр биш, ганц тогоо","тогоо","Тогоо том.","того; тогуу","т_г_о"],
  ["W012","бөмбөг","Нэр үг","G1-G2","6","2","S2,S3","B1,C1","1","1","улаан бөмбөг, цагаан дэвсгэртэй","бөмбөг","Би бөмбөг шидэв.","бөмбөгг; бөмбөгө","бөмб_г"],
  ["W013","шувуу","Нэр үг","G1-G2","6","2","S3,S2","C1,C2","1","1","ганц жижиг шувуу","шувуу","Шувуу нисэв.","шуву; шувүү","шув_у"],
  ["W014","хүүхэд","Нэр үг","G1-G2","6","2","S2,S3","B3,C4","1","1","хүүхэд ганцаараа зогсож буй энгийн зураг","хүүхэд","Хүүхэд инээв.","хүүхэдд; хүүхд","хүү_эд"],
  ["W015","цэцэг","Нэр үг","G1-G2","6","2","S2,S3","B1,C1","1","1","ганц цэцэг, энгийн дүрс","цэцэг","Цэцэг ургав.","цэцэгг; цэцэгө","цэц_г"],
  ["W016","авдар","Нэр үг","G2","6","2","S4,S2","C4,D5","1","1","модон авдар, урдаас харсан","авдар","Авдар өрөөнд байна.","авдр; автар","авд_р"],
  ["W017","өндөг","Нэр үг","G1-G2","5","2","S3,S2","C1,D5","1","1","ганц өндөг эсвэл хоёр өндөг","өндөг","Өндөг чанав.","өндөгг; өнд_г","өнд_г"],
  ["W018","дэвтэр","Нэр үг","G1-G2","7","2","S4,S2","C4,D5","1","1","хаалттай дэвтэр","дэвтэр","Дэвтэр цэвэр.","дэвтр; дэвтэрр","дэвт_р"],
  ["W019","сандал","Нэр үг","G1-G2","7","2","S4,S2","C4,D5","1","1","ганц сандал, хажуу талаас","сандал","Сандал модон.","сандл; сандалд","санд_л"],
  ["W020","цонх","Нэр үг","G1-G2","4","1","S2,S4","B1,C4","1","1","байшингийн ганц цонх","цонх","Цонх нээлттэй.","цонхх; цон_","цон_"],
  ["W021","харандаа","Нэр үг","G2","8","3","S4,S2","C4,B3","1","1","шар харандаа ганцаараа","харандаа","Харандаа хурц.","харанда; харандааа","харанд_а"],
  ["W022","сүү","Нэр үг","G1-G2","3","1","S3,S7","C1,H1","1","1","шилэн аягатай сүү","сүү","Сүү цагаан.","су; сү","с_ү"],
  ["W023","алим","Нэр үг","G1-G2","4","2","S2,S7","B1,H1","1","1","улаан алим ганцаараа","алим","Алим амттай.","алимм; ал_м","ал_м"],
  ["W024","гутал","Нэр үг","G1-G2","5","2","S2,S7","B1,H1","1","1","хос гутал","гутал","Гутал цэвэр.","гутл; гуталл","гут_л"],
  ["W025","туулай","Нэр үг","G2","6","2","S3,S2","C1,B1","1","1","цагаан туулай ганцаараа","туулай","Туулай хурдан.","туулайй; тулай","т_улай"],
  ["W026","багш","Нэр үг","G2","5","1","S2,S6","B1,G1","1","1","багш самбарын өмнө биш, энгийн хөрөг маягаар","багш","Багш ирлээ.","багш.","баг_"],
  ["W027","сургууль","Нэр үг","G2","8","2","S5,S6","E1,G1","1","1","сургуулийн барилгын энгийн зураг","сургууль","Сургууль эхэллээ.","сургуули; сургуль","сургуу_ь"],
  ["W028","хоол","Нэр үг","G1-G2","4","1","S3,S5","C1,E1","1","1","уур савссан аяга хоол","хоол","Хоол халуун.","хол; хоолл","х_ол"],
  ["W029","ээж","Нэр үг","G1-G2","3","1","S3,S6","C1,G1","1","1","ээж инээмсэглэж зогсож буй энгийн зураг","ээж","Ээж ирэв.","эж; ээж.","_эж"],
  ["W030","аав","Нэр үг","G1-G2","3","1","S3,S6","C1,G1","1","1","аав энгийн хөрөг","аав","Аав ажиллав.","ав; аав.","_ав"],
  ["W031","Бат","Оноосон нэр","G2","3","1","S6","G1","0","1","зураг хэрэглэхгүй","Бат","Бат ирлээ.","бат","Б_т"],
  ["W032","би явна","Богино өгүүлбэр","G1-G2","7","3","S6","G1,G2","0","1","зураг хэрэглэхгүй","Би явна.","Би явна.","би явна","би явна"],
  ["W033","тэр ирэв","Богино өгүүлбэр","G1-G2","8","3","S6","G1,G2","0","1","зураг хэрэглэхгүй","Тэр ирэв.","Тэр ирэв.","тэр ирэв","тэр ирэв"],
  ["W034","номоо","Залгавартай үг","G2","5","2","S5","E1,E2","0","1","зураг хэрэглэхгүй","номоо","Би номоо авлаа.","номо; номаа","ном_о"],
  ["W035","гэрт","Залгавартай үг","G2","4","1","S5","E1,E2","0","1","зураг хэрэглэхгүй","гэрт","Би гэртээ байна.","гэрд; гэр","гэр_"],
  ["W036","морь","Нэр үг","G1-G2","4","1","S2","B1,D5","1","1","ганц морь, хажуу талаас","морь","Морь хурдан.","мор; морй","мор_"],
  ["W037","тоног","Нэр үг","G2","5","2","S2","D5","0","1","зураг шаардлагагүй","тоног","Тоног бэлэн.","тонод; тоногг","тоно_"],
  ["W038","хивс","Нэр үг","G2","5","1","S2","D5","1","1","ганц хивс дээрээс биш, бага өнцгөөр","хивс","Хивс цэвэр.","хив; хивсс","хив_"],
  ["W039","зураг","Нэр үг","G1-G2","5","2","S2","B1,D5","1","1","хананд өлгөсөн ганц зураг","зураг","Зураг гоё.","зурак; зура","зура_"],
  ["W040","сав","Нэр үг","G1","3","1","S1,S2","A1,B1","1","1","ганц сав","сав","Сав хоосон.","сар; сов","с_в"],
] as const;

// ─── Task seed data ───────────────────────────────────────────────────────────

interface TaskSeed {
  id: string;
  task_type: TaskType;
  title: string;
  prompt_text: string;
  correct_answer: string;
  options: object;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: SkillCode;
  secondary_skill: SkillCode | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  review_after_days: number[];
  lesson_slot_fit: LessonSlot;
  feedback_text: string;
  is_diagnostic?: boolean;
}

const readyTasks: TaskSeed[] = [
  {
    id: "G12-001",
    task_type: TaskType.TT1_CHOICE,
    title: "Сонсож сонгох — ном",
    prompt_text: "Сонслоо. Аль үг вэ?",
    correct_answer: "ном",
    options: { choices: [{ text: "ном", is_correct: true }, { text: "нум", is_correct: false }, { text: "мод", is_correct: false }], audio_trigger: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A1", "A2"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "'ном' гэдэг үгэнд о авиаг сонслоо.",
  },
  {
    id: "G12-001v2",
    task_type: TaskType.TT1_CHOICE,
    title: "Сонсож сонгох — сар",
    prompt_text: "Сонслоо. Аль үг вэ?",
    correct_answer: "сар",
    options: { choices: [{ text: "сар", is_correct: true }, { text: "нар", is_correct: false }, { text: "сав", is_correct: false }], audio_trigger: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Зөв сонслоо.",
  },
  {
    id: "G12-002",
    task_type: TaskType.TT2_FILL,
    title: "Үсэг нөхөх — ном",
    prompt_text: "Дутуу үсгийг нөхөж бич.",
    correct_answer: "о",
    options: { display_text: "н_м", blank_position: 1, blank_answer: "о", context_word: "ном" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A2", "B1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "'ном' гэж бүтэн уншаад шалга.",
  },
  {
    id: "G12-003",
    task_type: TaskType.TT1_CHOICE,
    title: "Зураг-үг тааруулах — алим",
    prompt_text: "Зурагт тохирох үгийг сонго.",
    correct_answer: "алим",
    options: { choices: [{ text: "алим", is_correct: true }, { text: "гутал", is_correct: false }, { text: "цас", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B1"], grade_band: ["G1", "G2"],
    difficulty: 1, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Зурагтай үгийг зөв таарууллаа.",
  },
  {
    id: "G12-003v2",
    task_type: TaskType.TT1_CHOICE,
    title: "Зураг-үг тааруулах — гэр",
    prompt_text: "Зурагт тохирох үгийг сонго.",
    correct_answer: "гэр",
    options: { choices: [{ text: "гэр", is_correct: true }, { text: "морь", is_correct: false }, { text: "ном", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Зураг нь монгол гэр байна.",
  },
  {
    id: "G12-004",
    task_type: TaskType.TT3_CORRECTION,
    title: "Хуулж бичих — Энэ бол ном.",
    prompt_text: "Доорх өгүүлбэрийг хуулж бич.",
    correct_answer: "Энэ бол ном.",
    options: { incorrect_text: "Энэ бол ном.", correct_text: "Энэ бол ном.", error_type: "B3", hint: "Үсгийн дараалал, цэгээ шалга." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B3"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Үсгийн дараалал, цэгээ шалга.",
  },
  {
    id: "G12-005",
    task_type: TaskType.TT1_CHOICE,
    title: "Зөвийг сонгох — тогоо",
    prompt_text: "Аль нь зөв бэ?",
    correct_answer: "тогоо",
    options: { choices: [{ text: "тогоо", is_correct: true }, { text: "того", is_correct: false }, { text: "тогуу", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1", "C2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Урт эгшгийг анзаар.",
  },
  {
    id: "G12-005v2",
    task_type: TaskType.TT1_CHOICE,
    title: "Зөвийг сонгох — сүү",
    prompt_text: "Аль нь зөв бэ?",
    correct_answer: "сүү",
    options: { choices: [{ text: "сүү", is_correct: true }, { text: "су", is_correct: false }, { text: "сү", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Урт эгшигтэй хэлбэрийг сонго.",
  },
  {
    id: "G12-006",
    task_type: TaskType.TT2_FILL,
    title: "Нөхөж бичих — бөмбөг",
    prompt_text: "Дутуу үсгийг нөхөж бич.",
    correct_answer: "ө",
    options: { display_text: "бөмб_г", blank_position: 4, blank_answer: "ө", context_word: "бөмбөг" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1", "C2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Дундах эгшгийг зөв нөх.",
  },
  {
    id: "G12-006v2",
    task_type: TaskType.TT2_FILL,
    title: "Нөхөж бичих — шувуу",
    prompt_text: "Дутуу үсгийг нөхөж бич.",
    correct_answer: "у",
    options: { display_text: "шув_у", blank_position: 3, blank_answer: "у", context_word: "шувуу" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Давхар эгшгийн хэлбэрийг анзаар.",
  },
  {
    id: "G12-007",
    task_type: TaskType.TT2_FILL,
    title: "Дутуу үсэг — дэвтэр",
    prompt_text: "Аудио сонсоод дутуу үсгийг нөхөж бич.",
    correct_answer: "э",
    options: { display_text: "дэвт_р", blank_position: 4, blank_answer: "э", context_word: "дэвтэр" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S4, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Балархай эгшгийг нөхөж бич.",
  },
  {
    id: "G12-008",
    task_type: TaskType.TT4_DICTATION,
    title: "Үгийн багц диктант — ном гэр нар",
    prompt_text: "Сонссон дарааллаар бичээрэй.",
    correct_answer: "ном; гэр; нар",
    options: { audio_text: "ном, гэр, нар", word_count: 3, expected_answers: ["ном", "гэр", "нар"], allow_partial: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S7, secondary_skill: SkillCode.S1,
    level_target: "M1", error_targets: ["H1", "B1"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 180, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Сонссон дарааллаар бичээрэй.",
  },
  {
    id: "G12-009",
    task_type: TaskType.TT3_CORRECTION,
    title: "Том үсэг, цэг — би явна",
    prompt_text: "Алдааг засаж зөв бич.",
    correct_answer: "Би явна.",
    options: { incorrect_text: "би явна", correct_text: "Би явна.", error_type: "G1", hint: "Эхний үсэг том, төгсгөлд цэг." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S6, secondary_skill: null,
    level_target: "M1", error_targets: ["G1", "G2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Эхний үсэг том, төгсгөлд цэг.",
  },
  {
    id: "G12-009v2",
    task_type: TaskType.TT3_CORRECTION,
    title: "Том үсэг, цэг — бат ирлээ",
    prompt_text: "Алдааг засаж зөв бич.",
    correct_answer: "Бат ирлээ.",
    options: { incorrect_text: "бат ирлээ", correct_text: "Бат ирлээ.", error_type: "G1", hint: "Нэрний эхний үсэг том." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S6, secondary_skill: null,
    level_target: "M1", error_targets: ["G1"], grade_band: ["G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Нэрний эхний үсэг том.",
  },
  {
    id: "G12-010",
    task_type: TaskType.TT1_CHOICE,
    title: "Энгийн залгавар — гэрт",
    prompt_text: "Аль нь зөв бэ?",
    correct_answer: "гэрт",
    options: { choices: [{ text: "гэрт", is_correct: true }, { text: "гэрд", is_correct: false }, { text: "гэр", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S5, secondary_skill: null,
    level_target: "M1", error_targets: ["E1", "E2"], grade_band: ["G2"],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Түгээмэл залгаврын хэлбэрийг тань.",
  },
  {
    id: "G12-011",
    task_type: TaskType.TT3_CORRECTION,
    title: "Алдаа олох — номм",
    prompt_text: "Алдааг ол, засаж бич.",
    correct_answer: "ном",
    options: { incorrect_text: "номм", correct_text: "ном", error_type: "H4", hint: "Илүү үсгийг хас." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["B2", "H4"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Илүү үсгийг хас.",
  },
  {
    id: "G12-011v2",
    task_type: TaskType.TT3_CORRECTION,
    title: "Алдаа олох — того",
    prompt_text: "Алдааг ол, засаж бич.",
    correct_answer: "тогоо",
    options: { incorrect_text: "того", correct_text: "тогоо", error_type: "C1", hint: "Урт эгшгийг дутуу бичсэн байна." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S3,
    level_target: "M1", error_targets: ["C1", "H4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Урт эгшгийг дутуу бичсэн байна.",
  },
  {
    id: "G12-012",
    task_type: TaskType.TT6_SELF_CHECK,
    title: "Өөрийгөө шалгах — сүү",
    prompt_text: "Чи бичсэн болон загварыг харьцуул.",
    correct_answer: "сүү",
    options: { original_attempt: "сү", model_answer: "сүү", comparison_mode: "side_by_side" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S3,
    level_target: "M1", error_targets: ["C1", "H4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 60, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.END, feedback_text: "Хоёр үсгийн ялгааг өөрөө ол.",
  },
  {
    id: "G12-013",
    task_type: TaskType.TT4_DICTATION,
    title: "2 үгийн диктант — ном сар",
    prompt_text: "Сонссон дарааллаар бичнэ үү.",
    correct_answer: "ном; сар",
    options: { audio_text: "ном, сар", word_count: 2, expected_answers: ["ном", "сар"], allow_partial: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S7, secondary_skill: SkillCode.S1,
    level_target: "M1", error_targets: ["H1"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 120, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Хоёр үгийг дарааллаар нь бич.",
  },
  {
    id: "G12-014",
    task_type: TaskType.TT2_FILL,
    title: "Үгийн төгсгөл — гэр",
    prompt_text: "Дутуу үсгийг нөхөж бич.",
    correct_answer: "р",
    options: { display_text: "гэ_", blank_position: 2, blank_answer: "р", context_word: "гэр" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M1", error_targets: ["D5"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Төгсгөлийн үсгийг зөв бич.",
  },
];

const placeholderTasks: TaskSeed[] = [
  { id: "G12-015", task_type: TaskType.TT2_FILL, title: "Өгүүлбэр нөхөх", prompt_text: "Өгүүлбэрийг бүтэн болгон нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M1", error_targets: ["G2"], grade_band: ["G1", "G2"], difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Нэг өгүүлбэрийг бүтэн болгох." },
  { id: "G12-016", task_type: TaskType.TT1_CHOICE, title: "Холимог давталт", prompt_text: "Аль нь зөв бэ?", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S3, level_target: "M1", error_targets: ["B1", "C1"], grade_band: ["G1", "G2"], difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Үг ба эгшгийг хамт шалгах." },
  { id: "G24-001", task_type: TaskType.TT1_CHOICE, title: "Үгийн зөв хэлбэр сонгох", prompt_text: "Суурь зөв бичлэгийн хэлбэрийг сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: null, level_target: "M1", error_targets: ["B1", "B3"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Суурь зөв бичлэг." },
  { id: "G24-002", task_type: TaskType.TT2_FILL, title: "Урт эгшиг нөхөх", prompt_text: "Урт эгшгийг зөв нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M1", error_targets: ["C1"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Урт/богино эгшгийн суурь." },
  { id: "G24-003", task_type: TaskType.TT2_FILL, title: "Балархай эгшиг", prompt_text: "Балархай эгшгийг зөв нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S4, secondary_skill: null, level_target: "M1", error_targets: ["C4"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Дутуу эгшиг нөхөх." },
  { id: "G24-004", task_type: TaskType.TT1_CHOICE, title: "Залгавар сонгох", prompt_text: "Зохих залгаврыг сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Энгийн залгавар хэрэглэх." },
  { id: "G24-005", task_type: TaskType.TT3_CORRECTION, title: "Том үсэг, цэг", prompt_text: "Өгүүлбэрийн том үсэг, цэгийг зөв бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M1", error_targets: ["G1", "G2"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Өгүүлбэрийн тэмдэглэгээ." },
  { id: "G24-006", task_type: TaskType.TT4_DICTATION, title: "Богино өгүүлбэрийн диктант", prompt_text: "Богино өгүүлбэрийг сонсоод бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M2", error_targets: ["H1", "B4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 60, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Сонсголоор буулгах." },
  { id: "G24-007", task_type: TaskType.TT3_CORRECTION, title: "Алдаа засах", prompt_text: "Алдаатай үгийг засаж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M2", error_targets: ["H4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Өөрөө засах чадвар." },
  { id: "G24-008", task_type: TaskType.TT1_CHOICE, title: "Гийгүүлэгч андуурал", prompt_text: "Ижил төстэй авиаг ялгаж сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S1, secondary_skill: null, level_target: "M1", error_targets: ["D3"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Төстэй авиа ялгах." },
  { id: "G24-009", task_type: TaskType.TT3_CORRECTION, title: "Үгийн хэлбэр засах", prompt_text: "Үгийн зөв хэлбэрийг засаж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: null, level_target: "M2", error_targets: ["F1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Язгуур хэлбэрийг таних." },
  { id: "G24-010", task_type: TaskType.TT1_CHOICE, title: "Урт эгшиг өгүүлбэрт", prompt_text: "Урт эгшгийг өгүүлбэрт ялга.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M2", error_targets: ["C1", "C2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Контекст дотор ялгах." },
  { id: "G24-011", task_type: TaskType.TT2_FILL, title: "Балархай эгшиг өгүүлбэрт", prompt_text: "Балархай эгшгийг өгүүлбэрт нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S4, secondary_skill: null, level_target: "M2", error_targets: ["C4", "C5"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Өгүүлбэрт зөв нөхөх." },
  { id: "G24-012", task_type: TaskType.TT1_CHOICE, title: "Тийн ялгал", prompt_text: "Тийн ялгалын зөв хэлбэрийг сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Өгүүлбэрийн үүрэгт тохируулах." },
  { id: "G24-013", task_type: TaskType.TT3_CORRECTION, title: "Таслалын анхан хэрэглээ", prompt_text: "Таслалыг зөв байрлуулж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M2", error_targets: ["G4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Энгийн завсар тэмдэг." },
  { id: "G24-014", task_type: TaskType.TT4_DICTATION, title: "2 өгүүлбэрийн диктант", prompt_text: "Хоёр өгүүлбэрийг сонсоод бичнэ үү.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M2", error_targets: ["H1", "H2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 120, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Хурд ба ой." },
  { id: "G24-015", task_type: TaskType.TT3_CORRECTION, title: "Үсэг орхигдол олох", prompt_text: "Орхигдсон үсгийг ол, засаж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M2", error_targets: ["B1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Нийтлэг алдааг засах." },
  { id: "G24-016", task_type: TaskType.TT1_CHOICE, title: "Холимог үгийн багц", prompt_text: "Зөв үгийн хэлбэрийг сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S3, level_target: "M2", error_targets: ["B1", "C1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Үг+эгшгийн бататгал." },
  { id: "G24-017", task_type: TaskType.TT2_FILL, title: "Залгавар бичлэг", prompt_text: "Залгаврыг зөв нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E7"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Сонгосон хэлбэрээ зөв бичих." },
  { id: "G24-018", task_type: TaskType.TT3_CORRECTION, title: "Өгүүлбэрийн хил зааг", prompt_text: "Өгүүлбэрүүдийг зөв салгаж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M2", error_targets: ["G5"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Өгүүлбэр салгах." },
  { id: "G24-019", task_type: TaskType.TT5_MINI_TEXT, title: "Мини эхийн диктант", prompt_text: "Богино эхийг сонсоод бичнэ үү.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M3", error_targets: ["H1", "B4"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 120, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.MIXED, feedback_text: "2–3 өгүүлбэртэй эх." },
  { id: "G24-020", task_type: TaskType.TT6_SELF_CHECK, title: "Өөрийн бичвэр засвар", prompt_text: "Өөрийн бичвэрийг шалгаж засаарай.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M3", error_targets: ["H4"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 60, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.END, feedback_text: "Дахин шалгалт ба self-correction." },
  { id: "G24-021", task_type: TaskType.TT1_CHOICE, title: "Урт эгшиг challenge", prompt_text: "Урт эгшгийн хэлбэрийг сонго.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M3", error_targets: ["C1", "C2"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ахисан ялгалт." },
  { id: "G24-022", task_type: TaskType.TT2_FILL, title: "Нийлмэл залгавар", prompt_text: "Нийлмэл залгаврыг зөв нөхөж бич.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M3", error_targets: ["E2", "E7"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Олон дүрэм давхцах." },
  { id: "G24-023", task_type: TaskType.TT1_CHOICE, title: "Холимог checkpoint", prompt_text: "Холимог хэлбэрийн даалгаврыг гүйцэтгэ.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S5, level_target: "M2-M3", error_targets: ["Mixed"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 30, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.MIXED, feedback_text: "Долоо хоногийн шалгалт." },
  { id: "G24-024", task_type: TaskType.TT3_CORRECTION, title: "Тайлбартай засвар", prompt_text: "Алдааны шалтгааныг тайлбарлаж засаарай.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M3", error_targets: ["Mixed"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 45, review_after_days: [1, 3, 7], lesson_slot_fit: LessonSlot.CORE, feedback_text: "Яагаад буруу гэдгийг хэлэх." },
];

// ─── Load validated task variants from content-pipeline/validated/*.json ──────

interface ValidatedVariant {
  id: string;
  task_type: string;
  title: string;
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
  review_after_days: number[];
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
    const raw = JSON.parse(fs.readFileSync(path.join(validatedDir, file), "utf-8"));
    if (Array.isArray(raw.variants)) {
      variants.push(...raw.variants);
    }
  }
  return variants;
}

// ─── Load words from content-pipeline/generated/seed-words.json ───────────────

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
  const seedFile = path.join(__dirname, "../content-pipeline/generated/seed-words.json");
  if (!fs.existsSync(seedFile)) return [];
  const raw = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
  return Array.isArray(raw.words) ? raw.words : [];
}

// readyTasks G12-001 through G12-009 (including v2 variants) are the Phase A/B diagnostic pool.
const DIAGNOSTIC_TASK_IDS = new Set([
  "G12-001", "G12-001v2",
  "G12-002",
  "G12-003", "G12-003v2",
  "G12-004",
  "G12-005", "G12-005v2",
  "G12-006", "G12-006v2",
  "G12-007",
  "G12-008",
  "G12-009", "G12-009v2",
]);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  // ── Words from hardcoded wordRows ──────────────────────────────────────────
  let wordCreated = 0;
  let wordUpdated = 0;
  let wordErrored = 0;

  for (const row of wordRows) {
    const [id, word, category, gradeBandRaw, charCount, syllableCount, skillTagsRaw, errorTagsRaw, imageOk, audioOk, imagePrompt, audioText, sampleSentence, distractorsRaw, blankHint] = row;
    const data = {
      word,
      category: category.trim(),
      grade_band: parseGradeBand(gradeBandRaw),
      char_count: parseInt(charCount),
      syllable_count: parseInt(syllableCount),
      skill_tags: parseSkillTags(skillTagsRaw),
      error_tags: parseStringArray(errorTagsRaw),
      image_ok: imageOk === "1",
      audio_ok: audioOk === "1",
      image_prompt: imagePrompt || null,
      audio_text: audioText || null,
      sample_sentence: sampleSentence || null,
      distractors: parseStringArray(distractorsRaw, ";"),
      blank_hint: blankHint || null,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.word.findUnique({ where: { id } });
        console.log(`[DRY RUN] Word ${id} (${word}): ${exists ? "UPDATE" : "CREATE"}`);
        exists ? wordUpdated++ : wordCreated++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id } });
        await prisma.word.upsert({ where: { id }, update: data, create: { id, ...data } });
        exists ? wordUpdated++ : wordCreated++;
      }
    } catch (e) {
      console.error(`  ERROR word ${id}:`, (e as Error).message);
      wordErrored++;
    }
  }

  // ── Words from seed-words.json (upsert by id; skip duplicates already covered above) ──
  const seedWords = loadSeedWords();
  const hardcodedWordIds = new Set(wordRows.map((r) => r[0] as string));
  for (const w of seedWords) {
    if (hardcodedWordIds.has(w.id)) continue; // already handled above
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
        console.log(`[DRY RUN] Word ${w.id} (${w.word}): ${exists ? "UPDATE" : "CREATE"}`);
        exists ? wordUpdated++ : wordCreated++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id: w.id } });
        await prisma.word.upsert({ where: { id: w.id }, update: data, create: { id: w.id, ...data } });
        exists ? wordUpdated++ : wordCreated++;
      }
    } catch (e) {
      console.error(`  ERROR word ${w.id}:`, (e as Error).message);
      wordErrored++;
    }
  }

  const wordTotal = wordCreated + wordUpdated;

  // ── Hardcoded tasks (readyTasks + placeholderTasks) ────────────────────────
  let taskCreated = 0;
  let taskUpdated = 0;
  let taskErrored = 0;

  for (const t of [...readyTasks, ...placeholderTasks]) {
    const data = {
      task_type: t.task_type,
      title: t.title,
      prompt_text: t.prompt_text,
      correct_answer: t.correct_answer,
      options: t.options,
      audio_url: t.audio_url,
      image_url: t.image_url,
      primary_skill: t.primary_skill,
      secondary_skill: t.secondary_skill ?? undefined,
      level_target: t.level_target,
      error_targets: t.error_targets,
      grade_band: t.grade_band,
      difficulty: t.difficulty,
      estimated_time_seconds: t.estimated_time_seconds,
      review_after_days: t.review_after_days,
      lesson_slot_fit: t.lesson_slot_fit,
      feedback_text: t.feedback_text,
      is_diagnostic: DIAGNOSTIC_TASK_IDS.has(t.id),
    };
    try {
      if (isDryRun) {
        const exists = await prisma.task.findUnique({ where: { id: t.id } });
        console.log(`[DRY RUN] Task ${t.id}: ${exists ? "UPDATE" : "CREATE"}`);
        exists ? taskUpdated++ : taskCreated++;
      } else {
        const exists = await prisma.task.findUnique({ where: { id: t.id } });
        await prisma.task.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
        exists ? taskUpdated++ : taskCreated++;
      }
    } catch (e) {
      console.error(`  ERROR task ${t.id}:`, (e as Error).message);
      taskErrored++;
    }
  }

  // ── Validated task variants from content-pipeline/validated/*.json ─────────
  const validatedVariants = loadValidatedTasks();
  const hardcodedTaskIds = new Set([...readyTasks, ...placeholderTasks].map((t) => t.id));

  for (const v of validatedVariants) {
    const data = {
      task_type: v.task_type as TaskType,
      title: v.title,
      prompt_text: v.prompt_text,
      correct_answer: v.correct_answer,
      options: v.options,
      audio_url: v.audio_url,
      image_url: v.image_url,
      primary_skill: v.primary_skill as SkillCode,
      secondary_skill: v.secondary_skill ? (v.secondary_skill as SkillCode) : undefined,
      level_target: v.level_target,
      error_targets: v.error_targets,
      grade_band: v.grade_band,
      difficulty: v.difficulty,
      estimated_time_seconds: v.estimated_time_seconds,
      review_after_days: v.review_after_days,
      lesson_slot_fit: v.lesson_slot_fit as LessonSlot,
      feedback_text: v.feedback_text,
      is_diagnostic: v.is_diagnostic ?? false,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        console.log(`[DRY RUN] ValidatedTask ${v.id}: ${exists ? "UPDATE" : "CREATE"}`);
        exists ? taskUpdated++ : taskCreated++;
      } else {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        await prisma.task.upsert({ where: { id: v.id }, update: data, create: { id: v.id, ...data } });
        exists ? taskUpdated++ : taskCreated++;
      }
    } catch (e) {
      console.error(`  ERROR validated task ${v.id}:`, (e as Error).message);
      taskErrored++;
    }
  }

  const taskTotal = taskCreated + taskUpdated;

  // ── Test accounts (development only) ──────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 12);

    const parent = await prisma.parent.upsert({
      where: { email: 'test@local.dev' },
      update: {},
      create: { email: 'test@local.dev', password_hash: passwordHash, name: 'Test Parent' },
    });

    await prisma.learner.upsert({
      where: { id: 'test-learner-a' },
      update: {},
      create: { id: 'test-learner-a', parent_id: parent.id, name: 'Test A', grade: 1, variant: 'A' },
    });

    await prisma.learner.upsert({
      where: { id: 'test-learner-b' },
      update: {},
      create: { id: 'test-learner-b', parent_id: parent.id, name: 'Test B', grade: 3, variant: 'B' },
    });

    console.log('Test accounts seeded (test@local.dev / password123)');
  }

  // ── Coverage analysis ──────────────────────────────────────────────────────
  console.log("\n─── Seed Summary ───────────────────────────────────────");
  console.log(`Words upserted:  ${wordTotal} (${wordCreated} created, ${wordUpdated} updated, ${wordErrored} errors)`);
  console.log(`Tasks upserted:  ${taskTotal} (${taskCreated} created, ${taskUpdated} updated, ${taskErrored} errors)`);

  if (!isDryRun) {
    // Compute coverage from DB
    const allTasks = await prisma.task.findMany({ select: { primary_skill: true, level_target: true, error_targets: true } });

    const skillCounts = new Map<string, number>();
    const levelCounts = new Map<string, number>();
    const errorCounts = new Map<string, number>();

    for (const t of allTasks) {
      skillCounts.set(t.primary_skill, (skillCounts.get(t.primary_skill) ?? 0) + 1);
      levelCounts.set(t.level_target, (levelCounts.get(t.level_target) ?? 0) + 1);
      for (const e of t.error_targets) {
        errorCounts.set(e, (errorCounts.get(e) ?? 0) + 1);
      }
    }

    console.log("\n─── Coverage Warnings ──────────────────────────────────");

    const skillsUnder10 = [...skillCounts.entries()].filter(([, n]) => n < 10).map(([s]) => s);
    if (skillsUnder10.length) console.log(`  Skills < 10 tasks: ${skillsUnder10.join(", ")}`);
    else console.log("  Skills < 10 tasks: none");

    const levelsUnder15 = [...levelCounts.entries()].filter(([, n]) => n < 15).map(([l]) => l);
    if (levelsUnder15.length) console.log(`  Levels < 15 tasks: ${levelsUnder15.join(", ")}`);
    else console.log("  Levels < 15 tasks: none");

    const mvpErrors = ["B1","B3","C1","C2","C4","D3","E1","E2","E7","G1","G2","H4"];
    const errorsUnder5 = mvpErrors.filter((e) => (errorCounts.get(e) ?? 0) < 5);
    if (errorsUnder5.length) console.log(`  Error codes < 5 tasks: ${errorsUnder5.join(", ")}`);
    else console.log("  Error codes < 5 tasks: none");
  }

  console.log("─────────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

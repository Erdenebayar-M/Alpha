/**
 * The nine diagnostic exercises the register-child flow runs after setup,
 * transcribed from Figma (file CO08jDXzqSImiVJLDsC18v) one task card per entry:
 *
 *   1 audio_choice        1270:22692  Сонсоод зөвийг сонгоорой
 *   2 image_match         1251:15710  Зургийг хараад зөв үгийг сонгоорой
 *   3 fill_letter_tiles   1251:16251  Үгийг нөхөх
 *   4 punctuation_choice  1254:16502  Өгүүлбэр дуусахад ямар тэмдэг тавих вэ?
 *   5 punctuation_place   1255:16722  Өгүүлбэрийн төгсгөлийг олж тэмдэглэ
 *   6 comma_place         1255:16988  Таслалыг хаана, хаана тавих вэ?
 *   7 match_pairs         1255:17242  Тохирох үгийг холбоорой
 *   8 assemble_word       1255:17489  Зургийг ажиглаад үг бүтээгээрэй
 *   9 sentence_capital    1255:17752  Өгүүлбэр юугаар эхлэх вэ?
 *
 * `form` values are the renderer keys, deliberately the same nine strings
 * mobile/src/features/exercise/registry.ts already uses for these interactions —
 * so the two apps name the same exercise the same way, and swapping this static
 * list for `GET /lesson/today` later is a change to this file plus the mapping
 * from the API's snake_case `TaskOptions` onto the camelCase fields below,
 * with no renderer touched.
 *
 * No answer key is recorded. A diagnostic measures rather than teaches, and the
 * design marks no option as correct — the same call mobile makes, where
 * feedbackTiming.ts gives diagnostic tasks 0ms feedback and getFeedbackText
 * returns null for them.
 */

/** A raster illustration in one of the task cards' fixed, `object-cover` frames. */
export interface TaskImage {
  readonly src: string;
  readonly alt: string;
}

/** One segment of exercise 3's partially-written word (node 1251:16261): either
 *  letters already printed, or a blank the learner fills. */
export type WordSegment = { readonly kind: "text"; readonly text: string } | { readonly kind: "blank" };

/** One image↔word pair of exercise 7 (node 1255:17250). */
export interface TaskPair {
  readonly id: string;
  readonly image: TaskImage;
  readonly word: string;
}

interface TaskBase {
  readonly id: string;
  readonly prompt: string;
}

/** The four single-select exercises. They differ only in the media above the
 *  choices, which is why they share one layout component and one selection hook
 *  — mobile likewise routes all four through useChoiceExercise. */
export type ChoiceTask = TaskBase &
  (
    | { readonly form: "audio_choice"; readonly audioSrc: string; readonly choices: readonly string[] }
    | { readonly form: "image_match"; readonly image: TaskImage; readonly choices: readonly string[] }
    | {
        readonly form: "punctuation_choice";
        readonly image: TaskImage;
        readonly sentence: string;
        readonly choices: readonly string[];
      }
    | {
        readonly form: "sentence_capital";
        readonly image: TaskImage;
        readonly sentenceLines: readonly string[];
        readonly choices: readonly string[];
      }
  );

/** The two "drag a punctuation mark into the sentence" exercises. Written as
 *  two union members over one shared field set rather than one member with a
 *  union `form`, so `Extract<DiagnosticTask, { form: … }>` can still narrow to
 *  a single task type — which is what keeps the registry precisely typed. */
interface PlacementFields {
  readonly words: readonly string[];
  readonly token: string;
  readonly instruction: string;
}

export type PlacementTask =
  | (TaskBase & PlacementFields & { readonly form: "punctuation_place" })
  | (TaskBase & PlacementFields & { readonly form: "comma_place" });

export type LetterTask = TaskBase &
  (
    | {
        readonly form: "fill_letter_tiles";
        readonly hint: string;
        readonly image: TaskImage;
        readonly segments: readonly WordSegment[];
        readonly tiles: readonly string[];
      }
    | {
        readonly form: "assemble_word";
        readonly hint: string;
        readonly image: TaskImage;
        readonly slotCount: number;
        readonly tiles: readonly string[];
      }
  );

export type MatchTask = TaskBase & {
  readonly form: "match_pairs";
  readonly pairs: readonly TaskPair[];
};

export type DiagnosticTask = ChoiceTask | PlacementTask | LetterTask | MatchTask;

/** Every renderer key this flow can dispatch. */
export type DiagnosticForm = DiagnosticTask["form"];

const IMAGES = "/images/register";

export const diagnosticTasks = [
  {
    id: "audio-hurga",
    form: "audio_choice",
    prompt: "Сонсоод зөвийг сонгоорой",
    // Placeholder tone (not real speech) so the listening-mascot animation is
    // previewable locally — swap for the real "хурга" TTS clip from the
    // content pipeline before ship.
    audioSrc: "/audio/hurga.wav",
    choices: ["Хурга", "Хуурга", "Хураг"],
  },
  {
    id: "image-shoyj",
    form: "image_match",
    prompt: "Зургийг хараад зөв үгийг сонгоорой",
    image: { src: `${IMAGES}/toothbrush.png`, alt: "Шүдний сойз" },
    choices: ["Шойз", "Сойж", "Шойж"],
  },
  {
    id: "fill-surguul",
    form: "fill_letter_tiles",
    prompt: "Үгийг нөхөх.",
    hint: "Дутуу үсгийг нөхнө үү.",
    image: { src: `${IMAGES}/school.png`, alt: "Сургуулийн байр" },
    segments: [
      { kind: "text", text: "Сург" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "text", text: "л" },
      { kind: "blank" },
    ],
    tiles: ["у", "ь", "й", "у"],
  },
  {
    id: "punct-choice",
    form: "punctuation_choice",
    prompt: "Өгүүлбэр дуусахад ямар тэмдэг тавих вэ?",
    image: { src: `${IMAGES}/child-walking.png`, alt: "Алхаж яваа хүүхэд" },
    sentence: "Хүүхэд хаашаа явж байна _",
    choices: [".", "?", "!"],
  },
  {
    id: "punct-place",
    form: "punctuation_place",
    prompt: "Өгүүлбэрийн төгсгөлийг олж тэмдэглэ",
    words: ["Би", "ном", "уншлаа", "Дараа", "нь", "зураг", "зурлаа"],
    token: ".",
    instruction: "Цэгийг чирч өгүүлбэрийн төгсгөлд тавиарай.",
  },
  {
    id: "comma-place",
    form: "comma_place",
    prompt: "Таслалыг хаана, хаана тавих вэ?",
    words: ["Ээж", "аав", "ах", "бид", "дөрөв", "явлаа."],
    token: ",",
    instruction: "Таслалыг чирч зөв байрлалд дарна уу",
  },
  {
    id: "match-animals",
    form: "match_pairs",
    prompt: "Тохирох үгийг холбоорой",
    // Word list is verbatim from nodes 1255:17256/17262/17268. The design's own
    // demo state links the wolf to "Хорь", which is only a mock of the matched
    // styling — nothing here declares a correct pairing, so no answer key is
    // implied by the order below.
    pairs: [
      { id: "wolf", image: { src: `${IMAGES}/wolf.png`, alt: "Чоно" }, word: "Хорь" },
      { id: "twenty", image: { src: `${IMAGES}/twenty.png`, alt: "20 гэсэн тоо" }, word: "Морь" },
      { id: "horse", image: { src: `${IMAGES}/horse.png`, alt: "Морь" }, word: "Чоно" },
    ],
  },
  {
    id: "assemble-chanah",
    form: "assemble_word",
    prompt: "Зургийг ажиглаад үг бүтээгээрэй.",
    hint: "Доорх үсгүүдийг зөв дараалалд дарна уу:",
    image: { src: `${IMAGES}/chanah.png`, alt: "Тогоонд хоол чанаж буй хүүхэд" },
    slotCount: 5,
    // Figma's tile row (node 1255:17510) reads А Н Ш Х А while its slots above
    // show Ч and А already placed — the two states of that one mock disagree,
    // and as drawn no arrangement of the tiles can fill the slots. The tiles
    // here keep the design's letters and order with Ш corrected to Ч, the
    // letter its own slots call for, so the five tiles spell the five-slot
    // answer. Flagged for design rather than silently redesigned.
    tiles: ["А", "Н", "Ч", "Х", "А"],
  },
  {
    id: "capital-zuny",
    form: "sentence_capital",
    prompt: "Өгүүлбэр юугаар эхлэх вэ?",
    image: { src: `${IMAGES}/summer.png`, alt: "Зуны малгай, бөмбөг" },
    sentenceLines: ["Нар халуунаар ээж байна.", "____ өдөр сайхан."],
    choices: ["зуны", "Зуны", "ЗУНЫ"],
  },
] as const satisfies readonly DiagnosticTask[];

export const diagnosticTaskCount = diagnosticTasks.length;

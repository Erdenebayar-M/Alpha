/**
 * task_type -> live renderer key. Web's counterpart of
 * mobile/src/features/exercise/taskTypeMap.ts, covering the same 43
 * `TT_1_1`..`TT_8_4` codes (verified against shared/src/validators/task.ts's
 * TASK_TYPE_OPTION_SHAPE, current as of the 20260609195422_drop_old_task_types
 * migration).
 *
 * Ten task_types reuse the existing Figma-fidelity renderers from
 * components/register/exercise/renderers/* — those files keep their drawn
 * layouts, and this map only feeds them adapted real data (see
 * lib/api/adapt.ts). Every other task_type goes through the renderers under
 * components/register/exercise/live/, grouped by shared interaction rather
 * than by task_type — one writing card serves the task-type families that
 * differ only in what context they show above the field, per the root
 * CLAUDE.md de-duplication rule.
 *
 * The whole S6 family (TT_6_1..TT_6_4) is drawn in Figma: they are, one for
 * one, "Өгүүлбэр юугаар эхлэх вэ?" (node 1255:17752), "Өгүүлбэр дуусахад ямар
 * тэмдэг тавих вэ?" (1254:16502), "Өгүүлбэрийн төгсгөлийг олж тэмдэглэ"
 * (1255:16722) and "Таслалыг хаана, хаана тавих вэ?" (1255:16988). Each
 * adapter degrades to the generic shell when a particular row doesn't fit the
 * drawn card — see lib/api/adapt.ts for what "fit" means per type.
 */
export type LiveRendererKey =
  | "audio_choice" // reused: choiceOptions + audio_url
  | "image_match" // reused: choiceOptions + image_url
  | "fill_letter_tiles" // reused: fillOptions, picture variant
  | "match_pairs" // reused: matchPairsOptions with images
  | "assemble_word" // reused: assembleWordOptions, picture variant
  | "punctuation_choice" // reused: choiceOptions, marks to end a sentence
  | "sentence_capital" // reused: choiceOptions, how a sentence opens
  | "punctuation_place" // reused: correctionOptions, one missing full stop
  | "comma_place" // reused: correctionOptions, one missing comma
  | "choice_generic"
  | "fill_generic"
  | "sentence_fill"
  | "correction"
  | "dictation"
  | "mini_text"
  | "self_check"
  | "match_pairs_text"
  | "assemble_word_audio"
  | "copy_text"
  | "visual_memory"
  | "tap_find_error";

export const taskTypeMap: Record<string, LiveRendererKey> = {
  // choiceOptions (16) — four reuse the Figma renderers: two because their
  // asset field is unambiguous, two because the card *is* that exercise
  // (TT_6_1, TT_6_2). The rest share one generic choice shell.
  TT_1_1: "choice_generic", // Авиа сонсоод үсэг сонгох
  TT_1_2: "image_match", // Зурагт юу зурсныг үсгээр таних
  TT_1_5: "choice_generic", // Төсөөтэй үсгүүдийг ялгах
  TT_2_3: "choice_generic", // Зөв бичлэгийг сонгох
  TT_3_1: "choice_generic", // Урт/богино эгшиг сонсоод сонгох
  TT_3_4: "choice_generic", // Эгшгийн зохицол шалгах
  TT_4_1: "choice_generic", // Төстэй сонсогддог гийгүүлэгчүүдийг ялгах
  TT_4_2: "audio_choice", // Үгийн төгсгөлийн гийгүүлэгч сонгох
  TT_5_1: "choice_generic", // Зөв нөхцлийг сонгох
  TT_5_4: "choice_generic", // Үйл үгийн цаг сонгох
  TT_5_6: "choice_generic", // Олон тоо/харьяалал сонгох
  TT_5_7: "choice_generic", // Залгаврын зөв бичлэг сонгох
  TT_6_1: "sentence_capital", // Өгүүлбэрийн эхэнд орох зөв хариулт сонгох
  TT_6_2: "punctuation_choice", // Өгүүлбэрийн төгсгөлийн тэмдэг сонгох
  TT_7_7: "choice_generic", // Сонсоод зөв хувилбар сонгох
  TT_8_3: "choice_generic", // Зөв/буруу өгүүлбэр сонгох

  // fillOptions (6) — TT_2_1 is the picture variant the existing renderer
  // was built for; the rest (including TT_2_4's audio variant) share the
  // generic single-blank shell.
  TT_2_1: "fill_letter_tiles", // Зураг харж дутуу үсэг нөхөх
  TT_2_4: "fill_generic", // Сонсоод үгт дутуу байгаа үсгийг нөхөх
  TT_3_2: "fill_generic", // Балархай эгшиг нөхөх
  TT_4_3: "fill_generic", // Дараалж орох гийгүүлэгчийг нөхөх
  TT_4_4: "fill_generic", // Орхигдсон гийгүүлэгч нөхөх
  TT_5_5: "fill_generic", // Тохирох залгаврыг нөхөх

  // sentenceFillOptions (2)
  TT_5_2: "sentence_fill", // Чиглэлийн нөхцөл нөхөх
  TT_7_5: "sentence_fill", // Нөхөж бичих цээж бичиг

  // correctionOptions (7) — the five that are genuinely "rewrite this"
  // share the writing card; TT_6_3/TT_6_4 are the two placement cards, whose
  // adapters rebuild the corrected sentence from where the mark was dropped.
  TT_2_5: "correction", // Нийлмэл үг зөв бичих
  TT_2_6: "correction", // Үгийн хэлбэр/бүтэц засах
  TT_3_5: "correction", // Илүү эгшиг олж засах
  TT_4_5: "correction", // Илүү гийгүүлэгч олж засах
  TT_6_3: "punctuation_place", // Өгүүлбэрийн төгсгөлийг олох
  TT_6_4: "comma_place", // Таслал нэмэх
  TT_8_2: "correction", // Алдаа олж засах (засах)

  // dictationOptions (2) / miniTextOptions (1) — same shell, multiline toggle
  TT_7_3: "dictation", // Сонсож бичих — үг
  TT_7_4: "dictation", // Сонсож бичих — өгүүлбэр
  TT_7_6: "mini_text", // Сонсож бичих — мини эх

  // selfCheckOptions (1)
  TT_8_4: "self_check", // Өөрийн хариуг дахин шалгах

  // matchPairsOptions (3) — TT_1_3/TT_3_3 are picture<->word per the v3
  // catalog description, TT_5_3 is word<->suffix (text only).
  TT_1_3: "match_pairs", // Үсгүүдийг тохирох зургуудтай холбох
  TT_3_3: "match_pairs", // Зургуудийг тохирох үгтэй нь холбох
  TT_5_3: "match_pairs_text", // Үгийн зөв залгаврыг холбох

  // assembleWordOptions (2) — TT_1_4 picture variant reuses the existing
  // renderer, TT_2_2 hears the word instead of seeing it.
  TT_1_4: "assemble_word", // Үг угсрах
  TT_2_2: "assemble_word_audio", // Үсэг угсарч үг болгох

  // tapFindErrorOptions (1)
  TT_8_1: "tap_find_error", // Алдаа олж засах (олох)

  // copyOptions (1) / visualMemoryOptions (1)
  TT_7_1: "copy_text", // Хуулж бичих
  TT_7_2: "visual_memory", // Харж тогтоон бичих
};

export function resolveLiveRenderer(taskType: string): LiveRendererKey | null {
  return taskTypeMap[taskType] ?? null;
}

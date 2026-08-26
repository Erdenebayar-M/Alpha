import { Image } from 'react-native';

import type { DiagnosticResult } from '@/src/api/diagnostic';
import type { ProgressState, SkillsState } from '@/src/api/dashboard';
import type { Plan } from '@/src/api/plan';
import type { Task } from '@/src/features/exercise/types';

// Bundled demo picture for the image-match task. In production image_url is a
// remote URL from the backend; resolveAssetSource gives us a URI string here so
// the mock keeps Task.image_url typed as a plain string.
const toothbrushUri = Image.resolveAssetSource(require('@/assets/images/toothbrush.png')).uri;
const butterflyUri = Image.resolveAssetSource(require('@/assets/images/butterfly.png')).uri;
const paintbrushUri = Image.resolveAssetSource(require('@/assets/images/paintbrush.png')).uri;
const summerUri = Image.resolveAssetSource(require('@/assets/images/summer.png')).uri;
const childWalkingUri = Image.resolveAssetSource(require('@/assets/images/child-walking.png')).uri;
const schoolUri = Image.resolveAssetSource(require('@/assets/images/school.png')).uri;

// Figma-accurate pictures for the assemble-the-word mock tasks. In production each word
// carries its own image_url from the backend; these just exercise the renderer's image
// card locally.
const savUri = Image.resolveAssetSource(require('@/assets/images/sav.png')).uri;
const talhUri = Image.resolveAssetSource(require('@/assets/images/talh.png')).uri;
const chanahUri = Image.resolveAssetSource(require('@/assets/images/chanah.png')).uri;
const hutgahUri = Image.resolveAssetSource(require('@/assets/images/hutgah.png')).uri;
const chatsarganaUri = Image.resolveAssetSource(require('@/assets/images/chatsargana.png')).uri;
// The syllable drag-and-drop assemble-word screen's picture (Figma "Үеэр үг бүтээх").
const hoshigUri = Image.resolveAssetSource(require('@/assets/images/hoshig.png')).uri;

export interface MockParent {
  id: string;
  email: string;
  name: string;
}

export interface MockLearner {
  id: string;
  name: string;
  grade: number;
  variant: 'A' | 'B';
  daily_minutes: number;
}

export interface MockLesson {
  id: string;
  tasks: Task[];
}

export const MOCK_TOKEN = 'mock-jwt-token';

export const mockParent: MockParent = {
  id: 'mock-parent-1',
  email: 'parent@example.com',
  name: 'Bat-Erdene',
};

export const mockLearner: MockLearner = {
  id: 'mock-learner-1',
  name: 'Сарнай',
  grade: 1,
  variant: 'A',
  daily_minutes: 10,
};

export const mockLearners: MockLearner[] = [mockLearner];

export const mockTasks: Task[] = [
  {
    id: 'mock-task-1',
    task_id: 'TASK-MOCK-001',
    stage: 'STAGE1',
    task_type: 'TT_1_5',
    interaction_form: null,
    prompt_text: 'Сонсоод зөв үгийг сонгоорой',
    correct_answer: 'Савар',
    options: {
      choices: [
        { text: 'Шавар', is_correct: false },
        { text: 'Савар', is_correct: true },
        { text: 'Жавар', is_correct: false },
      ],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'VOWEL_HARMONY',
    secondary_skill: null,
    level_target: 'G1:M1',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M1'],
    difficulty: 1,
    estimated_time_seconds: 20,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гайхалтай!',
    feedback_wrong: 'Дахин оролдоцгооё.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-2',
    task_id: 'TASK-MOCK-002',
    stage: 'STAGE1',
    task_type: 'TT_2_3',
    interaction_form: 'fill_blank',
    // "_" marks the blank (AGENTS §5): the child fills the missing "э" in эрвээхэй.
    prompt_text: 'Эрвээх_й',
    correct_answer: 'Эрвээхэй',
    options: {
      audio_trigger: true,
      choices: [
        { text: 'И', is_correct: false },
        { text: 'Э', is_correct: true },
      ],
    },
    audio_url: null,
    // example.com never resolves, so playback (and the audio-gated pose changes) could
    // never fire; use a real test file locally so didJustFinish drives pose 3.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    image_url: butterflyUri,
    primary_skill: 'VOWEL_HARMONY',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: ['VOWEL_CONFUSION'],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 2,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Зөв байна!',
    feedback_wrong: 'Дахиад анхаараарай.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-3',
    task_id: 'TASK-MOCK-003',
    stage: 'STAGE1',
    task_type: 'TT_4_2',
    interaction_form: 'audio_choice',
    prompt_text: 'Сайн уу? Болдоо',
    correct_answer: 'Хурга',
    options: {
      audio_trigger: true,
      choices: [
        { text: 'Хурга', is_correct: true },
        { text: 'Хуурга', is_correct: false },
        { text: 'Хураг', is_correct: false },
        { text: 'Хург', is_correct: false },
      ],
    },
    audio_url: null,
    // example.com is a placeholder that never resolves, so playback (and the
    // playing-gated animation) could never trigger; use a real test file locally.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    image_url: 'https://example.com/images/mock-gurvel.png',
    primary_skill: 'CONSONANT_CLUSTER',
    secondary_skill: 'VOWEL_HARMONY',
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Тийм ээ!',
    feedback_wrong: 'Дахин сонсоод оролдоорой.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-4',
    task_id: 'TASK-MOCK-004',
    stage: 'STAGE1',
    task_type: 'TT_1_2',
    interaction_form: 'image_match',
    prompt_text: 'Зөв бичсэн үгийг олоорой',
    correct_answer: 'Сойз',
    options: {
      choices: [
        { text: 'Сойз', is_correct: true },
        { text: 'Сойс', is_correct: false },
        { text: 'Шойз', is_correct: false },
        { text: 'Сооз', is_correct: false },
      ],
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: toothbrushUri,
    primary_skill: 'CONSONANT_SPELLING',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 1,
    estimated_time_seconds: 20,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Гоё байна!',
    feedback_wrong: 'Дахиад нэг харцгаая.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-5',
    task_id: 'TASK-MOCK-005',
    stage: 'STAGE1',
    task_type: 'TT_5_1',
    interaction_form: 'text_input',
    prompt_text: 'Сонссон үгээ бичээрэй',
    correct_answer: 'Хурга',
    options: {
      audio_trigger: true,
    },
    audio_url: null,
    // example.com is a placeholder that never resolves, so playback (and the
    // playing-gated animation) could never trigger; use a real test file locally.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    image_url: null,
    primary_skill: 'CONSONANT_CLUSTER',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Гоё бичлээ!',
    feedback_wrong: 'Дахин сонсоод оролдоорой.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-6',
    task_id: 'TASK-MOCK-006',
    stage: 'STAGE1',
    task_type: 'TT_1_1',
    interaction_form: 'letter_choice',
    prompt_text: 'Эхний үсэг аль нь вэ?',
    correct_answer: 'Б',
    options: {
      audio_trigger: true,
      choices: [
        { text: 'Б', is_correct: true },
        { text: 'Р', is_correct: false },
        { text: 'В', is_correct: false },
      ],
    },
    audio_url: null,
    // example.com never resolves, so playback (and the talking animation) could never
    // fire; use a real test file locally so the speaker button drives the sprout.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    image_url: paintbrushUri,
    primary_skill: 'LETTER_RECOGNITION',
    secondary_skill: null,
    level_target: 'G1:M1',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M1'],
    difficulty: 1,
    estimated_time_seconds: 20,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Зөв байна!',
    feedback_wrong: 'Дахиад оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-7',
    task_id: 'TASK-MOCK-007',
    stage: 'STAGE1',
    task_type: 'TT_3_3',
    interaction_form: 'match_pairs',
    prompt_text: 'Тохирох үгийг холбоорой!',
    correct_answer: 'Сойз, Эрвээхэй, Бийр',
    options: {
      audio_trigger: true,
      image_side: 'left',
      // 'any' → every link locks; correctness is graded when the child submits.
      match_lock_mode: 'any',
      pairs: [
        { left: 'toothbrush', right: 'Сойз', left_image_url: toothbrushUri },
        { left: 'butterfly', right: 'Эрвээхэй', left_image_url: butterflyUri },
        { left: 'paintbrush', right: 'Бийр', left_image_url: paintbrushUri },
      ],
    },
    audio_url: null,
    // example.com never resolves, so playback (and the pose changes) could never fire;
    // use a real test file locally so the speaker button drives the sprout.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    image_url: null,
    primary_skill: 'WORD_RECOGNITION',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Бүгдийг зөв холболоо!',
    feedback_wrong: 'Заримыг нь зөв холбоогүй байна. Дахин үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-8',
    task_id: 'TASK-MOCK-008',
    stage: 'STAGE1',
    task_type: 'TT_7_1',
    interaction_form: 'sentence_capital',
    // "_" marks the blank (AGENTS §5): the sentence's first word is missing. The child
    // picks the correctly-cased form — a sentence begins with a capital, so "Зуны". The
    // bubble question ("Өгүүлбэр юугаар эхлэх вэ?") is a static label in the renderer,
    // like FillBlank's — prompt_text carries the fill-in sentence itself.
    prompt_text: '_ өдөр сайхан.',
    correct_answer: 'Зуны',
    options: {
      audio_trigger: true,
      choices: [
        { text: 'зуны', is_correct: false },
        { text: 'Зуны', is_correct: true },
        { text: 'ЗУНЫ', is_correct: false },
      ],
    },
    audio_url: null,
    // example.com never resolves, so playback (and the talking animation) could never
    // fire; use a real test file locally so the speaker button drives the buddy.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: summerUri,
    primary_skill: 'CAPITALIZATION',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: ['SENTENCE_CAPITAL'],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Зөв! Өгүүлбэр том үсгээр эхэлдэг.',
    feedback_wrong: 'Өгүүлбэр том үсгээр эхэлдэг шүү. Дахин үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-9',
    task_id: 'TASK-MOCK-009',
    stage: 'STAGE1',
    task_type: 'TT_8_1',
    interaction_form: 'punctuation_choice',
    // "_" marks the blank (AGENTS §5) — here the sentence's END mark is missing. The child
    // picks the correct punctuation. "Хүүхэд хаашаа явж байна_" is a question, so "?" is
    // correct. The bubble question ("Зөв тэмдэг аль нь вэ? Сонгоорой") is a static label
    // in the renderer, like FillBlank's — prompt_text carries the sentence itself.
    prompt_text: 'Хүүхэд хаашаа явж байна_',
    correct_answer: '?',
    options: {
      audio_trigger: true,
      choices: [
        { text: '.', is_correct: false },
        { text: '?', is_correct: true },
        { text: '!', is_correct: false },
      ],
    },
    audio_url: null,
    // example.com never resolves, so playback (and the talking animation) could never
    // fire; use a real test file locally so the speaker button drives the buddy.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: childWalkingUri,
    primary_skill: 'PUNCTUATION',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: ['SENTENCE_PUNCTUATION'],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Зөв! Асуултын төгсгөлд асуултын тэмдэг тавина.',
    feedback_wrong: 'Энэ өгүүлбэр асууж байна. Асуултын тэмдэг тавь шүү.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-10',
    task_id: 'TASK-MOCK-010',
    stage: 'STAGE1',
    task_type: 'TT_8_2',
    interaction_form: 'punctuation_place',
    // No "_" blank here — the child drags the end mark into the gap AFTER the word that
    // ends each sentence. options.punctuation carries the tokens + the correct gaps.
    // "Би ном уншлаа[.] Дараа нь зураг зурлаа[.]" → marks after tokens 2 and 6.
    prompt_text: 'Би ном уншлаа Дараа нь зураг зурлаа',
    correct_answer: 'Би ном уншлаа. Дараа нь зураг зурлаа.',
    options: {
      audio_trigger: true,
      punctuation: {
        mark: '.',
        tokens: ['Би', 'ном', 'уншлаа', 'Дараа', 'нь', 'зураг', 'зурлаа'],
        answer_gaps: [2, 6],
      },
    },
    audio_url: null,
    // example.com never resolves, so playback (and the talking animation) could never
    // fire; use a real test file locally so the speaker button drives the buddy.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'PUNCTUATION',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: ['SENTENCE_PUNCTUATION'],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Зөв! Өгүүлбэр бүрийн төгсгөлд цэг тавина.',
    feedback_wrong: 'Өгүүлбэр бүрийн төгсгөлд цэг тавих ёстой шүү. Дахин үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-11',
    task_id: 'TASK-MOCK-011',
    stage: 'STAGE1',
    task_type: 'TT_8_3',
    interaction_form: 'comma_place',
    // Comma between words: the child drags a comma into the dashed gaps between the listed
    // items. gap_positions marks where a ring shows; answer_gaps are the correct ones.
    // "Ээж, аав, ах, бид дөрөв явлаа." → commas after tokens 0, 1 and 2.
    prompt_text: 'Ээж аав ах бид дөрөв явлаа.',
    correct_answer: 'Ээж, аав, ах, бид дөрөв явлаа.',
    options: {
      audio_trigger: true,
      punctuation: {
        mark: ',',
        tokens: ['Ээж', 'аав', 'ах', 'бид', 'дөрөв', 'явлаа.'],
        gap_positions: [0, 1, 2],
        answer_gaps: [0, 1, 2],
      },
    },
    audio_url: null,
    // example.com never resolves, so playback (and the talking animation) could never fire;
    // use a real test file locally so the speaker button drives the buddy.
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'PUNCTUATION',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: ['SENTENCE_PUNCTUATION'],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Зөв! Зэрэгцсэн үгсийн хооронд таслал тавина.',
    feedback_wrong: 'Зэрэгцсэн үгсийн хооронд таслал тавих ёстой шүү. Дахин үзээрэй.',
    is_diagnostic: false,
  },
  // --- Assemble-the-word tasks (TT_1_4, interaction_form `assemble_word`). One per
  // Figma word; they differ only in length + how many distractor tiles the pool holds.
  {
    id: 'mock-task-12',
    task_id: 'TASK-MOCK-012',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'assemble_word',
    prompt_text: 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.',
    correct_answer: 'сав',
    // 3 letters, no distractor — the simplest case.
    options: {
      tiles: ['В', 'С', 'А'],
      correct_order: ['С', 'А', 'В'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: savUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-13',
    task_id: 'TASK-MOCK-013',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'assemble_word',
    prompt_text: 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.',
    correct_answer: 'талх',
    // 4 letters + one distractor (Д).
    options: {
      tiles: ['А', 'Т', 'Л', 'Х', 'Д'],
      correct_order: ['Т', 'А', 'Л', 'Х'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: talhUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-14',
    task_id: 'TASK-MOCK-014',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'assemble_word',
    prompt_text: 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.',
    correct_answer: 'чанах',
    // 5 letters with a repeated А + one distractor (Ш).
    options: {
      tiles: ['А', 'Ш', 'А', 'Н', 'Ч', 'Х'],
      correct_order: ['Ч', 'А', 'Н', 'А', 'Х'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: chanahUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-15',
    task_id: 'TASK-MOCK-015',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'assemble_word',
    prompt_text: 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.',
    correct_answer: 'хутгах',
    // 6 letters with a repeated Х + one distractor (Ө).
    options: {
      tiles: ['У', 'Х', 'Х', 'Ө', 'Г', 'Т', 'А'],
      correct_order: ['Х', 'У', 'Т', 'Г', 'А', 'Х'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: hutgahUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-16',
    task_id: 'TASK-MOCK-016',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'assemble_word',
    prompt_text: 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.',
    correct_answer: 'чацаргана',
    // 9 letters (four А's) + two distractors (Ш, З) — the wrap/edge case.
    options: {
      tiles: ['Г', 'А', 'Ш', 'Ч', 'А', 'Р', 'Н', 'А', 'Ц', 'А', 'З'],
      correct_order: ['Ч', 'А', 'Ц', 'А', 'Р', 'Г', 'А', 'Н', 'А'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: chatsarganaUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 40,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-17',
    task_id: 'TASK-MOCK-017',
    stage: 'STAGE2',
    task_type: 'TT_2_1',
    interaction_form: null,
    prompt_text: 'Үгийг нөхөөрэй',
    correct_answer: 'Сургууль',
    // Three missing letters ("уу" + the final "ь"), so the bank holds exactly у/у/ь
    // shuffled — fillOptions carries no distractors.
    options: {
      display_text: 'Сург__л_',
      blank_position: 4,
      blank_answer: 'ууь',
      context_word: 'Сургууль',
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: schoolUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 35,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв нөхлөө.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-18',
    task_id: 'TASK-MOCK-026',
    stage: 'STAGE2',
    task_type: 'TT_2_4',
    interaction_form: null,
    prompt_text: 'Үгийг сонсоод дутуу үсгийг нөхөөрэй',
    correct_answer: 'Сургууль',
    // Same word as mock-task-17, but heard rather than shown as a picture: three
    // missing letters ("уу" + the final "ь") plus one distractor tile ("й"), matching
    // the Figma bank of у/ь/й/у for the 3-blank word.
    options: {
      display_text: 'Сург__л_',
      blank_position: 4,
      blank_answer: 'ууь',
      distractors: ['й'],
      context_word: 'Сургууль',
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 35,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв нөхлөө.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-19',
    task_id: 'TASK-MOCK-027',
    stage: 'STAGE1',
    task_type: 'TT_3_1',
    interaction_form: null,
    prompt_text: 'Сонсоод зөв бичигдсэн үгийг сонгоорой',
    correct_answer: 'Даалуу',
    // Long/short-vowel distractors: "Далуу" (short а + long уу) and "Даалу" (long аа
    // + short у) against the correct "Даалуу" (long аа + long уу).
    options: {
      choices: [
        { text: 'Даалуу', is_correct: true },
        { text: 'Далуу', is_correct: false },
        { text: 'Даалу', is_correct: false },
      ],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'VOWEL_LENGTH',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 1,
    estimated_time_seconds: 20,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гайхалтай!',
    feedback_wrong: 'Дахин оролдоцгооё.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-20',
    task_id: 'TASK-MOCK-028',
    stage: 'STAGE2',
    task_type: 'TT_2_2',
    interaction_form: null,
    prompt_text: 'Авиаг сонсоод үсгийг зөв дараалалд тавиарай',
    correct_answer: 'сав',
    // Audio assemble-the-word (audio_assemble_word) — the same "сав" word/tiles as
    // mock-task-12 (assemble_word, picture variant), but heard rather than shown as a
    // picture: no image, no prompt bubble, just the character + volume/speed control
    // and the dashed slots + floating tile bank. Tile order matches the Figma frame
    // exactly (useAssembleWord doesn't shuffle).
    options: {
      tiles: ['В', 'С', 'А'],
      correct_order: ['С', 'А', 'В'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 1,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё! Үгийг зөв бүтээлээ.',
    feedback_wrong: 'Үсгүүд арай эндүүрчихлээ. Дахин оролдоод үзээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-21',
    task_id: 'TASK-MOCK-029',
    stage: 'STAGE1',
    task_type: 'TT_1_4',
    interaction_form: 'syllable_assemble_word',
    prompt_text: 'Үеэр үг бүтээгээрэй',
    correct_answer: 'Хөшиг',
    // Syllable drag-and-drop assemble-word (Figma "Үеэр үг бүтээх"): the child drags
    // "Хө"/"шиг" from the tray into the two dashed slots — "шөг" is a distractor tile
    // never used by correct_order, exercising the same distractor handling the
    // letter-based assemble screens already have.
    options: {
      tiles: ['Хө', 'шөг', 'шиг'],
      correct_order: ['Хө', 'шиг'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    image_url: hoshigUri,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M1',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M1'],
    difficulty: 1,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Сайн байна! Үгээ зөв бүтээлээ.',
    feedback_wrong: 'Үений дараалал буруу байна. Дахин оролдоорой.',
    is_diagnostic: false,
  },
];

// --- Renderer-coverage fixtures: one Task per interaction_form that has no example
// above (fill_letter, sentence_fill, correction, copy_text, visual_memory, dictation,
// mini_text, tap_find_error, self_check). Appended to mockLesson.tasks below so tapping
// through "Start today's lesson" exercises every registry key at least once.
export const mockExtraTasks: Task[] = [
  {
    id: 'mock-task-extra-1',
    task_id: 'TASK-MOCK-017',
    stage: 'STAGE1',
    task_type: 'TT_2_1',
    interaction_form: 'fill_letter',
    prompt_text: 'Дутуу үсгийг олж бичээрэй.',
    correct_answer: 'э',
    options: {
      display_text: 'Дэвт_р',
      blank_answer: 'э',
      context_word: 'Дэвтэр',
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 1,
    estimated_time_seconds: 20,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Зөв бичлээ!',
    feedback_wrong: 'Дахин анхаараад бичээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-2',
    task_id: 'TASK-MOCK-018',
    stage: 'STAGE1',
    task_type: 'TT_5_2',
    interaction_form: 'sentence_fill',
    prompt_text: 'Дутуу үгийг олж бичээрэй.',
    correct_answer: 'ном',
    options: {
      sentence_template: 'Би өнөөдөр _ уншлаа.',
      blank_answer: 'ном',
      hint: 'Юу уншсан бэ?',
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Гайхалтай!',
    feedback_wrong: 'Өгүүлбэрийг дахин уншаад бичээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-3',
    task_id: 'TASK-MOCK-019',
    stage: 'STAGE1',
    task_type: 'TT_2_5',
    interaction_form: 'correction',
    prompt_text: 'Алдаатай бичсэн үгийг засаарай.',
    correct_answer: 'дэвтэр',
    options: {
      incorrect_text: 'дэфтэр',
      correct_text: 'дэвтэр',
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: ['CONSONANT_SPELLING'],
    grade_band: ['G1'],
    grade_levels: ['G1:M2'],
    difficulty: 2,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Зөв заслаа!',
    feedback_wrong: 'Үгийг дахин нягтлаад засаарай.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-4',
    task_id: 'TASK-MOCK-020',
    stage: 'STAGE1',
    task_type: 'TT_7_1',
    interaction_form: 'copy_text',
    prompt_text: 'Доорх өгүүлбэрийг хуулж бичээрэй.',
    correct_answer: 'Нар шарж байна.',
    options: {
      text_to_copy: 'Нар шарж байна.',
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'HANDWRITING',
    secondary_skill: null,
    level_target: 'G1:M1',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M1'],
    difficulty: 1,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'WARM_UP',
    feedback_text: null,
    feedback_correct: 'Гоё хууллаа!',
    feedback_wrong: 'Үсэг бүрийг анхааралтай хараад хуулаарай.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-5',
    task_id: 'TASK-MOCK-021',
    stage: 'STAGE1',
    task_type: 'TT_7_2',
    interaction_form: 'visual_memory',
    prompt_text: 'Доорх өгүүлбэрийг цээжлээд дараа нь бичээрэй.',
    correct_answer: 'Улаан гэрэлтэй машин',
    options: {
      text_to_memorize: 'Улаан гэрэлтэй машин',
      display_seconds: 5,
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Санаж бичлээ!',
    feedback_wrong: 'Дахин цээжлээд оролдоорой.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-6',
    task_id: 'TASK-MOCK-022',
    stage: 'STAGE1',
    task_type: 'TT_7_3',
    interaction_form: 'dictation',
    prompt_text: 'Сонсоод бичээрэй.',
    correct_answer: 'Гэр бүл',
    options: {
      audio_trigger: true,
      audio_text: 'Гэр бүл',
      expected_answers: ['Гэр бүл'],
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Зөв сонсож бичлээ!',
    feedback_wrong: 'Дахин сонсоод бичээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-7',
    task_id: 'TASK-MOCK-023',
    stage: 'STAGE1',
    task_type: 'TT_7_6',
    interaction_form: 'mini_text',
    prompt_text: 'Сонссон өгүүлбэрүүдээ бичээрэй.',
    correct_answer: 'Өнөөдөр сайхан өдөр байна. Бид цэцэрлэгт хүрээлэнд явлаа.',
    options: {
      audio_trigger: true,
      audio_text: 'Өнөөдөр сайхан өдөр байна. Бид цэцэрлэгт хүрээлэнд явлаа.',
      expected_answers: ['Өнөөдөр сайхан өдөр байна.', 'Бид цэцэрлэгт хүрээлэнд явлаа.'],
      sentence_count: 2,
    },
    audio_url: null,
    prompt_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 3,
    estimated_time_seconds: 40,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Бүгдийг зөв бичлээ!',
    feedback_wrong: 'Дахин сонсоод бичээрэй.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-8',
    task_id: 'TASK-MOCK-024',
    stage: 'STAGE1',
    task_type: 'TT_8_1',
    interaction_form: 'tap_find_error',
    prompt_text: 'Алдаатай бичсэн үгэн дээр дараарай.',
    correct_answer: 'алим',
    options: {
      sentence: 'Ээж зах дээрээс алимж авчирлаа.',
      error_word_index: 3,
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'SPELLING',
    secondary_skill: null,
    level_target: 'G1:M3',
    error_targets: [],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 25,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Зөв олллоо!',
    feedback_wrong: 'Дахин анхааралтай хараарай.',
    is_diagnostic: false,
  },
  {
    id: 'mock-task-extra-9',
    task_id: 'TASK-MOCK-025',
    stage: 'STAGE1',
    task_type: 'TT_8_4',
    interaction_form: 'self_check',
    prompt_text: 'Загвар хариулттай харьцуулаад засаж бичээрэй.',
    correct_answer: 'Би талх идсэн.',
    options: {
      original_attempt: 'би талх идсэн',
      model_answer: 'Би талх идсэн.',
    },
    audio_url: null,
    prompt_audio_url: null,
    image_url: null,
    primary_skill: 'CAPITALIZATION',
    secondary_skill: 'PUNCTUATION',
    level_target: 'G1:M3',
    error_targets: ['SENTENCE_CAPITAL'],
    grade_band: ['G1'],
    grade_levels: ['G1:M3'],
    difficulty: 2,
    estimated_time_seconds: 30,
    lesson_slot_fit: 'CORE',
    feedback_text: null,
    feedback_correct: 'Сайн заслаа!',
    feedback_wrong: 'Загвар хариулттай дахин харьцуулаарай.',
    is_diagnostic: false,
  },
];

export const mockLesson: MockLesson = {
  id: 'mock-lesson-1',
  // The newest screen leads so it's seen first: mock-task-21, the syllable drag-and-drop
  // assemble-word screen (Figma "Үеэр үг бүтээх", interaction_form
  // syllable_assemble_word — drag "Хө"/"шиг" chips from a tray into dashed slots, check
  // via the checkbox, watch the slots merge into "Хөшиг"), then mock-task-20, the audio
  // assemble-the-word task for "сав" (TT_2_2, audio_assemble_word — the audio sibling of
  // assemble_word, no picture/no prompt bubble, dashed slots + a fixed-order tile bank),
  // then mock-task-19, the audio long/short-vowel-choice task (TT_3_1,
  // audio_word_choice), then mock-task-1, the audio similar-word-choice task (TT_1_5,
  // same renderer), then mock-task-18, the audio fill-the-letters task with a
  // partially-revealed word (same renderer, plus a distractor tile), then mock-task-17,
  // its picture sibling (fill_letter_tiles). Then: audio_choice, image_match, text_input,
  // fill_blank; then letter_choice, match_pairs, sentence_capital, punctuation_choice,
  // punctuation_place, comma_place; then the five assemble-the-word screens (сав →
  // чацаргана, short → long); dictation and mini_text close it out unchanged.
  // fill_letter, sentence_fill, correction, copy_text, visual_memory, tap_find_error, and
  // self_check are pulled from this walkthrough while those pages get rebuilt from
  // Figma — the renderers/registry/taskTypeMap entries are untouched, so real backend
  // tasks of those types still render normally.
  tasks: [
    mockTasks[20],
    mockTasks[19],
    mockTasks[18],
    mockTasks[0],
    mockTasks[17],
    mockTasks[16],
    mockTasks[2], mockTasks[3], mockTasks[4], mockTasks[1],
    mockTasks[5], mockTasks[6], mockTasks[7], mockTasks[8], mockTasks[9], mockTasks[10],
    mockTasks[11], mockTasks[12], mockTasks[13], mockTasks[14], mockTasks[15],
    mockExtraTasks[5], mockExtraTasks[6],
  ],
};

// --- Static walkthrough fixtures: diagnostic, dashboard skills/progress, plan ---
// These back the mock /diagnostic, /dashboard, and /plan endpoints (see client.ts)
// so every screen renders with fixed, Figma-accurate data instead of 404ing before
// a real backend exists. Reusing five of the interaction forms above (multiple_choice,
// fill_blank, audio_choice, image_match, letter_choice) so the diagnostic loop exercises
// a mix of renderers.
export const mockDiagnosticTasks: Task[] = [mockTasks[0], mockTasks[1], mockTasks[2], mockTasks[3], mockTasks[5]].map(
  (task, i) => ({
    ...task,
    id: `mock-diag-task-${i + 1}`,
    task_id: `TASK-DIAG-${String(i + 1).padStart(3, '0')}`,
    is_diagnostic: true,
  }),
);

export const mockDiagnosticResult: DiagnosticResult = {
  general_level: 'M2',
  level_confidence: 'MEDIUM',
  bank_coverage: 0.82,
  capped_by_bank: false,
  confidence: 'MEDIUM',
  skill_levels: { S1: 'M2', S2: 'M2', S3: 'M1', S4: 'M2', S5: 'M1', S6: 'M2', S7: 'M3', S8: 'M2' },
  skill_scores: { S1: 0.72, S2: 0.68, S3: 0.51, S4: 0.65, S5: 0.48, S6: 0.7, S7: 0.8, S8: 0.6 },
  skill_confidence: {
    S1: 'MEDIUM', S2: 'MEDIUM', S3: 'LOW', S4: 'MEDIUM',
    S5: 'LOW', S6: 'MEDIUM', S7: 'HIGH', S8: 'MEDIUM',
  },
  top_error_codes: ['VOWEL_CONFUSION', 'SENTENCE_CAPITAL'],
  priority_skills: ['S3', 'S5'],
  recommended_daily_minutes: 10,
};

export const mockSkills: SkillsState = {
  general_level: 'M2',
  s1_score: 0.72, s1_level: 'M2', s1_confidence: 'MEDIUM',
  s2_score: 0.68, s2_level: 'M2', s2_confidence: 'MEDIUM',
  s3_score: 0.51, s3_level: 'M1', s3_confidence: 'LOW',
  s4_score: 0.65, s4_level: 'M2', s4_confidence: 'MEDIUM',
  s5_score: 0.48, s5_level: 'M1', s5_confidence: 'LOW',
  s6_score: 0.7, s6_level: 'M2', s6_confidence: 'MEDIUM',
  s7_score: 0.8, s7_level: 'M3', s7_confidence: 'HIGH',
  s8_score: 0.6, s8_level: 'M2', s8_confidence: 'MEDIUM',
  weak_skills: ['S3', 'S5'],
  top_error_codes: ['VOWEL_CONFUSION', 'SENTENCE_CAPITAL'],
  current_streak: 4,
  longest_streak: 9,
  updated_at: new Date().toISOString(),
};

export const mockProgress: ProgressState = {
  current_streak: 4,
  longest_streak: 9,
  recent_lessons: [
    { id: 'mock-lesson-log-3', day_number: 3, accuracy: 0.9, completed_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: 'mock-lesson-log-2', day_number: 2, accuracy: 0.8, completed_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'mock-lesson-log-1', day_number: 1, accuracy: 0.7, completed_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  ],
};

const today = Date.now();
const dayIso = (offset: number) => new Date(today + offset * 86400000).toISOString();
const PLAN_SKILL_CYCLE = ['S3', 'S5', 'S1', 'S2', 'S4', 'S6', 'S7', 'S8'];

export const mockPlan: Plan = {
  id: 'mock-plan-1',
  template: 'BALANCED',
  status: 'ACTIVE',
  priority_skills: ['S3', 'S5'],
  target_errors: ['VOWEL_CONFUSION', 'SENTENCE_CAPITAL'],
  daily_minutes: 10,
  duration_days: 14,
  source: 'DIAGNOSTIC',
  started_at: dayIso(-3),
  ended_at: null,
  lessons: Array.from({ length: 14 }, (_, i) => {
    const dayNumber = i + 1;
    // First 3 days completed, day 4 in progress, the rest still pending.
    const status = dayNumber <= 3 ? 'COMPLETED' : dayNumber === 4 ? 'IN_PROGRESS' : 'PENDING';
    const totalTasks = 6;
    const completedTasks = status === 'COMPLETED' ? totalTasks : status === 'IN_PROGRESS' ? 3 : 0;
    return {
      id: `mock-plan-lesson-${dayNumber}`,
      day_number: dayNumber,
      status,
      scheduled_date: dayIso(dayNumber - 4),
      primary_skill: PLAN_SKILL_CYCLE[i % PLAN_SKILL_CYCLE.length],
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
    };
  }),
  checkpoints: [
    { id: 'mock-plan-checkpoint-1', scheduled_date: dayIso(3), status: 'PASSED' },
    { id: 'mock-plan-checkpoint-2', scheduled_date: dayIso(10), status: 'SCHEDULED' },
  ],
};

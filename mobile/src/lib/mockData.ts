import { Image } from 'react-native';

import type { Task } from '@/src/features/exercise/types';

// Bundled demo picture for the image-match task. In production image_url is a
// remote URL from the backend; resolveAssetSource gives us a URI string here so
// the mock keeps Task.image_url typed as a plain string.
const toothbrushUri = Image.resolveAssetSource(require('@/assets/images/toothbrush.png')).uri;
const butterflyUri = Image.resolveAssetSource(require('@/assets/images/butterfly.png')).uri;
const paintbrushUri = Image.resolveAssetSource(require('@/assets/images/paintbrush.png')).uri;
const summerUri = Image.resolveAssetSource(require('@/assets/images/summer.png')).uri;
const childWalkingUri = Image.resolveAssetSource(require('@/assets/images/child-walking.png')).uri;

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
    interaction_form: 'multiple_choice',
    prompt_text: 'Зөв бичигдсэн үгийг сонгоно уу.',
    correct_answer: 'өвөл',
    options: {
      choices: [
        { text: 'өвөл', is_correct: true },
        { text: 'эвэл', is_correct: false },
        { text: 'өвол', is_correct: false },
      ],
    },
    audio_url: null,
    prompt_audio_url: null,
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
];

export const mockLesson: MockLesson = {
  id: 'mock-lesson-1',
  // punctuation_place (mock-task-10) leads so the new drag-the-mark screen is seen first;
  // punctuation_choice (mock-task-9) follows; sentence_capital (mock-task-8) then the rest.
  tasks: [mockTasks[9], mockTasks[8], mockTasks[7], mockTasks[6], mockTasks[5], mockTasks[2], mockTasks[3], mockTasks[0], mockTasks[4], mockTasks[1]],
};

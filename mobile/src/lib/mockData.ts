import type { Task } from '@/src/features/exercise/types';

export interface MockParent {
  id: string;
  email: string;
  name: string;
}

export interface MockLearner {
  id: string;
  name: string;
  grade_band: string;
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
  grade_band: 'G1',
};

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
    prompt_text: 'д_ү',
    correct_answer: 'дүү',
    options: {
      distractors: ['ду', 'дү'],
    },
    audio_url: null,
    prompt_audio_url: 'https://example.com/audio/mock-duu.mp3',
    image_url: null,
    primary_skill: 'LONG_VOWEL',
    secondary_skill: null,
    level_target: 'G1:M2',
    error_targets: ['MISSING_LONG_VOWEL'],
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
    prompt_text: 'Сонссон үгээ сонгоно уу.',
    correct_answer: 'гүрвэл',
    options: {
      audio_trigger: true,
      choices: [
        { text: 'гүрвэл', is_correct: true },
        { text: 'гурвал', is_correct: false },
      ],
    },
    audio_url: null,
    prompt_audio_url: 'https://example.com/audio/mock-gurvel.mp3',
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
];

export const mockLesson: MockLesson = {
  id: 'mock-lesson-1',
  tasks: mockTasks,
};

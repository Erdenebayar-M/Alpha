"use client";

import { useState, type ReactNode } from "react";
import { WordFillScreen } from "@/components/figma/screens/WordFillScreen";
import { ImageListChoiceScreen } from "@/components/figma/screens/ImageListChoiceScreen";
import { MultiSpellScreen } from "@/components/figma/screens/MultiSpellScreen";
import { ListenPickImageScreen } from "@/components/figma/screens/ListenPickImageScreen";
import { ListenPickTextScreen } from "@/components/figma/screens/ListenPickTextScreen";
import { PickEndingScreen } from "@/components/figma/screens/PickEndingScreen";
import type {
  NavItem,
  BaseAssets,
  ProgressInfo,
} from "@/components/figma/types";

// ── Shared icon assets (local SVGs) ──────────────────────────────────────────
const ASSETS: BaseAssets = {
  backIcon: "/icons/back.svg",
  audioIcon: "/icons/audio.svg",
  checkmark: "/icons/check.svg",
  cross: "/icons/cross.svg",
};

const NAV_ITEMS: NavItem[] = [
  { iconUrl: "/icons/nav-home.svg", label: "Нүүр", active: false },
  { iconUrl: "/icons/nav-lesson.svg", label: "Хичээл", active: true },
  { iconUrl: "/icons/nav-profile.svg", label: "Профайл", active: false },
];

// ── Discriminated task definitions ───────────────────────────────────────────

interface WordFillDef {
  type: "word_fill";
  id: string;
  title: string;
  stage: string;
  wordChars: (string | null)[];
  correctLetter: string;
  letterOptions: string[];
  imageUrl?: string;
  imageAlt?: string;
}

interface ImageChoiceDef {
  type: "image_choice";
  id: string;
  title: string;
  stage: string;
  imageUrl?: string;
  imageAlt?: string;
  choices: Array<{ id: string; label: string; isCorrect: boolean }>;
}

interface MultiSpellDef {
  type: "multi_spell";
  id: string;
  title: string;
  stage: string;
  categoryTitle: string;
  imageUrl?: string;
  targetWord: string;
  letterOptions: string[];
}

interface ListenPickImageDef {
  type: "listen_pick_image";
  id: string;
  title: string;
  stage: string;
  choices: Array<{
    id: string;
    label: string;
    imageUrl?: string;
    isCorrect: boolean;
  }>;
}

interface ListenPickTextDef {
  type: "listen_pick_text";
  id: string;
  title: string;
  stage: string;
  imageUrl?: string;
  imageAlt?: string;
  audioHint?: string;
  choices: Array<{ id: string; label: string; isCorrect: boolean }>;
}

interface PickEndingDef {
  type: "pick_ending";
  id: string;
  title: string;
  stage: string;
  taskLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  wordChars: (string | null)[];
  correctLetter: string;
  letterOptions: string[];
}

type TaskDef =
  | WordFillDef
  | ImageChoiceDef
  | MultiSpellDef
  | ListenPickImageDef
  | ListenPickTextDef
  | PickEndingDef;

// ── Demo task data (replace with API fetch in production) ────────────────────

const DEMO_TASKS: TaskDef[] = [
  // Screen 1 — Listen + pick image (Хүн / Ном / Мод)
  {
    type: "listen_pick_image",
    id: "listen-image-nom",
    title: "Сонсоод сонгох",
    stage: "Боловсруулах",
    choices: [
      { id: "hun", label: "Хүн", isCorrect: false },
      { id: "nom", label: "Ном", isCorrect: true },
      { id: "mod", label: "Мод", isCorrect: false },
    ],
  },

  // Screen 2 — Listen + pick text spelling (Бавгай vs Баавгай)
  {
    type: "listen_pick_text",
    id: "listen-text-baavgai",
    title: "Сонсоод сонгох",
    stage: "Боловсруулах",
    imageAlt: "Баавгай",
    audioHint: "Анхааралтай сонсоорой",
    choices: [
      { id: "bavgai", label: "Бавгай", isCorrect: false },
      { id: "baavgai", label: "Баавгай", isCorrect: true },
    ],
  },

  // Screen 3 — Image + pick correct spelling (Хана / Хан / Хаана)
  {
    type: "image_choice",
    id: "choice-hana",
    title: "Зовийг сонгох",
    stage: "Боловсруулах",
    imageAlt: "Хана",
    choices: [
      { id: "hana", label: "Хана", isCorrect: true },
      { id: "han", label: "Хан", isCorrect: false },
      { id: "haana", label: "Хаана", isCorrect: false },
    ],
  },

  // Screen 4 — Pick word ending letter (САНДА_ → Л)
  {
    type: "pick_ending",
    id: "ending-sandal",
    title: "Зовийг сонгох",
    stage: "Боловсруулах",
    taskLabel: "Төгсгөлийн үгийг сонго",
    imageAlt: "Сандал",
    wordChars: ["С", "А", "Н", "Д", "А", null],
    correctLetter: "Л",
    letterOptions: ["Н", "Р", "Л"],
  },

  // Screen 5 — Fill single letter (Н_М)
  {
    type: "word_fill",
    id: "fill-nom",
    title: "Үсэг нөхөх",
    stage: "Боловсруулах",
    wordChars: ["Н", null, "М"],
    correctLetter: "О",
    letterOptions: ["О", "А", "У"],
  },

  // Screen 5 — Multi-blank spell (ҮЕР)
  {
    type: "multi_spell",
    id: "spell-yer",
    title: "Усгийг зөв бичих",
    stage: "Боловсруулах",
    categoryTitle: "Байгалийн үзэгдэл",
    targetWord: "ҮЕР",
    letterOptions: ["Ү", "Ь", "Е", "Р", "Э"],
  },
];

const TOTAL = DEMO_TASKS.length;

// ── OCP: renderer registry — adding a new type = new entry, no edits ─────────
type Renderer = (
  task: TaskDef,
  progress: ProgressInfo,
  onComplete: () => void,
) => ReactNode;

const RENDERERS: Record<TaskDef["type"], Renderer> = {
  listen_pick_image: (task, progress, onComplete) => {
    const t = task as ListenPickImageDef;
    return (
      <ListenPickImageScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        choices={t.choices}
      />
    );
  },

  listen_pick_text: (task, progress, onComplete) => {
    const t = task as ListenPickTextDef;
    return (
      <ListenPickTextScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        imageUrl={t.imageUrl}
        imageAlt={t.imageAlt}
        audioHint={t.audioHint}
        choices={t.choices}
      />
    );
  },

  pick_ending: (task, progress, onComplete) => {
    const t = task as PickEndingDef;
    return (
      <PickEndingScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        taskLabel={t.taskLabel}
        imageUrl={t.imageUrl}
        imageAlt={t.imageAlt}
        wordChars={t.wordChars}
        correctLetter={t.correctLetter}
        letterOptions={t.letterOptions}
      />
    );
  },

  word_fill: (task, progress, onComplete) => {
    const t = task as WordFillDef;
    return (
      <WordFillScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        wordChars={t.wordChars}
        correctLetter={t.correctLetter}
        letterOptions={t.letterOptions}
        imageUrl={t.imageUrl}
        imageAlt={t.imageAlt}
      />
    );
  },

  image_choice: (task, progress, onComplete) => {
    const t = task as ImageChoiceDef;
    return (
      <ImageListChoiceScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        imageUrl={t.imageUrl}
        imageAlt={t.imageAlt}
        choices={t.choices}
      />
    );
  },

  multi_spell: (task, progress, onComplete) => {
    const t = task as MultiSpellDef;
    return (
      <MultiSpellScreen
        key={t.id}
        title={t.title}
        progress={progress}
        stage={t.stage}
        navItems={NAV_ITEMS}
        assets={ASSETS}
        onComplete={onComplete}
        categoryTitle={t.categoryTitle}
        imageUrl={t.imageUrl}
        targetWord={t.targetWord}
        letterOptions={t.letterOptions}
      />
    );
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const task = DEMO_TASKS[index];
  const progress: ProgressInfo = { current: index + 1, total: TOTAL };

  function handleComplete() {
    if (index < DEMO_TASKS.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F3F6FF",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "64px" }}>🎉</span>
        <p
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: "28px",
            color: "#01618F",
            margin: 0,
          }}
        >
          Маш сайн!
        </p>
        <p
          style={{
            fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
            fontWeight: 600,
            fontSize: "16px",
            color: "#405E7E",
            margin: 0,
          }}
        >
          Хичээлийг амжилттай дуусгалаа.
        </p>
      </div>
    );
  }

  return RENDERERS[task.type](task, progress, handleComplete);
}

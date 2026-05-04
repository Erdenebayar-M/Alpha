'use client';

import { useState } from 'react';
import { MobileShell } from '../MobileShell';
import { TopAppBar } from '../TopAppBar';
import { AudioButton } from '../AudioButton';
import { ChoiceCard } from '../ChoiceCard';
import { ActionButton } from '../ActionButton';
import { BottomNav } from '../BottomNav';
import type { CardStatus, Choice, NavItem, ProgressInfo } from '../types';

interface ChoiceTaskScreenProps {
  title: string;
  progress: ProgressInfo;
  stage: string;
  choices: Choice[];
  navItems: NavItem[];
  assets: {
    backIcon: string;
    audioIcon: string;
    checkmark: string;
    cross: string;
  };
  onComplete?: () => void;
}

export function ChoiceTaskScreen({
  title,
  progress,
  stage,
  choices,
  navItems,
  assets,
  onComplete,
}: ChoiceTaskScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function getCardStatus(choice: Choice): CardStatus {
    if (!submitted) return selectedId === choice.id ? 'selected' : 'idle';
    if (choice.isCorrect) return 'correct';
    if (selectedId === choice.id) return 'wrong';
    return 'idle';
  }

  function handleSubmit() {
    if (selectedId) setSubmitted(true);
  }

  function handleNext() {
    setSelectedId(null);
    setSubmitted(false);
    onComplete?.();
  }

  return (
    <MobileShell>
      {/* ① Header — fixed height, never scrolls */}
      <TopAppBar
        title={title}
        progress={progress}
        stage={stage}
        backIconUrl={assets.backIcon}
      />

      {/* ② Body — flex: 1, scrolls when content overflows */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <AudioButton iconUrl={assets.audioIcon} />

        <div
          style={{
            width: 'min(342px, calc(100% - 32px))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '24px',
            paddingBottom: '16px',
          }}
        >
          {choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              label={choice.label}
              imageUrl={choice.imageUrl}
              status={getCardStatus(choice)}
              badgeCheckUrl={assets.checkmark}
              badgeCrossUrl={assets.cross}
              onClick={() => !submitted && setSelectedId(choice.id)}
            />
          ))}
        </div>
      </div>

      {/* ③ Footer — fixed height, always on screen */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 8px' }}>
          {submitted ? (
            <ActionButton label="Дараагийнх" variant="next" onClick={handleNext} />
          ) : (
            <ActionButton label="Шалгах" onClick={handleSubmit} disabled={!selectedId} />
          )}
        </div>
        <BottomNav items={navItems} />
      </div>
    </MobileShell>
  );
}

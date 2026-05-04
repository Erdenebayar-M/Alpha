'use client';

/**
 * TT1 variant — listen to audio, then pick the matching image card.
 * Covers "Сонсоод сонгох": hear a word, choose the correct picture.
 */

import { useState } from 'react';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ChoiceCard } from '../ChoiceCard';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps, CardStatus } from '../types';

export interface ImageChoice {
  id: string;
  label: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface ListenPickImageScreenProps extends BaseScreenProps {
  title?: string;
  choices: ImageChoice[];
  onAudio?: () => void;
}

export function ListenPickImageScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  title = 'Сонсоод сонгох',
  choices,
  onAudio,
}: ListenPickImageScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedChoice = choices.find((c) => c.id === selectedId);
  const isCorrect = submitted && (selectedChoice?.isCorrect ?? false);

  function getCardStatus(choice: ImageChoice): CardStatus {
    if (!submitted) return selectedId === choice.id ? 'selected' : 'idle';
    if (choice.id === selectedId) return choice.isCorrect ? 'correct' : 'wrong';
    return 'idle';
  }

  function handleAudio() {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1200);
    onAudio?.();
  }

  function handleNext() {
    setSelectedId(null);
    setSubmitted(false);
    onComplete?.();
  }

  return (
    <ScreenShell
      title={title}
      progress={progress}
      stage={stage}
      backIconUrl={assets.backIcon}
      navItems={navItems}
      footer={
        <div style={{ padding: '10px 20px 8px' }}>
          {submitted ? (
            <ActionButton label="Дараагийнх" variant="next" onClick={handleNext} />
          ) : (
            <ActionButton
              label="Шалгах"
              onClick={() => { if (selectedId) setSubmitted(true); }}
              disabled={!selectedId}
            />
          )}
        </div>
      }
    >
      {/* Large audio play button */}
      <AudioButton
        iconUrl={assets.audioIcon}
        isPlaying={isPlaying}
        onClick={handleAudio}
      />

      {/* Vertical list of image+label choice cards */}
      <div
        style={{
          marginTop: '24px',
          width: 'min(342px, calc(100% - 32px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingBottom: '8px',
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

      {submitted && (
        <FeedbackBanner
          isCorrect={isCorrect}
          correctAnswer={isCorrect ? undefined : choices.find((c) => c.isCorrect)?.label}
          checkmarkUrl={assets.checkmark}
          crossUrl={assets.cross}
        />
      )}
    </ScreenShell>
  );
}

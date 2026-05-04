'use client';

/**
 * TT1 variant — large image at top + text-only choice rows.
 * Covers screen 2 ("Зовийг сонгох"): see an image, pick the correct spelling.
 */

import { useState } from 'react';
import Image from 'next/image';
import { ScreenShell } from '../ScreenShell';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import { ChoiceRow } from '../ChoiceRow';
import type { RowStatus } from '../ChoiceRow';
import type { BaseScreenProps } from '../types';

export interface TextChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface ImageListChoiceScreenProps extends BaseScreenProps {
  title?: string;
  imageUrl?: string;
  imageAlt?: string;
  choices: TextChoice[];
}

export function ImageListChoiceScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  title = 'Зовийг сонгох',
  imageUrl,
  imageAlt = '',
  choices,
}: ImageListChoiceScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedChoice = choices.find((c) => c.id === selectedId);
  const isCorrect = submitted && (selectedChoice?.isCorrect ?? false);

  function getRowState(choice: TextChoice): RowStatus {
    if (!submitted) return selectedId === choice.id ? 'selected' : 'idle';
    if (choice.id === selectedId) return choice.isCorrect ? 'correct' : 'wrong';
    return 'idle';
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
      {/* ── Image card ─────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '24px',
          width: 'min(342px, calc(100% - 32px))',
          borderRadius: '28px',
          overflow: 'hidden',
          background: '#E9F1FF',
          aspectRatio: '4/3',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,97,143,0.06)',
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            unoptimized
            style={{ objectFit: 'contain', padding: '20px' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
            }}
          >
            🖼
          </div>
        )}
      </div>

      {/* ── Choice rows ───────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '20px',
          width: 'min(342px, calc(100% - 32px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingBottom: '8px',
        }}
      >
        {choices.map((choice) => (
          <ChoiceRow
            key={choice.id}
            label={choice.label}
            status={getRowState(choice)}
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

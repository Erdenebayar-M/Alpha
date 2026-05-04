'use client';

import { useState } from 'react';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps } from '../types';

/**
 * TT2 — Fill in the blank.
 * ISP: only receives what it needs on top of BaseScreenProps.
 */
export interface FillTaskScreenProps extends BaseScreenProps {
  /**
   * Word characters in order. `null` marks the blank position.
   * e.g. ['Н', null, 'М'] renders "Н _ М" with blank in the middle.
   */
  wordChars: (string | null)[];
  /** The correct letter for the blank */
  correctLetter: string;
  /** Distractors + correct letter, displayed as tappable chips */
  letterOptions: string[];
}

export function FillTaskScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  wordChars,
  correctLetter,
  letterOptions,
}: FillTaskScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = submitted && selected === correctLetter;

  function handleNext() {
    setSelected(null);
    setSubmitted(false);
    onComplete?.();
  }

  return (
    <ScreenShell
      title="Үсэг нөхөх"
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
              onClick={() => { if (selected) setSubmitted(true); }}
              disabled={!selected}
            />
          )}
        </div>
      }
    >
      <AudioButton iconUrl={assets.audioIcon} />

      {/* Word tiles */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '40px',
          flexWrap: 'wrap',
          padding: '0 16px',
        }}
      >
        {wordChars.map((char, idx) =>
          char === null ? (
            <BlankTile
              key={idx}
              filled={selected}
              submitted={submitted}
              isCorrect={isCorrect}
            />
          ) : (
            <LetterTile key={idx} char={char} />
          ),
        )}
      </div>

      {/* Letter option chips */}
      {!submitted && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '44px',
            width: 'min(342px, calc(100% - 32px))',
          }}
        >
          {letterOptions.map((letter) => (
            <button
              key={letter}
              onClick={() => setSelected(letter)}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                border: `3px solid ${selected === letter ? '#31B2FB' : '#E9F1FF'}`,
                background: selected === letter ? 'rgba(49,178,251,0.10)' : 'white',
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '30px',
                color: selected === letter ? '#31B2FB' : '#01618F',
                cursor: 'pointer',
                transition: 'border-color 0.18s, background 0.18s, color 0.18s, transform 0.1s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transform: selected === letter ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {submitted && (
        <FeedbackBanner
          isCorrect={isCorrect}
          correctAnswer={isCorrect ? undefined : correctLetter}
          checkmarkUrl={assets.checkmark}
          crossUrl={assets.cross}
        />
      )}
    </ScreenShell>
  );
}

// ── Internal sub-components (SRP: each renders one tile) ──────────────────────

function LetterTile({ char }: { char: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '68px',
        height: '76px',
        borderRadius: '18px',
        background: '#01618F',
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: '34px',
        color: 'white',
        letterSpacing: '-0.01em',
        boxShadow: '0 4px 14px rgba(1,97,143,0.22)',
      }}
    >
      {char}
    </span>
  );
}

interface BlankTileProps {
  filled: string | null;
  submitted: boolean;
  isCorrect: boolean;
}

function BlankTile({ filled, submitted, isCorrect }: BlankTileProps) {
  let bg = 'rgba(49,178,251,0.06)';
  let border = '3px dashed #DAE9FF';
  let color = '#31B2FB';

  if (filled && !submitted) {
    bg = 'rgba(49,178,251,0.12)';
    border = '3px solid #31B2FB';
    color = '#31B2FB';
  }
  if (submitted && isCorrect) {
    bg = '#76CE79';
    border = '3px solid #76CE79';
    color = 'white';
  }
  if (submitted && !isCorrect) {
    bg = '#FB5151';
    border = '3px solid #FB5151';
    color = 'white';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '68px',
        height: '76px',
        borderRadius: '18px',
        background: bg,
        border,
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: '34px',
        color,
        transition: 'background 0.22s, border-color 0.22s, color 0.22s',
        boxShadow: submitted ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {filled ?? ''}
    </span>
  );
}

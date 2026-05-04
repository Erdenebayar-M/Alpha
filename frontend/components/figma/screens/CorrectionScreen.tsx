'use client';

import { useState } from 'react';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps } from '../types';

/**
 * TT3 — Error correction.
 * Shows a misspelled word; the learner types the correct form.
 */
export interface CorrectionScreenProps extends BaseScreenProps {
  incorrectWord: string;
  correctWord: string;
}

export function CorrectionScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  incorrectWord,
  correctWord,
}: CorrectionScreenProps) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = submitted && value.trim().toLowerCase() === correctWord.toLowerCase();

  function handleNext() {
    setValue('');
    setSubmitted(false);
    onComplete?.();
  }

  const inputBorder = !submitted
    ? value
      ? '3px solid #31B2FB'
      : '3px solid #E9F1FF'
    : isCorrect
      ? '3px solid #76CE79'
      : '3px solid #FB5151';

  const inputBg = !submitted
    ? 'white'
    : isCorrect
      ? 'rgba(118,206,121,0.07)'
      : 'rgba(251,81,81,0.05)';

  return (
    <ScreenShell
      title="Алдаа засах"
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
              onClick={() => { if (value.trim()) setSubmitted(true); }}
              disabled={!value.trim()}
            />
          )}
        </div>
      }
    >
      <AudioButton iconUrl={assets.audioIcon} />

      {/* Wrong word card */}
      <div
        style={{
          marginTop: '32px',
          width: 'min(342px, calc(100% - 32px))',
          padding: '20px 24px',
          borderRadius: '24px',
          background: 'rgba(251,81,81,0.07)',
          border: '2px solid rgba(251,81,81,0.22)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
            fontWeight: 700,
            fontSize: '11px',
            color: '#FB5151',
            margin: '0 0 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Алдаатай үг
        </p>
        <p
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '38px',
            color: '#C53030',
            margin: 0,
            textDecoration: 'line-through',
            textDecorationColor: 'rgba(251,81,81,0.45)',
            textDecorationThickness: '3px',
            letterSpacing: '-0.01em',
          }}
        >
          {incorrectWord}
        </p>
      </div>

      {/* Correction input */}
      <div
        style={{
          marginTop: '24px',
          width: 'min(342px, calc(100% - 32px))',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            color: '#405E7E',
            margin: '0 0 10px',
          }}
        >
          Зөв хэлбэрийг бич:
        </p>
        <input
          value={value}
          onChange={(e) => { if (!submitted) setValue(e.target.value); }}
          placeholder="Зөв үгийг бич…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '18px 22px',
            borderRadius: '22px',
            border: inputBorder,
            background: inputBg,
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '28px',
            color: '#01618F',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, background 0.2s',
            textAlign: 'center',
          }}
        />
      </div>

      {submitted && (
        <FeedbackBanner
          isCorrect={isCorrect}
          correctAnswer={isCorrect ? undefined : correctWord}
          checkmarkUrl={assets.checkmark}
          crossUrl={assets.cross}
        />
      )}
    </ScreenShell>
  );
}

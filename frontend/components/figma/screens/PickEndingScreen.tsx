'use client';

/**
 * TT2 variant — image first, then word strip with a blank slot, then letter chips.
 * Covers "Зовийг сонгох" + "Төгсгөлийн үгийг сонго": see image, pick the ending letter.
 *
 * Differs from WordFillScreen: image is shown ABOVE the word, the word uses a blue
 * gradient strip (not a white bokeh card), and chips persist after submit showing
 * green/red feedback on the selected chip.
 */

import { useState } from 'react';
import Image from 'next/image';
import { ScreenShell } from '../ScreenShell';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps } from '../types';

export interface PickEndingScreenProps extends BaseScreenProps {
  title?: string;
  taskLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Word chars in order; null = the blank slot. e.g. ['С','А','Н','Д','А', null] */
  wordChars: (string | null)[];
  correctLetter: string;
  letterOptions: string[];
}

type ChipStatus = 'idle' | 'selected' | 'correct' | 'wrong';

export function PickEndingScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  title = 'Зовийг сонгох',
  taskLabel = 'Төгсгөлийн үгийг сонго',
  imageUrl,
  imageAlt = '',
  wordChars,
  correctLetter,
  letterOptions,
}: PickEndingScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = submitted && selected === correctLetter;

  function getChipStatus(letter: string): ChipStatus {
    if (!submitted) return selected === letter ? 'selected' : 'idle';
    if (letter === selected) return selected === correctLetter ? 'correct' : 'wrong';
    return 'idle';
  }

  function handleNext() {
    setSelected(null);
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
              onClick={() => { if (selected) setSubmitted(true); }}
              disabled={!selected}
            />
          )}
        </div>
      }
    >
      {/* ── Task label ────────────────────────────────────────────────────── */}
      <p
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(16px, 4.5vw, 20px)',
          color: '#01618F',
          margin: '20px 0 0',
          textAlign: 'center',
          width: 'min(342px, calc(100% - 32px))',
          lineHeight: 1.3,
        }}
      >
        {taskLabel}
      </p>

      {/* ── Image card ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '14px',
          width: 'min(342px, calc(100% - 32px))',
          borderRadius: '28px',
          overflow: 'hidden',
          background: '#E9F1FF',
          aspectRatio: '4/3',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,97,143,0.06)',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            unoptimized
            style={{ objectFit: 'contain', padding: '16px' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '80px',
          }}>
            🪑
          </div>
        )}
      </div>

      {/* ── Word strip ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '16px',
          width: 'min(342px, calc(100% - 32px))',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #01618F 0%, #31B2FB 100%)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 6px 24px rgba(1,97,143,0.22)',
          flexShrink: 0,
        }}
      >
        {wordChars.map((char, idx) =>
          char !== null ? (
            <WordLetter key={idx} char={char} />
          ) : (
            <BlankSlot
              key={idx}
              filled={selected}
              submitted={submitted}
              isCorrect={isCorrect}
            />
          ),
        )}
      </div>

      {/* ── Letter chip row ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '20px',
          width: 'min(342px, calc(100% - 32px))',
        }}
      >
        {letterOptions.map((letter) => (
          <LetterChip
            key={letter}
            letter={letter}
            status={getChipStatus(letter)}
            badgeCheckUrl={assets.checkmark}
            badgeCrossUrl={assets.cross}
            onClick={() => !submitted && setSelected(letter)}
          />
        ))}
      </div>

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

// ── Sub-components ────────────────────────────────────────────────────────────

function WordLetter({ char }: { char: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(28px, 8vw, 40px)',
        color: 'white',
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
    >
      {char}
    </span>
  );
}

interface BlankSlotProps {
  filled: string | null;
  submitted: boolean;
  isCorrect: boolean;
}

function BlankSlot({ filled, submitted, isCorrect }: BlankSlotProps) {
  let bg = 'transparent';
  let border = '3px dashed rgba(255,255,255,0.65)';
  let textColor = 'white';

  if (filled && !submitted) {
    bg = 'rgba(255,255,255,0.22)';
    border = '3px solid rgba(255,255,255,0.85)';
  }
  if (submitted && isCorrect) {
    bg = '#76CE79';
    border = '3px solid #5db860';
  }
  if (submitted && !isCorrect) {
    bg = '#FB5151';
    border = '3px solid #e03b3b';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'clamp(44px, 11vw, 56px)',
        height: 'clamp(50px, 12vw, 60px)',
        borderRadius: '14px',
        background: bg,
        border,
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(26px, 7vw, 36px)',
        color: textColor,
        transition: 'background 0.22s, border-color 0.22s',
      }}
    >
      {filled ?? ''}
    </span>
  );
}

const CHIP_STYLE: Record<ChipStatus, { bg: string; border: string; color: string }> = {
  idle:     { bg: '#EEF4FF',               border: '#E9F1FF',  color: '#01618F' },
  selected: { bg: 'rgba(49,178,251,0.12)', border: '#31B2FB',  color: '#31B2FB' },
  correct:  { bg: '#76CE79',               border: '#5db860',  color: 'white'   },
  wrong:    { bg: '#FB5151',               border: '#e03b3b',  color: 'white'   },
};

interface LetterChipProps {
  letter: string;
  status: ChipStatus;
  badgeCheckUrl: string;
  badgeCrossUrl: string;
  onClick: () => void;
}

function LetterChip({ letter, status, badgeCheckUrl, badgeCrossUrl, onClick }: LetterChipProps) {
  const s = CHIP_STYLE[status];
  const isSubmitted = status === 'correct' || status === 'wrong';

  return (
    <button
      onClick={onClick}
      disabled={isSubmitted}
      style={{
        position: 'relative',
        width: 'clamp(72px, 20vw, 88px)',
        height: 'clamp(72px, 20vw, 88px)',
        borderRadius: '20px',
        border: `3px solid ${s.border}`,
        background: s.bg,
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(26px, 7vw, 34px)',
        color: s.color,
        cursor: isSubmitted ? 'default' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s, transform 0.1s',
        transform: status === 'selected' ? 'scale(1.06)' : 'scale(1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {letter}

      {/* Result badge — top-right corner */}
      {status === 'correct' && (
        <span style={badgeStyle()}>
          <Image src={badgeCheckUrl} alt="Зөв" width={12} height={9} unoptimized />
        </span>
      )}
      {status === 'wrong' && (
        <span style={badgeStyle()}>
          <Image src={badgeCrossUrl} alt="Буруу" width={10} height={10} unoptimized />
        </span>
      )}
    </button>
  );
}

function badgeStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '24px',
    height: '24px',
    borderRadius: '9999px',
    background: 'white',
    border: '2px solid rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  };
}

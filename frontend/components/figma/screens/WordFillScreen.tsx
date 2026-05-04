'use client';

/**
 * TT2 variant — gradient word card + optional image + letter chips.
 * Covers screens 1 ("Үсэг нөхөх") and 3 ("Төгсгөлийн үгийг сонго").
 */

import { useState } from 'react';
import Image from 'next/image';
import { ScreenShell } from '../ScreenShell';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps } from '../types';

export interface WordFillScreenProps extends BaseScreenProps {
  /** Word chars in order, null = blank. e.g. ['Н', null, 'М'] */
  wordChars: (string | null)[];
  correctLetter: string;
  letterOptions: string[];
  /** Optional image shown below the word card (e.g. chair for САНДА_) */
  imageUrl?: string;
  imageAlt?: string;
  title?: string;
}

export function WordFillScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  wordChars,
  correctLetter,
  letterOptions,
  imageUrl,
  imageAlt = '',
  title = 'Үсэг нөхөх',
}: WordFillScreenProps) {
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
      {/* ── Gradient word card ──────────────────────────────────────────── */}
      <WordCard
        wordChars={wordChars}
        filled={selected}
        submitted={submitted}
        isCorrect={isCorrect}
        assets={assets}
      />

      {/* ── Optional image ──────────────────────────────────────────────── */}
      {imageUrl && (
        <div
          style={{
            marginTop: '16px',
            width: 'min(342px, calc(100% - 32px))',
            borderRadius: '28px',
            overflow: 'hidden',
            background: '#E9F1FF',
            aspectRatio: '4/3',
            position: 'relative',
          }}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            unoptimized
            style={{ objectFit: 'contain', padding: '16px' }}
          />
        </div>
      )}

      {/* ── Letter chips ─────────────────────────────────────────────────── */}
      {!submitted && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '28px',
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

// ── Internal sub-components ───────────────────────────────────────────────────

interface WordCardProps {
  wordChars: (string | null)[];
  filled: string | null;
  submitted: boolean;
  isCorrect: boolean;
  assets: BaseScreenProps['assets'];
}

function WordCard({ wordChars, filled, submitted, isCorrect, assets }: WordCardProps) {
  return (
    <div
      style={{
        marginTop: '28px',
        width: 'min(342px, calc(100% - 32px))',
        borderRadius: '28px',
        background: 'white',
        boxShadow: '0 4px 20px rgba(0,97,143,0.08)',
        padding: '28px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Bokeh gradient blobs */}
      <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <span style={blob('-20px', '-20px', '120px', 'rgba(255,182,193,0.45)')} />
        <span style={blob('auto', '-10px', '110px', 'rgba(255,235,153,0.50)', '0')} />
        <span style={blob('auto', '10px', '100px', 'rgba(164,221,143,0.40)', 'auto', '0')} />
        <span style={blob('-10px', 'auto', '100px', 'rgba(173,216,230,0.45)', 'auto', '0')} />
      </span>

      {/* Feedback badge */}
      {submitted && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            background: isCorrect ? '#76CE79' : '#FB5151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Image
            src={isCorrect ? assets.checkmark : assets.cross}
            alt={isCorrect ? 'Зөв' : 'Буруу'}
            width={isCorrect ? 18 : 14}
            height={14}
            unoptimized
          />
        </span>
      )}

      {/* Word tiles */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {wordChars.map((char, idx) =>
          char === null ? (
            <BlankTile
              key={idx}
              filled={filled}
              submitted={submitted}
              isCorrect={isCorrect}
            />
          ) : (
            <LetterTile key={idx} char={char} />
          ),
        )}
      </div>

      {/* Book icon */}
      <span style={{ position: 'relative', zIndex: 1, fontSize: '28px', lineHeight: 1 }}>
        📖
      </span>
    </div>
  );
}

function blob(
  top: string,
  right: string,
  size: string,
  color: string,
  left = 'auto',
  bottom = 'auto',
): React.CSSProperties {
  return {
    position: 'absolute',
    top,
    right,
    left,
    bottom,
    width: size,
    height: size,
    borderRadius: '9999px',
    background: color,
    filter: 'blur(32px)',
    display: 'block',
  };
}

function LetterTile({ char }: { char: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '72px',
        borderRadius: '18px',
        background: '#01618F',
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: '32px',
        color: 'white',
        letterSpacing: '-0.01em',
        boxShadow: '0 4px 14px rgba(1,97,143,0.22)',
      }}
    >
      {char}
    </span>
  );
}

function BlankTile({
  filled,
  submitted,
  isCorrect,
}: {
  filled: string | null;
  submitted: boolean;
  isCorrect: boolean;
}) {
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
        width: '64px',
        height: '72px',
        borderRadius: '18px',
        background: bg,
        border,
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: '32px',
        color,
        transition: 'background 0.22s, border-color 0.22s, color 0.22s',
        boxShadow: submitted ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {filled ?? ''}
    </span>
  );
}

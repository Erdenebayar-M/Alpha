'use client';

/**
 * TT2 variant — multi-blank spelling from a tappable letter keyboard.
 * Covers screen 4 ("Усгийг зөв бичих"): category title + image + blank slots + keyboard.
 */

import { useState } from 'react';
import Image from 'next/image';
import { ScreenShell } from '../ScreenShell';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import type { BaseScreenProps } from '../types';

export interface MultiSpellScreenProps extends BaseScreenProps {
  /** Section label shown above the image, e.g. "Байгалийн үзэгдэл" */
  categoryTitle: string;
  imageUrl?: string;
  /** Word the learner must spell, e.g. "ҮЕР" */
  targetWord: string;
  /** Letters available on the keyboard */
  letterOptions: string[];
  title?: string;
}

export function MultiSpellScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  categoryTitle,
  imageUrl,
  targetWord,
  letterOptions,
  title = 'Усгийг зөв бичих',
}: MultiSpellScreenProps) {
  const targetLetters = targetWord.split('');
  const [slots, setSlots] = useState<(string | null)[]>(Array(targetLetters.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  const nextEmpty = slots.indexOf(null);
  const isFull = nextEmpty === -1;
  const spelled = slots.join('');
  const isCorrect = submitted && spelled === targetWord;

  function handleLetterPress(letter: string) {
    if (submitted || isFull) return;
    setSlots((prev) => {
      const next = [...prev];
      next[nextEmpty] = letter;
      return next;
    });
  }

  function handleDelete() {
    if (submitted) return;
    setSlots((prev) => {
      const last = [...prev].map((v, i) => ({ v, i })).filter((x) => x.v !== null).pop();
      if (!last) return prev;
      const next = [...prev];
      next[last.i] = null;
      return next;
    });
  }

  function handleNext() {
    setSlots(Array(targetLetters.length).fill(null));
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
              onClick={() => { if (isFull) setSubmitted(true); }}
              disabled={!isFull}
            />
          )}
        </div>
      }
    >
      {/* Category label */}
      <p
        style={{
          marginTop: '20px',
          fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
          fontWeight: 700,
          fontSize: '13px',
          color: '#405E7E',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          textAlign: 'center',
        }}
      >
        {categoryTitle}
      </p>

      {/* Image */}
      <div
        style={{
          marginTop: '10px',
          width: 'min(300px, calc(100% - 32px))',
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
            alt={categoryTitle}
            fill
            unoptimized
            style={{ objectFit: 'contain', padding: '16px' }}
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

      {/* Blank slots */}
      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {slots.map((letter, idx) => {
          const isActive = !submitted && idx === nextEmpty;
          let border = '3px dashed #DAE9FF';
          let bg = 'rgba(49,178,251,0.04)';
          let color = '#31B2FB';
          if (letter && !submitted) {
            border = '3px solid #31B2FB';
            bg = 'rgba(49,178,251,0.10)';
          }
          if (isActive) border = '3px dashed #31B2FB';
          if (submitted && isCorrect) { border = '3px solid #76CE79'; bg = '#76CE79'; color = 'white'; }
          if (submitted && !isCorrect && letter) { border = '3px solid #FB5151'; bg = '#FB5151'; color = 'white'; }

          return (
            <span
              key={idx}
              style={{
                width: '58px',
                height: '66px',
                borderRadius: '16px',
                border,
                background: bg,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '28px',
                color,
                transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                boxShadow: isActive ? '0 0 0 4px rgba(49,178,251,0.15)' : 'none',
              }}
            >
              {letter ?? (isActive ? (
                <span style={{ width: '2px', height: '28px', background: '#31B2FB', borderRadius: '1px', display: 'block', animation: 'blink 1s step-end infinite' }} />
              ) : '')}
            </span>
          );
        })}
      </div>

      {/* Letter keyboard */}
      {!submitted && (
        <div
          style={{
            marginTop: '24px',
            width: 'min(342px, calc(100% - 32px))',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
          }}
        >
          {letterOptions.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterPress(letter)}
              disabled={isFull}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                border: '3px solid #E9F1FF',
                background: 'white',
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '26px',
                color: '#01618F',
                cursor: isFull ? 'default' : 'pointer',
                opacity: isFull ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.1s, opacity 0.15s',
              }}
            >
              {letter}
            </button>
          ))}

          {/* Delete key */}
          <button
            onClick={handleDelete}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              border: '3px solid #E9F1FF',
              background: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            ⌫
          </button>
        </div>
      )}

      {submitted && (
        <FeedbackBanner
          isCorrect={isCorrect}
          correctAnswer={isCorrect ? undefined : targetWord}
          checkmarkUrl={assets.checkmark}
          crossUrl={assets.cross}
        />
      )}
    </ScreenShell>
  );
}

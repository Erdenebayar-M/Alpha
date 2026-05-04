'use client';

import { useState } from 'react';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ActionButton } from '../ActionButton';
import { FeedbackBanner } from '../FeedbackBanner';
import { useSpeech } from '../useSpeech';
import type { BaseScreenProps } from '../types';

/**
 * TT4 — Dictation (single word).
 * Learner hears the audio then writes the word from memory.
 * The "Шалгах" button is locked until audio has been played once.
 */
export interface DictationScreenProps extends BaseScreenProps {
  targetWord: string;
  /** If provided, clicking AudioButton will speak this text via TTS */
  audioText?: string;
}

export function DictationScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  targetWord,
  audioText,
}: DictationScreenProps) {
  const { speakText, state: speechState } = useSpeech();
  const [value, setValue] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleAudio() {
    setHasPlayed(true);
    if (audioText) speakText(audioText);
  }

  const isCorrect = submitted && value.trim().toLowerCase() === targetWord.toLowerCase();

  function handleNext() {
    setValue('');
    setHasPlayed(false);
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
      title="Диктант"
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
              disabled={!value.trim() || !hasPlayed}
            />
          )}
        </div>
      }
    >
      <AudioButton iconUrl={assets.audioIcon} isPlaying={speechState === 'playing'} onClick={handleAudio} />

      {/* Instruction fade-in after first play */}
      <p
        style={{
          marginTop: '14px',
          fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          color: '#405E7E',
          opacity: hasPlayed ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}
      >
        Сонсоод доор бич
      </p>

      {/* Writing area */}
      <div
        style={{
          marginTop: '28px',
          width: 'min(342px, calc(100% - 32px))',
        }}
      >
        <input
          value={value}
          onChange={(e) => { if (!submitted) setValue(e.target.value); }}
          placeholder="Үгийг бич…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '22px 24px',
            borderRadius: '24px',
            border: inputBorder,
            background: inputBg,
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '36px',
            color: '#01618F',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, background 0.2s',
            boxShadow: '0 4px 16px rgba(0,97,143,0.06)',
          }}
        />
      </div>

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

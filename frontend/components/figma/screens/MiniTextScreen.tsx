'use client';

import { useState } from 'react';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ActionButton } from '../ActionButton';
import { useSpeech } from '../useSpeech';
import type { BaseScreenProps } from '../types';

/**
 * TT5 — Mini-text dictation.
 * Learner hears a short sentence and writes it verbatim.
 * After submit, shows a side-by-side diff panel.
 */
export interface MiniTextScreenProps extends BaseScreenProps {
  correctText: string;
  /** If provided, clicking AudioButton will speak this text via TTS */
  audioText?: string;
}

export function MiniTextScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  correctText,
  audioText,
}: MiniTextScreenProps) {
  const { speakText, state: speechState } = useSpeech();
  const [value, setValue] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleAudio() {
    setHasPlayed(true);
    if (audioText) speakText(audioText);
  }

  const trimmedValue = value.trim();
  const isCorrect = submitted && trimmedValue.toLowerCase() === correctText.toLowerCase();

  function handleNext() {
    setValue('');
    setHasPlayed(false);
    setSubmitted(false);
    onComplete?.();
  }

  const textareaBorder = !submitted
    ? trimmedValue
      ? '3px solid #31B2FB'
      : '3px solid #E9F1FF'
    : isCorrect
      ? '3px solid #76CE79'
      : '3px solid #FB5151';

  return (
    <ScreenShell
      title="Мини текст"
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
              onClick={() => { if (trimmedValue && hasPlayed) setSubmitted(true); }}
              disabled={!trimmedValue || !hasPlayed}
            />
          )}
        </div>
      }
    >
      <AudioButton iconUrl={assets.audioIcon} isPlaying={speechState === 'playing'} onClick={handleAudio} />

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
        Сонсоод өгүүлбэрийг бич
      </p>

      <div
        style={{
          marginTop: '24px',
          width: 'min(342px, calc(100% - 32px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => { if (!submitted) setValue(e.target.value); }}
          placeholder="Өгүүлбэрийг бич…"
          rows={4}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '22px',
            border: textareaBorder,
            background: 'white',
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            color: '#01618F',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
            lineHeight: '1.65',
            boxShadow: '0 4px 16px rgba(0,97,143,0.06)',
          }}
        />

        {submitted && (
          <AnswerComparePanel
            userText={trimmedValue}
            correctText={correctText}
            isCorrect={isCorrect}
          />
        )}
      </div>
    </ScreenShell>
  );
}

// ── Internal sub-component ────────────────────────────────────────────────────

interface AnswerComparePanelProps {
  userText: string;
  correctText: string;
  isCorrect: boolean;
}

function AnswerComparePanel({ userText, correctText, isCorrect }: AnswerComparePanelProps) {
  const accent = isCorrect ? '#76CE79' : '#DAE9FF';
  const labelColor = isCorrect ? '#1A6B1D' : '#405E7E';

  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: '22px',
        background: isCorrect ? 'rgba(118,206,121,0.09)' : 'rgba(1,97,143,0.04)',
        border: `2px solid ${accent}`,
      }}
    >
      {!isCorrect && (
        <>
          <SectionLabel color="#405E7E">Таны хариулт</SectionLabel>
          <p style={answerTextStyle('#8099B3')}>{userText}</p>
          <div
            style={{
              height: '1px',
              background: '#E9F1FF',
              margin: '12px 0',
            }}
          />
        </>
      )}
      <SectionLabel color={labelColor}>{isCorrect ? 'Зөв бичлээ!' : 'Зөв хариулт'}</SectionLabel>
      <p style={answerTextStyle('#01618F')}>{correctText}</p>
    </div>
  );
}

function SectionLabel({ children, color }: { children: string; color: string }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
        fontWeight: 700,
        fontSize: '11px',
        color,
        margin: '0 0 6px',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}
    >
      {children}
    </p>
  );
}

function answerTextStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
    fontWeight: 700,
    fontSize: '20px',
    color,
    margin: 0,
    lineHeight: '1.5',
  };
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ScreenShell } from '../ScreenShell';
import { AudioButton } from '../AudioButton';
import { ActionButton } from '../ActionButton';
import { useSpeech } from '../useSpeech';
import type { BaseScreenProps } from '../types';

type SelfJudgement = 'correct' | 'wrong' | null;

/**
 * TT6 — Self-check.
 * Flow: hear → write → reveal correct answer → self-mark (Зөв / Буруу).
 */
export interface SelfCheckScreenProps extends BaseScreenProps {
  correctAnswer: string;
  /** Instruction text shown below the audio button */
  prompt: string;
  /** If provided, clicking AudioButton will speak this text via TTS */
  audioText?: string;
}

export function SelfCheckScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  correctAnswer,
  prompt,
  audioText,
}: SelfCheckScreenProps) {
  const { speakText, state: speechState } = useSpeech();
  const [value, setValue] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [judgement, setJudgement] = useState<SelfJudgement>(null);

  function handleAudio() {
    if (audioText) speakText(audioText);
  }

  function handleReveal() {
    if (value.trim()) setRevealed(true);
  }

  function handleMark(result: 'correct' | 'wrong') {
    setJudgement(result);
  }

  function handleNext() {
    setValue('');
    setRevealed(false);
    setJudgement(null);
    onComplete?.();
  }

  const inputBorder = !revealed
    ? value
      ? '3px solid #31B2FB'
      : '3px solid #E9F1FF'
    : judgement === 'correct'
      ? '3px solid #76CE79'
      : judgement === 'wrong'
        ? '3px solid #FB5151'
        : '3px solid #DAE9FF';

  return (
    <ScreenShell
      title="Өөрийгөө шалгах"
      progress={progress}
      stage={stage}
      backIconUrl={assets.backIcon}
      navItems={navItems}
      footer={
        <div style={{ padding: '10px 20px 8px' }}>
          {judgement !== null ? (
            <ActionButton label="Дараагийнх" variant="next" onClick={handleNext} />
          ) : revealed ? (
            /* self-mark buttons live in the body; footer is just spacing */
            <div style={{ height: '4px' }} />
          ) : (
            <ActionButton
              label="Харьцуулах"
              onClick={handleReveal}
              disabled={!value.trim()}
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
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {prompt}
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
        {/* Learner's answer input */}
        <input
          value={value}
          onChange={(e) => { if (!revealed) setValue(e.target.value); }}
          placeholder="Хариултаа бич…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '20px 22px',
            borderRadius: '22px',
            border: inputBorder,
            background: 'white',
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '32px',
            color: '#01618F',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.22s',
            boxShadow: '0 4px 16px rgba(0,97,143,0.06)',
          }}
        />

        {/* Revealed correct answer */}
        {revealed && (
          <>
            <div
              style={{
                padding: '18px 22px',
                borderRadius: '22px',
                background: 'rgba(1,97,143,0.05)',
                border: '2px solid #DAE9FF',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  fontWeight: 700,
                  fontSize: '11px',
                  color: '#405E7E',
                  margin: '0 0 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Зөв хариулт
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                  fontWeight: 800,
                  fontSize: '36px',
                  color: '#01618F',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {correctAnswer}
              </p>
            </div>

            {/* Self-mark buttons OR result badge */}
            {judgement === null ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <SelfMarkButton
                  label="Зөв"
                  accent="#76CE79"
                  iconUrl={assets.checkmark}
                  iconSize={{ w: 18, h: 14 }}
                  onClick={() => handleMark('correct')}
                />
                <SelfMarkButton
                  label="Буруу"
                  accent="#FB5151"
                  iconUrl={assets.cross}
                  iconSize={{ w: 14, h: 14 }}
                  onClick={() => handleMark('wrong')}
                />
              </div>
            ) : (
              <ResultBadge judgement={judgement} />
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

// ── Internal sub-components ───────────────────────────────────────────────────

interface SelfMarkButtonProps {
  label: string;
  accent: string;
  iconUrl: string;
  iconSize: { w: number; h: number };
  onClick: () => void;
}

function SelfMarkButton({ label, accent, iconUrl, iconSize, onClick }: SelfMarkButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: '66px',
        borderRadius: '20px',
        border: `3px solid ${accent}`,
        background: `${accent}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'background 0.18s, transform 0.1s',
      }}
    >
      <Image src={iconUrl} alt="" width={iconSize.w} height={iconSize.h} unoptimized />
      <span
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: '22px',
          color: accent,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function ResultBadge({ judgement }: { judgement: 'correct' | 'wrong' }) {
  const isOk = judgement === 'correct';
  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: '20px',
        background: isOk ? 'rgba(118,206,121,0.12)' : 'rgba(251,81,81,0.08)',
        border: `2px solid ${isOk ? '#76CE79' : '#FB5151'}`,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: '20px',
          color: isOk ? '#1A6B1D' : '#B91C1C',
          margin: 0,
        }}
      >
        {isOk ? 'Маш сайн!' : 'Дараагийн удаа болно!'}
      </p>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { MobileShell } from '@/components/figma/MobileShell';
import { useSpeech } from '@/components/figma/useSpeech';

export interface BackendTask {
  id: string;
  task_type: 'TT1_CHOICE' | 'TT2_FILL' | 'TT3_CORRECTION' | 'TT4_DICTATION' | 'TT5_MINI_TEXT' | 'TT6_SELF_CHECK';
  title: string;
  prompt_text: string;
  options: Record<string, unknown>;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  estimated_time_seconds: number;
}

export interface SubmitResult {
  is_correct: boolean;
  score: number;
  feedback: string;
}

interface TaskRunnerProps {
  task: BackendTask;
  progress: { current: number; total: number };
  onSubmit: (taskId: string, answer: string) => Promise<SubmitResult>;
  onNext: () => void;
}

const P = {
  primary: '#01618F',
  mid: '#31B2FB',
  bg: '#F3F6FF',
  correct: '#76CE79',
  wrong: '#FB5151',
  text: '#405E7E',
  border: '#E9F1FF',
  nunito: 'var(--font-nunito), "Nunito Sans", sans-serif',
  jakarta: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
};

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: P.jakarta, fontSize: '12px', color: P.text }}>
          {current}/{total}
        </span>
        <span style={{ fontFamily: P.jakarta, fontSize: '12px', color: P.text }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '9999px', background: '#E2EAFF', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '9999px',
            background: `linear-gradient(90deg, ${P.primary}, ${P.mid})`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function FeedbackBar({ result, onNext }: { result: SubmitResult; onNext: () => void }) {
  return (
    <div
      style={{
        padding: '14px 20px',
        background: result.is_correct ? 'rgba(118,206,121,0.12)' : 'rgba(251,81,81,0.08)',
        borderTop: `2px solid ${result.is_correct ? P.correct : P.wrong}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{result.is_correct ? '✅' : '❌'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '14px', color: result.is_correct ? '#166534' : '#C53030' }}>
          {result.is_correct ? 'Зөв!' : 'Буруу'}
        </p>
        {result.feedback && (
          <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '12px', color: P.text, marginTop: '2px' }}>
            {result.feedback}
          </p>
        )}
      </div>
      <button
        onClick={onNext}
        style={{
          padding: '10px 18px',
          borderRadius: '9999px',
          border: 'none',
          background: result.is_correct ? P.correct : P.primary,
          color: 'white',
          fontFamily: P.nunito,
          fontWeight: 800,
          fontSize: '14px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Дараагийнх
      </button>
    </div>
  );
}

function SubmitButton({ onSubmit, disabled }: { onSubmit: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onSubmit}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '16px',
        borderRadius: '9999px',
        border: 'none',
        background: disabled ? '#C8DCEA' : `linear-gradient(135deg, ${P.primary}, ${P.mid})`,
        color: disabled ? '#8AAABB' : 'white',
        fontFamily: P.nunito,
        fontWeight: 800,
        fontSize: '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      Шалгах
    </button>
  );
}

// ─── TT1: Choice task ────────────────────────────────────────────────────────

function TT1Choice({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const opts = task.options as { choices: { text: string; is_correct: boolean }[]; audio_trigger: boolean };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: '0 0 4px', fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      {opts.choices?.map((c, i) => (
        <button
          key={i}
          onClick={() => { setSelected(c.text); onAnswer(c.text); }}
          style={{
            padding: '14px 18px',
            borderRadius: '16px',
            border: `2px solid ${selected === c.text ? P.primary : P.border}`,
            background: selected === c.text ? `${P.primary}12` : 'white',
            fontFamily: P.nunito,
            fontWeight: 700,
            fontSize: '16px',
            color: selected === c.text ? P.primary : P.text,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
        >
          {c.text}
        </button>
      ))}
    </div>
  );
}

// ─── TT2: Fill blank ─────────────────────────────────────────────────────────

function TT2Fill({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [val, setVal] = useState('');
  const opts = task.options as { display_text: string; blank_answer: string; context_word: string };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '20px',
          background: `${P.primary}0A`,
          textAlign: 'center',
          fontFamily: P.nunito,
          fontWeight: 800,
          fontSize: '28px',
          color: P.primary,
          letterSpacing: '0.1em',
        }}
      >
        {opts.display_text ?? ''}
      </div>
      <input
        value={val}
        onChange={(e) => { setVal(e.target.value); onAnswer(e.target.value); }}
        placeholder="Хариуг бич..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          padding: '14px 20px',
          borderRadius: '16px',
          border: `2px solid ${val ? P.primary : P.border}`,
          background: 'white',
          fontFamily: P.nunito,
          fontWeight: 800,
          fontSize: '24px',
          color: P.primary,
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}

// ─── TT3: Correction ─────────────────────────────────────────────────────────

function TT3Correction({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [val, setVal] = useState('');
  const opts = task.options as { incorrect_text: string; correct_text: string; hint: string };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'rgba(251,81,81,0.07)',
          border: '2px solid rgba(251,81,81,0.2)',
          textAlign: 'center',
          fontFamily: P.nunito,
          fontWeight: 800,
          fontSize: '26px',
          color: '#C53030',
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(251,81,81,0.4)',
        }}
      >
        {opts.incorrect_text}
      </div>
      <input
        value={val}
        onChange={(e) => { setVal(e.target.value); onAnswer(e.target.value); }}
        placeholder="Зөв хэлбэрийг бич..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          padding: '14px 20px',
          borderRadius: '16px',
          border: `2px solid ${val ? P.primary : P.border}`,
          background: 'white',
          fontFamily: P.nunito,
          fontWeight: 800,
          fontSize: '22px',
          color: P.primary,
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}

// ─── TT4: Dictation ──────────────────────────────────────────────────────────

function TT4Dictation({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [val, setVal] = useState('');
  const [played, setPlayed] = useState(false);
  const { speakText, state } = useSpeech();
  const opts = task.options as { audio_text: string; expected_answers: string[] };

  function playAudio() {
    setPlayed(true);
    speakText(opts.audio_text ?? task.prompt_text);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      <button
        onClick={playAudio}
        style={{
          alignSelf: 'center',
          width: '72px',
          height: '72px',
          borderRadius: '9999px',
          border: 'none',
          background: state === 'playing' ? P.mid : `linear-gradient(135deg, ${P.primary}, ${P.mid})`,
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(1,97,143,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {state === 'playing' ? '⏸' : '🔊'}
      </button>
      {played && (
        <input
          value={val}
          onChange={(e) => { setVal(e.target.value); onAnswer(e.target.value); }}
          placeholder="Сонссоноо бич..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: `2px solid ${val ? P.primary : P.border}`,
            background: 'white',
            fontFamily: P.nunito,
            fontWeight: 800,
            fontSize: '22px',
            color: P.primary,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            width: '100%',
            transition: 'border-color 0.2s',
          }}
        />
      )}
      {!played && (
        <p style={{ textAlign: 'center', fontFamily: P.jakarta, fontSize: '13px', color: '#A0BACE' }}>
          Эхлээд аудио сонсоно уу
        </p>
      )}
    </div>
  );
}

// ─── TT5: Mini text ──────────────────────────────────────────────────────────

function TT5MiniText({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [val, setVal] = useState('');
  const [played, setPlayed] = useState(false);
  const { speakText, state } = useSpeech();
  const opts = task.options as { audio_text: string; sentence_count: number };

  function playAudio() {
    setPlayed(true);
    speakText(opts.audio_text ?? task.prompt_text);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      <button
        onClick={playAudio}
        style={{
          alignSelf: 'center',
          width: '72px',
          height: '72px',
          borderRadius: '9999px',
          border: 'none',
          background: state === 'playing' ? P.mid : `linear-gradient(135deg, ${P.primary}, ${P.mid})`,
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(1,97,143,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {state === 'playing' ? '⏸' : '🔊'}
      </button>
      {played && (
        <textarea
          value={val}
          onChange={(e) => { setVal(e.target.value); onAnswer(e.target.value); }}
          placeholder="Сонссоноо бичнэ үү..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          rows={4}
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: `2px solid ${val ? P.primary : P.border}`,
            background: 'white',
            fontFamily: P.nunito,
            fontWeight: 700,
            fontSize: '16px',
            color: P.primary,
            outline: 'none',
            boxSizing: 'border-box',
            width: '100%',
            resize: 'none',
            lineHeight: '1.6',
            transition: 'border-color 0.2s',
          }}
        />
      )}
    </div>
  );
}

// ─── TT6: Self-check ─────────────────────────────────────────────────────────

function TT6SelfCheck({ task, onAnswer }: { task: BackendTask; onAnswer: (a: string) => void }) {
  const [written, setWritten] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [judgement, setJudgement] = useState<'correct' | 'wrong' | null>(null);
  const { speakText, state } = useSpeech();
  const opts = task.options as { original_attempt?: string; model_answer: string };

  function judge(j: 'correct' | 'wrong') {
    setJudgement(j);
    onAnswer(j);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '14px', color: P.text, lineHeight: '1.5' }}>
        {task.prompt_text}
      </p>
      <button
        onClick={() => speakText(opts.model_answer ?? task.prompt_text)}
        style={{
          alignSelf: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '9999px',
          border: 'none',
          background: `linear-gradient(135deg, ${P.primary}, ${P.mid})`,
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(1,97,143,0.25)',
        }}
      >
        🔊
      </button>
      {!revealed ? (
        <>
          <textarea
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            placeholder="Сонссоноо бичнэ үү..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            rows={3}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: `2px solid ${written ? P.primary : P.border}`,
              background: 'white',
              fontFamily: P.nunito,
              fontWeight: 700,
              fontSize: '16px',
              color: P.primary,
              outline: 'none',
              resize: 'none',
              width: '100%',
              boxSizing: 'border-box',
              lineHeight: '1.6',
            }}
          />
          <button
            onClick={() => setRevealed(true)}
            disabled={!written}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: written ? P.primary : '#C8DCEA',
              color: written ? 'white' : '#8AAABB',
              fontFamily: P.nunito,
              fontWeight: 800,
              fontSize: '14px',
              cursor: written ? 'pointer' : 'not-allowed',
            }}
          >
            Зөв хариу харах
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(251,81,81,0.07)', border: '1px solid rgba(251,81,81,0.2)' }}>
              <p style={{ margin: '0 0 4px', fontFamily: P.jakarta, fontSize: '11px', fontWeight: 700, color: P.wrong, textTransform: 'uppercase' }}>Та бичсэн</p>
              <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '16px', color: '#C53030' }}>{written}</p>
            </div>
            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(118,206,121,0.1)', border: '1px solid rgba(118,206,121,0.3)' }}>
              <p style={{ margin: '0 0 4px', fontFamily: P.jakarta, fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Зөв хариу</p>
              <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '16px', color: '#166534' }}>{opts.model_answer}</p>
            </div>
          </div>
          {!judgement && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => judge('correct')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(118,206,121,0.15)', color: '#166534', fontFamily: P.nunito, fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
              >
                ✓ Зөв
              </button>
              <button
                onClick={() => judge('wrong')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(251,81,81,0.1)', color: '#C53030', fontFamily: P.nunito, fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
              >
                ✗ Буруу
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main TaskRunner ──────────────────────────────────────────────────────────

export function TaskRunner({ task, progress, onSubmit, onNext }: TaskRunnerProps) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const handleAnswer = useCallback((a: string) => setAnswer(a), []);

  async function handleSubmit() {
    if (!answer || submitting) return;
    setSubmitting(true);
    try {
      const r = await onSubmit(task.id, answer);
      setResult(r);
    } catch {
      setResult({ is_correct: false, score: 0, feedback: 'Алдаа гарлаа, дахин оролдоно уу' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setAnswer('');
    setResult(null);
    onNext();
  }

  const canSubmit = !!answer && !submitting;

  const TaskContent = () => {
    switch (task.task_type) {
      case 'TT1_CHOICE':  return <TT1Choice task={task} onAnswer={handleAnswer} />;
      case 'TT2_FILL':    return <TT2Fill task={task} onAnswer={handleAnswer} />;
      case 'TT3_CORRECTION': return <TT3Correction task={task} onAnswer={handleAnswer} />;
      case 'TT4_DICTATION':  return <TT4Dictation task={task} onAnswer={handleAnswer} />;
      case 'TT5_MINI_TEXT':  return <TT5MiniText task={task} onAnswer={handleAnswer} />;
      case 'TT6_SELF_CHECK': return <TT6SelfCheck task={task} onAnswer={handleAnswer} />;
      default: return <p style={{ fontFamily: P.jakarta, color: P.text }}>Тодорхойгүй даалгавар</p>;
    }
  };

  return (
    <MobileShell>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #E9F1FF', flexShrink: 0 }}>
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: P.jakarta, fontWeight: 700, fontSize: '12px', color: '#7A9BB5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {task.primary_skill}
            </span>
            <span style={{ fontFamily: P.jakarta, fontSize: '12px', color: P.text }}>
              {progress.current}/{progress.total}
            </span>
          </div>
          <div style={{ height: '4px', borderRadius: '9999px', background: '#E2EAFF', overflow: 'hidden', marginBottom: '12px' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
                borderRadius: '9999px',
                background: `linear-gradient(90deg, ${P.primary}, ${P.mid})`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '17px', color: P.primary, paddingBottom: '12px' }}>
            {task.title}
          </p>
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
        }}
      >
        <TaskContent />
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0 }}>
        {result ? (
          <FeedbackBar result={result} onNext={handleNext} />
        ) : (
          <div style={{ padding: '10px 20px 20px' }}>
            <SubmitButton onSubmit={handleSubmit} disabled={!canSubmit} />
          </div>
        )}
      </div>
    </MobileShell>
  );
}

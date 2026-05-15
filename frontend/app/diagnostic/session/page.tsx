'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import { TaskRunner, type BackendTask, type SubmitResult } from '@/components/task/TaskRunner';
import { MobileShell } from '@/components/figma/MobileShell';

interface StartResponse {
  session_id: string;
  phase: string;
  tasks: BackendTask[];
  total_phases: number;
}

interface PhaseState {
  phase: string;
  tasks: BackendTask[];
}

export default function DiagnosticSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const learnerId = searchParams.get('learner_id') ?? '';

  const [phases, setPhases] = useState<PhaseState[]>([]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [taskIdx, setTaskIdx] = useState(0);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!sessionId) { router.replace('/dashboard'); return; }
    // Try to get phase A tasks from sessionStorage (stored by intro page after /start call)
    const stored = sessionStorage.getItem(`diag_tasks_${sessionId}`);
    if (stored) {
      try {
        const tasks = JSON.parse(stored) as BackendTask[];
        sessionStorage.removeItem(`diag_tasks_${sessionId}`);
        setPhases([{ phase: 'PHASE_A', tasks }]);
        setLoading(false);
        return;
      } catch {
        // fall through to API call
      }
    }
    // Fallback: shouldn't normally be reached, show error
    setError('Оношилгооны мэдээлэл ачаалахад алдаа гарлаа. Дахин оролдоно уу.');
    setLoading(false);
  }, [sessionId, router]);

  async function handleSubmit(taskId: string, answer: string): Promise<SubmitResult> {
    const data = await clientFetch<{ score: number; is_correct: boolean; feedback: string }>('/api/diagnostic/submit', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        task_id: taskId,
        input_text: answer,
        time_seconds: 30,
      }),
    });
    return { is_correct: data.is_correct, score: data.score, feedback: data.feedback ?? '' };
  }

  async function handleNext() {
    const currentPhase = phases[phaseIdx];
    if (!currentPhase) return;

    const nextTask = taskIdx + 1;

    if (nextTask < currentPhase.tasks.length) {
      setTaskIdx(nextTask);
      return;
    }

    // Phase complete — try to get next phase
    setShowPhaseTransition(true);
    try {
      const data = await clientFetch<{ tasks?: BackendTask[]; phase?: string; completed?: boolean }>('/api/diagnostic/next-phase', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });

      setShowPhaseTransition(false);

      if (data.completed || !data.tasks) {
        setDone(true);
      } else {
        setPhases((prev) => [...prev, { phase: data.phase ?? 'PHASE_B', tasks: data.tasks! }]);
        setPhaseIdx((i) => i + 1);
        setTaskIdx(0);
      }
    } catch {
      setShowPhaseTransition(false);
      setDone(true);
    }
  }

  useEffect(() => {
    if (done) {
      router.push(`/diagnostic/result?session_id=${sessionId}&learner_id=${learnerId}`);
    }
  }, [done, sessionId, learnerId, router]);

  if (loading) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '40px' }}>⏳</div>
          <p style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '18px', color: '#01618F', margin: 0 }}>
            Ачаалж байна...
          </p>
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          <p style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '14px', color: '#FB5151', textAlign: 'center' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '12px 24px', borderRadius: '9999px', border: 'none', background: '#01618F', color: 'white', fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
          >
            Буцах
          </button>
        </div>
      </MobileShell>
    );
  }

  if (showPhaseTransition) {
    const currentPhase = phases[phaseIdx];
    const phaseLabels: Record<string, string> = { A: 'A хэсэг', B: 'B хэсэг', C: 'C хэсэг' };
    return (
      <MobileShell>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '56px' }}>🌟</div>
          <p style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '24px', color: '#01618F', margin: 0 }}>
            Маш сайн!
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '15px', color: '#405E7E', margin: 0, lineHeight: '1.6' }}>
            {phaseLabels[currentPhase?.phase ?? 'A']} дууссан. Дараагийн хэсэг ачаалж байна...
          </p>
        </div>
      </MobileShell>
    );
  }

  const currentPhase = phases[phaseIdx];
  if (!currentPhase || currentPhase.tasks.length === 0) return null;

  const currentTask = currentPhase.tasks[taskIdx];
  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const completedSoFar = phases.slice(0, phaseIdx).reduce((s, p) => s + p.tasks.length, 0) + taskIdx;

  return (
    <TaskRunner
      task={currentTask}
      progress={{ current: completedSoFar + 1, total: Math.max(totalTasks, 20) }}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  );
}

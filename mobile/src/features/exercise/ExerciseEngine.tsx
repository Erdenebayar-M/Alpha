import { Component, type ReactNode } from 'react';

import Fallback from '@/src/features/exercise/renderers/Fallback';
import { registry } from '@/src/features/exercise/registry';
import { getInteractionForm } from '@/src/features/exercise/taskTypeMap';
import type { Task } from '@/src/features/exercise/types';

interface ExerciseEngineProps {
  task: Task;
  onResult: (isCorrect: boolean) => void;
}

interface RendererBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface RendererBoundaryState {
  hasError: boolean;
}

// A renderer plugged in via the registry can be buggy or handed malformed
// task data; this boundary guarantees the engine falls back instead of
// crashing the whole lesson/diagnostic screen.
class RendererBoundary extends Component<RendererBoundaryProps, RendererBoundaryState> {
  state: RendererBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RendererBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function ExerciseEngine({ task, onResult }: ExerciseEngineProps) {
  let interactionForm = 'fallback';
  try {
    interactionForm = task.interaction_form ?? getInteractionForm(task.task_type);
  } catch {
    interactionForm = 'fallback';
  }

  const Renderer = registry[interactionForm] ?? Fallback;

  return (
    <RendererBoundary key={task?.id} fallback={<Fallback task={task} onResult={onResult} />}>
      <Renderer task={task} onResult={onResult} />
    </RendererBoundary>
  );
}

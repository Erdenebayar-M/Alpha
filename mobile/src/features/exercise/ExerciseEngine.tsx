import { Component, type ComponentType, type ReactNode } from 'react';

import Fallback from '@/src/features/exercise/renderers/Fallback';
import { registry, type ExerciseRendererProps } from '@/src/features/exercise/registry';
import { getInteractionForm, inferInteractionForm } from '@/src/features/exercise/taskTypeMap';
import type { Task } from '@/src/features/exercise/types';

interface ExerciseEngineProps {
  task: Task;
  onResult: (isCorrect: boolean, inputText: string) => void;
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
  let Renderer: ComponentType<ExerciseRendererProps> = Fallback;
  try {
    // Prefer the task's own interaction_form, then the task_type map. Either may
    // resolve to a key that has no renderer (e.g. the backend serves a raw enum,
    // or the type is unmapped and getInteractionForm returns 'fallback'); in that
    // case infer a renderer from the options shape so a recognisable task still
    // renders instead of hitting the dead-end Fallback (which never advances).
    const primaryForm = task.interaction_form ?? getInteractionForm(task.task_type);
    const primary = primaryForm !== 'fallback' ? registry[primaryForm] : undefined;
    if (primary) {
      Renderer = primary;
    } else {
      const inferred = inferInteractionForm(task.options);
      Renderer = (inferred ? registry[inferred] : undefined) ?? Fallback;
    }
  } catch {
    Renderer = Fallback;
  }

  return (
    <RendererBoundary key={task?.id} fallback={<Fallback task={task} onResult={onResult} />}>
      <Renderer task={task} onResult={onResult} />
    </RendererBoundary>
  );
}

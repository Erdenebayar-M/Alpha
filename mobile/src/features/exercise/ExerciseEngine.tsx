import { Component, type ComponentType, type ReactNode } from 'react';

import Fallback from '@/src/features/exercise/renderers/Fallback';
import { registry, type ExerciseRendererProps } from '@/src/features/exercise/registry';
import { getInteractionForm } from '@/src/features/exercise/taskTypeMap';
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
  // task_type is the only dispatch key. The backend's own interaction_form
  // enum (CHOOSE/MATCH/FILL/ASSEMBLE/TRANSCRIBE/CORRECT/TAP — 7 values) has
  // no overlap with this registry's 27 renderer keys, so it can never resolve
  // a renderer directly; taskTypeMap's 43 task_type entries are what's
  // actually verified against the backend's per-type options shape.
  const form = getInteractionForm(task.task_type);
  const Renderer: ComponentType<ExerciseRendererProps> = registry[form] ?? Fallback;

  if (__DEV__ && task.interaction_form && task.interaction_form !== form) {
    console.warn(
      `[ExerciseEngine] task ${task.id} (${task.task_type}) has interaction_form ` +
        `"${task.interaction_form}" but taskTypeMap resolves it to "${form}" — ` +
        'rendering via taskTypeMap. If the backend now intends interaction_form ' +
        'to be authoritative, taskTypeMap needs a matching update.',
    );
  }

  return (
    <RendererBoundary key={task?.id} fallback={<Fallback task={task} onResult={onResult} />}>
      <Renderer task={task} onResult={onResult} />
    </RendererBoundary>
  );
}

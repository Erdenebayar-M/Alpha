import { Component, type ComponentType, type ReactNode } from 'react';

import Fallback from '@/src/features/exercise/renderers/Fallback';
import { registry, type ExerciseRendererProps } from '@/src/features/exercise/registry';
import {
  BACKEND_INTERACTION_FORMS,
  resolveInteractionForm,
} from '@/src/features/exercise/taskTypeMap';
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
  // Prefer task.interaction_form as an explicit renderer override when it
  // names a real registry entry (e.g. 'syllable_assemble_word' sharing
  // TT_1_4 with the default 'assemble_word'); otherwise dispatch via
  // taskTypeMap's task_type -> renderer entries, which are verified against
  // the backend's per-type options shape.
  const form = resolveInteractionForm(
    task.task_type,
    task.interaction_form,
    (key) => key in registry,
  );
  const Renderer: ComponentType<ExerciseRendererProps> = registry[form] ?? Fallback;

  if (
    __DEV__ &&
    task.interaction_form &&
    !(task.interaction_form in registry) &&
    !BACKEND_INTERACTION_FORMS.has(task.interaction_form)
  ) {
    console.warn(
      `[ExerciseEngine] task ${task.id} (${task.task_type}) has interaction_form ` +
        `"${task.interaction_form}", which is neither a known backend enum value ` +
        `nor a registered renderer key — rendering via taskTypeMap ("${form}"). ` +
        'This looks like drift between the client registry and the payload.',
    );
  }

  return (
    <RendererBoundary key={task?.id} fallback={<Fallback task={task} onResult={onResult} />}>
      <Renderer task={task} onResult={onResult} />
    </RendererBoundary>
  );
}

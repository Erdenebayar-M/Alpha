"use client";

import { Component } from "react";
import type { ComponentType, ReactNode } from "react";
import { diagnostic } from "@/lib/content";
import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import TaskCard from "@/components/register/TaskCard";
import { registry } from "@/components/register/exercise/registry";
import type { ExerciseProps } from "@/components/register/exercise/types";

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** A renderer that throws must not take the whole diagnostic down with it —
 *  the learner should still be able to reach the next exercise. Same guarantee
 *  mobile's RendererBoundary gives the lesson runner. Error boundaries have no
 *  hook form, hence the class. */
class RendererBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Picks the renderer for a task and hands it the card.
 *
 * This is the whole of the flow's knowledge about exercise types: everything
 * else — RegisterChildFlow, TaskCard, the setup steps — works in terms of "the
 * current task" and never in terms of what kind of task it is.
 */
export default function ExerciseEngine({ task, position, total, onResult }: ExerciseProps<DiagnosticTask>) {
  // Every registry entry accepts exactly its own task variant, but TypeScript
  // cannot correlate the key with the value through an index access, so the
  // lookup is widened once here rather than every renderer taking a widened
  // task and re-narrowing it.
  const Renderer = registry[task.form] as ComponentType<ExerciseProps<DiagnosticTask>>;

  return (
    <RendererBoundary
      key={task.id}
      fallback={
        <TaskCard
          position={position}
          total={total}
          prompt={task.prompt}
          canContinue
          onNext={() => onResult("")}
          className="gap-8"
        >
          <p className="w-full text-center text-base font-bold text-task-muted">{diagnostic.fallbackMessage}</p>
        </TaskCard>
      }
    >
      <Renderer task={task} position={position} total={total} onResult={onResult} />
    </RendererBoundary>
  );
}

"use client";

import { Component } from "react";
import type { ReactNode } from "react";

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * A renderer that throws must not take the whole diagnostic down with it — the
 * learner should still be able to reach the next exercise. Same guarantee
 * mobile's RendererBoundary gives the lesson runner. Error boundaries have no
 * hook form, hence the class.
 *
 * Both engines mount it keyed on the task id, so a crash is contained to the
 * task that caused it and the next one gets a fresh boundary.
 */
export default class RendererBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

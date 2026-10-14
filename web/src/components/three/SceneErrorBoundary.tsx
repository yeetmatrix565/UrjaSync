'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort guard around the WebGL canvas. React has no hook equivalent, so
 * this is intentionally the only class component in the codebase: if the
 * renderer throws at runtime, the 2D dashboard must keep working.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    /* swallow - the gradient fallback is the user-facing signal */
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

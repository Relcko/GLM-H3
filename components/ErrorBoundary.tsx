"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[Relcko] Boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/40">
                Something rendered unexpectedly
              </p>
              <p className="mt-2 text-sm text-white/60">
                {this.state.message ?? "Please refresh the page."}
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

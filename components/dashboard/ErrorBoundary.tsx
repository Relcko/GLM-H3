"use client";

import { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-3 text-warning/60">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.3" opacity="0.3" />
              <path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-white/50">Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

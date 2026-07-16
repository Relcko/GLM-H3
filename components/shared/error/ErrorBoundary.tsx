"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { cn } from "@/lib/shared/cn";
import { Button } from "@/components/shared/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-3 text-warning/60" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.3" opacity="0.3" />
            <path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-white/50">Something went wrong{this.props.context ? ` in ${this.props.context}` : ""}</p>
          {this.state.error && (
            <p className="mt-1 max-w-md text-xs text-white/30">{this.state.error.message}</p>
          )}
          <Button variant="secondary" size="sm" onClick={this.handleRetry} className="mt-4">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children, context = "this page" }: { children: ReactNode; context?: string }) {
  return <ErrorBoundary context={context}>{children}</ErrorBoundary>;
}

export function SectionErrorBoundary({ children, context = "this section" }: { children: ReactNode; context?: string }) {
  return <ErrorBoundary context={context}>{children}</ErrorBoundary>;
}

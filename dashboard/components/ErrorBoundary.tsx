"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render errors in child components
 * and displays a fallback UI instead of crashing the entire page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            background: "var(--color-fill-danger)",
            border: "1px solid var(--color-status-danger)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5) var(--space-6)",
            margin: "var(--space-4) 0",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-caption)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-status-danger)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "var(--space-2)",
            }}
          >
            Something went wrong
          </div>
          <p
            style={{
              fontSize: "var(--font-size-body)",
              color: "var(--color-text-primary)",
              lineHeight: "var(--line-height-normal)",
              marginBottom: "var(--space-3)",
            }}
          >
            An unexpected error occurred while rendering this section.
            Try refreshing the page.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: "var(--font-size-caption)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)",
                background: "var(--color-fill-neutral)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                overflow: "auto",
                maxHeight: 100,
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--font-size-caption)",
              fontWeight: "var(--font-weight-semi)",
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
            background: "color-mix(in srgb, var(--status-critical, #dc2626) 8%, transparent)",
            border: "1px solid var(--status-critical, #dc2626)",
            borderRadius: 6,
            padding: "20px 24px",
            margin: "16px 0",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--status-critical, #dc2626)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary, #475569)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            An unexpected error occurred while rendering this section.
            Try refreshing the page.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--text-muted, #94a3b8)",
                background: "var(--bg-panel, #f8fafc)",
                padding: "8px 10px",
                borderRadius: 4,
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
              marginTop: 12,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-mono, monospace)",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 4,
              background: "var(--bg-card, white)",
              color: "var(--text-primary, #1e293b)",
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

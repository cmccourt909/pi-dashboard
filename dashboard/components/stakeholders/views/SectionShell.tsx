"use client";

import type { ReactNode } from "react";

interface SectionShellProps {
  title: string;
  children: ReactNode;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

export default function SectionShell({ title, children, onCopy, onRegenerate }: SectionShellProps) {
  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-5)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-h2)", fontWeight: 600, margin: 0 }}>{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {onCopy && (
            <button
              onClick={onCopy}
              title="Copy"
              style={{
                padding: 6,
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              📋
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              title="Regenerate"
              style={{
                padding: 6,
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              🔄
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

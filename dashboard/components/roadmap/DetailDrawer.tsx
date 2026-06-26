"use client";

import { useEffect, useRef, useCallback } from "react";
import type { FeatureItem } from "@/types/roadmap";
import LodestarPanel from "./LodestarPanel";

/**
 * DetailDrawer is a 300px fixed-width slide-in panel from the right edge.
 *
 * Displays feature metadata, progress bar, dependency list, and AI narrative.
 * Supports close on Escape, close button click, and click outside.
 * Applies `inert` attribute on background content for focus trapping.
 * Respects `prefers-reduced-motion` to disable animation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

interface DetailDrawerProps {
  feature: FeatureItem | null;
  open: boolean;
  onClose: () => void;
}

const ANIMATION_DURATION_MS = 200;

/** RAG status badge colors using Northline semantic tokens */
const RAG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: "var(--color-fill-success)", text: "var(--color-status-success)", label: "On Track" },
  amber: { bg: "var(--color-fill-warning)", text: "var(--color-status-warning)", label: "At Risk" },
  red: { bg: "var(--color-fill-danger)", text: "var(--color-status-danger)", label: "Blocked" },
};

export default function DetailDrawer({ feature, open, onClose }: DetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Store previously focused element when opening
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
    }
  }, [open]);

  // Auto-focus close button when opened
  useEffect(() => {
    if (open && closeButtonRef.current) {
      // Small delay to allow transition to start
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Return focus on close
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (el && typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Apply inert attribute on background content
  useEffect(() => {
    const mainContent = document.getElementById("roadmap-main-content");
    if (!mainContent) return;

    if (open) {
      mainContent.setAttribute("inert", "");
    } else {
      mainContent.removeAttribute("inert");
    }

    return () => {
      mainContent.removeAttribute("inert");
    };
  }, [open]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open && !feature) return null;

  const completion = feature?.pi_completion?.[0];
  const donePct = completion?.done_pct ?? 0;
  const progPct = completion?.prog_pct ?? 0;
  const todoPct = completion?.todo_pct ?? 0;
  const ragInfo = feature ? RAG_COLORS[feature.rag_status] : null;

  return (
    <>
      {/* Overlay to capture outside clicks */}
      <div
        data-testid="drawer-overlay"
        onClick={handleOverlayClick}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          background: open ? "var(--color-surface-overlay)" : "transparent",
          pointerEvents: open ? "auto" : "none",
          transition: `background ${ANIMATION_DURATION_MS}ms ease`,
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label={
          feature
            ? `Feature details for ${feature.feature_key}`
            : "Feature details"
        }
        data-testid="detail-drawer"
        className="detail-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          background: "var(--color-surface-card)",
          boxShadow: "var(--shadow-drawer)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform ${ANIMATION_DURATION_MS}ms ease`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {feature && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflowY: "auto",
              padding: "var(--space-5)",
            }}
          >
            {/* Header: Feature key + close button */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "var(--space-4)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-size-h2)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-text-primary)",
                  margin: 0,
                  lineHeight: "var(--line-height-snug)",
                  wordBreak: "break-word",
                  flex: 1,
                  marginRight: "var(--space-2)",
                }}
              >
                {feature.feature_key}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close detail drawer"
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--font-size-h3)",
                  color: "var(--color-text-secondary)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-md)",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--color-fill-info)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                ✕
              </button>
            </div>

            {/* Summary + assignee */}
            <div style={{ marginBottom: "var(--space-3)" }}>
              <p
                style={{
                  fontSize: "var(--font-size-body)",
                  color: "var(--color-text-primary)",
                  margin: 0,
                  lineHeight: "var(--line-height-snug)",
                  marginBottom: "var(--space-1)",
                }}
              >
                {feature.summary}
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-caption)",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                Assignee:{" "}
                <span style={{ color: "var(--color-text-primary)", fontWeight: "var(--font-weight-medium)" }}>
                  {feature.assignee || "Unassigned"}
                </span>
              </p>
            </div>

            {/* RAG status badge */}
            {ragInfo && (
              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-semi)",
                    background: ragInfo.bg,
                    color: ragInfo.text,
                  }}
                >
                  {ragInfo.label}
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div style={{ marginBottom: "var(--space-4)" }}>
              <h3
                style={{
                  fontSize: "var(--font-size-label)",
                  fontWeight: "var(--font-weight-semi)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  marginBottom: "var(--space-2)",
                }}
              >
                Progress
              </h3>
              <div
                style={{
                  display: "flex",
                  height: 14,
                  borderRadius: 4,
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                {donePct > 0 && (
                  <div
                    aria-label={`${Math.round(donePct)}% done`}
                    style={{
                      width: `${donePct}%`,
                      height: "100%",
                      backgroundColor: "var(--color-status-success)",
                    }}
                  />
                )}
                {progPct > 0 && (
                  <div
                    aria-label={`${Math.round(progPct)}% in-progress`}
                    style={{
                      width: `${progPct}%`,
                      height: "100%",
                      backgroundColor: "var(--color-status-warning)",
                    }}
                  />
                )}
                {todoPct > 0 && (
                  <div
                    aria-label={`${Math.round(todoPct)}% todo`}
                    style={{
                      width: `${todoPct}%`,
                      height: "100%",
                      backgroundColor: "var(--color-brand-slate)",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "var(--space-1)",
                  fontSize: "var(--font-size-label)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>Done {Math.round(donePct)}%</span>
                <span>In Progress {Math.round(progPct)}%</span>
                <span>Todo {Math.round(todoPct)}%</span>
              </div>
            </div>

            {/* Dependency section */}
            <div id="drawer-dependencies" style={{ marginBottom: "var(--space-4)" }}>
              <h3
                style={{
                  fontSize: "var(--font-size-label)",
                  fontWeight: "var(--font-weight-semi)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  marginBottom: "var(--space-2)",
                }}
              >
                Dependencies
              </h3>

              {/* Blocks list */}
              <div style={{ marginBottom: "var(--space-3)" }}>
                <p
                  style={{
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-semi)",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Blocks
                </p>
                {feature.blockers.length > 0 ? (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                    }}
                  >
                    {feature.blockers.map((key) => (
                      <li
                        key={key}
                        style={{
                          fontSize: "var(--font-size-caption)",
                          color: "var(--color-text-primary)",
                          padding: "2px 0",
                        }}
                      >
                        {key}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      fontSize: "var(--font-size-caption)",
                      color: "var(--color-text-tertiary)",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    None
                  </p>
                )}
              </div>

              {/* Blocked By list */}
              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-semi)",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Blocked By
                </p>
                {feature.is_blocked_by.length > 0 ? (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                    }}
                  >
                    {feature.is_blocked_by.map((key) => (
                      <li
                        key={key}
                        style={{
                          fontSize: "var(--font-size-caption)",
                          color: "var(--color-text-primary)",
                          padding: "2px 0",
                        }}
                      >
                        {key}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      fontSize: "var(--font-size-caption)",
                      color: "var(--color-text-tertiary)",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    None
                  </p>
                )}
              </div>
            </div>

            {/* Lodestar AI Panel */}
            <LodestarPanel
              text={feature.lodestar_static}
              featureKey={feature.feature_key}
              generatedAt={feature.generated_at}
              pi={feature.pi_completion[0]?.pi_name ?? null}
            />
          </div>
        )}
      </div>

      {/* Reduced motion override */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (prefers-reduced-motion: reduce) {
              [data-testid="detail-drawer"],
              [data-testid="drawer-overlay"] {
                transition: none !important;
              }
            }
          `,
        }}
      />
    </>
  );
}

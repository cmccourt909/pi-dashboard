"use client";

import { useEffect, useRef, useCallback } from "react";
import type { FeatureItem } from "@/types/roadmap";
import LodestarPanel from "./LodestarPanel";

interface DetailDrawerProps {
  feature: FeatureItem | null;
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 300;
const ANIMATION_DURATION_MS = 200;

const RAG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: "#dcfce7", text: "#166534", label: "On Track" },
  amber: { bg: "#fef3c7", text: "#92400e", label: "At Risk" },
  red: { bg: "#fee2e2", text: "#991b1b", label: "Blocked" },
};

export default function DetailDrawer({ feature, open, onClose }: DetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
    }
  }, [open]);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open && previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (el && typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const mainContent = document.getElementById("roadmap-main-content");
    if (!mainContent) return;
    if (open) {
      mainContent.setAttribute("inert", "");
    } else {
      mainContent.removeAttribute("inert");
    }
    return () => mainContent.removeAttribute("inert");
  }, [open]);

  const handleOverlayClick = useCallback(() => onClose(), [onClose]);

  if (!open && !feature) return null;

  const completion = feature?.pi_completion?.[0];
  const donePct = completion?.done_pct ?? 0;
  const progPct = completion?.prog_pct ?? 0;
  const todoPct = completion?.todo_pct ?? 0;
  const ragInfo = feature ? RAG_COLORS[feature.rag_status] : null;

  return (
    <>
      <div
        data-testid="drawer-overlay"
        onClick={handleOverlayClick}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          background: open ? "rgba(0, 0, 0, 0.2)" : "transparent",
          pointerEvents: open ? "auto" : "none",
          transition: `background ${ANIMATION_DURATION_MS}ms ease`,
        }}
      />

      <div
        role="dialog"
        aria-label={feature ? `Feature details for ${feature.feature_key}` : "Feature details"}
        data-testid="detail-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          zIndex: 999,
          background: "#ffffff",
          boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform ${ANIMATION_DURATION_MS}ms ease`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {feature && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0, lineHeight: 1.3, wordBreak: "break-word", flex: 1, marginRight: 8 }}>
                {feature.feature_key}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close detail drawer"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b", padding: "2px 6px", borderRadius: 4, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.4, marginBottom: 6 }}>
                {feature.summary}
              </p>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                Assignee:{" "}
                <span style={{ color: "#334155", fontWeight: 500 }}>
                  {feature.assignee || "Unassigned"}
                </span>
              </p>
            </div>

            {ragInfo && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: ragInfo.bg, color: ragInfo.text }}>
                  {ragInfo.label}
                </span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", margin: 0, marginBottom: 8 }}>
                Progress
              </h3>
              <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", width: "100%" }}>
                {donePct > 0 && <div aria-label={`${Math.round(donePct)}% done`} style={{ width: `${donePct}%`, height: "100%", backgroundColor: "#0d9488" }} />}
                {progPct > 0 && <div aria-label={`${Math.round(progPct)}% in-progress`} style={{ width: `${progPct}%`, height: "100%", backgroundColor: "rgba(59, 130, 246, 0.6)" }} />}
                {todoPct > 0 && <div aria-label={`${Math.round(todoPct)}% todo`} style={{ width: `${todoPct}%`, height: "100%", backgroundColor: "rgba(156, 163, 175, 0.4)" }} />}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#64748b" }}>
                <span>Done {Math.round(donePct)}%</span>
                <span>In Progress {Math.round(progPct)}%</span>
                <span>Todo {Math.round(todoPct)}%</span>
              </div>
            </div>

            <div id="drawer-dependencies" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", margin: 0, marginBottom: 8 }}>
                Dependencies
              </h3>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: 0, marginBottom: 4 }}>Blocks</p>
                {feature.blockers.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {feature.blockers.map((key) => (
                      <li key={key} style={{ fontSize: 12, color: "#334155", padding: "2px 0" }}>{key}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>None</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: 0, marginBottom: 4 }}>Blocked By</p>
                {feature.is_blocked_by.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {feature.is_blocked_by.map((key) => (
                      <li key={key} style={{ fontSize: 12, color: "#334155", padding: "2px 0" }}>{key}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>None</p>
                )}
              </div>
            </div>

            {/* key={feature.feature_key} forces remount on feature switch,
                resetting useLodestarStream to idle and opening a fresh stream.
                Fix for T2.2 — Lodestar panel does not update on feature switch. */}
            <LodestarPanel
              key={feature.feature_key}
              text={feature.lodestar_static}
              featureKey={feature.feature_key}
              generatedAt={feature.generated_at}
              pi={feature.pi_completion?.[0]?.pi_name ?? ""}
              active={open}
            />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (prefers-reduced-motion: reduce) {
          [data-testid="detail-drawer"],
          [data-testid="drawer-overlay"] {
            transition: none !important;
          }
        }
      `}} />
    </>
  );
}

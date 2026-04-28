"use client";

import { useState, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────

interface UploadResult {
  status: string;
  file_type: "stories_csv" | "features_xlsx";
  filename: string;
  rows_read: number;
  inserted: Record<string, number>;
  warnings: string[];
}

type UploadState = "idle" | "uploading" | "success" | "error";

// ── helpers ──────────────────────────────────────────────────────────────────

function fileTypeLabel(ft: string) {
  if (ft === "stories_csv") return "Stories CSV";
  if (ft === "features_xlsx") return "Features XLSX";
  return ft;
}

function InsertedTable({ inserted }: { inserted: Record<string, number> }) {
  const rows = Object.entries(inserted).filter(([, v]) => v > 0);
  if (!rows.length) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: "3px 0", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {k.replace(/_/g, " ")}
            </td>
            <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-healthy)" }}>
              +{v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<UploadResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setState("uploading");
    setResult(null);
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail ?? `HTTP ${res.status}`);
      }
      setResult(json as UploadResult);
      setHistory((h) => [json as UploadResult, ...h.slice(0, 9)]);
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      // reset so same file can be re-uploaded
      e.target.value = "";
    },
    [upload]
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* ── page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div className="label" style={{ marginBottom: 6 }}>Admin</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
          }}
        >
          JIRA DATA UPLOAD
        </h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Upload a Jira export to refresh the PI dashboard. Two file types are
          supported — you can upload them in either order.
        </p>
      </div>

      {/* ── accepted file types ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Stories CSV",
            hint: "Stories under Features_Epic_*.csv",
            detail: "Ingests stories, sprints, PIs and feature memberships.",
            color: "var(--accent)",
          },
          {
            label: "Features XLSX",
            hint: "Isaac to IO Cigna Features *.xlsx",
            detail: "Updates feature-level status & PI assignment.",
            color: "var(--status-warning)",
          },
        ].map((t) => (
          <div
            key={t.label}
            className="panel"
            style={{ padding: "14px 16px" }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: t.color,
                marginBottom: 4,
              }}
            >
              {t.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              {t.hint}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t.detail}
            </div>
          </div>
        ))}
      </div>

      {/* ── drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: 6,
          padding: "48px 32px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "var(--accent-glow)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
          userSelect: "none",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={onFileChange}
        />

        {state === "uploading" ? (
          <div>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid var(--border-strong)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              Uploading…
            </div>
          </div>
        ) : (
          <>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block" }}>
              <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15v2a4 4 0 004 4h10a4 4 0 004-4v-2" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>
              Drop file here or click to browse
            </div>
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              .csv · .xlsx · .xls
            </div>
          </>
        )}
      </div>

      {/* ── result panel ── */}
      {state === "success" && result && (
        <div
          className="panel"
          style={{
            marginTop: 20,
            padding: "16px 20px",
            borderColor: "var(--status-healthy)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--status-healthy)",
                  letterSpacing: "0.08em",
                }}
              >
                ✓ {fileTypeLabel(result.file_type)} ingested
              </span>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {result.filename} · {result.rows_read} rows read
              </div>
            </div>
          </div>

          <InsertedTable inserted={result.inserted} />

          {result.warnings.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 4 }}>Warnings ({result.warnings.length})</div>
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "8px 10px",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--status-warning)",
                      lineHeight: 1.6,
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div
          className="panel"
          style={{
            marginTop: 20,
            padding: "14px 18px",
            borderColor: "var(--status-critical)",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--status-critical)", marginBottom: 4 }}>
            ✗ Upload failed
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── upload history ── */}
      {history.length > 1 && (
        <div style={{ marginTop: 32 }}>
          <div className="label" style={{ marginBottom: 12 }}>Upload history (this session)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(1).map((h, i) => (
              <div
                key={i}
                className="panel"
                style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>
                    {h.filename}
                  </span>
                  <span
                    style={{
                      marginLeft: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--accent)",
                    }}
                  >
                    {fileTypeLabel(h.file_type)}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                  {h.rows_read} rows
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── usage tips ── */}
      <div style={{ marginTop: 40, padding: "16px 20px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="label" style={{ marginBottom: 10 }}>Upload tips</div>
        {[
          "Upload the Features XLSX first to populate feature metadata, then upload the Stories CSV to link stories to features.",
          "If you upload in reverse order, feature names will be backfilled automatically on re-upload.",
          "Uploading the same file twice is safe — all operations are upserts.",
          "The PI name and date range are parsed automatically from the Jira PI field (e.g. \"PI 26.2 (03/12/26 - 05/20/26)\").",
        ].map((tip, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: i < 3 ? 8 : 0,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>→</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

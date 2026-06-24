"use client";

import { useState, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/api";

interface UploadResult {
  status: string;
  file_type: "stories_csv" | "features_xlsx";
  filename: string;
  rows_read: number;
  inserted: Record<string, number>;
  warnings: string[];
}

type UploadState = "idle" | "uploading" | "success" | "error";

function fileTypeLabel(ft: string) {
  if (ft === "stories_csv") return "Stories CSV";
  if (ft === "features_xlsx") return "Features XLSX";
  return ft;
}

export default function AdminPage() {
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadKey, setUploadKey] = useState("");
  const [seedState, setSeedState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [seedMsg, setSeedMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const seedDemo = useCallback(async () => {
    setSeedState("loading");
    setSeedMsg("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (uploadKey) headers["X-Upload-Key"] = uploadKey;
      const res = await fetch(`${API_BASE}/api/seed-demo`, { method: "POST", headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`);
      setSeedState("done");
      setSeedMsg(json.message || "Demo data loaded!");
    } catch (err: unknown) {
      setSeedState("error");
      setSeedMsg(err instanceof Error ? err.message : String(err));
    }
  }, [uploadKey]);

  const upload = useCallback(async (file: File) => {
    setState("uploading");
    setResult(null);
    setErrorMsg("");
    const form = new FormData();
    form.append("file", file);
    try {
      const headers: Record<string, string> = {};
      if (uploadKey) headers["X-Upload-Key"] = uploadKey;
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form, headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`);
      setResult(json as UploadResult);
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [uploadKey]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }, [upload]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
          Administration
        </p>
        <h1>Data upload</h1>
        <p style={{ marginTop: "var(--space-2)" }}>
          Upload a Jira export to refresh the dashboard. Stories CSV and Features XLSX are supported.
        </p>
      </div>

      {/* Upload key */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
          Upload API key
        </label>
        <input
          type="password"
          placeholder="Enter upload key…"
          value={uploadKey}
          onChange={(e) => setUploadKey(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            border: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "#FFFFFF",
            color: "var(--color-text)",
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-border-em)"}`,
          borderRadius: "var(--radius-lg)",
          padding: "48px var(--space-8)",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "var(--color-accent-light)" : "#FFFFFF",
          transition: "border-color 0.15s, background 0.15s",
          marginBottom: "var(--space-5)",
        }}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={onFileChange} />
        {state === "uploading" ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Uploading…</p>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto var(--space-3)", display: "block", color: "var(--color-indigo-400)" }}>
              <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15v2a4 4 0 004 4h10a4 4 0 004-4v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>Drop CSV or XLSX</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>.csv · .xlsx · .xls</p>
          </>
        )}
      </div>

      {/* Result */}
      {state === "success" && result && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid var(--color-success)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-5)" }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-success)", marginBottom: 4 }}>
            ✓ {fileTypeLabel(result.file_type)} ingested — {result.rows_read} rows
          </p>
          {Object.entries(result.inserted).filter(([, v]) => v > 0).map(([k, v]) => (
            <span key={k} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", marginRight: 12 }}>
              {k.replace(/_/g, " ")}: +{v}
            </span>
          ))}
        </div>
      )}

      {state === "error" && (
        <div style={{ background: "var(--color-danger-bg)", border: "0.5px solid var(--color-danger)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-5)", fontSize: 13, color: "var(--color-danger)" }}>
          Upload failed: {errorMsg}
        </div>
      )}

      {/* Demo data */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", marginTop: "var(--space-8)" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>Demo data</p>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Load anonymized demo data (PI 26.2 &amp; 26.3) with 3 teams, 6 features, ~100 stories, and risk findings. Replaces all existing data.
        </p>
        <button
          onClick={seedDemo}
          disabled={seedState === "loading"}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent)",
            color: "white",
            cursor: seedState === "loading" ? "wait" : "pointer",
            opacity: seedState === "loading" ? 0.6 : 1,
          }}
        >
          {seedState === "loading" ? "Seeding…" : "Load demo data"}
        </button>
        {seedState === "done" && <span style={{ marginLeft: 12, fontSize: 12, color: "var(--color-success)" }}>✓ {seedMsg}</span>}
        {seedState === "error" && <span style={{ marginLeft: 12, fontSize: 12, color: "var(--color-danger)" }}>✗ {seedMsg}</span>}
      </div>
    </div>
  );
}

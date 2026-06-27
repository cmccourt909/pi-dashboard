"use client";

import { useRef, useState, useCallback } from "react";

interface TranscriptDockProps {
  onUploadComplete: (sessionId: string, filename: string) => void;
}

export default function TranscriptDock({ onUploadComplete }: TranscriptDockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setWarning(null);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["txt", "vtt", "srt", "docx"].includes(ext || "")) {
      setError("Unsupported format. Please use .txt, .vtt, .srt, or .docx");
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File exceeds 25 MB limit.");
      return;
    }

    setUploading(true);
    setError(null);
    setWarning(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/stakeholders/upload", { method: "POST", body: formData });

      if (res.status === 413) { setError("File exceeds size limit."); return; }
      if (res.status === 415) { setError("Unsupported file format."); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((d: any) => d.msg || JSON.stringify(d)).join("; "));
        } else if (typeof detail === "string") {
          setError(detail);
        } else {
          setError(`Upload failed (${res.status})`);
        }
        return;
      }

      const data = await res.json();
      if (data.warning) setWarning(data.warning);
      onUploadComplete(data.session_id, data.filename);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-5)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <div>
          <h2 style={{ fontSize: "var(--font-size-h2)", fontWeight: 600, margin: 0 }}>Transcript</h2>
          <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)" }}>
            Upload a meeting transcript to generate analysis across eight dimensions.
          </div>
        </div>
        {/* Options row (desktop only) */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)" }}>
          <span>Speaker attribution</span>
          <select style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-sm)", padding: "2px 6px", fontSize: 12 }} defaultValue="auto">
            <option>auto</option><option>manual</option><option>none</option>
          </select>
          <span>Language</span>
          <select style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-sm)", padding: "2px 6px", fontSize: 12 }}>
            <option>EN</option><option>ES</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" defaultChecked />Anonymize PII
          </label>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--color-interactive-primary)" : "#cdc7d2"}`,
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          cursor: "pointer",
          transition: "border-color 0.15s",
          background: dragOver ? "var(--color-fill-info)" : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ padding: 8, borderRadius: "var(--radius-md)", background: "var(--color-fill-info)", color: "var(--color-interactive-primary)", fontSize: 18 }}>
            📤
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-body)", fontWeight: 500 }}>Drag & drop a .vtt, .srt, .txt or .docx — or browse</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Max 25 MB · 90 minutes recommended</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          {selectedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: "var(--radius-pill)", background: "var(--color-fill-info)", color: "var(--color-interactive-primary)", fontSize: 12 }}>
              📄 {selectedFile.name} · {formatSize(selectedFile.size)}
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "none",
              fontSize: 12,
              fontWeight: 500,
              background: "var(--color-interactive-primary)",
              color: "#fff",
              cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
              opacity: !selectedFile || uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading…" : "Upload & Analyze"}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.vtt,.srt,.docx" onChange={handleFileChange} style={{ display: "none" }} />

      {/* Error/Warning messages */}
      {error && <div role="alert" style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-body)", color: "var(--color-status-danger)" }}>{error}</div>}
      {warning && <div role="status" style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-body)", color: "var(--color-status-warning)" }}>⚠️ {warning}</div>}
    </div>
  );
}

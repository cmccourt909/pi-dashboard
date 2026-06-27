"use client";

import { useRef, useState } from "react";

interface TranscriptUploaderProps {
  onUploadComplete: (sessionId: string, filename: string) => void;
}

/**
 * TranscriptUploader — file input accepting .txt files, with validation,
 * loading state, and inline error/warning display.
 */
export default function TranscriptUploader({ onUploadComplete }: TranscriptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setWarning(null);
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Client-side validation
    if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
      setError("Only .txt files are supported.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    setError(null);
    setWarning(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/stakeholders/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 413) {
        setError("File exceeds 5MB limit.");
        return;
      }
      if (res.status === 415) {
        setError("Only .txt files are supported.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // FastAPI 422 returns detail as array of {type, loc, msg, input}
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
      if (data.warning) {
        setWarning(data.warning);
      }
      onUploadComplete(data.session_id, data.filename);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* File input row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <label
          htmlFor="transcript-file"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            minHeight: 36,
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-body)",
            fontWeight: 500,
            border: "0.5px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-card)",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          Choose File
        </label>
        <input
          ref={fileInputRef}
          id="transcript-file"
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          style={{ display: "none" }}
          aria-label="Select transcript file"
        />

        {selectedFile && (
          <span style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)" }}>
            {selectedFile.name} ({formatSize(selectedFile.size)})
          </span>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          aria-busy={uploading}
          style={{
            minHeight: 36,
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-body)",
            fontWeight: 500,
            border: "none",
            borderRadius: "var(--radius-md)",
            background: "var(--color-interactive-primary)",
            color: "var(--color-text-inverse)",
            cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
            opacity: !selectedFile || uploading ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {uploading ? "Uploading…" : "Upload & Analyze"}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <p
          role="alert"
          style={{
            fontSize: "var(--font-size-body)",
            color: "var(--color-status-danger)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* Warning display */}
      {warning && (
        <p
          role="status"
          style={{
            fontSize: "var(--font-size-body)",
            color: "var(--color-status-warning)",
            margin: 0,
          }}
        >
          ⚠️ {warning}
        </p>
      )}
    </div>
  );
}

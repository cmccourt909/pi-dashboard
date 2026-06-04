"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/api";

// ─── Palette & tokens ────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');

  .dsp-root {
    --bg: #eef0f4;
    --surface: #ffffff;
    --surface2: #f4f5f7;
    --border: #e0e3e8;
    --green: #1a7f4b;
    --green-bg: #e8f5ee;
    --red: #c0392b;
    --red-bg: #fdecea;
    --amber: #b45309;
    --amber-bg: #fef3e2;
    --blue: #1d5fa6;
    --blue-bg: #e8f0fb;
    --muted: #6b7280;
    --text: #111827;
    --text-dim: #4b5563;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'Inter', sans-serif;
    --radius: 6px;
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 32px 32px;
  }

  /* ── Header ── */
  .dsp-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .dsp-eyebrow {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .dsp-title {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--text);
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  .dsp-mock-badge {
    font-family: var(--mono);
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 3px;
    background: #fef3e2;
    color: #b45309;
    border: 1px solid #f6c87a;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-left: 4px;
    vertical-align: middle;
  }

  /* ── Ingest panel ── */
  .dsp-ingest {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    margin-bottom: 24px;
  }
  .dsp-ingest-label {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .dsp-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    width: fit-content;
    background: var(--surface2);
  }
  .dsp-tab {
    padding: 6px 18px;
    font-family: var(--mono);
    font-size: 11px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .dsp-tab.active {
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .dsp-textarea {
    width: 100%;
    min-height: 140px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    padding: 12px 14px;
    resize: vertical;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;
  }
  .dsp-textarea:focus { border-color: #6b9fd4; box-shadow: 0 0 0 3px rgba(107,159,212,0.15); }
  .dsp-textarea::placeholder { color: #9ca3af; }

  .dsp-dropzone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 36px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    background: var(--surface2);
  }
  .dsp-dropzone:hover, .dsp-dropzone.drag { border-color: #6b9fd4; background: #f0f5fb; }
  .dsp-dropzone-icon { font-size: 24px; margin-bottom: 8px; }
  .dsp-dropzone-text { font-size: 13px; color: var(--text-dim); }
  .dsp-dropzone-hint { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px; }
  .dsp-file-name {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--green);
    margin-top: 10px;
  }

  .dsp-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    align-items: center;
  }
  .dsp-btn {
    padding: 8px 20px;
    border-radius: var(--radius);
    border: none;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    letter-spacing: 0.5px;
  }
  .dsp-btn:active { transform: scale(0.97); }
  .dsp-btn-primary { background: var(--text); color: #fff; }
  .dsp-btn-primary:hover { background: #374151; }
  .dsp-btn-secondary { background: var(--surface2); color: var(--text-dim); border: 1px solid var(--border); }
  .dsp-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .dsp-status {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
  }

  /* ── Section labels ── */
  .dsp-section-label {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 12px;
    padding-top: 4px;
  }

  /* ── Summary stat bar (top of dashboard) ── */
  .dsp-stat-bar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    divide: var(--border);
    margin-bottom: 24px;
    overflow: hidden;
  }
  .dsp-stat {
    flex: 1;
    padding: 16px 20px;
    border-right: 1px solid var(--border);
  }
  .dsp-stat:last-child { border-right: none; }
  .dsp-stat-label {
    font-family: var(--mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .dsp-stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
  }
  .dsp-stat-value.red { color: var(--red); }
  .dsp-stat-value.amber { color: var(--amber); }
  .dsp-stat-value.green { color: var(--green); }

  /* ── Cards grid ── */
  .dsp-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }
  .dsp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
  }
  .dsp-card-label {
    font-family: var(--mono);
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 6px;
  }
  .dsp-card-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
    color: var(--text);
  }
  .dsp-card-value.green { color: var(--green); }
  .dsp-card-value.red { color: var(--red); }
  .dsp-card-value.amber { color: var(--amber); }
  .dsp-card-value.blue { color: var(--blue); }
  .dsp-card-sub {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.4;
  }

  /* ── Status chip (HEALTHY / CRITICAL / PENDING style) ── */
  .dsp-status-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 3px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .dsp-status-chip.green { background: var(--green-bg); color: var(--green); border: 1px solid #a7d7bb; }
  .dsp-status-chip.red { background: var(--red-bg); color: var(--red); border: 1px solid #f5b7b1; }
  .dsp-status-chip.amber { background: var(--amber-bg); color: var(--amber); border: 1px solid #f6c87a; }
  .dsp-status-chip.blue { background: var(--blue-bg); color: var(--blue); border: 1px solid #a8c4e8; }
  .dsp-chip-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  .dsp-chip-dot.green { background: var(--green); }
  .dsp-chip-dot.red { background: var(--red); }
  .dsp-chip-dot.amber { background: var(--amber); }
  .dsp-chip-dot.blue { background: var(--blue); }

  /* ── Two column blocks ── */
  .dsp-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (max-width: 700px) { .dsp-two-col { grid-template-columns: 1fr; } }
  .dsp-block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
  }
  .dsp-block-title {
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text);
    margin-bottom: 12px;
  }
  .dsp-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .dsp-dot.red { background: var(--red); }
  .dsp-dot.green { background: var(--green); }
  .dsp-dot.amber { background: var(--amber); }
  .dsp-dot.blue { background: var(--blue); }

  .dsp-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .dsp-list-item {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    padding: 8px 10px 8px 12px;
    border-left: 3px solid var(--border);
    background: var(--surface2);
    border-radius: 0 4px 4px 0;
  }
  .dsp-list-item.risk { border-left-color: var(--red); }
  .dsp-list-item.decision { border-left-color: var(--green); }
  .dsp-list-item.assumption { border-left-color: var(--amber); }
  .dsp-severity {
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 6px;
  }
  .dsp-severity.HIGH { color: var(--red); }
  .dsp-severity.MEDIUM { color: var(--amber); }
  .dsp-severity.LOW { color: var(--muted); }

  /* ── Action items table ── */
  .dsp-table-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 24px;
  }
  .dsp-table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .dsp-table-title {
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text);
  }
  .dsp-badge {
    font-family: var(--mono);
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--border);
    color: var(--muted);
  }
  table.dsp-table { width: 100%; border-collapse: collapse; }
  .dsp-table th {
    font-family: var(--mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
    padding: 9px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .dsp-table td {
    padding: 10px 16px;
    font-size: 12px;
    color: var(--text-dim);
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .dsp-table tr:last-child td { border-bottom: none; }
  .dsp-table tr:hover td { background: var(--surface2); }
  .dsp-owner-chip {
    font-family: var(--mono);
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
    display: inline-block;
  }
  .dsp-cat-chip {
    font-family: var(--mono);
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 3px;
    display: inline-block;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .dsp-cat-chip.Regulatory { background: #f3eeff; color: #6d28d9; border: 1px solid #ddd6fe; }
  .dsp-cat-chip.Data { background: var(--blue-bg); color: var(--blue); border: 1px solid #a8c4e8; }
  .dsp-cat-chip.Testing { background: var(--green-bg); color: var(--green); border: 1px solid #a7d7bb; }
  .dsp-cat-chip.Infrastructure { background: var(--amber-bg); color: var(--amber); border: 1px solid #f6c87a; }
  .dsp-cat-chip.Default { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }
  .dsp-due {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
  }
  .dsp-due.overdue { color: var(--red); }

  /* ── Empty / loading / error ── */
  .dsp-empty {
    padding: 48px;
    text-align: center;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
  }
  .dsp-spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .dsp-error {
    background: var(--red-bg);
    border: 1px solid #f5b7b1;
    border-radius: var(--radius);
    padding: 12px 16px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--red);
    margin-bottom: 16px;
  }
  .dsp-sync-meta {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 18px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .dsp-sync-meta span { display: flex; align-items: center; gap: 5px; }
`;

// ─── API integration ─────────────────────────────────────────────────────────
// Calls /api/parse-sync which uses the Anthropic API on the server side.
// Falls back to mock data if the API returns an error (e.g. key not configured).

const MOCK_RESPONSE = {
  meta: {
    date: "April 29, 2026",
    program: "Isaac to Image One – Cigna Commercial",
    meetingType: "Delivery Sync",
  },
  health: {
    overallStatus: "Yellow",
    overallRationale: "Work is proceeding on schedule but DERG sign-offs remain pending, introducing realized delivery risk.",
    openRisks: 2,
    openActions: 5,
    keyDecisions: 2,
    dergStatus: "Pending",
  },
  risks: [
    {
      description: "Late DERG feedback may result in rework, regression testing, and schedule compression near go-live.",
      severity: "High",
    },
    {
      description: "Workflow or data dependencies could compress testing timelines if not resolved promptly.",
      severity: "Medium",
    },
  ],
  decisions: [
    {
      description: "Proceed with development and refinement without waiting for DERG sign-off to protect schedule.",
    },
    {
      description: "Treat DERG feedback as a managed delivery risk, not a blocking dependency; non-critical late changes classified as post-go-live warranty items.",
    },
  ],
  assumptions: [
    {
      description: "DERG feedback will not materially change approved requirements based on prior migration patterns.",
    },
    {
      description: "Existing data is sufficient for most end-to-end test scenarios.",
    },
  ],
  actionItems: [
    {
      task: "Confirm DERG sign-off timing and feedback",
      owner: "Danielle",
      dueDate: "TBD",
      category: "Regulatory",
    },
    {
      task: "Follow up on duplicate member IDs",
      owner: "Donna",
      dueDate: "TBD",
      category: "Data",
    },
    {
      task: "Coordinate CPT and modality mappings between Isaac and Image One",
      owner: "Deepali / Kevin / Praneet",
      dueDate: "ASAP",
      category: "Data",
    },
    {
      task: "Identify E2E test case reviewers ahead of Cigna walkthrough",
      owner: "Chris McCourt",
      dueDate: "Before Cigna review",
      category: "Testing",
    },
    {
      task: "Update Isaac decommission scope",
      owner: "Neil / Team",
      dueDate: "May 18",
      category: "Infrastructure",
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a delivery intelligence parser for a PI (Program Increment) Health Dashboard.
Extract structured data from meeting notes or delivery sync documents.
Return ONLY valid JSON — no markdown fences, no preamble.

Schema:
{
  "meta": { "date": "string", "program": "string", "meetingType": "string" },
  "health": {
    "overallStatus": "Green | Yellow | Red",
    "overallRationale": "string (1 sentence)",
    "openRisks": number, "openActions": number,
    "keyDecisions": number, "dergStatus": "Pending | Complete | N/A"
  },
  "risks": [{ "description": "string", "severity": "High | Medium | Low" }],
  "decisions": [{ "description": "string" }],
  "assumptions": [{ "description": "string" }],
  "actionItems": [{
    "task": "string", "owner": "string", "dueDate": "string",
    "category": "Regulatory | Data | Testing | Infrastructure | Other"
  }]
}
Infer overallStatus: Green = on track, Yellow = risks managed, Red = blocked.`;

async function parseWithClaude(text: string): Promise<{ data: unknown; usedMock: boolean }> {
  try {
    const resp = await fetch("/api/parse-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `Server error ${resp.status}` }));
      throw new Error(err.error || `Server error ${resp.status}`);
    }
    const data = await resp.json();
    return { data, usedMock: false };
  } catch (e: unknown) {
    // If API call fails (key not configured, network error, etc.), fall back to mock
    console.warn("parse-sync API unavailable, using mock data:", (e as Error).message);
    await new Promise((r) => setTimeout(r, 800));
    return { data: MOCK_RESPONSE, usedMock: true };
  }
}

function CatChip({ cat }: { cat: string }) {
  const cls = ["Regulatory", "Data", "Testing", "Infrastructure"].includes(cat) ? cat : "Default";
  return <span className={`dsp-cat-chip ${cls}`}>{cat}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dsp_last_result";

export default function DeliverySyncPage() {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState("");
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load persisted result on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { data, usedMock: savedMock, savedAt } = JSON.parse(saved);
        setParsed(data);
        setUsedMock(savedMock ?? false);
        setRestoredAt(savedAt);
      }
    } catch { /* ignore */ }
  }, []);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setFileText(e.target!.result as string);
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const ingest = async () => {
    const text = tab === "paste" ? pasteText : fileText;
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    setUsedMock(false);
    try {
      const { data, usedMock: isMock } = await parseWithClaude(text);
      setParsed(data as Record<string, unknown>);
      setUsedMock(isMock);
      setRestoredAt(null);
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data,
        usedMock: isMock,
        savedAt: new Date().toISOString(),
      }));
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to parse document.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setPasteText("");
    setFileText("");
    setFileName(null);
    setParsed(null);
    setError(null);
    setUsedMock(false);
    setRestoredAt(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const statusColor: Record<string, string> = { Green: "green", Yellow: "amber", Red: "red" };
  const statusLabel: Record<string, string> = { Green: "HEALTHY", Yellow: "AT RISK", Red: "CRITICAL" };

  return (
    <>
      <style>{CSS}</style>
      <div className="dsp-root">
        {/* Header */}
        <div className="dsp-eyebrow">Delivery Sync</div>
        <div className="dsp-title">
          PI Health Enrichment
          {usedMock && <span className="dsp-mock-badge">Fallback Mode</span>}
        </div>

        {/* Ingest panel */}
        <div className="dsp-ingest">
          <div className="dsp-ingest-label">Ingest Sync Document</div>
          <div className="dsp-tabs">
            <button
              className={`dsp-tab ${tab === "paste" ? "active" : ""}`}
              onClick={() => setTab("paste")}
            >
              Paste Text
            </button>
            <button
              className={`dsp-tab ${tab === "upload" ? "active" : ""}`}
              onClick={() => setTab("upload")}
            >
              Upload File
            </button>
          </div>

          {tab === "paste" ? (
            <textarea
              className="dsp-textarea"
              placeholder="Paste meeting notes, delivery sync markdown, or any structured text here…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          ) : (
            <>
              <div
                className={`dsp-dropzone ${drag ? "drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}
              >
                <div className="dsp-dropzone-icon">📄</div>
                <div className="dsp-dropzone-text">Drop a .md or .txt file here</div>
                <div className="dsp-dropzone-hint">or click to browse</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.txt,.text"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
              {fileName && <div className="dsp-file-name">✓ {fileName}</div>}
            </>
          )}

          <div className="dsp-actions">
            <button
              className="dsp-btn dsp-btn-primary"
              onClick={ingest}
              disabled={loading || (tab === "paste" ? !pasteText.trim() : !fileText.trim())}
            >
              {loading ? <><span className="dsp-spinner" />Parsing…</> : "Parse & Enrich →"}
            </button>
            {parsed && (
              <button className="dsp-btn dsp-btn-secondary" onClick={clear}>Clear</button>
            )}
            {loading && <span className="dsp-status">Reading document…</span>}
          </div>
        </div>

        {/* Error */}
        {error && <div className="dsp-error">⚠ {error}</div>}

        {/* Results */}
        {parsed && (() => {
          const { meta, health, risks, decisions, assumptions, actionItems } = parsed;
          const sc = statusColor[health?.overallStatus] || "amber";
          const sl = statusLabel[health?.overallStatus] || "AT RISK";

          return (
            <>
              {/* Sync meta */}
              <div className="dsp-sync-meta">
                {meta?.date && <span>📅 {meta.date}</span>}
                {meta?.program && <span>🏷 {meta.program}</span>}
                {meta?.meetingType && <span>📋 {meta.meetingType}</span>}
                {restoredAt && (
                  <span style={{ color: "var(--green)", marginLeft: "auto" }}>
                    ✓ Restored from {new Date(restoredAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stat bar */}
              <div className="dsp-section-label">PI Health Summary</div>
              <div className="dsp-stat-bar">
                <div className="dsp-stat">
                  <div className="dsp-stat-label">Overall Status</div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`dsp-status-chip ${sc}`}>
                      <span className={`dsp-chip-dot ${sc}`} />
                      {sl}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    {health?.overallRationale || ""}
                  </div>
                </div>
                <div className="dsp-stat">
                  <div className="dsp-stat-label">Open Risks</div>
                  <div className={`dsp-stat-value red`}>{health?.openRisks ?? risks?.length ?? "—"}</div>
                </div>
                <div className="dsp-stat">
                  <div className="dsp-stat-label">Open Actions</div>
                  <div className="dsp-stat-value">{health?.openActions ?? actionItems?.length ?? "—"}</div>
                </div>
                <div className="dsp-stat">
                  <div className="dsp-stat-label">Key Decisions</div>
                  <div className="dsp-stat-value">{health?.keyDecisions ?? decisions?.length ?? "—"}</div>
                </div>
                <div className="dsp-stat">
                  <div className="dsp-stat-label">DERG Sign-Off</div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`dsp-status-chip ${
                      health?.dergStatus === "Complete" ? "green"
                      : health?.dergStatus === "Pending" ? "amber"
                      : "blue"
                    }`}>
                      <span className={`dsp-chip-dot ${
                        health?.dergStatus === "Complete" ? "green"
                        : health?.dergStatus === "Pending" ? "amber"
                        : "blue"
                      }`} />
                      {health?.dergStatus || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risks & Decisions */}
              <div className="dsp-two-col">
                <div className="dsp-block">
                  <div className="dsp-block-title">Risk Findings — {risks?.length ?? 0} total</div>
                  {risks?.length ? (
                    <ul className="dsp-list">
                      {risks.map((r, i) => (
                        <li key={i} className="dsp-list-item risk">
                          <span className={`dsp-severity ${r.severity?.toUpperCase()}`}>
                            {r.severity?.toUpperCase()}
                          </span>
                          {r.description}
                        </li>
                      ))}
                    </ul>
                  ) : <div className="dsp-list-item">No risks identified.</div>}
                </div>

                <div className="dsp-block">
                  <div className="dsp-block-title">Decisions & Assumptions</div>
                  {decisions?.length ? (
                    <ul className="dsp-list">
                      {decisions.map((d, i) => (
                        <li key={i} className="dsp-list-item decision">{d.description}</li>
                      ))}
                    </ul>
                  ) : <div className="dsp-list-item">No decisions recorded.</div>}

                  {assumptions?.length > 0 && (
                    <>
                      <div className="dsp-block-title" style={{ marginTop: 16 }}>Assumptions</div>
                      <ul className="dsp-list">
                        {assumptions.map((a, i) => (
                          <li key={i} className="dsp-list-item assumption">{a.description}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="dsp-section-label">Action Items — {actionItems?.length ?? 0} total</div>
              <div className="dsp-table-wrap">
                <div className="dsp-table-header">
                  <div className="dsp-table-title">Open Actions</div>
                  <div className="dsp-badge">{actionItems?.length ?? 0} items</div>
                </div>
                {actionItems?.length ? (
                  <table className="dsp-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Owner</th>
                        <th>Due</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((a, i) => (
                        <tr key={i}>
                          <td>{a.task}</td>
                          <td><span className="dsp-owner-chip">{a.owner}</span></td>
                          <td><span className="dsp-due">{a.dueDate || "TBD"}</span></td>
                          <td><CatChip cat={a.category || "Other"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="dsp-empty">No action items extracted.</div>
                )}
              </div>
            </>
          );
        })()}

        {!parsed && !loading && !error && (
          <div className="dsp-empty">
            Paste or upload a delivery sync document above to enrich PI Health.
          </div>
        )}
      </div>
    </>
  );
}

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TranscriptUploader from "./TranscriptUploader";
import SectionPanel from "./SectionPanel";
import ExportBar from "./ExportBar";
import SessionHistory from "./SessionHistory";
import EmpathyMapGrid from "./EmpathyMapGrid";
import InfluenceMapQuadrant from "./InfluenceMapQuadrant";
import { initSections, type SectionKey, type SectionState } from "./useAnalysisStream";

// ---------------------------------------------------------------------------
// TranscriptUploader tests
// ---------------------------------------------------------------------------

describe("TranscriptUploader", () => {
  const mockOnUploadComplete = vi.fn();

  beforeEach(() => {
    mockOnUploadComplete.mockClear();
  });

  it("renders file input and upload button", () => {
    render(<TranscriptUploader onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText("Choose File")).toBeInTheDocument();
    expect(screen.getByText("Upload & Analyze")).toBeInTheDocument();
  });

  it("upload button is disabled when no file selected", () => {
    render(<TranscriptUploader onUploadComplete={mockOnUploadComplete} />);
    const button = screen.getByText("Upload & Analyze");
    expect(button).toBeDisabled();
  });

  it("shows selected file name and size after file selection", async () => {
    render(<TranscriptUploader onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select transcript file");

    const file = new File(["Hello world"], "meeting.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/meeting\.txt/)).toBeInTheDocument();
    });
  });

  it("shows error for non-txt file on client side", async () => {
    render(<TranscriptUploader onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select transcript file");

    const file = new File(["content"], "notes.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "name", { value: "notes.pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText("Upload & Analyze"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Only .txt files are supported");
    });
  });
});

// ---------------------------------------------------------------------------
// SectionPanel tests
// ---------------------------------------------------------------------------

describe("SectionPanel", () => {
  it("renders section title", () => {
    const state: SectionState = { status: "pending", text: "" };
    render(<SectionPanel sectionKey="speaker_statistics" state={state} />);
    expect(screen.getByText("Speaker Statistics")).toBeInTheDocument();
  });

  it("shows waiting message for pending status", () => {
    const state: SectionState = { status: "pending", text: "" };
    render(<SectionPanel sectionKey="raid_log" state={state} />);
    expect(screen.getByText("Waiting for analysis…")).toBeInTheDocument();
  });

  it("shows streaming indicator for streaming status", () => {
    const state: SectionState = { status: "streaming", text: "Analyzing data..." };
    render(<SectionPanel sectionKey="team_health" state={state} />);
    expect(screen.getByText("Analyzing…")).toBeInTheDocument();
  });

  it("shows complete status badge", () => {
    const state: SectionState = { status: "complete", text: "Full result here" };
    render(<SectionPanel sectionKey="gap_analysis" state={state} />);
    expect(screen.getByText("complete")).toBeInTheDocument();
  });

  it("shows error message for error status", () => {
    const state: SectionState = { status: "error", text: "", error: "Timeout occurred" };
    render(<SectionPanel sectionKey="empathy_map" state={state} />);
    expect(screen.getByText(/Timeout occurred/)).toBeInTheDocument();
  });

  it("shows regenerate button when complete", () => {
    const onRegenerate = vi.fn();
    const state: SectionState = { status: "complete", text: "Result" };
    render(
      <SectionPanel
        sectionKey="speaker_statistics"
        state={state}
        onRegenerate={onRegenerate}
      />
    );
    const regenButton = screen.getByLabelText("Regenerate Speaker Statistics");
    fireEvent.click(regenButton);
    expect(onRegenerate).toHaveBeenCalled();
  });

  it("shows regenerate button when error", () => {
    const onRegenerate = vi.fn();
    const state: SectionState = { status: "error", text: "", error: "Failed" };
    render(
      <SectionPanel
        sectionKey="meeting_minutes"
        state={state}
        onRegenerate={onRegenerate}
      />
    );
    const regenButton = screen.getByLabelText("Regenerate Meeting Minutes");
    expect(regenButton).toBeInTheDocument();
  });

  it("shows copy button when complete", () => {
    const onCopy = vi.fn();
    const state: SectionState = { status: "complete", text: "Result" };
    render(
      <SectionPanel
        sectionKey="delivery_signals"
        state={state}
        onCopy={onCopy}
      />
    );
    const copyButton = screen.getByLabelText("Copy Delivery Signals & Priority Actions to clipboard");
    fireEvent.click(copyButton);
    expect(onCopy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EmpathyMapGrid tests
// ---------------------------------------------------------------------------

describe("EmpathyMapGrid", () => {
  const sampleContent = `## Alice — Empathy Map

| Thinks | Feels |
|--------|-------|
| Need to ship faster | Anxious |

| Says | Does |
|------|------|
| "Prioritize" | Assigns tasks |

| Pains | Gains |
|-------|-------|
| Resource constraints | Team trust |
`;

  it("renders without crashing", () => {
    render(<EmpathyMapGrid content={sampleContent} />);
    // Should render the stakeholder name (using partial match to avoid em-dash encoding issues)
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("renders quadrant labels", () => {
    render(<EmpathyMapGrid content={sampleContent} />);
    expect(screen.getByText("💭 Thinks")).toBeInTheDocument();
    expect(screen.getByText("❤️ Feels")).toBeInTheDocument();
    expect(screen.getByText("💬 Says")).toBeInTheDocument();
    expect(screen.getByText("⚡ Does")).toBeInTheDocument();
    expect(screen.getByText("😟 Pains")).toBeInTheDocument();
    expect(screen.getByText("🎯 Gains")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// InfluenceMapQuadrant tests
// ---------------------------------------------------------------------------

describe("InfluenceMapQuadrant", () => {
  const sampleContent = `## Influence Map Coordinates

| Stakeholder | Power (0-1) | Interest (0-1) | Quadrant |
|-------------|-------------|----------------|----------|
| Alice | 0.9 | 0.8 | Key Players |
| Bob | 0.3 | 0.7 | Keep Informed |
| Charlie | 0.2 | 0.2 | Monitor |
`;

  it("renders four quadrant cells", () => {
    render(<InfluenceMapQuadrant content={sampleContent} />);
    expect(screen.getByText("Key Players")).toBeInTheDocument();
    expect(screen.getByText("Keep Satisfied")).toBeInTheDocument();
    expect(screen.getByText("Keep Informed")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
  });

  it("renders stakeholder markers", () => {
    render(<InfluenceMapQuadrant content={sampleContent} />);
    // Stakeholder list should show parsed names
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Charlie/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ExportBar tests
// ---------------------------------------------------------------------------

describe("ExportBar", () => {
  it("buttons are disabled when session is not complete", () => {
    const sections = initSections();
    render(<ExportBar sessionId={null} sections={sections} allDone={false} />);
    const exportBtn = screen.getByText("Export Markdown");
    const copyBtn = screen.getByText("Copy All to Clipboard");
    expect(exportBtn).toBeDisabled();
    expect(copyBtn).toBeDisabled();
  });

  it("buttons are enabled when session is complete", () => {
    const sections = initSections();
    // Mark all complete
    for (const key of Object.keys(sections)) {
      sections[key as SectionKey] = { status: "complete", text: "result" };
    }
    render(<ExportBar sessionId="test-id" sections={sections} allDone={true} />);
    const exportBtn = screen.getByText("Export Markdown");
    expect(exportBtn).not.toBeDisabled();
  });

  it("copy button shows feedback after click", async () => {
    const sections = initSections();
    for (const key of Object.keys(sections)) {
      sections[key as SectionKey] = { status: "complete", text: "result" };
    }

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<ExportBar sessionId="test-id" sections={sections} allDone={true} />);
    const copyBtn = screen.getByText("Copy All to Clipboard");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByText("✓ Copied!")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SessionHistory tests
// ---------------------------------------------------------------------------

describe("SessionHistory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows empty state message when no sessions", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <SessionHistory
        activeSessionId={null}
        onSelectSession={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
    });
  });

  it("displays sessions when available", async () => {
    const sessions = [
      { id: "1", filename: "standup.txt", created_at: "2024-06-01T10:00:00Z", status: "complete" },
      { id: "2", filename: "retro.txt", created_at: "2024-06-02T10:00:00Z", status: "pending" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sessions),
    });

    render(
      <SessionHistory
        activeSessionId={null}
        onSelectSession={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("standup.txt")).toBeInTheDocument();
      expect(screen.getByText("retro.txt")).toBeInTheDocument();
    });
  });

  it("calls onSelectSession when a session is clicked", async () => {
    const sessions = [
      { id: "abc", filename: "meeting.txt", created_at: "2024-06-01T10:00:00Z", status: "complete" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sessions),
    });

    const onSelect = vi.fn();
    render(
      <SessionHistory
        activeSessionId={null}
        onSelectSession={onSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("meeting.txt")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("meeting.txt"));
    expect(onSelect).toHaveBeenCalledWith("abc");
  });
});

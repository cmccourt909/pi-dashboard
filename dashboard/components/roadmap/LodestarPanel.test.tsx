// dashboard/components/roadmap/LodestarPanel.test.tsx

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LodestarPanel from "./LodestarPanel";

// ---------------------------------------------------------------------------
// EventSource mock
// ---------------------------------------------------------------------------

type ESHandler = (event: MessageEvent) => void;
type ESErrorHandler = (event: Event) => void;

interface MockES {
  url: string;
  onmessage: ESHandler | null;
  onerror: ESErrorHandler | null;
  close: ReturnType<typeof vi.fn>;
  emit: (data: object) => void;
  triggerError: () => void;
}

let mockESInstance: MockES | null = null;
let mockESConstructorSpy: ReturnType<typeof vi.fn>;

function setupEventSourceMock() {
  mockESInstance = null;
  mockESConstructorSpy = vi.fn((url: string) => {
    const es: MockES = {
      url,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      emit(data: object) {
        this.onmessage?.(
          new MessageEvent("message", { data: JSON.stringify(data) })
        );
      },
      triggerError() {
        this.onerror?.(new Event("error"));
      },
    };
    mockESInstance = es;
    return es;
  });
  vi.stubGlobal("EventSource", mockESConstructorSpy);
}

function setupClipboardMock() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
}

function makeProps(overrides: Partial<React.ComponentProps<typeof LodestarPanel>> = {}) {
  return {
    text: null,
    featureKey: "FEAT-1",
    generatedAt: null,
    pi: "PI-2026-Q1",
    active: true,
    ...overrides,
  };
}

describe("LodestarPanel — Phase 2", () => {
  beforeEach(() => {
    setupEventSourceMock();
    setupClipboardMock();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Idle state
  // -------------------------------------------------------------------------

  describe("idle state", () => {
    it("renders static fallback text when active=false and text is provided", () => {
      render(<LodestarPanel {...makeProps({ active: false, text: "Pre-generated narrative." })} />);
      expect(screen.getByTestId("lodestar-text")).toHaveTextContent("Pre-generated narrative.");
    });

    it("renders placeholder when active=false and text is null", () => {
      render(<LodestarPanel {...makeProps({ active: false, text: null })} />);
      expect(screen.getByTestId("lodestar-placeholder")).toHaveTextContent("AI narrative not yet generated");
    });

    it("applies italic style to placeholder", () => {
      render(<LodestarPanel {...makeProps({ active: false, text: null })} />);
      expect(screen.getByTestId("lodestar-placeholder")).toHaveStyle({ fontStyle: "italic" });
    });

    it("renders generated_at as relative time when provided", () => {
      const ts = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      render(<LodestarPanel {...makeProps({ active: false, text: "Some text", generatedAt: ts })} />);
      expect(screen.getByTestId("generated-at")).toHaveTextContent("Generated 2 hours ago");
    });

    it("does not render generated_at when null", () => {
      render(<LodestarPanel {...makeProps({ active: false, text: "Some text", generatedAt: null })} />);
      expect(screen.queryByTestId("generated-at")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Streaming state
  // -------------------------------------------------------------------------

  describe("streaming state", () => {
    it("opens an EventSource when active=true", () => {
      render(<LodestarPanel {...makeProps()} />);
      expect(mockESConstructorSpy).toHaveBeenCalledOnce();
      expect(mockESConstructorSpy).toHaveBeenCalledWith(expect.stringContaining("PI-2026-Q1"));
    });

    it("shows streaming text and cursor while chunks arrive", async () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "chunk", text: "Hello " }));
      act(() => mockESInstance!.emit({ type: "chunk", text: "world." }));
      expect(screen.getByTestId("lodestar-streaming-text")).toHaveTextContent("Hello world.");
      expect(screen.getByTestId("lodestar-streaming-text").querySelector(".lodestar-cursor")).not.toBeNull();
    });

    it("renders Cancel button while streaming", () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "chunk", text: "..." }));
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("has aria-live=polite and aria-atomic=false on streaming element", () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "chunk", text: "..." }));
      const el = screen.getByTestId("lodestar-streaming-text");
      expect(el).toHaveAttribute("aria-live", "polite");
      expect(el).toHaveAttribute("aria-atomic", "false");
    });
  });

  // -------------------------------------------------------------------------
  // Complete state
  // -------------------------------------------------------------------------

  describe("complete state", () => {
    async function renderComplete(text = "All features on track.") {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "meta", promptVersion: "v1.0" }));
      act(() => mockESInstance!.emit({ type: "chunk", text }));
      act(() => mockESInstance!.emit({ type: "done" }));
      await waitFor(() => expect(screen.getByTestId("lodestar-text")).toBeInTheDocument());
    }

    it("renders narrative text in complete state", async () => {
      await renderComplete("All features on track.");
      expect(screen.getByTestId("lodestar-text")).toHaveTextContent("All features on track.");
    });

    it("renders prompt version badge", async () => {
      await renderComplete();
      expect(screen.getByLabelText("Prompt version v1.0")).toBeInTheDocument();
    });

    it("renders teal checkmark", async () => {
      await renderComplete();
      expect(screen.getByLabelText("Narrative complete")).toBeInTheDocument();
    });

    it("renders Copy button", async () => {
      await renderComplete();
      expect(screen.getByRole("button", { name: /copy narrative/i })).toBeInTheDocument();
    });

    it("copies text to clipboard and shows Copied confirmation", async () => {
      await renderComplete("Narrative text.");
      fireEvent.click(screen.getByRole("button", { name: /copy narrative/i }));
      await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Narrative text.");
    });

    it("closes the EventSource after done event", async () => {
      render(<LodestarPanel {...makeProps()} />);
      const es = mockESInstance!;
      act(() => es.emit({ type: "done" }));
      expect(es.close).toHaveBeenCalledOnce();
    });

    it("preserves whitespace in multi-line narrative text", async () => {
      await renderComplete("Line one.\nLine two.");
      expect(screen.getByTestId("lodestar-text")).toHaveStyle({ whiteSpace: "pre-wrap" });
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  describe("error state", () => {
    it("renders error message with role=alert", async () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "error", error: "Backend timeout." }));
      await waitFor(() => expect(screen.getByTestId("lodestar-error")).toBeInTheDocument());
      expect(screen.getByTestId("lodestar-error")).toHaveAttribute("role", "alert");
      expect(screen.getByTestId("lodestar-error")).toHaveTextContent("Backend timeout.");
    });

    it("renders Retry button on error", async () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.emit({ type: "error", error: "Backend timeout." }));
      await waitFor(() => expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument());
    });

    it("renders error message on EventSource onerror", async () => {
      render(<LodestarPanel {...makeProps()} />);
      act(() => mockESInstance!.triggerError());
      await waitFor(() =>
        expect(screen.getByTestId("lodestar-error")).toHaveTextContent("Connection to Lodestar failed")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------

  describe("cancel", () => {
    it("closes EventSource and returns to idle on Cancel click", async () => {
      render(<LodestarPanel {...makeProps()} />);
      const es = mockESInstance!;
      act(() => es.emit({ type: "chunk", text: "Partial..." }));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(es.close).toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.queryByTestId("lodestar-streaming-text")).not.toBeInTheDocument()
      );
    });
  });

  // -------------------------------------------------------------------------
  // Feature switch regression — T2.2
  // -------------------------------------------------------------------------

  describe("feature switch regression (T2.2)", () => {
    it("opens a new EventSource when featureKey changes after complete", async () => {
      const { rerender } = render(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-100" })} key="ALPHA-100" />
      );
      act(() => mockESInstance!.emit({ type: "chunk", text: "Alpha-100 narrative." }));
      act(() => mockESInstance!.emit({ type: "done" }));
      await waitFor(() =>
        expect(screen.getByTestId("lodestar-text")).toHaveTextContent("Alpha-100 narrative.")
      );

      rerender(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-101", text: null })} key="ALPHA-101" />
      );

      expect(mockESConstructorSpy).toHaveBeenCalledTimes(2);
      expect(mockESConstructorSpy).toHaveBeenLastCalledWith(expect.stringContaining("ALPHA-101"));
    });

    it("renders new feature streaming text after switch", async () => {
      const { rerender } = render(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-100" })} key="ALPHA-100" />
      );
      act(() => mockESInstance!.emit({ type: "done" }));
      await waitFor(() =>
        expect(screen.queryByTestId("lodestar-streaming-text")).not.toBeInTheDocument()
      );

      rerender(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-101" })} key="ALPHA-101" />
      );
      act(() => mockESInstance!.emit({ type: "chunk", text: "Alpha-101 narrative." }));
      expect(screen.getByTestId("lodestar-streaming-text")).toHaveTextContent("Alpha-101 narrative.");
    });

    it("does not open a new EventSource when same feature is re-rendered", async () => {
      render(<LodestarPanel {...makeProps({ featureKey: "ALPHA-100" })} />);
      act(() => mockESInstance!.emit({ type: "done" }));
      await waitFor(() =>
        expect(screen.queryByTestId("lodestar-streaming-text")).not.toBeInTheDocument()
      );
      expect(mockESConstructorSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Session cache
  // -------------------------------------------------------------------------

  describe("session cache", () => {
    it("serves cached result without opening a new EventSource on revisit", async () => {
      const { unmount } = render(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-100" })} key="ALPHA-100-v1" />
      );
      act(() => mockESInstance!.emit({ type: "meta", promptVersion: "v1.0" }));
      act(() => mockESInstance!.emit({ type: "chunk", text: "Cached narrative." }));
      act(() => mockESInstance!.emit({ type: "done" }));
      await waitFor(() => expect(screen.getByTestId("lodestar-text")).toBeInTheDocument());
      unmount();

      render(
        <LodestarPanel {...makeProps({ featureKey: "ALPHA-100" })} key="ALPHA-100-v2" />
      );
      await waitFor(() =>
        expect(screen.getByTestId("lodestar-text")).toHaveTextContent("Cached narrative.")
      );
      expect(mockESConstructorSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  describe("accessibility", () => {
    it("has an accessible region with aria-label=Lodestar Analysis", () => {
      render(<LodestarPanel {...makeProps({ active: false })} />);
      expect(screen.getByRole("region", { name: "Lodestar Analysis" })).toBeInTheDocument();
    });

    it("renders section header text", () => {
      render(<LodestarPanel {...makeProps({ active: false })} />);
      expect(screen.getByText("Lodestar Analysis")).toBeInTheDocument();
    });
  });
});

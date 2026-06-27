import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import LodestarBriefing from "./LodestarBriefing";

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((event: Event) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  dispatchEvent(type: string, event?: Event) {
    const handlers = this.listeners[type] || [];
    for (const handler of handlers) {
      handler(event ?? new Event(type));
    }
  }

  close = vi.fn();

  static instances: MockEventSource[] = [];
  static reset() {
    MockEventSource.instances = [];
  }
}

beforeEach(() => {
  MockEventSource.reset();
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LodestarBriefing", () => {
  it("renders version badge with Lodestar AI text and version", () => {
    render(<LodestarBriefing initialNarrative="Test content" version="2.1" />);
    const badge = screen.getByTestId("version-badge");
    expect(badge.textContent).toContain("Lodestar AI");
    expect(badge.textContent).toContain("v2.1");
  });

  it("renders Portfolio briefing label", () => {
    render(<LodestarBriefing initialNarrative="Test content" />);
    expect(screen.getByText("Portfolio briefing")).toBeDefined();
  });

  it("displays update timestamp when provided", () => {
    render(
      <LodestarBriefing
        initialNarrative="Test content"
        lastUpdated="2024-06-15T14:30:00Z"
      />
    );
    const timestamp = screen.getByTestId("update-timestamp");
    expect(timestamp.textContent).toContain("Updated");
    expect(timestamp.textContent).toContain("Jun");
  });

  it("renders headline and narrative paragraphs from initial content", () => {
    const narrative = "First paragraph.\n\nSecond paragraph.";
    render(
      <LodestarBriefing
        initialNarrative={narrative}
        version="1.0"
      />
    );
    const narrativeEl = screen.getByTestId("briefing-narrative");
    const paragraphs = narrativeEl.querySelectorAll("p");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toBe("First paragraph.");
    expect(paragraphs[1].textContent).toBe("Second paragraph.");
  });

  it("shows skeleton placeholders while loading", () => {
    render(<LodestarBriefing />);
    expect(screen.getByTestId("briefing-skeleton")).toBeDefined();
  });

  it("opens SSE connection to correct endpoint", () => {
    render(<LodestarBriefing piId="pi-42" featureKey="risk" />);
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toBe(
      "/api/pis/pi-42/features/risk/lodestar"
    );
  });

  it("does not open SSE connection when initialNarrative is provided", () => {
    render(<LodestarBriefing initialNarrative="Already loaded" />);
    expect(MockEventSource.instances.length).toBe(0);
  });

  it("updates content on SSE message", async () => {
    render(<LodestarBriefing piId="current" featureKey="overview" />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            headline: "Risk Alert",
            narrative: "PI is at risk.",
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("briefing-headline").textContent).toBe("Risk Alert");
    });
    expect(screen.getByTestId("briefing-narrative").textContent).toContain("PI is at risk.");
  });

  it("shows error message on SSE error", async () => {
    render(<LodestarBriefing piId="current" featureKey="overview" />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.onerror?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("briefing-error")).toBeDefined();
    });
    expect(screen.getByTestId("briefing-error").textContent).toContain(
      "Unable to load briefing"
    );
  });

  it("shows retry button on error that reconnects SSE", async () => {
    render(<LodestarBriefing piId="current" featureKey="overview" />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.onerror?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("retry-button")).toBeDefined();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("retry-button"));
    });

    // A new EventSource should have been created
    expect(MockEventSource.instances.length).toBe(2);
  });

  it("renders three action buttons", () => {
    render(<LodestarBriefing initialNarrative="Content" />);
    expect(screen.getByTestId("btn-generate-steerco")).toBeDefined();
    expect(screen.getByTestId("btn-refresh")).toBeDefined();
    expect(screen.getByTestId("btn-copy")).toBeDefined();
  });

  it("copies briefing text to clipboard on Copy click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <LodestarBriefing initialNarrative="Copy this text" version="1.0" />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-copy"));
    });

    expect(writeText).toHaveBeenCalledWith("\n\nCopy this text");
  });

  it("Refresh analysis button triggers a new SSE stream", () => {
    render(<LodestarBriefing initialNarrative="Old content" />);

    act(() => {
      fireEvent.click(screen.getByTestId("btn-refresh"));
    });

    // Should open a new EventSource connection
    expect(MockEventSource.instances.length).toBe(1);
  });

  it("shows Copied! feedback after successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<LodestarBriefing initialNarrative="Test" version="1.0" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-copy"));
    });

    expect(screen.getByTestId("btn-copy").textContent).toBe("Copied!");
  });
});

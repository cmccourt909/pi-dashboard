import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LodestarPanel from "./LodestarPanel";

const defaultProps = {
  featureKey: "FEAT-1",
  generatedAt: null as string | null,
};

class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
  }

  close() {
    this.closed = true;
  }

  emit(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }
}

const eventSourceInstances: MockEventSource[] = [];

beforeEach(() => {
  eventSourceInstances.length = 0;
  vi.stubGlobal(
    "EventSource",
    vi.fn(function (url: string) {
      const instance = new MockEventSource(url);
      eventSourceInstances.push(instance);
      return instance;
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getLastEventSource(): MockEventSource {
  const es = eventSourceInstances[eventSourceInstances.length - 1];
  if (!es) throw new Error("No EventSource instance created");
  return es;
}

describe("LodestarPanel", () => {
  it("renders AI narrative text when text is provided", () => {
    const narrative = "Feature is on track for delivery in Sprint 3.";
    render(<LodestarPanel text={narrative} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-text")).toHaveTextContent(narrative);
    expect(screen.queryByTestId("lodestar-placeholder")).not.toBeInTheDocument();
  });

  it("renders placeholder when text is null", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-placeholder")).toHaveTextContent(
      "AI narrative not yet generated"
    );
    expect(screen.queryByTestId("lodestar-text")).not.toBeInTheDocument();
  });

  it("has an accessible section with aria-label", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const section = screen.getByRole("region", { name: "Lodestar Analysis" });
    expect(section).toBeInTheDocument();
  });

  it("renders the section header", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    expect(screen.getByText("Lodestar Analysis")).toBeInTheDocument();
  });

  it("applies italic style to placeholder text", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder).toHaveStyle({ fontStyle: "italic" });
  });

  it("applies muted color to placeholder text", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder.style.color).toBe("var(--color-text-tertiary)");
  });

  it("preserves whitespace in multi-line narrative text", () => {
    const multiline = "Line one.\nLine two.\nLine three.";
    render(<LodestarPanel text={multiline} {...defaultProps} />);

    const textEl = screen.getByTestId("lodestar-text");
    expect(textEl).toHaveStyle({ whiteSpace: "pre-wrap" });
    expect(textEl).toHaveTextContent("Line one.");
    expect(textEl).toHaveTextContent("Line two.");
  });

  it("renders the Regenerate button", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Regenerate");
    expect(button).not.toBeDisabled();
  });

  it("displays generated_at as relative time", () => {
    const recentTimestamp = new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString();
    render(
      <LodestarPanel
        text="Some text"
        featureKey="FEAT-1"
        generatedAt={recentTimestamp}
      />
    );

    expect(screen.getByTestId("generated-at")).toHaveTextContent(
      "Generated 2 hours ago"
    );
  });

  it("does not display generated_at when null", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    expect(screen.queryByTestId("generated-at")).not.toBeInTheDocument();
  });

  it("renders structured sections when headers are present", () => {
    const structured = `Delivery Status: On track.
Risks & Blockers: None.
Recommended Actions: Keep monitoring.`;

    render(<LodestarPanel text={structured} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-structured")).toBeInTheDocument();
    expect(screen.getByTestId("lodestar-section-deliveryStatus")).toHaveTextContent(
      "On track."
    );
    expect(
      screen.getByTestId("lodestar-section-risksAndBlockers")
    ).toHaveTextContent("None.");
    expect(
      screen.getByTestId("lodestar-section-recommendedActions")
    ).toHaveTextContent("Keep monitoring.");
  });

  it("renders plain text when no headers are present", () => {
    const plain = "Feature is on track for delivery in Sprint 3.";
    render(<LodestarPanel text={plain} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-text")).toHaveTextContent(plain);
    expect(screen.queryByTestId("lodestar-structured")).not.toBeInTheDocument();
  });

  it("starts SSE stream when Regenerate is clicked", async () => {
    render(<LodestarPanel text="Some text" pi="26.2" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    await userEvent.click(button);

    const es = getLastEventSource();
    expect(es.url).toBe("/api/pis/26.2/features/FEAT-1/lodestar");
  });

  it("shows streaming state during regeneration", async () => {
    render(<LodestarPanel text="Some text" pi="26.2" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    await userEvent.click(button);

    const es = getLastEventSource();
    act(() => {
      es.emit({ type: "meta", promptVersion: "v2.0" });
    });

    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    expect(button).toHaveTextContent("Regenerating…");
  });

  it("updates displayed text with streamed chunks", async () => {
    render(<LodestarPanel text="Old text" pi="26.2" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    await userEvent.click(button);

    const es = getLastEventSource();
    act(() => {
      es.emit({ type: "meta", promptVersion: "v2.0" });
      es.emit({ type: "chunk", text: "New streamed text." });
    });

    await waitFor(() =>
      expect(screen.getByTestId("lodestar-text")).toHaveTextContent(
        "New streamed text."
      )
    );
  });

  it("shows error when stream fails", async () => {
    render(<LodestarPanel text="Some text" pi="26.2" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    await userEvent.click(button);

    const es = getLastEventSource();
    act(() => {
      es.emit({ type: "error", error: "Generation failed" });
    });

    expect(screen.getByTestId("regenerate-error")).toHaveTextContent(
      "Generation failed"
    );
  });
});

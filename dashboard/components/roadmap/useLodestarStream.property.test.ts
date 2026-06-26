import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { useLodestarStream } from "./useLodestarStream";

type EventType = "meta" | "chunk" | "done" | "error";

interface StreamEvent {
  type: EventType;
  text?: string;
  error?: string;
}

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

  emit(event: StreamEvent) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(event) }));
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

function replayEvents(events: StreamEvent[]) {
  const es = getLastEventSource();
  act(() => {
    events.forEach((event) => es.emit(event));
  });
}

function expectedState(events: StreamEvent[]): ReturnType<typeof useLodestarStream>["state"] {
  const terminal = events.find((e) => e.type === "error" || e.type === "done");
  if (terminal?.type === "error") return "error";
  if (terminal?.type === "done") return "complete";
  return events.length > 0 ? "streaming" : "loading";
}

function expectedText(events: StreamEvent[]): string {
  return events
    .filter((e): e is StreamEvent & { type: "chunk"; text: string } => e.type === "chunk" && !!e.text)
    .map((e) => e.text)
    .join("");
}

function validEventSequence() {
  return fc.array(
    fc.oneof(
      fc.record<StreamEvent>({ type: fc.constant("meta") }),
      fc.record<StreamEvent>({ type: fc.constant("chunk"), text: fc.string({ minLength: 0, maxLength: 50 }) }),
      fc.record<StreamEvent>({ type: fc.constant("done") })
    ),
    { minLength: 0, maxLength: 30 }
  );
}

describe("useLodestarStream properties", () => {
  it("final state is consistent with the event sequence", async () => {
    await fc.assert(
      fc.asyncProperty(validEventSequence(), async (events) => {
        const { result } = renderHook(() => useLodestarStream());

        act(() => {
          result.current.start("26.2", "FEAT-1");
        });

        replayEvents(events);

        await waitFor(() => expect(result.current.state).toBe(expectedState(events)));
      }),
      { numRuns: 50 }
    );
  });

  it("accumulated text equals ordered concatenation of chunks", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 20 }),
        async (chunks) => {
          const { result } = renderHook(() => useLodestarStream());

          const events: StreamEvent[] = [
            { type: "meta" },
            ...chunks.map((text) => ({ type: "chunk" as const, text })),
            { type: "done" },
          ];

          act(() => {
            result.current.start("26.2", "FEAT-1");
          });

          replayEvents(events);

          await waitFor(() => expect(result.current.state).toBe("complete"));
          expect(result.current.text).toBe(chunks.join(""));
        }
      ),
      { numRuns: 50 }
    );
  });

  it("error event always ends in error state", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.record<StreamEvent>({ type: fc.constant("meta") }),
            fc.record<StreamEvent>({ type: fc.constant("chunk"), text: fc.string() })
          ),
          { minLength: 0, maxLength: 10 }
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (prefix, errorMessage) => {
          const { result } = renderHook(() => useLodestarStream());

          const events: StreamEvent[] = [
            ...prefix,
            { type: "error", error: errorMessage },
          ];

          act(() => {
            result.current.start("26.2", "FEAT-1");
          });

          replayEvents(events);

          await waitFor(() => expect(result.current.state).toBe("error"));
          expect(result.current.error).toBe(errorMessage);
        }
      ),
      { numRuns: 50 }
    );
  });
});

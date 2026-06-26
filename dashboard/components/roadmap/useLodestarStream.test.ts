import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLodestarStream } from "./useLodestarStream";

class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 0;
  closed = false;

  constructor(url: string) {
    this.url = url;
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  emit(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }

  emitError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
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

describe("useLodestarStream", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useLodestarStream());
    expect(result.current.state).toBe("idle");
    expect(result.current.text).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("transitions to loading then streaming on start", async () => {
    const { result } = renderHook(() => useLodestarStream());

    act(() => {
      result.current.start("26.2", "ALPHA-100");
    });

    expect(result.current.state).toBe("loading");

    const es = getLastEventSource();

    act(() => {
      es.emit({ type: "meta", promptVersion: "v2.0" });
    });

    await waitFor(() => expect(result.current.state).toBe("streaming"));
  });

  it("accumulates chunk text and completes", async () => {
    const { result } = renderHook(() => useLodestarStream());

    act(() => {
      result.current.start("26.2", "ALPHA-100");
    });

    const es = getLastEventSource();

    act(() => {
      es.emit({ type: "meta", promptVersion: "v2.0" });
      es.emit({ type: "chunk", text: "Feature is " });
      es.emit({ type: "chunk", text: "on track." });
    });

    await waitFor(() => expect(result.current.text).toBe("Feature is on track."));

    act(() => {
      es.emit({ type: "done" });
    });

    await waitFor(() => expect(result.current.state).toBe("complete"));
  });

  it("transitions to error on error event", async () => {
    const { result } = renderHook(() => useLodestarStream());

    act(() => {
      result.current.start("26.2", "ALPHA-100");
    });

    const es = getLastEventSource();

    act(() => {
      es.emit({ type: "error", error: "LLM timeout" });
    });

    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.error).toBe("LLM timeout");
  });

  it("closes the connection on unmount", async () => {
    const { result, unmount } = renderHook(() => useLodestarStream());

    act(() => {
      result.current.start("26.2", "ALPHA-100");
    });

    const es = getLastEventSource();
    expect(es.closed).toBe(false);

    unmount();

    await waitFor(() => expect(es.closed).toBe(true));
  });

  it("encodes pi and feature key in the URL", () => {
    const { result } = renderHook(() => useLodestarStream());

    act(() => {
      result.current.start("26.2", "ALPHA-100");
    });

    const es = getLastEventSource();
    expect(es.url).toBe("/api/pis/26.2/features/ALPHA-100/lodestar");
  });
});

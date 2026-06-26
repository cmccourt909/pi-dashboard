"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StreamState = "idle" | "loading" | "streaming" | "complete" | "error";

export interface UseLodestarStreamResult {
  state: StreamState;
  text: string;
  error: string | null;
  start: (pi: string, featureKey: string) => void;
  reset: () => void;
}

interface StreamEvent {
  type: "meta" | "chunk" | "done" | "error";
  promptVersion?: string;
  text?: string;
  error?: string;
}

function parseEvent(data: string): StreamEvent | null {
  try {
    return JSON.parse(data) as StreamEvent;
  } catch {
    return null;
  }
}

/**
 * React hook that consumes the Lodestar SSE endpoint and exposes a state
 * machine plus accumulated narrative text.
 */
export function useLodestarStream(): UseLodestarStreamResult {
  const [state, setState] = useState<StreamState>("idle");
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingTextRef = useRef<string>("");
  const mountedRef = useRef(true);
  const flushRef = useRef<number | null>(null);

  const safeSetState = useCallback(
    (value: StreamState | ((current: StreamState) => StreamState)) => {
      if (mountedRef.current) setState(value);
    },
    []
  );

  const safeSetText = useCallback((value: string) => {
    if (mountedRef.current) setText(value);
  }, []);

  const safeSetError = useCallback((value: string | null) => {
    if (mountedRef.current) setError(value);
  }, []);

  // Throttle UI updates so we don't re-render on every token.
  const flush = useCallback(() => {
    if (flushRef.current !== null) {
      window.clearTimeout(flushRef.current);
      flushRef.current = null;
    }
    if (pendingTextRef.current !== text) {
      safeSetText(pendingTextRef.current);
    }
  }, [text, safeSetText]);

  const scheduleFlush = useCallback(() => {
    if (flushRef.current !== null) return;
    flushRef.current = window.setTimeout(() => {
      flushRef.current = null;
      flush();
    }, 50);
  }, [flush]);

  const cleanup = useCallback(() => {
    if (flushRef.current !== null) {
      window.clearTimeout(flushRef.current);
      flushRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const start = useCallback(
    (pi: string, featureKey: string) => {
      cleanup();
      pendingTextRef.current = "";
      safeSetText("");
      safeSetError(null);
      safeSetState("loading");

      const url = `/api/pis/${encodeURIComponent(
        pi
      )}/features/${encodeURIComponent(featureKey)}/lodestar`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        safeSetState("loading");
      };

      es.onmessage = (event) => {
        const parsed = parseEvent(event.data);
        if (!parsed) return;

        switch (parsed.type) {
          case "meta":
            safeSetState((current) =>
              current === "loading" ? "streaming" : current
            );
            break;
          case "chunk":
            if (parsed.text) {
              pendingTextRef.current += parsed.text;
              scheduleFlush();
            }
            safeSetState((current) =>
              current === "loading" || current === "streaming"
                ? "streaming"
                : current
            );
            break;
          case "done":
            flush();
            safeSetState("complete");
            cleanup();
            break;
          case "error":
            safeSetError(parsed.error || "Stream error");
            safeSetState("error");
            cleanup();
            break;
        }
      };

      es.onerror = () => {
        safeSetError("SSE connection failed");
        safeSetState("error");
        cleanup();
      };
    },
    [cleanup, flush, safeSetError, safeSetState, safeSetText, scheduleFlush]
  );

  const reset = useCallback(() => {
    cleanup();
    pendingTextRef.current = "";
    safeSetText("");
    safeSetError(null);
    safeSetState("idle");
  }, [cleanup, safeSetError, safeSetState, safeSetText]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return { state, text, error, start, reset };
}

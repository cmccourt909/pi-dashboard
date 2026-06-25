"use client";

// dashboard/components/roadmap/hooks/useLodestarStream.ts
//
// useLodestarStream — Phase 2 (T2.2)
//
// Encapsulates the full Lodestar SSE lifecycle:
//   - EventSource creation and teardown tied to drawer open/close
//   - StreamStatus state machine (idle → streaming → complete | error)
//   - Session-level LRU cache (50-entry cap, keyed by pi:featureKey)
//   - Prompt version capture from the 'meta' SSE event
//   - Retry and cancel controls
//
// Pre-build decisions applied:
//   1. Prompt version read from { type: 'meta', promptVersion } SSE event —
//      native EventSource cannot access response headers.
//   2. Cache keyed by `${pi}:${featureKey}` — prevents cross-PI cache
//      poisoning if RoadmapPage does not fully remount on PI switch.

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NarrativeChunk,
  StreamStatus,
  UseLodestarStreamResult,
} from "../../../types/roadmap";

// ---------------------------------------------------------------------------
// LRU cache — 50-entry cap, persists for the lifetime of the page mount
// ---------------------------------------------------------------------------

interface CacheEntry {
  text: string;
  promptVersion: string;
}

class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }
}

// Module-level singleton: survives re-renders, cleared on full page navigation.
const sessionCache = new LRUCache<string, CacheEntry>(50);

function cacheKey(pi: string, featureKey: string): string {
  return `${pi}:${featureKey}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLodestarStream(
  pi: string | null,
  featureKey: string | null,
  active: boolean
): UseLodestarStreamResult {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [text, setText] = useState<string>("");
  const [promptVersion, setPromptVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    closeStream();
    setStatus("idle");
    setText("");
    setPromptVersion(null);
    setError(null);
  }, [closeStream]);

  const retry = useCallback(() => {
    closeStream();
    setError(null);
    setStatus("idle");
    setText("");
    setPromptVersion(null);
  }, [closeStream]);

  // ---------------------------------------------------------------------------
  // Main effect — open/close EventSource based on active + key pair
  // The EventSource opens only after the drawer is active (R14.10),
  // which DetailDrawer controls via the `open` prop it passes as `active`.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!active || !pi || !featureKey) {
      closeStream();
      setStatus("idle");
      return;
    }

    const key = cacheKey(pi, featureKey);

    // Cache hit — no new stream needed (R14.7)
    const cached = sessionCache.get(key);
    if (cached) {
      setText(cached.text);
      setPromptVersion(cached.promptVersion);
      setStatus("complete");
      return;
    }

    // Already streaming or complete for this key
    if (status === "streaming" || status === "complete") {
      return;
    }

    // The SSE endpoint routes through Next.js rewrite at /api/[...path]/route.ts
    // which proxies to the FastAPI backend — same pattern as other API calls.
    const url = `/api/pis/${encodeURIComponent(pi)}/features/${encodeURIComponent(featureKey)}/lodestar`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    let accumulated = "";
    let receivedVersion: string | null = null;

    setStatus("streaming");
    setText("");
    setPromptVersion(null);
    setError(null);

    es.onmessage = (event: MessageEvent) => {
      let parsed: NarrativeChunk;
      try {
        parsed = JSON.parse(event.data) as NarrativeChunk;
      } catch {
        return;
      }

      switch (parsed.type) {
        case "meta":
          receivedVersion = parsed.promptVersion;
          setPromptVersion(parsed.promptVersion);
          break;

        case "chunk":
          accumulated += parsed.text;
          setText(accumulated);
          break;

        case "done":
          es.close();
          eventSourceRef.current = null;
          sessionCache.set(key, {
            text: accumulated,
            promptVersion: receivedVersion ?? "unknown",
          });
          setStatus("complete");
          break;

        case "error":
          es.close();
          eventSourceRef.current = null;
          setError(parsed.error);
          setStatus("error");
          break;
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setError(
        "Connection to Lodestar failed. Check network or CORS configuration."
      );
      setStatus("error");
    };

    return () => {
      closeStream();
    };
    // status intentionally excluded — prevents reopening on status change;
    // cache-hit path handled above on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pi, featureKey, closeStream]);

  // Drawer close: reset to idle, retain cache
  useEffect(() => {
    if (!active) {
      closeStream();
      setStatus((prev) => (prev !== "idle" ? "idle" : prev));
    }
  }, [active, closeStream]);

  return { status, text, promptVersion, error, retry, cancel };
}

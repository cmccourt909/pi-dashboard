"use client";

// dashboard/components/roadmap/hooks/useLodestarStream.ts

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

  // Tracks which pi:featureKey the current stream belongs to.
  // Scopes the status guard so switching features always opens a new stream
  // even when status is still complete from the previous feature.
  // Fix for T2.2 — Lodestar panel does not update on feature switch.
  const currentKeyRef = useRef<string | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    closeStream();
    currentKeyRef.current = null;
    setStatus("idle");
    setText("");
    setPromptVersion(null);
    setError(null);
  }, [closeStream]);

  const retry = useCallback(() => {
    closeStream();
    currentKeyRef.current = null;
    setError(null);
    setStatus("idle");
    setText("");
    setPromptVersion(null);
  }, [closeStream]);

  useEffect(() => {
    if (!active || !pi || !featureKey) {
      closeStream();
      setStatus("idle");
      return;
    }

    const key = cacheKey(pi, featureKey);

    // Cache hit
    const cached = sessionCache.get(key);
    if (cached) {
      setText(cached.text);
      setPromptVersion(cached.promptVersion);
      setStatus("complete");
      currentKeyRef.current = key;
      return;
    }

    // Same key already streaming or complete — don't re-open
    if (
      currentKeyRef.current === key &&
      (status === "streaming" || status === "complete")
    ) {
      return;
    }

    currentKeyRef.current = key;

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
      setError("Connection to Lodestar failed. Check network or CORS configuration.");
      setStatus("error");
    };

    return () => {
      closeStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pi, featureKey, closeStream]);

  useEffect(() => {
    if (!active) {
      closeStream();
      currentKeyRef.current = null;
      setStatus((prev) => (prev !== "idle" ? "idle" : prev));
    }
  }, [active, closeStream]);

  return { status, text, promptVersion, error, retry, cancel };
}

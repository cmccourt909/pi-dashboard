import "@testing-library/jest-dom/vitest";

// Mock EventSource for jsdom environment (used by SSE streaming components)
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.OPEN;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

// @ts-expect-error - EventSource is not available in jsdom
globalThis.EventSource = MockEventSource;

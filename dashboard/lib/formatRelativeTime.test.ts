import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null input", () => {
    expect(formatRelativeTime(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatRelativeTime(undefined)).toBeNull();
  });

  it("returns null for invalid timestamp", () => {
    expect(formatRelativeTime("not-a-date")).toBeNull();
    expect(formatRelativeTime("")).toBeNull();
  });

  it('returns "Generated just now" for timestamps less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:30Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe("Generated just now");
  });

  it('returns "Generated just now" for future timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T13:00:00Z")).toBe("Generated just now");
  });

  it("returns minutes ago for timestamps 1-59 minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:05:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 5 minutes ago"
    );
  });

  it("returns singular minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:01:30Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 1 minute ago"
    );
  });

  it("returns hours ago for timestamps 1-23 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 2 hours ago"
    );
  });

  it("returns singular hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T13:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 1 hour ago"
    );
  });

  it("returns days ago for timestamps 1-6 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-18T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 3 days ago"
    );
  });

  it("returns singular day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-16T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 1 day ago"
    );
  });

  it("returns weeks ago for timestamps 1-3 weeks ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-29T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 2 weeks ago"
    );
  });

  it("returns months ago for timestamps 1-11 months ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-15T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 3 months ago"
    );
  });

  it("returns years ago for very old timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-15T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 2 years ago"
    );
  });

  it("returns singular year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-20T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe(
      "Generated 1 year ago"
    );
  });
});

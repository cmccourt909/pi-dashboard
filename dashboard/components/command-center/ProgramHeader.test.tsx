import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProgramHeader from "./ProgramHeader";

describe("ProgramHeader", () => {
  it("displays 'Program overview' heading", () => {
    render(<ProgramHeader lastSyncTimestamp={null} isSyncing={false} />);
    expect(screen.getByRole("heading", { name: "Program overview" })).toBeDefined();
  });

  it("shows formatted sync timestamp when provided", () => {
    render(
      <ProgramHeader
        lastSyncTimestamp="2024-06-15T14:30:00Z"
        isSyncing={false}
      />
    );
    const status = screen.getByTestId("sync-status");
    expect(status.textContent).toContain("Last synced");
    expect(status.textContent).toContain("Jun");
    expect(status.textContent).toContain("15");
    expect(status.textContent).toContain("2024");
  });

  it("shows 'Not yet synced' when timestamp is null", () => {
    render(<ProgramHeader lastSyncTimestamp={null} isSyncing={false} />);
    const status = screen.getByTestId("sync-status");
    expect(status.textContent).toBe("Not yet synced");
  });

  it("shows loading spinner when isSyncing is true", () => {
    render(<ProgramHeader lastSyncTimestamp={null} isSyncing={true} />);
    expect(screen.getByTestId("sync-spinner")).toBeDefined();
    expect(screen.getByRole("status", { name: "Syncing data" })).toBeDefined();
  });

  it("shows 'Syncing…' text when isSyncing is true", () => {
    render(<ProgramHeader lastSyncTimestamp="2024-06-15T14:30:00Z" isSyncing={true} />);
    const status = screen.getByTestId("sync-status");
    expect(status.textContent).toBe("Syncing…");
  });

  it("does not show spinner when isSyncing is false", () => {
    render(<ProgramHeader lastSyncTimestamp={null} isSyncing={false} />);
    expect(screen.queryByTestId("sync-spinner")).toBeNull();
  });

  it("handles invalid timestamp gracefully", () => {
    render(<ProgramHeader lastSyncTimestamp="not-a-date" isSyncing={false} />);
    const status = screen.getByTestId("sync-status");
    expect(status.textContent).toBe("Not yet synced");
  });
});

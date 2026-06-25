import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DetailDrawer from "./DetailDrawer";
import type { FeatureItem } from "@/types/roadmap";

const mockFeature: FeatureItem = {
  feature_key: "TSU-101",
  summary: "Implement user authentication flow",
  team: "Alpha",
  assignee: "Jane Doe",
  status: "In Progress",
  status_category: "indeterminate",
  rag_status: "green",
  pi_completion: [
    {
      pi_name: "PI 26.2",
      done_pct: 45,
      prog_pct: 30,
      todo_pct: 25,
      story_count: 8,
      sp_done: 18,
      sp_total: 40,
    },
  ],
  blockers: ["ISC-200", "PNR-300"],
  is_blocked_by: ["TSU-50"],
  sprint_breakdown: [],
  lodestar_static: "Feature is progressing well. Expected to complete in Sprint 3.",
};

describe("DetailDrawer", () => {
  let mainContent: HTMLDivElement;

  beforeEach(() => {
    mainContent = document.createElement("div");
    mainContent.id = "roadmap-main-content";
    document.body.appendChild(mainContent);
  });

  afterEach(() => {
    document.body.removeChild(mainContent);
  });

  it("renders as a dialog with aria-label when open", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute(
      "aria-label",
      "Feature details for TSU-101"
    );
  });

  it("displays feature key in the header", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("TSU-101")).toBeInTheDocument();
  });

  it("displays feature summary", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(
      screen.getByText("Implement user authentication flow")
    ).toBeInTheDocument();
  });

  it("displays assignee", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("displays 'Unassigned' when assignee is null", () => {
    const featureNoAssignee = { ...mockFeature, assignee: null };
    render(
      <DetailDrawer feature={featureNoAssignee} open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("displays RAG status badge", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("displays amber RAG status as 'At Risk'", () => {
    const amberFeature = { ...mockFeature, rag_status: "amber" as const };
    render(
      <DetailDrawer feature={amberFeature} open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });

  it("displays red RAG status as 'Blocked'", () => {
    const redFeature = { ...mockFeature, rag_status: "red" as const };
    render(
      <DetailDrawer feature={redFeature} open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("displays progress percentages", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("Done 45%")).toBeInTheDocument();
    expect(screen.getByText("In Progress 30%")).toBeInTheDocument();
    expect(screen.getByText("Todo 25%")).toBeInTheDocument();
  });

  it("displays blocker list", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("ISC-200")).toBeInTheDocument();
    expect(screen.getByText("PNR-300")).toBeInTheDocument();
  });

  it("displays blocked-by list", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(screen.getByText("TSU-50")).toBeInTheDocument();
  });

  it("displays 'None' when no blockers", () => {
    const noDeps = { ...mockFeature, blockers: [], is_blocked_by: [] };
    render(<DetailDrawer feature={noDeps} open={true} onClose={vi.fn()} />);

    const noneElements = screen.getAllByText("None");
    expect(noneElements.length).toBe(2);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<DetailDrawer feature={mockFeature} open={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText("Close detail drawer");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<DetailDrawer feature={mockFeature} open={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(<DetailDrawer feature={mockFeature} open={true} onClose={onClose} />);

    const overlay = screen.getByTestId("drawer-overlay");
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies inert attribute on background content when open", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(mainContent.hasAttribute("inert")).toBe(true);
  });

  it("removes inert attribute on background content when closed", () => {
    const { rerender } = render(
      <DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />
    );

    expect(mainContent.hasAttribute("inert")).toBe(true);

    rerender(
      <DetailDrawer feature={mockFeature} open={false} onClose={vi.fn()} />
    );

    expect(mainContent.hasAttribute("inert")).toBe(false);
  });

  it("has translateX(0) when open", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    const drawer = screen.getByTestId("detail-drawer");
    expect(drawer).toHaveStyle({ transform: "translateX(0)" });
  });

  it("has translateX(100%) when closed", () => {
    render(
      <DetailDrawer feature={mockFeature} open={false} onClose={vi.fn()} />
    );

    const drawer = screen.getByTestId("detail-drawer");
    expect(drawer).toHaveStyle({ transform: "translateX(100%)" });
  });

  it("renders LodestarPanel with lodestar_static text", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    expect(
      screen.getByText(
        "Feature is progressing well. Expected to complete in Sprint 3."
      )
    ).toBeInTheDocument();
  });

  it("does not render drawer content when feature is null and not open", () => {
    render(<DetailDrawer feature={null} open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has a 300px width", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    const drawer = screen.getByTestId("detail-drawer");
    expect(drawer).toHaveStyle({ width: "300px" });
  });

  it("has 200ms transition duration", () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    const drawer = screen.getByTestId("detail-drawer");
    expect(drawer.style.transition).toContain("200ms");
  });

  it("auto-focuses the close button when opened", async () => {
    render(<DetailDrawer feature={mockFeature} open={true} onClose={vi.fn()} />);

    const closeBtn = screen.getByLabelText("Close detail drawer");
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });
  });
});

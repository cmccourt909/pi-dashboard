import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuickNavigationGrid, { DEFAULT_NAV_CARDS } from "./QuickNavigationGrid";
import { NavCard } from "./types";

describe("QuickNavigationGrid", () => {
  it("renders all 4 default navigation cards", () => {
    render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    expect(screen.getByText("Roadmap")).toBeDefined();
    expect(screen.getByText("Forecast")).toBeDefined();
    expect(screen.getByText("Features")).toBeDefined();
    expect(screen.getByText("Findings")).toBeDefined();
  });

  it("renders card descriptions", () => {
    render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    expect(screen.getByText("View program roadmap and timeline")).toBeDefined();
    expect(screen.getByText("Monte Carlo forecasts and confidence")).toBeDefined();
    expect(screen.getByText("Feature status and progress tracking")).toBeDefined();
    expect(screen.getByText("Analysis findings and recommendations")).toBeDefined();
  });

  it("renders cards as links with correct href", () => {
    render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(4);

    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/roadmap");
    expect(hrefs).toContain("/forecast");
    expect(hrefs).toContain("/features");
    expect(hrefs).toContain("/findings");
  });

  it("applies card shadow and border radius styles to each card", () => {
    const { container } = render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    const cards = container.querySelectorAll("a");
    cards.forEach((card) => {
      expect((card as HTMLElement).style.boxShadow).toBe("var(--shadow-card)");
      expect((card as HTMLElement).style.borderRadius).toBe("var(--radius-md)");
    });
  });

  it("renders the grid container with grid layout classes", () => {
    const { container } = render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-2");
  });

  it("renders custom cards when provided", () => {
    const customCards: NavCard[] = [
      {
        label: "Custom Page",
        href: "/custom",
        description: "A custom navigation target",
        icon: () => <span data-testid="custom-icon">★</span>,
      },
    ];
    render(<QuickNavigationGrid cards={customCards} />);
    expect(screen.getByText("Custom Page")).toBeDefined();
    expect(screen.getByText("A custom navigation target")).toBeDefined();
    expect(screen.getByTestId("custom-icon")).toBeDefined();
  });

  it("renders icon for each card", () => {
    const { container } = render(<QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });

  it("renders empty grid when no cards provided", () => {
    const { container } = render(<QuickNavigationGrid cards={[]} />);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(0);
  });
});

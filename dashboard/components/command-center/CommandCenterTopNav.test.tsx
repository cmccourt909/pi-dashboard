import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommandCenterTopNav from "./CommandCenterTopNav";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("CommandCenterTopNav", () => {
  const defaultProps = {
    currentPath: "/",
    userName: "Jordan Lee",
    userInitials: "JL",
  };

  it("renders the top nav bar", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(screen.getByTestId("command-center-top-nav")).toBeInTheDocument();
  });

  it("renders with fixed position and deep-indigo background", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    const nav = screen.getByTestId("command-center-top-nav");
    expect(nav).toHaveClass("fixed");
    expect(nav).toHaveStyle({ backgroundColor: "var(--color-nav-bg)" });
  });

  it("displays the Northline brand text", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(
      screen.getByText("NORTHLINE DELIVERY INTELLIGENCE")
    ).toBeInTheDocument();
  });

  it("renders compass mark SVG", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    const nav = screen.getByTestId("command-center-top-nav");
    const svg = nav.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders all 6 navigation links", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Features" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forecast" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Findings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("marks the active nav link with aria-current", () => {
    render(<CommandCenterTopNav {...defaultProps} currentPath="/" />);
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark non-active links with aria-current", () => {
    render(<CommandCenterTopNav {...defaultProps} currentPath="/" />);
    const featuresLink = screen.getByRole("link", { name: "Features" });
    expect(featuresLink).not.toHaveAttribute("aria-current");
  });

  it("highlights a different path when currentPath changes", () => {
    render(<CommandCenterTopNav {...defaultProps} currentPath="/roadmap" />);
    const roadmapLink = screen.getByRole("link", { name: "Roadmap" });
    expect(roadmapLink).toHaveAttribute("aria-current", "page");
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).not.toHaveAttribute("aria-current");
  });

  it("renders user initials avatar", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(screen.getByTestId("user-avatar")).toHaveTextContent("JL");
  });

  it("renders user name", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(screen.getByTestId("user-name")).toHaveTextContent("Jordan Lee");
  });

  it("has proper navigation landmark", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
  });

  it("nav links have correct href attributes", () => {
    render(<CommandCenterTopNav {...defaultProps} />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/roadmap");
    expect(screen.getByRole("link", { name: "Forecast" })).toHaveAttribute("href", "/forecast");
    expect(screen.getByRole("link", { name: "Findings" })).toHaveAttribute("href", "/findings");
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });
});

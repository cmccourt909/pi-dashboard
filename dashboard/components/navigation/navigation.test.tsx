import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppSidebar from "./AppSidebar";
import TopNavBar from "./TopNavBar";
import UserProfileBlock from "./UserProfileBlock";
import LiveDataIndicator from "./LiveDataIndicator";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import MobileBottomNav from "./MobileBottomNav";

const mocks = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

beforeEach(() => {
  mocks.pathname = "/";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppSidebar", () => {
  it("renders the sidebar with logo", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-logo")).toHaveTextContent("Northline");
  });

  it("renders all navigation items", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("nav-item-overview")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-features")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-roadmap")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-forecast")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-findings")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-admin")).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    mocks.pathname = "/roadmap";
    render(<AppSidebar />);
    const roadmapLink = screen.getByTestId("nav-item-roadmap");
    expect(roadmapLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark other routes as active", () => {
    mocks.pathname = "/roadmap";
    render(<AppSidebar />);
    const overviewLink = screen.getByTestId("nav-item-overview");
    expect(overviewLink).not.toHaveAttribute("aria-current");
  });

  it("renders user profile block", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("user-profile-block")).toBeInTheDocument();
  });
});

describe("TopNavBar", () => {
  it("renders the top navigation bar", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("top-nav-bar")).toBeInTheDocument();
  });

  it("displays the page title based on the route", () => {
    mocks.pathname = "/features";
    render(<TopNavBar />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Features");
  });

  it("displays live data indicator", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("live-data-indicator")).toBeInTheDocument();
  });

  it("displays refresh, search, and notification buttons", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
    expect(screen.getByTestId("global-search-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("shows notification badge when count is greater than zero", () => {
    render(<TopNavBar notificationCount={3} />);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("3");
  });

  it("caps notification badge at 99+", () => {
    render(<TopNavBar notificationCount={150} />);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("99+");
  });

  it("opens global search when trigger is clicked", async () => {
    render(<TopNavBar />);
    await userEvent.click(screen.getByTestId("global-search-trigger"));
    expect(screen.getByTestId("global-search-input")).toBeInTheDocument();
  });
});

describe("UserProfileBlock", () => {
  it("renders name and role", () => {
    render(<UserProfileBlock name="Jordan Lee" role="Engineering Manager" />);
    expect(screen.getByTestId("user-name")).toHaveTextContent("Jordan Lee");
    expect(screen.getByTestId("user-role")).toHaveTextContent("Engineering Manager");
  });

  it("renders initials from the name", () => {
    render(<UserProfileBlock name="Jordan Lee" role="Engineering Manager" />);
    expect(screen.getByTestId("user-avatar")).toHaveTextContent("JL");
  });

  it("renders a single initial for one name", () => {
    render(<UserProfileBlock name="Jordan" role="Engineering Manager" />);
    expect(screen.getByTestId("user-avatar")).toHaveTextContent("J");
  });

  it("hides name and role when collapsed", () => {
    render(<UserProfileBlock name="Jordan Lee" role="Engineering Manager" collapsed />);
    expect(screen.queryByTestId("user-name")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-role")).not.toBeInTheDocument();
  });
});

describe("LiveDataIndicator", () => {
  it("renders desktop live indicator", () => {
    render(<LiveDataIndicator timestamp="7:11 PM" />);
    expect(screen.getByTestId("live-data-indicator")).toHaveTextContent("Live API data");
    expect(screen.getByTestId("live-data-indicator")).toHaveTextContent("7:11 PM");
  });

  it("renders mobile compact indicator", () => {
    render(<LiveDataIndicator variant="mobile" />);
    expect(screen.getByTestId("live-data-indicator")).toHaveTextContent("Live");
    expect(screen.getByTestId("live-data-indicator")).not.toHaveTextContent("API data");
  });

  it("shows offline state", () => {
    render(<LiveDataIndicator isLive={false} />);
    expect(screen.getByTestId("live-data-indicator")).toHaveTextContent("Offline");
  });
});

describe("NotificationBell", () => {
  it("renders bell icon without badge when count is zero", () => {
    render(<NotificationBell />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });

  it("renders badge with count", () => {
    render(<NotificationBell count={5} />);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("5");
  });

  it("caps badge at 99+", () => {
    render(<NotificationBell count={120} />);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("99+");
  });
});

describe("GlobalSearch", () => {
  it("renders trigger button by default", () => {
    render(<GlobalSearch />);
    expect(screen.getByTestId("global-search-trigger")).toBeInTheDocument();
  });

  it("expands input when trigger is clicked", async () => {
    render(<GlobalSearch />);
    await userEvent.click(screen.getByTestId("global-search-trigger"));
    expect(screen.getByTestId("global-search-input")).toBeInTheDocument();
  });

  it("calls onSearch with query when submitted", async () => {
    const onSearch = vi.fn();
    render(<GlobalSearch onSearch={onSearch} />);
    await userEvent.click(screen.getByTestId("global-search-trigger"));
    const input = screen.getByTestId("global-search-input");
    await userEvent.type(input, "roadmap");
    await userEvent.keyboard("{Enter}");
    expect(onSearch).toHaveBeenCalledWith("roadmap");
  });
});

describe("MobileBottomNav", () => {
  it("renders all mobile navigation tabs", () => {
    render(<MobileBottomNav />);
    expect(screen.getByTestId("mobile-nav-overview")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-features")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-roadmap")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-forecast")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-findings")).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    mocks.pathname = "/roadmap";
    render(<MobileBottomNav />);
    expect(screen.getByTestId("mobile-nav-roadmap")).toHaveAttribute("aria-current", "page");
  });
});

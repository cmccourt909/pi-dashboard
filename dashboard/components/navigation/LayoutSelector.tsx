"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import TopNavBar from "./TopNavBar";
import MobileBottomNav from "./MobileBottomNav";
import CommandCenterTopNav from "../command-center/CommandCenterTopNav";

/**
 * LayoutSelector conditionally renders navigation based on the current route.
 *
 * - On the overview route ("/"), renders CommandCenterTopNav instead of the sidebar.
 * - On all other routes, renders the standard AppSidebar + TopNavBar + MobileBottomNav.
 *
 * Validates: Requirements 1.6, 1.7
 */
export default function LayoutSelector() {
  const pathname = usePathname();
  const isOverview = pathname === "/";

  if (isOverview) {
    return (
      <CommandCenterTopNav
        currentPath={pathname}
        userName="Alex Morgan"
        userInitials="AM"
      />
    );
  }

  return (
    <>
      <AppSidebar />
      <TopNavBar />
      <MobileBottomNav />
    </>
  );
}

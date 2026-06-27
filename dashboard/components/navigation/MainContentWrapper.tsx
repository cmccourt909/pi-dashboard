"use client";

import { usePathname } from "next/navigation";

/**
 * MainContentWrapper conditionally applies layout styles based on the route.
 *
 * - On the overview route ("/"), removes the sidebar margin (no sidebar present).
 * - On all other routes, applies the standard .main-content class with sidebar margin.
 */
export default function MainContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCommandCenter = pathname === "/";

  return (
    <main
      id="main-content"
      className={isCommandCenter ? "" : "main-content"}
    >
      {children}
    </main>
  );
}

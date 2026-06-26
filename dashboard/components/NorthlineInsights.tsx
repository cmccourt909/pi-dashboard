"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import NorthlineInsightsStrip from "./NorthlineInsightsStrip";

/**
 * Client wrapper for NorthlineInsightsStrip that wires up navigation
 * and refresh callbacks.
 */
export default function NorthlineInsights() {
  const router = useRouter();

  const handleViewFindings = useCallback(() => {
    router.push("/findings");
  }, [router]);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <NorthlineInsightsStrip
      onRefresh={handleRefresh}
      onViewFindings={handleViewFindings}
    />
  );
}

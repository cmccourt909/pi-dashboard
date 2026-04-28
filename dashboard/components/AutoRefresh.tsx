"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ intervalSeconds = 60 }) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      setLastUpdated(0);
    }, intervalSeconds * 1000);

    const counter = setInterval(() => {
      setLastUpdated((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(counter);
    };
  }, [intervalSeconds, router]);

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: lastUpdated < 10 ? "var(--status-healthy)" : "var(--text-muted)",
        letterSpacing: "0.08em",
        transition: "color 1s",
      }}
    >
      LIVE {lastUpdated === 0 ? "• UPDATED" : lastUpdated + "s ago"}
    </span>
  );
}
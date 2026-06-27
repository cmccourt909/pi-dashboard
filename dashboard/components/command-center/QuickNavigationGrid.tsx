import React from "react";
import Link from "next/link";
import { NavCard } from "./types";

interface QuickNavigationGridProps {
  cards: NavCard[];
}

/* Simple placeholder icons for each navigation card */
function RoadmapIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 17h4V7H3v10zm6 0h4V3H9v14zm6 0h4v-6h-4v6z"
        fill="currentColor"
      />
    </svg>
  );
}

function ForecastIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 18.5l6-6 4 4L22 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeaturesIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FindingsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Default navigation cards for the Quick Navigation Grid. */
export const DEFAULT_NAV_CARDS: NavCard[] = [
  {
    label: "Roadmap",
    href: "/roadmap",
    description: "View program roadmap and timeline",
    icon: RoadmapIcon,
  },
  {
    label: "Forecast",
    href: "/forecast",
    description: "Monte Carlo forecasts and confidence",
    icon: ForecastIcon,
  },
  {
    label: "Features",
    href: "/features",
    description: "Feature status and progress tracking",
    icon: FeaturesIcon,
  },
  {
    label: "Findings",
    href: "/findings",
    description: "Analysis findings and recommendations",
    icon: FindingsIcon,
  },
];

/**
 * Quick Navigation Grid component.
 *
 * Renders a 2x2 (or 4-column on wide screens) grid of navigation cards.
 * Each card is a clickable link that navigates to its corresponding page.
 *
 * Validates: Requirements 7.4, 7.5
 */
export default function QuickNavigationGrid({ cards }: QuickNavigationGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 p-4 no-underline transition-shadow hover:shadow-lg"
            style={{
              boxShadow: "var(--shadow-card)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-surface, #ffffff)",
              color: "var(--color-text-primary)",
            }}
          >
            <span
              className="flex items-center justify-center w-10 h-10 rounded-full"
              style={{
                backgroundColor: "var(--color-bg-secondary, #f1f5f9)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Icon />
            </span>

            <span className="text-sm font-semibold">{card.label}</span>

            <span
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {card.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

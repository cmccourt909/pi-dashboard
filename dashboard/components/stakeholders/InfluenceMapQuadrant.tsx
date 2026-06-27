"use client";

/**
 * InfluenceMapQuadrant — 2×2 quadrant visualization for stakeholder
 * power/interest mapping.
 *
 * Quadrants:
 *   Top-left:     High Power / Low Interest (Keep Satisfied)
 *   Top-right:    High Power / High Interest (Key Players)
 *   Bottom-left:  Low Power / Low Interest (Monitor)
 *   Bottom-right: Low Power / High Interest (Keep Informed)
 */

interface InfluenceMapQuadrantProps {
  content: string;
}

interface StakeholderMarker {
  name: string;
  power: number; // 0.0 - 1.0
  interest: number; // 0.0 - 1.0
  quadrant: string;
}

const QUADRANT_STYLES = {
  topLeft: { label: "Keep Satisfied", subtitle: "High Power / Low Interest", bg: "var(--color-fill-warning)" },
  topRight: { label: "Key Players", subtitle: "High Power / High Interest", bg: "var(--color-fill-danger)" },
  bottomLeft: { label: "Monitor", subtitle: "Low Power / Low Interest", bg: "var(--color-fill-neutral)" },
  bottomRight: { label: "Keep Informed", subtitle: "Low Power / High Interest", bg: "var(--color-fill-info)" },
};

export default function InfluenceMapQuadrant({ content }: InfluenceMapQuadrantProps) {
  const markers = parseStakeholderMarkers(content);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Quadrant grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 2,
          height: 320,
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Y-axis label */}
        <div
          style={{
            position: "absolute",
            left: -24,
            top: "50%",
            transform: "rotate(-90deg) translateX(-50%)",
            fontSize: "var(--font-size-label)",
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
          }}
        >
          Power →
        </div>
        {/* X-axis label */}
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "var(--font-size-label)",
            color: "var(--color-text-tertiary)",
            fontWeight: 500,
          }}
        >
          Interest →
        </div>

        {/* Top-left: Keep Satisfied */}
        <QuadrantCell
          config={QUADRANT_STYLES.topLeft}
          markers={markers.filter((m) => m.power >= 0.5 && m.interest < 0.5)}
        />
        {/* Top-right: Key Players */}
        <QuadrantCell
          config={QUADRANT_STYLES.topRight}
          markers={markers.filter((m) => m.power >= 0.5 && m.interest >= 0.5)}
        />
        {/* Bottom-left: Monitor */}
        <QuadrantCell
          config={QUADRANT_STYLES.bottomLeft}
          markers={markers.filter((m) => m.power < 0.5 && m.interest < 0.5)}
        />
        {/* Bottom-right: Keep Informed */}
        <QuadrantCell
          config={QUADRANT_STYLES.bottomRight}
          markers={markers.filter((m) => m.power < 0.5 && m.interest >= 0.5)}
        />
      </div>

      {/* Stakeholder list */}
      {markers.length > 0 && (
        <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>
          <p style={{ fontWeight: 500, marginBottom: "var(--space-1)" }}>Stakeholders:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {markers.map((m) => (
              <span
                key={m.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--color-fill-neutral)",
                  fontSize: "var(--font-size-label)",
                }}
              >
                {m.name} ({m.power.toFixed(1)}/{m.interest.toFixed(1)})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuadrantCell({
  config,
  markers,
}: {
  config: { label: string; subtitle: string; bg: string };
  markers: StakeholderMarker[];
}) {
  return (
    <div
      style={{
        background: config.bg,
        padding: "var(--space-3)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        position: "relative",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-label)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {config.label}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "var(--color-text-tertiary)",
          margin: 0,
        }}
      >
        {config.subtitle}
      </p>
      {/* Marker dots */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "var(--space-2)" }}>
        {markers.map((m) => (
          <span
            key={m.name}
            title={m.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 20,
              height: 20,
              padding: "0 4px",
              borderRadius: "var(--radius-pill)",
              background: "var(--color-interactive-primary)",
              color: "var(--color-text-inverse)",
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            {m.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Parse stakeholder markers from the LLM-generated content.
 * Looks for the "Influence Map Coordinates" table.
 */
function parseStakeholderMarkers(content: string): StakeholderMarker[] {
  const markers: StakeholderMarker[] = [];

  // Look for table rows with format: | Name | Power | Interest | Quadrant |
  const lines = content.split("\n");
  for (const line of lines) {
    // Skip header/separator rows
    if (line.includes("---") || line.toLowerCase().includes("stakeholder") && line.toLowerCase().includes("power")) {
      continue;
    }

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3) {
      const power = parseFloat(cells[1]);
      const interest = parseFloat(cells[2]);
      if (!isNaN(power) && !isNaN(interest) && power >= 0 && power <= 1 && interest >= 0 && interest <= 1) {
        markers.push({
          name: cells[0],
          power,
          interest,
          quadrant: cells[3] || "",
        });
      }
    }
  }

  return markers;
}

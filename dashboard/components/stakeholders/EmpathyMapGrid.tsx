"use client";

/**
 * EmpathyMapGrid — 6-quadrant grid layout for stakeholder empathy maps.
 * Quadrants: Thinks, Feels, Says, Does, Pains, Gains
 *
 * Parses the section result text to extract quadrant content for display
 * in a CSS Grid layout.
 */

interface EmpathyMapGridProps {
  content: string;
}

interface EmpathyQuadrant {
  thinks: string;
  feels: string;
  says: string;
  does: string;
  pains: string;
  gains: string;
}

interface StakeholderEmpathyMap {
  name: string;
  quadrants: EmpathyQuadrant;
}

const QUADRANT_COLORS: Record<keyof EmpathyQuadrant, string> = {
  thinks: "var(--color-fill-info)",
  feels: "var(--color-fill-warning)",
  says: "var(--color-fill-success)",
  does: "var(--color-fill-neutral)",
  pains: "var(--color-fill-danger)",
  gains: "var(--color-fill-success)",
};

const QUADRANT_LABELS: Record<keyof EmpathyQuadrant, string> = {
  thinks: "💭 Thinks",
  feels: "❤️ Feels",
  says: "💬 Says",
  does: "⚡ Does",
  pains: "😟 Pains",
  gains: "🎯 Gains",
};

export default function EmpathyMapGrid({ content }: EmpathyMapGridProps) {
  const maps = parseEmpathyMaps(content);

  if (maps.length === 0) {
    return (
      <div
        style={{ whiteSpace: "pre-wrap", fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)" }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {maps.map((map) => (
        <div key={map.name}>
          <h4
            style={{
              fontSize: "var(--font-size-body)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-3)",
            }}
          >
            {map.name}
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "auto auto auto",
              gap: "var(--space-2)",
            }}
          >
            {(Object.keys(QUADRANT_LABELS) as Array<keyof EmpathyQuadrant>).map((key) => (
              <div
                key={key}
                style={{
                  background: QUADRANT_COLORS[key],
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-3)",
                  minHeight: 80,
                }}
              >
                <p
                  style={{
                    fontSize: "var(--font-size-label)",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {QUADRANT_LABELS[key]}
                </p>
                <p
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {map.quadrants[key] || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Parse empathy map content from the LLM-generated markdown.
 * Attempts to extract stakeholder names and 6 quadrants.
 */
function parseEmpathyMaps(content: string): StakeholderEmpathyMap[] {
  const maps: StakeholderEmpathyMap[] = [];

  // Split by stakeholder headers (## Name — Empathy Map)
  const stakeholderSections = content.split(/^##\s+/m).filter(Boolean);

  for (const section of stakeholderSections) {
    const lines = section.trim().split("\n");
    const nameMatch = lines[0]?.match(/^(.+?)(?:\s*[—–-]\s*Empathy Map)?$/i);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    const body = lines.slice(1).join("\n");

    const quadrants: EmpathyQuadrant = {
      thinks: extractQuadrantContent(body, "thinks"),
      feels: extractQuadrantContent(body, "feels"),
      says: extractQuadrantContent(body, "says"),
      does: extractQuadrantContent(body, "does"),
      pains: extractQuadrantContent(body, "pains"),
      gains: extractQuadrantContent(body, "gains"),
    };

    // Only include if at least some content was parsed
    if (Object.values(quadrants).some((v) => v)) {
      maps.push({ name, quadrants });
    }
  }

  return maps;
}

function extractQuadrantContent(body: string, quadrant: string): string {
  // Look for the quadrant keyword in table cells or section headers
  const patterns = [
    new RegExp(`\\|\\s*${quadrant}\\s*\\|([^|]+)\\|`, "gi"),
    new RegExp(`\\*\\*${quadrant}\\*\\*[:\\s]*(.+?)(?=\\*\\*|$)`, "gis"),
    new RegExp(`^\\s*${quadrant}[:\\s]*(.+?)$`, "gim"),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(body);
    if (match?.[1]) {
      return match[1].trim().replace(/^\||\|$/g, "").trim();
    }
  }

  return "";
}

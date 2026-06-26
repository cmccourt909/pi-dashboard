export interface NarrativeSections {
  deliveryStatus: string;
  risksAndBlockers: string;
  recommendedActions: string;
}

const HEADER_NAMES: Array<keyof NarrativeSections> = [
  "deliveryStatus",
  "risksAndBlockers",
  "recommendedActions",
];

const HEADER_LABELS: Record<keyof NarrativeSections, RegExp> = {
  deliveryStatus: /delivery\s*status:/i,
  risksAndBlockers: /risks?\s*&?\s*blockers?:/i,
  recommendedActions: /recommended\s*actions?:/i,
};

/**
 * Parse a raw Lodestar narrative into three typed sections.
 *
 * Matches the sentinel headers case-insensitively and in any order. If no
 * header is found, the entire text is returned as the deliveryStatus section
 * so the UI can always render something.
 */
export function parseSections(raw: string): NarrativeSections {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { deliveryStatus: "", risksAndBlockers: "", recommendedActions: "" };
  }

  // Find the start index of each known header.
  const positions: Array<{
    key: keyof NarrativeSections;
    index: number;
    length: number;
  }> = [];

  for (const key of HEADER_NAMES) {
    const match = HEADER_LABELS[key].exec(trimmed);
    if (match) {
      positions.push({ key, index: match.index, length: match[0].length });
    }
  }

  if (positions.length === 0) {
    return { deliveryStatus: trimmed, risksAndBlockers: "", recommendedActions: "" };
  }

  // Sort by appearance order so we can slice between headers.
  positions.sort((a, b) => a.index - b.index);

  const sections: NarrativeSections = {
    deliveryStatus: "",
    risksAndBlockers: "",
    recommendedActions: "",
  };

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const next = positions[i + 1];
    const start = current.index + current.length;
    const end = next ? next.index : trimmed.length;
    const body = trimmed.slice(start, end).trim();
    sections[current.key] = body;
  }

  // Any text before the first header becomes the deliveryStatus prefix.
  if (positions[0].index > 0) {
    const prefix = trimmed.slice(0, positions[0].index).trim();
    if (prefix) {
      sections.deliveryStatus = `${prefix}\n\n${sections.deliveryStatus}`.trim();
    }
  }

  return sections;
}

/**
 * Return true if the raw narrative contains at least one sentinel header.
 */
export function hasStructuredSections(raw: string | null): boolean {
  if (!raw) return false;
  return Object.values(HEADER_LABELS).some((re) => re.test(raw));
}

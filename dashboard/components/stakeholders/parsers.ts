/**
 * Section text parsers — extract structured data from LLM-generated markdown.
 * Used by the enhanced section views to render rich visualizations.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpeakerData {
  name: string;
  role: string;
  pct: number;
  utterances: number;
  words: number;
}

export interface SpeakerStatsResult {
  speakers: SpeakerData[];
  concentrationRatio: number | null;
  silentParticipants: string[];
  topInteractionPairs: string[];
}

export interface DecisionItem {
  text: string;
  owner: string;
  context?: string;
}

export interface CommitmentItem {
  text: string;
  owner: string;
  due: string;
}

export interface QuestionItem {
  speaker: string;
  text: string;
}

export interface MeetingMinutesResult {
  decisions: DecisionItem[];
  commitments: CommitmentItem[];
  openQuestions: QuestionItem[];
}

export interface RaidItem {
  text: string;
  severity: string;
  probability?: string;
  impact?: string;
  owner: string;
}

export interface RaidLogResult {
  risks: RaidItem[];
  assumptions: RaidItem[];
  issues: RaidItem[];
  dependencies: RaidItem[];
}

export interface ActionItem {
  description: string;
  owner: string;
  rationale: string;
}

export interface DeliverySignalsResult {
  p1: ActionItem[];
  p2: ActionItem[];
  p3: ActionItem[];
}

export interface TeamHealthResult {
  overallScore: number | null;
  voiceConcentration: number | null;
  facilitation: number | null;
  blockerSurfacing: number | null;
  agileMaturity: number | null;
  recommendation: string;
}

export interface GapAnalysisResult {
  absentRoles: string[];
  undiscussedTopics: string[];
  suggestedQuestions: string[];
}

export interface EmpathyQuadrants {
  thinks: string[];
  feels: string[];
  says: string[];
  does: string[];
  pains: string[];
  gains: string[];
}

export interface StakeholderEmpathy {
  name: string;
  quadrants: EmpathyQuadrants;
}

export interface EmpathyMapResult {
  stakeholders: StakeholderEmpathy[];
}

export interface RegisterEntry {
  name: string;
  tier: number;
  power: number;
  interest: number;
  strategy: string;
}

export interface StakeholderRegisterResult {
  stakeholders: RegisterEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTableRows(text: string, startPattern: RegExp): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (startPattern.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (line.trim().startsWith("|") && !line.includes("---")) {
        const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
        // Skip header rows
        if (cells.length > 0 && !cells[0].toLowerCase().includes("speaker") &&
            !cells[0].toLowerCase().includes("decision") &&
            !cells[0].toLowerCase().includes("commitment") &&
            !cells[0].toLowerCase().includes("action") &&
            !cells[0].toLowerCase().includes("item") &&
            !cells[0].toLowerCase().includes("risk") &&
            !cells[0].toLowerCase().includes("assumption") &&
            !cells[0].toLowerCase().includes("issue") &&
            !cells[0].toLowerCase().includes("dependency") &&
            !cells[0].toLowerCase().includes("stakeholder")) {
          rows.push(cells);
        }
      } else if (line.trim().startsWith("#") && !startPattern.test(line)) {
        break; // Next section
      }
    }
  }
  return rows;
}

function extractBulletList(text: string, headerPattern: RegExp): string[] {
  const items: string[] = [];
  const lines = text.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (headerPattern.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^\d+\.\s/)) {
        items.push(trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""));
      } else if (trimmed.startsWith("#")) {
        break;
      }
    }
  }
  return items;
}

function extractScore(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val)) return val;
  }
  return null;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

export function parseSpeakerStats(text: string): SpeakerStatsResult {
  const speakers: SpeakerData[] = [];
  const lines = text.split("\n");

  // Parse table: | Speaker | Utterances | Words | Share of Voice (%) |
  for (const line of lines) {
    if (!line.includes("|") || line.includes("---")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 4) {
      const utterances = parseInt(cells[1], 10);
      const words = parseInt(cells[2], 10);
      const pct = parseFloat(cells[3]);
      if (!isNaN(utterances) && !isNaN(words) && !isNaN(pct)) {
        speakers.push({
          name: cells[0],
          role: "", // Inferred from context if available
          pct,
          utterances,
          words,
        });
      }
    }
  }

  // Parse concentration ratio
  const ratioMatch = /Concentration Ratio:\s*([\d.]+)/i.exec(text);
  const concentrationRatio = ratioMatch ? parseFloat(ratioMatch[1]) : null;

  // Parse silent participants
  const silentParticipants: string[] = [];
  const silentSection = /Silent Participants.*?\n([\s\S]*?)(?=\n##|\n\n\n|$)/i.exec(text);
  if (silentSection) {
    const silentLines = silentSection[1].split("\n");
    for (const l of silentLines) {
      const trimmed = l.trim().replace(/^[-*]\s+/, "");
      if (trimmed && trimmed !== "(none)" && !trimmed.startsWith("#")) {
        silentParticipants.push(trimmed.split("(")[0].trim());
      }
    }
  }

  // Parse interaction pairs
  const topInteractionPairs = extractBulletList(text, /Top Interaction Pairs/i);

  return { speakers, concentrationRatio, silentParticipants, topInteractionPairs };
}

export function parseMeetingMinutes(text: string): MeetingMinutesResult {
  const decisions: DecisionItem[] = [];
  const commitments: CommitmentItem[] = [];
  const openQuestions: QuestionItem[] = [];

  // Split into sections
  const sections = text.split(/^##\s+/m);

  for (const section of sections) {
    const headerLine = section.split("\n")[0].toLowerCase();

    if (headerLine.includes("decision")) {
      const lines = section.split("\n").slice(1);
      for (const line of lines) {
        if (line.includes("|") && !line.includes("---")) {
          const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
          if (cells.length >= 2 && !cells[0].toLowerCase().includes("decision")) {
            decisions.push({ text: cells[0], owner: cells[1], context: cells[2] || "" });
          }
        }
      }
    } else if (headerLine.includes("commitment")) {
      const lines = section.split("\n").slice(1);
      for (const line of lines) {
        if (line.includes("|") && !line.includes("---")) {
          const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
          if (cells.length >= 2 && !cells[0].toLowerCase().includes("commitment")) {
            commitments.push({ text: cells[0], owner: cells[1], due: cells[2] || "TBD" });
          }
        }
      }
    } else if (headerLine.includes("question")) {
      const lines = section.split("\n").slice(1);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ")) {
          const match = /^-\s*\[([^\]]+)\]:\s*(.+)/.exec(trimmed);
          if (match) {
            openQuestions.push({ speaker: match[1], text: match[2] });
          } else {
            // Try "- Speaker: Question" format
            const colonMatch = /^-\s*([^:]+):\s*(.+)/.exec(trimmed);
            if (colonMatch) {
              openQuestions.push({ speaker: colonMatch[1], text: colonMatch[2] });
            } else {
              openQuestions.push({ speaker: "Team", text: trimmed.replace(/^-\s*/, "") });
            }
          }
        }
      }
    }
  }

  return { decisions, commitments, openQuestions };
}

export function parseRaidLog(text: string): RaidLogResult {
  const result: RaidLogResult = { risks: [], assumptions: [], issues: [], dependencies: [] };

  const sections = text.split(/^##\s+/m);

  for (const section of sections) {
    const headerLine = section.split("\n")[0].toLowerCase();
    let target: RaidItem[] | null = null;

    if (headerLine.includes("risk")) target = result.risks;
    else if (headerLine.includes("assumption")) target = result.assumptions;
    else if (headerLine.includes("issue")) target = result.issues;
    else if (headerLine.includes("dependenc")) target = result.dependencies;

    if (!target) continue;

    const lines = section.split("\n").slice(1);
    for (const line of lines) {
      if (line.includes("|") && !line.includes("---")) {
        const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
        if (cells.length >= 2 && !cells[0].toLowerCase().match(/^(risk|assumption|issue|dependency|item)/)) {
          target.push({
            text: cells[0],
            severity: cells[1] || "",
            probability: cells[2] || "",
            owner: cells[cells.length - 1] || "",
          });
        }
      }
    }
  }

  return result;
}

export function parseDeliverySignals(text: string): DeliverySignalsResult {
  const result: DeliverySignalsResult = { p1: [], p2: [], p3: [] };

  let currentTier: "p1" | "p2" | "p3" | null = null;

  for (const line of text.split("\n")) {
    if (/##.*P1|##.*Immediate|##.*Now/i.test(line)) currentTier = "p1";
    else if (/##.*P2|##.*Sprint|##.*Next/i.test(line)) currentTier = "p2";
    else if (/##.*P3|##.*Monitor|##.*Later/i.test(line)) currentTier = "p3";
    else if (currentTier && line.includes("|") && !line.includes("---")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3 && !cells[0].toLowerCase().includes("action")) {
        result[currentTier].push({
          description: cells[0],
          owner: cells[1] || "Unassigned",
          rationale: cells[2] || "",
        });
      }
    }
  }

  return result;
}

export function parseTeamHealth(text: string): TeamHealthResult {
  const overallScore = extractScore(text, /Score:\s*(\d+)\s*\/\s*10/i)
    ?? extractScore(text, /Overall.*?(\d+)\s*\/\s*10/i);

  // Try to extract sub-scores from the progress-bar patterns
  const voiceConcentration = extractScore(text, /Voice Concentration.*?(\d+)\s*\/\s*10/i)
    ?? extractScore(text, /concentration.*?score[:\s]*(\d+)/i);
  const facilitation = extractScore(text, /Facilitation.*?(\d+)\s*\/\s*10/i)
    ?? extractScore(text, /facilitation.*?score[:\s]*(\d+)/i);
  const blockerSurfacing = extractScore(text, /Blocker.*?(\d+)\s*\/\s*10/i)
    ?? extractScore(text, /blocker.*?score[:\s]*(\d+)/i);
  const agileMaturity = extractScore(text, /Agile.*?(\d+)\s*\/\s*10/i)
    ?? extractScore(text, /maturity.*?score[:\s]*(\d+)/i);

  // Extract recommendation (last paragraph or Lodestar note)
  const recMatch = /(?:recommendation|suggest|improve)[:\s]*([\s\S]*?)(?=\n##|$)/i.exec(text);
  const recommendation = recMatch ? recMatch[1].trim().split("\n").slice(0, 3).join(" ") : "";

  return { overallScore, voiceConcentration, facilitation, blockerSurfacing, agileMaturity, recommendation };
}

export function parseGapAnalysis(text: string): GapAnalysisResult {
  const absentRoles = extractBulletList(text, /Absent.*?(?:Teams|Roles)/i);
  const undiscussedTopics = extractBulletList(text, /Undiscussed.*?Topics/i);
  const suggestedQuestions = extractBulletList(text, /Suggested.*?Questions/i);

  return { absentRoles, undiscussedTopics, suggestedQuestions };
}

export function parseEmpathyMap(text: string): EmpathyMapResult {
  const stakeholders: StakeholderEmpathy[] = [];
  const sections = text.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const nameMatch = lines[0]?.match(/^(.+?)(?:\s*[—–-]\s*Empathy Map)?$/i);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    const body = lines.slice(1).join("\n");

    const quadrants: EmpathyQuadrants = {
      thinks: extractQuadrantItems(body, "thinks"),
      feels: extractQuadrantItems(body, "feels"),
      says: extractQuadrantItems(body, "says"),
      does: extractQuadrantItems(body, "does"),
      pains: extractQuadrantItems(body, "pains"),
      gains: extractQuadrantItems(body, "gains"),
    };

    if (Object.values(quadrants).some((arr) => arr.length > 0)) {
      stakeholders.push({ name, quadrants });
    }
  }

  return { stakeholders };
}

function extractQuadrantItems(body: string, quadrant: string): string[] {
  const items: string[] = [];
  // Look for bullet items after the quadrant keyword
  const pattern = new RegExp(`(?:^|\\|)\\s*${quadrant}[\\s|]*([\\s\\S]*?)(?=\\|\\s*[A-Z]|$)`, "im");
  const match = pattern.exec(body);
  if (match) {
    const content = match[1];
    for (const line of content.split(/[•\n]/)) {
      const trimmed = line.trim().replace(/^\||\|$/g, "").trim();
      if (trimmed && trimmed.length > 2) {
        items.push(trimmed);
      }
    }
  }

  // Fallback: look for bullet lists after a header containing the word
  if (items.length === 0) {
    const headerPattern = new RegExp(`\\*\\*${quadrant}\\*\\*|^\\s*${quadrant}:`, "im");
    const headerMatch = headerPattern.exec(body);
    if (headerMatch) {
      const afterHeader = body.slice(headerMatch.index + headerMatch[0].length);
      for (const line of afterHeader.split("\n").slice(0, 5)) {
        const trimmed = line.trim().replace(/^[-•*]\s*/, "");
        if (trimmed && !trimmed.match(/^[A-Z][a-z]+:/)) {
          items.push(trimmed);
        } else if (trimmed.match(/^[A-Z][a-z]+:/)) {
          break;
        }
      }
    }
  }

  return items;
}

export function parseStakeholderRegister(text: string): StakeholderRegisterResult {
  const stakeholders: RegisterEntry[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.includes("|") || line.includes("---")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 4) {
      // Try to find tier, power, interest in various column arrangements
      const tierMatch = cells.find((c) => /Tier\s*\d/i.test(c));
      const tier = tierMatch ? parseInt(tierMatch.match(/\d/)![0], 10) : 0;

      // Find power and interest (floats 0-1)
      let power = NaN;
      let interest = NaN;
      for (const cell of cells.slice(1)) {
        const val = parseFloat(cell);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          if (isNaN(power)) power = val;
          else if (isNaN(interest)) interest = val;
        }
      }

      if (!isNaN(power) && !isNaN(interest) && tier > 0) {
        const strategy = cells[cells.length - 1] || "";
        stakeholders.push({
          name: cells[0],
          tier,
          power,
          interest,
          strategy: /Tier|^\d/.test(strategy) ? "" : strategy,
        });
      }
    }
  }

  return { stakeholders };
}

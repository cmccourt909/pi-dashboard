"""
app/stakeholders/prompts.py

Prompt templates and construction for the eight Stakeholder Analysis sections.
Each section has a dedicated prompt template that is injected with the transcript
content before being sent to the LLM adapter.
"""
from __future__ import annotations


STAKEHOLDER_PROMPT_VERSION = "v1.0"

SECTION_PROMPTS: dict[str, str] = {
    "speaker_statistics": (
        "System: You are a delivery intelligence analyst specializing in meeting participation analysis.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Analyze the transcript and produce speaker statistics. For each speaker:\n"
        "- Parse all unique speaker names from the transcript\n"
        "- Count the number of utterances (times they spoke) per speaker\n"
        "- Count the total words spoken per speaker\n"
        "- Compute share of voice as a percentage of total words (must sum to 100%)\n"
        "- Identify the top 3 interaction pairs (speakers who respond to each other most frequently)\n"
        "- Flag silent participants: any speaker with share of voice below 5%\n"
        "- Compute a concentration ratio (0.0 = one person dominates, 1.0 = perfectly even distribution)\n"
        "Format: Use Markdown tables and lists:\n"
        "1. A table with columns: Speaker | Utterances | Words | Share of Voice (%)\n"
        "2. A 'Top Interaction Pairs' list showing the top 3 pairs with interaction count\n"
        "3. A 'Silent Participants (<5%)' list\n"
        "4. A single line: 'Concentration Ratio: X.XX'"
    ),
    "meeting_minutes": (
        "System: You are a delivery intelligence analyst specializing in meeting outcome extraction.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Extract structured meeting minutes from the transcript:\n"
        "- Identify all decisions made during the meeting with who owns them and the context\n"
        "- Identify all commitments made with the owner and due date (if mentioned, otherwise 'TBD')\n"
        "- Identify all open questions that were raised but not resolved, noting who raised them\n"
        "Format: Use Markdown tables and lists:\n"
        "1. A '## Decisions' table with columns: Decision | Owner | Context\n"
        "2. A '## Commitments' table with columns: Commitment | Owner | Due Date\n"
        "3. A '## Open Questions' bulleted list with format: '- [Speaker]: Question text'"
    ),
    "raid_log": (
        "System: You are a delivery intelligence analyst specializing in risk and dependency management.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Extract a RAID log from the transcript. Categorize items into:\n"
        "- Risks: potential future problems mentioned. Assign Severity (High/Medium/Low) and Probability (High/Medium/Low)\n"
        "- Assumptions: unstated beliefs or conditions the team is relying on. Assign Severity (High/Medium/Low)\n"
        "- Issues: current problems or blockers already occurring. Assign Severity (High/Medium/Low)\n"
        "- Dependencies: external dependencies on other teams, systems, or deliverables. Assign Impact (High/Medium/Low)\n"
        "Format: Use four separate Markdown tables:\n"
        "1. '## Risks' table with columns: Risk | Severity | Probability | Owner/Raiser\n"
        "2. '## Assumptions' table with columns: Assumption | Severity | Owner/Raiser\n"
        "3. '## Issues' table with columns: Issue | Severity | Owner/Raiser\n"
        "4. '## Dependencies' table with columns: Dependency | Impact | Dependent Team | Status"
    ),
    "delivery_signals": (
        "System: You are a delivery intelligence analyst specializing in action item prioritization.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Identify all action items from the transcript and classify each into priority tiers:\n"
        "- P1 (Immediate): Blocking issues or commitments that need action within 24 hours\n"
        "- P2 (This Sprint): Important items to address within the current sprint\n"
        "- P3 (Track & Monitor): Items to watch but not urgently actionable\n"
        "For each action item, provide:\n"
        "- A clear description of the action\n"
        "- The assigned owner (if mentioned in transcript, otherwise 'Unassigned')\n"
        "- A brief rationale explaining why it was classified at that priority level\n"
        "Format: Group by priority tier using Markdown:\n"
        "1. '## P1 — Immediate' table with columns: Action | Owner | Rationale\n"
        "2. '## P2 — This Sprint' table with columns: Action | Owner | Rationale\n"
        "3. '## P3 — Track & Monitor' table with columns: Action | Owner | Rationale"
    ),
    "team_health": (
        "System: You are a delivery intelligence analyst specializing in team dynamics and agile maturity.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Assess team health based on the meeting dynamics:\n"
        "- Voice Concentration: Analyze whether discussion is dominated by few individuals or evenly distributed\n"
        "- Facilitation Effectiveness: Assess whether the facilitator guided discussion, managed time, and ensured inclusion\n"
        "- Blocker Surfacing: Evaluate whether blockers were raised openly and whether they were acknowledged/addressed\n"
        "- Agile Maturity Signals: Identify indicators of agile practices (e.g., sprint language, retrospective thinking, iterative planning)\n"
        "- Overall Score: Provide a single team health score from 1 (very unhealthy) to 10 (excellent)\n"
        "Format: Use Markdown sections:\n"
        "1. '## Voice Concentration' — brief assessment paragraph\n"
        "2. '## Facilitation Effectiveness' — brief assessment paragraph with score /10\n"
        "3. '## Blocker Surfacing' — brief assessment paragraph\n"
        "4. '## Agile Maturity Signals' — bulleted list of observed signals\n"
        "5. '## Overall Team Health Score' — single line: 'Score: X/10' followed by a one-sentence justification"
    ),
    "gap_analysis": (
        "System: You are a delivery intelligence analyst specializing in meeting completeness and coverage analysis.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Identify gaps in the meeting:\n"
        "- Absent Teams/Roles: Identify teams or roles that were referenced but not present, or that should typically be included based on the topics discussed\n"
        "- Undiscussed Topics: Identify topics that were expected based on context clues but were not addressed\n"
        "- Suggested Questions: Propose questions that should have been asked based on the discussion content\n"
        "Format: Use Markdown sections:\n"
        "1. '## Absent Teams/Roles' — bulleted list with brief rationale for each\n"
        "2. '## Undiscussed Topics' — bulleted list of topics that should have been covered\n"
        "3. '## Suggested Questions' — numbered list of questions that should have been asked"
    ),
    "empathy_map": (
        "System: You are a delivery intelligence analyst specializing in stakeholder empathy and perspective analysis.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Select 1-2 key stakeholders from the transcript based on their influence level and activity. "
        "For each selected stakeholder, generate a six-quadrant empathy map:\n"
        "- Thinks: What are they likely thinking based on their statements and reactions?\n"
        "- Feels: What emotions are they likely experiencing (frustration, confidence, anxiety, etc.)?\n"
        "- Says: Key direct quotes or paraphrased statements they made\n"
        "- Does: Observable actions or behaviors during the meeting\n"
        "- Pains: Challenges, frustrations, or obstacles they face\n"
        "- Gains: Goals, motivations, or desired outcomes they are working toward\n"
        "Format: For each stakeholder, use this Markdown structure:\n"
        "## [Stakeholder Name] — Empathy Map\n"
        "| Thinks | Feels |\n"
        "|--------|-------|\n"
        "| bullet points | bullet points |\n\n"
        "| Says | Does |\n"
        "|------|------|\n"
        "| bullet points | bullet points |\n\n"
        "| Pains | Gains |\n"
        "|-------|-------|\n"
        "| bullet points | bullet points |"
    ),
    "stakeholder_register": (
        "System: You are a delivery intelligence analyst specializing in stakeholder classification and influence mapping.\n"
        "Context: The following is a meeting transcript from a delivery team meeting.\n"
        "Task: Produce a stakeholder register from the transcript:\n"
        "- Identify all stakeholders mentioned or participating\n"
        "- Classify each into one of four tiers:\n"
        "  - Tier 1 (Key Players): High power, high interest — manage closely\n"
        "  - Tier 2 (Keep Satisfied): High power, low interest — keep satisfied\n"
        "  - Tier 3 (Keep Informed): Low power, high interest — keep informed\n"
        "  - Tier 4 (Monitor): Low power, low interest — monitor with minimal effort\n"
        "- For each stakeholder, assign Power (0.0-1.0) and Interest (0.0-1.0) coordinates for the influence map\n"
        "Format: Use Markdown:\n"
        "1. '## Stakeholder Register' table with columns: Stakeholder | Tier | Power | Interest | Engagement Strategy\n"
        "2. '## Influence Map Coordinates' table with columns: Stakeholder | Power (0-1) | Interest (0-1) | Quadrant"
    ),
}

# Maximum tokens to request from the LLM for each section.
SECTION_MAX_TOKENS: dict[str, int] = {
    "speaker_statistics": 600,
    "meeting_minutes": 800,
    "raid_log": 800,
    "delivery_signals": 600,
    "team_health": 600,
    "gap_analysis": 500,
    "empathy_map": 700,
    "stakeholder_register": 600,
}


def build_section_prompt(section: str, transcript: str) -> str:
    """Inject transcript into the section's prompt template.

    Args:
        section: One of the 8 section keys (e.g. 'speaker_statistics').
        transcript: The full meeting transcript text.

    Returns:
        The complete prompt string with transcript appended in the expected format.

    Raises:
        ValueError: If the section key is not recognized.
    """
    if section not in SECTION_PROMPTS:
        raise ValueError(
            f"Unknown section '{section}'. Valid sections: {list(SECTION_PROMPTS.keys())}"
        )
    template = SECTION_PROMPTS[section]
    return f"{template}\n\nTranscript:\n---\n{transcript}\n---"

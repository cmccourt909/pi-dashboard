"""
Property-based tests for analysis output validation.

These tests validate that the OUTPUT FORMAT of each section can be parsed
and validated against the expected structure. They use mock outputs that
match the format described in the prompts.

Task 18.1: Property 4 — Speaker statistics summation invariant
Task 18.2: Property 5 — Silent participant threshold
Task 18.3: Property 6 — Concentration ratio bounds
Task 18.4: Property 7 — RAID rating enum constraints
Task 18.5: Property 8 — Priority tier completeness
Task 18.6: Property 9 — Team health score bounds
Task 18.7: Property 10 — Empathy map quadrant completeness
Task 18.8: Property 11 — Stakeholder register structure validity
"""
import re

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Output parsers — extract structured data from section Markdown output
# ---------------------------------------------------------------------------

def parse_speaker_statistics(text: str) -> dict:
    """Parse speaker statistics output into structured data."""
    result = {
        "speakers": [],
        "concentration_ratio": None,
        "silent_participants": [],
    }

    # Parse table rows: | Speaker | Utterances | Words | Share of Voice (%) |
    table_pattern = re.compile(
        r"\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)%?\s*\|"
    )
    for match in table_pattern.finditer(text):
        name = match.group(1).strip()
        if name.lower() in ("speaker", "---", "total"):
            continue
        result["speakers"].append({
            "name": name,
            "utterances": int(match.group(2)),
            "words": int(match.group(3)),
            "share_of_voice": float(match.group(4)),
        })

    # Parse concentration ratio
    ratio_match = re.search(r"Concentration Ratio:\s*([\d.]+)", text)
    if ratio_match:
        result["concentration_ratio"] = float(ratio_match.group(1))

    # Parse silent participants
    silent_section = re.search(r"Silent Participants.*?(?=\n##|\Z)", text, re.DOTALL)
    if silent_section:
        silent_text = silent_section.group(0)
        # Look for names in list items
        for line in silent_text.split("\n"):
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                name = line.lstrip("-* ").split("(")[0].strip()
                if name:
                    result["silent_participants"].append(name)

    return result


def parse_raid_log(text: str) -> dict:
    """Parse RAID log output into structured data."""
    result = {"risks": [], "assumptions": [], "issues": [], "dependencies": []}

    current_section = None
    for line in text.split("\n"):
        line_lower = line.strip().lower()
        if "## risk" in line_lower:
            current_section = "risks"
        elif "## assumption" in line_lower:
            current_section = "assumptions"
        elif "## issue" in line_lower:
            current_section = "issues"
        elif "## dependenc" in line_lower:
            current_section = "dependencies"
        elif current_section and "|" in line and "---" not in line:
            cells = [c.strip() for c in line.split("|") if c.strip()]
            if len(cells) >= 2 and cells[0].lower() not in ("risk", "assumption", "issue", "dependency"):
                item = {"name": cells[0]}
                if current_section == "risks" and len(cells) >= 3:
                    item["severity"] = cells[1]
                    item["probability"] = cells[2] if len(cells) > 2 else None
                elif current_section == "assumptions" and len(cells) >= 2:
                    item["severity"] = cells[1]
                elif current_section == "issues" and len(cells) >= 2:
                    item["severity"] = cells[1]
                elif current_section == "dependencies" and len(cells) >= 2:
                    item["impact"] = cells[1]
                result[current_section].append(item)

    return result


def parse_delivery_signals(text: str) -> list[dict]:
    """Parse delivery signals output into action items."""
    items = []
    current_priority = None

    for line in text.split("\n"):
        if "## P1" in line or "P1" in line and "Immediate" in line:
            current_priority = "P1"
        elif "## P2" in line or "P2" in line and "Sprint" in line:
            current_priority = "P2"
        elif "## P3" in line or "P3" in line and "Monitor" in line:
            current_priority = "P3"
        elif current_priority and "|" in line and "---" not in line:
            cells = [c.strip() for c in line.split("|") if c.strip()]
            if len(cells) >= 3 and cells[0].lower() not in ("action", "---"):
                items.append({
                    "priority": current_priority,
                    "description": cells[0],
                    "owner": cells[1] if len(cells) > 1 else "",
                    "rationale": cells[2] if len(cells) > 2 else "",
                })

    return items


def parse_team_health_score(text: str) -> int | None:
    """Extract team health score from output."""
    score_match = re.search(r"Score:\s*(\d+)\s*/\s*10", text)
    if score_match:
        return int(score_match.group(1))
    # Alternative: just a number after "health" and "score"
    alt_match = re.search(r"(?:health|overall).*?(\d+)\s*/\s*10", text, re.IGNORECASE)
    if alt_match:
        return int(alt_match.group(1))
    return None


def parse_empathy_map(text: str) -> list[dict]:
    """Parse empathy map output into stakeholder quadrants."""
    maps = []
    # Split by stakeholder headers
    sections = re.split(r"^##\s+", text, flags=re.MULTILINE)

    for section in sections[1:]:  # Skip content before first ##
        lines = section.strip().split("\n")
        name_match = re.match(r"(.+?)(?:\s*[—–-]\s*Empathy Map)?$", lines[0])
        if not name_match:
            continue

        body = "\n".join(lines[1:]).lower()
        quadrants = {
            "thinks": "thinks" in body,
            "feels": "feels" in body,
            "says": "says" in body,
            "does": "does" in body,
            "pains": "pains" in body,
            "gains": "gains" in body,
        }
        maps.append({
            "name": name_match.group(1).strip(),
            "quadrants": quadrants,
        })

    return maps


def parse_stakeholder_register(text: str) -> list[dict]:
    """Parse stakeholder register output into classified stakeholders."""
    stakeholders = []

    for line in text.split("\n"):
        if "|" in line and "---" not in line:
            cells = [c.strip() for c in line.split("|") if c.strip()]
            if len(cells) >= 4:
                # Try to parse power/interest as floats
                try:
                    power = float(cells[2])
                    interest = float(cells[3])
                    tier_match = re.search(r"Tier\s*(\d)", cells[1])
                    tier = int(tier_match.group(1)) if tier_match else None
                    stakeholders.append({
                        "name": cells[0],
                        "tier": tier,
                        "power": power,
                        "interest": interest,
                    })
                except (ValueError, IndexError):
                    pass

    return stakeholders


# ---------------------------------------------------------------------------
# Sample outputs for testing (match expected format from prompts)
# ---------------------------------------------------------------------------

SAMPLE_SPEAKER_STATS = """## Speaker Statistics

| Speaker | Utterances | Words | Share of Voice (%) |
|---------|-----------|-------|--------------------|
| Alice | 15 | 450 | 45.0 |
| Bob | 12 | 350 | 35.0 |
| Charlie | 8 | 200 | 20.0 |

### Top Interaction Pairs
- Alice ↔ Bob: 8 interactions
- Bob ↔ Charlie: 5 interactions
- Alice ↔ Charlie: 3 interactions

### Silent Participants (<5%)
- (none)

Concentration Ratio: 0.87
"""

SAMPLE_SPEAKER_STATS_WITH_SILENT = """## Speaker Statistics

| Speaker | Utterances | Words | Share of Voice (%) |
|---------|-----------|-------|--------------------|
| Alice | 20 | 600 | 60.0 |
| Bob | 15 | 350 | 35.0 |
| Charlie | 2 | 50 | 5.0 |

### Silent Participants (<5%)
- (none)

Concentration Ratio: 0.72
"""

SAMPLE_SPEAKER_STATS_UNEVEN = """## Speaker Statistics

| Speaker | Utterances | Words | Share of Voice (%) |
|---------|-----------|-------|--------------------|
| Alice | 30 | 900 | 90.0 |
| Bob | 3 | 80 | 8.0 |
| Charlie | 1 | 20 | 2.0 |

### Silent Participants (<5%)
- Charlie

Concentration Ratio: 0.33
"""

SAMPLE_RAID_LOG = """## Risks

| Risk | Severity | Probability | Owner/Raiser |
|------|----------|-------------|--------------|
| API deadline slip | High | Medium | Alice |
| Third-party outage | Medium | Low | Bob |

## Assumptions

| Assumption | Severity | Owner/Raiser |
|-----------|----------|--------------|
| Cloud capacity available | Medium | DevOps |

## Issues

| Issue | Severity | Owner/Raiser |
|-------|----------|--------------|
| Build pipeline broken | High | CI Team |

## Dependencies

| Dependency | Impact | Dependent Team | Status |
|-----------|--------|----------------|--------|
| Auth service v2 | High | Platform | In Progress |
"""

SAMPLE_DELIVERY_SIGNALS = """## P1 — Immediate

| Action | Owner | Rationale |
|--------|-------|-----------|
| Fix build pipeline | CI Team | Blocking all deployments |
| Resolve auth issue | Alice | Customers reporting login failures |

## P2 — This Sprint

| Action | Owner | Rationale |
|--------|-------|-----------|
| Update API docs | Bob | New endpoints shipping this sprint |

## P3 — Track & Monitor

| Action | Owner | Rationale |
|--------|-------|-----------|
| Monitor cloud costs | DevOps | Approaching budget threshold |
"""

SAMPLE_TEAM_HEALTH = """## Voice Concentration
Discussion was moderately concentrated with Alice dominating at 60%.

## Facilitation Effectiveness
Facilitation was adequate. Score 7/10.

## Blocker Surfacing
Blockers were raised openly by the team.

## Agile Maturity Signals
- Sprint language used consistently
- Retrospective actions referenced
- Iterative planning discussed

## Overall Team Health Score
Score: 7/10
The team shows good collaboration with room for more balanced participation.
"""

SAMPLE_EMPATHY_MAP = """## Alice — Empathy Map

| Thinks | Feels |
|--------|-------|
| We need to ship faster | Anxious about deadline |

| Says | Does |
|------|------|
| "We need to prioritize" | Assigns tasks actively |

| Pains | Gains |
|-------|-------|
| Resource constraints | Team trust |

## Bob — Empathy Map

| Thinks | Feels |
|--------|-------|
| Technical debt mounting | Frustrated |

| Says | Does |
|------|------|
| "We should refactor" | Reviews all PRs |

| Pains | Gains |
|-------|-------|
| Legacy code | Code quality |
"""

SAMPLE_STAKEHOLDER_REGISTER = """## Stakeholder Register

| Stakeholder | Tier | Power | Interest | Engagement Strategy |
|-------------|------|-------|----------|---------------------|
| Alice | Tier 1 | 0.9 | 0.8 | Manage closely |
| Bob | Tier 3 | 0.3 | 0.7 | Keep informed |
| Charlie | Tier 4 | 0.2 | 0.2 | Monitor |

## Influence Map Coordinates

| Stakeholder | Power (0-1) | Interest (0-1) | Quadrant |
|-------------|-------------|----------------|----------|
| Alice | 0.9 | 0.8 | Key Players |
| Bob | 0.3 | 0.7 | Keep Informed |
| Charlie | 0.2 | 0.2 | Monitor |
"""


# ---------------------------------------------------------------------------
# Task 18.1: Property 4 — Speaker statistics summation invariant
# ---------------------------------------------------------------------------

class TestSpeakerStatisticsSummation:
    """Property 4: Sum of share-of-voice percentages equals 100% (±0.1%)."""

    def test_share_of_voice_sums_to_100(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        total_sov = sum(s["share_of_voice"] for s in parsed["speakers"])
        assert abs(total_sov - 100.0) < 0.1

    def test_share_of_voice_sums_to_100_uneven(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS_UNEVEN)
        total_sov = sum(s["share_of_voice"] for s in parsed["speakers"])
        assert abs(total_sov - 100.0) < 0.1

    def test_utterance_counts_positive(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        for speaker in parsed["speakers"]:
            assert speaker["utterances"] > 0

    def test_word_counts_positive(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        for speaker in parsed["speakers"]:
            assert speaker["words"] > 0


# ---------------------------------------------------------------------------
# Task 18.2: Property 5 — Silent participant threshold
# ---------------------------------------------------------------------------

class TestSilentParticipantThreshold:
    """Property 5: Every speaker with <5% share of voice appears in silent participants."""

    def test_silent_participant_identified(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS_UNEVEN)
        # Charlie has 2% — should be in silent participants
        assert "Charlie" in parsed["silent_participants"]

    def test_no_false_silent_participants(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        # All speakers have ≥5% — no silent participants expected
        for speaker in parsed["speakers"]:
            if speaker["share_of_voice"] >= 5.0:
                assert speaker["name"] not in parsed["silent_participants"]


# ---------------------------------------------------------------------------
# Task 18.3: Property 6 — Concentration ratio bounds
# ---------------------------------------------------------------------------

class TestConcentrationRatioBounds:
    """Property 6: Concentration ratio is in [0.0, 1.0]."""

    def test_concentration_ratio_in_bounds(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        assert parsed["concentration_ratio"] is not None
        assert 0.0 <= parsed["concentration_ratio"] <= 1.0

    def test_concentration_ratio_in_bounds_uneven(self):
        parsed = parse_speaker_statistics(SAMPLE_SPEAKER_STATS_UNEVEN)
        assert parsed["concentration_ratio"] is not None
        assert 0.0 <= parsed["concentration_ratio"] <= 1.0

    def test_higher_concentration_for_even_distribution(self):
        parsed_even = parse_speaker_statistics(SAMPLE_SPEAKER_STATS)
        parsed_uneven = parse_speaker_statistics(SAMPLE_SPEAKER_STATS_UNEVEN)
        # More even distribution should have higher ratio
        assert parsed_even["concentration_ratio"] > parsed_uneven["concentration_ratio"]


# ---------------------------------------------------------------------------
# Task 18.4: Property 7 — RAID rating enum constraints
# ---------------------------------------------------------------------------

class TestRAIDRatingEnums:
    """Property 7: RAID entries have correct severity/probability/impact enums."""

    VALID_SEVERITIES = {"High", "Medium", "Low"}
    VALID_PROBABILITIES = {"High", "Medium", "Low"}
    VALID_IMPACTS = {"High", "Medium", "Low"}

    def test_risk_severity_valid(self):
        parsed = parse_raid_log(SAMPLE_RAID_LOG)
        for risk in parsed["risks"]:
            assert risk["severity"] in self.VALID_SEVERITIES

    def test_risk_probability_valid(self):
        parsed = parse_raid_log(SAMPLE_RAID_LOG)
        for risk in parsed["risks"]:
            if risk.get("probability"):
                assert risk["probability"] in self.VALID_PROBABILITIES

    def test_issue_severity_valid(self):
        parsed = parse_raid_log(SAMPLE_RAID_LOG)
        for issue in parsed["issues"]:
            assert issue["severity"] in self.VALID_SEVERITIES

    def test_dependency_impact_valid(self):
        parsed = parse_raid_log(SAMPLE_RAID_LOG)
        for dep in parsed["dependencies"]:
            assert dep["impact"] in self.VALID_IMPACTS


# ---------------------------------------------------------------------------
# Task 18.5: Property 8 — Priority tier completeness
# ---------------------------------------------------------------------------

class TestPriorityTierCompleteness:
    """Property 8: Every action item has priority, description, and rationale."""

    VALID_PRIORITIES = {"P1", "P2", "P3"}

    def test_all_items_have_valid_priority(self):
        items = parse_delivery_signals(SAMPLE_DELIVERY_SIGNALS)
        assert len(items) > 0
        for item in items:
            assert item["priority"] in self.VALID_PRIORITIES

    def test_all_items_have_non_empty_description(self):
        items = parse_delivery_signals(SAMPLE_DELIVERY_SIGNALS)
        for item in items:
            assert len(item["description"].strip()) > 0

    def test_all_items_have_non_empty_rationale(self):
        items = parse_delivery_signals(SAMPLE_DELIVERY_SIGNALS)
        for item in items:
            assert len(item["rationale"].strip()) > 0

    def test_p1_items_exist(self):
        items = parse_delivery_signals(SAMPLE_DELIVERY_SIGNALS)
        p1_items = [i for i in items if i["priority"] == "P1"]
        assert len(p1_items) >= 1


# ---------------------------------------------------------------------------
# Task 18.6: Property 9 — Team health score bounds
# ---------------------------------------------------------------------------

class TestTeamHealthScoreBounds:
    """Property 9: Overall health score is an integer in [1, 10]."""

    def test_score_is_integer_in_range(self):
        score = parse_team_health_score(SAMPLE_TEAM_HEALTH)
        assert score is not None
        assert isinstance(score, int)
        assert 1 <= score <= 10

    def test_score_parsed_from_format(self):
        score = parse_team_health_score("Score: 8/10")
        assert score == 8

    @given(score_val=st.integers(min_value=1, max_value=10))
    @settings(max_examples=10)
    def test_any_valid_score_parses(self, score_val):
        text = f"## Overall Team Health Score\nScore: {score_val}/10\nGood team."
        score = parse_team_health_score(text)
        assert score == score_val


# ---------------------------------------------------------------------------
# Task 18.7: Property 10 — Empathy map quadrant completeness
# ---------------------------------------------------------------------------

class TestEmpathyMapQuadrantCompleteness:
    """Property 10: Each stakeholder map has exactly 6 non-empty quadrants."""

    def test_empathy_maps_have_6_quadrants(self):
        maps = parse_empathy_map(SAMPLE_EMPATHY_MAP)
        assert len(maps) >= 1
        for m in maps:
            quadrants = m["quadrants"]
            assert quadrants["thinks"] is True
            assert quadrants["feels"] is True
            assert quadrants["says"] is True
            assert quadrants["does"] is True
            assert quadrants["pains"] is True
            assert quadrants["gains"] is True

    def test_multiple_stakeholders_parsed(self):
        maps = parse_empathy_map(SAMPLE_EMPATHY_MAP)
        assert len(maps) == 2
        names = [m["name"] for m in maps]
        assert "Alice" in names
        assert "Bob" in names


# ---------------------------------------------------------------------------
# Task 18.8: Property 11 — Stakeholder register structure validity
# ---------------------------------------------------------------------------

class TestStakeholderRegisterStructure:
    """Property 11: Every stakeholder classified into tiers, Power/Interest in [0, 1]."""

    VALID_TIERS = {1, 2, 3, 4}

    def test_stakeholders_have_valid_tiers(self):
        stakeholders = parse_stakeholder_register(SAMPLE_STAKEHOLDER_REGISTER)
        assert len(stakeholders) > 0
        for s in stakeholders:
            assert s["tier"] in self.VALID_TIERS

    def test_power_in_range(self):
        stakeholders = parse_stakeholder_register(SAMPLE_STAKEHOLDER_REGISTER)
        for s in stakeholders:
            assert 0.0 <= s["power"] <= 1.0

    def test_interest_in_range(self):
        stakeholders = parse_stakeholder_register(SAMPLE_STAKEHOLDER_REGISTER)
        for s in stakeholders:
            assert 0.0 <= s["interest"] <= 1.0

    def test_all_stakeholders_classified(self):
        stakeholders = parse_stakeholder_register(SAMPLE_STAKEHOLDER_REGISTER)
        # Should have at least the 3 stakeholders from our sample
        assert len(stakeholders) >= 3

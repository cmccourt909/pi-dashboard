"""
Enrichment router — uses Azure OpenAI (GPT-4o-mini) to transform raw findings
into actionable delivery intelligence.

Endpoints:
  POST /api/enrich/findings  — enrich findings with narrative + recommendations
  POST /api/enrich/briefing  — generate a SteerCo executive briefing
"""
from __future__ import annotations

import os
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/api/enrich", tags=["enrichment"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProgramContext(BaseModel):
    program_name: str = "Waypoint Program"
    reporting_period: str = ""
    total_issues: int = 0
    open_issues: int = 0
    audience: str = "delivery"


class FindingInput(BaseModel):
    rule_id: str
    severity: str
    category: str
    title: str
    detail: str
    issue_keys: list[str] = []


class EnrichedFinding(BaseModel):
    rule_id: str
    severity: str
    category: str
    title: str
    detail: str
    issue_keys: list[str] = []
    narrative: str = ""
    priority_rationale: str = ""
    recommended_actions: list[str] = []


class BriefingOutput(BaseModel):
    risk_headline: str
    executive_summary: str
    findings_narrative: str
    recommended_actions: list[str]


class EnrichRequest(BaseModel):
    findings: list[FindingInput]
    context: Optional[ProgramContext] = None


class BriefingRequest(BaseModel):
    findings: list[FindingInput]
    context: Optional[ProgramContext] = None


# ─── Azure OpenAI Client ──────────────────────────────────────────────────────

def _get_openai_client():
    """Create Azure OpenAI client using Managed Identity or API key."""
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    if not endpoint:
        return None, None

    try:
        from openai import AzureOpenAI
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider

        credential = DefaultAzureCredential(
            managed_identity_client_id=os.environ.get("AZURE_CLIENT_ID")
        )
        token_provider = get_bearer_token_provider(
            credential, "https://cognitiveservices.azure.com/.default"
        )
        client = AzureOpenAI(
            azure_endpoint=endpoint,
            azure_ad_token_provider=token_provider,
            api_version="2024-10-21",
        )
        return client, deployment
    except ImportError:
        # Fallback: try API key if available
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        if api_key:
            from openai import AzureOpenAI
            client = AzureOpenAI(
                azure_endpoint=endpoint,
                api_key=api_key,
                api_version="2024-10-21",
            )
            return client, deployment
        return None, None


# ─── Prompts ──────────────────────────────────────────────────────────────────

def _build_enrich_prompt(findings: list[FindingInput], ctx: ProgramContext) -> str:
    findings_json = json.dumps([f.model_dump() for f in findings], indent=2)
    return f"""You are a delivery intelligence assistant supporting a Delivery Manager reviewing program health.

Program context:
- Name: {ctx.program_name}
- Period: {ctx.reporting_period}
- Total issues: {ctx.total_issues}  Open: {ctx.open_issues}
- Audience: {ctx.audience}

You will receive {len(findings)} finding(s) from a rule engine.
For EACH finding, produce:
  1. narrative — 2-3 sentences: why this matters and what it signals.
  2. priority_rationale — 1-2 sentences: why this ranks where it does relative to the other findings.
  3. recommended_actions — 1 to 3 concrete, specific next steps. Each action must name a role and a timeframe.

Rules:
- Return ONLY valid JSON. No preamble, no markdown fences.
- Preserve the rule_id from each input finding exactly.
- Do not invent issue keys or evidence not present in the input.
- Severity: critical > warning > info. Reflect this in rationale.

Return schema:
{{
  "enriched": [
    {{
      "rule_id": "string",
      "narrative": "string",
      "priority_rationale": "string",
      "recommended_actions": ["string"]
    }}
  ]
}}

Findings:
{findings_json}"""


def _build_briefing_prompt(findings: list[FindingInput], ctx: ProgramContext) -> str:
    criticals = len([f for f in findings if f.severity == "critical"])
    warnings = len([f for f in findings if f.severity == "warning"])
    findings_json = json.dumps([f.model_dump() for f in findings], indent=2)

    return f"""You are preparing a SteerCo briefing for a senior leadership audience. Be direct, precise, and risk-forward. Avoid jargon.

Program: {ctx.program_name}  |  Period: {ctx.reporting_period}
Findings: {criticals} critical, {warnings} warning

Produce a structured executive briefing with:
  1. risk_headline — One sentence suitable for an email subject line.
  2. executive_summary — 3-4 sentences covering overall health, top risk, and trajectory. Confident tone, no hedging.
  3. findings_narrative — Prose summary of findings grouped by theme. Lead with criticals. 150-200 words.
  4. recommended_actions — 3-5 actions for the SteerCo to ratify. Each must state: action, owner role, due date.

Return ONLY valid JSON. No preamble, no markdown fences.
{{
  "risk_headline": "string",
  "executive_summary": "string",
  "findings_narrative": "string",
  "recommended_actions": ["string"]
}}

Findings:
{findings_json}"""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/findings", response_model=list[EnrichedFinding])
async def enrich_findings(request: EnrichRequest):
    """Enrich findings with AI-generated narrative and recommendations."""
    client, deployment = _get_openai_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT environment variable."
        )

    ctx = request.context or ProgramContext()
    prompt = _build_enrich_prompt(request.findings, ctx)

    try:
        response = client.chat.completions.create(
            model=deployment,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.3,
        )
        text = response.choices[0].message.content or "{}"
        parsed = json.loads(text)
        enrichments = parsed.get("enriched", [])

        # Merge enrichments back with original findings
        enrichment_map = {e["rule_id"]: e for e in enrichments}
        result = []
        for f in request.findings:
            enrichment = enrichment_map.get(f.rule_id, {})
            result.append(EnrichedFinding(
                **f.model_dump(),
                narrative=enrichment.get("narrative", ""),
                priority_rationale=enrichment.get("priority_rationale", ""),
                recommended_actions=enrichment.get("recommended_actions", []),
            ))
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Enrichment failed: {str(e)}")


@router.post("/briefing", response_model=BriefingOutput)
async def generate_briefing(request: BriefingRequest):
    """Generate a SteerCo executive briefing from findings."""
    client, deployment = _get_openai_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT environment variable."
        )

    ctx = request.context or ProgramContext()
    prompt = _build_briefing_prompt(request.findings, ctx)

    try:
        response = client.chat.completions.create(
            model=deployment,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.4,
        )
        text = response.choices[0].message.content or "{}"
        parsed = json.loads(text)
        return BriefingOutput(**parsed)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Briefing generation failed: {str(e)}")

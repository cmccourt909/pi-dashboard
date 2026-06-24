"""
Enrichment router — uses Azure OpenAI (GPT-4o-mini) to transform raw findings
into actionable delivery intelligence.

Features:
  - SHA-256 keyed cache with 60-min TTL (avoids repeat LLM calls)
  - Retry with exponential backoff (3 attempts: 2s, 4s, 8s)
  - Error taxonomy: ProviderAuth, RateLimit, Timeout, Parse errors
  - Graceful degradation: returns raw findings on failure

Endpoints:
  GET  /api/enrich/status    — verify Azure OpenAI connectivity
  POST /api/enrich/findings  — enrich findings with narrative + recommendations
  POST /api/enrich/briefing  — generate a SteerCo executive briefing
"""
from __future__ import annotations

import hashlib
import os
import json
import time
import asyncio
import threading
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


# ─── Error Taxonomy ───────────────────────────────────────────────────────────

class EnrichmentError(Exception):
    """Base class for enrichment errors."""
    status_code: int = 502
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ProviderNotConfiguredError(EnrichmentError):
    status_code = 503
    def __init__(self):
        super().__init__("Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT environment variable.")


class ProviderAuthError(EnrichmentError):
    status_code = 401
    def __init__(self, detail: str = ""):
        super().__init__(f"Azure OpenAI authentication failed. Check Managed Identity RBAC. {detail}".strip())


class ProviderRateLimitError(EnrichmentError):
    status_code = 429
    def __init__(self, detail: str = ""):
        super().__init__(f"Azure OpenAI rate limit exceeded. Try again in a few seconds. {detail}".strip())


class ProviderTimeoutError(EnrichmentError):
    status_code = 504
    def __init__(self, detail: str = ""):
        super().__init__(f"Azure OpenAI request timed out. {detail}".strip())


class LLMParseError(EnrichmentError):
    status_code = 502
    def __init__(self, detail: str = ""):
        super().__init__(f"LLM returned invalid response. {detail}".strip())


# ─── Cache ────────────────────────────────────────────────────────────────────

_cache_lock = threading.Lock()
_cache: dict[str, tuple[float, object]] = {}
_CACHE_TTL = 3600  # 60 minutes


def _cache_key(findings: list[FindingInput], purpose: str) -> str:
    """SHA-256 hash of finding rule_ids + severities + evidence (deterministic key)."""
    payload = json.dumps(
        [{"rule_id": f.rule_id, "severity": f.severity, "detail": f.detail} for f in findings],
        sort_keys=True,
    )
    return hashlib.sha256(f"{purpose}:{payload}".encode()).hexdigest()


def _cache_get(key: str) -> object | None:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        ts, value = entry
        if time.time() - ts > _CACHE_TTL:
            del _cache[key]
            return None
        return value


def _cache_set(key: str, value: object):
    with _cache_lock:
        _cache[key] = (time.time(), value)


# ─── Azure OpenAI Client ──────────────────────────────────────────────────────

_client_instance = None
_client_deployment = None


def _get_openai_client():
    """Create or return cached Azure OpenAI client."""
    global _client_instance, _client_deployment

    if _client_instance is not None:
        return _client_instance, _client_deployment

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
        _client_instance = client
        _client_deployment = deployment
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
            _client_instance = client
            _client_deployment = deployment
            return client, deployment
        return None, None


# ─── Retry Logic ──────────────────────────────────────────────────────────────

MAX_RETRIES = 3
BACKOFF_SECONDS = [2, 4, 8]


def _classify_error(e: Exception) -> EnrichmentError:
    """Classify an OpenAI SDK exception into our error taxonomy."""
    error_str = str(e).lower()
    error_type = type(e).__name__

    if "authentication" in error_str or "401" in error_str or "authorizationpermissionmismatch" in error_str:
        return ProviderAuthError(str(e)[:200])
    if "rate" in error_str or "429" in error_str or "throttl" in error_str:
        return ProviderRateLimitError(str(e)[:200])
    if "timeout" in error_str or "timed out" in error_str or error_type == "Timeout":
        return ProviderTimeoutError(str(e)[:200])
    return EnrichmentError(f"{error_type}: {str(e)[:200]}")


def _call_with_retry(client, deployment: str, messages: list, max_tokens: int, temperature: float) -> str:
    """Call Azure OpenAI with retry logic. Returns the response text."""
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=deployment,
                response_format={"type": "json_object"},
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=30,
            )
            return response.choices[0].message.content or "{}"

        except Exception as e:
            last_error = e
            classified = _classify_error(e)

            # Don't retry auth errors — they won't fix themselves
            if isinstance(classified, ProviderAuthError):
                raise classified

            # Retry on rate limit and timeout
            if isinstance(classified, (ProviderRateLimitError, ProviderTimeoutError)):
                if attempt < MAX_RETRIES - 1:
                    time.sleep(BACKOFF_SECONDS[attempt])
                    continue
                raise classified

            # Unknown errors: retry once, then fail
            if attempt < MAX_RETRIES - 1:
                time.sleep(BACKOFF_SECONDS[attempt])
                continue
            raise classified

    raise _classify_error(last_error) if last_error else EnrichmentError("Unknown error")


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

@router.get("/status")
async def enrichment_status():
    """Check Azure OpenAI connectivity and configuration."""
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
    client_id = os.environ.get("AZURE_CLIENT_ID", "")

    if not endpoint:
        return {
            "status": "not_configured",
            "detail": "AZURE_OPENAI_ENDPOINT not set",
            "endpoint": None,
            "deployment": deployment,
        }

    # Try to create client and make a minimal call
    client, dep = _get_openai_client()
    if not client:
        return {
            "status": "error",
            "detail": "Failed to create Azure OpenAI client",
            "endpoint": endpoint,
            "deployment": deployment,
        }

    try:
        response = client.chat.completions.create(
            model=dep,
            messages=[{"role": "user", "content": "Reply with exactly: ok"}],
            max_tokens=5,
            temperature=0,
            timeout=10,
        )
        reply = response.choices[0].message.content or ""
        return {
            "status": "connected",
            "detail": f"GPT-4o-mini responded: {reply.strip()[:20]}",
            "endpoint": endpoint,
            "deployment": dep,
            "managed_identity": client_id[:8] + "..." if client_id else "not set",
        }
    except Exception as e:
        classified = _classify_error(e)
        return {
            "status": "error",
            "detail": classified.message,
            "error_type": type(classified).__name__,
            "endpoint": endpoint,
            "deployment": dep,
        }


@router.post("/findings", response_model=list[EnrichedFinding])
async def enrich_findings(request: EnrichRequest):
    """Enrich findings with AI-generated narrative and recommendations."""
    client, deployment = _get_openai_client()
    if not client:
        raise HTTPException(status_code=503, detail=ProviderNotConfiguredError().message)

    # Check cache
    key = _cache_key(request.findings, "enrich")
    cached = _cache_get(key)
    if cached is not None:
        return cached

    ctx = request.context or ProgramContext()
    prompt = _build_enrich_prompt(request.findings, ctx)

    try:
        text = _call_with_retry(
            client, deployment,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.3,
        )
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

        # Cache the result
        _cache_set(key, result)
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=LLMParseError(str(e)).message)
    except EnrichmentError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        classified = _classify_error(e)
        raise HTTPException(status_code=classified.status_code, detail=classified.message)


@router.post("/briefing", response_model=BriefingOutput)
async def generate_briefing(request: BriefingRequest):
    """Generate a SteerCo executive briefing from findings."""
    client, deployment = _get_openai_client()
    if not client:
        raise HTTPException(status_code=503, detail=ProviderNotConfiguredError().message)

    # Check cache
    key = _cache_key(request.findings, "briefing")
    cached = _cache_get(key)
    if cached is not None:
        return cached

    ctx = request.context or ProgramContext()
    prompt = _build_briefing_prompt(request.findings, ctx)

    try:
        text = _call_with_retry(
            client, deployment,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.4,
        )
        parsed = json.loads(text)
        result = BriefingOutput(**parsed)

        # Cache the result
        _cache_set(key, result)
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=LLMParseError(str(e)).message)
    except EnrichmentError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        classified = _classify_error(e)
        raise HTTPException(status_code=classified.status_code, detail=classified.message)

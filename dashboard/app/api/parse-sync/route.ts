import { NextRequest, NextResponse } from "next/server";

// ─── Authentication ──────────────────────────────────────────────────────────
// This endpoint requires authentication. It checks (in order):
// 1. Entra ID EasyAuth header (X-MS-CLIENT-PRINCIPAL) — set by Container Apps auth sidecar
// 2. API key header (X-Upload-Key) — for non-browser clients (scripts, CI)
// If neither is present, the request is rejected with 401.

function isAuthenticated(req: NextRequest): boolean {
  // Check 1: Entra ID auth (injected by Container Apps EasyAuth sidecar)
  const clientPrincipal = req.headers.get("x-ms-client-principal");
  if (clientPrincipal) {
    return true;
  }

  // Check 2: API key fallback for non-browser clients
  const apiKey = req.headers.get("x-upload-key");
  const expectedKey = process.env.UPLOAD_API_KEY;
  if (expectedKey && apiKey === expectedKey) {
    return true;
  }

  return false;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Reject unauthenticated requests
  if (!isAuthenticated(req)) {
    return NextResponse.json(
      { error: "Authentication required. Login via the dashboard or provide X-Upload-Key header." },
      { status: 401 }
    );
  }

  const { text } = await req.json();

  // Check if AI service is configured
  const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  if (!aiApiKey) {
    return NextResponse.json(
      { error: "AI service not configured. Set ANTHROPIC_API_KEY or AZURE_OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a delivery intelligence parser for a PI Health Dashboard.
Extract structured data from meeting notes or delivery sync documents.
Return ONLY valid JSON — no markdown fences, no preamble.

Schema:
{
  "meta": { "date": "string", "program": "string", "meetingType": "string" },
  "health": {
    "overallStatus": "Green | Yellow | Red",
    "overallRationale": "string (1 sentence)",
    "openRisks": number,
    "openActions": number,
    "keyDecisions": number,
    "dergStatus": "Pending | Complete | N/A"
  },
  "risks": [{ "description": "string", "severity": "High | Medium | Low" }],
  "decisions": [{ "description": "string" }],
  "assumptions": [{ "description": "string" }],
  "actionItems": [{
    "task": "string",
    "owner": "string",
    "dueDate": "string",
    "category": "Regulatory | Data | Testing | Infrastructure | Other"
  }]
}

Infer overallStatus: Green = on track, Yellow = risks managed, Red = blocked.`,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const raw = data.content.map((b: { text?: string }) => b.text ?? "").join("");

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude response", raw }, { status: 500 });
  }
}

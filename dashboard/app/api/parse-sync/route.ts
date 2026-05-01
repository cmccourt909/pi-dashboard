import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
console.log("KEY:", process.env.ANTHROPIC_API_KEY?.slice(0, 10));
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
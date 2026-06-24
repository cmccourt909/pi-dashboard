import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const target = `${backendUrl}/api/enrich/briefing`;

  try {
    const body = await request.text();
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", detail: `Backend unreachable at ${backendUrl}` },
      { status: 502 }
    );
  }
}

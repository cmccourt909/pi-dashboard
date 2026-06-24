import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const target = `${backendUrl}/api/enrich/status`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { status: "error", detail: `Backend unreachable at ${backendUrl}` },
      { status: 502 }
    );
  }
}

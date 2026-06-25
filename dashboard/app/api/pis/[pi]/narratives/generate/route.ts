import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pi: string }> }
) {
  const { pi } = await params;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const target = `${backendUrl}/api/pis/${encodeURIComponent(pi)}/narratives/generate`;

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

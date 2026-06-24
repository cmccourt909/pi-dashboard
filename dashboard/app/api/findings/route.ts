import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const url = new URL(request.url);
  const target = `${backendUrl}/api/findings${url.search}`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    const body = await response.text();
    return new NextResponse(body, {
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

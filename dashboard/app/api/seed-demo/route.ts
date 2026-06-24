import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const target = `${backendUrl}/api/seed-demo`;

  try {
    const headers = new Headers();
    const uploadKey = request.headers.get("x-upload-key");
    if (uploadKey) headers.set("X-Upload-Key", uploadKey);
    // Forward Entra ID auth header if present
    const clientPrincipal = request.headers.get("x-ms-client-principal");
    if (clientPrincipal) headers.set("x-ms-client-principal", clientPrincipal);
    headers.set("Content-Type", "application/json");

    const response = await fetch(target, {
      method: "POST",
      headers,
    });

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

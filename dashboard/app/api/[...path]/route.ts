import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all API proxy route.
 * Forwards all /api/* requests (except /api/health and /api/parse-sync) to the backend.
 * 
 * This runs at RUNTIME, not build time — so process.env.BACKEND_URL is read fresh
 * from the container's environment variables on every request.
 */

// Paths handled by the frontend itself (not proxied)
const LOCAL_PATHS = ["/api/health", "/api/parse-sync"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Upload-Key, Authorization",
    },
  });
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const path = "/api/" + params.path.join("/");

  // Don't proxy local API routes
  if (LOCAL_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const target = `${backendUrl}${path}`;

  try {
    const headers = new Headers();
    // Forward relevant headers
    const forwardHeaders = ["content-type", "x-upload-key", "x-ms-client-principal", "authorization"];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) headers.set(h, val);
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        // For file uploads, pass the raw body and KEEP the content-type
        // header (it contains the boundary marker needed by the backend)
        fetchOptions.body = await request.arrayBuffer();
      } else {
        fetchOptions.body = await request.text();
      }
    }

    const response = await fetch(target, fetchOptions);

    // Forward the response back
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // SSE streams must be forwarded as a readable stream, not buffered
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && response.body) {
      responseHeaders.set("content-type", "text/event-stream");
      responseHeaders.set("cache-control", "no-cache");
      responseHeaders.set("connection", "keep-alive");
      responseHeaders.set("x-accel-buffering", "no");
      return new NextResponse(response.body as ReadableStream, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[api-proxy] Failed to reach backend at ${target}:`, error);
    return NextResponse.json(
      { status: "error", detail: `Backend unreachable at ${backendUrl}` },
      { status: 502 }
    );
  }
}

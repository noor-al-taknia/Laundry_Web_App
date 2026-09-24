import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = process.env.BACKEND_URL || "http://127.0.0.1:4000";
  try {
    const response = await fetch(new URL("/api/health", origin), { cache: "no-store", signal: AbortSignal.timeout(4000) });
    const body = await response.json();
    return NextResponse.json({ service: "website", ...body }, { status: response.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ service: "website", status: "offline", maintenance: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set", { status: 500 });
  }

  // Forward all query params as-is, inject key server-side
  const rawSearch = request.nextUrl.search; // preserves duplicate keys (markers, style, etc.)
  const url = `https://maps.googleapis.com/maps/api/staticmap${rawSearch}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { cache: "force-cache" });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`Google Maps error: ${text}`, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}

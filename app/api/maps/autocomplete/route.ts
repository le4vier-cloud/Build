import { NextRequest } from "next/server";

// Server-only key — never exposed to the browser. See /api/maps/static/route.ts.
export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response("GOOGLE_MAPS_API_KEY not set", { status: 500 });
  }

  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input) {
    return Response.json({ predictions: [] });
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return Response.json({ predictions: [], error: data.error_message ?? data.status }, { status: 502 });
  }

  const predictions = (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
    place_id: p.place_id,
    description: p.description,
  }));

  return Response.json({ predictions });
}

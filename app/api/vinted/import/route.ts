import { NextRequest, NextResponse } from "next/server";
import { normalizeVintedDataset } from "@/lib/vinted";

export const dynamic = "force-dynamic";

// Read-only dataset import. Does not start Actors or write to the database.
// Disabled until explicitly enabled; do not expose raw third-party content publicly.
export async function GET(request: NextRequest) {
  if (process.env.VINTED_IMPORT_ENABLED !== "true") {
    return NextResponse.json({ error: "Vinted import disabled" }, { status: 404 });
  }
  const secret = process.env.VINTED_IMPORT_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "APIFY_TOKEN not configured" }, { status: 503 });
  const datasetId = request.nextUrl.searchParams.get("datasetId");
  if (!datasetId || !/^[A-Za-z0-9]{8,64}$/.test(datasetId)) {
    return NextResponse.json({ error: "Valid datasetId required" }, { status: 400 });
  }
  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 30) || 30));
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response: Response;
    try {
      response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return NextResponse.json({ error: "Apify dataset fetch failed", status: response.status }, { status: 502 });
    const items: unknown = await response.json();
    if (!Array.isArray(items)) return NextResponse.json({ error: "Unexpected Apify response" }, { status: 502 });
    const listings = normalizeVintedDataset(items);
    return NextResponse.json({ datasetId, received: items.length, validUnique: listings.length, listings }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Apify request failed or timed out" }, { status: 502 });
  }
}

// Explicit, authenticated evaluation-only persistence. No Actor run or AI calls.
export async function POST(request: NextRequest) {
  const preview = await GET(request);
  if (!preview.ok) return preview;
  if (process.env.VINTED_DB_IMPORT_ENABLED !== "true") {
    return NextResponse.json({ error: "Database import disabled" }, { status: 403 });
  }
  const { listings, received, validUnique, datasetId } = await preview.json();
  const { supabaseAdmin } = await import("@/src/lib/supabase/admin");
  let inserted = 0;
  let alreadyPresent = 0;
  const failures: Array<{ id: string; message: string }> = [];
  for (const item of listings as import("@/lib/vinted").VintedListing[]) {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("collector_population_listings")
      .select("id")
      .eq("source_platform", "vinted")
      .eq("external_listing_id", item.source_item_id)
      .limit(1);
    if (lookupError) {
      failures.push({ id: item.source_item_id, message: lookupError.message });
      continue;
    }
    if (existing?.length) { alreadyPresent++; continue; }
    const { error } = await supabaseAdmin.from("collector_population_listings").insert({
      source_platform: "vinted",
      external_listing_id: item.source_item_id,
      listing_url: item.url,
      title: item.title,
      listing_title: item.title,
      listing_description: item.description,
      processing_status: "pending",
      platform: "vinted",
      search_query: item.query,
      found_at: item.first_seen_at,
      price: item.price_amount,
      currency: item.currency,
      condition: item.condition,
      image_count: item.photo_urls.length,
      image_urls: item.photo_urls,
      input_payload: item,
    });
    if (error) {
      if (error.code === "23505") alreadyPresent++;
      else failures.push({ id: item.source_item_id, message: error.message });
    } else inserted++;
  }
  return NextResponse.json({ datasetId, received, validUnique, inserted, alreadyPresent, failures, evaluationOnly: true }, {
    status: failures.length ? 207 : 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}

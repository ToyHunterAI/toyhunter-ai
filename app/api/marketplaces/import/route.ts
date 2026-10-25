import { NextRequest, NextResponse } from "next/server";
import { MARKETPLACES, type Marketplace, normalizeMarketplaceDataset } from "@/lib/marketplace-import";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
async function prepare(req: NextRequest) {
  if (process.env.MARKETPLACE_IMPORT_ENABLED !== "true") return { error: failure("Disabled", 404) };
  const secret = process.env.MARKETPLACE_IMPORT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return { error: failure("Unauthorized", 401) };
  const token = process.env.APIFY_TOKEN;
  if (!token) return { error: failure("APIFY_TOKEN missing", 503) };
  const platform = req.nextUrl.searchParams.get("platform") as Marketplace | null;
  if (!platform || !MARKETPLACES.includes(platform)) return { error: failure("Unknown platform", 400) };
  const datasetId = req.nextUrl.searchParams.get("datasetId");
  if (!datasetId || !/^[A-Za-z0-9]{8,64}$/.test(datasetId)) return { error: failure("Invalid datasetId", 400) };
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));
  try {
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000), cache: "no-store" }
    );
    if (!response.ok) return { error: failure(`Apify returned ${response.status}`, 502) };
    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) return { error: failure("Invalid dataset response", 502) };
    return { platform, datasetId, received: raw.length, listings: normalizeMarketplaceDataset(raw, platform) };
  } catch { return { error: failure("Apify request failed", 502) }; }
}
export async function GET(req: NextRequest) {
  const data = await prepare(req);
  if ("error" in data) return data.error;
  return NextResponse.json({ ...data, validUnique: data.listings.length, evaluationOnly: true },
    { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(req: NextRequest) {
  const data = await prepare(req);
  if ("error" in data) return data.error;
  if (process.env.MARKETPLACE_DB_IMPORT_ENABLED !== "true") return failure("DB import disabled", 403);
  const { supabaseAdmin } = await import("@/src/lib/supabase/admin");
  let inserted = 0, alreadyPresent = 0;
  const failures: { id: string; message: string }[] = [];
  for (const item of data.listings) {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("collector_population_listings").select("id")
      .eq("source_platform", item.source).eq("external_listing_id", item.source_item_id).limit(1);
    if (lookupError) { failures.push({ id: item.source_item_id, message: lookupError.message }); continue; }
    if (existing?.length) { alreadyPresent++; continue; }
    const { error } = await supabaseAdmin.from("collector_population_listings").insert({
      source_platform: item.source, external_listing_id: item.source_item_id,
      listing_url: item.url, title: item.title, listing_title: item.title,
      listing_description: item.description, processing_status: "pending",
      platform: item.source, search_query: item.query, found_at: item.first_seen_at,
      price: item.price_amount, currency: item.currency, condition: item.condition,
      seller_location: item.seller_location, image_count: item.photo_urls.length,
      image_urls: item.photo_urls, input_payload: item,
    });
    if (error?.code === "23505") alreadyPresent++;
    else if (error) failures.push({ id: item.source_item_id, message: error.message });
    else inserted++;
  }
  return NextResponse.json({
    platform: data.platform, datasetId: data.datasetId, received: data.received,
    validUnique: data.listings.length, inserted, alreadyPresent, failures, evaluationOnly: true,
  }, { status: failures.length ? 207 : 200, headers: { "Cache-Control": "private, no-store" } });
}

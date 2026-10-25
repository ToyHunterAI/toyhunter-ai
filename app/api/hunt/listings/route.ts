import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { supabaseAdmin } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Log eerst in" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("collector_population_listings")
    .select("id,source_platform,title,listing_title,listing_url,price,currency,image_urls,found_at,created_at,shipping_price")
    .not("listing_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Advertenties ophalen mislukt" }, { status: 500 });
  const classify = (platform: string, url: string, title: string) => {
    const combined = `${title} ${url}`;
    let host = "";
    try { host = new URL(url).hostname; } catch { /* malformed URL */ }
    if (platform.toLowerCase().includes("catawiki") || /(^|\.)catawiki\./i.test(host)) {
      return { price_kind: "auction", price_notice: "Veiling: dit bedrag is geen vaste koopprijs." };
    }
    if (/\b(bieden vanaf|vanaf bieden|startbod|startprijs|biedingen|bieden|veiling|auction|enchère|gebot ab)\b/i.test(combined)) {
      return { price_kind: "bid", price_notice: "Bieden: dit bedrag is geen bevestigde koopprijs." };
    }
    if (platform.toLowerCase() === "marktplaats" || platform.toLowerCase() === "2dehands") {
      return { price_kind: "unverified", price_notice: "Prijssoort niet bevestigd: mogelijk bieden. Geen bewezen koopje." };
    }
    return { price_kind: "unverified", price_notice: "Vaste koopprijs niet geverifieerd. Nog niet beoordeeld." };
  };
  return NextResponse.json({ listings: (data ?? []).map(item => ({
    ...classify(String(item.source_platform ?? ""), String(item.listing_url ?? ""), String(item.listing_title || item.title || "")),
    id: item.id, platform: item.source_platform,
    title: item.listing_title || item.title || "Zonder titel",
    url: item.listing_url, price: item.price, currency: item.currency || "EUR",
    image: Array.isArray(item.image_urls) ? item.image_urls.find((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u)) || null : null,
    shipping: item.shipping_price, found_at: item.found_at || item.created_at,
  })) }, { headers: { "Cache-Control": "private, no-store" } });
}

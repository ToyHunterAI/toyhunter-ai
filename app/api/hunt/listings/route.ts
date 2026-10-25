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
  return NextResponse.json({ listings: (data ?? []).map(item => ({
    id: item.id, platform: item.source_platform,
    title: item.listing_title || item.title || "Zonder titel",
    url: item.listing_url, price: item.price, currency: item.currency || "EUR",
    image: item.image_urls?.[0] || null,
    shipping: item.shipping_price, found_at: item.found_at || item.created_at,
  })) }, { headers: { "Cache-Control": "private, no-store" } });
}

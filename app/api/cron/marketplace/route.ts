import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { normalizeMarketplaceDataset, type Marketplace } from "@/lib/marketplace-import";
import jobs from "@/lib/marketplace_actor_jobs.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CAP = 0.12;
const fail = (message: string, status = 503) => NextResponse.json({ error: message }, { status });
type Job = { platform: Marketplace; actor: string; input: Record<string, unknown> };
const configuredJobs = jobs as Job[];

async function reconcile(token: string) {
  const { data: pending, error } = await supabaseAdmin.from("marketplace_auto_runs")
    .select("day,platform,apify_run_id,dataset_id,status")
    .in("status", ["started", "running", "import_error"])
    .order("day", { ascending: true }).limit(6);
  if (error) throw new Error("Cannot read pending runs");
  const results: object[] = [];
  for (const run of pending ?? []) {
    if (!run.apify_run_id) continue;
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(run.apify_run_id)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!statusResponse.ok) { results.push({ day: run.day, error: "status fetch failed" }); continue; }
    const state = (await statusResponse.json()).data as { status: string; defaultDatasetId?: string };
    if (state.status === "RUNNING" || state.status === "READY") {
      await supabaseAdmin.from("marketplace_auto_runs").update({ status: "running" }).eq("day", run.day);
      continue;
    }
    if (state.status !== "SUCCEEDED") {
      await supabaseAdmin.from("marketplace_auto_runs").update({ status: "actor_failed" }).eq("day", run.day);
      results.push({ day: run.day, status: state.status }); continue;
    }
    const dataset = state.defaultDatasetId ?? run.dataset_id;
    if (!dataset) { results.push({ day: run.day, error: "dataset missing" }); continue; }
    const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(dataset)}/items?clean=true&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!itemsResponse.ok) { results.push({ day: run.day, error: "dataset fetch failed" }); continue; }
    const raw: unknown = await itemsResponse.json();
    if (!Array.isArray(raw)) { results.push({ day: run.day, error: "invalid dataset" }); continue; }
    const listings = normalizeMarketplaceDataset(raw, run.platform as Marketplace);
    let inserted = 0, existing = 0, failed = 0;
    for (const item of listings) {
      const { data: found, error: checkError } = await supabaseAdmin.from("collector_population_listings")
        .select("id").eq("source_platform", item.source).eq("external_listing_id", item.source_item_id).limit(1);
      if (checkError) { failed++; continue; }
      if (found?.length) { existing++; continue; }
      const { error: insertError } = await supabaseAdmin.from("collector_population_listings").insert({
        source_platform: item.source, external_listing_id: item.source_item_id,
        listing_url: item.url, title: item.title, listing_title: item.title,
        listing_description: item.description, processing_status: "pending", platform: item.source,
        search_query: item.query, found_at: item.first_seen_at, price: item.price_amount,
        currency: item.currency, condition: item.condition, seller_location: item.seller_location,
        image_count: item.photo_urls.length, image_urls: item.photo_urls, input_payload: item,
      });
      if (insertError?.code === "23505") existing++;
      else if (insertError) failed++;
      else inserted++;
    }
    await supabaseAdmin.from("marketplace_auto_runs").update({
      status: failed ? "import_error" : "imported", dataset_id: dataset,
      inserted_count: inserted, existing_count: existing, error_count: failed,
    }).eq("day", run.day);
    results.push({ day: run.day, platform: run.platform, inserted, existing, failed });
  }
  return results;
}

export async function GET(req: NextRequest) {
  if (process.env.MARKETPLACE_AUTO_ENABLED !== "true") return fail("Automation disabled", 404);
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return fail("Unauthorized", 401);
  if (!process.env.APIFY_TOKEN) return fail("Missing Apify token");
  const token = process.env.APIFY_TOKEN;
  let imports: object[];
  try { imports = await reconcile(token); } catch { return fail("Reconciliation failed"); }
  if (process.env.MARKETPLACE_PAID_RUNS_ENABLED !== "true") {
    return NextResponse.json({ imports, started: false, reason: "Paid runs disabled" });
  }
  // This is only a reservation guard, not an Apify billing hard limit.
  // Enable paid runs ONLY after an independent provider-level cap has been verified.
  if (process.env.MARKETPLACE_PROVIDER_BUDGET_CONFIRMED !== "true")
    return NextResponse.json({ imports, started: false, reason: "Provider budget not confirmed" });
  const now = new Date(), day = now.toISOString().slice(0,10), month = day.slice(0,7);
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1,1)).toISOString().slice(0,10);
  const { data: monthRuns, error: countError } = await supabaseAdmin.from("marketplace_auto_runs")
    .select("reserved_usd").gte("day", `${month}-01`).lt("day", nextMonth);
  if (countError) return fail("Budget ledger unavailable");
  const reserved = (monthRuns ?? []).reduce((sum: number, row: { reserved_usd: number }) => sum + Number(row.reserved_usd ?? 0), 0);
  if (reserved + CAP > 5) return NextResponse.json({ imports, started: false, reason: "Monthly reservation exhausted" });
  const job = configuredJobs[Math.floor(now.getTime()/86_400_000) % configuredJobs.length];
  const { error: reservationError } = await supabaseAdmin.from("marketplace_auto_runs")
    .insert({ day, platform: job.platform, status: "reserved", reserved_usd: CAP });
  if (reservationError?.code === "23505") return NextResponse.json({ imports, started: false, reason: "Already attempted today" });
  if (reservationError) return fail("Cannot reserve daily run");
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/${job.actor.replace("/", "~")}/runs?waitForFinish=0&maxTotalChargeUsd=${CAP}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(job.input), signal: AbortSignal.timeout(15000), cache: "no-store",
    });
    const body = await response.json() as { data?: { id?: string; defaultDatasetId?: string } };
    if (!response.ok || !body.data?.id) throw new Error("Actor start unconfirmed");
    await supabaseAdmin.from("marketplace_auto_runs").update({
      status: "started", apify_run_id: body.data.id, dataset_id: body.data.defaultDatasetId ?? null,
    }).eq("day", day);
    return NextResponse.json({ imports, started: true, platform: job.platform, day });
  } catch {
    await supabaseAdmin.from("marketplace_auto_runs").update({ status: "start_unknown" }).eq("day", day);
    return fail("Actor start unconfirmed; day remains reserved");
  }
}

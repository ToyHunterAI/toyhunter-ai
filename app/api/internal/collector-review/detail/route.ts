import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  asArray,
  asRecord,
  getImageUrls,
  getSuggestionListing,
  getSuggestionProposal,
  isInternalRequestAuthorized,
  normalizeSuggestionSummary,
  numberValue,
  stringValue,
  unauthorizedInternalResponse,
} from "../shared";

export const dynamic = "force-dynamic";

async function loadCollectorKnowledgeForItem(itemId: string | null) {
  if (!itemId) {
    return null;
  }

  const [item, aliases, traits, outgoing, incoming] = await Promise.all([
    supabaseAdmin
      .from("collector_items")
      .select("*, collector_toylines(name)")
      .eq("id", itemId)
      .maybeSingle(),
    supabaseAdmin
      .from("collector_aliases")
      .select("*")
      .eq("collector_item_id", itemId)
      .order("weight", { ascending: false }),
    supabaseAdmin
      .from("collector_item_traits")
      .select("*")
      .eq("collector_item_id", itemId)
      .order("trait_name", { ascending: true }),
    supabaseAdmin
      .from("collector_item_relationships")
      .select(
        "*, target_item:collector_items!collector_item_relationships_target_item_id_fkey(id,name,item_type)"
      )
      .eq("source_item_id", itemId)
      .eq("review_status", "approved"),
    supabaseAdmin
      .from("collector_item_relationships")
      .select(
        "*, source_item:collector_items!collector_item_relationships_source_item_id_fkey(id,name,item_type)"
      )
      .eq("target_item_id", itemId)
      .eq("review_status", "approved"),
  ]);

  for (const result of [item, aliases, traits, outgoing, incoming]) {
    if (result.error) {
      throw result.error;
    }
  }

  if (!item.data) {
    return null;
  }

  return {
    item: item.data,
    aliases: aliases.data || [],
    traits: traits.data || [],
    relationships: {
      outgoing: outgoing.data || [],
      incoming: incoming.data || [],
    },
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const string = stringValue(value);
    if (string) return string;
  }

  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const number = numberValue(value);
    if (number !== null) return number;
  }

  return null;
}

function valueFromMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const record = asRecord(value);
  if (Object.keys(record).length === 0 && typeof value === "object") {
    return null;
  }

  return firstNumber(record.value, record.amount, value);
}

function currencyFromMoney(value: unknown) {
  const record = asRecord(value);
  return firstString(record.currency, record.currencyCode);
}

function displayPlatform(sourcePlatform: string | null, listingUrl: string | null) {
  if (listingUrl) {
    try {
      const host = new URL(listingUrl).hostname.replace(/^www\./, "");
      if (host.includes("ebay.nl")) return "eBay.nl";
      if (host.includes("ebay.com")) return "eBay.com";
      if (host.includes("ebay.de")) return "eBay.de";
      if (host.includes("ebay.co.uk")) return "eBay.co.uk";
      if (host.includes("ebay.")) return host;
    } catch {
      // Fall through to source platform.
    }
  }

  if (sourcePlatform?.toLowerCase() === "ebay") return "eBay";
  return sourcePlatform || "Onbekend";
}

function extractEbayItemId(externalListingId: string | null, listingUrl: string | null) {
  if (listingUrl) {
    try {
      const match = new URL(listingUrl).pathname.match(/\/itm\/(?:[^/]+\/)?(\d+)/);
      if (match?.[1]) return match[1];
    } catch {
      // Fall through to external id parsing.
    }
  }

  const externalMatch = externalListingId?.match(/\d{8,}/);
  return externalMatch?.[0] || externalListingId;
}

async function loadPopulationSourceContext(suggestionId: string) {
  const { data, error } = await supabaseAdmin
    .from("collector_population_listings")
    .select(
      `
      id,
      source_platform,
      external_listing_id,
      listing_url,
      title,
      listing_title,
      listing_description,
      ebay_item_id,
      platform,
      search_query,
      found_at,
      price,
      shipping_price,
      currency,
      seller_location,
      condition,
      category,
      image_count,
      image_urls,
      input_payload,
      builder_result,
      processed_at,
      created_at,
      collector_population_jobs(search_query)
    `
    )
    .filter("suggestion_ids", "cs", `{${suggestionId}}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function buildSourceContext(suggestion: any) {
  const listing = getSuggestionListing(suggestion);
  const population = await loadPopulationSourceContext(suggestion.id);
  const input = asRecord(population?.input_payload);
  const builderResult = asRecord(population?.builder_result);
  const resultInput = asRecord(builderResult.input);

  const listingUrl = firstString(
    population?.listing_url,
    input.listingUrl,
    input.itemUrl,
    input.url,
    resultInput.listingUrl,
    listing.listingUrl,
    listing.itemUrl,
    listing.item_url,
    listing.url
  );
  const title = firstString(
    population?.listing_title,
    population?.title,
    input.title,
    resultInput.title,
    listing.title
  );
  const sourcePlatform = firstString(
    population?.platform,
    population?.source_platform,
    input.source,
    listing.source
  );
  const priceRecord = asRecord(input.price);
  const shippingRecord = asRecord(input.shipping);
  const currency = firstString(
    population?.currency,
    input.currency,
    priceRecord.currency,
    priceRecord.currencyCode,
    shippingRecord.currency,
    shippingRecord.currencyCode,
    listing.currency,
    currencyFromMoney(listing.price),
    currencyFromMoney(listing.shipping)
  );
  const imageUrls = [
    ...asArray(population?.image_urls),
    ...asArray(input.imageUrls),
    ...asArray(resultInput.imageUrls),
    ...getImageUrls(suggestion),
  ]
    .map(stringValue)
    .filter((url): url is string => Boolean(url));
  const job = asRecord(population?.collector_population_jobs);

  return {
    platform: displayPlatform(sourcePlatform, listingUrl),
    sourcePlatform,
    title,
    listingUrl,
    price: firstNumber(
      population?.price,
      input.priceValue,
      input.currentPrice,
      valueFromMoney(input.price),
      valueFromMoney(listing.price)
    ),
    shippingCost: firstNumber(
      population?.shipping_price,
      input.shippingCost,
      input.shippingPrice,
      valueFromMoney(input.shipping),
      valueFromMoney(listing.shipping)
    ),
    currency,
    ebayItemId: extractEbayItemId(
      firstString(
        population?.ebay_item_id,
        population?.external_listing_id,
        input.itemId,
        listing.itemId
      ),
      listingUrl
    ),
    foundAt: firstString(
      population?.found_at,
      population?.processed_at,
      population?.created_at,
      suggestion.created_at
    ),
    searchQuery: firstString(
      population?.search_query,
      job.search_query,
      input.searchQuery,
      input.query,
      listing.searchQuery
    ),
    imageUrls: [...new Set(imageUrls)],
    populationListingId: population?.id || null,
    isMissingListing: !listingUrl,
  };
}

export async function GET(request: Request) {
  if (!isInternalRequestAuthorized(request)) {
    return unauthorizedInternalResponse();
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing suggestion id." },
      { status: 400 }
    );
  }

  try {
    const { data: suggestion, error } = await supabaseAdmin
      .from("collector_ai_suggestions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    const proposal = getSuggestionProposal(suggestion);
    const match = asRecord(asArray(proposal.collector_knowledge_matches)[0]);
    const matchedItemId =
      stringValue(suggestion.collector_item_id) ||
      stringValue(suggestion.suggested_collector_item_id) ||
      stringValue(match.collectorItemId) ||
      stringValue(match.collector_item_id);

    const [knowledge, events, feedback, learningEvents, sourceContext] = await Promise.all([
      loadCollectorKnowledgeForItem(matchedItemId),
      supabaseAdmin
        .from("collector_approval_events")
        .select("*")
        .eq("suggestion_id", id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("collector_ai_feedback")
        .select("*")
        .eq("suggestion_id", id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("collector_ai_learning_events")
        .select("*")
        .eq("suggestion_id", id)
        .order("created_at", { ascending: false }),
      buildSourceContext(suggestion),
    ]);

    if (events.error) {
      throw events.error;
    }

    if (feedback.error) {
      throw feedback.error;
    }

    if (learningEvents.error) {
      throw learningEvents.error;
    }

    return NextResponse.json({
      success: true,
      suggestion,
      summary: normalizeSuggestionSummary(suggestion),
      proposal,
      collectorKnowledge: knowledge,
      sourceContext,
      approvalEvents: events.data || [],
      aiFeedback: feedback.data || [],
      learningEvents: learningEvents.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

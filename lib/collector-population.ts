import type { SupabaseClient } from "@supabase/supabase-js";
import {
  runCollectorBuilder,
  type CollectorBuilderInput,
  type CollectorBuilderResult,
} from "@/lib/collector-builder";

type JsonRecord = Record<string, unknown>;

export type CollectorPopulationJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type CreatePopulationJobInput = {
  toyline: string;
  sourcePlatform?: string;
  searchQuery?: string | null;
  maxListings: number;
  minimumConfidence?: number | null;
  onlyNewListings?: boolean;
  configuration?: {
    forceReprocess?: boolean;
    maxAiCalls?: number;
    concurrency?: number;
    delayBetweenBatchesMs?: number;
    manufacturer?: string | null;
  };
};

export type PopulationRunResult = {
  jobId: string;
  status: CollectorPopulationJobStatus;
  processedCount: number;
  suggestionCount: number;
  matchedExistingCount: number;
  skippedCount: number;
  failedCount: number;
  attemptedAiCalls: number;
  successfulBuilderCalls: number;
  failedBuilderCalls: number;
};

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID!;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET!;
const EBAY_MARKETPLACE_ID = "EBAY_NL";
const DUTCH_DELIVERY_COUNTRY = "NL";
const DUTCH_DELIVERY_POSTAL_CODE =
  process.env.EBAY_NL_POSTAL_CODE || "1011AB";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function moneyValue(value: unknown) {
  const record = asRecord(value);
  return numberValue(record.value) ?? numberValue(record.amount) ?? numberValue(value);
}

function moneyCurrency(value: unknown) {
  const record = asRecord(value);
  return stringValue(record.currency) || stringValue(record.currencyCode);
}

function getDutchBuyerContext() {
  return `contextualLocation=country%3D${DUTCH_DELIVERY_COUNTRY}%2Czip%3D${encodeURIComponent(
    DUTCH_DELIVERY_POSTAL_CODE
  )}`;
}

function buildEbayFilters() {
  return [
    `deliveryCountry:${DUTCH_DELIVERY_COUNTRY}`,
    `deliveryPostalCode:${DUTCH_DELIVERY_POSTAL_CODE}`,
  ].join(",");
}

async function getEbayToken() {
  const credentials = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay token error: ${text}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

async function searchEbayPopulationListings(query: string, maxListings: number) {
  const token = await getEbayToken();
  const params = new URLSearchParams({
    q: query,
    limit: String(clamp(maxListings, 1, 200)),
    sort: "newlyListed",
  });

  params.set("filter", buildEbayFilters());

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
        "X-EBAY-C-ENDUSERCTX": getDutchBuyerContext(),
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay search error for "${query}": ${text}`);
  }

  const data = await response.json();
  return (data.itemSummaries || []) as any[];
}

function listingExternalId(item: any) {
  return (
    stringValue(item.itemId) ||
    stringValue(item.legacyItemId) ||
    stringValue(item.itemWebUrl) ||
    stringValue(item.title) ||
    crypto.randomUUID()
  );
}

function listingUrl(item: any) {
  return stringValue(item.itemWebUrl) || stringValue(item.itemAffiliateWebUrl);
}

function ebayItemId(item: any) {
  const url = listingUrl(item);
  if (url) {
    try {
      const match = new URL(url).pathname.match(/\/itm\/(?:[^/]+\/)?(\d+)/);
      if (match?.[1]) return match[1];
    } catch {
      // Fall through to item identifiers below.
    }
  }

  const identifiers = [
    stringValue(item.legacyItemId),
    stringValue(item.itemId),
    stringValue(item.itemGroupId),
  ];

  for (const identifier of identifiers) {
    const match = identifier?.match(/\d{8,}/);
    if (match?.[0]) return match[0];
  }

  return identifiers.find(Boolean) || null;
}

function listingImageUrls(item: any) {
  return [
    stringValue(item.image?.imageUrl),
    ...(Array.isArray(item.additionalImages)
      ? item.additionalImages.map((image: any) => stringValue(image?.imageUrl))
      : []),
  ].filter((url): url is string => Boolean(url));
}

function listingShippingPrice(item: any) {
  const options = Array.isArray(item.shippingOptions) ? item.shippingOptions : [];
  const prices = options
    .map((option: any) => moneyValue(option?.shippingCost))
    .filter((price: number | null): price is number => price !== null);

  if (prices.length > 0) {
    return Math.min(...prices);
  }

  return moneyValue(item.shippingCost);
}

function listingCurrency(item: any) {
  const options = Array.isArray(item.shippingOptions) ? item.shippingOptions : [];
  return (
    moneyCurrency(item.price) ||
    options.map((option: any) => moneyCurrency(option?.shippingCost)).find(Boolean) ||
    moneyCurrency(item.shippingCost)
  );
}

function listingSellerLocation(item: any) {
  const location = asRecord(item.itemLocation);
  return [
    stringValue(location.city),
    stringValue(location.stateOrProvince),
    stringValue(location.postalCode),
    stringValue(location.country),
  ]
    .filter(Boolean)
    .join(", ") || null;
}

function listingCondition(item: any) {
  return stringValue(item.condition) || stringValue(item.conditionId);
}

function listingCategory(item: any) {
  const categories = Array.isArray(item.categories) ? item.categories : [];
  const categoryNames = categories
    .map((category: any) => stringValue(category?.categoryName))
    .filter(Boolean);

  if (categoryNames.length > 0) {
    return categoryNames.join(" > ");
  }

  return stringValue(item.categoryPath) || stringValue(item.primaryCategory?.categoryName);
}

function listingPlatform(sourcePlatform: unknown) {
  const platform = stringValue(sourcePlatform);
  if (platform?.toLowerCase() === "ebay" && EBAY_MARKETPLACE_ID === "EBAY_NL") {
    return "eBay.nl";
  }

  return platform || "unknown";
}

function listingSourceMetadata(item: any, job: any, foundAt: string) {
  const imageUrls = listingImageUrls(item);
  const price = moneyValue(item.price);
  const shippingPrice = listingShippingPrice(item);

  return {
    listing_title: stringValue(item.title),
    listing_description: stringValue(item.shortDescription),
    listing_url: listingUrl(item),
    ebay_item_id: ebayItemId(item),
    platform: listingPlatform(job.source_platform),
    search_query: stringValue(job.search_query) || stringValue(job.toyline),
    found_at: foundAt,
    price,
    shipping_price: shippingPrice,
    currency: listingCurrency(item),
    seller_location: listingSellerLocation(item),
    condition: listingCondition(item),
    category: listingCategory(item),
    image_count: imageUrls.length,
    image_urls: imageUrls,
  };
}

function listingToBuilderInput(
  item: any,
  job: any,
  configuration: JsonRecord
): CollectorBuilderInput {
  return {
    title: stringValue(item.title) || "Unknown listing",
    subtitle: stringValue(item.subtitle),
    description: stringValue(item.shortDescription),
    toyline: job.toyline,
    manufacturer: stringValue(configuration.manufacturer),
    listingUrl: listingUrl(item),
    imageUrls: listingImageUrls(item),
    source: "collector_population",
  };
}

function builderConfidence(result: CollectorBuilderResult) {
  return Number(result.proposal?.confidence?.relevance || 0);
}

function builderCollectorItemId(result: CollectorBuilderResult) {
  return (
    stringValue(result.existing_item?.id) ||
    stringValue(result.proposal?.collector_knowledge_matches?.[0]?.collectorItemId)
  );
}

function builderAction(result: CollectorBuilderResult) {
  return result.action || result.matchStatus || "unknown";
}

function dedupeListings(items: any[]) {
  const seen = new Set<string>();
  const deduped: any[] = [];

  for (const item of items) {
    const key = `${listingExternalId(item)}|${listingUrl(item) || ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function sleep(ms: number) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function createPopulationJob(
  supabase: SupabaseClient,
  input: CreatePopulationJobInput
) {
  const toyline = input.toyline.trim();
  if (!toyline) {
    throw new Error("Population job requires a toyline.");
  }

  // TODO V1:
  // Replace temporary development limits with the Population Queue Controller
  // (target pending review queue architecture).
  const maxListings = clamp(Math.floor(input.maxListings || 60), 1, 200);
  const minimumConfidence =
    input.minimumConfidence === null || input.minimumConfidence === undefined
      ? 0.6
      : clamp(Number(input.minimumConfidence), 0, 1);
  const configuration = {
    forceReprocess: false,
    maxAiCalls: maxListings,
    concurrency: 2,
    delayBetweenBatchesMs: 0,
    ...(input.configuration || {}),
  };

  const { data, error } = await supabase
    .from("collector_population_jobs")
    .insert({
      toyline,
      source_platform: input.sourcePlatform || "ebay",
      search_query: input.searchQuery?.trim() || toyline,
      max_listings: maxListings,
      minimum_confidence: minimumConfidence,
      only_new_listings: input.onlyNewListings ?? true,
      status: "pending",
      configuration,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPopulationJob(supabase: SupabaseClient, jobId: string) {
  const [{ data: job, error }, { data: listings, error: listingError }] =
    await Promise.all([
      supabase
        .from("collector_population_jobs")
        .select("*")
        .eq("id", jobId)
        .single(),
      supabase
        .from("collector_population_listings")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    throw error;
  }

  if (listingError) {
    throw listingError;
  }

  return {
    job,
    listings: listings || [],
  };
}

export async function listPopulationJobs(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("collector_population_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function cancelPopulationJob(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from("collector_population_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .in("status", ["pending", "running"])
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function loadJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from("collector_population_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateJobCounters(
  supabase: SupabaseClient,
  jobId: string,
  counters: Partial<{
    processed_count: number;
    suggestion_count: number;
    matched_existing_count: number;
    skipped_count: number;
    failed_count: number;
  }>,
  configurationPatch?: JsonRecord
) {
  const job = await loadJob(supabase, jobId);
  const configuration = {
    ...asRecord(job.configuration),
    ...(configurationPatch || {}),
  };

  const { error } = await supabase
    .from("collector_population_jobs")
    .update({
      ...counters,
      configuration,
    })
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}

async function isJobCancelled(supabase: SupabaseClient, jobId: string) {
  const job = await loadJob(supabase, jobId);
  return job.status === "cancelled";
}

async function hasProcessedListing(
  supabase: SupabaseClient,
  sourcePlatform: string,
  externalListingId: string,
  url: string | null
) {
  let query = supabase
    .from("collector_population_listings")
    .select("id")
    .eq("source_platform", sourcePlatform)
    .eq("external_listing_id", externalListingId)
    .limit(1);

  const byExternal = await query.maybeSingle();
  if (byExternal.error && byExternal.error.code !== "PGRST116") {
    throw byExternal.error;
  }

  if (byExternal.data) {
    return true;
  }

  if (!url) {
    return false;
  }

  const byUrl = await supabase
    .from("collector_population_listings")
    .select("id")
    .eq("source_platform", sourcePlatform)
    .eq("listing_url", url)
    .limit(1)
    .maybeSingle();

  if (byUrl.error && byUrl.error.code !== "PGRST116") {
    throw byUrl.error;
  }

  return Boolean(byUrl.data);
}

function hasStoredValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

async function findExistingPopulationListing(
  supabase: SupabaseClient,
  sourcePlatform: string,
  externalListingId: string | null,
  url: string | null
) {
  if (externalListingId) {
    const byExternal = await supabase
      .from("collector_population_listings")
      .select("*")
      .eq("source_platform", sourcePlatform)
      .eq("external_listing_id", externalListingId)
      .limit(1)
      .maybeSingle();

    if (byExternal.error && byExternal.error.code !== "PGRST116") {
      throw byExternal.error;
    }

    if (byExternal.data) {
      return byExternal.data;
    }
  }

  if (!url) {
    return null;
  }

  const byUrl = await supabase
    .from("collector_population_listings")
    .select("*")
    .eq("source_platform", sourcePlatform)
    .eq("listing_url", url)
    .limit(1)
    .maybeSingle();

  if (byUrl.error && byUrl.error.code !== "PGRST116") {
    throw byUrl.error;
  }

  return byUrl.data || null;
}

async function fillMissingPopulationListingValues(
  supabase: SupabaseClient,
  row: JsonRecord
) {
  const sourcePlatform = stringValue(row.source_platform);
  if (!sourcePlatform) {
    return false;
  }

  const existing = await findExistingPopulationListing(
    supabase,
    sourcePlatform,
    stringValue(row.external_listing_id),
    stringValue(row.listing_url)
  );

  if (!existing) {
    return false;
  }

  const patch: JsonRecord = {};
  for (const [key, value] of Object.entries(row)) {
    if (
      key === "id" ||
      key === "job_id" ||
      key === "processing_status" ||
      key === "builder_action" ||
      key === "collector_item_id" ||
      key === "suggestion_ids" ||
      key === "confidence" ||
      key === "skip_reason" ||
      key === "error_message" ||
      key === "input_payload" ||
      key === "builder_result" ||
      key === "processed_at" ||
      key === "created_at"
    ) {
      continue;
    }

    if (!hasStoredValue(existing[key]) && hasStoredValue(value)) {
      patch[key] = value;
    }
  }

  if (Object.keys(patch).length === 0) {
    return false;
  }

  const { error } = await supabase
    .from("collector_population_listings")
    .update(patch)
    .eq("id", existing.id);

  if (error) {
    throw error;
  }

  return true;
}

async function recordPopulationListing(
  supabase: SupabaseClient,
  row: JsonRecord
) {
  const { error } = await supabase.from("collector_population_listings").insert(row);

  if (error) {
    if (String(error.code) === "23505") {
      await fillMissingPopulationListingValues(supabase, row);
      return false;
    }

    throw error;
  }

  return true;
}

async function processListing({
  supabase,
  job,
  item,
  minimumConfidence,
}: {
  supabase: SupabaseClient;
  job: any;
  item: any;
  minimumConfidence: number;
}) {
  const configuration = asRecord(job.configuration);
  const externalListingId = listingExternalId(item);
  const url = listingUrl(item);
  const input = listingToBuilderInput(item, job, configuration);
  const title = input.title;
  const now = new Date().toISOString();
  const sourceMetadata = listingSourceMetadata(item, job, now);

  try {
    const result = await runCollectorBuilder({
      input,
      supabase,
      minimumSuggestionConfidence: minimumConfidence,
    });
    const confidence = builderConfidence(result);
    const outOfScope = result.proposal.scope_status !== "in_scope";
    const belowConfidence = outOfScope || confidence < minimumConfidence;
    const suggestionIds = result.storedSuggestionIds || [];
    const inserted = await recordPopulationListing(supabase, {
      job_id: job.id,
      source_platform: job.source_platform,
      external_listing_id: externalListingId,
      title,
      ...sourceMetadata,
      processing_status: belowConfidence ? "skipped_low_confidence" : "processed",
      builder_action: builderAction(result),
      collector_item_id: builderCollectorItemId(result),
      suggestion_ids: suggestionIds,
      confidence,
      skip_reason: outOfScope
        ? result.proposal.scope_status
        : belowConfidence
          ? suggestionIds.length > 0
          ? "below_minimum_confidence_routed_to_review"
          : "below_minimum_confidence"
        : null,
      input_payload: input,
      builder_result: result as unknown as JsonRecord,
      processed_at: now,
    });

    return {
      inserted,
      processed: inserted && !belowConfidence ? 1 : 0,
      suggestions: inserted ? suggestionIds.length : 0,
      matchedExisting:
        inserted && result.action === "review_existing_match" ? 1 : 0,
      skipped: inserted && belowConfidence ? 1 : inserted ? 0 : 1,
      failed: 0,
      builderSucceeded: true,
    };
  } catch (error) {
    await recordPopulationListing(supabase, {
      job_id: job.id,
      source_platform: job.source_platform,
      external_listing_id: externalListingId,
      title,
      ...sourceMetadata,
      processing_status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
      input_payload: input,
      processed_at: now,
    });

    return {
      inserted: true,
      processed: 0,
      suggestions: 0,
      matchedExisting: 0,
      skipped: 0,
      failed: 1,
      builderSucceeded: false,
    };
  }
}

export async function runPopulationJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<PopulationRunResult> {
  let job = await loadJob(supabase, jobId);

  if (job.status === "cancelled") {
    return {
      jobId,
      status: "cancelled",
      processedCount: job.processed_count,
      suggestionCount: job.suggestion_count,
      matchedExistingCount: job.matched_existing_count,
      skippedCount: job.skipped_count,
      failedCount: job.failed_count,
      attemptedAiCalls: Number(asRecord(job.configuration).attemptedAiCalls || 0),
      successfulBuilderCalls: Number(
        asRecord(job.configuration).successfulBuilderCalls || 0
      ),
      failedBuilderCalls: Number(
        asRecord(job.configuration).failedBuilderCalls || 0
      ),
    };
  }

  const start = new Date().toISOString();
  await supabase
    .from("collector_population_jobs")
    .update({
      status: "running",
      started_at: job.started_at || start,
      completed_at: null,
      error_message: null,
    })
    .eq("id", jobId);
  job = await loadJob(supabase, jobId);

  const configuration = asRecord(job.configuration);
  const forceReprocess = Boolean(configuration.forceReprocess);
  const maxAiCalls = clamp(
    Math.floor(Number(configuration.maxAiCalls || job.max_listings)),
    0,
    job.max_listings
  );
  const concurrency = clamp(Math.floor(Number(configuration.concurrency || 2)), 1, 3);
  const delayBetweenBatchesMs = Math.max(
    0,
    Math.floor(Number(configuration.delayBetweenBatchesMs || 0))
  );
  const minimumConfidence = Number(job.minimum_confidence ?? 0.6);
  const query = stringValue(job.search_query) || job.toyline;

  const counters = {
    processed_count: Number(job.processed_count || 0),
    suggestion_count: Number(job.suggestion_count || 0),
    matched_existing_count: Number(job.matched_existing_count || 0),
    skipped_count: Number(job.skipped_count || 0),
    failed_count: Number(job.failed_count || 0),
  };
  const runtime = {
    attemptedAiCalls: Number(configuration.attemptedAiCalls || 0),
    successfulBuilderCalls: Number(configuration.successfulBuilderCalls || 0),
    failedBuilderCalls: Number(configuration.failedBuilderCalls || 0),
    skippedDuplicates: Number(configuration.skippedDuplicates || 0),
  };

  try {
    const listings = dedupeListings(
      await searchEbayPopulationListings(query, job.max_listings)
    ).slice(0, job.max_listings);

    for (let index = 0; index < listings.length; index += concurrency) {
      if (await isJobCancelled(supabase, jobId)) {
        await supabase
          .from("collector_population_jobs")
          .update({
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        break;
      }

      const batch = listings.slice(index, index + concurrency);
      const processable: any[] = [];

      for (const item of batch) {
        const externalListingId = listingExternalId(item);
        const url = listingUrl(item);
        const duplicate =
          !forceReprocess &&
          job.only_new_listings &&
          (await hasProcessedListing(
            supabase,
            job.source_platform,
            externalListingId,
            url
          ));

        if (duplicate) {
          await fillMissingPopulationListingValues(supabase, {
            source_platform: job.source_platform,
            external_listing_id: externalListingId,
            title: stringValue(item.title),
            ...listingSourceMetadata(item, job, new Date().toISOString()),
          });
          counters.skipped_count += 1;
          runtime.skippedDuplicates += 1;
          continue;
        }

        if (runtime.attemptedAiCalls >= maxAiCalls) {
          counters.skipped_count += 1;
          continue;
        }

        runtime.attemptedAiCalls += 1;
        processable.push(item);
      }

      const results = await Promise.all(
        processable.map((item) =>
          processListing({
            supabase,
            job,
            item,
            minimumConfidence,
          })
        )
      );

      for (const result of results) {
        counters.processed_count += result.processed;
        counters.suggestion_count += result.suggestions;
        counters.matched_existing_count += result.matchedExisting;
        counters.skipped_count += result.skipped;
        counters.failed_count += result.failed;
        if (result.builderSucceeded) {
          runtime.successfulBuilderCalls += 1;
        } else {
          runtime.failedBuilderCalls += 1;
        }
      }

      await updateJobCounters(supabase, jobId, counters, runtime);
      await sleep(delayBetweenBatchesMs);
    }

    const cancelled = await isJobCancelled(supabase, jobId);
    const finalStatus: CollectorPopulationJobStatus = cancelled
      ? "cancelled"
      : counters.failed_count > 0
        ? "completed_with_errors"
        : "completed";

    await supabase
      .from("collector_population_jobs")
      .update({
        ...counters,
        status: finalStatus,
        completed_at: new Date().toISOString(),
        configuration: {
          ...configuration,
          ...runtime,
          listingCount: listings.length,
        },
      })
      .eq("id", jobId);

    return {
      jobId,
      status: finalStatus,
      processedCount: counters.processed_count,
      suggestionCount: counters.suggestion_count,
      matchedExistingCount: counters.matched_existing_count,
      skippedCount: counters.skipped_count,
      failedCount: counters.failed_count,
      ...runtime,
    };
  } catch (error) {
    await supabase
      .from("collector_population_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown error",
        configuration: {
          ...configuration,
          ...runtime,
        },
      })
      .eq("id", jobId);

    throw error;
  }
}

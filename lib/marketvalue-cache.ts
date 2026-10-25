import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketValueCacheEntry = {
  cache_key: string;
  hunt_query: string;
  toyline: string | null;
  condition_class: string;
  market_value: number;
  comparable_count: number;
  comparable_query: string;
  source: string;
  currency: string;
  updated_at: string;
};

export type MarketValueCachePayload = {
  cacheKey: string;
  huntQuery: string;
  toyline: string;
  conditionClass: string;
  marketValue: number;
  comparableCount: number;
  comparableQuery: string;
  source: string;
  currency: string;
};

export type MarketValueCacheStatus = "fresh" | "stale" | "miss" | "error";

export type MarketValueCacheLookup =
  | {
      status: "fresh" | "stale";
      entry: {
        marketValue: number;
        comparableCount: number;
        comparableQuery: string;
        source: string;
        updatedAt: string;
      };
    }
  | {
      status: "miss" | "error";
      entry: null;
    };

const MARKET_VALUE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function normalizeMarketValuePart(value: string) {
  return value
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createMarketValueCacheKey({
  itemIdentity,
  huntQuery,
  toyline,
  conditionClass,
}: {
  itemIdentity?: string;
  huntQuery?: string;
  toyline: string;
  conditionClass: string;
}) {
  if (itemIdentity) {
    return itemIdentity;
  }

  return [
    normalizeMarketValuePart(huntQuery || ""),
    normalizeMarketValuePart(toyline || "unknown"),
    normalizeMarketValuePart(conditionClass),
  ].join("|");
}

export function isMarketValueCacheFresh(updatedAt: string) {
  const updated = new Date(updatedAt).getTime();

  if (!Number.isFinite(updated)) {
    return false;
  }

  return Date.now() - updated <= MARKET_VALUE_CACHE_TTL_MS;
}

export async function getFreshMarketValue(
  supabase: SupabaseClient,
  cacheKey: string
) {
  const lookup = await getMarketValueCache(supabase, cacheKey);

  return lookup.status === "fresh" ? lookup.entry : null;
}

export async function getMarketValueCache(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<MarketValueCacheLookup> {
  const { data, error } = await supabase
    .from("toyhunter_market_values")
    .select(
      "cache_key,hunt_query,toyline,condition_class,market_value,comparable_count,comparable_query,source,currency,updated_at"
    )
    .eq("cache_key", cacheKey)
    .maybeSingle<MarketValueCacheEntry>();

  if (error) {
    console.error("Market value cache lookup failed:", error);
    return {
      status: "error",
      entry: null,
    };
  }

  if (!data) {
    return {
      status: "miss",
      entry: null,
    };
  }

  const entry = {
    marketValue: Number(data.market_value || 0),
    comparableCount: Number(data.comparable_count || 0),
    comparableQuery: data.comparable_query || "",
    source: data.source || "cache",
    updatedAt: data.updated_at,
  };

  return {
    status: isMarketValueCacheFresh(data.updated_at) ? "fresh" : "stale",
    entry,
  };
}

export async function upsertMarketValue(
  supabase: SupabaseClient,
  payload: MarketValueCachePayload
) {
  const { error } = await supabase
    .from("toyhunter_market_values")
    .upsert(
      {
        cache_key: payload.cacheKey,
        hunt_query: payload.huntQuery,
        toyline: payload.toyline || null,
        condition_class: payload.conditionClass,
        market_value: payload.marketValue,
        comparable_count: payload.comparableCount,
        comparable_query: payload.comparableQuery,
        source: payload.source,
        currency: payload.currency,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "cache_key",
      }
    );

  if (error) {
    console.error("Market value cache upsert failed:", error);
  }
}

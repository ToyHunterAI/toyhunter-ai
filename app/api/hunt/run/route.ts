import {
  createMarketValueCacheKey,
  getMarketValueCache,
  normalizeMarketValuePart,
  upsertMarketValue,
} from "@/lib/marketvalue-cache";
import { getSoldCompsListings } from "@/lib/soldcomps";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HuntProfile = {
  id: string;
  user_id: string;
  toy_categories?: string[] | null;
  platforms?: string[] | null;
  max_budget?: number | null;
  minimum_profit?: number | null;
  region?: string | null;
  frequency?: string | null;
  is_active?: boolean | null;
};

type MoneyAmount = {
  value?: string;
  currency?: string;
  convertedFromValue?: string;
  convertedFromCurrency?: string;
};

type EbayShippingOption = {
  shippingCost?: MoneyAmount;
  importCharges?: MoneyAmount;
  shippingCostType?: string;
  minEstimatedDeliveryDate?: string;
  maxEstimatedDeliveryDate?: string;
};

type EbayItem = {
  itemId?: string;
  title?: string;
  price?: MoneyAmount;
  shippingOptions?: EbayShippingOption[];
  condition?: string;
  image?: {
    imageUrl?: string;
  };
  itemWebUrl?: string;
  seller?: {
    username?: string;
  };
};

type ToyKeyword = {
  keyword: string;
  weight: number;
};

type BlockedKeyword = {
  keyword: string;
};

type ItemCosts = {
  price: number;
  shipping: number;
  importCharges: number;
  totalCost: number;
  currency: string;
};

type CheapCandidate = {
  profile: HuntProfile;
  query: string;
  item: EbayItem;
  itemUrl: string | null;
  title: string;
  toyline: string;
  conditionClass: string;
  marketCacheKey: string;
  summaryCosts: ItemCosts;
  cheapScore: number;
  cheapReasons: string[];
};

type MarketValueResult = {
  marketValue: number;
  comparableCount: number;
  comparableQuery: string;
  source: "cache" | "stale_cache" | "soldcomps" | "unknown";
};

type ScoredCandidate = {
  price: number;
  shipping: number;
  importCharges: number;
  totalCost: number;
  currency: string;
  estimatedMarketValue: number;
  estimatedProfit: number;
  hiddenGemScore: number;
  opportunityLabel: string;
  reasons: string[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ebayClientId = process.env.EBAY_CLIENT_ID!;
const ebayClientSecret = process.env.EBAY_CLIENT_SECRET!;

const MINIMUM_QUALITY_SCORE = 30;
const MAX_PROFIT_SCORE_BONUS = 40;
const DUTCH_MARKETPLACE_ID = "EBAY_NL";
const DUTCH_DELIVERY_COUNTRY = "NL";
const DUTCH_DELIVERY_CURRENCY = "EUR";
const DUTCH_DELIVERY_POSTAL_CODE =
  process.env.EBAY_NL_POSTAL_CODE || "1011AB";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const keywordCache = new Map<string, ToyKeyword[]>();
const blockedKeywordCache = new Map<string, BlockedKeyword[]>();

async function getEbayToken() {
  const credentials = Buffer.from(
    `${ebayClientId}:${ebayClientSecret}`
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay token error: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

function getMarketplaceId(_platform?: string) {
  return DUTCH_MARKETPLACE_ID;
}

function getDutchBuyerContext() {
  return `contextualLocation=country%3D${DUTCH_DELIVERY_COUNTRY}%2Czip%3D${encodeURIComponent(
    DUTCH_DELIVERY_POSTAL_CODE
  )}`;
}

function buildEbayFilters(maxPrice?: number | null) {
  const filters = [
    `deliveryCountry:${DUTCH_DELIVERY_COUNTRY}`,
    `deliveryPostalCode:${DUTCH_DELIVERY_POSTAL_CODE}`,
  ];

  if (maxPrice && maxPrice > 0) {
    filters.push(
      `price:[0..${maxPrice}]`,
      `priceCurrency:${DUTCH_DELIVERY_CURRENCY}`
    );
  }

  return filters.join(",");
}

async function searchEbay(
  query: string,
  token: string,
  marketplaceId: string,
  maxPrice?: number | null
): Promise<EbayItem[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sort: "newlyListed",
  });

  params.set("filter", buildEbayFilters(maxPrice));

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        "X-EBAY-C-ENDUSERCTX": getDutchBuyerContext(),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay search error for "${query}": ${errorText}`);
  }

  const data = await response.json();
  return data.itemSummaries || [];
}

async function getEbayItemDetail(itemId: string, token: string) {
  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": DUTCH_MARKETPLACE_ID,
        "X-EBAY-C-ENDUSERCTX": getDutchBuyerContext(),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay item detail error for "${itemId}": ${errorText}`);
  }

  return (await response.json()) as EbayItem;
}

function parseOptionalMoneyValue(value?: string | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMoneyValue(value?: string | null) {
  return parseOptionalMoneyValue(value) || 0;
}

function getMoneyValue(amount?: MoneyAmount) {
  return parseOptionalMoneyValue(amount?.value);
}

function getBestLandedShippingCost(item: EbayItem) {
  const options =
    item.shippingOptions
      ?.map((option) => {
        const shipping = getMoneyValue(option.shippingCost);

        if (shipping === null || shipping < 0) {
          return null;
        }

        const importCharges = getMoneyValue(option.importCharges) || 0;

        return {
          shipping,
          importCharges,
          landedShippingCost: shipping + importCharges,
        };
      })
      .filter(
        (
          value
        ): value is {
          shipping: number;
          importCharges: number;
          landedShippingCost: number;
        } => value !== null
      ) || [];

  if (options.length === 0) {
    return null;
  }

  return options.sort(
    (a, b) => a.landedShippingCost - b.landedShippingCost
  )[0];
}

function getItemCosts(item: EbayItem): ItemCosts | null {
  const price = getMoneyValue(item.price);
  const shipping = getBestLandedShippingCost(item);

  if (price === null || shipping === null) {
    return null;
  }

  return {
    price,
    shipping: shipping.shipping,
    importCharges: shipping.importCharges,
    totalCost: price + shipping.landedShippingCost,
    currency: item.price?.currency || DUTCH_DELIVERY_CURRENCY,
  };
}

function getSoldCompTotalPrice(result: {
  totalPrice?: string | null;
  soldPrice?: string | null;
  shippingPrice?: string | null;
}) {
  const totalPrice = parseMoneyValue(result.totalPrice);

  if (totalPrice > 0) {
    return totalPrice;
  }

  return parseMoneyValue(result.soldPrice) + parseMoneyValue(result.shippingPrice);
}

function getMedianPrice(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildComparableQuery(title: string) {
  const stopWords = [
    "the",
    "a",
    "an",
    "with",
    "for",
    "and",
    "complete",
    "figure",
    "toy",
    "vintage",
    "new",
    "used",
    "lot",
    "parts",
    "rare",
    "original",
    "sealed",
    "box",
    "boxed",
    "accessory",
    "accessories",
    "projectile",
    "missile",
    "weapon",
    "weapons",
    "space",
    "shuttle",
    "manual",
    "cards",
    "card",
    "insert",
    "inserts",
    "part",
    "parts",
    "repair",
    "body",
    "jet",
    "x4",
    "9pc",
    "stat",
    "read",
    "guide",
    "recognition",
    "book",
    "machine",
    "gun",
    "tech",
    "spec",
    "incomplete",
  ];

  return title
    .split(/\s+/)
    .map((word) => word.replace(/[^\w-]/g, ""))
    .filter(
      (word) =>
        word.length > 2 &&
        !/^\d+$/.test(word) &&
        !/\d/.test(word) &&
        !/[+.]/.test(word) &&
        !stopWords.includes(word.toLowerCase())
    )
    .slice(0, 4)
    .join(" ");
}

function normalizeIdentityToken(value: string) {
  return normalizeMarketValuePart(value);
}

function tokenizeIdentityText(value: string) {
  return normalizeIdentityToken(value)
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueTokens(tokens: string[]) {
  return [...new Set(tokens.filter(Boolean))];
}

const ITEM_IDENTITY_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "without",
  "for",
  "from",
  "of",
  "in",
  "on",
  "to",
  "toy",
  "toys",
  "figure",
  "figures",
  "action",
  "vintage",
  "rare",
  "original",
  "old",
  "used",
  "new",
  "lot",
  "bundle",
  "collection",
  "complete",
  "incomplete",
  "sealed",
  "unopened",
  "boxed",
  "box",
  "mib",
  "misb",
  "moc",
  "carded",
  "parts",
  "part",
  "missing",
  "broken",
  "repair",
  "accessory",
  "accessories",
  "weapon",
  "weapons",
  "missile",
  "missiles",
  "projectile",
  "projectiles",
  "kenner",
  "hasbro",
  "takara",
  "bandai",
  "mattel",
  "tyco",
  "ljn",
  "playmates",
  "galoob",
  "tonka",
  "coleco",
  "bluebird",
  "palitoy",
  "matchbox",
  "tomy",
]);

function getToylineTokens(toyline: string) {
  const aliases = TOYLINE_ALIASES[toyline] || [];

  return new Set([
    ...tokenizeIdentityText(toyline),
    ...aliases.flatMap((alias) => tokenizeIdentityText(alias)),
  ]);
}

function getStrongMatchedKeywordTokens(
  title: string,
  keywords: ToyKeyword[],
  maxTokens = 8
) {
  const lowerTitle = title.toLowerCase();

  return uniqueTokens(
    keywords
      .filter((entry) => lowerTitle.includes(entry.keyword.toLowerCase()))
      .sort((a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword))
      .flatMap((entry) => tokenizeIdentityText(entry.keyword))
  ).slice(0, maxTokens);
}

function getDistinctiveTitleTokens({
  title,
  toyline,
  keywordTokens,
  maxTokens = 12,
}: {
  title: string;
  toyline: string;
  keywordTokens: string[];
  maxTokens?: number;
}) {
  const toylineTokens = getToylineTokens(toyline);
  const keywordTokenSet = new Set(keywordTokens);

  return uniqueTokens(tokenizeIdentityText(title))
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !ITEM_IDENTITY_STOP_WORDS.has(token))
    .filter((token) => !toylineTokens.has(token))
    .filter((token) => !keywordTokenSet.has(token))
    .sort()
    .slice(0, maxTokens);
}

function buildItemIdentityKey({
  title,
  toyline,
  keywords,
  conditionClass,
}: {
  title: string;
  toyline: string;
  keywords: ToyKeyword[];
  conditionClass: string;
}) {
  const normalizedToyline = normalizeIdentityToken(toyline || "unknown");
  const keywordTokens = getStrongMatchedKeywordTokens(title, keywords);
  const titleTokens = getDistinctiveTitleTokens({
    title,
    toyline,
    keywordTokens,
  });

  return createMarketValueCacheKey({
    itemIdentity: [
      `toyline:${normalizedToyline}`,
      `keywords:${keywordTokens.length > 0 ? keywordTokens.join("-") : "none"}`,
      `tokens:${titleTokens.length > 0 ? titleTokens.join("-") : "none"}`,
      `condition:${normalizeIdentityToken(conditionClass)}`,
    ].join("|"),
    toyline,
    conditionClass,
  });
}

function getSimilarity(a: string, b: string) {
  const wordsA = new Set(
    buildComparableQuery(a).toLowerCase().split(/\s+/).filter(Boolean)
  );
  const wordsB = new Set(
    buildComparableQuery(b).toLowerCase().split(/\s+/).filter(Boolean)
  );
  const intersection = [...wordsA].filter((word) => wordsB.has(word));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size === 0 ? 0 : intersection.length / union.size;
}

function shouldExcludeResult(title: string) {
  const lower = title.toLowerCase();
  const blockedWords = [
    "coomodel",
    "hot toys",
    "masterpiece",
    "lightning collection",
    " lc ",
    "transformers one",
    "studio series",
    "war for cybertron",
    "legacy",
    "kingdom",
    "siege",
    "earthrise",
    "cyberverse",
    "reactivate",
    " mp ",
    "reissue",
    "custom",
    "3d",
    "replica",
    "star wars",
    "lego",
    "meccano",
    "halloween",
    "costume",
    "wearable",
    "adult mask",
    "child mask",
    "comic",
    "comics",
    "magazine",
    "book",
    "issue #",
    "#1",
    "#2",
    "#3",
    "tpb",
    "hardcover",
    "paperback",
    "issue",
    "vol.",
    "volume",
    "comic book",
    "graphic novel",
    "trade paperback",
    "foil",
    "virgin",
    "variant",
    "cover a",
    "cover b",
    "cover c",
    "incentive",
  ];

  return blockedWords.some((word) => lower.includes(word));
}

function hasWord(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function getConditionClass(title: string) {
  const lower = title.toLowerCase();

  if (
    hasWord(lower, /\bmisb\b/) ||
    hasWord(lower, /\bsealed\b/) ||
    hasWord(lower, /\bunopened\b/) ||
    hasWord(lower, /\bnever opened\b/) ||
    hasWord(lower, /\bfactory sealed\b/) ||
    hasWord(lower, /\bnew sealed\b/)
  ) {
    return "SEALED";
  }

  if (
    hasWord(lower, /\bmib\b/) ||
    hasWord(lower, /\bmoc\b/) ||
    hasWord(lower, /\bcarded\b/) ||
    hasWord(lower, /\bboxed\b/) ||
    hasWord(lower, /\bin box\b/) ||
    hasWord(lower, /\bwith box\b/) ||
    hasWord(lower, /\bon card\b/) ||
    hasWord(lower, /\bcard back\b/)
  ) {
    return "BOXED";
  }

  if (
    hasWord(lower, /\bfor parts\b/) ||
    hasWord(lower, /\bparts only\b/) ||
    hasWord(lower, /\bspares\b/) ||
    hasWord(lower, /\bbroken\b/) ||
    hasWord(lower, /\brepair\b/) ||
    hasWord(lower, /\breplacement\b/)
  ) {
    return "PARTS";
  }

  if (
    hasWord(lower, /\bincomplete\b/) ||
    hasWord(lower, /\bmissing\b/) ||
    hasWord(lower, /\bno accessories\b/) ||
    hasWord(lower, /\bwithout accessories\b/)
  ) {
    return "INCOMPLETE";
  }

  if (
    hasWord(lower, /\b100% complete\b/) ||
    hasWord(lower, /\bcomplete\b/) ||
    hasWord(lower, /\bcomplete with accessories\b/) ||
    hasWord(lower, /\bwith accessories\b/) ||
    hasWord(lower, /\bwith weapon\b/) ||
    hasWord(lower, /\ball accessories included\b/)
  ) {
    return "COMPLETE";
  }

  return "LOOSE";
}

function detectToyline(text: string) {
  const lower = text.toLowerCase();

  for (const [toyline, aliases] of Object.entries(TOYLINE_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return toyline;
    }
  }

  return "";
}

function isModernCandidate(title: string, toyline: string) {
  const lowerTitle = title.toLowerCase();

  if (
    toyline === "Power Rangers" &&
    (/\b6\b/.test(lowerTitle) ||
      lowerTitle.includes("6 inch") ||
      lowerTitle.includes("6in") ||
      /\b7\b/.test(lowerTitle) ||
      lowerTitle.includes("7 inch") ||
      lowerTitle.includes("7in"))
  ) {
    return true;
  }

  return /\b(2011|2012|2013|2014|2015|2016|2017|2018|2019|202\d|203\d)\b/.test(
    lowerTitle
  );
}

async function getKeywordWeights(toyline: string): Promise<ToyKeyword[]> {
  if (!toyline) {
    return [];
  }

  const cached = keywordCache.get(toyline);

  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from("toy_keywords")
    .select("keyword, weight")
    .eq("toyline", toyline);

  if (error) {
    console.error("Keyword error:", error);
    return [];
  }

  const keywords = data || [];
  keywordCache.set(toyline, keywords);
  return keywords;
}

async function getBlockedKeywords(toyline: string): Promise<BlockedKeyword[]> {
  const cacheKey = toyline || "ALL";
  const cached = blockedKeywordCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from("toy_blocked_keywords")
    .select("keyword")
    .in("toyline", ["ALL", toyline]);

  if (error) {
    console.error("Blocked keyword error:", error);
    return [];
  }

  const blocked = data || [];
  blockedKeywordCache.set(cacheKey, blocked);
  return blocked;
}

function calculateCheapScore({
  item,
  query,
  toyline,
  keywords,
  costs,
}: {
  item: EbayItem;
  query: string;
  toyline: string;
  keywords: ToyKeyword[];
  costs: ItemCosts;
}) {
  const title = item.title || "";
  const lowerTitle = title.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  for (const entry of keywords) {
    if (lowerTitle.includes(entry.keyword.toLowerCase())) {
      score += entry.weight;
      matchedKeywords.push(entry.keyword);
    }
  }

  const vintageSignals = [
    "vintage",
    "80s",
    "1980",
    "1981",
    "1982",
    "1983",
    "1984",
    "1985",
    "1986",
    "1987",
    "1988",
    "1989",
    "90s",
    "1990",
    "1991",
    "1992",
    "1993",
    "1994",
    "1995",
    "g1",
    "takara",
    "kenner",
    "hasbro",
    "bandai",
    "popy",
    "palitoy",
    "mattel",
    "bluebird",
    "silverlit",
  ];

  if (lowerTitle.includes("198") || lowerTitle.includes("199")) {
    score += 15;
    reasons.push("80s/90s vintage item");
  }

  if (lowerTitle.includes("vintage")) {
    score += 10;
    reasons.push("Vintage signal");
  }

  if (lowerTitle.includes("bandai")) {
    score += 5;
    reasons.push("Bandai signal");
  }

  const weakSellerSignals = [
    "old toy",
    "old toys",
    "unknown",
    "mixed lot",
    "toy lot",
    "figure lot",
    "job lot",
    "estate sale",
    "attic find",
    "barn find",
    "garage sale",
    "flea market",
    "boot sale",
    "charity shop",
    "thrift store",
    "untested",
    "as is",
    "for parts",
    "found in storage",
    "storage find",
    "vintage toy",
    "vintage toys",
  ];

  for (const signal of vintageSignals) {
    if (lowerTitle.includes(signal)) {
      score += 8;
      reasons.push(`Vintage signal: ${signal}`);
      break;
    }
  }

  for (const signal of weakSellerSignals) {
    if (lowerTitle.includes(signal)) {
      score += 15;
      reasons.push(`Generic seller wording: ${signal}`);
      break;
    }
  }

  if (costs.price > 0 && costs.price <= 25) {
    score += 20;
    reasons.push("Low asking price");
  } else if (costs.price <= 50) {
    score += 10;
    reasons.push("Moderate asking price");
  }

  if (lowerTitle.includes(query.toLowerCase())) {
    score += 10;
    reasons.push("Direct match with hunt profile");
  } else {
    score += 12;
    reasons.push("Loose match may hide value");
  }

  console.log({
    title,
    toyline,
    keywordScore: matchedKeywords.length,
    matchedKeywords,
    cheapScore: score,
  });

  return {
    cheapScore: Math.min(score, 100),
    reasons,
  };
}

function buildMarketComparableQuery(candidate: CheapCandidate) {
  const title = candidate.title;

  return (
    candidate.toyline
      ? `${candidate.toyline} ${buildComparableQuery(title)}`
      : buildComparableQuery(title) || candidate.query
  ).trim();
}

async function getMarketValueForCandidate(
  candidate: CheapCandidate
): Promise<MarketValueResult> {
  const comparableQuery = buildMarketComparableQuery(candidate);
  const cacheKey = candidate.marketCacheKey;
  const cacheLookup = await getMarketValueCache(supabase, cacheKey);
  const legacyCacheKey = createMarketValueCacheKey({
    huntQuery: comparableQuery,
    toyline: candidate.toyline,
    conditionClass: candidate.conditionClass,
  });
  const legacyCacheLookup =
    cacheLookup.status === "miss" && legacyCacheKey !== cacheKey
      ? await getMarketValueCache(supabase, legacyCacheKey)
      : null;

  if (cacheLookup.status === "fresh") {
    return {
      marketValue: cacheLookup.entry.marketValue,
      comparableCount: cacheLookup.entry.comparableCount,
      comparableQuery: cacheLookup.entry.comparableQuery,
      source: "cache",
    };
  }

  if (legacyCacheLookup?.status === "fresh") {
    return {
      marketValue: legacyCacheLookup.entry.marketValue,
      comparableCount: legacyCacheLookup.entry.comparableCount,
      comparableQuery: legacyCacheLookup.entry.comparableQuery,
      source: "cache",
    };
  }

  let soldComps = [];

  try {
    soldComps = await getSoldCompsListings(comparableQuery, 100);
  } catch (error) {
    console.error("SoldComps lookup failed:", {
      title: candidate.title,
      query: comparableQuery,
      cacheStatus: cacheLookup.status,
      legacyCacheStatus: legacyCacheLookup?.status,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (
      cacheLookup.status === "stale" &&
      cacheLookup.entry.marketValue > 0
    ) {
      return {
        marketValue: cacheLookup.entry.marketValue,
        comparableCount: cacheLookup.entry.comparableCount,
        comparableQuery: cacheLookup.entry.comparableQuery,
        source: "stale_cache",
      };
    }

    if (
      legacyCacheLookup?.status === "stale" &&
      legacyCacheLookup.entry.marketValue > 0
    ) {
      return {
        marketValue: legacyCacheLookup.entry.marketValue,
        comparableCount: legacyCacheLookup.entry.comparableCount,
        comparableQuery: legacyCacheLookup.entry.comparableQuery,
        source: "stale_cache",
      };
    }

    return {
      marketValue: 0,
      comparableCount: 0,
      comparableQuery,
      source: "unknown",
    };
  }

  const validResults = soldComps.filter(
    (result) => !shouldExcludeResult(result.title || "")
  );
  const prices = validResults
    .filter(
      (result) =>
        getSimilarity(candidate.title, result.title || "") >= 0.6
    )
    .filter((result) => {
      const comparableCondition = getConditionClass(
        `${result.title || ""} ${result.condition || ""}`
      );

      return comparableCondition === candidate.conditionClass;
    })
    .map((result) => getSoldCompTotalPrice(result))
    .filter((value) => value > 0);

  const marketValue = prices.length >= 3 ? getMedianPrice(prices) : 0;

  if (marketValue > 0) {
    await upsertMarketValue(supabase, {
      cacheKey,
      huntQuery: candidate.query,
      toyline: candidate.toyline,
      conditionClass: candidate.conditionClass,
      marketValue,
      comparableCount: prices.length,
      comparableQuery,
      source: "soldcomps",
      currency: DUTCH_DELIVERY_CURRENCY,
    });
  }

  return {
    marketValue,
    comparableCount: prices.length,
    comparableQuery,
    source: "soldcomps",
  };
}

function calculateFinalScore(
  candidate: CheapCandidate,
  costs: ItemCosts,
  market: MarketValueResult
): ScoredCandidate {
  let score = candidate.cheapScore;
  const reasons = [...candidate.cheapReasons];
  const estimatedMarketValue = Math.round(market.marketValue);
  const estimatedProfit = estimatedMarketValue - costs.totalCost;

  if (estimatedMarketValue > 0 && market.comparableCount > 0) {
    reasons.push(
      market.source === "cache"
        ? "Market value based on cached sold comps"
        : market.source === "stale_cache"
        ? "Market value based on stale cached sold comps"
        : `Market value based on ${market.comparableCount} sold comps`
    );
  }

  if (estimatedProfit >= 150) {
    score += 40;
    reasons.push("Exceptional profit");
  } else if (estimatedProfit >= 100) {
    score += 30;
    reasons.push("Strong estimated profit");
  } else if (estimatedProfit >= 50) {
    score += 20;
    reasons.push("Good profit");
  } else if (estimatedProfit >= 30) {
    score += 10;
    reasons.push("Possible profit");
  }

  const finalScore = Math.min(score, 100);
  let label = "Low Priority";

  if (finalScore >= 80) {
    label = "Jackpot";
  } else if (finalScore >= 55) {
    label = "Interesting";
  }

  return {
    price: costs.price,
    shipping: costs.shipping,
    importCharges: costs.importCharges,
    totalCost: costs.totalCost,
    currency: costs.currency,
    estimatedMarketValue,
    estimatedProfit,
    hiddenGemScore: finalScore,
    opportunityLabel: label,
    reasons,
  };
}

function selectTopCandidates(candidates: CheapCandidate[]) {
  const grouped = new Map<string, CheapCandidate[]>();

  for (const candidate of candidates) {
    const groupKey = `${candidate.profile.id}:${candidate.query}`;
    const group = grouped.get(groupKey) || [];
    group.push(candidate);
    grouped.set(groupKey, group);
  }

  const selected: CheapCandidate[] = [];

  for (const group of grouped.values()) {
    const sorted = [...group].sort((a, b) => b.cheapScore - a.cheapScore);
    const keepCount = Math.min(
      sorted.length,
      Math.min(8, Math.max(3, Math.ceil(sorted.length * 0.25)))
    );

    selected.push(...sorted.slice(0, keepCount));
  }

  return selected;
}

function buildSearchQueries(profile: HuntProfile) {
  const categories = profile.toy_categories || [];

  if (categories.length === 0) {
    return [];
  }

  return categories.map((category) => SEARCH_QUERIES[category] || category);
}

async function buildCheapCandidate(
  profile: HuntProfile,
  query: string,
  item: EbayItem
): Promise<CheapCandidate | null> {
  const title = item.title || "";

  if (!title || shouldExcludeResult(title)) {
    return null;
  }

  const itemUrl = item.itemWebUrl || null;

  if (itemUrl) {
    const { data: existing } = await supabase
      .from("hunt_results")
      .select("id")
      .eq("item_url", itemUrl)
      .limit(1);

    if (existing && existing.length > 0) {
      return null;
    }
  }

  const toyline = detectToyline(title) || detectToyline(query);

  if (isModernCandidate(title, toyline)) {
    return null;
  }

  const blockedKeywords = await getBlockedKeywords(toyline);
  const lowerTitle = title.toLowerCase();
  const matchedBlocked = blockedKeywords.filter((entry) =>
    lowerTitle.includes(entry.keyword.toLowerCase())
  );

  if (matchedBlocked.length > 0) {
    console.log({
      title,
      blocked: matchedBlocked,
    });
    return null;
  }

  const summaryCosts = getItemCosts(item);

  if (!summaryCosts) {
    return null;
  }

  const maxBudget = Number(profile.max_budget || 0);

  if (maxBudget > 0 && summaryCosts.totalCost > maxBudget) {
    return null;
  }

  const keywords = await getKeywordWeights(toyline);
  const conditionClass = getConditionClass(title);
  const marketCacheKey = buildItemIdentityKey({
    title,
    toyline,
    keywords,
    conditionClass,
  });
  const cheapScore = calculateCheapScore({
    item,
    query,
    toyline,
    keywords,
    costs: summaryCosts,
  });

  if (cheapScore.cheapScore + MAX_PROFIT_SCORE_BONUS < MINIMUM_QUALITY_SCORE) {
    return null;
  }

  return {
    profile,
    query,
    item,
    itemUrl,
    title,
    toyline,
    conditionClass,
    marketCacheKey,
    summaryCosts,
    cheapScore: cheapScore.cheapScore,
    cheapReasons: cheapScore.reasons,
  };
}

const SEARCH_QUERIES: Record<string, string> = {
  Transformers: '"Transformers G1" Takara Hasbro',
  "Transformers G1 / G2": '"Transformers G1" Takara Hasbro',
  "Power Rangers": '"Mighty Morphin Power Rangers" Bandai',
  Thundercats: "Thundercats LJN",
  "Dino Riders": '"Dino Riders" Tyco',
  "G.I. Joe / Action Force": '"G.I. Joe" Action Force Hasbro Palitoy',
  "M.A.S.K.": '"M.A.S.K." Kenner',
  "Masters of the Universe": '"Masters of the Universe" Mattel',
  "Star Wars 1977-1990": '"Star Wars" Kenner vintage',
  "The Real Ghostbusters": '"Real Ghostbusters" Kenner',
  TMNT: '"Teenage Mutant Ninja Turtles" Playmates',
  "A-Team": '"A-Team" Galoob',
  "Air Raiders": '"Air Raiders" Hasbro',
  "Army Ants": '"Army Ants" Hasbro',
  "Battle Beasts": '"Battle Beasts" Takara Hasbro',
  "Bionic Six": '"Bionic Six" LJN',
  Blackstar: "Blackstar Galoob",
  Boglins: "Boglins Mattel",
  Bravestarr: "Bravestarr Mattel",
  "Bucky O'Hare": "\"Bucky O'Hare\" Hasbro",
  "Captain Power": '"Captain Power" Mattel',
  Centurions: "Centurions Kenner",
  COPS: '"C.O.P.S." Kenner',
  "Crash Dummies": '"Crash Dummies" Tyco',
  "Defenders of the Earth": '"Defenders of the Earth" Galoob',
  Diaclone: "Diaclone Takara",
  "Dick Tracy": '"Dick Tracy" Playmates',
  "Exo Squad": '"Exo Squad" Playmates',
  "Food Fighters": '"Food Fighters" Mattel',
  "Galaxy Rangers": '"Galaxy Rangers" Galoob',
  Gargoyles: "Gargoyles Kenner",
  "Godzilla / Kaiju": "Godzilla Bandai",
  GoBots: "GoBots Tonka",
  "He-Man New Adventures": '"New Adventures of He-Man" Mattel',
  Inhumanoids: "Inhumanoids Hasbro",
  "Japanese Robots": "Popy Chogokin DX",
  Madballs: "Madballs AmToy",
  "Manta Force": '"Manta Force" Bluebird',
  "Mega Force": '"Mega Force" Kenner',
  Microman: "Microman Takara",
  "Mighty Max": '"Mighty Max" Bluebird',
  "Monster in My Pocket": '"Monster in My Pocket" Matchbox',
  "Police Academy": '"Police Academy" Kenner',
  Rambo: "Rambo Coleco",
  Robotech: "Robotech Matchbox",
  "Rock Lords": '"Rock Lords" Tonka',
  Sectaurs: "Sectaurs Coleco",
  Silverhawks: "Silverhawks Kenner",
  "Sky Commanders": '"Sky Commanders" Kenner',
  Starcom: "Starcom Coleco",
  "Super Naturals": '"Super Naturals" Tonka',
  "Tokusatsu / Sentai / Metal Heroes": '"Super Sentai" Bandai',
  "Toxic Crusaders": '"Toxic Crusaders" Playmates',
  Visionaries: "Visionaries Hasbro",
  Voltron: "Voltron Matchbox",
  "VR Troopers": '"VR Troopers" Bandai',
  "War Planets": '"War Planets" Trendmasters',
  "Wheeled Warriors": '"Jayce and the Wheeled Warriors"',
  Wildcats: "WildC.A.T.s Playmates",
  "X-Men 90s": '"X-Men" ToyBiz',
  Zoids: "Zoids Tomy",
};

const TOYLINE_ALIASES: Record<string, string[]> = {
  Transformers: ["transformers"],
  "Power Rangers": ["power rangers", "mighty morphin", "mmpr"],
  Thundercats: ["thundercats", "thunder cats"],
  "Dino Riders": ["dino riders", "dino-riders", "tyco"],
  "M.A.S.K.": ["m.a.s.k", "mask", "kenner mask"],
  "Masters of the Universe": [
    "masters of the universe",
    "motu",
    "he-man",
    "heman",
    "skeletor",
  ],
  "G.I. Joe / Action Force": ["g.i. joe", "gi joe", "action force", "cobra"],
  Silverhawks: ["silverhawks", "silver hawks"],
  "Bucky O'Hare": ["bucky o'hare", "bucky ohare"],
  Starcom: ["starcom"],
  Visionaries: ["visionaries"],
  Zoids: ["zoids"],
  Inhumanoids: ["inhumanoids"],
  Sectaurs: ["sectaurs"],
  GoBots: ["gobots"],
  Madballs: ["madballs"],
  "Toxic Crusaders": ["toxic crusaders"],
  "A-Team": ["a-team"],
  "Air Raiders": ["air raiders"],
  "Army Ants": ["army ants"],
  "Battle Beasts": ["battle beasts"],
  "Bionic Six": ["bionic six"],
  Blackstar: ["blackstar"],
  Boglins: ["boglins"],
  Bravestarr: ["bravestarr"],
  "Captain Power": ["captain power"],
  Centurions: ["centurions"],
  COPS: ["cops"],
  "Crash Dummies": ["crash dummies"],
  "Defenders of the Earth": ["defenders of the earth"],
  Diaclone: ["diaclone"],
  "Dick Tracy": ["dick tracy"],
  "Exo Squad": ["exo squad"],
  "Food Fighters": ["food fighters"],
  "Galaxy Rangers": ["galaxy rangers"],
  Gargoyles: ["gargoyles"],
  "Godzilla / Kaiju": ["godzilla", "kaiju"],
  "He-Man New Adventures": ["new adventures of he-man", "he-man"],
  "Japanese Robots": ["chogokin", "popy", "dx robot"],
  "Manta Force": ["manta force"],
  "Mega Force": ["mega force"],
  Microman: ["microman"],
  "Mighty Max": ["mighty max"],
  "Monster in My Pocket": ["monster in my pocket"],
  "Police Academy": ["police academy"],
  Rambo: ["rambo"],
  Robotech: ["robotech"],
  "Rock Lords": ["rock lords"],
  "Sky Commanders": ["sky commanders"],
  "Super Naturals": ["super naturals"],
  "Tokusatsu / Sentai / Metal Heroes": [
    "super sentai",
    "metal heroes",
    "tokusatsu",
  ],
  Voltron: ["voltron"],
  "VR Troopers": ["vr troopers"],
  "War Planets": ["war planets"],
  "Wheeled Warriors": ["wheeled warriors", "jayce"],
  Wildcats: ["wildcats"],
  "X-Men 90s": ["x-men"],
};

export async function POST() {
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("hunt_profiles")
      .select("*");

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hunt profiles found.",
        inserted: 0,
      });
    }

    const token = await getEbayToken();
    const candidates: CheapCandidate[] = [];
    const resultsToInsert = [];

    for (const profile of profiles as HuntProfile[]) {
      const queries = buildSearchQueries(profile);

      console.log({
        categories: profile.toy_categories,
        queries,
      });

      for (const query of queries) {
        const items = await searchEbay(
          query,
          token,
          getMarketplaceId(profile.platforms?.[0]),
          Number(profile.max_budget || 0)
        );

        console.log({
          query,
          resultCount: items.length,
          titles: items.slice(0, 10).map((item) => item.title),
        });

        for (const item of items) {
          const candidate = await buildCheapCandidate(profile, query, item);

          if (candidate) {
            candidates.push(candidate);
          }
        }
      }
    }

    const survivors = selectTopCandidates(candidates);

    for (const candidate of survivors) {
      let detail: EbayItem;

      try {
        detail = candidate.item.itemId
          ? await getEbayItemDetail(candidate.item.itemId, token)
          : candidate.item;
      } catch (error) {
        console.error("eBay item detail failed:", {
          title: candidate.title,
          itemId: candidate.item.itemId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }

      const finalCosts = getItemCosts({
        ...candidate.item,
        ...detail,
      });

      if (!finalCosts) {
        continue;
      }

      const maxBudget = Number(candidate.profile.max_budget || 0);

      if (maxBudget > 0 && finalCosts.totalCost > maxBudget) {
        continue;
      }

      const market = await getMarketValueForCandidate(candidate);
      const scored = calculateFinalScore(candidate, finalCosts, market);

      if (scored.hiddenGemScore < MINIMUM_QUALITY_SCORE) {
        continue;
      }

      resultsToInsert.push({
        user_id: candidate.profile.user_id,
        hunt_profile_id: candidate.profile.id,

        platform: candidate.profile.platforms?.[0] || "eBay.nl",
        query: candidate.query,

        title: candidate.item.title || "Unknown item",

        price: scored.price,
        shipping: scored.shipping + scored.importCharges,
        total_cost: scored.totalCost,

        market_value: scored.estimatedMarketValue,
        potential_profit: scored.estimatedProfit,

        currency: scored.currency,

        item_url: candidate.item.itemWebUrl || null,
        image_url: candidate.item.image?.imageUrl || null,

        seller_name: candidate.item.seller?.username || null,
        seller_score: null,

        hidden_gem_score: scored.hiddenGemScore,
        opportunity_label: scored.opportunityLabel,
        reasons: scored.reasons,

        status: "active",

        found_at: new Date().toISOString(),
        created_at: new Date().toISOString(),

        visual_identification: "",
        visual_confidence: 0,

        title_description_match: true,
        mismatch_detected: false,
        mismatch_reason: "",

        reference_toy_id: null,
      });
    }

    resultsToInsert.sort(
      (a, b) => b.hidden_gem_score - a.hidden_gem_score
    );
    resultsToInsert.splice(200);

    let inserted = 0;

    if (resultsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("hunt_results")
        .insert(resultsToInsert);

      if (insertError) {
        throw new Error(insertError.message);
      }

      inserted = resultsToInsert.length;
    }

    return NextResponse.json({
      success: true,
      message: "Daily Hunt Engine completed.",
      inserted,
    });
  } catch (error) {
    console.error("Daily Hunt Engine error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

type EbayItem = {
  itemId?: string;
  title?: string;
  price?: {
    value?: string;
    currency?: string;
  };
  shippingOptions?: {
    shippingCost?: {
      value?: string;
      currency?: string;
    };
  }[];
  condition?: string;
  image?: {
    imageUrl?: string;
  };
  itemWebUrl?: string;
  seller?: {
    username?: string;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ebayClientId = process.env.EBAY_CLIENT_ID!;
const ebayClientSecret = process.env.EBAY_CLIENT_SECRET!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function searchEbay(query: string, token: string, maxPrice?: number | null) {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sort: "newlyListed",
  });

  if (maxPrice && maxPrice > 0) {
    params.set("filter", `price:[0..${maxPrice}],priceCurrency:USD`);
  }

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
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

function scoreItem(item: EbayItem, query: string) {
  const title = item.title || "";
  const lowerTitle = title.toLowerCase();

  const price = Number(item.price?.value || 0);
  const shipping = Number(item.shippingOptions?.[0]?.shippingCost?.value || 0);
  const totalCost = price + shipping;

  let score = 0;
  const reasons: string[] = [];

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
  ];

  const weakSellerSignals = [
    "old toy",
    "action figure",
    "figure lot",
    "toy lot",
    "unknown",
    "mixed lot",
    "parts",
    "vintage figure",
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

  if (price > 0 && price <= 25) {
    score += 20;
    reasons.push("Low asking price");
  } else if (price <= 50) {
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

  const estimatedMarketValue = Math.round(totalCost * 1.8);
  const estimatedProfit = estimatedMarketValue - totalCost;

  if (estimatedProfit >= 50) {
    score += 20;
    reasons.push("Strong estimated profit");
  } else if (estimatedProfit >= 25) {
    score += 10;
    reasons.push("Possible profit");
  }

  const finalScore = Math.min(score, 100);

  let label = "Low Priority";
  if (finalScore >= 80) label = "Jackpot";
  else if (finalScore >= 55) label = "Interesting";

  return {
    price,
    shipping,
    totalCost,
    estimatedMarketValue,
    estimatedProfit,
    hiddenGemScore: finalScore,
    opportunityLabel: label,
    reasons,
  };
}

function buildSearchQueries(profile: HuntProfile) {
  const categories = profile.toy_categories || [];

  if (categories.length === 0) {
    return ["Transformers G1", "M.A.S.K. vintage", "Power Rangers vintage"];
  }

  return categories.slice(0, 5);
}

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

    let inserted = 0;
    const resultsToInsert = [];

    for (const profile of profiles as HuntProfile[]) {
      const queries = buildSearchQueries(profile);

      for (const query of queries) {
        const items = await searchEbay(
  query,
  token,
  Number(profile.max_budget || 0)
);

        for (const item of items as EbayItem[]) {
  const scored = scoreItem(item, query);

  // Respect hunt budget
  const maxBudget = Number(
  profile.max_budget || 0
);

if (
  maxBudget > 0 &&
  scored.totalCost > maxBudget
) {
  continue;
}

const minimumProfit = Number(
  profile.minimum_profit || 0
);

if (
  scored.estimatedProfit < minimumProfit
) {
  continue;
}

  // Minimum quality score
  if (scored.hiddenGemScore < 55) {
    continue;
  }
const itemUrl = item.itemWebUrl || null;

if (itemUrl) {
  const { data: existing } = await supabase
    .from("hunt_results")
    .select("id")
    .eq("item_url", itemUrl)
    .limit(1);

  if (existing && existing.length > 0) {
    continue;
  }
}
          resultsToInsert.push({
  user_id: profile.user_id,
  hunt_profile_id: profile.id,

  platform: "eBay",
  query: query,

  title: item.title || "Unknown item",

  price: scored.price,
  shipping: scored.shipping,
  total_cost: scored.totalCost,

  market_value: scored.estimatedMarketValue,
  potential_profit: scored.estimatedProfit,

  currency: item.price?.currency || "USD",

  item_url: item.itemWebUrl || null,
  image_url: item.image?.imageUrl || null,

  seller_name: item.seller?.username || null,
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
      }
    }

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
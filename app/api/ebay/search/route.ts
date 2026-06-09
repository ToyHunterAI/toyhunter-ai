import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID!;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET!;

async function getEbayToken() {
  const credentials = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

function numberValue(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function shippingCost(item: any) {
  return numberValue(item.shippingOptions?.[0]?.shippingCost?.value);
}

function median(values: number[]) {
  const clean = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!clean.length) return 0;

  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function cleanTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(title: string) {
  return cleanTitle(title)
    .split(" ")
    .filter((word) => word.length > 2)
    .filter(
      (word) =>
        ![
          "the",
          "and",
          "with",
          "for",
          "from",
          "vintage",
          "rare",
          "used",
          "toy",
          "figure",
          "complete",
          "loose",
          "original",
          "new",
        ].includes(word)
    );
}

function similarity(a: string, b: string) {
  const wordsA = new Set(getWords(a));
  const wordsB = new Set(getWords(b));

  if (!wordsA.size || !wordsB.size) return 0;

  let matches = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) matches++;
  });

  return matches / Math.max(wordsA.size, wordsB.size);
}

function hasVintageSignal(title: string) {
  const lowerTitle = title.toLowerCase();

  return (
    lowerTitle.includes("vintage") ||
    lowerTitle.includes("1984") ||
    lowerTitle.includes("1985") ||
    lowerTitle.includes("1986") ||
    lowerTitle.includes("1987") ||
    lowerTitle.includes("1988") ||
    lowerTitle.includes("1989") ||
    lowerTitle.includes("hasbro") ||
    lowerTitle.includes("takara")
  );
}

function isModernOrReissue(title: string) {
  const lowerTitle = title.toLowerCase();

  const badSignals = [
    "reissue",
    "re-issue",
    "reisue",
    "repro",
    "reproduction",
    "new in box",
    "new box",
    "new",
    "k.o",
    "k.o.",
    "ko version",
    "knockoff",
    "knock off",
    "transforming toy",
    "super warrior",
    "multiforce",
    "gift toys",
  ];

  const hasGoodVintageSignal = hasVintageSignal(title);

  if (lowerTitle.includes("new") && !hasGoodVintageSignal) {
    return true;
  }

  return badSignals.some((signal) => lowerTitle.includes(signal));
}

function isBadSeller(seller: string) {
  const lowerSeller = seller.toLowerCase();

  const badSellers = ["super-fast-shipping-center"];

  return badSellers.some((badSeller) => lowerSeller.includes(badSeller));
}

async function searchEbay(query: string, token: string, limit = 50) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");

  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=US,zip=10001",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search error: ${text}`);
  }

  const data = await res.json();
  return data.itemSummaries || [];
}

function makeComparableQuery(title: string) {
  return getWords(title).slice(0, 5).join(" ");
}

async function getMarketValueForItem(item: any, token: string) {
  const title = item.title || "";
  const query = makeComparableQuery(title);

  if (!query) {
    return {
      marketValue: 0,
      comparableCount: 0,
      comparableQuery: "",
    };
  }

  const results = await searchEbay(query, token, 30);

  const comparablePrices = results
    .filter((result: any) => !isModernOrReissue(result.title || ""))
    .filter((result: any) => !isBadSeller(result.seller?.username || ""))
    .filter((result: any) => similarity(title, result.title || "") >= 0.45)
    .map((result: any) => {
      const price = numberValue(result.price?.value);
      const shipping = shippingCost(result);
      return price + shipping;
    })
    .filter((value: number) => value > 0);

  return {
    marketValue: Math.round(median(comparablePrices)),
    comparableCount: comparablePrices.length,
    comparableQuery: query,
  };
}

function hiddenGemScore({
  totalCost,
  marketValue,
  comparableCount,
  title,
}: {
  totalCost: number;
  marketValue: number;
  comparableCount: number;
  title: string;
}) {
  if (!marketValue || !totalCost) return 0;

  const profit = marketValue - totalCost;

  if (profit <= 0) return 0;

  let score = 0;

  if (profit >= 20) score += 20;
  if (profit >= 50) score += 25;
  if (profit >= 100) score += 30;

  const profitPercentage = profit / totalCost;

  if (profitPercentage >= 0.25) score += 10;
  if (profitPercentage >= 0.5) score += 15;
  if (profitPercentage >= 1) score += 20;

  if (comparableCount >= 3) score += 10;
  if (comparableCount >= 6) score += 10;

  const lower = title.toLowerCase();

  if (lower.includes("vintage")) score += 10;
  if (lower.includes("1984")) score += 8;
  if (lower.includes("1985")) score += 8;
  if (lower.includes("1986")) score += 8;
  if (lower.includes("1987")) score += 6;
  if (lower.includes("hasbro")) score += 8;
  if (lower.includes("takara")) score += 8;
  if (lower.includes("g1")) score += 5;
  if (lower.includes("complete")) score += 5;
  if (lower.includes("box")) score += 4;
  if (lower.includes("used")) score += 3;

  if (isModernOrReissue(title)) score -= 100;

  return Math.max(0, Math.min(100, score));
}

function labelFromProfitAndScore({
  profit,
  score,
  comparableCount,
}: {
  profit: number;
  score: number;
  comparableCount: number;
}) {
  if (profit >= 100 && score >= 85 && comparableCount >= 3) {
    return "Jackpot";
  }

  if (profit >= 50 && score >= 70 && comparableCount >= 3) {
    return "Strong Opportunity";
  }

  if (profit >= 20 && score >= 45 && comparableCount >= 2) {
    return "Interesting";
  }

  return "Low Priority";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "Transformers G1";

    const token = await getEbayToken();
    const items = await searchEbay(query, token, 50);

    const enrichedRaw = await Promise.all(
      items.slice(0, 50).map(async (item: any) => {
        const title = item.title || "Unknown item";
        const seller = item.seller?.username || "Unknown";

        if (isModernOrReissue(title)) {
          return null;
        }

        if (isBadSeller(seller)) {
          return null;
        }

        const priceValue = numberValue(item.price?.value);
        const shipping = shippingCost(item);
        const totalCost = priceValue + shipping;

        const market = await getMarketValueForItem(item, token);
        const potentialProfit = market.marketValue - totalCost;

        const score = hiddenGemScore({
          totalCost,
          marketValue: market.marketValue,
          comparableCount: market.comparableCount,
          title,
        });

        const roundedProfit = Math.round(potentialProfit);

        return {
          title,
          price: `${priceValue.toFixed(2)} ${item.price?.currency || "USD"}`,
          priceValue,
          shipping,
          totalCost: Number(totalCost.toFixed(2)),
          condition: item.condition || "Unknown",
          image: item.image?.imageUrl || null,
          itemUrl: item.itemWebUrl || null,
          seller,

          marketValue: market.marketValue,
          comparableCount: market.comparableCount,
          comparableQuery: market.comparableQuery,
          potentialProfit: roundedProfit,

          hiddenGemScore: score,
          opportunityLabel: labelFromProfitAndScore({
            profit: roundedProfit,
            score,
            comparableCount: market.comparableCount,
          }),

          reasons: [
            `Market value based on ${market.comparableCount} comparable active listings`,
            `Total cost incl. shipping: ${totalCost.toFixed(2)}`,
            `Estimated profit: ${roundedProfit}`,
          ],
        };
      })
    );

    const enriched = enrichedRaw.filter(Boolean);

    const opportunities = enriched
      .filter((item: any) => item.marketValue > 0)
      .filter((item: any) => item.potentialProfit > 0)
      .filter((item: any) => item.opportunityLabel !== "Low Priority")
      .sort((a: any, b: any) => b.hiddenGemScore - a.hiddenGemScore);

    return NextResponse.json({
      success: true,
      query,
      total: items.length,
      scanned: enriched.length,
      opportunitiesFound: opportunities.length,
      opportunities,
      allResults: enriched,
      engine: "Sold Price Engine v2.4 - Realistic Profit Labels",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
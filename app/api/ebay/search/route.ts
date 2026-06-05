import { NextResponse } from "next/server";

type EbayItem = {
  title?: string;
  price?: {
    value?: string;
    currency?: string;
  };
  condition?: string;
  image?: {
    imageUrl?: string;
  };
  itemWebUrl?: string;
  seller?: {
    username?: string;
  };
};

type MarketValueEstimate = {
  estimatedMarketValue: number;
  marketConfidence: number;
  valueGap: number;
  marketValueSource: string;
};

function estimateMarketValuePlaceholder(
  item: EbayItem,
  query: string
): MarketValueEstimate {
  const title = item.title?.toLowerCase() || "";
  const priceValue = Number(item.price?.value || 0);

  let estimatedMarketValue = 0;
  let marketConfidence = 0;
  let marketValueSource = "Not available yet";

  /*
    FUTURE MARKET VALUE ENGINE

    Later vullen we dit met:
    - eBay sold/completed data
    - Terapeak data als mogelijk
    - WorthPoint of andere historische bronnen
    - eigen database met eerdere analyses

    Voor nu geven we alleen een veilige placeholder terug,
    zodat de rest van ToyHunter al klaar is voor marktwaarde.
  */

  if (priceValue > 0 && title.includes("diaclone")) {
    estimatedMarketValue = 0;
    marketConfidence = 0;
    marketValueSource = "Future sold-data lookup needed";
  }

  if (priceValue > 0 && title.includes("g1")) {
    estimatedMarketValue = 0;
    marketConfidence = 0;
    marketValueSource = "Future sold-data lookup needed";
  }

  const valueGap =
    estimatedMarketValue > 0
      ? Math.round(((estimatedMarketValue - priceValue) / estimatedMarketValue) * 100)
      : 0;

  return {
    estimatedMarketValue,
    marketConfidence,
    valueGap,
    marketValueSource,
  };
}

function calculateHiddenGemScore(item: EbayItem, query: string) {
  let score = 35;
  const reasons: string[] = [];
  const risks: string[] = [];

  const title = item.title?.toLowerCase() || "";
  const priceValue = Number(item.price?.value || 0);
  const queryMainWord = query.toLowerCase().split(" ")[0];

  const marketValue = estimateMarketValuePlaceholder(item, query);

  const strongVintageWords = [
    "g1",
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
    "vintage",
    "kenner",
    "takara",
    "hasbro",
    "mattel",
    "bandai",
    "tomy",
  ];

  const hiddenGemWords = [
    "lot",
    "mixed",
    "bundle",
    "job lot",
    "old toys",
    "toy lot",
    "action figure lot",
    "unknown",
    "unbranded",
  ];

  const valueWords = [
    "complete",
    "boxed",
    "box",
    "instructions",
    "manual",
    "accessories",
    "rare",
    "working",
  ];

  const partWords = [
    "gun",
    "cannon",
    "missile",
    "weapon",
    "weapons",
    "accessory",
    "accessories",
    "part",
    "parts",
    "door",
    "wheel",
    "sticker",
    "label",
  ];

  const modernRiskWords = [
    "reissue",
    "re-issue",
    "remake",
    "replica",
    "custom",
    "ko",
    "bootleg",
    "3d printed",
    "replacement",
    "upgrade kit",
    "studio series",
    "legacy",
    "earthrise",
    "kingdom",
    "siege",
    "third party",
  ];

  if (strongVintageWords.some((word) => title.includes(word))) {
    score += 18;
    reasons.push("Strong vintage signal");
  }

  if (hiddenGemWords.some((word) => title.includes(word))) {
    score += 20;
    reasons.push("Generic or mixed listing may hide value");
  }

  if (valueWords.some((word) => title.includes(word))) {
    score += 10;
    reasons.push("Mentions completeness, box, accessories or rarity");
  }

  if (priceValue > 0 && priceValue < 20) {
    score += 18;
    reasons.push("Low asking price");
  } else if (priceValue >= 20 && priceValue < 50) {
    score += 8;
    reasons.push("Moderate asking price");
  } else if (priceValue >= 100) {
    score -= 15;
    risks.push("High asking price");
  }

  if (marketValue.estimatedMarketValue > 0) {
    if (marketValue.valueGap >= 50) {
      score += 25;
      reasons.push("Large discount compared to estimated market value");
    } else if (marketValue.valueGap >= 25) {
      score += 15;
      reasons.push("Priced below estimated market value");
    } else if (marketValue.valueGap <= -10) {
      score -= 15;
      risks.push("Price appears above estimated market value");
    }
  } else {
    risks.push("Market value not checked yet");
  }

  if (partWords.some((word) => title.includes(word))) {
    score -= 18;
    risks.push("May be only a loose part or accessory");
  }

  if (modernRiskWords.some((word) => title.includes(word))) {
    score -= 35;
    risks.push("Possible modern, reissue, custom, replica or replacement item");
  }

  if (!item.image?.imageUrl) {
    score -= 10;
    risks.push("No image available");
  }

  if (!item.condition || item.condition === "Unknown") {
    score -= 5;
    risks.push("Condition unknown");
  }

  if (!title.includes(queryMainWord)) {
    score += 10;
    reasons.push("Loose match may indicate miscategorized opportunity");
  }

  score = Math.max(0, Math.min(100, score));

  let label = "Ignore";

  if (score >= 90) {
    label = "Jackpot";
  } else if (score >= 82) {
    label = "Strong Opportunity";
  } else if (score >= 75) {
    label = "Interesting Find";
  }

  return {
    score,
    label,
    reasons,
    risks,
    estimatedMarketValue: marketValue.estimatedMarketValue,
    marketConfidence: marketValue.marketConfidence,
    valueGap: marketValue.valueGap,
    marketValueSource: marketValue.marketValueSource,
  };
}

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token as string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "Transformers G1";
    const limit = searchParams.get("limit") || "50";

    const accessToken = await getEbayAccessToken();

    const ebayUrl = new URL(
      "https://api.ebay.com/buy/browse/v1/item_summary/search"
    );

    ebayUrl.searchParams.set("q", query);
    ebayUrl.searchParams.set("limit", limit);
    ebayUrl.searchParams.set("sort", "newlyListed");

    const response = await fetch(ebayUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: data,
        },
        { status: response.status }
      );
    }

    const items =
      data.itemSummaries?.map((item: EbayItem) => {
        const gem = calculateHiddenGemScore(item, query);

        return {
          title: item.title || "Unknown title",
          price: item.price
            ? `${item.price.value} ${item.price.currency}`
            : "Unknown",
          priceValue: Number(item.price?.value || 0),
          condition: item.condition || "Unknown",
          image: item.image?.imageUrl || null,
          itemUrl: item.itemWebUrl,
          seller: item.seller?.username || "Unknown",

          hiddenGemScore: gem.score,
          opportunityLabel: gem.label,
          reasons: gem.reasons,
          risks: gem.risks,

          estimatedMarketValue: gem.estimatedMarketValue,
          marketConfidence: gem.marketConfidence,
          valueGap: gem.valueGap,
          marketValueSource: gem.marketValueSource,
        };
      }) || [];

    const opportunities = items
      .filter((item: any) => item.hiddenGemScore >= 75)
      .sort((a: any, b: any) => b.hiddenGemScore - a.hiddenGemScore)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      query,
      total: data.total || 0,
      scanned: items.length,
      opportunitiesFound: opportunities.length,
      opportunities,
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
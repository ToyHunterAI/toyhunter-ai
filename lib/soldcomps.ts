const SOLDCOMPS_API_KEY = process.env.SOLDCOMPS_API_KEY!;

export type SoldCompItem = {
  itemId: string;
  title: string;
  soldPrice: string;
  shippingPrice: string | null;
  totalPrice: string;
  condition: string;
  conditionId: number;
  endedAt: string;
  sellerUsername: string;
  sellerPositivePercent: number;
  sellerFeedbackScore: number;
  buyingFormat: string;
  bestOfferAccepted: boolean;
  thumbnailUrl: string;
  fullResThumbnailUrl: string;
  url: string;
};

export async function getSoldCompsListings(
  keyword: string,
  count = 100,
  timeoutMs = 10000
): Promise<SoldCompItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response: Response;

  try {
    response = await fetch(
      `https://api.sold-comps.com/v1/scrape?keyword=${encodeURIComponent(
        keyword
      )}&count=${count}`,
      {
        headers: {
          Authorization: `Bearer ${SOLDCOMPS_API_KEY}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `SoldComps API error: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();

  return data.items ?? [];
}

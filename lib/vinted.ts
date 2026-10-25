export type VintedListing = {
  source: "vinted";
  source_item_id: string;
  url: string;
  title: string;
  description: string | null;
  price_amount: number | null;
  currency: string | null;
  price_type: "fixed" | "unknown";
  condition: string | null;
  location_country: string | null;
  shipping_to_nl: boolean | null;
  photo_urls: string[];
  source_published_at: null;
  uploaded_ago: string | null;
  first_seen_at: string;
  last_seen_at: string;
  source_status: "observed";
  rights_profile: "evaluation_only";
  query: string | null;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeVinted(raw: unknown, seenAt: string): VintedListing | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = text(x.id) ?? (typeof x.id === "number" ? String(x.id) : null);
  const url = text(x.url);
  const title = text(x.title);
  if (!id || !url || !title || !/^https:\/\/(?:www\.)?vinted\.[a-z.]+\/items\//i.test(url)) return null;
  const price = typeof x.price === "number" ? x.price :
    typeof x.price === "string" && x.price.trim() ? Number(x.price.replace(",", ".")) : NaN;
  const photos = Array.isArray(x.photoUrls) ? x.photoUrls.filter((p): p is string => typeof p === "string" && /^https:\/\//.test(p)) : [];
  const main = text(x.photoUrl);
  if (main?.startsWith("https://") && !photos.includes(main)) photos.unshift(main);
  return {
    source: "vinted", source_item_id: id, url, title,
    description: text(x.description),
    price_amount: Number.isFinite(price) && price >= 0 ? price : null,
    currency: text(x.currency), price_type: "unknown",
    condition: text(x.condition), location_country: text(x.country),
    shipping_to_nl: null, photo_urls: photos,
    source_published_at: null, uploaded_ago: text(x.uploadedAgo),
    first_seen_at: seenAt, last_seen_at: seenAt,
    source_status: "observed", rights_profile: "evaluation_only",
    query: text(x.query),
  };
}

export function normalizeVintedDataset(items: unknown[], seenAt = new Date().toISOString()) {
  const unique = new Map<string, VintedListing>();
  for (const raw of items) {
    const listing = normalizeVinted(raw, seenAt);
    if (listing) unique.set(`vinted:${listing.source_item_id}`, listing);
  }
  return Array.from(unique.values());
}

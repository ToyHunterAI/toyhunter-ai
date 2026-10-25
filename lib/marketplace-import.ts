export const MARKETPLACES = ["marktplaats","2dehands","etsy","facebook","kleinanzeigen","leboncoin"] as const;
export type Marketplace = typeof MARKETPLACES[number];
export type ImportedListing = {
  source: Marketplace; source_item_id: string; url: string; title: string;
  description: string | null; price_amount: number | null; currency: string;
  condition: string | null; seller_location: string | null;
  shipping_to_nl: null; shipping_notice: string; photo_urls: string[];
  query: string | null; first_seen_at: string; rights_profile: "evaluation_only";
};
const notice = "Let op: Het is niet bevestigd dat dit artikel naar Nederland verzonden kan worden. Neem contact op met de verkoper.";
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : null;
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const first = (...values: unknown[]) => values.map(str).find(Boolean) ?? null;
const number = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : null;
  if (typeof v !== "string") return null;
  const n = Number(v.replace(/[€$£\s]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const photos = (...values: unknown[]): string[] => {
  const result: string[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (typeof v === "string") {
      const u = v.startsWith("//") ? `https:${v}` : v;
      if (/^https:\/\//.test(u) && !result.includes(u)) result.push(u);
    } else if (v && typeof v === "object") {
      const o = obj(v);
      if (o.url || o.photo_image_url || o.thumb_url) visit(o.url ?? o.photo_image_url ?? o.thumb_url);
      else if (o.urls) visit(o.urls);
    }
  };
  values.forEach(visit);
  return result.slice(0, 30);
};
const allowedHosts: Record<Marketplace, RegExp> = {
  marktplaats: /(^|\.)marktplaats\.nl$/i,
  "2dehands": /(^|\.)2dehands\.be$/i,
  etsy: /(^|\.)etsy\.com$/i,
  facebook: /(^|\.)facebook\.com$/i,
  kleinanzeigen: /(^|\.)kleinanzeigen\.de$/i,
  leboncoin: /(^|\.)leboncoin\.fr$/i,
};
export function normalizeMarketplace(raw: unknown, platform: Marketplace, now: string): ImportedListing | null {
  const x = obj(raw), lp = obj(x.listing_price), loc = obj(x.location), img = obj(x.images);
  const id = first(x.itemId, x.listingId, x.listing_id, x.id, x.list_id);
  const url = first(x.listingUrl, x.url, x.vipUrl, x.link);
  const title = first(x.title, x.subject, x.marketplace_listing_title);
  if (!id || !url || !title) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !allowedHosts[platform].test(parsed.hostname)) return null;
  } catch { return null; }
  let price = number(x.price);
  if (Array.isArray(x.price)) price = number(x.price[0]);
  if (platform === "marktplaats") price = number(x.priceInfo_priceCents) === null ? price : number(x.priceInfo_priceCents)! / 100;
  if (platform === "2dehands") price = number(x.priceCents) === null ? price : number(x.priceCents)! / 100;
  if (platform === "facebook") price = number(lp.amount_with_offset) ?? number(lp.amount) ?? price;
  if (platform === "leboncoin") price = number(x.price_cents) === null ? price : number(x.price_cents)! / 100;
  const images = photos(x.imageUrls, x.imagesUrls, x.photoUrls, x.images, x.image, x.picture, x.primary_listing_photo, x.primaryImage, x.imageUrl);
  if (platform === "leboncoin") images.push(...photos(img.urls, img.thumb_url).filter(u => !images.includes(u)));
  return {
    source: platform, source_item_id: id, url, title,
    description: first(x.description, x.categorySpecificDescription, x.body, x.marketplace_listing_description),
    price_amount: price, currency: first(x.currency, x.price_currency) ?? "EUR",
    condition: first(x.condition, obj(x.attributes).condition),
    seller_location: first(x.location_cityName, x.city, x.location, loc.city, x.location_countryName),
    shipping_to_nl: null, shipping_notice: notice, photo_urls: images,
    query: first(x.search_term, x.searchQuery, x.search_query), first_seen_at: now,
    rights_profile: "evaluation_only",
  };
}
export function normalizeMarketplaceDataset(items: unknown[], platform: Marketplace, now = new Date().toISOString()) {
  const unique = new Map<string, ImportedListing>();
  for (const item of items) {
    const parsed = normalizeMarketplace(item, platform, now);
    if (parsed) unique.set(parsed.source_item_id, parsed);
  }
  return [...unique.values()];
}

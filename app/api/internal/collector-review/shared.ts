import { NextResponse } from "next/server";

export function isInternalRequestAuthorized(request: Request) {
  const expectedToken =
    process.env.COLLECTOR_REVIEW_INTERNAL_TOKEN ||
    process.env.COLLECTOR_APPROVAL_INTERNAL_TOKEN ||
    process.env.COLLECTOR_BUILDER_INTERNAL_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return request.headers.get("x-toyhunter-internal-token") === expectedToken;
}

export function unauthorizedInternalResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized internal Collector Review request.",
    },
    { status: 401 }
  );
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getSuggestionProposal(suggestion: {
  evidence?: unknown;
  suggested_entity_payload?: unknown;
}) {
  const evidence = asRecord(suggestion.evidence);
  return {
    ...asRecord(suggestion.suggested_entity_payload),
    ...asRecord(evidence.proposal),
  };
}

export function getSuggestionListing(suggestion: { evidence?: unknown }) {
  return asRecord(asRecord(suggestion.evidence).listing);
}

export function getSuggestionMatchStatus(suggestion: { evidence?: unknown }) {
  const evidence = asRecord(suggestion.evidence);
  return stringValue(evidence.match_status) || "unknown";
}

export function getSuggestionProposalType(suggestion: {
  evidence?: unknown;
  suggested_trait_name?: string | null;
}) {
  return (
    stringValue(suggestion.suggested_trait_name) ||
    stringValue(asRecord(suggestion.evidence).suggestion_type) ||
    "collector_suggestion"
  );
}

export function getImageUrls(suggestion: { evidence?: unknown }) {
  const listing = getSuggestionListing(suggestion);
  const proposal = getSuggestionProposal(suggestion);
  const images = [
    ...asArray(listing.imageUrls),
    ...asArray(listing.images),
    ...asArray(proposal.imageUrls),
    ...asArray(asRecord(proposal.evidence_summary).images).map((image) =>
      asRecord(image).url
    ),
  ]
    .map(stringValue)
    .filter((url): url is string => Boolean(url));

  return [...new Set(images)];
}

export function confidenceGroup(confidence: number) {
  if (confidence >= 0.95) {
    return "high";
  }

  if (confidence >= 0.8) {
    return "medium";
  }

  return "low";
}

export function normalizeSuggestionSummary(suggestion: any, populationJob?: any) {
  const proposal = getSuggestionProposal(suggestion);
  const listing = getSuggestionListing(suggestion);
  const confidence = numberValue(suggestion.confidence) ?? 0;
  const proposalConfidence = asRecord(proposal.confidence);
  const identityConfidence = numberValue(proposalConfidence.identity) ?? confidence;
  const imageUrls = getImageUrls(suggestion);

  return {
    id: suggestion.id as string,
    status: suggestion.status as string,
    source: suggestion.source as string,
    confidence,
    confidenceGroup: confidenceGroup(confidence),
    identityConfidence,
    createdAt: suggestion.created_at as string,
    updatedAt: suggestion.updated_at as string,
    reviewedAt: suggestion.reviewed_at as string | null,
    proposalType: getSuggestionProposalType(suggestion),
    matchStatus: getSuggestionMatchStatus(suggestion),
    hasImage: imageUrls.length > 0,
    thumbnailUrl: imageUrls[0] || null,
    toyline:
      stringValue(proposal.toyline) ||
      stringValue(listing.toyline) ||
      "Unknown",
    itemName:
      stringValue(proposal.item_name) ||
      stringValue(proposal.name) ||
      stringValue(listing.title) ||
      "Unknown proposal",
    itemType: stringValue(proposal.item_type) || "unknown",
    manufacturer:
      stringValue(proposal.manufacturer) ||
      stringValue(listing.manufacturer) ||
      null,
    releaseYear: numberValue(proposal.release_year),
    sourceListingTitle: stringValue(listing.title),
    sourceListingUrl:
      stringValue(listing.listingUrl) ||
      stringValue(listing.itemUrl) ||
      stringValue(listing.item_url) ||
      stringValue(listing.url),
    populationJobId: stringValue(populationJob?.id),
    populationRunQuery: stringValue(populationJob?.search_query),
    populationRunCreatedAt: stringValue(populationJob?.created_at),
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTOR_RELATIONSHIP_TYPES,
  normalizeCollectorText,
  type CollectorGraphEntityMatch,
  type CollectorGraphRelationshipEvidence,
  type CollectorItem,
  type CollectorItemRelationship,
  type CollectorRelationshipReviewStatus,
  type CollectorRelationshipType,
} from "@/lib/collector-knowledge";

export type CollectorRelationshipDirection = "outgoing" | "incoming" | "both";

export type CollectorRelationshipQuery = {
  itemId: string;
  direction?: CollectorRelationshipDirection;
  relationshipTypes?: CollectorRelationshipType[];
  reviewStatus?: CollectorRelationshipReviewStatus | "any";
  includeSuggested?: boolean;
};

export type CollectorObservedObjectForGraph = {
  label: string;
  category?: string | null;
  color?: string | null;
  notes?: string | null;
  confidence?: number | null;
};

export type RankedCollectorEntityMatch = CollectorGraphEntityMatch & {
  aliases: string[];
  traits: string[];
};

export type CollectorGraphEvidenceResult = {
  known: CollectorGraphRelationshipEvidence[];
  likely: CollectorGraphRelationshipEvidence[];
  unknown: CollectorObservedObjectForGraph[];
};

const PART_OR_ACCESSORY_RELATIONSHIP_TYPES: CollectorRelationshipType[] = [
  "includes",
  "required_for_complete",
  "optional_accessory_for",
  "weapon_for",
  "used_by",
  "packaged_with",
  "compatible_with",
];

const PARENT_DISCOVERY_RELATIONSHIP_TYPES: CollectorRelationshipType[] = [
  "includes",
  "required_for_complete",
  "optional_accessory_for",
  "weapon_for",
  "rider_for",
  "driver_for",
  "box_for",
  "instruction_for",
  "sticker_for",
  "packaged_with",
  "belongs_to",
  "part_of_lot",
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function tokenOverlapScore(left: string, right: string) {
  const leftTokens = new Set(normalizeCollectorText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeCollectorText(right).split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function relationshipSelect() {
  return `
    id,
    source_item_id,
    target_item_id,
    relationship_type,
    confidence,
    source,
    review_status,
    required_for_complete,
    value_impact_level,
    quantity,
    valid_region,
    valid_year_start,
    valid_year_end,
    notes,
    evidence,
    created_at,
    updated_at
  `;
}

export async function fetchCollectorRelationships(
  supabase: SupabaseClient,
  query: CollectorRelationshipQuery
) {
  const direction = query.direction || "both";
  const reviewStatus =
    query.reviewStatus || (query.includeSuggested ? "any" : "approved");
  const relationshipTypes = query.relationshipTypes?.filter((type) =>
    COLLECTOR_RELATIONSHIP_TYPES.includes(type)
  );
  const requests = [];

  if (direction === "outgoing" || direction === "both") {
    let outgoing = supabase
      .from("collector_item_relationships")
      .select(relationshipSelect())
      .eq("source_item_id", query.itemId);

    if (relationshipTypes?.length) {
      outgoing = outgoing.in("relationship_type", relationshipTypes);
    }

    if (reviewStatus !== "any") {
      outgoing = outgoing.eq("review_status", reviewStatus);
    }

    requests.push(outgoing);
  }

  if (direction === "incoming" || direction === "both") {
    let incoming = supabase
      .from("collector_item_relationships")
      .select(relationshipSelect())
      .eq("target_item_id", query.itemId);

    if (relationshipTypes?.length) {
      incoming = incoming.in("relationship_type", relationshipTypes);
    }

    if (reviewStatus !== "any") {
      incoming = incoming.eq("review_status", reviewStatus);
    }

    requests.push(incoming);
  }

  const results = await Promise.all(requests);
  const relationships: CollectorItemRelationship[] = [];

  for (const result of results) {
    if (result.error) {
      throw result.error;
    }

    relationships.push(
      ...(((result.data || []) as unknown) as CollectorItemRelationship[])
    );
  }

  return relationships;
}

export async function findPartsAndAccessoriesLinkedToEntity(
  supabase: SupabaseClient,
  itemId: string
) {
  return fetchCollectorRelationships(supabase, {
    itemId,
    direction: "both",
    relationshipTypes: PART_OR_ACCESSORY_RELATIONSHIP_TYPES,
  });
}

export async function findPossibleParentItems(
  supabase: SupabaseClient,
  childItemId: string
) {
  return fetchCollectorRelationships(supabase, {
    itemId: childItemId,
    direction: "both",
    relationshipTypes: PARENT_DISCOVERY_RELATIONSHIP_TYPES,
  });
}

export async function findInverseRelationships(
  supabase: SupabaseClient,
  itemId: string,
  relationshipTypes?: CollectorRelationshipType[]
) {
  return fetchCollectorRelationships(supabase, {
    itemId,
    direction: "incoming",
    relationshipTypes,
  });
}

async function fetchCollectorItemsByIds(
  supabase: SupabaseClient,
  itemIds: string[]
) {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map<string, CollectorItem>();
  }

  const { data, error } = await supabase
    .from("collector_items")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data || []) as CollectorItem[]).map((item) => [item.id, item])
  );
}

async function fetchEntitySearchContext(
  supabase: SupabaseClient,
  itemIds: string[]
) {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map<string, { aliases: string[]; traits: string[] }>();
  }

  const [{ data: aliases, error: aliasError }, { data: traits, error: traitError }] =
    await Promise.all([
      supabase
        .from("collector_aliases")
        .select("collector_item_id,alias")
        .in("collector_item_id", uniqueIds),
      supabase
        .from("collector_item_traits")
        .select("collector_item_id,trait_name,trait_value")
        .in("collector_item_id", uniqueIds),
    ]);

  if (aliasError) {
    throw aliasError;
  }

  if (traitError) {
    throw traitError;
  }

  const context = new Map<string, { aliases: string[]; traits: string[] }>();

  for (const id of uniqueIds) {
    context.set(id, { aliases: [], traits: [] });
  }

  for (const alias of (aliases || []) as Array<{
    collector_item_id: string;
    alias: string;
  }>) {
    context.get(alias.collector_item_id)?.aliases.push(alias.alias);
  }

  for (const trait of (traits || []) as Array<{
    collector_item_id: string;
    trait_name: string;
    trait_value: string;
  }>) {
    context
      .get(trait.collector_item_id)
      ?.traits.push(`${trait.trait_name}: ${trait.trait_value}`);
  }

  return context;
}

export async function rankPossibleEntityPartMatches({
  supabase,
  observed,
  candidateItemIds,
}: {
  supabase: SupabaseClient;
  observed: CollectorObservedObjectForGraph;
  candidateItemIds: string[];
}): Promise<RankedCollectorEntityMatch[]> {
  const [itemsById, contextById] = await Promise.all([
    fetchCollectorItemsByIds(supabase, candidateItemIds),
    fetchEntitySearchContext(supabase, candidateItemIds),
  ]);
  const observedText = [observed.label, observed.category, observed.color, observed.notes]
    .filter(Boolean)
    .join(" ");
  const matches: RankedCollectorEntityMatch[] = [];

  for (const item of itemsById.values()) {
    const context = contextById.get(item.id) || { aliases: [], traits: [] };
    const searchableText = [
      item.name,
      item.item_type,
      item.notes || "",
      ...context.aliases,
      ...context.traits,
    ].join(" ");
    const score = clampScore(tokenOverlapScore(observedText, searchableText));

    if (score <= 0) {
      continue;
    }

    matches.push({
      collector_item_id: item.id,
      name: item.name,
      item_type: item.item_type,
      confidence: score,
      basis: ["token_overlap"],
      aliases: context.aliases,
      traits: context.traits,
    });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

export async function buildKnownLikelyUnknownRelationshipEvidence({
  supabase,
  parentItemId,
  observedObjects,
}: {
  supabase: SupabaseClient;
  parentItemId: string;
  observedObjects: CollectorObservedObjectForGraph[];
}): Promise<CollectorGraphEvidenceResult> {
  const relationships = await findPartsAndAccessoriesLinkedToEntity(
    supabase,
    parentItemId
  );
  const itemIds = relationships.flatMap((relationship) => [
    relationship.source_item_id,
    relationship.target_item_id,
  ]);
  const itemsById = await fetchCollectorItemsByIds(supabase, itemIds);
  const known: CollectorGraphRelationshipEvidence[] = relationships.map(
    (relationship) => ({
      relationship,
      source_item: itemsById.get(relationship.source_item_id) || null,
      target_item: itemsById.get(relationship.target_item_id) || null,
      evidence_type: "known",
      confidence: relationship.confidence,
      notes: relationship.notes || undefined,
    })
  );
  const candidateIds = [...itemsById.keys()];
  const likely: CollectorGraphRelationshipEvidence[] = [];
  const unknown: CollectorObservedObjectForGraph[] = [];

  for (const observed of observedObjects) {
    const ranked = await rankPossibleEntityPartMatches({
      supabase,
      observed,
      candidateItemIds: candidateIds,
    });
    const best = ranked[0];

    if (!best || best.confidence < 0.35) {
      unknown.push(observed);
      continue;
    }

    const relationship = relationships.find(
      (candidate) =>
        candidate.source_item_id === best.collector_item_id ||
        candidate.target_item_id === best.collector_item_id
    );

    if (!relationship) {
      unknown.push(observed);
      continue;
    }

    likely.push({
      relationship,
      source_item: itemsById.get(relationship.source_item_id) || null,
      target_item: itemsById.get(relationship.target_item_id) || null,
      evidence_type: "likely",
      confidence: best.confidence,
      notes: `Observed "${observed.label}" may match "${best.name}".`,
    });
  }

  return { known, likely, unknown };
}

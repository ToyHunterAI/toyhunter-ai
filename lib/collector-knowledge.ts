export const COLLECTOR_ITEM_TYPES = [
  "figure",
  "creature",
  "vehicle",
  "creature_set",
  "vehicle_set",
  "playset",
  "accessory",
  "weapon",
  "part",
  "sticker_sheet",
  "lot",
  "unknown",
  "sticker",
  "box",
  "instructions",
  "catalog",
  "other",
] as const;

export const COLLECTOR_CONDITION_CLASSES = [
  "SEALED",
  "BOXED",
  "COMPLETE",
  "LOOSE",
  "INCOMPLETE",
  "PARTS",
  "UNKNOWN",
] as const;

export const COLLECTOR_ALIAS_TYPES = [
  "search",
  "photo",
  "abbreviation",
  "misspelling",
  "foreign_name",
  "seller_slang",
  "negative",
] as const;

export const COLLECTOR_MEDIA_TYPES = [
  "reference",
  "box",
  "accessory",
  "instruction",
  "sticker",
  "catalog",
  "other",
] as const;

export const COLLECTOR_CONFIDENCE_LEVELS = [
  "curated",
  "inferred",
  "ai_learned",
  "unverified",
] as const;

export const COLLECTOR_SUGGESTION_STATUSES = [
  "suggested",
  "under_review",
  "approved",
  "rejected",
  "linked",
  "superseded",
  "merged",
] as const;

export const COLLECTOR_APPROVAL_ACTIONS = [
  "APPROVE_NEW_ITEM",
  "APPROVE_MATCH_UPDATE",
  "EDIT_AND_APPROVE",
  "REJECT",
  "LINK_TO_EXISTING_ITEM",
  "CREATE_NEW_RELATED_ENTITY",
  "APPROVE_RELATIONSHIP",
  "REJECT_RELATIONSHIP",
] as const;

export const COLLECTOR_REVIEW_OUTCOMES = [
  "PERFECT",
  "MINOR_EDIT",
  "MAJOR_EDIT",
  "NEW_ENTITY",
  "LINK_EXISTING",
  "ADD_RELATIONSHIP",
  "REMOVE_RELATIONSHIP",
  "REJECT",
] as const;

export const COLLECTOR_LEARNING_CHANGE_TYPES = [
  "identity",
  "alias",
  "trait",
  "relationship",
  "condition",
  "manufacturer",
  "release_year",
  "item_type",
  "toyline",
  "entity",
  "part",
  "media",
  "notes",
  "seller_claim",
  "review_outcome",
] as const;

export const COLLECTOR_LEARNING_SEVERITIES = [
  "none",
  "minor",
  "major",
  "critical",
] as const;

export const COLLECTOR_RELATIONSHIP_TYPES = [
  "includes",
  "belongs_to",
  "required_for_complete",
  "optional_accessory_for",
  "used_by",
  "rider_for",
  "driver_for",
  "weapon_for",
  "transforms_into",
  "variant_of",
  "reissue_of",
  "bootleg_of",
  "packaged_with",
  "instruction_for",
  "box_for",
  "sticker_for",
  "compatible_with",
  "shares_mold_with",
  "part_of_lot",
] as const;

export const COLLECTOR_RELATIONSHIP_REVIEW_STATUSES = [
  "suggested",
  "approved",
  "rejected",
  "merged",
  "needs_review",
  "conflict",
] as const;

export const COLLECTOR_RELATIONSHIP_SOURCES = [
  "manual",
  "curated",
  "human_review",
  "approved_ai",
  "collector_builder",
  "vision_ai",
  "import",
  "collector_item_parts_backfill",
  "marketplace_listing",
  "unknown",
] as const;

export type CollectorItemType = (typeof COLLECTOR_ITEM_TYPES)[number];
export type CollectorConditionClass =
  (typeof COLLECTOR_CONDITION_CLASSES)[number];
export type CollectorAliasType = (typeof COLLECTOR_ALIAS_TYPES)[number];
export type CollectorMediaType = (typeof COLLECTOR_MEDIA_TYPES)[number];
export type CollectorConfidenceLevel =
  (typeof COLLECTOR_CONFIDENCE_LEVELS)[number];
export type CollectorSuggestionStatus =
  (typeof COLLECTOR_SUGGESTION_STATUSES)[number];
export type CollectorApprovalAction =
  (typeof COLLECTOR_APPROVAL_ACTIONS)[number];
export type CollectorReviewOutcome =
  (typeof COLLECTOR_REVIEW_OUTCOMES)[number];
export type CollectorLearningChangeType =
  (typeof COLLECTOR_LEARNING_CHANGE_TYPES)[number];
export type CollectorLearningSeverity =
  (typeof COLLECTOR_LEARNING_SEVERITIES)[number];
export type CollectorRelationshipType =
  (typeof COLLECTOR_RELATIONSHIP_TYPES)[number];
export type CollectorRelationshipReviewStatus =
  (typeof COLLECTOR_RELATIONSHIP_REVIEW_STATUSES)[number];
export type CollectorRelationshipSource =
  (typeof COLLECTOR_RELATIONSHIP_SOURCES)[number];

export type CollectorObscurityLevel =
  | "mainstream"
  | "known"
  | "niche"
  | "obscure"
  | "unknown";

export type CollectorPopularityLevel =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "unknown";

export type CollectorRarityLevel =
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare"
  | "grail"
  | "unknown";

export type CollectorImportanceLevel =
  | "low"
  | "medium"
  | "high"
  | "essential"
  | "unknown";

export type CollectorHiddenGemLevel =
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "unknown";

export type CollectorCompletionImportance =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type CollectorValueImpactLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type CollectorVolatilityLevel = "low" | "medium" | "high" | "unknown";

export type CollectorToyline = {
  id: string;
  name: string;
  manufacturer: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  primary_region: string | null;
  obscurity_level: CollectorObscurityLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorItem = {
  id: string;
  toyline_id: string;
  name: string;
  item_type: CollectorItemType | string;
  manufacturer: string | null;
  release_year: number | null;
  release_region: string | null;
  series_or_wave: string | null;
  parent_item_id: string | null;
  popularity_level: CollectorPopularityLevel;
  rarity_level: CollectorRarityLevel;
  collector_importance: CollectorImportanceLevel;
  collector_hidden_gem_level: CollectorHiddenGemLevel;
  completion_importance: CollectorCompletionImportance;
  is_known_valuable_accessory: boolean;
  is_common_item: boolean;
  is_frequently_missing_part: boolean;
  is_bootleg_known: boolean;
  is_japanese_exclusive: boolean;
  typical_condition_classes: CollectorConditionClass[];
  notes: string | null;
  confidence_level: CollectorConfidenceLevel;
  created_at: string;
  updated_at: string;
};

export type CollectorAlias = {
  id: string;
  collector_item_id: string;
  alias: string;
  alias_type: CollectorAliasType;
  weight: number;
  confidence: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorItemPart = {
  id: string;
  parent_item_id: string;
  part_item_id: string;
  required_for_complete: boolean;
  frequently_missing: boolean;
  value_impact_level: CollectorValueImpactLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorItemRelationship = {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relationship_type: CollectorRelationshipType;
  confidence: number;
  source: CollectorRelationshipSource | string;
  review_status: CollectorRelationshipReviewStatus;
  required_for_complete: boolean | null;
  value_impact_level: CollectorValueImpactLevel | null;
  quantity: number;
  valid_region: string | null;
  valid_year_start: number | null;
  valid_year_end: number | null;
  notes: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CollectorItemRelationshipInsert = {
  source_item_id: string;
  target_item_id: string;
  relationship_type: CollectorRelationshipType;
  confidence?: number;
  source?: CollectorRelationshipSource | string;
  review_status?: CollectorRelationshipReviewStatus;
  required_for_complete?: boolean | null;
  value_impact_level?: CollectorValueImpactLevel | null;
  quantity?: number;
  valid_region?: string | null;
  valid_year_start?: number | null;
  valid_year_end?: number | null;
  notes?: string | null;
  evidence?: Record<string, unknown>;
};

export type CollectorItemRelationshipUpdate =
  Partial<CollectorItemRelationshipInsert>;

export type CollectorItemTrait = {
  id: string;
  collector_item_id: string;
  trait_name: string;
  trait_value: string;
  confidence: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorMarketTrait = {
  id: string;
  collector_item_id: string;
  condition_class: CollectorConditionClass | "UNKNOWN" | string;
  currency: string;
  sell_through_rate: number | null;
  active_competition_count: number | null;
  sold_comps_count: number | null;
  median_sold_price: number | null;
  low_sold_price: number | null;
  high_sold_price: number | null;
  price_spread: number | null;
  volatility_level: CollectorVolatilityLevel;
  calculated_at: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export type CollectorAiSuggestion = {
  id: string;
  collector_item_id: string | null;
  suggested_alias: string | null;
  suggested_collector_item_id: string | null;
  suggested_trait_name: string | null;
  suggested_trait_value: string | null;
  suggested_relationship_type: CollectorRelationshipType | null;
  suggested_source_item_id: string | null;
  suggested_target_item_id: string | null;
  suggested_entity_payload: Record<string, unknown>;
  suggested_relationship_payload: Record<string, unknown>;
  confidence: number;
  source: string;
  status: CollectorSuggestionStatus;
  evidence: Record<string, unknown>;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorApprovalEvent = {
  id: string;
  suggestion_id: string | null;
  action: CollectorApprovalAction | string;
  reviewer_id: string | null;
  target_collector_item_id: string | null;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  edits: Record<string, unknown>;
  warnings: unknown[];
  notes: string | null;
  created_at: string;
};

export type CollectorAiFeedback = {
  id: string;
  suggestion_id: string | null;
  decision: CollectorApprovalAction | string;
  proposal_type: string | null;
  confidence_before: number | null;
  reviewer_changes: Record<string, unknown>;
  rejection_reason: string | null;
  approved_item_id: string | null;
  created_at: string;
};

export type CollectorAiLearningEvent = {
  id: string;
  approval_event_id: string | null;
  suggestion_id: string | null;
  collector_item_id: string | null;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  change_type: CollectorLearningChangeType;
  severity: CollectorLearningSeverity;
  confidence_before: number | null;
  confidence_after: number | null;
  review_outcome: CollectorReviewOutcome;
  human_comment: string | null;
  created_at: string;
};

export type CollectorAiSuggestionInsert = {
  collector_item_id?: string | null;
  suggested_alias?: string | null;
  suggested_collector_item_id?: string | null;
  suggested_trait_name?: string | null;
  suggested_trait_value?: string | null;
  suggested_relationship_type?: CollectorRelationshipType | null;
  suggested_source_item_id?: string | null;
  suggested_target_item_id?: string | null;
  suggested_entity_payload?: Record<string, unknown>;
  suggested_relationship_payload?: Record<string, unknown>;
  confidence: number;
  source: string;
  status?: CollectorSuggestionStatus;
  evidence?: Record<string, unknown>;
};

export type CollectorGraphEntityMatch = {
  collector_item_id: string;
  name: string;
  item_type: CollectorItemType | string;
  confidence: number;
  basis: string[];
};

export type CollectorGraphRelationshipEvidence = {
  relationship: CollectorItemRelationship;
  source_item?: CollectorItem | null;
  target_item?: CollectorItem | null;
  evidence_type: "known" | "likely" | "unknown" | "conflict";
  confidence: number;
  notes?: string;
};

export type CollectorMedia = {
  id: string;
  collector_item_id: string;
  image_url: string;
  image_type: CollectorMediaType;
  confidence: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectorItemIdentity = {
  toylineName: string;
  itemName: string;
  itemType?: string | null;
  releaseYear?: number | null;
  seriesOrWave?: string | null;
};

export function normalizeCollectorText(value: string) {
  return value
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCollectorGraphKey(value: string | null | undefined) {
  return normalizeCollectorText(value || "unknown");
}

export function buildCollectorRelationshipKey({
  sourceItemId,
  targetItemId,
  relationshipType,
  validRegion,
  validYearStart,
  validYearEnd,
}: {
  sourceItemId: string;
  targetItemId: string;
  relationshipType: CollectorRelationshipType;
  validRegion?: string | null;
  validYearStart?: number | null;
  validYearEnd?: number | null;
}) {
  return [
    sourceItemId,
    targetItemId,
    relationshipType,
    normalizeCollectorGraphKey(validRegion),
    validYearStart || "unknown",
    validYearEnd || "unknown",
  ].join("|");
}

export function buildCollectorIdentityKey({
  toylineName,
  itemName,
  itemType,
  releaseYear,
  seriesOrWave,
}: CollectorItemIdentity) {
  return [
    normalizeCollectorText(toylineName),
    normalizeCollectorText(itemName),
    normalizeCollectorText(itemType || "unknown"),
    releaseYear || "unknown",
    normalizeCollectorText(seriesOrWave || "unknown"),
  ].join("|");
}

export function isCollectorConditionClass(
  value: string
): value is CollectorConditionClass {
  return COLLECTOR_CONDITION_CLASSES.includes(
    value as CollectorConditionClass
  );
}

export function isCollectorRelationshipType(
  value: string
): value is CollectorRelationshipType {
  return COLLECTOR_RELATIONSHIP_TYPES.includes(
    value as CollectorRelationshipType
  );
}

export function isCollectorRelationshipReviewStatus(
  value: string
): value is CollectorRelationshipReviewStatus {
  return COLLECTOR_RELATIONSHIP_REVIEW_STATUSES.includes(
    value as CollectorRelationshipReviewStatus
  );
}

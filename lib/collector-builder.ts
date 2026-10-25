import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTOR_ALIAS_TYPES,
  COLLECTOR_CONDITION_CLASSES,
  COLLECTOR_ITEM_TYPES,
  COLLECTOR_MEDIA_TYPES,
  buildCollectorIdentityKey,
  normalizeCollectorText,
  type CollectorAliasType,
  type CollectorCompletionImportance,
  type CollectorConditionClass,
  type CollectorHiddenGemLevel,
  type CollectorImportanceLevel,
  type CollectorItemType,
  type CollectorPopularityLevel,
  type CollectorRarityLevel,
  type CollectorRelationshipType,
} from "@/lib/collector-knowledge";

type ExistingCollectorAlias = {
  alias: string;
  alias_type: string;
  weight: number;
  confidence: number;
};

type ExistingCollectorTrait = {
  trait_name: string;
  trait_value: string;
  confidence: number;
};

type ExistingCollectorPartRelation = {
  parent_item_id: string;
  part_item_id: string;
  required_for_complete: boolean;
  frequently_missing: boolean;
  value_impact_level: string;
  notes: string | null;
};

type ExistingCollectorRelationship = {
  source_item_id: string;
  target_item_id: string;
  relationship_type: CollectorRelationshipType;
  confidence: number;
  required_for_complete: boolean | null;
  value_impact_level: string | null;
  quantity: number;
};

type ExistingCollectorItem = {
  id: string;
  name: string;
  item_type: string;
  manufacturer: string | null;
  release_year: number | null;
  release_region: string | null;
  series_or_wave: string | null;
  parent_item_id: string | null;
  popularity_level: string;
  rarity_level: string;
  collector_importance: string;
  collector_hidden_gem_level: string;
  completion_importance: string;
  typical_condition_classes: string[];
  notes: string | null;
  confidence_level: string;
  collector_toylines?:
    | {
        id: string;
        name: string;
        manufacturer: string | null;
      }
    | {
        id: string;
        name: string;
        manufacturer: string | null;
      }[]
    | null;
  collector_aliases?: ExistingCollectorAlias[];
  collector_item_traits?: ExistingCollectorTrait[];
};

type ExistingToyline = {
  id: string;
  name: string;
  manufacturer: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  primary_region: string | null;
  obscurity_level: string;
  notes: string | null;
};

export type CollectorBuilderInput = {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  toyline?: string | null;
  manufacturer?: string | null;
  releaseYear?: number | null;
  listingUrl?: string | null;
  imageUrls?: string[];
  source?: string;
};

export type CollectorBuilderAliasProposal = {
  alias: string;
  aliasType: CollectorAliasType;
  confidence: number;
  reasoning: string;
};

export type CollectorBuilderTraitProposal = {
  traitName: string;
  traitValue: string;
  confidence: number;
  reasoning: string;
};

export type CollectorBuilderPartProposal = {
  partName: string;
  requiredForComplete: boolean;
  frequentlyMissing: boolean;
  valueImpactLevel: "none" | "low" | "medium" | "high" | "critical" | "unknown";
  confidence: number;
  reasoning: string;
};

export type CollectorBuilderImageEvidence = {
  url: string;
  status: "analyzed" | "unavailable" | "not_analyzed";
  observations: string[];
  limitations: string[];
  error?: string;
};

export type CollectorBuilderObservedObject = {
  label: string;
  category:
    | "figure"
    | "creature"
    | "vehicle"
    | "accessory"
    | "weapon_like"
    | "paperwork"
    | "packaging"
    | "unknown";
  quantity: number;
  color: string | null;
  confidence: number;
  sourceImageUrl: string | null;
  notes: string;
};

export type CollectorBuilderVisionResult = {
  observed_objects: CollectorBuilderObservedObject[];
  seller_claims: string[];
  image_evidence: CollectorBuilderImageEvidence[];
  limitations: string[];
};

export type CollectorBuilderKnownPart = {
  collectorItemId: string;
  name: string;
  itemType: string;
  requiredForComplete: boolean;
  frequentlyMissing: boolean;
  valueImpactLevel: string;
  aliases: string[];
  traits: string[];
};

export type CollectorBuilderKnownRelatedEntity = {
  collectorItemId: string;
  name: string;
  itemType: string;
  relationshipType: CollectorRelationshipType;
  direction: "outgoing" | "incoming";
  confidence: number;
  requiredForComplete: boolean | null;
  valueImpactLevel: string | null;
  quantity: number;
};

export type CollectorBuilderKnowledgeMatch = {
  collectorItemId: string;
  name: string;
  toyline: string | null;
  itemType: string;
  confidence: number;
  matchBasis: string[];
  knownAliases: string[];
  knownTraits: string[];
  knownConditionClasses: string[];
  knownParts: CollectorBuilderKnownPart[];
  knownRelatedEntities: CollectorBuilderKnownRelatedEntity[];
};

export type CollectorBuilderLikelyPartIdentification = {
  observedObject: string;
  likelyKnownPart: string | null;
  confidence: number;
  basis: "collector_knowledge" | "inference" | "unknown";
  reasoning: string;
};

export type CollectorBuilderEvidenceSummary = {
  observed_by_vision: string[];
  seller_claims: string[];
  collector_knowledge: string[];
  graph: {
    approved_relationships: string[];
    inverse_relationships: string[];
    known_included_entities: string[];
    known_role_relationships: string[];
  };
  inferences: string[];
  images: CollectorBuilderImageEvidence[];
  text: string[];
  listing_claims: string[];
  database: string[];
};

export type CollectorBuilderConfidence = {
  identity: number;
  relevance: number;
  aliases: number;
  traits: number;
  parts: number;
  observed_objects?: number;
  accessory_identification?: number;
  completeness?: number | null;
};

type ApprovedLearningPattern = {
  id: string;
  field_name: string;
  evidence_count: number;
  rule: {
    operation?: string;
    removed_text?: string | null;
    added_text?: string | null;
  };
};

type AppliedLearningPattern = {
  id: string;
  fieldName: string;
  evidenceCount: number;
  before: string;
  after: string;
};

export type CollectorBuilderExistingItem = {
  id: string;
  toyline: string | null;
  itemName: string;
  itemType: string;
  manufacturer: string | null;
  releaseYear: number | null;
  seriesOrWave: string | null;
};

export type CollectorBuilderProposal = {
  scope_status: "in_scope" | "wrong_toyline" | "wrong_product_type" | "uncertain";
  toyline: string;
  item_name: string;
  item_type: CollectorItemType;
  manufacturer: string | null;
  release_year: number | null;
  parent_item: string | null;
  suggested_aliases: CollectorBuilderAliasProposal[];
  suggested_traits: CollectorBuilderTraitProposal[];
  suggested_parts: CollectorBuilderPartProposal[];
  observed_objects: CollectorBuilderObservedObject[];
  collector_knowledge_matches: CollectorBuilderKnowledgeMatch[];
  likely_part_identifications: CollectorBuilderLikelyPartIdentification[];
  unknown_observations: string[];
  suggested_condition_classes: CollectorConditionClass[];
  popularity_level: CollectorPopularityLevel;
  rarity_level: CollectorRarityLevel;
  collector_importance: CollectorImportanceLevel;
  collector_hidden_gem_level: CollectorHiddenGemLevel;
  completion_importance: CollectorCompletionImportance;
  confidence: CollectorBuilderConfidence;
  reasoning: string[];
  missing_information: string[];
  evidence_summary: CollectorBuilderEvidenceSummary;
  recommended_human_review: string;
  notes: string;
  consulted_learning_pattern_ids: string[];
  applied_learning_patterns: AppliedLearningPattern[];
};

export type CollectorBuilderResult = {
  action: "review_existing_match" | "review_new_collector_item";
  matchStatus: "match" | "possible_match" | "new_proposal";
  existing_item: CollectorBuilderExistingItem | null;
  proposal: CollectorBuilderProposal;
  observed_objects: CollectorBuilderObservedObject[];
  collector_knowledge_matches: CollectorBuilderKnowledgeMatch[];
  likely_part_identifications: CollectorBuilderLikelyPartIdentification[];
  unknown_observations: string[];
  storedSuggestionIds: string[];
  candidateCount: number;
};

const MATCH_CONFIDENCE_THRESHOLD = 0.75;
const IMAGE_PREFLIGHT_TIMEOUT_MS = 6000;
const TOYLINE_ALLOWED_BRANDS: Record<string, string[]> = {
  "dino riders": ["tyco"],
};
const EXPLICIT_BRANDS = [
  { name: "Hot Wheels", pattern: /\bhot\s*wheels\b/i },
  { name: "Matchbox", pattern: /\bmatchbox\b/i },
  { name: "LEGO", pattern: /\blego\b/i },
  { name: "Playmobil", pattern: /\bplaymobil\b/i },
  { name: "Hasbro", pattern: /\bhasbro\b/i },
  { name: "Mattel", pattern: /\bmattel\b/i },
];
const OUT_OF_SCOPE_MEDIA_PATTERN =
  /\b(comic(?:\s*book)?|book|pocket|poche|magazine|poster|puzzle|jigsaw|dvd|vhs|video\s*tape|colouring\s*book|coloring\s*book)\b/i;
const GENERIC_PART_PATTERNS = [
  /^accessor(?:y|ies)$/i,
  /^misc(?:ellaneous)? accessor(?:y|ies)$/i,
  /\betc\b/i,
  /\bweapons?\b.*\bharness(?:es)?\b/i,
  /\bvarious\b/i,
  /\bmisc(?:ellaneous)?\b/i,
  /\bunknown\b/i,
];
const CATALOG_GIMMICK_PATTERNS = [
  /\bflying dinosaur\b/i,
  /\bmotorized dinosaur\b/i,
  /\bwalking dinosaur\b/i,
  /\bwings?\s+flap(?:ping)?\b/i,
  /\belectronic\b/i,
  /\baction feature\b/i,
  /\bbutton activated\b/i,
  /\bbattery operated\b/i,
  /\bwind[-\s]?up\b/i,
];

const DINOSAUR_NAME_CANONICAL: Array<[RegExp, string]> = [
  [/\btyrannosaurus(?:\s+rex)?\b|\bt[\s.-]?rex\b/i, "Tyrannosaurus Rex"],
  [/\bquetzalcoatlus\b/i, "Quetzalcoatlus"],
  [/\bedmontonia\b/i, "Edmontonia"],
  [/\bstyracosaurus\b/i, "Styracosaurus"],
  [/\bsaurolophus\b/i, "Saurolophus"],
  [/\bmonoclonius\b/i, "Monoclonius"],
];

function clampConfidence(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(1, parsed));
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function applyApprovedNamePatterns(
  value: string,
  itemType: CollectorItemType,
  conditionClasses: CollectorConditionClass[],
  patterns: ApprovedLearningPattern[]
) {
  let name = value;
  const applied: AppliedLearningPattern[] = [];

  for (const pattern of patterns.filter((item) => item.field_name === "item_name")) {
    const before = name;
    const removed = pattern.rule.removed_text?.trim() || "";
    const added = pattern.rule.added_text?.trim() || "";
    const escaped = removed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (pattern.rule.operation === "remove_text" && removed) {
      const match = new RegExp(`\\s*${escaped}(?=\\s*(?:and\\s+Accessories)?$)`, "i").exec(name);
      const preceding = match ? name.slice(0, match.index).toLowerCase() : "";
      const isRedundantRelationship =
        preceding.includes(" with ") &&
        (!/riders?/i.test(removed) || /\b(?:rider|driver)s?\b/.test(preceding));
      if (match && isRedundantRelationship) {
        name = `${name.slice(0, match.index)}${name.slice(match.index + match[0].length)}`
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    if (
      pattern.rule.operation === "replace_text" &&
      removed &&
      added &&
      itemType === "creature" &&
      conditionClasses.includes("LOOSE") &&
      new RegExp(`${escaped}$`, "i").test(name)
    ) {
      name = name.replace(new RegExp(`${escaped}$`, "i"), added).trim();
    }

    if (name !== before) {
      applied.push({
        id: pattern.id,
        fieldName: pattern.field_name,
        evidenceCount: pattern.evidence_count,
        before,
        after: name,
      });
    }
  }

  return { name, applied };
}

function averageConfidence(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length === 0) {
    return 0;
  }

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function stringList(values: unknown) {
  return Array.isArray(values)
    ? values
        .filter(
          (value) =>
            ["string", "number", "boolean"].includes(typeof value) &&
            String(value).trim() !== "[object Object]"
        )
        .map(String)
        .filter(Boolean)
    : [];
}

function isGenericPartName(value: string) {
  return GENERIC_PART_PATTERNS.some((pattern) => pattern.test(value));
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /^[A-Z0-9]+$/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function listingSupportsMakoIdentity(input: CollectorBuilderInput) {
  return /\bmako\b/i.test(
    [input.title, input.subtitle, input.description].filter(Boolean).join(" ")
  );
}

function extractCatalogGimmicks(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  return uniqueValues(
    CATALOG_GIMMICK_PATTERNS.flatMap((pattern) =>
      Array.from(text.matchAll(new RegExp(pattern.source, "gi"))).map(
        (match) => match[0]
      )
    ).map((value) => value.trim().toLowerCase())
  );
}

function findCanonicalDinosaurName(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  for (const [pattern, canonical] of DINOSAUR_NAME_CANONICAL) {
    if (pattern.test(text)) {
      return canonical;
    }
  }

  return null;
}

function cleanIncludedFigureName(value: string) {
  const cleaned = titleCaseWords(value)
    .replace(/\b(?:Rider|Driver|Action Figure|Figure|Loose)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned && !/^(?:Rider|Driver|Figure)$/i.test(cleaned) ? cleaned : null;
}

function observedObjectForIdentification(
  identification: CollectorBuilderLikelyPartIdentification,
  observedObjects: CollectorBuilderObservedObject[]
) {
  const observedKey = normalizeCollectorText(identification.observedObject);
  return observedObjects.find(
    (object) => normalizeCollectorText(object.label) === observedKey
  );
}

function likelyIncludedFigureName(
  observedObjects: CollectorBuilderObservedObject[],
  likelyPartIdentifications: CollectorBuilderLikelyPartIdentification[]
) {
  for (const identification of likelyPartIdentifications) {
    if (!identification.likelyKnownPart) continue;

    const observed = observedObjectForIdentification(identification, observedObjects);
    const likelyText = normalizeCollectorText(identification.likelyKnownPart);
    const isFigureRelationship =
      observed?.category === "figure" ||
      /\briders?\b|\bdriver\b|\bfigure\b/.test(likelyText);

    if (!isFigureRelationship) continue;

    const name = cleanIncludedFigureName(identification.likelyKnownPart);
    if (name) return name;
  }

  return null;
}

function inferSellingStateName(
  input: CollectorBuilderInput,
  itemType: CollectorItemType,
  conditionClasses: CollectorConditionClass[],
  observedObjects: CollectorBuilderObservedObject[],
  likelyPartIdentifications: CollectorBuilderLikelyPartIdentification[]
) {
  const listingText = [input.title, input.subtitle || "", input.description || ""]
    .join(" ")
    .toLowerCase();
  const likelyNames = likelyPartIdentifications
    .map((identification) => identification.likelyKnownPart || "")
    .join(" ")
    .toLowerCase();
  const observedText = observedObjects
    .map((object) => `${object.label} ${object.category} ${object.notes}`)
    .join(" ")
    .toLowerCase();
  const hasObservedRider = observedObjects.some(
    (object) =>
      object.category === "figure" &&
      /\briders?\b|\bdriver\b|\bhumanoid\b|\bfigure\b/i.test(
        `${object.label} ${object.notes}`
      )
  );
  const includedFigureName = likelyIncludedFigureName(
    observedObjects,
    likelyPartIdentifications
  );
  const hasLikelyNamedRider = Boolean(includedFigureName);
  const hasObservedAccessories = observedObjects.some((object) =>
    ["accessory", "weapon_like"].includes(object.category)
  );
  const hasLikelyAccessories = /\baccessor(?:y|ies)\b|\bparts?\b|\bweapons?\b|\barmor\b|\barmour\b|\brock\s+bunker\b/i.test(
    likelyNames
  );
  const hasObservedRelatedCreatureOrVehicle = observedObjects.some((object) =>
    ["creature", "vehicle"].includes(object.category)
  );
  const canNameObservedRelationship =
    hasObservedRelatedCreatureOrVehicle ||
    ["creature_set", "vehicle_set", "playset", "lot"].includes(itemType);

  if (canNameObservedRelationship) {
    if (/\brock\s+bunker\b/i.test(likelyNames)) return "with Rock Bunker";
    if (/\barmor\b|\barmour\b/i.test(likelyNames)) return "with Armor";
    if (includedFigureName) return `with ${includedFigureName}`;
    if (
      (hasObservedRider || hasLikelyNamedRider) &&
      (hasObservedAccessories || hasLikelyAccessories)
    ) {
      return "with Riders and Accessories";
    }
    if (hasObservedRider || hasLikelyNamedRider) return "with Riders";
    if (hasObservedAccessories || hasLikelyAccessories) return "with Accessories";
  }

  if (
    conditionClasses.includes("LOOSE") ||
    /\bloose\b/i.test(listingText) ||
    !["creature_set", "vehicle_set", "playset", "lot"].includes(itemType)
  ) {
    if (
      itemType === "figure" ||
      observedText.includes("figure") ||
      likelyNames.includes("figure")
    ) {
      return "loose figure";
    }

    if (itemType === "creature" || observedText.includes("creature")) {
      return "loose figure";
    }
  }

  return null;
}

function normalizeCollectorProposalName({
  rawName,
  input,
  itemType,
  conditionClasses,
  observedObjects,
  likelyPartIdentifications,
}: {
  rawName: string;
  input: CollectorBuilderInput;
  itemType: CollectorItemType;
  conditionClasses: CollectorConditionClass[];
  observedObjects: CollectorBuilderObservedObject[];
  likelyPartIdentifications: CollectorBuilderLikelyPartIdentification[];
}) {
  const canonical = findCanonicalDinosaurName(rawName, input.title, input.subtitle, input.description);
  const baseName = (canonical || titleCaseWords(rawName)
    .replace(/\b(?:Flying|Motorized|Walking)\s+Dinosaur\b/gi, "")
    .replace(/\bWings?\s+Flap(?:ping)?\b/gi, "")
    .replace(/\bElectronic\b/gi, "")
    .replace(/\s+/g, " ")
    .trim())
    .replace(
      /\s+with\s+riders?\s+and\s+accessor(?:y|ies)\s+with\s+riders?\s+and\s+accessor(?:y|ies)$/i,
      " with Rider and Accessories"
    );
  const sellingState = inferSellingStateName(
    input,
    itemType,
    conditionClasses,
    observedObjects,
    likelyPartIdentifications
  );

  if (!baseName) {
    return rawName;
  }

  if (!sellingState) {
    return baseName;
  }

  const normalizedBase = normalizeCollectorText(baseName);
  const normalizedState = normalizeCollectorText(sellingState);
  const semanticBase = normalizedBase
    .replace(/\briders\b/g, "rider")
    .replace(/\baccessory\b/g, "accessories");
  const semanticState = normalizedState
    .replace(/\briders\b/g, "rider")
    .replace(/\baccessory\b/g, "accessories");
  if (semanticBase.includes(semanticState)) {
    return baseName;
  }

  const baseHasRider = /\bwith\b.*\b(?:rider|driver)\b/.test(semanticBase);
  const baseHasAccessories = /\bwith\b.*\baccessories\b/.test(semanticBase);
  const baseNamesFigures = /\bfigures?\b/.test(semanticBase);

  if (baseNamesFigures && semanticState === "with rider") {
    return baseName;
  }

  if (baseNamesFigures && semanticState === "with rider and accessories") {
    return baseHasAccessories ? baseName : `${baseName} with Accessories`;
  }

  if (semanticState === "with rider and accessories") {
    if (baseHasRider && baseHasAccessories) return baseName;
    if (baseHasRider) return `${baseName} and Accessories`;
    if (baseHasAccessories) return `${baseName} and Rider`;
  }

  if (semanticState === "with rider" && baseHasRider) return baseName;
  if (semanticState === "with accessories" && baseHasAccessories) return baseName;

  return `${baseName} ${sellingState}`.replace(/\s+/g, " ").trim();
}

function scrubVisionOnlyName(value: string) {
  return value
    .replace(
      /\bDinosaur figure .*?(?:indicate|match(?:es)?) [^.]+\./gi,
      "Seller/listing context names a specific dinosaur; vision observed a dinosaur figure."
    )
    .replace(
      /\b(?:Blue )?rider figure matches [^.]+\./gi,
      "Seller/listing context names a specific rider; vision observed a rider figure."
    )
    .replace(
      /\bDinosaur and rider combination likely [^.]+\./gi,
      "Seller/listing context names a dinosaur and rider; vision observed a dinosaur and rider combination."
    )
    .replace(/\s*resembling\s+fence\s+or\s+barrier/gi, "")
    .replace(/\s*(?:resembling|like)\s+(?:a\s+)?fence(?:\s+or\s+barrier)?/gi, "")
    .replace(/\s*(?:resembling|like)\s+(?:a\s+)?stand\s+or\s+base/gi, " with two vertical posts")
    .replace(/\bfence-like\b/gi, "brown")
    .replace(/\bfence\b/gi, "accessory")
    .replace(/\bbrain box\b/gi, "plastic accessory")
    .replace(/\blaser cannon\b/gi, "plastic accessory")
    .replace(/\bweapon tree\b/gi, "plastic accessory")
    .replace(/\bharness\b/gi, "plastic accessory")
    .replace(/\s+/g, " ")
    .trim();
}

function scrubUnsupportedKnownClaim(value: string, hasDatabaseEvidence: boolean) {
  if (hasDatabaseEvidence) {
    return value;
  }

  return value
    .replace(
      /\bThe dinosaur figure'?s color and mechanical parts strongly indicate [^.]+\./gi,
      "Seller/listing context names a specific dinosaur; vision observed a dinosaur figure with mechanical parts."
    )
    .replace(
      /\bSeller\/listing context identifies known ([^.]+?) from the same set\.?/gi,
      "Seller/listing context identifies $1."
    )
    .replace(
      /\bSeller\/listing context identifies ([^.]+?) rider figure from the same set\./gi,
      "Seller/listing context names a specific rider; vision observed a rider figure."
    )
    .replace(
      /\bDinosaur and rider figures correspond to [^.]+\./gi,
      "Seller/listing context names a dinosaur and rider; vision observed dinosaur and rider figures."
    )
    .replace(
      /\bDinosaur and rider colors and features match known [^.]+\./gi,
      "Seller/listing context names a dinosaur and rider; vision observed dinosaur and rider colors/features."
    )
    .replace(
      /\bThe dinosaur figure'?s colors and shape match [^.]+\./gi,
      "Seller/listing context names a specific dinosaur; vision observed a dinosaur figure."
    )
    .replace(
      /\bThe (?:blue )?humanoid figure matches [^.]+ known from the same set\./gi,
      "Seller/listing context names a specific rider; vision observed a humanoid figure."
    )
    .replace(
      /\bThe (?:blue )?humanoid figure is consistent with [^.]+ known from the set\./gi,
      "Seller/listing context names a specific rider; vision observed a humanoid figure."
    )
    .replace(
      /\bDinosaur figure likely [A-Za-z0-9' -]+\b/gi,
      "Seller/listing context names a specific dinosaur; vision observed a dinosaur figure"
    )
    .replace(
      /\b(?:Blue )?figure likely [A-Za-z0-9' -]+ rider\b/gi,
      "Seller/listing context names a specific rider; vision observed a humanoid figure"
    )
    .replace(
      /\bObserved ([^.]+?) matches ([^.]+?)\./gi,
      "Vision observed $1. Seller/listing context identifies $2."
    )
    .replace(
      /\b([^.]+?) match(?:es)? the ([^.]+?)\./gi,
      "Seller/listing context identifies $2. Vision observed $1."
    )
    .replace(/\bknown from this set\b/gi, "seller-listed with this item")
    .replace(/\bknown from the set\b/gi, "seller-listed with this item")
    .replace(/\bknown from the same set\b/gi, "seller-listed with this item")
    .replace(/\bknown required parts\b/gi, "required parts after Collector Knowledge review")
    .replace(/\bknown [A-Za-z0-9&\s-]+ set parts\b/gi, "Collector Knowledge checklist for this item")
    .replace(/\bmatches known\b/gi, "resembles possible")
    .replace(/\bknown to be part of\b/gi, "visually associated with")
    .replace(/\bknown set components?\b/gi, "visible listed components")
    .replace(/\bknown combination\b/gi, "inferred combination")
    .replace(/\bmatching known\b/gi, "visually resembling possible")
    .replace(/\bknown to\b/gi, "inferred to")
    .replace(
      /\blikely contains weapons? or gear parts\b/gi,
      "has exact contents unknown"
    )
    .replace(/\bVision observed The\b/g, "Vision observed the")
    .replace(/\bbased on strong visual and listing evidence\b/gi, "based on listing text and generic visual observations");
}

async function checkImageAccess(url: string): Promise<CollectorBuilderImageEvidence> {
  const trimmedUrl = url.trim();

  try {
    const parsed = new URL(trimmedUrl);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        url: trimmedUrl,
        status: "unavailable",
        observations: [],
        limitations: [],
        error: "Image URL must use http or https.",
      };
    }

    const response = await fetch(trimmedUrl, {
      method: "GET",
      headers: {
        Range: "bytes=0-0",
      },
      signal: AbortSignal.timeout(IMAGE_PREFLIGHT_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        url: trimmedUrl,
        status: "unavailable",
        observations: [],
        limitations: [],
        error: `Image request returned HTTP ${response.status}.`,
      };
    }

    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return {
        url: trimmedUrl,
        status: "unavailable",
        observations: [],
        limitations: [],
        error: `Image request returned ${contentType}, not an image content type.`,
      };
    }

    return {
      url: trimmedUrl,
      status: "analyzed",
      observations: [],
      limitations: [],
    };
  } catch (error) {
    return {
      url: trimmedUrl,
      status: "unavailable",
      observations: [],
      limitations: [],
      error: error instanceof Error ? error.message : "Image could not be fetched.",
    };
  }
}

async function checkImageAccessForInput(input: CollectorBuilderInput) {
  const urls = uniqueValues(input.imageUrls || []);

  if (urls.length === 0) {
    return [];
  }

  return Promise.all(urls.map(checkImageAccess));
}

function sanitizeAliasType(value: string): CollectorAliasType {
  return COLLECTOR_ALIAS_TYPES.includes(value as CollectorAliasType)
    ? (value as CollectorAliasType)
    : "search";
}

function sanitizeItemType(value: string | null | undefined): CollectorItemType {
  return COLLECTOR_ITEM_TYPES.includes(value as CollectorItemType)
    ? (value as CollectorItemType)
    : "unknown";
}

function sanitizeConditionClasses(values: unknown): CollectorConditionClass[] {
  if (!Array.isArray(values)) {
    return ["UNKNOWN"];
  }

  const sanitized = values.filter((value): value is CollectorConditionClass =>
    COLLECTOR_CONDITION_CLASSES.includes(value as CollectorConditionClass)
  );

  return sanitized.length > 0 ? sanitized : ["UNKNOWN"];
}

function sanitizeLevel<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function getToylineName(item: ExistingCollectorItem) {
  if (Array.isArray(item.collector_toylines)) {
    return item.collector_toylines[0]?.name || null;
  }

  return item.collector_toylines?.name || null;
}

function getSearchTerms(input: CollectorBuilderInput, extraTerms: string[] = []) {
  return uniqueValues(
    [
      input.toyline || "",
      input.manufacturer || "",
      input.title,
      input.subtitle || "",
      input.description || "",
      ...extraTerms,
    ]
      .join(" ")
      .split(/\s+/)
      .map((term) => normalizeCollectorText(term))
      .filter((term) => term.length >= 3)
  ).slice(0, 14);
}

async function searchExistingToylines(
  supabase: SupabaseClient,
  input: CollectorBuilderInput,
  extraTerms: string[] = []
) {
  const terms = getSearchTerms(input, extraTerms);

  if (terms.length === 0) {
    return [];
  }

  const filters = terms
    .slice(0, 8)
    .map((term) => `name.ilike.%${term}%,manufacturer.ilike.%${term}%`)
    .join(",");

  const { data, error } = await supabase
    .from("collector_toylines")
    .select(
      "id,name,manufacturer,active_year_start,active_year_end,primary_region,obscurity_level,notes"
    )
    .or(filters)
    .limit(20);

  if (error) {
    console.error("Collector Builder toyline lookup failed:", error);
    return [];
  }

  return (data || []) as ExistingToyline[];
}

async function searchExistingCollectorItems(
  supabase: SupabaseClient,
  input: CollectorBuilderInput,
  extraTerms: string[] = []
) {
  const terms = getSearchTerms(input, extraTerms);

  if (terms.length === 0) {
    return [];
  }

  const aliasFilters = terms
    .slice(0, 10)
    .map((term) => `alias.ilike.%${term}%`)
    .join(",");

  const { data: aliasMatches, error: aliasError } = await supabase
    .from("collector_aliases")
    .select("collector_item_id")
    .or(aliasFilters)
    .limit(40);

  if (aliasError) {
    console.error("Collector Builder alias lookup failed:", aliasError);
  }

  const aliasItemIds = uniqueValues(
    (aliasMatches || []).map(
      (row: { collector_item_id: string }) => row.collector_item_id
    )
  );
  const itemNameFilters = terms
    .slice(0, 10)
    .map((term) => `name.ilike.%${term}%,manufacturer.ilike.%${term}%`)
    .join(",");
  const itemQuery = supabase
    .from("collector_items")
    .select(
      `
        id,
        name,
        item_type,
        manufacturer,
        release_year,
        release_region,
        series_or_wave,
        parent_item_id,
        popularity_level,
        rarity_level,
        collector_importance,
        collector_hidden_gem_level,
        completion_importance,
        typical_condition_classes,
        notes,
        confidence_level,
        collector_toylines (
          id,
          name,
          manufacturer
        ),
        collector_aliases (
          alias,
          alias_type,
          weight,
          confidence
        ),
        collector_item_traits (
          trait_name,
          trait_value,
          confidence
        )
      `
    )
    .limit(40);

  const { data: directMatches, error: directError } =
    aliasItemIds.length > 0
      ? await itemQuery.or(
          `${itemNameFilters},id.in.(${aliasItemIds.join(",")})`
        )
      : await itemQuery.or(itemNameFilters);

  if (directError) {
    console.error("Collector Builder item lookup failed:", directError);
    return [];
  }

  return (directMatches || []) as unknown as ExistingCollectorItem[];
}

async function loadApprovedLearningPatterns(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("collector_ai_learning_patterns")
    .select("id,field_name,evidence_count,rule")
    .eq("status", "approved")
    .order("evidence_count", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Collector Builder learning-pattern lookup failed:", error);
    return [] as ApprovedLearningPattern[];
  }

  return (data || []) as ApprovedLearningPattern[];
}

function compactAliases(item: ExistingCollectorItem) {
  return (item.collector_aliases || [])
    .slice(0, 12)
    .map((alias) => alias.alias)
    .filter(Boolean);
}

function compactTraits(item: ExistingCollectorItem) {
  return (item.collector_item_traits || [])
    .slice(0, 12)
    .map((trait) => `${trait.trait_name}: ${trait.trait_value}`)
    .filter(Boolean);
}

async function loadKnownPartsForItems(
  supabase: SupabaseClient,
  items: ExistingCollectorItem[]
) {
  const parentIds = uniqueValues(items.map((item) => item.id));

  if (parentIds.length === 0) {
    return new Map<string, CollectorBuilderKnownPart[]>();
  }

  const { data: relations, error: relationError } = await supabase
    .from("collector_item_parts")
    .select(
      "parent_item_id,part_item_id,required_for_complete,frequently_missing,value_impact_level,notes"
    )
    .in("parent_item_id", parentIds);

  if (relationError) {
    console.error("Collector Builder part lookup failed:", relationError);
    return new Map<string, CollectorBuilderKnownPart[]>();
  }

  const typedRelations = (relations || []) as ExistingCollectorPartRelation[];
  const partIds = uniqueValues(typedRelations.map((relation) => relation.part_item_id));

  if (partIds.length === 0) {
    return new Map<string, CollectorBuilderKnownPart[]>();
  }

  const { data: partItems, error: partError } = await supabase
    .from("collector_items")
    .select(
      `
        id,
        name,
        item_type,
        manufacturer,
        release_year,
        release_region,
        series_or_wave,
        parent_item_id,
        popularity_level,
        rarity_level,
        collector_importance,
        collector_hidden_gem_level,
        completion_importance,
        typical_condition_classes,
        notes,
        confidence_level,
        collector_toylines (
          id,
          name,
          manufacturer
        ),
        collector_aliases (
          alias,
          alias_type,
          weight,
          confidence
        ),
        collector_item_traits (
          trait_name,
          trait_value,
          confidence
        )
      `
    )
    .in("id", partIds);

  if (partError) {
    console.error("Collector Builder part item lookup failed:", partError);
    return new Map<string, CollectorBuilderKnownPart[]>();
  }

  const partItemById = new Map(
    ((partItems || []) as unknown as ExistingCollectorItem[]).map((item) => [
      item.id,
      item,
    ])
  );
  const partsByParent = new Map<string, CollectorBuilderKnownPart[]>();

  for (const relation of typedRelations) {
    const partItem = partItemById.get(relation.part_item_id);

    if (!partItem) {
      continue;
    }

    const knownPart: CollectorBuilderKnownPart = {
      collectorItemId: partItem.id,
      name: partItem.name,
      itemType: partItem.item_type,
      requiredForComplete: relation.required_for_complete,
      frequentlyMissing: relation.frequently_missing,
      valueImpactLevel: relation.value_impact_level,
      aliases: compactAliases(partItem),
      traits: compactTraits(partItem),
    };
    const existing = partsByParent.get(relation.parent_item_id) || [];
    existing.push(knownPart);
    partsByParent.set(relation.parent_item_id, existing);
  }

  return partsByParent;
}

async function loadApprovedGraphRelationshipsForItems(
  supabase: SupabaseClient,
  items: ExistingCollectorItem[]
) {
  const itemIds = uniqueValues(items.map((item) => item.id));

  if (itemIds.length === 0) {
    return {
      relatedByItem: new Map<string, CollectorBuilderKnownRelatedEntity[]>(),
      relationships: [] as ExistingCollectorRelationship[],
      relatedItemsById: new Map<string, ExistingCollectorItem>(),
    };
  }

  const { data: relationships, error } = await supabase
    .from("collector_item_relationships")
    .select(
      "source_item_id,target_item_id,relationship_type,confidence,required_for_complete,value_impact_level,quantity"
    )
    .eq("review_status", "approved")
    .or(
      `source_item_id.in.(${itemIds.join(",")}),target_item_id.in.(${itemIds.join(
        ","
      )})`
    );

  if (error) {
    console.error("Collector Builder graph relationship lookup failed:", error);
    return {
      relatedByItem: new Map<string, CollectorBuilderKnownRelatedEntity[]>(),
      relationships: [] as ExistingCollectorRelationship[],
      relatedItemsById: new Map<string, ExistingCollectorItem>(),
    };
  }

  const typedRelationships =
    ((relationships || []) as unknown as ExistingCollectorRelationship[]) || [];
  const relatedItemIds = uniqueValues(
    typedRelationships.flatMap((relationship) => [
      relationship.source_item_id,
      relationship.target_item_id,
    ])
  );
  const relatedItemsById = new Map(items.map((item) => [item.id, item]));
  const missingRelatedIds = relatedItemIds.filter((id) => !relatedItemsById.has(id));

  if (missingRelatedIds.length > 0) {
    const { data: relatedItems, error: relatedItemsError } = await supabase
      .from("collector_items")
      .select(
        `
          id,
          name,
          item_type,
          manufacturer,
          release_year,
          release_region,
          series_or_wave,
          parent_item_id,
          popularity_level,
          rarity_level,
          collector_importance,
          collector_hidden_gem_level,
          completion_importance,
          typical_condition_classes,
          notes,
          confidence_level,
          collector_toylines (
            id,
            name,
            manufacturer
          ),
          collector_aliases (
            alias,
            alias_type,
            weight,
            confidence
          ),
          collector_item_traits (
            trait_name,
            trait_value,
            confidence
          )
        `
      )
      .in("id", missingRelatedIds);

    if (relatedItemsError) {
      console.error(
        "Collector Builder graph related item lookup failed:",
        relatedItemsError
      );
    }

    for (const item of (relatedItems || []) as unknown as ExistingCollectorItem[]) {
      relatedItemsById.set(item.id, item);
    }
  }

  const relatedByItem = new Map<string, CollectorBuilderKnownRelatedEntity[]>();

  for (const itemId of itemIds) {
    relatedByItem.set(itemId, []);
  }

  for (const relationship of typedRelationships) {
    const sourceItem = relatedItemsById.get(relationship.source_item_id);
    const targetItem = relatedItemsById.get(relationship.target_item_id);

    if (sourceItem && relatedByItem.has(relationship.target_item_id)) {
      relatedByItem.get(relationship.target_item_id)?.push({
        collectorItemId: sourceItem.id,
        name: sourceItem.name,
        itemType: sourceItem.item_type,
        relationshipType: relationship.relationship_type,
        direction: "incoming",
        confidence: Number(relationship.confidence || 0),
        requiredForComplete: relationship.required_for_complete,
        valueImpactLevel: relationship.value_impact_level,
        quantity: Number(relationship.quantity || 1),
      });
    }

    if (targetItem && relatedByItem.has(relationship.source_item_id)) {
      relatedByItem.get(relationship.source_item_id)?.push({
        collectorItemId: targetItem.id,
        name: targetItem.name,
        itemType: targetItem.item_type,
        relationshipType: relationship.relationship_type,
        direction: "outgoing",
        confidence: Number(relationship.confidence || 0),
        requiredForComplete: relationship.required_for_complete,
        valueImpactLevel: relationship.value_impact_level,
        quantity: Number(relationship.quantity || 1),
      });
    }
  }

  return { relatedByItem, relationships: typedRelationships, relatedItemsById };
}

async function buildCollectorKnowledgeMatches(
  supabase: SupabaseClient,
  items: ExistingCollectorItem[]
): Promise<CollectorBuilderKnowledgeMatch[]> {
  const [partsByParent, graph] = await Promise.all([
    loadKnownPartsForItems(supabase, items),
    loadApprovedGraphRelationshipsForItems(supabase, items),
  ]);

  return items.slice(0, 10).map((item) => ({
    collectorItemId: item.id,
    name: item.name,
    toyline: getToylineName(item),
    itemType: item.item_type,
    confidence: item.confidence_level === "curated" ? 0.95 : 0.75,
    matchBasis: [
      "Collector Knowledge candidate matched from listing text, aliases, or observed terms.",
    ],
    knownAliases: compactAliases(item),
    knownTraits: compactTraits(item),
    knownConditionClasses: item.typical_condition_classes || [],
    knownParts: partsByParent.get(item.id) || [],
    knownRelatedEntities: graph.relatedByItem.get(item.id) || [],
  }));
}

function compactCollectorContext(
  toylines: ExistingToyline[],
  items: ExistingCollectorItem[],
  knowledgeMatches: CollectorBuilderKnowledgeMatch[] = [],
  approvedLearningPatterns: ApprovedLearningPattern[] = []
) {
  return {
    toylines: toylines.slice(0, 12),
    items: items.slice(0, 20).map((item) => ({
      id: item.id,
      name: item.name,
      toyline: getToylineName(item),
      itemType: item.item_type,
      manufacturer: item.manufacturer,
      releaseYear: item.release_year,
      seriesOrWave: item.series_or_wave,
      popularityLevel: item.popularity_level,
      rarityLevel: item.rarity_level,
      collectorImportance: item.collector_importance,
      hiddenGemLevel: item.collector_hidden_gem_level,
      completionImportance: item.completion_importance,
      conditionClasses: item.typical_condition_classes,
      aliases: item.collector_aliases?.slice(0, 12) || [],
      traits: item.collector_item_traits?.slice(0, 12) || [],
      notes: item.notes,
    })),
    knowledgeMatches,
    approvedLearningPatterns,
  };
}

function buildVisionObservationPrompt(
  input: CollectorBuilderInput,
  imageEvidence: CollectorBuilderImageEvidence[]
) {
  return `
You are ToyHunter's Vision Observation pass. You may observe only what is visible.
You are not allowed to identify toy-specific part names, accessory names, or
collector facts. Collector Knowledge will do that later.

Rules:
- Return only valid JSON.
- Describe visible objects generically.
- GOOD: "red plastic accessory", "small rider figure", "loose dinosaur",
  "two grey accessories", "paper insert", "box".
- BAD unless literally readable as text: "brain box", "harness", "laser cannon",
  "fence", "weapon tree", toy-specific dinosaur names, character names.
- You may report readable text from the listing/title as seller text, but do not
  turn it into verified collector knowledge.
- If an image cannot be analyzed or is too small, report that explicitly.

Return this exact JSON shape:
{
  "observed_objects": [
    {
      "label": "generic visible object name",
      "category": "figure | creature | vehicle | accessory | weapon_like | paperwork | packaging | unknown",
      "quantity": 1,
      "color": null,
      "confidence": 0,
      "sourceImageUrl": null,
      "notes": ""
    }
  ],
  "seller_claims": [],
  "image_evidence": [
    {
      "url": "",
      "status": "analyzed | unavailable | not_analyzed",
      "observations": [],
      "limitations": [],
      "error": ""
    }
  ],
  "limitations": []
}

Listing input:
${JSON.stringify(input, null, 2)}

Image access evidence:
${JSON.stringify(imageEvidence, null, 2)}
`;
}

function buildCollectorBuilderPrompt(
  input: CollectorBuilderInput,
  context: ReturnType<typeof compactCollectorContext>,
  vision: CollectorBuilderVisionResult
) {
  return `
You are ToyHunter's internal Collector Proposal Generator, an AI librarian for
vintage toys. Your output is reviewed by humans before anything becomes approved
collector data.

Given a marketplace listing and a Vision Observation pass, produce a structured
Collector Proposal. Collector Knowledge is the source of truth. Vision observes;
Collector Knowledge identifies.

Rules:
- Return only valid JSON.
- Never approve or modify collector data.
- If a similar collector item exists, return that item id and explain why it
  matches. Only list NEW aliases, traits or parts that appear missing.
- If no good match exists, return a new proposal only.
- Keep reasoning short and evidence-based.
- Do not analyze the images again. Use only the supplied Vision Observation pass
  as observed evidence.
- Output must distinguish Observed, Known, Likely, and Unknown.
- Observed means Vision saw a generic object.
- Known means Collector Knowledge contains the identity, part, trait, alias, or
  condition expectation.
- Likely means an observed object may correspond to a known Collector Knowledge
  part, with a confidence below certainty.
- Unknown means the observation cannot be identified from Collector Knowledge.
- Vision is never allowed to create part names. If Collector Knowledge has no
  known part for an observed object, keep it as unknown.
- Use null when unknown. Do not pretend uncertain details are facts.
- Do not state an item is a known combination unless it is supported by existing
  Collector Knowledge context.
- Do not use phrases like "known set component" or "known to be part of the
  set" unless evidence_summary.collector_knowledge cites Collector Knowledge.
- Seller text such as "100% complete" is a listing claim. Store it as a
  listing_claim trait. It is not confirmed completeness unless visible image
  evidence or Collector Knowledge confirms the exact required parts.
- Only use suggested_condition_classes COMPLETE when completeness is justified
  by image/database evidence. Otherwise use UNKNOWN or the most conservative
  visible condition class.
- Do not propose vague parts like "accessories", "weapons, harness, etc.",
  "various parts", or "misc parts". Only propose specifically identifiable
  parts. Put unknown exact accessories in missing_information instead.
- For a dinosaur plus named rider/set combination, prefer creature_set over
  figure when the dinosaur/creature is part of the identity.
- Only put parts in suggested_parts when they come from Collector Knowledge or
  are the main visible generic item identity such as dinosaur/rider. Unknown
  accessories belong in unknown_observations, not suggested_parts.
- Hierarchical confidence must be represented in confidence:
  identity, relevance, observed_objects, accessory_identification,
  completeness, aliases, traits, parts. Identity means certainty about what the
  object is. Relevance means certainty that it is a physical toy belonging to
  the requested toyline; books, comics, puzzles, posters and unrelated brands
  have low relevance even when their identity is certain.
- Collector Knowledge always wins. If Vision appears to disagree with Collector
  Knowledge, report uncertainty and do not overwrite known data.
- A known trait named visual_fingerprint is a human-approved observation from a
  previously reviewed listing. Use it to compare visible colors, shapes,
  clothing, markings, and other distinguishing details. It supports recognition
  but does not by itself prove completeness or invisible parts.
- Use collector_knowledge_matches[].knownRelatedEntities for approved graph
  relationships. These are trusted when review_status is approved.
- Do not require related entities to have item_type "part"; includes/rider_for/
  driver_for/weapon_for relationships can identify creatures, figures, vehicles,
  weapons, accessories, packaging, or parts.
- Keep red/brown unknown accessories unknown unless knownRelatedEntities contains
  an approved compatible relationship for them.
- Never rename a seller-named figure to Mako from color, outfit, or generic
  figure shape alone. Mako requires explicit Mako text, a distinctive marking,
  or approved reference-media evidence that is cited in the response.
- Use Collector Naming Standard for proposal.item_name. Name what is being sold:
  character/dinosaur/vehicle name first, then observed or knowledge-confirmed
  included named item(s), then selling state. Examples: "Dinosaur Name loose
  figure", "Creature Name with Armor", "Creature Name with Named Rider",
  "Vehicle Name with Named Driver", "Character Name loose figure".
- Do not use catalog/gimmick names as item_name, such as "Flying Dinosaur",
  "Motorized Dinosaur", "Walking Dinosaur", "Wings Flap", or "Electronic".
  Put those details in suggested_traits as gimmick/action_feature traits instead.
- Apply approvedLearningPatterns when their exact correction applies. Never apply
  candidate or rejected patterns. Do not generalize a pattern beyond its stored rule.

Allowed item_type values:
${COLLECTOR_ITEM_TYPES.join(", ")}

Allowed condition classes:
${COLLECTOR_CONDITION_CLASSES.join(", ")}

Allowed levels:
- popularity_level: very_low, low, medium, high, very_high, unknown
- rarity_level: common, uncommon, rare, very_rare, grail, unknown
- collector_importance: low, medium, high, essential, unknown
- collector_hidden_gem_level: low, medium, high, very_high, unknown
- completion_importance: low, medium, high, critical, unknown

Return this exact JSON shape:
{
  "matchStatus": "match | possible_match | new_proposal",
  "existingCollectorItemId": "existing id or null",
  "proposal": {
    "toyline": "",
    "item_name": "",
    "item_type": "figure",
    "manufacturer": null,
    "release_year": null,
    "parent_item": null,
    "suggested_aliases": [
      {
        "alias": "",
        "aliasType": "search | photo | abbreviation | misspelling | foreign_name | seller_slang | negative",
        "confidence": 0,
        "reasoning": ""
      }
    ],
    "suggested_traits": [
      {
        "traitName": "",
        "traitValue": "",
        "confidence": 0,
        "reasoning": ""
      }
    ],
    "suggested_parts": [
      {
        "partName": "",
        "requiredForComplete": true,
        "frequentlyMissing": false,
        "valueImpactLevel": "none | low | medium | high | critical | unknown",
        "confidence": 0,
        "reasoning": ""
      }
    ],
    "observed_objects": [],
    "collector_knowledge_matches": [],
    "likely_part_identifications": [
      {
        "observedObject": "",
        "likelyKnownPart": null,
        "confidence": 0,
        "basis": "collector_knowledge | inference | unknown",
        "reasoning": ""
      }
    ],
    "unknown_observations": [],
    "suggested_condition_classes": ["LOOSE"],
    "popularity_level": "unknown",
    "rarity_level": "unknown",
    "collector_importance": "unknown",
    "collector_hidden_gem_level": "unknown",
    "completion_importance": "unknown",
    "confidence": {
      "identity": 0,
      "relevance": 0,
      "aliases": 0,
      "traits": 0,
      "parts": 0,
      "observed_objects": 0,
      "accessory_identification": 0,
      "completeness": null
    },
    "reasoning": [],
    "missing_information": [],
    "evidence_summary": {
      "observed_by_vision": [],
      "seller_claims": [],
      "collector_knowledge": [],
      "graph": {
        "approved_relationships": [],
        "inverse_relationships": [],
        "known_included_entities": [],
        "known_role_relationships": []
      },
      "inferences": [],
      "images": [],
      "text": [],
      "listing_claims": [],
      "database": []
    },
    "recommended_human_review": "",
    "notes": ""
  }
}

Listing input:
${JSON.stringify(input, null, 2)}

Vision Observation pass:
${JSON.stringify(vision, null, 2)}

Existing Collector Knowledge context:
${JSON.stringify(context, null, 2)}
`;
}

function parseAiJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

function sanitizeAliases(values: unknown): CollectorBuilderAliasProposal[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((alias: any) => ({
      alias: String(alias?.alias || "").trim(),
      aliasType: sanitizeAliasType(String(alias?.aliasType || "search")),
      confidence: clampConfidence(alias?.confidence),
      reasoning: String(alias?.reasoning || ""),
    }))
    .filter((alias) => alias.alias);
}

function sanitizeTraits(values: unknown): CollectorBuilderTraitProposal[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((trait: any) => ({
      traitName: normalizeCollectorText(String(trait?.traitName || "")),
      traitValue: String(trait?.traitValue || "").trim(),
      confidence: clampConfidence(trait?.confidence),
      reasoning: String(trait?.reasoning || ""),
    }))
    .map((trait) => {
      const combined = `${trait.traitName} ${trait.traitValue} ${trait.reasoning}`.toLowerCase();

      if (
        trait.traitName.includes("claim") ||
        combined.includes("seller claim") ||
        combined.includes("listing claims") ||
        combined.includes("title claims")
      ) {
        return {
          ...trait,
          traitName: "listing_claim",
        };
      }

      return trait;
    })
    .filter((trait) => trait.traitName && trait.traitValue);
}

function sanitizeParts(values: unknown) {
  if (!Array.isArray(values)) {
    return {
      parts: [] as CollectorBuilderPartProposal[],
      rejectedGenericParts: [] as string[],
    };
  }

  const rejectedGenericParts: string[] = [];
  const parts = values
    .map((part: any) => ({
      partName: String(part?.partName || "").trim(),
      requiredForComplete: Boolean(part?.requiredForComplete),
      frequentlyMissing: Boolean(part?.frequentlyMissing),
      valueImpactLevel: sanitizeLevel(
        part?.valueImpactLevel,
        ["none", "low", "medium", "high", "critical", "unknown"],
        "unknown"
      ),
      confidence: clampConfidence(part?.confidence),
      reasoning: String(part?.reasoning || ""),
    }))
    .filter((part) => {
      if (!part.partName) {
        return false;
      }

      if (isGenericPartName(part.partName)) {
        rejectedGenericParts.push(part.partName);
        return false;
      }

      return true;
    });

  return { parts, rejectedGenericParts };
}

function sanitizeImageEvidence(values: unknown, imageAccess: CollectorBuilderImageEvidence[]) {
  const byUrl = new Map(imageAccess.map((image) => [image.url, image]));
  const rawImages = Array.isArray(values) ? values : [];
  const sanitized: CollectorBuilderImageEvidence[] = rawImages
    .map((image: any) => {
      const url = String(image?.url || "").trim();
      const preflight = byUrl.get(url);
      const rawStatus = String(image?.status || preflight?.status || "not_analyzed");
      const status = ["analyzed", "unavailable", "not_analyzed"].includes(rawStatus)
        ? (rawStatus as CollectorBuilderImageEvidence["status"])
        : "not_analyzed";

      return {
        url,
        status: preflight?.status === "unavailable" ? "unavailable" : status,
        observations: stringList(image?.observations),
        limitations: stringList(image?.limitations),
        error: preflight?.error || (image?.error ? String(image.error) : undefined),
      };
    })
    .filter((image) => image.url);

  for (const image of imageAccess) {
    if (!sanitized.some((entry) => entry.url === image.url)) {
      sanitized.push(image);
    }
  }

  return sanitized;
}

function sanitizeObservedObjects(
  values: unknown,
  validImageUrls: string[] = []
): CollectorBuilderObservedObject[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowedCategories = [
    "figure",
    "creature",
    "vehicle",
    "accessory",
    "weapon_like",
    "paperwork",
    "packaging",
    "unknown",
  ];

  return values
    .map((object: any) => {
      const rawCategory = String(object?.category || "unknown");

      return {
        label: scrubVisionOnlyName(String(object?.label || "").trim()),
        category: allowedCategories.includes(rawCategory)
          ? (rawCategory as CollectorBuilderObservedObject["category"])
          : "unknown",
        quantity: Math.max(1, Math.floor(Number(object?.quantity) || 1)),
        color: object?.color ? String(object.color).trim() : null,
        confidence: clampConfidence(object?.confidence),
        sourceImageUrl:
          object?.sourceImageUrl &&
          validImageUrls.includes(String(object.sourceImageUrl).trim())
            ? String(object.sourceImageUrl).trim()
            : null,
        notes: scrubVisionOnlyName(String(object?.notes || "")),
      };
    })
    .filter((object) => object.label);
}

function sanitizeVisionResult(
  raw: any,
  imageAccess: CollectorBuilderImageEvidence[]
): CollectorBuilderVisionResult {
  return {
    observed_objects: sanitizeObservedObjects(
      raw?.observed_objects,
      imageAccess.map((image) => image.url)
    ),
    seller_claims: stringList(raw?.seller_claims),
    image_evidence: sanitizeImageEvidence(raw?.image_evidence, imageAccess),
    limitations: stringList(raw?.limitations),
  };
}

function sanitizeKnownParts(values: unknown): CollectorBuilderKnownPart[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((part: any) => ({
      collectorItemId: String(part?.collectorItemId || "").trim(),
      name: String(part?.name || "").trim(),
      itemType: String(part?.itemType || "unknown").trim(),
      requiredForComplete: Boolean(part?.requiredForComplete),
      frequentlyMissing: Boolean(part?.frequentlyMissing),
      valueImpactLevel: String(part?.valueImpactLevel || "unknown").trim(),
      aliases: stringList(part?.aliases),
      traits: stringList(part?.traits),
    }))
    .filter((part) => part.collectorItemId && part.name);
}

function sanitizeKnownRelatedEntities(
  values: unknown
): CollectorBuilderKnownRelatedEntity[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const validDirections = ["outgoing", "incoming"];

  return values
    .map((entity: any) => ({
      collectorItemId: String(entity?.collectorItemId || "").trim(),
      name: String(entity?.name || "").trim(),
      itemType: String(entity?.itemType || "unknown").trim(),
      relationshipType: String(
        entity?.relationshipType || "includes"
      ) as CollectorRelationshipType,
      direction: validDirections.includes(String(entity?.direction))
        ? (String(entity.direction) as "outgoing" | "incoming")
        : "outgoing",
      confidence: clampConfidence(entity?.confidence),
      requiredForComplete:
        entity?.requiredForComplete === undefined
          ? null
          : Boolean(entity.requiredForComplete),
      valueImpactLevel:
        entity?.valueImpactLevel === undefined || entity?.valueImpactLevel === null
          ? null
          : String(entity.valueImpactLevel),
      quantity: Math.max(1, Math.floor(Number(entity?.quantity) || 1)),
    }))
    .filter((entity) => entity.collectorItemId && entity.name);
}

function sanitizeKnowledgeMatches(values: unknown): CollectorBuilderKnowledgeMatch[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((match: any) => ({
      collectorItemId: String(match?.collectorItemId || "").trim(),
      name: String(match?.name || "").trim(),
      toyline: match?.toyline ? String(match.toyline).trim() : null,
      itemType: String(match?.itemType || "unknown").trim(),
      confidence: clampConfidence(match?.confidence),
      matchBasis: stringList(match?.matchBasis),
      knownAliases: stringList(match?.knownAliases),
      knownTraits: stringList(match?.knownTraits),
      knownConditionClasses: stringList(match?.knownConditionClasses),
      knownParts: sanitizeKnownParts(match?.knownParts),
      knownRelatedEntities: sanitizeKnownRelatedEntities(
        match?.knownRelatedEntities
      ),
    }))
    .filter((match) => match.collectorItemId && match.name);
}

function sanitizeLikelyPartIdentifications(
  values: unknown,
  knowledgeMatches: CollectorBuilderKnowledgeMatch[]
): CollectorBuilderLikelyPartIdentification[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const knownPartNames = new Set(
    knowledgeMatches
      .flatMap((match) => match.knownParts)
      .map((part) => normalizeCollectorText(part.name))
  );

  return values
    .map((identification: any) => {
      const likelyKnownPart = identification?.likelyKnownPart
        ? String(identification.likelyKnownPart).trim()
        : null;
      const hasKnownPart =
        likelyKnownPart !== null &&
        knownPartNames.has(normalizeCollectorText(likelyKnownPart));

      return {
        observedObject: scrubVisionOnlyName(
          String(identification?.observedObject || "").trim()
        ),
        likelyKnownPart: hasKnownPart ? likelyKnownPart : null,
        confidence: hasKnownPart ? clampConfidence(identification?.confidence) : 0,
        basis: hasKnownPart ? "collector_knowledge" : "unknown",
        reasoning: hasKnownPart
          ? String(identification?.reasoning || "")
          : "No Collector Knowledge part matched this observation.",
      } satisfies CollectorBuilderLikelyPartIdentification;
    })
    .filter((identification) => identification.observedObject);
}

function graphRelationshipLabel(
  match: CollectorBuilderKnowledgeMatch,
  entity: CollectorBuilderKnownRelatedEntity
) {
  return entity.direction === "outgoing"
    ? `${match.name} --${entity.relationshipType}--> ${entity.name}`
    : `${entity.name} --${entity.relationshipType}--> ${match.name}`;
}

function buildGraphEvidenceFromMatches(
  matches: CollectorBuilderKnowledgeMatch[]
) {
  const approvedRelationships: string[] = [];
  const inverseRelationships: string[] = [];
  const knownIncludedEntities: string[] = [];
  const knownRoleRelationships: string[] = [];

  for (const match of matches) {
    for (const entity of match.knownRelatedEntities || []) {
      const label = graphRelationshipLabel(match, entity);
      approvedRelationships.push(label);

      if (entity.direction === "incoming") {
        inverseRelationships.push(label);
      }

      if (entity.direction === "outgoing" && entity.relationshipType === "includes") {
        knownIncludedEntities.push(entity.name);
      }

      if (
        ["rider_for", "driver_for", "weapon_for"].includes(
          entity.relationshipType
        )
      ) {
        knownRoleRelationships.push(label);
      }
    }
  }

  return {
    approved_relationships: uniqueValues(approvedRelationships),
    inverse_relationships: uniqueValues(inverseRelationships),
    known_included_entities: uniqueValues(knownIncludedEntities),
    known_role_relationships: uniqueValues(knownRoleRelationships),
  };
}

function isCompatibleObservedEntity(
  observed: CollectorBuilderObservedObject,
  entity: CollectorBuilderKnownRelatedEntity
) {
  const observedText = normalizeCollectorText(
    [observed.label, observed.category, observed.color, observed.notes]
      .filter(Boolean)
      .join(" ")
  );
  const entityText = normalizeCollectorText(
    [entity.name, entity.itemType].filter(Boolean).join(" ")
  );
  const genericEntityTokens = new Set([
    "accessory",
    "creature",
    "dinosaur",
    "driver",
    "figure",
    "rider",
    "vehicle",
  ]);
  const distinctiveEntityTokens = entityText
    .split(" ")
    .filter((token) => token.length >= 4 && !genericEntityTokens.has(token));

  return (
    (entityText.length >= 4 && observedText.includes(entityText)) ||
    distinctiveEntityTokens
      .some((token) => observedText.includes(token))
  );
}

function buildGraphLikelyIdentifications(
  observedObjects: CollectorBuilderObservedObject[],
  knowledgeMatches: CollectorBuilderKnowledgeMatch[]
): CollectorBuilderLikelyPartIdentification[] {
  const outgoingIncludedEntities = knowledgeMatches.flatMap((match) =>
    (match.knownRelatedEntities || [])
      .filter(
        (entity) =>
          entity.direction === "outgoing" && entity.relationshipType === "includes"
      )
      .map((entity) => ({ match, entity }))
  );
  const identifications: CollectorBuilderLikelyPartIdentification[] = [];

  for (const observed of observedObjects) {
    if (!["creature", "figure"].includes(observed.category)) {
      continue;
    }

    const compatible = outgoingIncludedEntities.find(({ entity }) =>
      isCompatibleObservedEntity(observed, entity)
    );

    if (!compatible) {
      continue;
    }

    identifications.push({
      observedObject: observed.label,
      likelyKnownPart: compatible.entity.name,
      confidence: Math.min(observed.confidence, compatible.entity.confidence || 1),
      basis: "collector_knowledge",
      reasoning: `${observed.label} is compatible with approved graph relationship ${compatible.match.name} --${compatible.entity.relationshipType}--> ${compatible.entity.name}.`,
    });
  }

  return identifications;
}

function sanitizeEvidenceSummary(
  raw: any,
  imageAccess: CollectorBuilderImageEvidence[]
): CollectorBuilderEvidenceSummary {
  return {
    observed_by_vision: stringList(raw?.observed_by_vision),
    seller_claims: stringList(raw?.seller_claims),
    collector_knowledge: stringList(raw?.collector_knowledge),
    graph: {
      approved_relationships: stringList(raw?.graph?.approved_relationships),
      inverse_relationships: stringList(raw?.graph?.inverse_relationships),
      known_included_entities: stringList(raw?.graph?.known_included_entities),
      known_role_relationships: stringList(raw?.graph?.known_role_relationships),
    },
    inferences: stringList(raw?.inferences),
    images: sanitizeImageEvidence(raw?.images, imageAccess),
    text: stringList(raw?.text),
    listing_claims: stringList(raw?.listing_claims),
    database: stringList(raw?.database),
  };
}

function mergeKnowledgeMatches(
  deterministicMatches: CollectorBuilderKnowledgeMatch[],
  aiMatches: CollectorBuilderKnowledgeMatch[]
) {
  const merged = new Map<string, CollectorBuilderKnowledgeMatch>();

  for (const match of deterministicMatches) {
    merged.set(match.collectorItemId, match);
  }

  for (const aiMatch of aiMatches) {
    const existing = merged.get(aiMatch.collectorItemId);

    if (!existing) {
      merged.set(aiMatch.collectorItemId, aiMatch);
      continue;
    }

    merged.set(aiMatch.collectorItemId, {
      ...existing,
      confidence: Math.max(existing.confidence, aiMatch.confidence),
      matchBasis: uniqueValues([...existing.matchBasis, ...aiMatch.matchBasis]),
      knownAliases: uniqueValues([...existing.knownAliases, ...aiMatch.knownAliases]),
      knownTraits: uniqueValues([...existing.knownTraits, ...aiMatch.knownTraits]),
      knownConditionClasses: uniqueValues([
        ...existing.knownConditionClasses,
        ...aiMatch.knownConditionClasses,
      ]),
      knownParts:
        existing.knownParts.length > 0 ? existing.knownParts : aiMatch.knownParts,
      knownRelatedEntities:
        existing.knownRelatedEntities.length > 0
          ? existing.knownRelatedEntities
          : aiMatch.knownRelatedEntities,
    });
  }

  return [...merged.values()];
}

function hasConfirmedCompletenessEvidence(
  evidenceSummary: CollectorBuilderEvidenceSummary,
  traits: CollectorBuilderTraitProposal[]
) {
  const confirmedEvidence = [
    ...evidenceSummary.images.flatMap((image) => image.observations),
    ...evidenceSummary.collector_knowledge,
    ...evidenceSummary.database,
    ...traits
      .filter((trait) => !trait.traitName.includes("listing_claim"))
      .map((trait) => `${trait.traitName} ${trait.traitValue} ${trait.reasoning}`),
  ]
    .join(" ")
    .toLowerCase();

  return (
    confirmedEvidence.includes("all required") ||
    confirmedEvidence.includes("complete verified") ||
    confirmedEvidence.includes("collector knowledge confirms") ||
    confirmedEvidence.includes("exact required parts visible")
  );
}

function detectToylineBrandConflict(
  input: CollectorBuilderInput,
  vision: CollectorBuilderVisionResult
) {
  const requestedToyline = normalizeCollectorText(input.toyline || "");
  const allowedBrands = TOYLINE_ALLOWED_BRANDS[requestedToyline];

  if (!allowedBrands) {
    return null;
  }

  const visibleEvidence = [
    input.title,
    input.subtitle || "",
    ...vision.seller_claims,
    ...vision.observed_objects.flatMap((object) => [object.label, object.notes]),
    ...vision.image_evidence.flatMap((image) => image.observations),
  ].join(" ");

  const detected = EXPLICIT_BRANDS.find(
    (brand) =>
      brand.pattern.test(visibleEvidence) &&
      !allowedBrands.includes(normalizeCollectorText(brand.name))
  );

  return detected?.name || null;
}

function detectWrongProductType(
  input: CollectorBuilderInput,
  vision: CollectorBuilderVisionResult
) {
  const evidence = [
    input.title,
    input.subtitle || "",
    ...vision.observed_objects.flatMap((object) => [object.label, object.notes]),
    ...vision.image_evidence.flatMap((image) => image.observations),
  ].join(" ");

  return OUT_OF_SCOPE_MEDIA_PATTERN.test(evidence);
}

function sanitizeProposal(
  raw: any,
  input: CollectorBuilderInput,
  imageAccess: CollectorBuilderImageEvidence[],
  vision: CollectorBuilderVisionResult,
  knowledgeMatches: CollectorBuilderKnowledgeMatch[],
  approvedLearningPatterns: ApprovedLearningPattern[]
) {
  const aliases = sanitizeAliases(raw?.suggested_aliases);
  const traits = sanitizeTraits(raw?.suggested_traits);
  const { parts, rejectedGenericParts } = sanitizeParts(raw?.suggested_parts);
  const confidence = raw?.confidence || {};
  const toylineBrandConflict = detectToylineBrandConflict(input, vision);
  const wrongProductType = detectWrongProductType(input, vision);
  const outOfScope = Boolean(toylineBrandConflict || wrongProductType);
  const scopeStatus: CollectorBuilderProposal["scope_status"] = toylineBrandConflict
    ? "wrong_toyline"
    : wrongProductType
      ? "wrong_product_type"
      : "in_scope";
  const evidenceSummary = sanitizeEvidenceSummary(raw?.evidence_summary, imageAccess);
  const sanitizedKnowledgeMatches = mergeKnowledgeMatches(
    knowledgeMatches,
    sanitizeKnowledgeMatches(raw?.collector_knowledge_matches)
  );
  const knownAliasValues = new Set(
    sanitizedKnowledgeMatches
      .flatMap((match) => match.knownAliases)
      .map((alias) => normalizeCollectorText(alias))
  );
  const knownTraitValues = new Set(
    sanitizedKnowledgeMatches
      .flatMap((match) => match.knownTraits)
      .map((trait) => normalizeCollectorText(trait.replace(":", "=")))
  );
  const newAliases = aliases.filter(
    (alias) => !knownAliasValues.has(normalizeCollectorText(alias.alias))
  );
  const newTraits = traits.filter(
    (trait) =>
      !knownTraitValues.has(
        normalizeCollectorText(`${trait.traitName}=${trait.traitValue}`)
      )
  );
  const knownPartNames = new Set(
    sanitizedKnowledgeMatches
      .flatMap((match) => match.knownParts)
      .map((part) => normalizeCollectorText(part.name))
  );
  const knowledgeBackedParts = parts.filter((part) =>
    knownPartNames.has(normalizeCollectorText(part.partName))
  );
  const rejectedUnbackedParts = parts
    .filter((part) => !knownPartNames.has(normalizeCollectorText(part.partName)))
    .map((part) => part.partName);
  const observedObjects =
    sanitizeObservedObjects(
      raw?.observed_objects,
      imageAccess.map((image) => image.url)
    ).length > 0
      ? sanitizeObservedObjects(
          raw?.observed_objects,
          imageAccess.map((image) => image.url)
        )
      : vision.observed_objects;
  const aiLikelyPartIdentifications = sanitizeLikelyPartIdentifications(
    raw?.likely_part_identifications,
    sanitizedKnowledgeMatches
  );
  const graphLikelyPartIdentifications = buildGraphLikelyIdentifications(
    observedObjects,
    sanitizedKnowledgeMatches
  );
  const likelyPartIdentifications = [
    ...graphLikelyPartIdentifications,
    ...aiLikelyPartIdentifications.filter(
      (identification) =>
        !graphLikelyPartIdentifications.some(
          (graphIdentification) =>
            normalizeCollectorText(graphIdentification.observedObject) ===
            normalizeCollectorText(identification.observedObject)
        )
    ),
  ];
  const graphEvidence = buildGraphEvidenceFromMatches(sanitizedKnowledgeMatches);
  const hasDatabaseEvidence =
    evidenceSummary.collector_knowledge.length > 0 ||
    evidenceSummary.database.length > 0 ||
    sanitizedKnowledgeMatches.length > 0;
  const scrubEvidenceText = (value: string) =>
    scrubUnsupportedKnownClaim(value, hasDatabaseEvidence);
  const rawConditionClasses = sanitizeConditionClasses(raw?.suggested_condition_classes);
  const itemType = sanitizeItemType(raw?.item_type);
  const conditionClasses =
    rawConditionClasses.includes("COMPLETE") &&
    !hasConfirmedCompletenessEvidence(evidenceSummary, traits)
      ? uniqueValues(
          rawConditionClasses.filter((condition) => condition !== "COMPLETE")
        )
      : rawConditionClasses;
  const missingInformation = stringList(raw?.missing_information);

  if (rejectedGenericParts.length > 0) {
    missingInformation.push(
      `Exact accessory list unknown; rejected vague part proposal(s): ${rejectedGenericParts.join(
        ", "
      )}.`
    );
  }
  if (rejectedUnbackedParts.length > 0) {
    missingInformation.push(
      `Collector Knowledge did not confirm proposed part name(s): ${rejectedUnbackedParts.join(
        ", "
      )}.`
    );
  }
  if (toylineBrandConflict) {
    missingInformation.push(
      `wrong_toyline: visible brand ${toylineBrandConflict} conflicts with requested toyline ${input.toyline}.`
    );
  }
  if (wrongProductType) {
    missingInformation.push(
      "wrong_product_type: listing is media or printed material, not a physical toy item."
    );
  }

  const rawUnknownObservations = stringList(raw?.unknown_observations).map(
    scrubVisionOnlyName
  );
  const knownObservedObjects = new Set(
    likelyPartIdentifications
      .filter((identification) => identification.likelyKnownPart)
      .map((identification) => normalizeCollectorText(identification.observedObject))
  );
  const unknownObservations = uniqueValues([
    ...rawUnknownObservations,
    ...observedObjects
      .filter(
        (object) =>
          !knownObservedObjects.has(normalizeCollectorText(object.label)) &&
          ["accessory", "weapon_like", "unknown"].includes(object.category)
      )
      .map((object) => object.label),
  ]);
  const rawItemName = String(raw?.item_name || input.title || "Unknown").trim();
  const learnedName = applyApprovedNamePatterns(
    rawItemName,
    itemType,
    conditionClasses as CollectorConditionClass[],
    approvedLearningPatterns
  );
  const normalizedItemName = normalizeCollectorProposalName({
    rawName: learnedName.name,
    input,
    itemType,
    conditionClasses: conditionClasses as CollectorConditionClass[],
    observedObjects,
    likelyPartIdentifications,
  });
  const movedGimmickTraits = extractCatalogGimmicks(
    rawItemName,
    input.title,
    input.subtitle,
    input.description
  )
    .filter(
      (gimmick) =>
        !knownTraitValues.has(normalizeCollectorText(`gimmick=${gimmick}`)) &&
        !newTraits.some(
          (trait) =>
            normalizeCollectorText(trait.traitName) === "gimmick" &&
            normalizeCollectorText(trait.traitValue) ===
              normalizeCollectorText(gimmick)
        )
    )
    .map((gimmick) => ({
      traitName: "gimmick",
      traitValue: gimmick,
      confidence: 0.8,
      reasoning:
        "Moved catalog/action-feature wording out of the primary item name per Collector Naming Standard.",
    }));
  const finalTraits = [...newTraits, ...movedGimmickTraits];

  if (normalizedItemName !== rawItemName) {
    missingInformation.push(
      `Primary name normalized from "${rawItemName}" to "${normalizedItemName}" using Collector Naming Standard.`
    );
  }

  return {
    scope_status: scopeStatus,
    toyline: String(raw?.toyline || input.toyline || "Unknown").trim(),
    item_name: normalizedItemName,
    item_type: itemType,
    manufacturer: outOfScope
      ? null
      : raw?.manufacturer
        ? String(raw.manufacturer)
        : input.manufacturer || null,
    release_year: outOfScope
      ? null
      : Number.isFinite(Number(raw?.release_year))
        ? Number(raw.release_year)
        : input.releaseYear || null,
    parent_item: raw?.parent_item ? String(raw.parent_item) : null,
    suggested_aliases: newAliases.map((alias) => ({
      ...alias,
      reasoning: scrubEvidenceText(alias.reasoning),
    })),
    suggested_traits: finalTraits.map((trait) => ({
      ...trait,
      reasoning: scrubEvidenceText(trait.reasoning),
    })),
    suggested_parts: knowledgeBackedParts.map((part) => ({
      ...part,
      reasoning: scrubEvidenceText(part.reasoning),
    })),
    observed_objects: observedObjects,
    collector_knowledge_matches: sanitizedKnowledgeMatches,
    likely_part_identifications: likelyPartIdentifications.map((identification) => ({
      ...identification,
      reasoning: scrubEvidenceText(identification.reasoning),
    })),
    unknown_observations: unknownObservations,
    suggested_condition_classes:
      conditionClasses.length > 0
        ? (conditionClasses as CollectorConditionClass[])
        : ["UNKNOWN"],
    popularity_level: sanitizeLevel(
      raw?.popularity_level,
      ["very_low", "low", "medium", "high", "very_high", "unknown"],
      "unknown"
    ),
    rarity_level: sanitizeLevel(
      raw?.rarity_level,
      ["common", "uncommon", "rare", "very_rare", "grail", "unknown"],
      "unknown"
    ),
    collector_importance: sanitizeLevel(
      raw?.collector_importance,
      ["low", "medium", "high", "essential", "unknown"],
      "unknown"
    ),
    collector_hidden_gem_level: sanitizeLevel(
      raw?.collector_hidden_gem_level,
      ["low", "medium", "high", "very_high", "unknown"],
      "unknown"
    ),
    completion_importance: sanitizeLevel(
      raw?.completion_importance,
      ["low", "medium", "high", "critical", "unknown"],
      "unknown"
    ),
    confidence: {
      identity: toylineBrandConflict
        ? Math.min(0.3, clampConfidence(confidence.identity))
        : clampConfidence(confidence.identity),
      relevance: wrongProductType
        ? Math.min(
            0.2,
            confidence.relevance === undefined
              ? 0.2
              : clampConfidence(confidence.relevance)
          )
        : toylineBrandConflict
          ? Math.min(
              0.3,
              confidence.relevance === undefined
                ? 0.3
                : clampConfidence(confidence.relevance)
            )
          : confidence.relevance === undefined
            ? clampConfidence(confidence.identity)
            : clampConfidence(confidence.relevance),
      aliases:
        confidence.aliases === undefined
          ? averageConfidence(newAliases.map((alias) => alias.confidence))
          : clampConfidence(confidence.aliases),
      traits:
        confidence.traits === undefined
          ? averageConfidence(finalTraits.map((trait) => trait.confidence))
          : clampConfidence(confidence.traits),
      parts:
        knowledgeBackedParts.length === 0
          ? 0
          : confidence.parts === undefined
            ? averageConfidence(knowledgeBackedParts.map((part) => part.confidence))
            : clampConfidence(confidence.parts),
      observed_objects:
        confidence.observed_objects === undefined
          ? averageConfidence(observedObjects.map((object) => object.confidence))
          : clampConfidence(confidence.observed_objects),
      accessory_identification:
        likelyPartIdentifications.some(
          (identification) => identification.likelyKnownPart
        )
          ? confidence.accessory_identification === undefined
            ? averageConfidence(
                likelyPartIdentifications.map(
                  (identification) => identification.confidence
                )
              )
            : clampConfidence(confidence.accessory_identification)
          : 0,
      completeness:
        confidence.completeness === null || confidence.completeness === undefined
          ? null
          : clampConfidence(confidence.completeness),
    },
    reasoning: uniqueValues([
      ...(toylineBrandConflict
        ? [`Visible brand ${toylineBrandConflict} conflicts with requested toyline ${input.toyline}; identity confidence capped at 30%.`]
        : []),
      ...(wrongProductType
        ? ["Visible product is printed/media material rather than a physical toy; relevance capped at 20%."]
        : []),
      ...stringList(raw?.reasoning)
        .filter(
          (value) =>
            !outOfScope ||
            !/collector knowledge|collector brain|known relation|\btyco\b|inferred from toyline|active from 19/i.test(
              value
            )
        )
        .map(scrubEvidenceText),
    ]),
    missing_information: uniqueValues(missingInformation),
    evidence_summary: {
      ...evidenceSummary,
      observed_by_vision: uniqueValues([
        ...evidenceSummary.observed_by_vision,
        ...observedObjects.map((object) => object.label),
      ]).map((value) => scrubEvidenceText(scrubVisionOnlyName(value))),
      seller_claims: uniqueValues([
        ...evidenceSummary.seller_claims,
        ...vision.seller_claims,
      ]).map(scrubEvidenceText),
      collector_knowledge: outOfScope
        ? []
        : evidenceSummary.collector_knowledge.map(scrubEvidenceText),
      graph: {
        approved_relationships: outOfScope ? [] : uniqueValues([
          ...evidenceSummary.graph.approved_relationships,
          ...graphEvidence.approved_relationships,
        ]).map(scrubEvidenceText),
        inverse_relationships: outOfScope ? [] : uniqueValues([
          ...evidenceSummary.graph.inverse_relationships,
          ...graphEvidence.inverse_relationships,
        ]).map(scrubEvidenceText),
        known_included_entities: outOfScope ? [] : uniqueValues([
          ...evidenceSummary.graph.known_included_entities,
          ...graphEvidence.known_included_entities,
        ]).map(scrubEvidenceText),
        known_role_relationships: outOfScope ? [] : uniqueValues([
          ...evidenceSummary.graph.known_role_relationships,
          ...graphEvidence.known_role_relationships,
        ]).map(scrubEvidenceText),
      },
      text: evidenceSummary.text.map(scrubEvidenceText),
      images: evidenceSummary.images.map((image) => ({
        ...image,
        observations: image.observations.map((value) =>
          scrubEvidenceText(scrubVisionOnlyName(value))
        ),
        limitations: image.limitations.map((value) =>
          scrubEvidenceText(scrubVisionOnlyName(value))
        ),
      })),
      listing_claims: evidenceSummary.listing_claims.map(scrubEvidenceText),
      inferences: evidenceSummary.inferences.map(scrubEvidenceText),
      database: evidenceSummary.database.map(scrubEvidenceText),
    },
    recommended_human_review: outOfScope
      ? toylineBrandConflict
        ? `Reject or reclassify: wrong_toyline (${toylineBrandConflict}).`
        : "Reject or reclassify: wrong_product_type."
      : scrubEvidenceText(String(raw?.recommended_human_review || "")),
    notes: scrubEvidenceText(String(raw?.notes || "")),
    consulted_learning_pattern_ids: approvedLearningPatterns.map((pattern) => pattern.id),
    applied_learning_patterns: learnedName.applied,
  } satisfies CollectorBuilderProposal;
}

function sanitizeAiResult(
  raw: any,
  input: CollectorBuilderInput,
  existingItems: ExistingCollectorItem[],
  imageAccess: CollectorBuilderImageEvidence[],
  vision: CollectorBuilderVisionResult,
  knowledgeMatches: CollectorBuilderKnowledgeMatch[],
  approvedLearningPatterns: ApprovedLearningPattern[]
): Omit<CollectorBuilderResult, "storedSuggestionIds" | "candidateCount"> {
  const matchStatus = ["match", "possible_match", "new_proposal"].includes(
    raw?.matchStatus
  )
    ? raw.matchStatus
    : "new_proposal";
  let existingItem =
    typeof raw?.existingCollectorItemId === "string"
      ? existingItems.find((item) => item.id === raw.existingCollectorItemId) ||
        null
      : null;
  const unsupportedMakoIdentity =
    !listingSupportsMakoIdentity(input) &&
    (Boolean(existingItem && /\bmako\b/i.test(existingItem.name)) ||
      /\bmako\b/i.test(String(raw?.proposal?.item_name || "")));

  if (unsupportedMakoIdentity) {
    existingItem = null;
  }

  const rawProposal = unsupportedMakoIdentity
    ? {
        ...(raw?.proposal || {}),
        item_name: "Unknown loose figure",
        missing_information: uniqueValues([
          ...stringList(raw?.proposal?.missing_information),
          "Exact figure identity unresolved; Mako was rejected because color or outfit alone is insufficient identity evidence.",
        ]),
      }
    : raw?.proposal || {};
  const proposal = sanitizeProposal(
    rawProposal,
    input,
    imageAccess,
    vision,
    knowledgeMatches,
    approvedLearningPatterns
  );

  return {
    action:
      existingItem && matchStatus !== "new_proposal"
        ? "review_existing_match"
        : "review_new_collector_item",
    matchStatus: existingItem ? matchStatus : "new_proposal",
    existing_item: existingItem
      ? {
          id: existingItem.id,
          toyline: getToylineName(existingItem),
          itemName: existingItem.name,
          itemType: existingItem.item_type,
          manufacturer: existingItem.manufacturer,
          releaseYear: existingItem.release_year,
          seriesOrWave: existingItem.series_or_wave,
        }
      : null,
    proposal,
    observed_objects: proposal.observed_objects,
    collector_knowledge_matches: proposal.collector_knowledge_matches,
    likely_part_identifications: proposal.likely_part_identifications,
    unknown_observations: proposal.unknown_observations,
  };
}

async function runVisionObservation({
  input,
  imageAccess,
  openai,
}: {
  input: CollectorBuilderInput;
  imageAccess: CollectorBuilderImageEvidence[];
  openai: OpenAI;
}) {
  const prompt = buildVisionObservationPrompt(input, imageAccess);
  const availableImages = imageAccess.filter(
    (image) => image.status === "analyzed"
  );
  const messageContent: any[] = [
    {
      type: "text",
      text: prompt,
    },
    ...availableImages.map((image) => ({
      type: "image_url",
      image_url: {
        url: image.url,
        detail: "high",
      },
    })),
  ];
  let response;

  try {
    response = await openai.chat.completions.create({
      model: process.env.COLLECTOR_BUILDER_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [{ role: "user", content: messageContent }] as any,
    });
  } catch (error) {
    if (availableImages.length === 0) {
      throw error;
    }

    const failure = error instanceof Error ? error.message : "Image analysis failed.";
    for (const image of availableImages) {
      image.status = "unavailable";
      image.error = `Vision fallback: ${failure}`;
      image.limitations = uniqueValues([
        ...image.limitations,
        "OpenAI could not download this image; proposal continued without visual evidence.",
      ]);
    }

    response = await openai.chat.completions.create({
      model: process.env.COLLECTOR_BUILDER_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: buildVisionObservationPrompt(input, imageAccess) }],
        },
      ] as any,
    });
  }
  const content = response.choices[0]?.message.content || "{}";

  return sanitizeVisionResult(parseAiJson(content), imageAccess);
}

async function runCollectorAiProposal({
  input,
  context,
  items,
  imageAccess,
  vision,
  knowledgeMatches,
  approvedLearningPatterns,
  openai,
}: {
  input: CollectorBuilderInput;
  context: ReturnType<typeof compactCollectorContext>;
  items: ExistingCollectorItem[];
  imageAccess: CollectorBuilderImageEvidence[];
  vision: CollectorBuilderVisionResult;
  knowledgeMatches: CollectorBuilderKnowledgeMatch[];
  approvedLearningPatterns: ApprovedLearningPattern[];
  openai: OpenAI;
}) {
  const prompt = buildCollectorBuilderPrompt(input, context, vision);
  const response = await openai.chat.completions.create({
    model: process.env.COLLECTOR_BUILDER_MODEL || "gpt-4.1-mini",
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  const content = response.choices[0]?.message.content || "{}";

  return sanitizeAiResult(
    parseAiJson(content),
    input,
    items,
    imageAccess,
    vision,
    knowledgeMatches,
    approvedLearningPatterns
  );
}

async function storeOrStrengthenProposalSuggestion({
  supabase,
  input,
  result,
}: {
  supabase: SupabaseClient;
  input: CollectorBuilderInput;
  result: Omit<CollectorBuilderResult, "storedSuggestionIds" | "candidateCount">;
}) {
  if (result.action !== "review_new_collector_item") {
    return [];
  }

  const source = input.source || "collector_builder";
  const reviewConfidence = result.proposal.confidence.relevance;
  const proposalIdentityKey = buildCollectorIdentityKey({
    toylineName: result.proposal.toyline,
    itemName: result.proposal.item_name,
    itemType: result.proposal.item_type,
    releaseYear: result.proposal.release_year,
  });
  const evidence = {
    builder_version: 4,
    suggestion_type: "collector_item_proposal",
    proposal_identity_key: proposalIdentityKey,
    listing: input,
    observed_objects: result.observed_objects,
    collector_knowledge_matches: result.collector_knowledge_matches,
    likely_part_identifications: result.likely_part_identifications,
    unknown_observations: result.unknown_observations,
    proposal: result.proposal,
    match_status: result.matchStatus,
  };
  const lookup = await supabase
    .from("collector_ai_suggestions")
    .select("id,confidence,evidence")
    .eq("status", "suggested")
    .eq("source", source)
    .is("collector_item_id", null)
    .eq("suggested_trait_name", "collector_item_proposal")
    .eq("suggested_trait_value", proposalIdentityKey)
    .maybeSingle();

  if (lookup.error) {
    console.error("Collector Builder proposal lookup failed:", lookup.error);
  }

  if (lookup.data) {
    const existingEvidence = (lookup.data.evidence || {}) as Record<
      string,
      any
    >;
    const repeatCount = Number(existingEvidence.repeat_count || 1) + 1;
    const strengthenedConfidence = Math.min(
      0.99,
      Math.max(
        Number(lookup.data.confidence || 0),
        reviewConfidence
      ) + 0.05
    );
    const update = await supabase
      .from("collector_ai_suggestions")
      .update({
        confidence: strengthenedConfidence,
        evidence: {
          ...existingEvidence,
          ...evidence,
          repeat_count: repeatCount,
          last_repeated_at: new Date().toISOString(),
        },
      })
      .eq("id", lookup.data.id)
      .select("id")
      .single();

    if (update.error) {
      console.error("Collector Builder proposal update failed:", update.error);
      return [];
    }

    return [update.data.id as string];
  }

  const insert = await supabase
    .from("collector_ai_suggestions")
    .insert({
      suggested_trait_name: "collector_item_proposal",
      suggested_trait_value: proposalIdentityKey,
      confidence: reviewConfidence,
      source,
      status: "suggested",
      evidence: {
        ...evidence,
        repeat_count: 1,
      },
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("Collector Builder proposal insert failed:", insert.error);
    return [];
  }

  return [insert.data.id as string];
}

export async function runCollectorBuilder({
  input,
  supabase,
  persistSuggestions = true,
  minimumSuggestionConfidence = 0,
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
}: {
  input: CollectorBuilderInput;
  supabase: SupabaseClient;
  persistSuggestions?: boolean;
  minimumSuggestionConfidence?: number;
  openai?: OpenAI;
}): Promise<CollectorBuilderResult> {
  if (!input.title?.trim()) {
    throw new Error("Collector Builder requires a listing title.");
  }

  if (
    input.imageUrls?.some(
      (url) => !COLLECTOR_MEDIA_TYPES.length || !url?.trim()
    )
  ) {
    throw new Error("Collector Builder received an invalid image URL.");
  }

  const imageAccess = await checkImageAccessForInput(input);
  const vision = await runVisionObservation({
    input,
    imageAccess,
    openai,
  });
  const observedTerms = vision.observed_objects.map((object) => object.label);
  const [toylines, items] = await Promise.all([
    searchExistingToylines(supabase, input, observedTerms),
    searchExistingCollectorItems(supabase, input, observedTerms),
  ]);
  const [knowledgeMatches, approvedLearningPatterns] = await Promise.all([
    buildCollectorKnowledgeMatches(supabase, items),
    loadApprovedLearningPatterns(supabase),
  ]);
  const context = compactCollectorContext(
    toylines,
    items,
    knowledgeMatches,
    approvedLearningPatterns
  );
  const aiResult = await runCollectorAiProposal({
    input,
    context,
    items,
    imageAccess,
    vision,
    knowledgeMatches,
    approvedLearningPatterns,
    openai,
  });
  const shouldPersistSuggestion =
    persistSuggestions &&
    aiResult.proposal.scope_status === "in_scope" &&
    aiResult.proposal.confidence.relevance >= minimumSuggestionConfidence;
  const storedSuggestionIds = shouldPersistSuggestion
    ? await storeOrStrengthenProposalSuggestion({
        supabase,
        input,
        result: aiResult,
      })
    : [];

  return {
    ...aiResult,
    storedSuggestionIds,
    candidateCount: context.items.length,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTOR_APPROVAL_ACTIONS,
  COLLECTOR_CONDITION_CLASSES,
  COLLECTOR_ITEM_TYPES,
  COLLECTOR_LEARNING_CHANGE_TYPES,
  COLLECTOR_LEARNING_SEVERITIES,
  COLLECTOR_RELATIONSHIP_TYPES,
  COLLECTOR_REVIEW_OUTCOMES,
  type CollectorAiSuggestion,
  type CollectorApprovalAction,
  type CollectorConditionClass,
  type CollectorLearningChangeType,
  type CollectorLearningSeverity,
  type CollectorItemType,
  type CollectorRelationshipType,
  type CollectorReviewOutcome,
  type CollectorValueImpactLevel,
} from "@/lib/collector-knowledge";

type JsonRecord = Record<string, unknown>;

export type CollectorApprovalAliasEdit = {
  alias: string;
  aliasType?: string | null;
  weight?: number | null;
  confidence?: number | null;
  notes?: string | null;
};

export type CollectorApprovalTraitEdit = {
  traitName: string;
  traitValue: string;
  confidence?: number | null;
  notes?: string | null;
};

export type CollectorApprovalRelationshipEdit = {
  sourceItemId?: string | null;
  targetItemId?: string | null;
  relationshipType: CollectorRelationshipType | string;
  confidence?: number | null;
  requiredForComplete?: boolean | null;
  valueImpactLevel?: CollectorValueImpactLevel | string | null;
  quantity?: number | null;
  validRegion?: string | null;
  validYearStart?: number | null;
  validYearEnd?: number | null;
  notes?: string | null;
  evidence?: JsonRecord | null;
};

export type CollectorApprovalMediaEdit = {
  imageUrl: string;
  imageType?: string | null;
  confidence?: number | null;
  notes?: string | null;
};

export type CollectorApprovalRelatedEntityEdit = {
  toyline?: string | null;
  itemName: string;
  itemType: CollectorItemType | string;
  manufacturer?: string | null;
  releaseYear?: number | null;
  conditionClasses?: string[] | null;
  notes?: string | null;
  relationship?: CollectorApprovalRelationshipEdit | null;
};

export type CollectorApprovalEdits = {
  reviewOutcome?: CollectorReviewOutcome | string | null;
  toyline?: string | null;
  itemName?: string | null;
  itemType?: CollectorItemType | string | null;
  manufacturer?: string | null;
  releaseYear?: number | null;
  releaseRegion?: string | null;
  seriesOrWave?: string | null;
  parentItemId?: string | null;
  popularityLevel?: string | null;
  rarityLevel?: string | null;
  collectorImportance?: string | null;
  collectorHiddenGemLevel?: string | null;
  completionImportance?: string | null;
  conditionClasses?: string[] | null;
  notes?: string | null;
  aliases?: CollectorApprovalAliasEdit[] | string[] | null;
  traits?: CollectorApprovalTraitEdit[] | null;
  media?: CollectorApprovalMediaEdit[] | null;
  relationships?: CollectorApprovalRelationshipEdit[] | null;
  relatedEntities?: CollectorApprovalRelatedEntityEdit[] | null;
  rejectionReason?: string | null;
  proposal?: JsonRecord | null;
};

export type CollectorApprovalRequest = {
  suggestionId: string;
  action: CollectorApprovalAction;
  reviewerId?: string | null;
  edits?: CollectorApprovalEdits | null;
  targetCollectorItemId?: string | null;
  approvalNotes?: string | null;
  reviewOutcome?: CollectorReviewOutcome | null;
};

export type CollectorApprovalRowRef = {
  table: string;
  id: string;
};

export type CollectorApprovalResult = {
  success: boolean;
  action: CollectorApprovalAction;
  suggestionId: string;
  affectedCollectorItemIds: string[];
  affectedRelationshipIds: string[];
  createdRows: CollectorApprovalRowRef[];
  updatedRows: CollectorApprovalRowRef[];
  warnings: string[];
  auditLogId: string | null;
  learning: {
    reviewOutcome: CollectorReviewOutcome;
    summary: string[];
    eventIds: string[];
    events: CollectorLearningEventDraft[];
  };
};

export type CollectorLearningEventDraft = {
  collectorItemId?: string | null;
  fieldName: string;
  oldValue?: unknown;
  newValue?: unknown;
  changeType: CollectorLearningChangeType;
  severity: CollectorLearningSeverity;
  confidenceBefore?: number | null;
  confidenceAfter?: number | null;
  humanComment?: string | null;
  summary: string;
};

type ApprovalContext = {
  supabase: SupabaseClient;
  request: CollectorApprovalRequest;
  suggestion: CollectorAiSuggestion;
  proposal: JsonRecord;
  warnings: string[];
  createdRows: CollectorApprovalRowRef[];
  updatedRows: CollectorApprovalRowRef[];
  affectedCollectorItemIds: Set<string>;
  affectedRelationshipIds: Set<string>;
  learningEvents: CollectorLearningEventDraft[];
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampConfidence(value: unknown, fallback = 1) {
  const number = numberValue(value) ?? fallback;
  return Math.max(0, Math.min(1, number));
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item)).sort();
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  return value ?? null;
}

function valuesEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeComparableValue(left)) ===
    JSON.stringify(normalizeComparableValue(right))
  );
}

function jsonValue(value: unknown) {
  return value === undefined ? null : value;
}

function confidenceBefore(ctx: ApprovalContext) {
  return clampConfidence(ctx.suggestion.confidence, 0);
}

function sanitizeLearningChangeType(value: string): CollectorLearningChangeType {
  return COLLECTOR_LEARNING_CHANGE_TYPES.includes(
    value as CollectorLearningChangeType
  )
    ? (value as CollectorLearningChangeType)
    : "notes";
}

function sanitizeLearningSeverity(value: string): CollectorLearningSeverity {
  return COLLECTOR_LEARNING_SEVERITIES.includes(
    value as CollectorLearningSeverity
  )
    ? (value as CollectorLearningSeverity)
    : "minor";
}

function reviewOutcomeFromAction(action: CollectorApprovalAction): CollectorReviewOutcome {
  switch (action) {
    case "APPROVE_NEW_ITEM":
      return "PERFECT";
    case "APPROVE_MATCH_UPDATE":
      return "MINOR_EDIT";
    case "EDIT_AND_APPROVE":
      return "MINOR_EDIT";
    case "LINK_TO_EXISTING_ITEM":
      return "LINK_EXISTING";
    case "CREATE_NEW_RELATED_ENTITY":
      return "NEW_ENTITY";
    case "APPROVE_RELATIONSHIP":
      return "ADD_RELATIONSHIP";
    case "REJECT_RELATIONSHIP":
      return "REMOVE_RELATIONSHIP";
    case "REJECT":
      return "REJECT";
  }
}

function sanitizeReviewOutcome(value: unknown, action: CollectorApprovalAction) {
  const outcome = stringValue(value);
  if (
    outcome &&
    COLLECTOR_REVIEW_OUTCOMES.includes(outcome as CollectorReviewOutcome)
  ) {
    return outcome as CollectorReviewOutcome;
  }

  return reviewOutcomeFromAction(action);
}

function reviewOutcome(ctx: ApprovalContext) {
  if (
    ctx.request.action === "EDIT_AND_APPROVE" &&
    Object.keys(ctx.request.edits || {}).some((key) =>
      [
        "toyline",
        "itemName",
        "itemType",
        "manufacturer",
        "releaseYear",
        "conditionClasses",
        "aliases",
        "traits",
        "relationships",
        "relatedEntities",
      ].includes(key)
    ) &&
    !ctx.request.reviewOutcome &&
    !ctx.request.edits?.reviewOutcome
  ) {
    const majorFields = ["toyline", "itemName", "itemType", "relatedEntities"];
    return Object.keys(ctx.request.edits || {}).some((key) =>
      majorFields.includes(key)
    )
      ? "MAJOR_EDIT"
      : "MINOR_EDIT";
  }

  return sanitizeReviewOutcome(
    ctx.request.reviewOutcome || ctx.request.edits?.reviewOutcome,
    ctx.request.action
  );
}

function addLearningEvent(ctx: ApprovalContext, event: CollectorLearningEventDraft) {
  const existing = ctx.learningEvents.some(
    (item) =>
      item.fieldName === event.fieldName &&
      item.changeType === event.changeType &&
      JSON.stringify(item.oldValue ?? null) === JSON.stringify(event.oldValue ?? null) &&
      JSON.stringify(item.newValue ?? null) === JSON.stringify(event.newValue ?? null)
  );

  if (!existing) {
    ctx.learningEvents.push({
      ...event,
      changeType: sanitizeLearningChangeType(event.changeType),
      severity: sanitizeLearningSeverity(event.severity),
      confidenceBefore: event.confidenceBefore ?? confidenceBefore(ctx),
      confidenceAfter: event.confidenceAfter ?? null,
    });
  }
}

function addAcceptedLearningEvent(
  ctx: ApprovalContext,
  fieldName: string,
  changeType: CollectorLearningChangeType,
  newValue: unknown,
  summary: string,
  collectorItemId?: string | null
) {
  addLearningEvent(ctx, {
    collectorItemId,
    fieldName,
    oldValue: null,
    newValue,
    changeType,
    severity: "minor",
    summary,
    humanComment: ctx.request.approvalNotes || null,
  });
}

function sanitizeItemType(value: unknown): CollectorItemType | string {
  const itemType = stringValue(value) || "unknown";
  return COLLECTOR_ITEM_TYPES.includes(itemType as CollectorItemType)
    ? (itemType as CollectorItemType)
    : "unknown";
}

function sanitizeConditionClasses(value: unknown): CollectorConditionClass[] {
  if (!Array.isArray(value)) {
    return ["UNKNOWN"];
  }

  const classes = value
    .map((item) => String(item || "").toUpperCase())
    .filter((item): item is CollectorConditionClass =>
      COLLECTOR_CONDITION_CLASSES.includes(item as CollectorConditionClass)
    );

  return classes.length > 0
    ? (uniqueValues(classes) as CollectorConditionClass[])
    : ["UNKNOWN"];
}

function sanitizeReleaseYear(value: unknown) {
  const year = numberValue(value);
  return year !== null && year >= 1900 && year <= 2100 ? Math.trunc(year) : null;
}

function sanitizeRelationshipType(value: unknown): CollectorRelationshipType {
  const relationshipType = stringValue(value) || "includes";
  return COLLECTOR_RELATIONSHIP_TYPES.includes(
    relationshipType as CollectorRelationshipType
  )
    ? (relationshipType as CollectorRelationshipType)
    : "includes";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getProposalFromSuggestion(suggestion: CollectorAiSuggestion) {
  const evidence = asRecord(suggestion.evidence);
  const proposal = asRecord(evidence.proposal);
  const entityPayload = asRecord(suggestion.suggested_entity_payload);

  return {
    ...entityPayload,
    ...proposal,
  };
}

function proposalType(suggestion: CollectorAiSuggestion, proposal: JsonRecord) {
  return (
    stringValue(suggestion.suggested_trait_name) ||
    stringValue(asRecord(suggestion.evidence).suggestion_type) ||
    stringValue(proposal.item_type) ||
    "collector_suggestion"
  );
}

function fieldFromEditsOrProposal(
  edits: CollectorApprovalEdits | null | undefined,
  proposal: JsonRecord,
  editKey: keyof CollectorApprovalEdits,
  proposalKey: string
) {
  const editedValue = edits?.[editKey];
  return editedValue !== undefined && editedValue !== null
    ? editedValue
    : proposal[proposalKey];
}

function buildApprovedItemInput(ctx: ApprovalContext) {
  const edits = ctx.request.edits;
  const proposal = ctx.proposal;
  const rawReleaseYear = fieldFromEditsOrProposal(
    edits,
    proposal,
    "releaseYear",
    "release_year"
  );
  const releaseYear = sanitizeReleaseYear(rawReleaseYear);

  if (rawReleaseYear !== null && rawReleaseYear !== undefined && releaseYear === null) {
    ctx.warnings.push(
      `Ongeldig productiejaar "${String(rawReleaseYear)}" is als onbekend opgeslagen.`
    );
  }

  return {
    toyline:
      stringValue(fieldFromEditsOrProposal(edits, proposal, "toyline", "toyline")) ||
      "Unknown",
    name:
      stringValue(fieldFromEditsOrProposal(edits, proposal, "itemName", "item_name")) ||
      stringValue(proposal.name) ||
      "Unknown",
    itemType: sanitizeItemType(
      fieldFromEditsOrProposal(edits, proposal, "itemType", "item_type")
    ),
    manufacturer: stringValue(
      fieldFromEditsOrProposal(edits, proposal, "manufacturer", "manufacturer")
    ),
    releaseYear,
    releaseRegion: stringValue(
      fieldFromEditsOrProposal(edits, proposal, "releaseRegion", "release_region")
    ),
    seriesOrWave: stringValue(
      fieldFromEditsOrProposal(edits, proposal, "seriesOrWave", "series_or_wave")
    ),
    parentItemId: stringValue(
      fieldFromEditsOrProposal(edits, proposal, "parentItemId", "parent_item_id")
    ),
    popularityLevel:
      stringValue(
        fieldFromEditsOrProposal(edits, proposal, "popularityLevel", "popularity_level")
      ) || "unknown",
    rarityLevel:
      stringValue(fieldFromEditsOrProposal(edits, proposal, "rarityLevel", "rarity_level")) ||
      "unknown",
    collectorImportance:
      stringValue(
        fieldFromEditsOrProposal(
          edits,
          proposal,
          "collectorImportance",
          "collector_importance"
        )
      ) || "unknown",
    collectorHiddenGemLevel:
      stringValue(
        fieldFromEditsOrProposal(
          edits,
          proposal,
          "collectorHiddenGemLevel",
          "collector_hidden_gem_level"
        )
      ) || "unknown",
    completionImportance:
      stringValue(
        fieldFromEditsOrProposal(
          edits,
          proposal,
          "completionImportance",
          "completion_importance"
        )
      ) || "unknown",
    conditionClasses: sanitizeConditionClasses(
      fieldFromEditsOrProposal(
        edits,
        proposal,
        "conditionClasses",
        "suggested_condition_classes"
      )
    ),
    notes: stringValue(fieldFromEditsOrProposal(edits, proposal, "notes", "notes")),
  };
}

function getProposalFieldValue(proposal: JsonRecord, field: string) {
  switch (field) {
    case "toyline":
      return proposal.toyline;
    case "itemName":
      return proposal.item_name || proposal.name;
    case "itemType":
      return proposal.item_type;
    case "manufacturer":
      return proposal.manufacturer;
    case "releaseYear":
      return proposal.release_year;
    case "conditionClasses":
      return proposal.suggested_condition_classes;
    case "notes":
      return proposal.notes;
    default:
      return proposal[field];
  }
}

function learningTypeForField(field: string): CollectorLearningChangeType {
  switch (field) {
    case "toyline":
      return "toyline";
    case "itemName":
      return "identity";
    case "itemType":
      return "item_type";
    case "manufacturer":
      return "manufacturer";
    case "releaseYear":
      return "release_year";
    case "conditionClasses":
      return "condition";
    case "notes":
      return "notes";
    default:
      return "notes";
  }
}

function displayFieldName(field: string) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function addEditedFieldLearning(ctx: ApprovalContext) {
  const edits = ctx.request.edits || {};
  const fields: Array<keyof CollectorApprovalEdits> = [
    "toyline",
    "itemName",
    "itemType",
    "manufacturer",
    "releaseYear",
    "conditionClasses",
    "notes",
  ];

  for (const field of fields) {
    if (!(field in edits)) {
      continue;
    }

    const oldValue = getProposalFieldValue(ctx.proposal, field);
    const newValue = edits[field];
    if (valuesEqual(oldValue, newValue)) {
      continue;
    }

    const isMajor = ["itemName", "itemType", "toyline"].includes(field);
    addLearningEvent(ctx, {
      fieldName:
        field === "itemName"
          ? "item_name"
          : field === "itemType"
            ? "item_type"
            : field === "releaseYear"
              ? "release_year"
              : field === "conditionClasses"
                ? "condition_classes"
                : field,
      oldValue: jsonValue(oldValue),
      newValue: jsonValue(newValue),
      changeType: learningTypeForField(field),
      severity: isMajor ? "major" : "minor",
      summary: `${displayFieldName(field)} corrected`,
      humanComment: ctx.request.approvalNotes || null,
    });
  }
}

function addReviewOutcomeLearning(ctx: ApprovalContext, approvedItemId: string | null) {
  const outcome = reviewOutcome(ctx);
  const severity: CollectorLearningSeverity =
    outcome === "PERFECT"
      ? "none"
      : outcome === "REJECT"
        ? "critical"
        : outcome === "MAJOR_EDIT" || outcome === "NEW_ENTITY"
          ? "major"
          : "minor";

  addLearningEvent(ctx, {
    collectorItemId: approvedItemId,
    fieldName: "review_outcome",
    oldValue: null,
    newValue: outcome,
    changeType: "review_outcome",
    severity,
    summary:
      outcome === "PERFECT"
        ? "AI proposal accepted as correct"
        : outcome === "REJECT"
          ? "AI proposal rejected"
          : `Review outcome recorded: ${outcome}`,
    humanComment: ctx.request.approvalNotes || ctx.request.edits?.rejectionReason || null,
  });
}

function approvedVisualFingerprintValues(ctx: ApprovalContext) {
  const evidence = asRecord(ctx.proposal.evidence_summary);
  const observations = Array.isArray(evidence.observed_by_vision)
    ? evidence.observed_by_vision
    : [];

  return uniqueValues(
    observations
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.replace(/https?:\/\/\S+/gi, "").trim())
      .filter((value) => value.length >= 8 && value.length <= 300)
  ).slice(0, 20);
}

async function storeApprovedVisualFingerprints(
  ctx: ApprovalContext,
  approvedItemId: string | null
) {
  if (
    !approvedItemId ||
    ![
      "APPROVE_NEW_ITEM",
      "EDIT_AND_APPROVE",
      "APPROVE_MATCH_UPDATE",
      "LINK_TO_EXISTING_ITEM",
    ].includes(ctx.request.action)
  ) {
    return;
  }

  const values = approvedVisualFingerprintValues(ctx);

  if (values.length === 0) {
    return;
  }

  const confidence = clampConfidence(
    asRecord(ctx.proposal.confidence).observed_objects,
    clampConfidence(ctx.suggestion.confidence, 0.5)
  );
  const { data, error } = await ctx.supabase
    .from("collector_item_traits")
    .upsert(
      values.map((traitValue) => ({
        collector_item_id: approvedItemId,
        trait_name: "visual_fingerprint",
        trait_value: traitValue,
        confidence,
        source: "human_approved_ai_observation",
        notes:
          "Human-approved visual observation. The source listing image is not retained as reference media.",
      })),
      {
        onConflict: "collector_item_id,trait_name,trait_value",
        ignoreDuplicates: true,
      }
    )
    .select("id");

  if (error) {
    throw error;
  }

  for (const row of data || []) {
    ctx.createdRows.push({ table: "collector_item_traits", id: row.id as string });
  }

  addLearningEvent(ctx, {
    collectorItemId: approvedItemId,
    fieldName: "visual_fingerprint",
    oldValue: null,
    newValue: values,
    changeType: "trait",
    severity: "minor",
    confidenceAfter: confidence,
    summary: `${values.length} approved visual fingerprint${values.length === 1 ? "" : "s"} stored without source images`,
    humanComment: ctx.request.approvalNotes || null,
  });
}

async function createAuditEvent(ctx: ApprovalContext, afterState: JsonRecord) {
  const { data, error } = await ctx.supabase
    .from("collector_approval_events")
    .insert({
      suggestion_id: ctx.request.suggestionId,
      action: ctx.request.action,
      reviewer_id: ctx.request.reviewerId || null,
      target_collector_item_id:
        ctx.request.targetCollectorItemId ||
        [...ctx.affectedCollectorItemIds][0] ||
        null,
      before_state: {
        suggestion: ctx.suggestion,
      },
      after_state: afterState,
      edits: ctx.request.edits || {},
      warnings: ctx.warnings,
      notes: ctx.request.approvalNotes || ctx.request.edits?.rejectionReason || null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function createFeedback(
  ctx: ApprovalContext,
  approvedItemId: string | null
) {
  const { error } = await ctx.supabase.from("collector_ai_feedback").insert({
    suggestion_id: ctx.request.suggestionId,
    decision: ctx.request.action,
    proposal_type: proposalType(ctx.suggestion, ctx.proposal),
    confidence_before: Number(ctx.suggestion.confidence ?? 0),
    reviewer_changes: ctx.request.edits || {},
    rejection_reason: ctx.request.edits?.rejectionReason || null,
    approved_item_id: approvedItemId,
  });

  if (error) {
    throw error;
  }
}

async function createLearningEvents(
  ctx: ApprovalContext,
  approvalEventId: string,
  approvedItemId: string | null
) {
  if (ctx.learningEvents.length === 0) {
    return [];
  }

  const rows = ctx.learningEvents.map((event) => ({
    approval_event_id: approvalEventId,
    suggestion_id: ctx.request.suggestionId,
    collector_item_id: event.collectorItemId || approvedItemId,
    field_name: event.fieldName,
    old_value: jsonValue(event.oldValue),
    new_value: jsonValue(event.newValue),
    change_type: event.changeType,
    severity: event.severity,
    confidence_before: event.confidenceBefore ?? confidenceBefore(ctx),
    confidence_after: event.confidenceAfter ?? null,
    review_outcome: reviewOutcome(ctx),
    human_comment:
      event.humanComment ||
      ctx.request.approvalNotes ||
      ctx.request.edits?.rejectionReason ||
      null,
  }));
  const { data, error } = await ctx.supabase
    .from("collector_ai_learning_events")
    .insert(rows)
    .select("id");

  if (error) {
    throw error;
  }

  return (data || []).map((row) => row.id as string);
}

function learningSummaryFromEvents(events: CollectorLearningEventDraft[]) {
  return uniqueValues(events.map((event) => event.summary));
}

async function loadSuggestion(supabase: SupabaseClient, suggestionId: string) {
  const { data, error } = await supabase
    .from("collector_ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();

  if (error) {
    throw error;
  }

  return data as CollectorAiSuggestion;
}

async function findOrCreateToyline(
  ctx: ApprovalContext,
  input: {
    name: string;
    manufacturer?: string | null;
    notes?: string | null;
  }
) {
  const existing = await ctx.supabase
    .from("collector_toylines")
    .select("*")
    .ilike("name", input.name)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    const missingUpdates: JsonRecord = {};
    if (!existing.data.manufacturer && input.manufacturer) {
      missingUpdates.manufacturer = input.manufacturer;
    }
    if (!existing.data.notes && input.notes) {
      missingUpdates.notes = input.notes;
    }

    if (Object.keys(missingUpdates).length > 0) {
      const update = await ctx.supabase
        .from("collector_toylines")
        .update(missingUpdates)
        .eq("id", existing.data.id)
        .select("id")
        .single();

      if (update.error) {
        throw update.error;
      }

      ctx.updatedRows.push({ table: "collector_toylines", id: update.data.id });
    }

    return existing.data.id as string;
  }

  const created = await ctx.supabase
    .from("collector_toylines")
    .insert({
      name: input.name,
      manufacturer: input.manufacturer || null,
      obscurity_level: "unknown",
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (created.error) {
    throw created.error;
  }

  ctx.createdRows.push({ table: "collector_toylines", id: created.data.id });
  return created.data.id as string;
}

async function findOrCreateCollectorItem(
  ctx: ApprovalContext,
  input: ReturnType<typeof buildApprovedItemInput> & {
    toylineId?: string;
  }
) {
  const toylineId =
    input.toylineId ||
    (await findOrCreateToyline(ctx, {
      name: input.toyline,
      manufacturer: input.manufacturer,
      notes: `Created by Collector Approval Engine for suggestion ${ctx.request.suggestionId}.`,
    }));

  let existingItemQuery = ctx.supabase
    .from("collector_items")
    .select("*")
    .eq("toyline_id", toylineId)
    .ilike("name", input.name)
    .eq("item_type", input.itemType);

  existingItemQuery =
    input.releaseYear === null
      ? existingItemQuery.is("release_year", null)
      : existingItemQuery.eq("release_year", input.releaseYear);

  const existing = await existingItemQuery.maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw existing.error;
  }

  if (existing.data) {
    ctx.affectedCollectorItemIds.add(existing.data.id as string);
    return existing.data.id as string;
  }

  const created = await ctx.supabase
    .from("collector_items")
    .insert({
      toyline_id: toylineId,
      name: input.name,
      item_type: input.itemType,
      manufacturer: input.manufacturer,
      release_year: input.releaseYear,
      release_region: input.releaseRegion,
      series_or_wave: input.seriesOrWave,
      parent_item_id: input.parentItemId,
      popularity_level: input.popularityLevel,
      rarity_level: input.rarityLevel,
      collector_importance: input.collectorImportance,
      collector_hidden_gem_level: input.collectorHiddenGemLevel,
      completion_importance: input.completionImportance,
      typical_condition_classes: input.conditionClasses,
      notes:
        input.notes ||
        `Human-approved by Collector Approval Engine from suggestion ${ctx.request.suggestionId}.`,
      confidence_level: "curated",
    })
    .select("id")
    .single();

  if (created.error) {
    throw created.error;
  }

  const id = created.data.id as string;
  ctx.createdRows.push({ table: "collector_items", id });
  ctx.affectedCollectorItemIds.add(id);
  return id;
}

async function ensureExistingCollectorItem(ctx: ApprovalContext, itemId: string) {
  const { data, error } = await ctx.supabase
    .from("collector_items")
    .select("id")
    .eq("id", itemId)
    .single();

  if (error) {
    throw error;
  }

  ctx.affectedCollectorItemIds.add(data.id as string);
  return data.id as string;
}

function aliasEditsFromProposal(ctx: ApprovalContext): CollectorApprovalAliasEdit[] {
  const explicit = ctx.request.edits?.aliases;
  if (Array.isArray(explicit)) {
    const aliases: CollectorApprovalAliasEdit[] = [];
    for (const alias of explicit) {
      if (typeof alias === "string" && alias.trim()) {
        aliases.push({ alias });
      } else if (isRecord(alias)) {
        const rawAlias = alias as JsonRecord;
        const aliasValue = stringValue(rawAlias.alias);
        if (aliasValue) {
          aliases.push({
            alias: aliasValue,
            aliasType:
              stringValue(rawAlias.aliasType) || stringValue(rawAlias.alias_type),
            weight: numberValue(rawAlias.weight),
            confidence: numberValue(rawAlias.confidence),
            notes: stringValue(rawAlias.notes) || stringValue(rawAlias.reasoning),
          });
        }
      }
    }

    return aliases;
  }

  const aliases: CollectorApprovalAliasEdit[] = [];
  for (const alias of asArray(ctx.proposal.suggested_aliases)) {
    if (!isRecord(alias)) {
      continue;
    }

    const aliasValue = stringValue(alias.alias);
    if (!aliasValue) {
      continue;
    }

    aliases.push({
      alias: aliasValue,
      aliasType: stringValue(alias.alias_type) || stringValue(alias.aliasType),
      weight: numberValue(alias.weight),
      confidence: numberValue(alias.confidence),
      notes: stringValue(alias.reasoning) || stringValue(alias.notes),
    });
  }

  return aliases;
}

function traitEditsFromProposal(ctx: ApprovalContext): CollectorApprovalTraitEdit[] {
  if (Array.isArray(ctx.request.edits?.traits)) {
    return ctx.request.edits.traits.filter(
      (trait): trait is CollectorApprovalTraitEdit =>
        Boolean(trait?.traitName?.trim() && trait?.traitValue?.trim())
    );
  }

  const traits: CollectorApprovalTraitEdit[] = [];
  for (const trait of asArray(ctx.proposal.suggested_traits)) {
    if (!isRecord(trait)) {
      continue;
    }

    const traitName = stringValue(trait.trait_name) || stringValue(trait.traitName);
    const traitValue = stringValue(trait.trait_value) || stringValue(trait.traitValue);
    if (!traitName || !traitValue) {
      continue;
    }

    traits.push({
      traitName,
      traitValue,
      confidence: numberValue(trait.confidence),
      notes: stringValue(trait.reasoning) || stringValue(trait.notes),
    });
  }

  return traits;
}

function relationshipEditsFromSuggestion(
  ctx: ApprovalContext
): CollectorApprovalRelationshipEdit[] {
  const edits = ctx.request.edits?.relationships;
  if (Array.isArray(edits)) {
    return edits;
  }

  const sourceItemId = stringValue(ctx.suggestion.suggested_source_item_id);
  const targetItemId = stringValue(ctx.suggestion.suggested_target_item_id);
  const relationshipType = stringValue(ctx.suggestion.suggested_relationship_type);
  const payload = asRecord(ctx.suggestion.suggested_relationship_payload);

  if (!relationshipType && Object.keys(payload).length === 0) {
    return [];
  }

  return [
    {
      sourceItemId: sourceItemId || stringValue(payload.source_item_id),
      targetItemId: targetItemId || stringValue(payload.target_item_id),
      relationshipType:
        relationshipType || stringValue(payload.relationship_type) || "includes",
      confidence: numberValue(payload.confidence),
      requiredForComplete:
        typeof payload.required_for_complete === "boolean"
          ? payload.required_for_complete
          : null,
      valueImpactLevel: stringValue(payload.value_impact_level),
      quantity: numberValue(payload.quantity),
      validRegion: stringValue(payload.valid_region),
      validYearStart: numberValue(payload.valid_year_start),
      validYearEnd: numberValue(payload.valid_year_end),
      notes: stringValue(payload.notes),
      evidence: payload,
    },
  ];
}

async function addAliases(ctx: ApprovalContext, itemId: string) {
  const aliases = aliasEditsFromProposal(ctx);

  for (const alias of aliases) {
    const row = {
      collector_item_id: itemId,
      alias: alias.alias.trim(),
      alias_type: alias.aliasType || "search",
      weight: Math.max(0, Math.min(100, Math.round(alias.weight ?? 80))),
      confidence: clampConfidence(alias.confidence, 1),
      source: "human_review",
      notes: alias.notes || ctx.request.approvalNotes || null,
    };
    const { data, error } = await ctx.supabase
      .from("collector_aliases")
      .upsert(row, {
        onConflict: "collector_item_id,alias,alias_type",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    ctx.updatedRows.push({ table: "collector_aliases", id: data.id as string });
    addAcceptedLearningEvent(
      ctx,
      "alias",
      "alias",
      row.alias,
      "Alias accepted",
      itemId
    );
  }
}

async function addTraits(ctx: ApprovalContext, itemId: string) {
  const traits = traitEditsFromProposal(ctx);

  for (const trait of traits) {
    const row = {
      collector_item_id: itemId,
      trait_name: trait.traitName.trim(),
      trait_value: trait.traitValue.trim(),
      confidence: clampConfidence(trait.confidence, 1),
      source: "human_review",
      notes: trait.notes || ctx.request.approvalNotes || null,
    };
    const { data, error } = await ctx.supabase
      .from("collector_item_traits")
      .upsert(row, {
        onConflict: "collector_item_id,trait_name,trait_value",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    ctx.updatedRows.push({ table: "collector_item_traits", id: data.id as string });
    addAcceptedLearningEvent(
      ctx,
      `trait:${row.trait_name}`,
      "trait",
      row.trait_value,
      "Trait accepted",
      itemId
    );
  }
}

async function addMedia(ctx: ApprovalContext, itemId: string) {
  const media = ctx.request.edits?.media || [];

  for (const item of media) {
    if (!item.imageUrl?.trim()) {
      continue;
    }

    const { data, error } = await ctx.supabase
      .from("collector_media")
      .upsert(
        {
          collector_item_id: itemId,
          image_url: item.imageUrl.trim(),
          image_type: item.imageType || "reference",
          confidence: clampConfidence(item.confidence, 1),
          source: "human_review",
          notes: item.notes || ctx.request.approvalNotes || null,
        },
        {
          onConflict: "collector_item_id,image_url,image_type",
        }
      )
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    ctx.updatedRows.push({ table: "collector_media", id: data.id as string });
    addAcceptedLearningEvent(
      ctx,
      "media",
      "media",
      item.imageUrl.trim(),
      "Media accepted",
      itemId
    );
  }
}

async function addRelationship(
  ctx: ApprovalContext,
  relationship: CollectorApprovalRelationshipEdit
) {
  const sourceItemId = stringValue(relationship.sourceItemId);
  const targetItemId = stringValue(relationship.targetItemId);

  if (!sourceItemId || !targetItemId) {
    ctx.warnings.push("Skipped relationship without both source and target item IDs.");
    return null;
  }

  if (sourceItemId === targetItemId) {
    ctx.warnings.push("Skipped self-referential relationship.");
    return null;
  }

  const relationshipType = sanitizeRelationshipType(relationship.relationshipType);
  const validRegion = stringValue(relationship.validRegion);
  const validYearStart = numberValue(relationship.validYearStart);
  const validYearEnd = numberValue(relationship.validYearEnd);
  let existingRelationshipQuery = ctx.supabase
    .from("collector_item_relationships")
    .select("id,review_status")
    .eq("source_item_id", sourceItemId)
    .eq("target_item_id", targetItemId)
    .eq("relationship_type", relationshipType);

  existingRelationshipQuery =
    validRegion === null
      ? existingRelationshipQuery.is("valid_region", null)
      : existingRelationshipQuery.eq("valid_region", validRegion);
  existingRelationshipQuery =
    validYearStart === null
      ? existingRelationshipQuery.is("valid_year_start", null)
      : existingRelationshipQuery.eq("valid_year_start", validYearStart);
  existingRelationshipQuery =
    validYearEnd === null
      ? existingRelationshipQuery.is("valid_year_end", null)
      : existingRelationshipQuery.eq("valid_year_end", validYearEnd);

  const existing = await existingRelationshipQuery.maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    ctx.affectedRelationshipIds.add(existing.data.id as string);
    ctx.updatedRows.push({
      table: "collector_item_relationships",
      id: existing.data.id as string,
    });
    addAcceptedLearningEvent(
      ctx,
      "relationship",
      "relationship",
      {
        sourceItemId,
        targetItemId,
        relationshipType,
        existingRelationshipId: existing.data.id,
      },
      "Relationship already known",
      sourceItemId
    );
    return existing.data.id as string;
  }

  const { data, error } = await ctx.supabase
    .from("collector_item_relationships")
    .insert({
      source_item_id: sourceItemId,
      target_item_id: targetItemId,
      relationship_type: relationshipType,
      confidence: clampConfidence(relationship.confidence, 1),
      source: "human_review",
      review_status: "approved",
      required_for_complete: relationship.requiredForComplete ?? null,
      value_impact_level: relationship.valueImpactLevel || null,
      quantity: Math.max(1, Math.round(relationship.quantity || 1)),
      valid_region: validRegion,
      valid_year_start: validYearStart,
      valid_year_end: validYearEnd,
      notes: relationship.notes || ctx.request.approvalNotes || null,
      evidence: {
        ...(relationship.evidence || {}),
        approved_from_suggestion_id: ctx.request.suggestionId,
        approval_action: ctx.request.action,
      },
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const id = data.id as string;
  ctx.createdRows.push({ table: "collector_item_relationships", id });
  ctx.affectedRelationshipIds.add(id);
  addLearningEvent(ctx, {
    collectorItemId: sourceItemId,
    fieldName: "relationship",
    oldValue: null,
    newValue: {
      sourceItemId,
      targetItemId,
      relationshipType,
      relationshipId: id,
    },
    changeType: "relationship",
    severity: "minor",
    summary: "Relationship approved",
    humanComment: relationship.notes || ctx.request.approvalNotes || null,
  });
  return id;
}

async function applyRelationshipEdits(
  ctx: ApprovalContext,
  fallbackSourceItemId?: string
) {
  for (const relationship of relationshipEditsFromSuggestion(ctx)) {
    await addRelationship(ctx, {
      ...relationship,
      sourceItemId: relationship.sourceItemId || fallbackSourceItemId,
    });
  }
}

async function createRelatedEntities(ctx: ApprovalContext, parentItemId: string) {
  const relatedEntities = ctx.request.edits?.relatedEntities || [];

  for (const relatedEntity of relatedEntities) {
    const baseInput = buildApprovedItemInput(ctx);
    const toyline =
      stringValue(relatedEntity.toyline) ||
      stringValue(ctx.request.edits?.toyline) ||
      baseInput.toyline;
    const childItemId = await findOrCreateCollectorItem(ctx, {
      ...baseInput,
      toyline,
      name: relatedEntity.itemName,
      itemType: sanitizeItemType(relatedEntity.itemType),
      manufacturer: relatedEntity.manufacturer || baseInput.manufacturer,
      releaseYear: relatedEntity.releaseYear ?? baseInput.releaseYear,
      conditionClasses: sanitizeConditionClasses(relatedEntity.conditionClasses),
      notes:
        relatedEntity.notes ||
        `Human-approved related entity from suggestion ${ctx.request.suggestionId}.`,
    });
    addLearningEvent(ctx, {
      collectorItemId: childItemId,
      fieldName: "entity",
      oldValue: null,
      newValue: {
        itemName: relatedEntity.itemName,
        itemType: relatedEntity.itemType,
        parentItemId,
      },
      changeType: "entity",
      severity: "major",
      summary: "New related entity created",
      humanComment: relatedEntity.notes || ctx.request.approvalNotes || null,
    });

    if (relatedEntity.relationship) {
      await addRelationship(ctx, {
        ...relatedEntity.relationship,
        sourceItemId: relatedEntity.relationship.sourceItemId || parentItemId,
        targetItemId: relatedEntity.relationship.targetItemId || childItemId,
      });
    }
  }
}

async function markSuggestion(
  ctx: ApprovalContext,
  status: "approved" | "rejected" | "linked",
  approvedItemId: string | null
) {
  const evidence = asRecord(ctx.suggestion.evidence);
  const { data, error } = await ctx.supabase
    .from("collector_ai_suggestions")
    .update({
      collector_item_id: approvedItemId,
      suggested_collector_item_id:
        status === "rejected"
          ? ctx.suggestion.suggested_collector_item_id
          : approvedItemId || ctx.suggestion.suggested_collector_item_id,
      status,
      reviewed_at: new Date().toISOString(),
      evidence: {
        ...evidence,
        approval_engine: {
          action: ctx.request.action,
          reviewer_id: ctx.request.reviewerId || null,
          approved_item_id: approvedItemId,
          warnings: ctx.warnings,
          notes: ctx.request.approvalNotes || null,
          decided_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", ctx.request.suggestionId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  ctx.updatedRows.push({ table: "collector_ai_suggestions", id: data.id as string });
}

async function approveNewItem(ctx: ApprovalContext) {
  addEditedFieldLearning(ctx);
  const itemId = await findOrCreateCollectorItem(ctx, buildApprovedItemInput(ctx));
  await addAliases(ctx, itemId);
  await addTraits(ctx, itemId);
  await addMedia(ctx, itemId);
  await createRelatedEntities(ctx, itemId);
  await applyRelationshipEdits(ctx, itemId);
  await markSuggestion(ctx, "approved", itemId);
  return itemId;
}

async function approveExistingItemUpdate(ctx: ApprovalContext) {
  addEditedFieldLearning(ctx);
  const itemId =
    ctx.request.targetCollectorItemId ||
    stringValue(ctx.suggestion.collector_item_id) ||
    stringValue(ctx.suggestion.suggested_collector_item_id);

  if (!itemId) {
    throw new Error("This approval action requires targetCollectorItemId.");
  }

  await ensureExistingCollectorItem(ctx, itemId);
  await addAliases(ctx, itemId);
  await addTraits(ctx, itemId);
  await addMedia(ctx, itemId);
  await createRelatedEntities(ctx, itemId);
  await applyRelationshipEdits(ctx, itemId);
  if (ctx.request.action === "LINK_TO_EXISTING_ITEM") {
    addLearningEvent(ctx, {
      collectorItemId: itemId,
      fieldName: "collector_item_id",
      oldValue: stringValue(ctx.proposal.item_name) || ctx.proposal,
      newValue: itemId,
      changeType: "identity",
      severity: "major",
      summary: "Proposal linked to existing item",
      humanComment: ctx.request.approvalNotes || null,
    });
  }
  await markSuggestion(
    ctx,
    ctx.request.action === "LINK_TO_EXISTING_ITEM" ? "linked" : "approved",
    itemId
  );
  return itemId;
}

async function createNewRelatedEntity(ctx: ApprovalContext) {
  addEditedFieldLearning(ctx);
  const parentItemId =
    ctx.request.targetCollectorItemId ||
    stringValue(ctx.suggestion.collector_item_id) ||
    stringValue(ctx.suggestion.suggested_collector_item_id);

  if (!parentItemId) {
    throw new Error("CREATE_NEW_RELATED_ENTITY requires targetCollectorItemId.");
  }

  await ensureExistingCollectorItem(ctx, parentItemId);
  await createRelatedEntities(ctx, parentItemId);
  await markSuggestion(ctx, "approved", parentItemId);
  return parentItemId;
}

async function approveRelationship(ctx: ApprovalContext) {
  addEditedFieldLearning(ctx);
  const relationships = relationshipEditsFromSuggestion(ctx);

  if (relationships.length === 0) {
    throw new Error("APPROVE_RELATIONSHIP requires a suggested or edited relationship.");
  }

  for (const relationship of relationships) {
    await addRelationship(ctx, relationship);
  }

  const approvedItemId =
    ctx.request.targetCollectorItemId ||
    stringValue(relationships[0].sourceItemId) ||
    stringValue(ctx.suggestion.collector_item_id);
  await markSuggestion(ctx, "approved", approvedItemId);
  return approvedItemId;
}

async function rejectSuggestion(ctx: ApprovalContext) {
  addLearningEvent(ctx, {
    fieldName: "proposal",
    oldValue: ctx.proposal,
    newValue: "rejected",
    changeType: "identity",
    severity: "critical",
    summary: "Proposal rejected",
    humanComment: ctx.request.edits?.rejectionReason || ctx.request.approvalNotes || null,
  });
  await markSuggestion(ctx, "rejected", null);
  return null;
}

async function rejectRelationship(ctx: ApprovalContext) {
  addLearningEvent(ctx, {
    fieldName: "relationship",
    oldValue:
      relationshipEditsFromSuggestion(ctx)[0] ||
      asRecord(ctx.suggestion.suggested_relationship_payload),
    newValue: "rejected",
    changeType: "relationship",
    severity: "major",
    summary: "Relationship rejected",
    humanComment: ctx.request.edits?.rejectionReason || ctx.request.approvalNotes || null,
  });
  await markSuggestion(ctx, "rejected", null);
  return null;
}

function validateRequest(request: CollectorApprovalRequest) {
  if (!request.suggestionId?.trim()) {
    throw new Error("Collector Approval requires suggestionId.");
  }

  if (!COLLECTOR_APPROVAL_ACTIONS.includes(request.action)) {
    throw new Error(`Unsupported Collector Approval action: ${request.action}`);
  }
}

export async function runCollectorApproval({
  supabase,
  request,
}: {
  supabase: SupabaseClient;
  request: CollectorApprovalRequest;
}): Promise<CollectorApprovalResult> {
  validateRequest(request);

  const suggestion = await loadSuggestion(supabase, request.suggestionId);
  const ctx: ApprovalContext = {
    supabase,
    request,
    suggestion,
    proposal: {
      ...getProposalFromSuggestion(suggestion),
      ...asRecord(request.edits?.proposal),
    },
    warnings: [],
    createdRows: [],
    updatedRows: [],
    affectedCollectorItemIds: new Set(),
    affectedRelationshipIds: new Set(),
    learningEvents: [],
  };

  let approvedItemId: string | null = null;
  let auditLogId: string | null = null;

  switch (request.action) {
    case "APPROVE_NEW_ITEM":
    case "EDIT_AND_APPROVE":
      approvedItemId = await approveNewItem(ctx);
      break;
    case "APPROVE_MATCH_UPDATE":
    case "LINK_TO_EXISTING_ITEM":
      approvedItemId = await approveExistingItemUpdate(ctx);
      break;
    case "CREATE_NEW_RELATED_ENTITY":
      approvedItemId = await createNewRelatedEntity(ctx);
      break;
    case "APPROVE_RELATIONSHIP":
      approvedItemId = await approveRelationship(ctx);
      break;
    case "REJECT":
      approvedItemId = await rejectSuggestion(ctx);
      break;
    case "REJECT_RELATIONSHIP":
      approvedItemId = await rejectRelationship(ctx);
      break;
  }

  await storeApprovedVisualFingerprints(ctx, approvedItemId);
  addReviewOutcomeLearning(ctx, approvedItemId);
  await createFeedback(ctx, approvedItemId);
  auditLogId = await createAuditEvent(ctx, {
    approved_item_id: approvedItemId,
    affected_collector_item_ids: [...ctx.affectedCollectorItemIds],
    affected_relationship_ids: [...ctx.affectedRelationshipIds],
    created_rows: ctx.createdRows,
    updated_rows: ctx.updatedRows,
    suggestion_status_after: request.action.includes("REJECT")
      ? "rejected"
      : request.action === "LINK_TO_EXISTING_ITEM"
        ? "linked"
        : "approved",
    learning_summary: learningSummaryFromEvents(ctx.learningEvents),
    review_outcome: reviewOutcome(ctx),
  });
  const learningEventIds = await createLearningEvents(
    ctx,
    auditLogId,
    approvedItemId
  );

  return {
    success: true,
    action: request.action,
    suggestionId: request.suggestionId,
    affectedCollectorItemIds: [...ctx.affectedCollectorItemIds],
    affectedRelationshipIds: [...ctx.affectedRelationshipIds],
    createdRows: ctx.createdRows,
    updatedRows: ctx.updatedRows,
    warnings: ctx.warnings,
    auditLogId,
    learning: {
      reviewOutcome: reviewOutcome(ctx),
      summary: learningSummaryFromEvents(ctx.learningEvents),
      eventIds: learningEventIds,
      events: ctx.learningEvents,
    },
  };
}

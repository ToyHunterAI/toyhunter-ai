import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  asRecord,
  confidenceGroup,
  getImageUrls,
  getSuggestionMatchStatus,
  getSuggestionProposal,
  getSuggestionProposalType,
  isInternalRequestAuthorized,
  normalizeSuggestionSummary,
  numberValue,
  stringValue,
  unauthorizedInternalResponse,
} from "../shared";

export const dynamic = "force-dynamic";

const UNRESOLVED_STATUSES = ["suggested", "under_review"];

function matchesFilter(
  suggestion: any,
  summary: ReturnType<typeof normalizeSuggestionSummary>,
  params: URLSearchParams,
  latestJobId: string | null
) {
  const status = params.get("status");
  const toyline = params.get("toyline");
  const confidence = params.get("confidence");
  const proposalType = params.get("proposalType");
  const matchType = params.get("matchType");
  const image = params.get("image");
  const unresolvedOnly = params.get("unresolvedOnly") !== "false";
  const run = params.get("run");

  if (run === "latest" && summary.populationJobId !== latestJobId) {
    return false;
  }

  if (run && run !== "all" && run !== "latest" && summary.populationJobId !== run) {
    return false;
  }

  if (unresolvedOnly && !UNRESOLVED_STATUSES.includes(summary.status)) {
    return false;
  }

  if (status && status !== "all" && summary.status !== status) {
    return false;
  }

  if (
    toyline &&
    toyline !== "all" &&
    summary.toyline.toLowerCase() !== toyline.toLowerCase()
  ) {
    return false;
  }

  if (
    confidence &&
    confidence !== "all" &&
    confidenceGroup(summary.confidence) !== confidence
  ) {
    return false;
  }

  if (
    proposalType &&
    proposalType !== "all" &&
    summary.proposalType !== proposalType
  ) {
    return false;
  }

  if (matchType === "existing" && summary.matchStatus === "new_proposal") {
    return false;
  }

  if (matchType === "new" && summary.matchStatus !== "new_proposal") {
    return false;
  }

  if (image === "has_image" && !summary.hasImage) {
    return false;
  }

  if (image === "no_image" && summary.hasImage) {
    return false;
  }

  return Boolean(suggestion);
}

function sortSuggestions(
  suggestions: ReturnType<typeof normalizeSuggestionSummary>[],
  sort: string
) {
  return [...suggestions].sort((left, right) => {
    if (sort === "lowest_confidence") {
      return left.confidence - right.confidence;
    }

    if (sort === "oldest") {
      return (
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
    }

    if (sort === "toyline") {
      return left.toyline.localeCompare(right.toyline);
    }

    if (sort === "newest") {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }

    return right.confidence - left.confidence;
  });
}

export async function GET(request: Request) {
  if (!isInternalRequestAuthorized(request)) {
    return unauthorizedInternalResponse();
  }

  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") || "highest_confidence";

  try {
    const [
      { data, error },
      { count: approvedToday },
      { count: rejectedToday },
      { data: populationListings, error: populationError },
    ] =
      await Promise.all([
        supabaseAdmin
          .from("collector_ai_suggestions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("collector_approval_events")
          .select("id", { count: "exact", head: true })
          .in("action", [
            "APPROVE_NEW_ITEM",
            "APPROVE_MATCH_UPDATE",
            "EDIT_AND_APPROVE",
            "LINK_TO_EXISTING_ITEM",
            "CREATE_NEW_RELATED_ENTITY",
            "APPROVE_RELATIONSHIP",
          ])
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabaseAdmin
          .from("collector_approval_events")
          .select("id", { count: "exact", head: true })
          .in("action", ["REJECT", "REJECT_RELATIONSHIP"])
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabaseAdmin
          .from("collector_population_listings")
          .select(
            "job_id,suggestion_ids,created_at,collector_population_jobs(id,search_query,created_at,status)"
          )
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

    if (error) {
      throw error;
    }

    if (populationError) {
      throw populationError;
    }

    const populationJobFromListing = (listing: any) =>
      Array.isArray(listing.collector_population_jobs)
        ? listing.collector_population_jobs[0]
        : listing.collector_population_jobs;
    const runBySuggestionId = new Map<string, any>();
    for (const listing of populationListings || []) {
      for (const suggestionId of listing.suggestion_ids || []) {
        if (!runBySuggestionId.has(suggestionId)) {
          runBySuggestionId.set(suggestionId, populationJobFromListing(listing));
        }
      }
    }

    const runs = [
      ...new Map(
        (populationListings || [])
          .map(populationJobFromListing)
          .filter((job): job is any => Boolean(job?.id))
          .map((job) => [job.id, job])
      ).values(),
    ].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
    const latestJobId = runs[0]?.id || null;

    const allSummaries = (data || []).map((suggestion) =>
      normalizeSuggestionSummary(suggestion, runBySuggestionId.get(suggestion.id))
    );
    const filtered = sortSuggestions(
      (data || [])
        .map((suggestion, index) => ({
          raw: suggestion,
          summary: allSummaries[index],
        }))
        .filter(({ raw, summary }) =>
          matchesFilter(raw, summary, url.searchParams, latestJobId)
        )
        .map(({ summary }) => summary),
      sort
    );

    const unresolved = allSummaries.filter((summary) =>
      UNRESOLVED_STATUSES.includes(summary.status)
    );
    const toylines = [
      ...new Set(unresolved.map((summary) => summary.toyline).filter(Boolean)),
    ].sort();
    const proposalTypes = [
      ...new Set(
        allSummaries.map((summary) => summary.proposalType).filter(Boolean)
      ),
    ].sort();

    return NextResponse.json({
      success: true,
      suggestions: filtered,
      stats: {
        totalUnresolved: unresolved.length,
        highConfidence: unresolved.filter(
          (summary) => summary.confidenceGroup === "high"
        ).length,
        mediumConfidence: unresolved.filter(
          (summary) => summary.confidenceGroup === "medium"
        ).length,
        lowConfidence: unresolved.filter(
          (summary) => summary.confidenceGroup === "low"
        ).length,
        approvedToday: approvedToday || 0,
        rejectedToday: rejectedToday || 0,
      },
      filters: {
        toylines,
        proposalTypes,
        runs,
      },
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

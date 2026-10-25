import { NextResponse } from "next/server";

export function isCollectorPopulationAuthorized(request: Request) {
  const expectedToken =
    process.env.COLLECTOR_POPULATION_INTERNAL_TOKEN ||
    process.env.COLLECTOR_REVIEW_INTERNAL_TOKEN ||
    process.env.COLLECTOR_APPROVAL_INTERNAL_TOKEN ||
    process.env.COLLECTOR_BUILDER_INTERNAL_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return request.headers.get("x-toyhunter-internal-token") === expectedToken;
}

export function unauthorizedCollectorPopulationResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized Collector Population request.",
    },
    { status: 401 }
  );
}

export function internalErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}

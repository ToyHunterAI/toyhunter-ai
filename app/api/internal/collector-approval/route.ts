import { runCollectorApproval } from "@/lib/collector-approval";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function approvalErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    const message = typeof details.message === "string" ? details.message : null;
    const hint = typeof details.hint === "string" ? details.hint : null;
    const code = typeof details.code === "string" ? details.code : null;
    return [message, hint, code ? `Code: ${code}` : null]
      .filter(Boolean)
      .join(" · ") || "Collector Approval database error.";
  }

  return "Collector Approval failed.";
}

function isAuthorized(request: Request) {
  const expectedToken =
    process.env.COLLECTOR_APPROVAL_INTERNAL_TOKEN ||
    process.env.COLLECTOR_BUILDER_INTERNAL_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return request.headers.get("x-toyhunter-internal-token") === expectedToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized Collector Approval request.",
      },
      { status: 401 }
    );
  }

  try {
    const input = await request.json();
    const result = await runCollectorApproval({
      request: input,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: approvalErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

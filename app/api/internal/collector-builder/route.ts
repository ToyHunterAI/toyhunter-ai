import { runCollectorBuilder } from "@/lib/collector-builder";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expectedToken = process.env.COLLECTOR_BUILDER_INTERNAL_TOKEN;

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
        error: "Unauthorized Collector Builder request.",
      },
      { status: 401 }
    );
  }

  try {
    const input = await request.json();
    const result = await runCollectorBuilder({
      input,
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

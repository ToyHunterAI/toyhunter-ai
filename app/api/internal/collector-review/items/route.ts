import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isInternalRequestAuthorized,
  unauthorizedInternalResponse,
} from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isInternalRequestAuthorized(request)) {
    return unauthorizedInternalResponse();
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      items: [],
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("collector_items")
      .select("id,name,item_type,manufacturer,release_year,collector_toylines(name)")
      .or(`name.ilike.%${q}%,manufacturer.ilike.%${q}%`)
      .order("name", { ascending: true })
      .limit(25);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      items: data || [],
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

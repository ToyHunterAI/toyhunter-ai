import { runPopulationJob } from "@/lib/collector-population";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  internalErrorResponse,
  isCollectorPopulationAuthorized,
  unauthorizedCollectorPopulationResponse,
} from "../../../shared";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isCollectorPopulationAuthorized(request)) {
    return unauthorizedCollectorPopulationResponse();
  }

  try {
    const { id } = await context.params;
    const result = await runPopulationJob(supabaseAdmin, id);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

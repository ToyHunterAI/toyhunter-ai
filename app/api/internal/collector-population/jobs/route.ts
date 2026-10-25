import {
  createPopulationJob,
  listPopulationJobs,
} from "@/lib/collector-population";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  internalErrorResponse,
  isCollectorPopulationAuthorized,
  unauthorizedCollectorPopulationResponse,
} from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCollectorPopulationAuthorized(request)) {
    return unauthorizedCollectorPopulationResponse();
  }

  try {
    const jobs = await listPopulationJobs(supabaseAdmin);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isCollectorPopulationAuthorized(request)) {
    return unauthorizedCollectorPopulationResponse();
  }

  try {
    const input = await request.json();
    const job = await createPopulationJob(supabaseAdmin, input);
    return NextResponse.json({ success: true, job });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

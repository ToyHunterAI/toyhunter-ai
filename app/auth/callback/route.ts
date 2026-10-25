import { NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/hunt-setup";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/hunt-setup";
  return new NextResponse(null, { status: 303, headers: { Location: safeNext } });
}
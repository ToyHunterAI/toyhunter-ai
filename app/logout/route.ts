import { NextResponse } from "next/server";
import { createClient } from "../../src/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}
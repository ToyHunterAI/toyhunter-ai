import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isInternalRequestAuthorized,
  unauthorizedInternalResponse,
} from "../collector-review/shared";

export const dynamic = "force-dynamic";

const MEDIA_TYPES = ["reference", "box", "accessory", "instruction", "sticker", "catalog", "other"];

export async function GET(request: Request) {
  if (!isInternalRequestAuthorized(request)) return unauthorizedInternalResponse();
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ success: false, error: "itemId is required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("collector_media").select("*").eq("collector_item_id", itemId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, media: data || [] });
}

export async function POST(request: Request) {
  if (!isInternalRequestAuthorized(request)) return unauthorizedInternalResponse();
  const body = await request.json();
  if (typeof body.itemId !== "string" || typeof body.imageUrl !== "string") {
    return NextResponse.json({ success: false, error: "Item en afbeelding-URL zijn verplicht." }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.imageUrl);
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige afbeelding-URL." }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ success: false, error: "Alleen http- en https-afbeeldingen zijn toegestaan." }, { status: 400 });
  }
  const imageType = MEDIA_TYPES.includes(body.imageType) ? body.imageType : "reference";
  const { data, error } = await supabaseAdmin.from("collector_media").insert({
    collector_item_id: body.itemId,
    image_url: parsedUrl.toString(),
    image_type: imageType,
    confidence: 1,
    source: typeof body.source === "string" && body.source.trim() ? body.source.trim() : "human_review",
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
  }).select("*").single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, media: data });
}

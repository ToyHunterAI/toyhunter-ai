import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const token = process.env.COLLECTOR_REVIEW_INTERNAL_TOKEN || process.env.COLLECTOR_APPROVAL_INTERNAL_TOKEN || process.env.COLLECTOR_BUILDER_INTERNAL_TOKEN;
  return !token || request.headers.get("x-toyhunter-internal-token") === token;
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean) : [];
}

function correctionRule(oldValue: unknown, newValue: unknown) {
  const before = words(oldValue);
  const after = words(newValue);
  if (!before.length || !after.length) return null;
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix].toLowerCase() === after[prefix].toLowerCase()) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix].toLowerCase() === after[after.length - 1 - suffix].toLowerCase()) suffix++;
  const removed = before.slice(prefix, before.length - suffix).join(" ");
  const added = after.slice(prefix, after.length - suffix).join(" ");
  if (!removed && !added) return null;
  return {
    operation: removed && added ? "replace_text" : removed ? "remove_text" : "add_text",
    removed_text: removed || null,
    added_text: added || null,
    example_before: before.join(" "),
    example_after: after.join(" "),
  };
}

function patternKey(fieldName: string, rule: NonNullable<ReturnType<typeof correctionRule>>) {
  return [fieldName, rule.operation, rule.removed_text, rule.added_text]
    .map((value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("collector_ai_learning_patterns").select("*").order("evidence_count", { ascending: false }).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, patterns: data || [] });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  const body = await request.json();

  if (body.action === "generate") {
    const { data: events, error } = await supabaseAdmin.from("collector_ai_learning_events").select("id,field_name,old_value,new_value").eq("field_name", "item_name").in("review_outcome", ["MINOR_EDIT", "MAJOR_EDIT"]).order("created_at", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    const groups = new Map<string, { fieldName: string; rule: NonNullable<ReturnType<typeof correctionRule>>; eventIds: string[] }>();
    for (const event of events || []) {
      const rule = correctionRule(event.old_value, event.new_value);
      if (!rule) continue;
      const key = patternKey(event.field_name, rule);
      const group = groups.get(key) || { fieldName: event.field_name, rule, eventIds: [] as string[] };
      group.eventIds.push(event.id);
      groups.set(key, group);
    }
    const candidates = [...groups.entries()].filter(([, group]) => group.eventIds.length >= 2).map(([key, group]) => ({
      pattern_key: key,
      pattern_type: "field_correction",
      field_name: group.fieldName,
      scope: { status: "global_candidate" },
      rule: group.rule,
      evidence_event_ids: group.eventIds,
      evidence_count: group.eventIds.length,
    }));
    if (candidates.length) {
      const { error: upsertError } = await supabaseAdmin.from("collector_ai_learning_patterns").upsert(candidates, { onConflict: "pattern_key" });
      if (upsertError) return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, generated: candidates.length });
  }

  if (["approve", "reject"].includes(body.action) && typeof body.id === "string") {
    const status = body.action === "approve" ? "approved" : "rejected";
    const { error } = await supabaseAdmin.from("collector_ai_learning_patterns").update({ status, approved_by: "collector-learning-ui", approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", body.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Pattern = {
  id: string;
  field_name: string;
  rule: { operation: string; removed_text: string | null; added_text: string | null; example_before: string; example_after: string };
  evidence_count: number;
  status: string;
};

export default function CollectorLearningPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPatterns() {
    const response = await fetch("/api/internal/collector-learning/patterns");
    const data = await response.json();
    if (!data.success) return setError(data.error || "Patronen konden niet worden geladen.");
    setPatterns(data.patterns || []);
  }

  async function runAction(action: string, id?: string) {
    setError(null);
    const response = await fetch("/api/internal/collector-learning/patterns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    const data = await response.json();
    if (!data.success) return setError(data.error || "Actie mislukt.");
    setMessage(action === "generate" ? `${data.generated} patroonvoorstellen gevonden.` : "Patroonbeoordeling opgeslagen.");
    await loadPatterns();
  }

  useEffect(() => { loadPatterns(); }, []);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Learning Engine</p>
          <h1 style={titleStyle}>Patroonvoorstellen</h1>
          <p style={mutedStyle}>Correcties worden gegroepeerd, maar nooit automatisch toegepast.</p>
        </div>
        <div style={buttonRowStyle}>
          <Link href="/internal/collector-review" style={secondaryButtonStyle}>AI Inbox</Link>
          <button style={primaryButtonStyle} onClick={() => runAction("generate")}>Analyseer correcties</button>
        </div>
      </header>
      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}
      <section style={gridStyle}>
        {patterns.map((pattern) => (
          <article key={pattern.id} style={cardStyle}>
            <div style={cardHeaderStyle}><strong>{pattern.field_name}</strong><span>{pattern.status} · {pattern.evidence_count} voorbeelden</span></div>
            <p><b>Voor:</b> {pattern.rule.example_before}</p>
            <p><b>Na:</b> {pattern.rule.example_after}</p>
            <p><b>Patroon:</b> {pattern.rule.operation} “{pattern.rule.removed_text || "—"}” → “{pattern.rule.added_text || "—"}”</p>
            {pattern.status === "candidate" && <div style={buttonRowStyle}>
              <button style={approveButtonStyle} onClick={() => runAction("approve", pattern.id)}>Goedkeuren</button>
              <button style={rejectButtonStyle} onClick={() => runAction("reject", pattern.id)}>Afwijzen</button>
            </div>}
          </article>
        ))}
        {!patterns.length && <p style={mutedStyle}>Nog geen terugkerende patronen gevonden.</p>}
      </section>
    </main>
  );
}

const pageStyle = { maxWidth: "1200px", margin: "0 auto", padding: "32px 28px", color: "#f8fafc" };
const headerStyle = { display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start", marginBottom: "18px" };
const eyebrowStyle = { margin: 0, color: "#67e8f9", fontWeight: 800, textTransform: "uppercase" as const };
const titleStyle = { margin: "4px 0", fontSize: "38px" };
const mutedStyle = { color: "#cbd5e1" };
const gridStyle = { display: "grid", gap: "12px" };
const cardStyle = { border: "1px solid rgba(148,163,184,0.22)", borderRadius: "8px", padding: "14px", background: "rgba(15,23,42,0.82)" };
const cardHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", color: "#cbd5e1" };
const buttonRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" as const };
const primaryButtonStyle = { border: "1px solid rgba(34,211,238,0.42)", background: "rgba(8,145,178,0.45)", color: "#f8fafc", borderRadius: "7px", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { ...primaryButtonStyle, textDecoration: "none", background: "rgba(15,23,42,0.8)" };
const approveButtonStyle = { ...primaryButtonStyle, background: "rgba(22,163,74,0.55)" };
const rejectButtonStyle = { ...primaryButtonStyle, background: "rgba(190,18,60,0.5)" };
const successStyle = { border: "1px solid rgba(34,197,94,0.4)", padding: "10px", marginBottom: "12px", color: "#dcfce7" };
const errorStyle = { border: "1px solid rgba(251,113,133,0.5)", padding: "10px", marginBottom: "12px", color: "#ffe4e6" };

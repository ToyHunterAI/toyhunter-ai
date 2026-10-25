"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; name: string; item_type: string; manufacturer: string | null; release_year: number | null; collector_toylines: { name: string } | { name: string }[] | null };
type Media = { id: string; image_url: string; image_type: string; source: string; notes: string | null };

export default function CollectorMediaPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageType, setImageType] = useState("reference");
  const [source, setSource] = useState("human_review");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const response = await fetch(`/api/internal/collector-review/items?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!data.success) return setError(data.error || "Zoeken mislukt.");
    setItems(data.items || []);
  }

  async function selectItem(item: Item) {
    setSelected(item);
    const response = await fetch(`/api/internal/collector-media?itemId=${item.id}`);
    const data = await response.json();
    if (!data.success) return setError(data.error || "Media laden mislukt.");
    setMedia(data.media || []);
  }

  async function addMedia() {
    if (!selected) return;
    setError(null);
    const response = await fetch("/api/internal/collector-media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: selected.id, imageUrl, imageType, source, notes }),
    });
    const data = await response.json();
    if (!data.success) return setError(data.error || "Afbeelding opslaan mislukt.");
    setImageUrl(""); setNotes(""); setMessage("Goedgekeurde referentieafbeelding gekoppeld.");
    await selectItem(selected);
  }

  return <main style={pageStyle}>
    <header style={headerStyle}><div><p style={eyebrowStyle}>Collector Knowledge</p><h1 style={titleStyle}>Reference Media</h1><p style={mutedStyle}>Koppel gecontroleerde voorbeeldfoto’s aan goedgekeurde Collector Items.</p></div><Link href="/internal/collector-review" style={linkStyle}>AI Inbox</Link></header>
    {message && <div style={successStyle}>{message}</div>}{error && <div style={errorStyle}>{error}</div>}
    <section style={layoutStyle}>
      <aside style={panelStyle}><h2>Zoek item</h2><div style={rowStyle}><input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} /><button style={buttonStyle} onClick={search}>Zoeken</button></div><div style={listStyle}>{items.map((item) => <button key={item.id} style={itemStyle} onClick={() => selectItem(item)}><strong>{item.name}</strong><span>{item.item_type} · {item.release_year || "jaar onbekend"}</span></button>)}</div></aside>
      <section style={panelStyle}>{!selected ? <p style={mutedStyle}>Kies eerst een Collector Item.</p> : <><h2>{selected.name}</h2><label style={fieldStyle}>Afbeelding-URL<input style={inputStyle} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label><label style={fieldStyle}>Type<select style={inputStyle} value={imageType} onChange={(e) => setImageType(e.target.value)}>{["reference","box","accessory","instruction","sticker","catalog","other"].map((type) => <option key={type}>{type}</option>)}</select></label><label style={fieldStyle}>Bron<input style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)} /></label><label style={fieldStyle}>Notitie<textarea style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button style={buttonStyle} onClick={addMedia}>Referentie toevoegen</button><div style={mediaGridStyle}>{media.map((item) => <article key={item.id} style={mediaStyle}><img src={item.image_url} alt={selected.name} style={imageStyle} /><strong>{item.image_type}</strong><span>{item.source}</span>{item.notes && <span>{item.notes}</span>}</article>)}</div></>}</section>
    </section>
  </main>;
}

const pageStyle = { maxWidth: "1300px", margin: "0 auto", padding: "32px 28px", color: "#f8fafc" };
const headerStyle = { display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "16px" };
const eyebrowStyle = { margin: 0, color: "#67e8f9", fontWeight: 800, textTransform: "uppercase" as const };
const titleStyle = { margin: "4px 0", fontSize: "38px" }; const mutedStyle = { color: "#cbd5e1" };
const layoutStyle = { display: "grid", gridTemplateColumns: "360px 1fr", gap: "14px", alignItems: "start" };
const panelStyle = { border: "1px solid rgba(148,163,184,.22)", borderRadius: "8px", padding: "14px", background: "rgba(15,23,42,.82)" };
const rowStyle = { display: "flex", gap: "8px" }; const listStyle = { display: "grid", gap: "7px", marginTop: "12px" };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid rgba(148,163,184,.35)", borderRadius: "6px", background: "#020617", color: "#f8fafc", padding: "9px" };
const fieldStyle = { display: "grid", gap: "5px", marginBottom: "10px", color: "#cbd5e1" };
const buttonStyle = { border: "1px solid rgba(34,211,238,.42)", borderRadius: "7px", background: "rgba(8,145,178,.45)", color: "#f8fafc", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const itemStyle = { display: "grid", gap: "3px", textAlign: "left" as const, border: "1px solid rgba(148,163,184,.2)", borderRadius: "7px", background: "rgba(2,6,23,.45)", color: "#f8fafc", padding: "9px", cursor: "pointer" };
const mediaGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "10px", marginTop: "16px" };
const mediaStyle = { display: "grid", gap: "4px", color: "#cbd5e1" }; const imageStyle = { width: "100%", aspectRatio: "1/1", objectFit: "cover" as const, borderRadius: "7px" };
const linkStyle = { color: "#67e8f9", textDecoration: "none", fontWeight: 800 }; const successStyle = { padding: "10px", color: "#dcfce7" }; const errorStyle = { padding: "10px", color: "#fecdd3" };

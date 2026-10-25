"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../src/lib/supabase/client";

type HuntProfile = {
  id: string;
  toy_categories: string[];
  platforms: string[];
  max_budget: number | null;
  region: string | null;
  minimum_profit: number | null;
  frequency: string | null;
};

type HuntResult = {
  id: string;
  platform: string;
  title: string;
  price: number | null;
  shipping: number | null;
  total_cost: number | null;
  market_value: number | null;
  potential_profit: number | null;
  item_url: string;
  image_url: string | null;
  hidden_gem_score: number;
  opportunity_label: string | null;
  reasons: string[];
  found_at: string;
};

type MarketplaceListing = {
  id: string; platform: string; title: string; url: string;
  price: number | null; currency: string; image: string | null;
  shipping: number | null; found_at: string | null;
  price_kind: "auction" | "bid" | "unverified" | "fixed"; price_notice: string;
};

// Voorselectie op herkenbare vintage speelgoedlijnen; dit is GEEN waardebepaling.
const TOY_TARGETS: { name: string; pattern: RegExp }[] = [
  { name: "Masters of the Universe", pattern: /\b(?:motu|masters of the universe|he[ -]?man|skeletor|grayskull)\b/i },
  { name: "Transformers", pattern: /\b(?:transformers?|optimus prime|megatron|autobot|decepticon)\b/i },
  { name: "ThunderCats", pattern: /\b(?:thunder\s?cats?|lion[ -]?o|mumm[ -]?ra)\b/i },
  { name: "Dino Riders", pattern: /\b(?:dino[ -]?riders?)\b/i },
  { name: "M.A.S.K.", pattern: /\b(?:m\.?a\.?s\.?k\.?|matt trakker|venom mask)\b/i },
  { name: "G.I. Joe / Action Force", pattern: /\b(?:g\.?i\.?\s?joe|action force|cobra commander)\b/i },
  { name: "SilverHawks", pattern: /\b(?:silverhawks?)\b/i },
  { name: "BraveStarr", pattern: /\b(?:bravestarr)\b/i },
  { name: "Bionic Six", pattern: /\b(?:bionic six|bionic 6)\b/i },
];
const EXCLUDED = /\b(?:lego|funko|pop!|funko pop)\b/i;
function candidateToyline(title: string): string | null {
  if (EXCLUDED.test(title)) return null;
  return TOY_TARGETS.find(target => target.pattern.test(title))?.name ?? null;
}

export default function DailyHuntPage() {
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<HuntProfile | null>(null);
  const [results, setResults] = useState<HuntResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [listingsError, setListingsError] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"candidates" | "all">("candidates");
  const [showAuctions, setShowAuctions] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDailyHunt() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      try {
        const response = await fetch("/api/hunt/listings", { cache: "no-store" });
        if (!response.ok) throw new Error("Advertenties konden niet worden opgehaald");
        const payload = await response.json();
        setListings(payload.listings ?? []);
      } catch {
        setListingsError("Advertenties ophalen mislukt. Probeer de pagina opnieuw.");
      }

      const { data: profileData } = await supabase
        .from("hunt_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      setProfile(profileData);

      if (profileData) {
        const { data: resultData, error: resultError } = await supabase
          .from("hunt_results")
          .select("*")
          .eq("user_id", user.id)
          .order("found_at", { ascending: false })
          .limit(200);

        console.log("USER:", user.id);
console.log("RESULTS:", resultData);
console.log("ERROR:", resultError);

setResults(resultData ?? []);
      }

      setLoading(false);
    }

    loadDailyHunt();
  }, [supabase]);

  const candidates = listings.filter(item => candidateToyline(item.title) !== null);
  const visibleListings = (viewMode === "candidates" ? candidates : listings)
    .filter(item => platformFilter === "all" || item.platform === platformFilter)
    .filter(item => showAuctions || item.price_kind !== "auction")
    .filter(item => !todayOnly || (item.found_at && new Date(item.found_at).toDateString() === new Date().toDateString()));
  const todayCount = listings.filter(item => item.found_at && new Date(item.found_at).toDateString() === new Date().toDateString()).length;
  const auctionCount = listings.filter(item => item.price_kind === "auction").length;

  if (loading) {
    return (
      <main className="th-page th-hunt" style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Daily Hunt</h1>
          <p style={textStyle}>Loading your hunt...</p>
        </section>
      </main>
    );
  }

  if (!email) {
    return (
      <main className="th-page th-hunt" style={pageStyle}>
        <section style={cardStyle}>
          <p style={eyebrowStyle}>ToyHunter AI</p>
          <h1 style={titleStyle}>Daily Hunt</h1>
          <p style={textStyle}>
            Login first to view your personal daily hidden gems.
          </p>
          <Link href="/login" style={primaryButtonStyle}>
            Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="th-page th-hunt" style={pageStyle}>
      <section style={{ maxWidth: 1100, margin: "0 auto 18px" }}>
        <p style={{ color: "#8ce5e7", fontSize: 12, letterSpacing: 2, fontWeight: 800, margin: 0 }}>TOYHUNTER DAILY</p>
        <h1 style={{ margin: "6px 0", fontSize: "clamp(27px, 6vw, 42px)" }}>Nieuwe vondsten</h1>
        <p style={{ color: "#9abcc4", margin: "0 0 14px", fontSize: 13 }}>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" }).format(new Date())} · {todayCount} vandaag · {listings.length} recent · {auctionCount} veilingen</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
          <button type="button" onClick={() => setViewMode("candidates")} aria-pressed={viewMode === "candidates"} style={pill(viewMode === "candidates")}>🔎 Kandidaten</button>
          <button type="button" onClick={() => setViewMode("all")} aria-pressed={viewMode === "all"} style={pill(viewMode === "all")}>Alles</button>
          <button type="button" onClick={() => setTodayOnly(!todayOnly)} aria-pressed={todayOnly} style={pill(todayOnly)}>🆕 Vandaag</button>
          <button type="button" onClick={() => setShowAuctions(!showAuctions)} aria-pressed={showAuctions} style={pill(showAuctions)}>🔨 Veilingen {showAuctions ? "aan" : "uit"}</button>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 0" }}>
          {["all", ...Array.from(new Set(listings.map(x => x.platform)))].map(platform => (
            <button key={platform} type="button" onClick={() => setPlatformFilter(platform)} style={{ ...pill(platformFilter === platform), flexShrink: 0, fontSize: 11 }}>{platform === "all" ? "Alle platforms" : platform}</button>
          ))}
        </div>
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        {listingsError && <p role="alert">{listingsError}</p>}
        {!listingsError && visibleListings.length === 0 && <p style={{ color: "#a9c5cc" }}>Geen advertenties met deze filters. Probeer ‘Alles’ of zet veilingen aan.</p>}
        <div className="th-daily-grid">
          {visibleListings.map(item => (
            <article key={item.id} style={{ minWidth: 0, overflow: "hidden", borderRadius: 14, border: "1px solid #1c5666", background: "#102c36" }}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Bekijk ${item.title}`} style={{ display: "block", textDecoration: "none", color: "white" }}>
                <div style={{ position: "relative", background: "#091b24", aspectRatio: "1 / 1" }}>
                  {item.image ? <img src={item.image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#91b6bf", fontSize: 12 }}>Geen foto</div>}
                  <span title={item.price_notice} style={{ position: "absolute", top: 8, right: 8, background: "#061b24ed", borderRadius: 9, padding: "5px 8px", fontSize: 15 }}>
                    {item.price_kind === "auction" ? "🔨" : item.price_kind === "bid" ? "🤝" : item.price_kind === "fixed" ? "🏷️" : "⚠️"}
                  </span>
                </div>
                <div style={{ padding: "10px 11px 4px" }}>
                  <div style={{ fontSize: 10, color: "#8ce5e7", textTransform: "uppercase", letterSpacing: .5 }}>{item.platform}</div>
                  <h2 style={{ fontSize: 13, lineHeight: 1.3, margin: "5px 0 8px", fontWeight: 650, height: "2.6em", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>{item.title}</h2>
                  <strong style={{ fontSize: 18 }}>{item.price == null ? "Prijs onbekend" : (() => { try { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || "EUR", maximumFractionDigits: 2 }).format(item.price); } catch { return `${item.price} ${item.currency || "EUR"}`; } })()}</strong>
                  <span style={{ display: "block", fontSize: 10, color: "#a9c5cc", marginTop: 3 }}>{item.price_kind === "auction" ? "Veiling" : item.price_kind === "bid" ? "Startbod" : item.price_kind === "fixed" ? "Vraagprijs" : "Prijs onbevestigd"}</span>
                </div>
              </a>
              <button type="button" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} aria-expanded={expandedId === item.id} style={{ background: "none", border: 0, color: "#9bdce7", padding: "8px 11px 11px", fontSize: 11, cursor: "pointer", textAlign: "left" }}>{expandedId === item.id ? "Minder info ↑" : "Details ↓"}</button>
              {expandedId === item.id && <div style={{ padding: "0 11px 12px", color: "#b8d0d6", fontSize: 11, lineHeight: 1.5 }}><p style={{ margin: "0 0 6px" }}>{item.price_notice}</p>{candidateToyline(item.title) && <p style={{ margin: 0 }}>🔎 {candidateToyline(item.title)} · Nog niet op waarde beoordeeld</p>}</div>}
            </article>
          ))}
        </div>
      </section>
      <style jsx>{`@media (max-width: 600px) { .th-daily-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; } } @media (min-width: 601px) { .th-daily-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; } } .th-daily-grid { display: grid; }`}</style>
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Beoordeelde Hidden Gems</h2>

        {results.length === 0 ? (
          <div style={emptyStateStyle}>
            <h3 style={emptyTitleStyle}>No daily results yet</h3>
            <p style={textStyle}>
              Er zijn nog geen advertenties met een berekende Hidden Gem-score.
              De geïmporteerde advertenties staan hierboven.
            </p>


          </div>
        ) : (
          <div style={resultsGridStyle}>
            {results.map((result) => (
              <a
                key={result.id}
                href={result.item_url}
                target="_blank"
                rel="noreferrer"
                style={resultCardStyle}
              >
                {result.image_url && (
                  <img
                    src={result.image_url}
                    alt={result.title}
                    style={imageStyle}
                  />
                )}

                <div style={resultContentStyle}>
                  <span style={platformStyle}>{result.platform}</span>
                  <h3 style={resultTitleStyle}>{result.title}</h3>

                  <div style={priceGridStyle}>
                    <span>Total cost: €{result.total_cost ?? "-"}</span>
                    <span>Market value: €{result.market_value ?? "-"}</span>
                    <span>Profit: €{result.potential_profit ?? "-"}</span>
                    <span>Score: {result.hidden_gem_score}</span>
                  </div>

                  {result.opportunity_label && (
                    <strong style={labelStyle}>{result.opportunity_label}</strong>
                  )}

                  {result.reasons?.length > 0 && (
                    <ul style={reasonListStyle}>
                      {result.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function pill(active: boolean) {
  return { background: active ? "#12667b" : "#102b35", border: "1px solid #247e91", borderRadius: 20, padding: "8px 11px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 };
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617 0%, #111827 100%)",
  color: "white",
  padding: "22px 12px",
};

const headerStyle = {
  maxWidth: "1100px",
  margin: "0 auto 24px",
};

const cardStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "22px",
  padding: "24px",
};

const eyebrowStyle = {
  color: "#facc15",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  marginBottom: "8px",
};

const titleStyle = {
  fontSize: "46px",
  margin: "0 0 12px",
};

const subtitleStyle = {
  color: "#94a3b8",
  fontSize: "17px",
  lineHeight: "1.6",
  maxWidth: "760px",
};

const textStyle = {
  color: "#94a3b8",
  lineHeight: "1.6",
};

const sectionTitleStyle = {
  fontSize: "24px",
  margin: "0 0 18px",
};

const profileBoxStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "18px",
  padding: "18px",
  marginTop: "24px",
};

const smallLabelStyle = {
  display: "block",
  color: "#94a3b8",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "4px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "18px",
};

const primaryButtonStyle = {
  display: "inline-block",
  textDecoration: "none",
  background: "#facc15",
  color: "#111827",
  padding: "14px 18px",
  borderRadius: "12px",
  fontWeight: 900,
  marginTop: "14px",
};

const secondaryButtonStyle = {
  display: "inline-block",
  textDecoration: "none",
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  padding: "12px 16px",
  borderRadius: "12px",
  fontWeight: 800,
};

const emptyStateStyle = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: "18px",
  padding: "24px",
};

const emptyTitleStyle = {
  fontSize: "22px",
  margin: "0 0 8px",
};

const previewBoxStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "18px",
  color: "#cbd5e1",
};

const resultsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px",
};

const resultCardStyle = {
  overflow: "hidden",
  borderRadius: "18px",
  background: "#020617",
  border: "1px solid #334155",
  color: "white",
  textDecoration: "none",
};

const imageStyle = {
  width: "100%",
  height: "190px",
  objectFit: "cover" as const,
  background: "#111827",
};

const resultContentStyle = {
  padding: "16px",
};

const platformStyle = {
  color: "#facc15",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const resultTitleStyle = {
  fontSize: "17px",
  lineHeight: "1.35",
};

const priceGridStyle = {
  display: "grid",
  gap: "6px",
  color: "#cbd5e1",
  fontSize: "14px",
  marginBottom: "12px",
};

const labelStyle = {
  display: "inline-block",
  color: "#111827",
  background: "#facc15",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  marginBottom: "10px",
};

const reasonListStyle = {
  color: "#94a3b8",
  paddingLeft: "18px",
  margin: "8px 0 0",
  fontSize: "14px",
};
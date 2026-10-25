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
    .filter(item => platformFilter === "all" || item.platform === platformFilter);

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
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>
        <h1 style={titleStyle}>Daily Hunt</h1>
        <p style={subtitleStyle}>
          Echte speelgoedadvertenties uit onze database. Waardebepaling volgt later.
        </p>

        <div style={profileBoxStyle}>
          <div>
            <span style={smallLabelStyle}>Signed in as</span>
            <strong>{email}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Active profile</span>
            <strong>{profile?.toy_categories?.length ?? 0} toy targets</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Platforms</span>
            <strong>{profile?.platforms?.join(", ") || "Nog niet ingesteld"}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Budget</span>
            <strong>€{profile?.max_budget ?? 0}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Minimum profit</span>
            <strong>€{profile?.minimum_profit ?? 0}</strong>
          </div>
        </div>

        <div className="th-actions" style={buttonRowStyle}>
          <Link href="/hunt-setup" style={secondaryButtonStyle}>
            Edit Hunt Settings
          </Link>
          <Link href="/account" style={secondaryButtonStyle}>
            Back to My Account
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Hidden Gem-kandidaten ({candidates.length})</h2>
        <p style={textStyle}>Automatisch herkende speelgoedlijnen. Biedingen, veilingen en onbevestigde prijzen tellen niet als koopjes. Ontbrekende foto’s worden gemarkeerd.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          <button type="button" onClick={() => setViewMode("candidates")} aria-pressed={viewMode === "candidates"}
            style={{ ...secondaryButtonStyle, background: viewMode === "candidates" ? "#12667b" : "#102b35", cursor: "pointer" }}>Kandidaten ({candidates.length})</button>
          <button type="button" onClick={() => setViewMode("all")} aria-pressed={viewMode === "all"}
            style={{ ...secondaryButtonStyle, background: viewMode === "all" ? "#12667b" : "#102b35", cursor: "pointer" }}>Alle advertenties ({listings.length})</button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 0 18px" }}>
          {["all", ...Array.from(new Set(listings.map(x => x.platform)))].map(platform => (
            <button key={platform} onClick={() => setPlatformFilter(platform)}
              style={{ border: "1px solid #247e91", background: platformFilter === platform ? "#12667b" : "#102b35", color: "white", borderRadius: 20, padding: "9px 13px", whiteSpace: "nowrap", cursor: "pointer" }}>
              {platform === "all" ? "Alles" : platform}
            </button>
          ))}
        </div>
        {listingsError && <p role="alert">{listingsError}</p>}
        {!listingsError && listings.length === 0 && <p style={textStyle}>Nog geen advertenties beschikbaar.</p>}
        {viewMode === "candidates" && candidates.length === 0 && !listingsError && <p style={textStyle}>Geen herkenbare kandidaten in de laatste advertenties. Kies ‘Alle advertenties’ om alles te bekijken.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14 }}>
          {visibleListings.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", overflow: "hidden", borderRadius: 15, border: "1px solid #1c5666", background: "#102c36", textDecoration: "none", color: "white" }}>
              {item.image ? <img src={item.image} alt="" loading="lazy" style={{ width: "100%", height: 190, objectFit: "contain", background: "#091b24" }} />
                : <div style={{ height: 100, display: "grid", placeItems: "center", color: "#91b6bf" }}>Geen foto</div>}
              <div style={{ padding: 14 }}>
                <div style={{ color: "#8ce5e7", fontSize: 12, textTransform: "uppercase" }}>{item.platform}</div>
                {candidateToyline(item.title) && <div style={{ marginTop: 6, color: "#ffca61", fontSize: 12 }}>🔎 {candidateToyline(item.title)} · Nog te beoordelen</div>}
                <h3 style={{ fontSize: 16, lineHeight: 1.4, margin: "8px 0", overflowWrap: "anywhere" }}>{item.title}</h3>
                <div style={{ margin: "8px 0", fontSize: 12, fontWeight: 700, color: item.price_kind === "auction" || item.price_kind === "bid" ? "#ffd184" : "#9adce7" }}>
                  {item.price_kind === "auction" ? "🔨 Veiling" : item.price_kind === "bid" ? "🔨 Startbod" : item.price_kind === "fixed" ? "🏷️ Vaste vraagprijs" : "⚠️ Prijs niet geverifieerd"}
                </div>
                <strong style={{ fontSize: 20 }}>{item.price == null ? "Prijs onbekend" : (() => { try { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || "EUR" }).format(item.price); } catch { return `${item.price} ${item.currency || "EUR"}`; } })()}</strong>
                <p style={{ fontSize: 12, color: "#a9c5cc", margin: "7px 0 0", lineHeight: 1.45 }}>{item.price_notice || "Prijssoort nog niet gecontroleerd."}</p>
                {!item.image && <p style={{ fontSize: 12, color: "#ffd184", margin: "6px 0 0" }}>⚠️ Geen foto beschikbaar – handmatige controle nodig.</p>}
                <div style={{ marginTop: 10, color: "#a6dbe4", fontSize: 13 }}>Bekijk advertentie ↗</div>
              </div>
            </a>
          ))}
        </div>
      </section>
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

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617 0%, #111827 100%)",
  color: "white",
  padding: "40px 24px",
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
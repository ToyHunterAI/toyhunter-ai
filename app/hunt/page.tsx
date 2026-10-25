"use client";

import Link from "next/link";
import { createPortal, flushSync } from "react-dom";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";
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
  const [supabase] = useState(() => createClient());

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
  type Choice = "saved" | "dismissed";
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const choicesRef = useRef<Record<string, Choice>>({});
  const [folder, setFolder] = useState<"hunt" | "finds">("hunt");
  const [findsTab, setFindsTab] = useState<Choice>("saved");
  const [showSwipeTip, setShowSwipeTip] = useState(false);
  const [tipClosing, setTipClosing] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [swipeFlash, setSwipeFlash] = useState<Record<string, Choice>>({});
  const [undo, setUndo] = useState<{ id: string; previous?: Choice } | null>(null);
  const [storageError, setStorageError] = useState("");
  const storageKey = useRef("");
  const flashTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const gesture = useRef<{ x: number; y: number; id: string; pointerId: number; axis: "x" | "y" | null } | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => () => {
    for (const timer of flashTimers.current.values()) clearTimeout(timer);
  }, []);

  function persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      setStorageError("Opslaan op dit apparaat is niet gelukt. Houd deze pagina open; je keuzes kunnen bij herladen verloren gaan.");
    }
  }

  function updateChoices(next: Record<string, Choice>) {
    choicesRef.current = next;
    setChoices(next);
    if (storageKey.current) persist(storageKey.current, JSON.stringify(next));
  }

  function clearFlash(id: string) {
    const timer = flashTimers.current.get(id);
    if (timer) clearTimeout(timer);
    flashTimers.current.delete(id);
    setSwipeFlash(current => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function decide(id: string, choice: Choice) {
    // Commit immediately. Only the visual feedback is delayed, so undo/reload
    // cannot race with a pending decision timer.
    if (flashTimers.current.has(id)) return;
    const previous = choicesRef.current[id];
    setUndo({ id, previous });
    updateChoices({ ...choicesRef.current, [id]: choice });
    setSwipeFlash(current => ({ ...current, [id]: choice }));
    setTipClosing(true);
    // animationend removes the card after its final fade. This is a fallback
    // for browsers that suspend animations in a background tab.
    flashTimers.current.set(id, setTimeout(() => clearFlash(id), 3500));
  }

  function undoLast() {
    if (!undo) return;
    clearFlash(undo.id);
    const next = { ...choicesRef.current };
    if (undo.previous) next[undo.id] = undo.previous;
    else delete next[undo.id];
    updateChoices(next);
    setUndo(null);
  }

  function restore(id: string) {
    const next = { ...choicesRef.current };
    delete next[id];
    updateChoices(next);
    clearFlash(id);
    if (undo?.id === id) setUndo(null);
  }

  function startSwipe(e: PointerEvent<HTMLElement>, id: string) {
    if (e.pointerType === "touch" || folder !== "hunt" || flashTimers.current.has(id) || !e.isPrimary || e.button !== 0 ||
        (e.target as HTMLElement).closest("button, input, select, textarea")) return;
    gesture.current = { x: e.clientX, y: e.clientY, id, pointerId: e.pointerId, axis: null };
  }

  function moveSwipe(e: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        start.axis = "x";
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        start.axis = "y";
      }
    }
    if (start.axis === "x") {
      suppressClickUntil.current = e.timeStamp + 500;
      setDrag({ id: start.id, x: dx });
    }
  }

  function endSwipe(e: PointerEvent<HTMLElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.pointerId !== e.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (start.axis !== "x") return;
    suppressClickUntil.current = e.timeStamp + 500;
    const dx = e.clientX - start.x;
    const threshold = Math.max(30, Math.min(44, e.currentTarget.clientWidth * .085));
    if (!cancelled && Math.abs(dx) >= threshold) decide(start.id, dx > 0 ? "saved" : "dismissed");
  }


  const commitTouchSwipe = useEffectEvent((id: string, choice: Choice) => decide(id, choice));
  const markTipSeen = useEffectEvent(() => {
    if (storageKey.current) persist(storageKey.current + ":floating-tip:v1", "seen");
  });

  useEffect(() => {
    if (!showSwipeTip) return;
    const timer = setTimeout(() => {
      if (tipClosing) { setShowSwipeTip(false); markTipSeen(); }
      else setTipClosing(true);
    }, tipClosing ? 450 : 5500);
    return () => clearTimeout(timer);
  }, [showSwipeTip, tipClosing]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || loading || folder !== "hunt") return;
    let active: { id: string; identifier: number; x: number; y: number; time: number; width: number; axis: "x" | "y" | null } | null = null;
    const reset = () => { active = null; setDrag(null); };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) { reset(); return; }
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("input, select, textarea")) return;
      const card = target.closest<HTMLElement>("article[data-listing-id]");
      const id = card?.dataset.listingId;
      if (!card || !id || flashTimers.current.has(id)) return;
      const touch = event.touches[0];
      active = { id, identifier: touch.identifier, x: touch.clientX, y: touch.clientY, time: event.timeStamp, width: card.clientWidth, axis: null };
    };
    const move = (event: TouchEvent) => {
      if (!active || event.touches.length !== 1) { reset(); return; }
      const touch = Array.from(event.touches).find(t => t.identifier === active?.identifier);
      if (!touch) return;
      const dx = touch.clientX - active.x, dy = touch.clientY - active.y;
      if (!active.axis) {
        if (Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy) * 1.05) active.axis = "x";
        else if (Math.abs(dy) >= 18 && Math.abs(dy) > Math.abs(dx) * 1.5) active.axis = "y";
      }
      if (active.axis === "x") {
        // Native, non-passive listener: Safari can yield horizontal gestures
        // to us while ordinary vertical scrolling remains native.
        if (event.cancelable) event.preventDefault();
        suppressClickUntil.current = event.timeStamp + 500;
        setDrag({ id: active.id, x: dx });
      }
    };
    const end = (event: TouchEvent) => {
      if (!active) return;
      const touch = Array.from(event.changedTouches).find(t => t.identifier === active?.identifier);
      if (!touch) return;
      const current = active;
      const dx = touch.clientX - current.x, dy = touch.clientY - current.y;
      const elapsed = Math.max(1, event.timeStamp - current.time);
      const horizontal = current.axis !== "y" && Math.abs(dx) > Math.abs(dy) * 1.05;
      const distance = Math.max(30, Math.min(44, current.width * .085));
      const committed = horizontal && (Math.abs(dx) >= distance || (Math.abs(dx) >= 26 && Math.abs(dx) / elapsed >= .35));
      if (current.axis === "x" || committed) {
        suppressClickUntil.current = event.timeStamp + 500;
        if (event.cancelable) event.preventDefault();
      }
      reset();
      if (committed) flushSync(() => commitTouchSwipe(current.id, dx > 0 ? "saved" : "dismissed"));
    };
    grid.addEventListener("touchstart", start, { passive: true });
    grid.addEventListener("touchmove", move, { passive: false });
    grid.addEventListener("touchend", end, { passive: false });
    grid.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      grid.removeEventListener("touchstart", start);
      grid.removeEventListener("touchmove", move);
      grid.removeEventListener("touchend", end);
      grid.removeEventListener("touchcancel", reset);
    };
  }, [loading, folder]);


  useEffect(() => {
    async function loadDailyHunt() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      const key = `toyhunter:swipes:v1:${user.id}`;
      storageKey.current = key;
      let cached: MarketplaceListing[] = [];
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "{}");
        const valid: Record<string, Choice> = {};
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          for (const [id, choice] of Object.entries(stored)) {
            if (choice === "saved" || choice === "dismissed") valid[id] = choice;
          }
        }
        choicesRef.current = valid;
        setChoices(valid);
        setShowSwipeTip(localStorage.getItem(key + ":floating-tip:v1") !== "seen");
      } catch {
        setShowSwipeTip(true);
        setStorageError("Eerdere keuzes konden niet worden gelezen op dit apparaat.");
      }
      try {
        const storedListings = JSON.parse(localStorage.getItem(key + ":listings") || "[]");
        if (Array.isArray(storedListings)) cached = storedListings.filter(item =>
          item && typeof item.id === "string" && typeof item.title === "string" &&
          typeof item.platform === "string" && typeof item.url === "string");
      } catch { /* A damaged cache must not prevent fetching current listings. */ }
      setListings(cached);
      try {
        const response = await fetch("/api/hunt/listings", { cache: "no-store" });
        if (!response.ok) throw new Error("Advertenties konden niet worden opgehaald");
        const payload = await response.json();
        // The API returns only the latest 100. Keep previously seen listings,
        // including undecided ones, across days and after feed rotation.
        const merged = new Map(cached.map(item => [item.id, item]));
        const incoming: MarketplaceListing[] = payload.listings ?? [];
        for (const item of incoming) merged.set(item.id, item);
        const allListings = [...incoming, ...Array.from(merged.values()).filter(item => !incoming.some(newItem => newItem.id === item.id))];
        setListings(allListings);
        persist(key + ":listings", JSON.stringify(allListings));
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
  const visibleListings = folder === "finds"
    ? listings.filter(item => choices[item.id] === findsTab)
    : (viewMode === "candidates" ? candidates : listings)
    .filter(item => platformFilter === "all" || item.platform === platformFilter)
    .filter(item => showAuctions || item.price_kind !== "auction")
    .filter(item => !todayOnly || (item.found_at && new Date(item.found_at).toDateString() === new Date().toDateString()))
    .filter(item => !choices[item.id] || Boolean(swipeFlash[item.id]));
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
        <h1 style={{ margin: "6px 0", fontSize: "clamp(27px, 6vw, 42px)" }}>{folder === "hunt" ? "Nieuwe vondsten" : "Mijn vondsten"}</h1>
        <p style={{ color: "#9abcc4", margin: "0 0 14px", fontSize: 13 }}>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" }).format(new Date())} · {todayCount} vandaag · {listings.length} recent · {auctionCount} veilingen</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", marginBottom: 10 }}>
          <button type="button" style={pill(folder === "hunt")} onClick={() => setFolder("hunt")}>🔎 Hunt</button>
          <button type="button" style={pill(folder === "finds")} onClick={() => setFolder("finds")}>Mijn vondsten</button>
          {undo && <button type="button" style={pill(false)} onClick={undoLast}>↩ Ongedaan maken</button>}
        </div>
        {storageError && <p role="alert">{storageError}</p>}
        {folder === "finds" && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          <button type="button" aria-pressed={findsTab === "saved"} style={pill(findsTab === "saved")} onClick={() => setFindsTab("saved")}>❤️ Bewaard ({Object.values(choices).filter(x => x === "saved").length})</button>
          <button type="button" aria-pressed={findsTab === "dismissed"} style={pill(findsTab === "dismissed")} onClick={() => setFindsTab("dismissed")}>👎 Niet geïnteresseerd ({Object.values(choices).filter(x => x === "dismissed").length})</button>
        </div>}
        {folder === "hunt" && <><div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
          <button type="button" onClick={() => setViewMode("candidates")} aria-pressed={viewMode === "candidates"} style={pill(viewMode === "candidates")}>🔎 Kandidaten</button>
          <button type="button" onClick={() => setViewMode("all")} aria-pressed={viewMode === "all"} style={pill(viewMode === "all")}>Alles</button>
          <button type="button" onClick={() => setTodayOnly(!todayOnly)} aria-pressed={todayOnly} style={pill(todayOnly)}>🆕 Vandaag</button>
          <button type="button" onClick={() => setShowAuctions(!showAuctions)} aria-pressed={showAuctions} style={pill(showAuctions)}>🔨 Veilingen {showAuctions ? "aan" : "uit"}</button>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 0" }}>
          {["all", ...Array.from(new Set(listings.map(x => x.platform)))].map(platform => (
            <button key={platform} type="button" onClick={() => setPlatformFilter(platform)} style={{ ...pill(platformFilter === platform), flexShrink: 0, fontSize: 11 }}>{platform === "all" ? "Alle platforms" : platform}</button>
          ))}
        </div></>}
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        {listingsError && <p role="alert">{listingsError}</p>}
        {!listingsError && visibleListings.length === 0 && <p style={{ color: "#a9c5cc" }}>Geen advertenties in dit overzicht. Je kunt de filters aanpassen of een andere map openen.</p>}
        <div ref={gridRef} className="th-daily-grid">
          {visibleListings.map(item => (
            <article key={item.id} data-listing-id={item.id}
              onPointerDown={e => startSwipe(e, item.id)}
              onPointerMove={moveSwipe}
              onPointerUp={e => endSwipe(e)}
              onPointerCancel={e => endSwipe(e, true)}
              onLostPointerCapture={e => { if (e.target === e.currentTarget) endSwipe(e, true); }}
              onDragStart={e => e.preventDefault()}
              onClickCapture={e => {
                if (e.timeStamp < suppressClickUntil.current) { e.preventDefault(); e.stopPropagation(); }
              }}
              style={{ minWidth: 0, overflow: "hidden", borderRadius: 14, border: "1px solid #1c5666", background: "#102c36", position: "relative", animation: folder === "hunt" && swipeFlash[item.id] ? "thCardLeave 1000ms linear both" : undefined, touchAction: "auto", transform: drag?.id === item.id ? `translateX(${Math.max(-110, Math.min(110, drag.x))}px) rotate(${Math.max(-6, Math.min(6, drag.x / 20))}deg)` : undefined, transition: drag?.id === item.id ? "none" : "transform 180ms ease-out" }}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Bekijk ${item.title}`} style={{ display: "block", textDecoration: "none", color: "white" }}>
                <div style={{ position: "relative", background: "#091b24", aspectRatio: "1 / 1" }}>
                  {item.image ? <img src={item.image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#91b6bf", fontSize: 12 }}>Geen foto</div>}
                  {item.price_kind !== "unverified" && <span title={item.price_notice} style={{ position: "absolute", top: 8, right: 8, background: "#061b24ed", borderRadius: 9, padding: "5px 8px", fontSize: 15 }}>
                    {item.price_kind === "auction" ? "🔨" : item.price_kind === "bid" ? "🤝" : item.price_kind === "fixed" ? "🏷️" : "⚠️"}
                  </span>}
                </div>
                <div style={{ padding: "10px 11px 4px" }}>
                  <div style={{ fontSize: 10, color: "#8ce5e7", textTransform: "uppercase", letterSpacing: .5 }}>{item.platform}</div>
                  <h2 style={{ fontSize: 13, lineHeight: 1.3, margin: "5px 0 8px", fontWeight: 650, height: "2.6em", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>{item.title}</h2>
                  <strong style={{ fontSize: 18 }}>{item.price == null ? "Prijs onbekend" : (() => { try { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || "EUR", maximumFractionDigits: 2 }).format(item.price); } catch { return `${item.price} ${item.currency || "EUR"}`; } })()}</strong>
                  <span style={{ display: "block", fontSize: 10, color: "#a9c5cc", marginTop: 3 }}>{item.price_kind === "auction" ? "Veiling" : item.price_kind === "bid" ? "Startbod" : item.price_kind === "fixed" ? "Vraagprijs" : ""}</span>
                </div>
              </a>
              {folder === "hunt" ? <div style={{ display: "flex", gap: 8, padding: "8px 11px 0" }}>
                <button type="button" onClick={() => decide(item.id, "dismissed")} style={pill(false)}>👎 Niet geïnteresseerd</button>
                <button type="button" onClick={() => decide(item.id, "saved")} style={pill(false)}>❤️ Bewaren</button>
              </div> : <button type="button" onClick={() => restore(item.id)} style={{ margin: "8px 11px 0", padding: "6px 9px", background: "#214c57", border: 0, borderRadius: 7, color: "white" }}>↩ Terug naar Hunt</button>}

              <button type="button" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} aria-expanded={expandedId === item.id} style={{ background: "none", border: 0, color: "#9bdce7", padding: "8px 11px 11px", fontSize: 11, cursor: "pointer", textAlign: "left" }}>{expandedId === item.id ? "Minder info ↑" : "Details ↓"}</button>
              {expandedId === item.id && <div style={{ padding: "0 11px 12px", color: "#b8d0d6", fontSize: 11, lineHeight: 1.5 }}><p style={{ margin: "0 0 6px" }}>{item.price_notice}</p>{candidateToyline(item.title) && <p style={{ margin: 0 }}>🔎 {candidateToyline(item.title)} · Nog niet op waarde beoordeeld</p>}</div>}
            </article>
          ))}
        </div>
      </section>
      {folder === "hunt" && typeof document !== "undefined" && createPortal(<>
        {showSwipeTip && <div role="status" className="th-floating-tip" style={{ position: "fixed", left: "50%", bottom: "calc(108px + env(safe-area-inset-bottom, 0px))", width: "min(420px, calc(100vw - 32px))", padding: "16px 18px", borderRadius: 20, background: "rgba(12, 45, 56, .94)", border: "1px solid #5be4e577", boxShadow: "0 12px 44px #0007", backdropFilter: "blur(16px)", color: "#e0fbff", textAlign: "center", fontSize: 14, lineHeight: 1.65, zIndex: 3001, pointerEvents: "none", animation: tipClosing ? "thTipExit 450ms ease-in both" : "thTipHover 2200ms ease-in-out infinite" }}>
          <strong style={{ display: "block", fontSize: 12, letterSpacing: 2, color: "#8ce5e7" }}>SWIPE</strong>
          👈 Niet geïnteresseerd <span style={{ opacity: .45 }}> | </span> ❤️ Bewaren 👉
        </div>}
        {[...Object.entries(swipeFlash), ...(drag && !swipeFlash[drag.id] && Math.abs(drag.x) > 10 ? [[drag.id, drag.x > 0 ? "saved" : "dismissed"]] : [])].map(([id, choice]) => <div key={id + (swipeFlash[id] ? ":confirmed" : ":dragging")} aria-hidden="true" className="th-swipe-feedback" style={{ position: "fixed", inset: 0, zIndex: 3000, pointerEvents: "none" }}>
          <span className="th-swipe-symbol" onAnimationStart={e => {
            if (e.target !== e.currentTarget || !swipeFlash[id]) return;
            const timer = flashTimers.current.get(id);
            if (timer) clearTimeout(timer);
            flashTimers.current.set(id, setTimeout(() => clearFlash(id), 1500));
          }} onAnimationEnd={e => { if (e.target === e.currentTarget && swipeFlash[id]) clearFlash(id); }} style={{ position: "absolute", left: "50%", top: "45%", display: "block", fontSize: "clamp(110px, 28vw, 160px)", lineHeight: 1, filter: "drop-shadow(0 10px 28px #0008)", transform: "translate(-50%, -50%)", opacity: swipeFlash[id] ? undefined : Math.min(.85, Math.abs(drag?.x ?? 0) / 90), animation: swipeFlash[id] ? "thSwipeFloat 1000ms cubic-bezier(.22,.61,.36,1) both" : undefined }}>
            {choice === "saved" ? "❤️" : "👎"}
          </span>
        </div>)}
      </>, document.body)}
      <style jsx>{`
        @keyframes thSwipeFloat {
          0% { opacity: 0; transform: translate(-50%, calc(-50% + 18px)) scale(.7); }
          22% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, calc(-50% - 18px)) scale(1.12); }
          74% { opacity: .7; transform: translate(-50%, calc(-50% - 42px)) scale(1.16); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 78px)) scale(1.2); }
        }
        @keyframes thTipHover {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
        @keyframes thTipExit {
          from { opacity: 1; transform: translate(-50%, -5px); }
          to { opacity: 0; transform: translate(-50%, -30px); }
        }
        @keyframes thCardLeave {
          0%, 86% { opacity: 1; }
          100% { opacity: 0; }
        }
        .th-daily-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; width: 100%; }
        .th-daily-grid > article { width: 100%; }
        @media (min-width: 1024px) {
          .th-daily-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .th-swipe-symbol { animation-name: thSwipeStill !important; }
        }
        @keyframes thSwipeStill {
          0% { opacity: 0; }
          22%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      {folder === "hunt" && <section style={cardStyle}>
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
      </section>}
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
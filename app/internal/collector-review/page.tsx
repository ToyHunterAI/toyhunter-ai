"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QueueSuggestion = {
  id: string;
  status: string;
  confidence: number;
  confidenceGroup: "high" | "medium" | "low";
  identityConfidence: number;
  createdAt: string;
  itemName: string;
  itemType: string;
  toyline: string;
  manufacturer: string | null;
  releaseYear: number | null;
  thumbnailUrl: string | null;
  sourceListingTitle: string | null;
  sourceListingUrl: string | null;
  populationJobId: string | null;
};

type PopulationRun = {
  id: string;
  search_query: string | null;
  created_at: string;
  status: string;
};

type DetailResponse = {
  success: boolean;
  suggestion: any;
  summary: QueueSuggestion;
  proposal: any;
  collectorKnowledge: any;
  sourceContext: SourceContext | null;
  approvalEvents: any[];
  aiFeedback: any[];
  learningEvents: any[];
  error?: string;
};

type SourceContext = {
  platform: string;
  sourcePlatform: string | null;
  title: string | null;
  listingUrl: string | null;
  price: number | null;
  shippingCost: number | null;
  currency: string | null;
  ebayItemId: string | null;
  foundAt: string | null;
  searchQuery: string | null;
  imageUrls: string[];
  populationListingId: string | null;
  isMissingListing: boolean;
};

type QueueResponse = {
  success: boolean;
  suggestions: QueueSuggestion[];
  stats: {
    totalUnresolved: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    approvedToday: number;
    rejectedToday: number;
  };
  filters?: {
    runs?: PopulationRun[];
  };
  error?: string;
};

const emptyStats = {
  totalUnresolved: 0,
  highConfidence: 0,
  mediumConfidence: 0,
  lowConfidence: 0,
  approvedToday: 0,
  rejectedToday: 0,
};

const rejectReasons = [
  "Verkeerde identiteit",
  "Verkeerde toyline",
  "Verkeerde fabrikant",
  "Verkeerd jaar",
  "AI is te onzeker",
  "Slechte foto's",
  "Anders",
];

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function stringList(value: unknown): string[] {
  return asArray(value)
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .filter(Boolean);
}

function confidenceText(value: number | null | undefined) {
  const confidence = Number(value || 0);
  const percent = `${Math.round(confidence * 100)}%`;

  if (confidence >= 1) return `${percent} · HIT!`;
  if (confidence >= 0.8) return `${percent} · Echt de moeite waard.`;
  if (confidence >= 0.6) return `${percent} · Ik twijfel.`;
  return `${percent} · Niet de moeite waard.`;
}

function itemIcon(itemType: string) {
  const type = itemType.toLowerCase();
  if (type.includes("creature")) return "🦖";
  if (type.includes("vehicle")) return "🚗";
  if (type.includes("figure")) return "👤";
  if (type.includes("accessory") || type.includes("weapon") || type.includes("part")) return "⚙";
  if (type.includes("box")) return "📦";
  return "🤖";
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeValue).sort();
  if (typeof value === "string") return value.trim().toLowerCase();
  return value ?? null;
}

function changed(left: unknown, right: unknown) {
  return JSON.stringify(normalizeValue(left)) !== JSON.stringify(normalizeValue(right));
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Niet opgeslagen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Niet opgeslagen";

  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || ""}`.trim();
  }
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTraits(value: string) {
  return parseLines(value)
    .map((line) => {
      const [traitName, ...rest] = line.split(":");
      return { traitName: traitName.trim(), traitValue: rest.join(":").trim() };
    })
    .filter((trait) => trait.traitName && trait.traitValue);
}

function proposalValue(proposal: any, key: string) {
  if (key === "itemName") return proposal.item_name || proposal.name;
  if (key === "itemType") return proposal.item_type;
  if (key === "releaseYear") return proposal.release_year;
  if (key === "conditionClasses") return proposal.suggested_condition_classes;
  if (key === "aliases") {
    return asArray(proposal.suggested_aliases).map((alias) => asRecord(alias).alias);
  }
  if (key === "traits") {
    return asArray(proposal.suggested_traits).map((trait) => {
      const record = asRecord(trait);
      return `${record.trait_name || record.traitName}: ${
        record.trait_value || record.traitValue
      }`;
    });
  }
  return proposal[key];
}

function naturalReasons(proposal: any, detail: DetailResponse | null) {
  const evidence = asRecord(proposal.evidence_summary);
  const graph = asRecord(evidence.graph);
  const reasons = [
    ...stringList(evidence.observed_by_vision).map((item) => `Vision ziet: ${item}`),
    ...stringList(evidence.text).map((item) => `Tekst gebruikt: ${item}`),
    ...stringList(evidence.collector_knowledge || evidence.database).map(
      (item) => `Collector Brain: ${item}`
    ),
    ...stringList(graph.approved_relationships).map(
      (item) => `Bekende relatie: ${item}`
    ),
    ...stringList(evidence.inferences).map((item) => `Conclusie: ${item}`),
  ];

  if (detail?.collectorKnowledge?.item?.name) {
    reasons.push(`Collector Brain kent: ${detail.collectorKnowledge.item.name}`);
  }

  return [...new Set(reasons)].slice(0, 8);
}

function sellerClaims(proposal: any) {
  const evidence = asRecord(proposal.evidence_summary);
  return [
    ...stringList(evidence.seller_claims),
    ...stringList(evidence.listing_claims),
  ];
}

export default function CollectorReviewPage() {
  const [suggestions, setSuggestions] = useState<QueueSuggestion[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [runs, setRuns] = useState<PopulationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState("latest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [mode, setMode] = useState<"review" | "edit" | "reject">("review");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [skipHistory, setSkipHistory] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(rejectReasons[0]);
  const [rejectComment, setRejectComment] = useState("");
  const [editState, setEditState] = useState({
    itemName: "",
    toyline: "",
    manufacturer: "",
    releaseYear: "",
    itemType: "",
    aliases: "",
    traits: "",
    relationships: "",
    conditionClasses: "",
    notes: "",
  });

  const selectedIndex = useMemo(
    () => suggestions.findIndex((suggestion) => suggestion.id === selectedId),
    [selectedId, suggestions]
  );

  async function loadQueue(keepSelection = true) {
    const params = new URLSearchParams({
      unresolvedOnly: "true",
      sort: "highest_confidence",
      run: selectedRun,
    });
    const response = await fetch(`/api/internal/collector-review/queue?${params}`);
    const data = (await response.json()) as QueueResponse;

    if (!data.success) {
      setErrorMessage(data.error || "De wachtrij kon niet worden geladen.");
      return;
    }

    setSuggestions(data.suggestions || []);
    setStats(data.stats || emptyStats);
    setRuns(data.filters?.runs || []);

    if (!keepSelection || !selectedId || !data.suggestions.some((item) => item.id === selectedId)) {
      setSelectedId(data.suggestions[0]?.id || null);
    }
  }

  async function loadDetail(id: string | null) {
    if (!id) {
      setDetail(null);
      return;
    }

    const response = await fetch(`/api/internal/collector-review/detail?id=${id}`);
    const data = (await response.json()) as DetailResponse;

    if (!data.success) {
      setErrorMessage(data.error || "Het voorstel kon niet worden geladen.");
      return;
    }

    setDetail(data);
    hydrateEditor(data);
    setSelectedImageUrl(data.sourceContext?.imageUrls?.[0] || data.summary.thumbnailUrl || null);
    setMode("review");
    setShowMore(false);
  }

  function hydrateEditor(data: DetailResponse) {
    const proposal = data.proposal || {};
    setEditState({
      itemName: proposal.item_name || proposal.name || "",
      toyline: proposal.toyline || "",
      manufacturer: proposal.manufacturer || "",
      releaseYear: proposal.release_year ? String(proposal.release_year) : "",
      itemType: proposal.item_type || "",
      aliases: asArray(proposal.suggested_aliases)
        .map((alias) => asRecord(alias).alias)
        .filter(Boolean)
        .join("\n"),
      traits: asArray(proposal.suggested_traits)
        .map((trait) => {
          const record = asRecord(trait);
          return `${record.trait_name || record.traitName || ""}: ${
            record.trait_value || record.traitValue || ""
          }`.trim();
        })
        .filter((line) => line !== ":")
        .join("\n"),
      relationships: stringList(asRecord(proposal.evidence_summary).graph).join("\n"),
      conditionClasses: asArray(proposal.suggested_condition_classes).join(", "),
      notes: proposal.notes || "",
    });
  }

  function currentAction() {
    const matchedId =
      detail?.suggestion?.collector_item_id ||
      detail?.suggestion?.suggested_collector_item_id ||
      asRecord(asArray(detail?.proposal?.collector_knowledge_matches)[0]).collectorItemId;

    return matchedId
      ? {
          action: "APPROVE_MATCH_UPDATE",
          targetCollectorItemId: matchedId,
          reviewOutcome: "PERFECT",
        }
      : {
          action: "APPROVE_NEW_ITEM",
          reviewOutcome: "PERFECT",
        };
  }

  async function approveCurrent() {
    const action = currentAction();
    await runApproval(action.action, {
      reviewOutcome: action.reviewOutcome,
      targetCollectorItemId: action.targetCollectorItemId,
    });
  }

  async function submitEdit() {
    await runApproval("EDIT_AND_APPROVE", {
      reviewOutcome: "MINOR_EDIT",
      edits: {
        reviewOutcome: "MINOR_EDIT",
        itemName: editState.itemName,
        toyline: editState.toyline,
        manufacturer: editState.manufacturer || null,
        releaseYear: editState.releaseYear ? Number(editState.releaseYear) : null,
        itemType: editState.itemType,
        aliases: parseLines(editState.aliases),
        traits: parseTraits(editState.traits),
        conditionClasses: editState.conditionClasses
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: editState.notes || null,
      },
    });
  }

  async function submitReject() {
    await runApproval("REJECT", {
      reviewOutcome: "REJECT",
      edits: {
        reviewOutcome: "REJECT",
        rejectionReason: `${rejectReason}${rejectComment ? `: ${rejectComment}` : ""}`,
      },
    });
  }

  async function runApproval(action: string, extra: Record<string, any>) {
    if (!selectedId) return;
    if (!detail?.sourceContext?.listingUrl) {
      setErrorMessage("Bron ontbreekt. Eerst controleren.");
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    const response = await fetch("/api/internal/collector-approval", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        suggestionId: selectedId,
        action,
        reviewerId: "collector-review-trainer-ui",
        approvalNotes: editState.notes || null,
        ...extra,
      }),
    });
    const data = await response.json();

    if (!data.success || !data.result?.success) {
      setErrorMessage(data.error || "De beoordeling is niet opgeslagen.");
      return;
    }

    setStatusMessage(
      `Opgeslagen. AI leerde: ${data.result.learning?.summary?.join(", ") || "beoordeling verwerkt"}`
    );
    await loadQueue(false);
    const next = suggestions[selectedIndex + 1] || suggestions[selectedIndex - 1];
    setSelectedId(next?.id || null);
  }

  function reviewLater() {
    if (!selectedId) return;

    const reviewedAt = new Date().toISOString();
    const nextHistory = { ...skipHistory, [selectedId]: reviewedAt };
    setSkipHistory(nextHistory);
    window.localStorage.setItem(
      "toyhunter.collectorReview.skips",
      JSON.stringify(nextHistory)
    );
    setStatusMessage("Voor later bewaard. Er is niets goedgekeurd, afgewezen of geleerd.");
    setErrorMessage(null);

    const next = suggestions[selectedIndex + 1] || suggestions[selectedIndex - 1];
    setSelectedId(next?.id || selectedId);
  }

  function move(direction: -1 | 1) {
    const next = suggestions[selectedIndex + direction];
    if (next) setSelectedId(next.id);
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("toyhunter.collectorReview.skips");
      setSkipHistory(stored ? JSON.parse(stored) : {});
    } catch {
      setSkipHistory({});
    }
  }, []);

  useEffect(() => {
    loadQueue(false);
  }, [selectedRun]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "Enter" && detail?.sourceContext?.listingUrl) approveCurrent();
      if (event.key.toLowerCase() === "e") setMode("edit");
      if (event.key.toLowerCase() === "r") setMode("reject");
      if (event.key === "ArrowDown") move(1);
      if (event.key === "ArrowUp") move(-1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, selectedIndex, suggestions, detail, editState]);

  const proposal = detail?.proposal || {};
  const sourceContext = detail?.sourceContext || null;
  const sourceImageUrls = sourceContext?.imageUrls || [];
  const imageUrl = selectedImageUrl ||
    detail?.summary.thumbnailUrl ||
    asArray(proposal.evidence_summary?.images)[0]?.url ||
    null;
  const sourceListingUrl = sourceContext?.listingUrl || detail?.summary.sourceListingUrl || null;
  const canReview = Boolean(sourceListingUrl);
  const skippedAt = selectedId ? skipHistory[selectedId] : null;
  const reasons = naturalReasons(proposal, detail);
  const claims = sellerClaims(proposal);
  const diffRows = [
    ["Item naam", proposalValue(proposal, "itemName"), editState.itemName],
    ["Toyline", proposalValue(proposal, "toyline"), editState.toyline],
    ["Type", proposalValue(proposal, "itemType"), editState.itemType],
    ["Fabrikant", proposalValue(proposal, "manufacturer"), editState.manufacturer],
    ["Jaar", proposalValue(proposal, "releaseYear"), editState.releaseYear],
    ["Conditie", proposalValue(proposal, "conditionClasses"), editState.conditionClasses],
  ];

  return (
    <main style={pageStyle}>
      <header style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>🧠 ToyHunter AI Trainer</h1>
          <p style={subtitleStyle}>Leer ToyHunter denken als een ervaren vintage toy collector.</p>
        </div>
        <div style={headlineStatsStyle}>
          <strong>Nog te beoordelen: {stats.totalUnresolved}</strong>
          <span>Vandaag geleerd: {stats.approvedToday + stats.rejectedToday}</span>
          <span>AI nauwkeurigheid: Nog aan het leren</span>
          <Link href="/internal/collector-learning" style={learningLinkStyle}>Open Learning Engine</Link>
          <Link href="/internal/collector-media" style={learningLinkStyle}>Open Reference Media</Link>
        </div>
      </header>

      <button style={ghostButtonStyle} onClick={() => setShowStats(!showStats)}>
        Statistieken {showStats ? "verbergen" : "tonen"}
      </button>

      {showStats && (
        <section style={statsPanelStyle}>
          <Stat label="Hoog zeker" value={stats.highConfidence} />
          <Stat label="Redelijk" value={stats.mediumConfidence} />
          <Stat label="Twijfel" value={stats.lowConfidence} />
          <Stat label="Goedgekeurd vandaag" value={stats.approvedToday} />
          <Stat label="Afgewezen vandaag" value={stats.rejectedToday} />
        </section>
      )}

      {statusMessage && <div style={successStyle}>{statusMessage}</div>}
      {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

      <section style={trainerLayoutStyle}>
        <aside style={queueStyle}>
          <div style={panelHeaderStyle}>
            <strong>Wachtrij</strong>
            <span>{suggestions.length}</span>
          </div>
          <label style={runFilterStyle}>
            <span>Population-run</span>
            <select
              style={inputStyle}
              value={selectedRun}
              onChange={(event) => setSelectedRun(event.target.value)}
            >
              <option value="latest">Nieuwste run</option>
              <option value="all">Alle runs</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {formatDateTime(run.created_at)} · {run.search_query || "Zonder zoekterm"}
                </option>
              ))}
            </select>
          </label>
          <div style={queueListStyle}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                style={{
                  ...queueItemStyle,
                  ...(selectedId === suggestion.id ? selectedQueueItemStyle : {}),
                }}
                onClick={() => setSelectedId(suggestion.id)}
              >
                {suggestion.thumbnailUrl ? (
                  <img src={suggestion.thumbnailUrl} alt="" style={queueImageStyle} />
                ) : (
                  <div style={queueImageFallbackStyle}>{itemIcon(suggestion.itemType)}</div>
                )}
                <div style={queueTextStyle}>
                  <span style={queueTitleStyle}>
                    {itemIcon(suggestion.itemType)} {suggestion.itemName}
                  </span>
                  <span>{suggestion.toyline}</span>
                  <span style={confidenceBadgeStyle}>{confidenceText(suggestion.confidence)}</span>
                </div>
                <span style={statusBadgeStyle}>{suggestion.status}</span>
              </button>
            ))}
          </div>
        </aside>

        <section style={reviewStyle}>
          {!detail ? (
            <section style={emptyStateStyle}>
              <h2>Kies een voorstel</h2>
              <p>De volgende AI-training staat klaar zodra je iets uit de wachtrij kiest.</p>
            </section>
          ) : (
            <>
              <section style={imagePanelStyle}>
                <section style={sourcePanelStyle}>
                  <div style={sourceHeaderStyle}>
                    <div>
                      <p style={eyebrowStyle}>Originele bron</p>
                      <h2 style={sourceTitleStyle}>
                        {sourceContext?.title || detail.summary.sourceListingTitle || detail.summary.itemName}
                      </h2>
                    </div>
                    {sourceListingUrl ? (
                      <a href={sourceListingUrl} target="_blank" rel="noreferrer" style={openListingButtonStyle}>
                        Open originele advertentie
                      </a>
                    ) : (
                      <span style={sourceMissingBadgeStyle}>Bron ontbreekt</span>
                    )}
                  </div>

                  {sourceContext?.isMissingListing && (
                    <div style={sourceWarningStyle}>Deze advertentie is niet meer beschikbaar.</div>
                  )}

                  {!sourceListingUrl && (
                    <div style={sourceWarningStyle}>Bron ontbreekt. Eerst controleren.</div>
                  )}

                  {skippedAt && (
                    <div style={skipNoticeStyle}>Eerder overgeslagen: {formatDateTime(skippedAt)}</div>
                  )}

                  <div style={sourceFactGridStyle}>
                    <Fact label="Platform" value={sourceContext?.platform || "Niet opgeslagen"} />
                    <Fact label="Prijs" value={formatMoney(sourceContext?.price, sourceContext?.currency)} />
                    <Fact label="Verzending" value={formatMoney(sourceContext?.shippingCost, sourceContext?.currency)} />
                    <Fact label="Valuta" value={sourceContext?.currency || "Niet opgeslagen"} />
                    <Fact label="eBay item ID" value={sourceContext?.ebayItemId || "Niet opgeslagen"} />
                    <Fact label="Gevonden op" value={formatDateTime(sourceContext?.foundAt)} />
                    <Fact label="Gevonden via" value={sourceContext?.searchQuery || "Niet opgeslagen"} />
                  </div>
                </section>

                {imageUrl && sourceListingUrl ? (
                  <a href={sourceListingUrl} target="_blank" rel="noreferrer" style={mainImageLinkStyle}>
                    <img src={imageUrl} alt={detail.summary.itemName} style={mainImageStyle} />
                  </a>
                ) : imageUrl ? (
                  <img src={imageUrl} alt={detail.summary.itemName} style={mainImageStyle} />
                ) : (
                  <div style={mainImageFallbackStyle}>Geen foto</div>
                )}

                {sourceImageUrls.length > 1 && (
                  <div style={thumbnailGridStyle}>
                    {sourceImageUrls.map((url, index) =>
                      sourceListingUrl ? (
                        <a
                          key={url}
                          href={sourceListingUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            ...thumbnailButtonStyle,
                            ...(url === imageUrl ? selectedThumbnailButtonStyle : {}),
                          }}
                          onMouseEnter={() => setSelectedImageUrl(url)}
                          onFocus={() => setSelectedImageUrl(url)}
                          onClick={() => setSelectedImageUrl(url)}
                          title={`Foto ${index + 1} openen bij originele advertentie`}
                        >
                          <img src={url} alt={`Listing foto ${index + 1}`} style={thumbnailImageStyle} />
                        </a>
                      ) : (
                        <button
                          key={url}
                          style={{
                            ...thumbnailButtonStyle,
                            ...(url === imageUrl ? selectedThumbnailButtonStyle : {}),
                          }}
                          onClick={() => setSelectedImageUrl(url)}
                          title={`Foto ${index + 1}`}
                        >
                          <img src={url} alt={`Listing foto ${index + 1}`} style={thumbnailImageStyle} />
                        </button>
                      )
                    )}
                  </div>
                )}
              </section>

              <section style={conclusionStyle}>
                <p style={eyebrowStyle}>ToyHunter denkt dat dit is:</p>
                <h2 style={itemTitleStyle}>{proposal.item_name || detail.summary.itemName}</h2>
                {["wrong_toyline", "wrong_product_type"].includes(proposal.scope_status) && (
                  <div style={warningStyle}>
                    <strong>
                      ⚠ {proposal.scope_status === "wrong_toyline" ? "Verkeerde toyline" : "Verkeerd producttype"}
                    </strong>
                    <span>
                      {proposal.scope_status === "wrong_toyline"
                        ? "Het zichtbare merk conflicteert met de gekozen speelgoedlijn."
                        : "Dit is geen fysiek speelgoeditem voor deze Hunt."}
                    </span>
                  </div>
                )}
                <div style={factGridStyle}>
                  <Fact label="Toyline" value={proposal.toyline || detail.summary.toyline} />
                  <Fact label="Fabrikant" value={proposal.manufacturer || detail.summary.manufacturer} />
                  <Fact
                    label="Jaar"
                    value={Number(proposal.release_year || detail.summary.releaseYear) || null}
                  />
                  <Fact label="Zekerheid" value={confidenceText(detail.summary.confidence)} />
                </div>
              </section>

              <section style={whyStyle}>
                <h3>Waarom denkt ToyHunter dit?</h3>
                {reasons.length === 0 ? (
                  <p style={mutedStyle}>ToyHunter gaf geen duidelijke reden mee.</p>
                ) : (
                  reasons.map((reason) => <p key={reason}>✓ {reason}</p>)
                )}
                {claims.length > 0 && (
                  <div style={warningStyle}>
                    <strong>⚠ Verkoper claimt:</strong>
                    {claims.map((claim) => (
                      <span key={claim}>{claim}</span>
                    ))}
                    <em>AI kan dit nog niet bevestigen.</em>
                  </div>
                )}
              </section>

              {mode === "review" && (
                <section style={actionRowStyle}>
                  <button style={canReview ? approveButtonStyle : disabledButtonStyle} onClick={approveCurrent} disabled={!canReview}>
                    Goedkeuren
                  </button>
                  <button style={editButtonStyle} onClick={() => setMode("edit")}>
                    Bewerken
                  </button>
                  <button style={canReview ? rejectButtonStyle : disabledButtonStyle} onClick={() => setMode("reject")} disabled={!canReview}>
                    Afwijzen
                  </button>
                  <button style={laterButtonStyle} onClick={reviewLater}>
                    ⏸ Later beoordelen
                  </button>
                </section>
              )}

              {mode === "edit" && (
                <section style={editPanelStyle}>
                  <h3>Pas aan wat ToyHunter moet leren</h3>
                  <div style={editGridStyle}>
                    <Input label="Item naam" value={editState.itemName} onChange={(itemName) => setEditState({ ...editState, itemName })} />
                    <Input label="Toyline" value={editState.toyline} onChange={(toyline) => setEditState({ ...editState, toyline })} />
                    <Input label="Fabrikant" value={editState.manufacturer} onChange={(manufacturer) => setEditState({ ...editState, manufacturer })} />
                    <Input label="Jaar" value={editState.releaseYear} onChange={(releaseYear) => setEditState({ ...editState, releaseYear })} />
                    <Input label="Type" value={editState.itemType} onChange={(itemType) => setEditState({ ...editState, itemType })} />
                    <Input label="Conditieklassen" value={editState.conditionClasses} onChange={(conditionClasses) => setEditState({ ...editState, conditionClasses })} />
                  </div>
                  <Textarea label="Aliassen" value={editState.aliases} onChange={(aliases) => setEditState({ ...editState, aliases })} />
                  <Textarea label="Traits" value={editState.traits} onChange={(traits) => setEditState({ ...editState, traits })} />
                  <Textarea label="Relaties" value={editState.relationships} onChange={(relationships) => setEditState({ ...editState, relationships })} />
                  <Textarea label="Notitie" value={editState.notes} onChange={(notes) => setEditState({ ...editState, notes })} />
                  <div style={actionRowStyle}>
                    <button style={approveButtonStyle} onClick={submitEdit}>Correctie opslaan</button>
                    <button style={ghostButtonStyle} onClick={() => setMode("review")}>Annuleren</button>
                  </div>
                </section>
              )}

              {mode === "reject" && (
                <section style={editPanelStyle}>
                  <h3>Waarom klopt dit niet?</h3>
                  <div style={rejectGridStyle}>
                    {rejectReasons.map((reason) => (
                      <button
                        key={reason}
                        style={{
                          ...reasonButtonStyle,
                          ...(rejectReason === reason ? selectedReasonButtonStyle : {}),
                        }}
                        onClick={() => setRejectReason(reason)}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <Textarea label="Optionele opmerking" value={rejectComment} onChange={setRejectComment} />
                  <div style={actionRowStyle}>
                    <button style={rejectButtonStyle} onClick={submitReject}>Afwijzen</button>
                    <button style={ghostButtonStyle} onClick={() => setMode("review")}>Annuleren</button>
                  </div>
                </section>
              )}
            </>
          )}
        </section>

        <aside style={moreStyle}>
          <button style={moreToggleStyle} onClick={() => setShowMore(!showMore)}>
            Meer informatie {showMore ? "sluiten" : "openen"}
          </button>
          {!showMore ? (
            <section style={autoReviewStyle}>
              <h3>Automatisch beoordelen</h3>
              <p>Nog niet beschikbaar.</p>
            </section>
          ) : (
            <section style={technicalStyle}>
              <InfoBlock title="Collector Brain" items={[
                detail?.collectorKnowledge?.item?.name,
                ...stringList(detail?.collectorKnowledge?.aliases?.map((alias: any) => alias.alias)),
              ]} />
              <InfoBlock title="Bron" items={[
                `Platform: ${sourceContext?.platform || "Niet opgeslagen"}`,
                `Titel: ${sourceContext?.title || "Niet opgeslagen"}`,
                `Prijs: ${formatMoney(sourceContext?.price, sourceContext?.currency)}`,
                `Verzending: ${formatMoney(sourceContext?.shippingCost, sourceContext?.currency)}`,
                `Valuta: ${sourceContext?.currency || "Niet opgeslagen"}`,
                `eBay item ID: ${sourceContext?.ebayItemId || "Niet opgeslagen"}`,
                `Gevonden via: ${sourceContext?.searchQuery || "Niet opgeslagen"}`,
                `Gevonden op: ${formatDateTime(sourceContext?.foundAt)}`,
                sourceContext?.listingUrl,
              ]} />
              <InfoBlock title="Graph relaties" items={[
                ...stringList(detail?.collectorKnowledge?.relationships?.outgoing?.map((item: any) => `${item.relationship_type} → ${item.target_item?.name}`)),
                ...stringList(detail?.collectorKnowledge?.relationships?.incoming?.map((item: any) => `${item.relationship_type} ← ${item.source_item?.name}`)),
              ]} />
              <InfoBlock title="Wijzigingen" items={diffRows.map(([label, before, after]) => `${label}: ${displayValue(before)} → ${displayValue(after)}${changed(before, after) ? " *" : ""}`)} />
              <InfoBlock title="Wat leert AI hiervan?" items={[
                ...detail?.learningEvents?.map((event: any) => `${event.field_name} · ${event.change_type} · ${event.severity}`) || [],
                ...diffRows.filter(([, before, after]) => changed(before, after)).map(([label]) => String(label)),
              ]} />
              <InfoBlock title="AI redenatie" items={stringList(proposal.reasoning)} />
              <InfoBlock title="Geobserveerde objecten" items={asArray(proposal.observed_objects).map((item) => JSON.stringify(item))} />
              <InfoBlock title="Builder output" items={[JSON.stringify(proposal, null, 2)]} />
              <InfoBlock title="Audit" items={[
                ...detail?.approvalEvents?.map((event: any) => `${event.action} · ${new Date(event.created_at).toLocaleString()}`) || [],
                ...detail?.aiFeedback?.map((event: any) => `${event.decision} · ${new Date(event.created_at).toLocaleString()}`) || [],
              ]} />
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={factStyle}>
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <textarea style={textareaStyle} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InfoBlock({ title, items }: { title: string; items: any[] }) {
  const clean = items.filter(Boolean).map(String);
  return (
    <section style={infoBlockStyle}>
      <h3>{title}</h3>
      {clean.length === 0 ? (
        <p style={mutedStyle}>Geen gegevens.</p>
      ) : (
        clean.map((item, index) => <p key={`${title}-${index}`}>{item}</p>)
      )}
    </section>
  );
}

const pageStyle = { maxWidth: "1600px", margin: "0 auto", padding: "28px", color: "#f8fafc" };
const topBarStyle = { display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start", marginBottom: "12px" };
const titleStyle = { margin: 0, fontSize: "34px", lineHeight: 1.1 };
const subtitleStyle = { color: "#cbd5e1", margin: "6px 0 0" };
const headlineStatsStyle = { display: "grid", gap: "5px", textAlign: "right" as const, color: "#cbd5e1", minWidth: "260px" };
const learningLinkStyle = { color: "#67e8f9", textDecoration: "none", fontWeight: 800 };
const statsPanelStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: "10px", margin: "12px 0", border: "1px solid rgba(148,163,184,0.18)", borderRadius: "8px", padding: "10px", background: "rgba(15,23,42,0.75)" };
const trainerLayoutStyle = { display: "grid", gridTemplateColumns: "300px minmax(440px, 1fr) 300px", gap: "14px", alignItems: "start", marginTop: "12px" };
const queueStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", background: "rgba(15,23,42,0.8)", overflow: "hidden", position: "sticky" as const, top: "92px", maxHeight: "calc(100vh - 110px)" };
const panelHeaderStyle = { display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: "1px solid rgba(148,163,184,0.18)", color: "#cbd5e1" };
const runFilterStyle = { display: "grid", gap: "5px", padding: "10px 12px", borderBottom: "1px solid rgba(148,163,184,0.18)", color: "#cbd5e1", fontSize: "12px" };
const queueListStyle = { overflow: "auto", maxHeight: "calc(100vh - 156px)" };
const queueItemStyle = { width: "100%", display: "grid", gridTemplateColumns: "54px 1fr auto", gap: "9px", alignItems: "center", padding: "9px", border: 0, borderBottom: "1px solid rgba(148,163,184,0.12)", background: "rgba(2,6,23,0.35)", color: "#f8fafc", textAlign: "left" as const, cursor: "pointer" };
const selectedQueueItemStyle = { background: "rgba(14,165,233,0.2)", boxShadow: "inset 3px 0 0 #22d3ee" };
const queueImageStyle = { width: "54px", height: "54px", objectFit: "cover" as const, borderRadius: "7px" };
const queueImageFallbackStyle = { width: "54px", height: "54px", borderRadius: "7px", display: "grid", placeItems: "center", background: "rgba(148,163,184,0.14)", fontSize: "22px" };
const queueTextStyle = { display: "grid", gap: "2px", fontSize: "12px", color: "#94a3b8", minWidth: 0 };
const queueTitleStyle = { color: "#f8fafc", fontWeight: 800, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" };
const confidenceBadgeStyle = { color: "#67e8f9", fontWeight: 700 };
const statusBadgeStyle = { fontSize: "10px", color: "#fde68a", border: "1px solid rgba(253,230,138,0.3)", borderRadius: "999px", padding: "3px 6px" };
const reviewStyle = { minWidth: 0 };
const imagePanelStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", background: "rgba(15,23,42,0.82)", padding: "12px", marginBottom: "12px" };
const sourcePanelStyle = { border: "1px solid rgba(34,211,238,0.24)", borderRadius: "8px", padding: "12px", background: "rgba(8,47,73,0.24)", marginBottom: "12px" };
const sourceHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" };
const sourceTitleStyle = { margin: "4px 0 0", fontSize: "20px", lineHeight: 1.25 };
const sourceFactGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(150px, 1fr))", gap: "8px" };
const openListingButtonStyle = { border: "1px solid rgba(103,232,249,0.48)", borderRadius: "7px", padding: "10px 12px", background: "rgba(14,165,233,0.18)", color: "#67e8f9", fontWeight: 900, textDecoration: "none", whiteSpace: "nowrap" as const };
const sourceMissingBadgeStyle = { border: "1px solid rgba(251,113,133,0.5)", borderRadius: "999px", padding: "7px 10px", color: "#fecdd3", fontWeight: 900, whiteSpace: "nowrap" as const };
const sourceWarningStyle = { border: "1px solid rgba(251,113,133,0.5)", background: "rgba(127,29,29,0.36)", borderRadius: "7px", padding: "9px 10px", marginBottom: "10px", color: "#ffe4e6", fontWeight: 800 };
const skipNoticeStyle = { border: "1px solid rgba(251,191,36,0.45)", background: "rgba(113,63,18,0.24)", borderRadius: "7px", padding: "9px 10px", marginBottom: "10px", color: "#fde68a", fontWeight: 800 };
const mainImageLinkStyle = { display: "block", textDecoration: "none" };
const mainImageStyle = { width: "100%", maxHeight: "440px", objectFit: "contain" as const, background: "#020617", borderRadius: "8px" };
const mainImageFallbackStyle = { height: "340px", display: "grid", placeItems: "center", background: "rgba(148,163,184,0.12)", borderRadius: "8px", color: "#94a3b8" };
const thumbnailGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "8px", marginTop: "10px" };
const thumbnailButtonStyle = { border: "1px solid rgba(148,163,184,0.22)", borderRadius: "7px", padding: "3px", background: "rgba(2,6,23,0.5)", cursor: "pointer", display: "block", lineHeight: 0 };
const selectedThumbnailButtonStyle = { borderColor: "#67e8f9", boxShadow: "0 0 0 2px rgba(103,232,249,0.18)" };
const thumbnailImageStyle = { width: "100%", aspectRatio: "1 / 1", objectFit: "cover" as const, borderRadius: "5px" };
const conclusionStyle = { border: "1px solid rgba(34,211,238,0.28)", borderRadius: "8px", padding: "16px", background: "rgba(8,47,73,0.35)", marginBottom: "12px" };
const eyebrowStyle = { margin: 0, color: "#67e8f9", textTransform: "uppercase" as const, fontWeight: 900, fontSize: "12px", letterSpacing: "0.08em" };
const itemTitleStyle = { margin: "6px 0 12px", fontSize: "30px", lineHeight: 1.12 };
const factGridStyle = { display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: "8px" };
const factStyle = { display: "grid", gap: "4px", border: "1px solid rgba(148,163,184,0.16)", borderRadius: "7px", padding: "9px", color: "#cbd5e1" };
const whyStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", padding: "14px", background: "rgba(15,23,42,0.82)", marginBottom: "12px", lineHeight: 1.45 };
const warningStyle = { display: "grid", gap: "4px", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "7px", padding: "10px", background: "rgba(120,53,15,0.2)", color: "#fde68a" };
const actionRowStyle = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "12px" };
const approveButtonStyle = { border: 0, borderRadius: "8px", padding: "16px", background: "#16a34a", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" };
const editButtonStyle = { border: 0, borderRadius: "8px", padding: "16px", background: "#0891b2", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" };
const rejectButtonStyle = { border: 0, borderRadius: "8px", padding: "16px", background: "#be123c", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" };
const laterButtonStyle = { border: 0, borderRadius: "8px", padding: "16px", background: "#475569", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" };
const disabledButtonStyle = { border: 0, borderRadius: "8px", padding: "16px", background: "#334155", color: "#94a3b8", fontSize: "18px", fontWeight: 900, cursor: "not-allowed" };
const editPanelStyle = { border: "1px solid rgba(148,163,184,0.22)", borderRadius: "8px", padding: "14px", background: "rgba(15,23,42,0.9)" };
const editGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" };
const rejectGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "12px" };
const reasonButtonStyle = { border: "1px solid rgba(148,163,184,0.28)", borderRadius: "7px", padding: "10px", background: "rgba(2,6,23,0.5)", color: "#f8fafc", cursor: "pointer" };
const selectedReasonButtonStyle = { borderColor: "#fb7185", background: "rgba(190,18,60,0.32)" };
const moreStyle = { position: "sticky" as const, top: "92px" };
const moreToggleStyle = { width: "100%", border: "1px solid rgba(148,163,184,0.32)", borderRadius: "8px", padding: "12px", background: "rgba(15,23,42,0.85)", color: "#f8fafc", fontWeight: 900, cursor: "pointer", marginBottom: "10px" };
const autoReviewStyle = { border: "1px solid rgba(148,163,184,0.18)", borderRadius: "8px", padding: "14px", background: "rgba(15,23,42,0.72)", color: "#cbd5e1" };
const technicalStyle = { display: "grid", gap: "10px", maxHeight: "calc(100vh - 150px)", overflow: "auto" };
const infoBlockStyle = { border: "1px solid rgba(148,163,184,0.18)", borderRadius: "8px", padding: "10px", background: "rgba(15,23,42,0.78)", color: "#cbd5e1", overflowWrap: "anywhere" as const };
const fieldStyle = { display: "grid", gap: "5px", color: "#cbd5e1", fontSize: "13px", marginBottom: "10px" };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid rgba(148,163,184,0.35)", borderRadius: "6px", background: "#020617", color: "#f8fafc", padding: "9px 10px" };
const textareaStyle = { ...inputStyle, minHeight: "78px", resize: "vertical" as const };
const statStyle = { display: "grid", gap: "4px", color: "#cbd5e1" };
const mutedStyle = { color: "#94a3b8", margin: 0 };
const ghostButtonStyle = { border: "1px solid rgba(148,163,184,0.3)", borderRadius: "7px", padding: "9px 12px", background: "rgba(15,23,42,0.76)", color: "#f8fafc", fontWeight: 800, cursor: "pointer" };
const successStyle = { border: "1px solid rgba(34,197,94,0.4)", background: "rgba(22,101,52,0.32)", borderRadius: "8px", padding: "10px 12px", margin: "12px 0", color: "#dcfce7" };
const errorStyle = { border: "1px solid rgba(251,113,133,0.5)", background: "rgba(127,29,29,0.36)", borderRadius: "8px", padding: "10px 12px", margin: "12px 0", color: "#ffe4e6" };
const emptyStateStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", padding: "24px", background: "rgba(15,23,42,0.82)", color: "#cbd5e1" };

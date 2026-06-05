"use client";

import { useEffect, useState } from "react";

type HiddenGem = {
  target: string;
  title: string;
  price: string;
  priceValue: number;
  condition: string;
  image: string | null;
  itemUrl: string;
  seller: string;
  hiddenGemScore: number;
  opportunityLabel: string;
  reasons: string[];
  risks: string[];
};

const popularHunts = [
  "Dino Riders",
  "G.I. Joe",
  "M.A.S.K.",
  "Masters of the Universe",
  "Power Rangers",
  "Star Wars",
  "Teenage Mutant Ninja Turtles",
  "The Real Ghostbusters",
  "Thundercats",
  "Transformers",
];

const advancedHunts = [
  "Battle Beasts",
  "Blackstar",
  "Boglins",
  "Bravestarr",
  "Bucky O'Hare",
  "C.O.P.S.",
  "Captain Power",
  "Chogokin",
  "Diaclone",
  "Exogini",
  "Food Fighters",
  "Gobots",
  "Inhumanoids",
  "Jayce and the Wheeled Warriors",
  "Kamen Rider",
  "Madballs",
  "Metal Heroes",
  "Microman",
  "Mighty Max",
  "Monster in My Pocket",
  "M.U.S.C.L.E.",
  "Parts & Accessories Lots",
  "Popy DX",
  "Rock Lords",
  "Sectaurs",
  "Silverhawks",
  "Sky Commanders",
  "Spiral Zone",
  "Super Naturals",
  "Super Sentai",
  "Ultraman",
  "Vintage Bootlegs",
  "Visionaries",
];

const platforms = ["eBay", "Facebook Marketplace", "Marktplaats", "Vinted"];

export default function HuntPage() {
  const [selectedPopular, setSelectedPopular] = useState<string[]>([]);
  const [selectedAdvanced, setSelectedAdvanced] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const [hiddenGems, setHiddenGems] = useState<HiddenGem[]>([]);
  const [loadingHunt, setLoadingHunt] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [huntMessage, setHuntMessage] = useState("");

  const activeTargets = [...selectedPopular, ...selectedAdvanced];

  useEffect(() => {
    const savedProfile = localStorage.getItem("toyHunterHuntProfile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);

      const popular = profile.popular || [];
      const advanced = profile.advanced || [];
      const platforms = profile.platforms || [];

      setSelectedPopular(popular);
      setSelectedAdvanced(advanced);
      setSelectedPlatforms(platforms);

      loadDailyHunt(popular, advanced, platforms);
    }
  }, []);

  function getTodayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function getProfileSignature(
    popular: string[],
    advanced: string[],
    platforms: string[]
  ) {
    return JSON.stringify({
      popular: [...popular].sort(),
      advanced: [...advanced].sort(),
      platforms: [...platforms].sort(),
    });
  }

  function buildHuntQuery(target: string) {
    if (target === "Transformers") return "Transformers G1";
    if (target === "M.A.S.K.") return "MASK vintage toy";
    if (target === "Masters of the Universe") return "MOTU vintage";
    if (target === "Star Wars") return "Star Wars vintage Kenner";
    if (target === "G.I. Joe") return "GI Joe vintage";
    if (target === "Teenage Mutant Ninja Turtles") return "TMNT vintage";
    if (target === "The Real Ghostbusters") return "Real Ghostbusters vintage";
    return target;
  }

  async function loadDailyHunt(
    popular: string[],
    advanced: string[],
    platforms: string[]
  ) {
    const today = getTodayKey();
    const profileSignature = getProfileSignature(popular, advanced, platforms);

    const stored = localStorage.getItem("toyHunterDailyHiddenGems");

    if (stored) {
      const parsed = JSON.parse(stored);

      if (
        parsed.date === today &&
        parsed.profileSignature === profileSignature
      ) {
        setHiddenGems(parsed.gems || []);
        setLastScanDate(parsed.date);
        setHuntMessage("Today's Hidden Gems loaded from saved daily hunt.");
        return;
      }
    }

    await runDailyHunt(popular, advanced, platforms, false);
  }

  async function runDailyHunt(
    popular = selectedPopular,
    advanced = selectedAdvanced,
    platformsList = selectedPlatforms,
    forceRefresh = true
  ) {
    const targets = [...popular, ...advanced];

    if (targets.length === 0) {
      setHuntMessage("Select and save at least one hunt target first.");
      return;
    }

    if (!platformsList.includes("eBay")) {
      setHuntMessage("Select eBay as a platform to scan live opportunities.");
      return;
    }

    setLoadingHunt(true);
    setHuntMessage("ToyHunter is scanning for hidden gems...");

    try {
      const targetsToScan = targets.slice(0, 8);
      const allGems: HiddenGem[] = [];

      for (const target of targetsToScan) {
        const query = buildHuntQuery(target);

        const response = await fetch(
          `/api/ebay/search?q=${encodeURIComponent(query)}&limit=50`
        );

        const data = await response.json();

        if (data.success && Array.isArray(data.opportunities)) {
          const mapped = data.opportunities.map((item: HiddenGem) => ({
            ...item,
            target,
          }));

          allGems.push(...mapped);
        }
      }

      const uniqueGems = Array.from(
        new Map(allGems.map((gem) => [gem.itemUrl, gem])).values()
      );

      const sortedGems = uniqueGems
        .sort((a, b) => b.hiddenGemScore - a.hiddenGemScore)
        .slice(0, 20);

      const today = getTodayKey();
      const profileSignature = getProfileSignature(
        popular,
        advanced,
        platformsList
      );

      localStorage.setItem(
        "toyHunterDailyHiddenGems",
        JSON.stringify({
          date: today,
          profileSignature,
          gems: sortedGems,
        })
      );

      setHiddenGems(sortedGems);
      setLastScanDate(today);

      setHuntMessage(
        forceRefresh
          ? `Today's hunt refreshed. ${sortedGems.length} hidden gems found.`
          : `Daily hunt complete. ${sortedGems.length} hidden gems found.`
      );
    } catch (error) {
      console.error(error);
      setHuntMessage("Something went wrong while scanning eBay.");
    }

    setLoadingHunt(false);
  }

  function toggleItem(
    item: string,
    list: string[],
    setList: (value: string[]) => void
  ) {
    if (list.includes(item)) {
      setList(list.filter((value) => value !== item));
    } else {
      setList([...list, item]);
    }

    setSaved(false);
  }

  function saveProfile() {
    const profile = {
      popular: selectedPopular,
      advanced: selectedAdvanced,
      platforms: selectedPlatforms,
    };

    localStorage.setItem("toyHunterHuntProfile", JSON.stringify(profile));

    setSaved(true);
    setHuntMessage("Hunt Profile saved. ToyHunter will use this for daily gems.");

    setTimeout(() => {
      setSaved(false);
    }, 2000);
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroOverlayStyle}>
          <p style={eyebrowStyle}>TOYHUNTER AI</p>

          <h1 style={titleStyle}>
            Find Hidden <span style={{ color: "#22d3ee" }}>Gems.</span>
          </h1>

          <p style={subtitleStyle}>
            Set your hunt profile once. ToyHunter will scan for daily hidden
            gems based on your collector targets.
          </p>
        </div>
      </section>

      <section style={gridStyle}>
        <HuntPanel
          title="Popular Hunts"
          items={popularHunts}
          selectedItems={selectedPopular}
          color="#a855f7"
          onToggle={(item) =>
            toggleItem(item, selectedPopular, setSelectedPopular)
          }
          onSelectAll={() => {
            setSelectedPopular(popularHunts);
            setSaved(false);
          }}
          onClear={() => {
            setSelectedPopular([]);
            setSaved(false);
          }}
        />

        <HuntPanel
          title="Advanced Hunts"
          items={advancedHunts}
          selectedItems={selectedAdvanced}
          color="#22d3ee"
          onToggle={(item) =>
            toggleItem(item, selectedAdvanced, setSelectedAdvanced)
          }
          onSelectAll={() => {
            setSelectedAdvanced(advancedHunts);
            setSaved(false);
          }}
          onClear={() => {
            setSelectedAdvanced([]);
            setSaved(false);
          }}
        />

        <HuntPanel
          title="Platforms"
          items={platforms}
          selectedItems={selectedPlatforms}
          color="#f59e0b"
          onToggle={(item) =>
            toggleItem(item, selectedPlatforms, setSelectedPlatforms)
          }
          onSelectAll={() => {
            setSelectedPlatforms(platforms);
            setSaved(false);
          }}
          onClear={() => {
            setSelectedPlatforms([]);
            setSaved(false);
          }}
        />
      </section>

      <section style={profilePanelStyle}>
        <h2 style={profileTitleStyle}>Active Hunt Profile</h2>

        <p style={profileTextStyle}>
          Save this once. ToyHunter will use it for your Daily Hidden Gems.
        </p>

        <div style={tagGridStyle}>
          {activeTargets.length > 0 ? (
            activeTargets.map((target) => (
              <span key={target} style={targetTagStyle}>
                {target}
              </span>
            ))
          ) : (
            <span style={emptyTextStyle}>No targets selected.</span>
          )}
        </div>

        <h3 style={smallTitleStyle}>Platforms</h3>

        <div style={tagGridStyle}>
          {selectedPlatforms.length > 0 ? (
            selectedPlatforms.map((platform) => (
              <span key={platform} style={platformTagStyle}>
                {platform}
              </span>
            ))
          ) : (
            <span style={emptyTextStyle}>No platforms selected.</span>
          )}
        </div>

        <div style={saveAreaStyle}>
          <button onClick={saveProfile} style={saveButtonStyle}>
            Save Hunt Profile
          </button>

          {saved && <p style={savedTextStyle}>✓ Hunt Profile Saved</p>}
        </div>
      </section>

      <section style={futurePanelStyle}>
        <h2 style={futureTitleStyle}>Today&apos;s Hidden Gems</h2>

        <p style={futureTextStyle}>
          ToyHunter scans your saved hunt profile and shows only the strongest
          opportunities.
        </p>

        {lastScanDate && (
          <p style={scanDateStyle}>Last daily scan: {lastScanDate}</p>
        )}

        <button
          onClick={() => runDailyHunt()}
          disabled={loadingHunt}
          style={{
            ...saveButtonStyle,
            marginBottom: "20px",
            opacity: loadingHunt ? 0.6 : 1,
          }}
        >
          {loadingHunt ? "Scanning..." : "Refresh Today's Hunt"}
        </button>

        {huntMessage && <p style={huntMessageStyle}>{huntMessage}</p>}

        {!loadingHunt && hiddenGems.length === 0 && (
          <div style={emptyOpportunityStyle}>
            No hidden gems found yet. Save your Hunt Profile and include eBay as
            a platform.
          </div>
        )}

        <div style={hiddenGemGridStyle}>
          {hiddenGems.map((gem, index) => (
            <div key={`${gem.itemUrl}-${index}`} style={hiddenGemCardStyle}>
              <div style={hiddenGemTopRowStyle}>
                <span style={scoreBadgeStyle}>
                  {gem.hiddenGemScore}
                </span>

                <div>
                  <p style={targetTextStyle}>{gem.target}</p>
                  <h3 style={hiddenGemTitleStyle}>{gem.title}</h3>
                </div>
              </div>

              <p style={priceStyle}>{gem.price}</p>

              <p style={labelStyle}>{gem.opportunityLabel}</p>

              {gem.image && (
                <img
                  src={gem.image}
                  alt={gem.title}
                  style={imageStyle}
                />
              )}

              {gem.reasons.length > 0 && (
                <>
                  <h4 style={miniSectionTitleStyle}>Why ToyHunter likes this</h4>
                  <ul style={listStyle}>
                    {gem.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </>
              )}

              {gem.risks.length > 0 && (
                <>
                  <h4 style={riskTitleStyle}>Risks</h4>
                  <ul style={listStyle}>
                    {gem.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </>
              )}

              <a
                href={gem.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={searchLinkButtonStyle}
              >
                View on eBay
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function HuntPanel({
  title,
  items,
  selectedItems,
  color,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  color: string;
  onToggle: (item: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        border: `1px solid ${color}`,
        boxShadow: `0 0 28px ${color}33`,
      }}
    >
      <div style={panelHeaderStyle}>
        <h2 style={{ ...panelTitleStyle, color }}>{title}</h2>

        <div style={panelButtonGroupStyle}>
          <button type="button" onClick={onSelectAll} style={miniButtonStyle}>
            Select All
          </button>

          <button type="button" onClick={onClear} style={miniButtonStyle}>
            Clear
          </button>
        </div>
      </div>

      <div style={itemListStyle}>
        {items.map((item) => (
          <label key={item} style={itemStyle}>
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={() => onToggle(item)}
              style={checkboxStyle}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const pageStyle = {
  padding: "60px 40px",
};

const heroStyle = {
  maxWidth: "1200px",
  margin: "0 auto 36px",
  minHeight: "420px",
  backgroundImage: "url('/images/toyhunter-banner.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center 24%",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(34,211,238,0.25)",
  display: "flex",
  alignItems: "stretch",
};

const heroOverlayStyle = {
  width: "100%",
  minHeight: "420px",
  padding: "50px",
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0.12) 100%)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
};

const eyebrowStyle = {
  color: "#f59e0b",
  fontWeight: "900",
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
};

const titleStyle = {
  color: "white",
  fontSize: "54px",
  margin: "10px 0",
  fontWeight: "900",
};

const subtitleStyle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "760px",
  lineHeight: "1.6",
};

const gridStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "22px",
  alignItems: "stretch",
};

const panelStyle = {
  backgroundColor: "rgba(6,10,30,0.68)",
  borderRadius: "22px",
  padding: "24px",
  height: "520px",
  overflow: "hidden",
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "18px",
};

const panelTitleStyle = {
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  fontSize: "18px",
};

const panelButtonGroupStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
};

const miniButtonStyle = {
  border: "1px solid rgba(255,255,255,0.16)",
  backgroundColor: "rgba(255,255,255,0.06)",
  color: "#cbd5e1",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const itemListStyle = {
  display: "grid",
  gap: "12px",
  maxHeight: "420px",
  overflowY: "auto" as const,
  paddingRight: "8px",
};

const itemStyle = {
  color: "#cbd5e1",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "15px",
};

const checkboxStyle = {
  width: "16px",
  height: "16px",
  accentColor: "#22d3ee",
};

const profilePanelStyle = {
  maxWidth: "1200px",
  margin: "24px auto 0",
  backgroundColor: "rgba(168,85,247,0.08)",
  border: "1px solid rgba(168,85,247,0.45)",
  borderRadius: "22px",
  padding: "26px",
};

const profileTitleStyle = {
  color: "#a855f7",
  marginTop: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const profileTextStyle = {
  color: "#94a3b8",
  lineHeight: "1.6",
};

const smallTitleStyle = {
  color: "#f59e0b",
  marginTop: "22px",
  marginBottom: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  fontSize: "15px",
};

const tagGridStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "10px",
};

const targetTagStyle = {
  color: "#e2e8f0",
  border: "1px solid rgba(168,85,247,0.55)",
  backgroundColor: "rgba(168,85,247,0.12)",
  borderRadius: "999px",
  padding: "8px 13px",
  fontSize: "14px",
};

const platformTagStyle = {
  color: "#e2e8f0",
  border: "1px solid rgba(245,158,11,0.55)",
  backgroundColor: "rgba(245,158,11,0.12)",
  borderRadius: "999px",
  padding: "8px 13px",
  fontSize: "14px",
};

const emptyTextStyle = {
  color: "#94a3b8",
};

const saveAreaStyle = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  marginTop: "28px",
};

const saveButtonStyle = {
  padding: "14px 28px",
  borderRadius: "14px",
  border: "1px solid rgba(34,211,238,0.7)",
  backgroundColor: "rgba(34,211,238,0.12)",
  color: "#22d3ee",
  fontWeight: "900",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const savedTextStyle = {
  margin: "12px 0 0",
  color: "#22c55e",
  fontWeight: "900",
};

const futurePanelStyle = {
  maxWidth: "1200px",
  margin: "24px auto 0",
  backgroundColor: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.45)",
  borderRadius: "22px",
  padding: "26px",
};

const futureTitleStyle = {
  color: "#22c55e",
  marginTop: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const futureTextStyle = {
  color: "#cbd5e1",
  lineHeight: "1.6",
};

const emptyOpportunityStyle = {
  padding: "20px 12px",
  color: "#94a3b8",
};

const searchLinkButtonStyle = {
  color: "#22d3ee",
  textDecoration: "none",
  border: "1px solid rgba(34,211,238,0.45)",
  backgroundColor: "rgba(34,211,238,0.08)",
  borderRadius: "999px",
  padding: "8px 13px",
  fontSize: "13px",
  fontWeight: "900",
  display: "inline-block",
  marginTop: "12px",
};

const hiddenGemGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "18px",
  marginTop: "22px",
};

const hiddenGemCardStyle = {
  border: "1px solid rgba(34,211,238,0.25)",
  borderRadius: "18px",
  padding: "18px",
  backgroundColor: "rgba(255,255,255,0.04)",
};

const hiddenGemTopRowStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
};

const scoreBadgeStyle = {
  minWidth: "52px",
  height: "52px",
  borderRadius: "999px",
  backgroundColor: "rgba(34,211,238,0.16)",
  border: "1px solid rgba(34,211,238,0.6)",
  color: "#22d3ee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "18px",
};

const targetTextStyle = {
  color: "#f59e0b",
  margin: "0 0 6px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase" as const,
};

const hiddenGemTitleStyle = {
  color: "white",
  margin: 0,
  fontSize: "17px",
  lineHeight: "1.35",
};

const priceStyle = {
  color: "#22d3ee",
  fontSize: "20px",
  fontWeight: "900",
};

const labelStyle = {
  color: "#22c55e",
  fontWeight: "900",
};

const imageStyle = {
  width: "100%",
  maxHeight: "190px",
  objectFit: "contain" as const,
  borderRadius: "12px",
  backgroundColor: "rgba(255,255,255,0.06)",
  marginBottom: "12px",
};

const miniSectionTitleStyle = {
  color: "#22d3ee",
  marginBottom: "8px",
};

const riskTitleStyle = {
  color: "#f59e0b",
  marginBottom: "8px",
};

const listStyle = {
  color: "#cbd5e1",
  paddingLeft: "18px",
  lineHeight: "1.5",
};

const scanDateStyle = {
  color: "#94a3b8",
};

const huntMessageStyle = {
  color: "#cbd5e1",
  fontWeight: "700",
};
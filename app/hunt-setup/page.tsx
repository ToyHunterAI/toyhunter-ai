"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../src/lib/supabase/client";

const popularHunts = [
  "Dino Riders",
  "G.I. Joe / Action Force",
  "M.A.S.K.",
  "Masters of the Universe",
  "Power Rangers",
  "Star Wars 1977-1990",
  "The Real Ghostbusters",
  "Thundercats",
  "TMNT",
  "Transformers G1 / G2",
];

const advancedToyLines = [
  "A-Team",
  "Air Raiders",
  "Army Ants",
  "Battle Beasts",
  "Bionic Six",
  "Blackstar",
  "Boglins",
  "Bravestarr",
  "Bucky O'Hare",
  "Captain Power",
  "Centurions",
  "COPS",
  "Crash Dummies",
  "Defenders of the Earth",
  "Diaclone",
  "Dick Tracy",
  "Exo Squad",
  "Food Fighters",
  "Galaxy Rangers",
  "Gargoyles",
  "Godzilla / Kaiju",
  "GoBots",
  "He-Man New Adventures",
  "Inhumanoids",
  "Japanese Robots",
  "Madballs",
  "Manta Force",
  "Mega Force",
  "Microman",
  "Mighty Max",
  "Monster in My Pocket",
  "Police Academy",
  "Rambo",
  "Robotech",
  "Rock Lords",
  "Sectaurs",
  "Silverhawks",
  "Sky Commanders",
  "Starcom",
  "Super Naturals",
  "Tokusatsu / Sentai / Metal Heroes",
  "Toxic Crusaders",
  "Visionaries",
  "Voltron",
  "VR Troopers",
  "War Planets",
  "Wheeled Warriors",
  "Wildcats",
  "X-Men 90s",
  "Zoids",
];

const manufacturers = [
  "Bandai",
  "Bluebird",
  "Galoob",
  "Hasbro",
  "Hong Kong",
  "Kenner",
  "LJN",
  "Macau",
  "Mattel",
  "Mexico",
  "Palitoy",
  "Playmates",
  "Popy",
  "Taiwan",
  "Takara",
  "Tomy",
];

const platforms = ["Catawiki", "eBay", "Facebook Marketplace", "Marktplaats", "Vinted"];

export default function HuntSetupPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [selectedPopular, setSelectedPopular] = useState<string[]>([]);
  const [selectedAdvanced, setSelectedAdvanced] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["eBay"]);

  const [maxBudget, setMaxBudget] = useState("100");
  const [region, setRegion] = useState("Netherlands");
  const [minimumProfit, setMinimumProfit] = useState("30");
  const [frequency, setFrequency] = useState("daily");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUserAndProfile() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("hunt_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!profile) return;

      setProfileId(profile.id);

      const savedToys: string[] = profile.toy_categories ?? [];

      setSelectedPopular(savedToys.filter((item) => popularHunts.includes(item)));
      setSelectedAdvanced(savedToys.filter((item) => advancedToyLines.includes(item)));
      setSelectedManufacturers(
        savedToys
          .filter((item) => item.startsWith("Manufacturer / origin: "))
          .map((item) => item.replace("Manufacturer / origin: ", ""))
      );

      setSelectedPlatforms(profile.platforms ?? ["eBay"]);
      setMaxBudget(String(profile.max_budget ?? "100"));
      setRegion(profile.region ?? "Netherlands");
      setMinimumProfit(String(profile.minimum_profit ?? "30"));
      setFrequency(profile.frequency ?? "daily");
    }

    loadUserAndProfile();
  }, [supabase]);

  function toggleValue(value: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  }

  async function saveProfile() {
    setMessage("");

    if (!userId) {
      setMessage("You are not logged in yet. Please log in before saving your Hunt Profile.");
      return;
    }

    const allSelectedToys = [
      ...selectedPopular,
      ...selectedAdvanced,
      ...selectedManufacturers.map((item) => `Manufacturer / origin: ${item}`),
    ];

    if (allSelectedToys.length === 0) {
      setMessage("Select at least one toy category.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setMessage("Select at least one platform.");
      return;
    }

    const payload = {
      user_id: userId,
      name: "Daily Toy Hunt",
      toy_categories: allSelectedToys,
      platforms: selectedPlatforms,
      max_budget: Number(maxBudget),
      region,
      minimum_profit: Number(minimumProfit),
      frequency,
      is_active: true,
    };

    if (profileId) {
      const { error } = await supabase
        .from("hunt_profiles")
        .update(payload)
        .eq("id", profileId)
        .eq("user_id", userId);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Hunt Profile updated.");
      return;
    }

    const { data, error } = await supabase
      .from("hunt_profiles")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfileId(data.id);
    setMessage("Hunt Profile saved.");
  }

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>
        <h1 style={titleStyle}>Hunt Setup</h1>
        <p style={subtitleStyle}>
          Set up your automatic hunt once. ToyHunter will use this profile to find
          daily hidden gems.
        </p>
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Top 10 Popular Hunts</h2>
            <p style={sectionTextStyle}>The most important vintage toy lines for fast daily hunts.</p>
          </div>
          <div style={smallButtonRowStyle}>
            <button style={smallButtonStyle} onClick={() => setSelectedPopular(popularHunts)}>Select All</button>
            <button style={smallButtonStyle} onClick={() => setSelectedPopular([])}>Clear</button>
          </div>
        </div>

        <div style={gridStyle}>
          {popularHunts.map((category) => (
            <button
              key={category}
              onClick={() => toggleValue(category, selectedPopular, setSelectedPopular)}
              style={{ ...chipStyle, ...(selectedPopular.includes(category) ? activeChipStyle : {}) }}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Advanced Toy Lines</h2>
            <p style={sectionTextStyle}>Larger alphabetical list for obscure lines and hidden search opportunities.</p>
          </div>
          <div style={smallButtonRowStyle}>
            <button style={smallButtonStyle} onClick={() => setSelectedAdvanced(advancedToyLines)}>Select All</button>
            <button style={smallButtonStyle} onClick={() => setSelectedAdvanced([])}>Clear</button>
          </div>
        </div>

        <div style={scrollBoxStyle}>
          <div style={gridStyle}>
            {advancedToyLines.map((category) => (
              <button
                key={category}
                onClick={() => toggleValue(category, selectedAdvanced, setSelectedAdvanced)}
                style={{ ...chipStyle, ...(selectedAdvanced.includes(category) ? activeChipStyle : {}) }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Manufacturers / Origins</h2>
        <p style={sectionTextStyle}>Useful for listings where the seller does not know the toy line.</p>

        <div style={gridStyle}>
          {manufacturers.map((manufacturer) => (
            <button
              key={manufacturer}
              onClick={() => toggleValue(manufacturer, selectedManufacturers, setSelectedManufacturers)}
              style={{ ...chipStyle, ...(selectedManufacturers.includes(manufacturer) ? activeChipStyle : {}) }}
            >
              {manufacturer}
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Platforms</h2>
            <p style={sectionTextStyle}>Where ToyHunter will search automatically.</p>
          </div>
          <div style={smallButtonRowStyle}>
            <button style={smallButtonStyle} onClick={() => setSelectedPlatforms(platforms)}>Select All</button>
            <button style={smallButtonStyle} onClick={() => setSelectedPlatforms([])}>Clear</button>
          </div>
        </div>

        <div style={gridStyle}>
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => toggleValue(platform, selectedPlatforms, setSelectedPlatforms)}
              style={{ ...chipStyle, ...(selectedPlatforms.includes(platform) ? activeChipStyle : {}) }}
            >
              {platform}
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Hunt Settings</h2>

        <label style={labelStyle}>
          Max budget
          <input style={inputStyle} type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} />
        </label>

        <label style={labelStyle}>
          Region
          <input style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)} />
        </label>

        <label style={labelStyle}>
          Minimum profit
          <input style={inputStyle} type="number" value={minimumProfit} onChange={(e) => setMinimumProfit(e.target.value)} />
        </label>

        <label style={labelStyle}>
          Frequency
          <select style={inputStyle} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <div style={summaryStyle}>
          <strong>Active Hunt Profile</strong>
          <span>Toys selected: {selectedPopular.length + selectedAdvanced.length + selectedManufacturers.length}</span>
          <span>Platforms selected: {selectedPlatforms.length}</span>
          <span>Budget: €{maxBudget}</span>
          <span>Minimum profit: €{minimumProfit}</span>
        </div>

        <button style={saveButtonStyle} onClick={saveProfile}>
          {profileId ? "Update Hunt Profile" : "Save Hunt Profile"}
        </button>

        {message && <p style={messageStyle}>{message}</p>}
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

const headerStyle = { maxWidth: "1000px", margin: "0 auto 28px" };

const eyebrowStyle = {
  color: "#facc15",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  marginBottom: "8px",
};

const titleStyle = { fontSize: "46px", margin: "0 0 12px" };

const subtitleStyle = {
  color: "#94a3b8",
  fontSize: "17px",
  lineHeight: "1.6",
  maxWidth: "760px",
};

const cardStyle = {
  maxWidth: "1000px",
  margin: "0 auto 22px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "22px",
  padding: "24px",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "18px",
};

const sectionTitleStyle = { fontSize: "22px", margin: "0 0 8px" };

const sectionTextStyle = {
  color: "#94a3b8",
  margin: "0 0 16px",
  lineHeight: "1.5",
};

const smallButtonRowStyle = { display: "flex", gap: "8px", flexShrink: 0 };

const smallButtonStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const scrollBoxStyle = {
  maxHeight: "360px",
  overflowY: "auto" as const,
  paddingRight: "6px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const chipStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  textAlign: "left" as const,
};

const activeChipStyle = {
  background: "#facc15",
  color: "#111827",
  border: "1px solid #facc15",
};

const labelStyle = {
  display: "block",
  color: "#cbd5e1",
  fontWeight: 700,
  marginBottom: "16px",
};

const inputStyle = {
  width: "100%",
  display: "block",
  marginTop: "8px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
};

const summaryStyle = {
  display: "grid",
  gap: "8px",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: "16px",
  padding: "16px",
  margin: "18px 0",
  color: "#cbd5e1",
};

const saveButtonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background: "#facc15",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: "8px",
};

const messageStyle = {
  color: "#facc15",
  marginTop: "16px",
  fontWeight: 700,
};
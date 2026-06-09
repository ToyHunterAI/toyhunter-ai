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

export default function DailyHuntPage() {
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<HuntProfile | null>(null);
  const [results, setResults] = useState<HuntResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDailyHunt() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data: profileData } = await supabase
        .from("hunt_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      setProfile(profileData);

      if (profileData) {
        const { data: resultData } = await supabase
          .from("hunt_results")
          .select("*")
          .eq("user_id", user.id)
          .order("found_at", { ascending: false })
          .limit(30);

        setResults(resultData ?? []);
      }

      setLoading(false);
    }

    loadDailyHunt();
  }, [supabase]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Daily Hunt</h1>
          <p style={textStyle}>Loading your hunt...</p>
        </section>
      </main>
    );
  }

  if (!email) {
    return (
      <main style={pageStyle}>
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

  if (!profile) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <p style={eyebrowStyle}>ToyHunter AI</p>
          <h1 style={titleStyle}>Daily Hunt</h1>
          <p style={textStyle}>
            You do not have an active Hunt Profile yet. Create your settings first,
            then ToyHunter can start finding daily hidden gems.
          </p>
          <Link href="/hunt-setup" style={primaryButtonStyle}>
            Create Hunt Profile
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>
        <h1 style={titleStyle}>Daily Hunt</h1>
        <p style={subtitleStyle}>
          Your daily hidden gem dashboard based on your saved Hunt Profile.
        </p>

        <div style={profileBoxStyle}>
          <div>
            <span style={smallLabelStyle}>Signed in as</span>
            <strong>{email}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Active profile</span>
            <strong>{profile.toy_categories.length} toy targets</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Platforms</span>
            <strong>{profile.platforms.join(", ")}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Budget</span>
            <strong>€{profile.max_budget ?? 0}</strong>
          </div>

          <div>
            <span style={smallLabelStyle}>Minimum profit</span>
            <strong>€{profile.minimum_profit ?? 0}</strong>
          </div>
        </div>

        <div style={buttonRowStyle}>
          <Link href="/hunt-setup" style={secondaryButtonStyle}>
            Edit Hunt Settings
          </Link>
          <Link href="/account" style={secondaryButtonStyle}>
            Back to My Account
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Today's Hidden Gems</h2>

        {results.length === 0 ? (
          <div style={emptyStateStyle}>
            <h3 style={emptyTitleStyle}>No daily results yet</h3>
            <p style={textStyle}>
              Your Hunt Profile is ready, but the automatic Daily Hunt job has not
              filled this page yet. The next step is connecting this dashboard to
              the eBay search engine and scheduled job.
            </p>

            <div style={previewBoxStyle}>
              <strong>Next build step:</strong>
              <span>Daily Hunt Engine reads your Hunt Profile</span>
              <span>Runs saved searches automatically</span>
              <span>Saves best finds into hunt_results</span>
              <span>Shows Jackpot, Interesting and Watchlist results here</span>
            </div>
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
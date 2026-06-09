"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../src/lib/supabase/client";

export default function AccountPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    }

    loadUser();
  }, [supabase]);

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>
        <h1 style={titleStyle}>My Account</h1>

        <div style={statusBoxStyle}>
          <span style={statusLabelStyle}>Signed in as</span>
          <strong>{email ?? "Not signed in"}</strong>
        </div>
      </section>

      <section style={gridStyle}>
        <Link href="/hunt-setup" style={cardStyle}>
          <span style={cardLabelStyle}>Profile</span>
          <strong style={cardTitleStyle}>My Hunt Settings</strong>
          <span style={cardTextStyle}>
            Edit toy lines, platforms, budget, region and hunt preferences.
          </span>
        </Link>

        <Link href="/logout" style={dangerCardStyle}>
          <span style={cardLabelStyle}>Session</span>
          <strong style={cardTitleStyle}>Logout</strong>
          <span style={cardTextStyle}>
            Sign out of ToyHunter AI.
          </span>
        </Link>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617 0%, #111827 100%)",
  color: "white",
  padding: "48px 24px",
};

const headerStyle = {
  maxWidth: "1000px",
  margin: "0 auto 28px",
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
  margin: "0 0 18px",
};

const statusBoxStyle = {
  display: "inline-grid",
  gap: "4px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "14px 18px",
};

const statusLabelStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const gridStyle = {
  maxWidth: "1000px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

const cardStyle = {
  display: "grid",
  gap: "10px",
  padding: "24px",
  borderRadius: "20px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  color: "white",
  textDecoration: "none",
};

const dangerCardStyle = {
  ...cardStyle,
  border: "1px solid rgba(250,204,21,0.35)",
};

const cardLabelStyle = {
  color: "#facc15",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
};

const cardTitleStyle = {
  fontSize: "22px",
};

const cardTextStyle = {
  color: "#94a3b8",
  lineHeight: "1.5",
};
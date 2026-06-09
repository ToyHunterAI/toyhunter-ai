"use client";

import { useState } from "react";
import { createClient } from "../../src/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function signInWithEmail() {
    setMessage("");

    if (!email) {
      setMessage("Enter your email address.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/hunt-setup`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login link sent. Check your email and click the newest link.");
  }

  async function signInWithProvider(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/hunt-setup`,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>
        <h1 style={titleStyle}>Login</h1>
        <p style={textStyle}>
          Login to save your Hunt Profile and unlock Daily Hidden Gems.
        </p>

        <button style={buttonStyle} onClick={() => signInWithProvider("google")}>
          Continue with Google
        </button>

        <button style={buttonStyle} onClick={() => signInWithProvider("github")}>
          Continue with GitHub
        </button>

        <div style={dividerStyle}>or continue with email</div>

        <input
          style={inputStyle}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button style={primaryButtonStyle} onClick={signInWithEmail}>
          Send Login Link
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "430px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "22px",
  padding: "28px",
};

const eyebrowStyle = {
  color: "#facc15",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  marginBottom: "8px",
};

const titleStyle = {
  fontSize: "34px",
  margin: "0 0 12px",
};

const textStyle = {
  color: "#94a3b8",
  lineHeight: "1.5",
  marginBottom: "22px",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  marginBottom: "12px",
};

const primaryButtonStyle = {
  ...buttonStyle,
  background: "#facc15",
  color: "#111827",
  border: "none",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  marginBottom: "12px",
};

const dividerStyle = {
  color: "#64748b",
  textAlign: "center" as const,
  margin: "18px 0",
};

const messageStyle = {
  color: "#facc15",
  marginTop: "12px",
  fontWeight: 700,
};
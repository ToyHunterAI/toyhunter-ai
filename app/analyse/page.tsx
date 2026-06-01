"use client";

import { useRef, useState } from "react";

export default function AnalysePage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setImagePreview(imageUrl);
    setShowResult(false);
  }

  function handleAnalyse() {
    setShowResult(true);
  }

  return (
    <main style={{ padding: "60px 40px" }}>
      <section style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontWeight: "700" }}>
          Analyse Assistant
        </p>

        <h1 style={{ fontSize: "42px", marginBottom: "16px" }}>
          Upload speelgoed en krijg een ToyHunter beoordeling.
        </h1>

        <p
          style={{
            color: "var(--text-light)",
            fontSize: "18px",
            lineHeight: "1.6",
            maxWidth: "700px",
          }}
        >
          Later herkent AI automatisch het speelgoed, bepaalt de waarde en geeft
          een BUY, MAYBE of NO advies.
        </p>

        <div
          style={{
            marginTop: "40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          <div style={cardStyle}>
            <h2>Foto upload</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />

            <button onClick={handleChooseFile} style={darkButtonStyle}>
              Foto kiezen
            </button>

            {imagePreview && (
              <>
                <div style={{ marginTop: "24px" }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      borderRadius: "14px",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                <button
                  onClick={handleAnalyse}
                  style={goldButtonStyle}
                >
                  Analyseer speelgoed
                </button>
              </>
            )}
          </div>

          <div style={cardStyle}>
            <h2>ToyHunter Resultaat</h2>

            {!showResult && (
              <p style={{ color: "var(--text-light)" }}>
                Upload een foto en klik op "Analyseer speelgoed".
              </p>
            )}

            {showResult && (
              <>
                <div
                  style={{
                    backgroundColor: "var(--warning)",
                    color: "white",
                    padding: "14px",
                    borderRadius: "12px",
                    textAlign: "center",
                    fontWeight: "800",
                    fontSize: "24px",
                    marginBottom: "24px",
                  }}
                >
                  MAYBE
                </div>

                <p style={labelStyle}>Naam</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={labelStyle}>Serie</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={labelStyle}>Jaar</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={labelStyle}>Geschatte waarde</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={labelStyle}>Advies</p>
                <div style={resultBox}>
                  ToyHunter AI koppeling volgt later.
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

const cardStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "18px",
  padding: "28px",
};

const darkButtonStyle = {
  marginTop: "16px",
  padding: "14px 20px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "var(--navy)",
  color: "white",
  fontWeight: "800",
  cursor: "pointer",
};

const goldButtonStyle = {
  marginTop: "20px",
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "var(--gold)",
  color: "var(--navy)",
  fontWeight: "800",
  cursor: "pointer",
};

const labelStyle = {
  fontWeight: "700",
  marginBottom: "8px",
};

const resultBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "14px",
  marginBottom: "18px",
};
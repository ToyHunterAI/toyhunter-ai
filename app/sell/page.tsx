"use client";

import { useRef, useState } from "react";

export default function SellPage() {
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

  function handleGenerateListing() {
    setShowResult(true);
  }

  return (
    <main style={{ padding: "60px 40px" }}>
      <section style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontWeight: "700" }}>
          Sell Assistant
        </p>

        <h1 style={{ fontSize: "42px", marginBottom: "16px" }}>
          Upload een foto. ToyHunter maakt straks je verkooptekst.
        </h1>

        <p
          style={{
            color: "var(--text-light)",
            fontSize: "18px",
            lineHeight: "1.6",
            maxWidth: "700px",
          }}
        >
          Later herkent AI het speelgoed, schat de waarde en maakt automatisch
          een titel, beschrijving en verkoopadvies voor verkoopplatforms.
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
              <div style={{ marginTop: "24px" }}>
                <img
                  src={imagePreview}
                  alt="Speelgoed preview"
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                />

                <button
                  onClick={handleGenerateListing}
                  style={goldButtonStyle}
                >
                  Maak verkooptekst
                </button>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2>ToyHunter resultaat</h2>

            {!showResult && (
              <p style={{ color: "var(--text-light)" }}>
                Upload een foto en klik op “Maak verkooptekst”.
              </p>
            )}

            {showResult && (
              <>
                <p style={mutedStyle}>Naam</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={mutedStyle}>Categorie</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={mutedStyle}>Geschatte waarde</p>
                <div style={resultBox}>Nog niet geanalyseerd</div>

                <p style={mutedStyle}>Verkoop titel</p>
                <div style={resultBox}>
                  Vintage speelgoed - titel volgt later
                </div>

                <p style={mutedStyle}>Verkoopbeschrijving</p>
                <div style={resultBox}>
                  Hier komt straks automatisch een nette verkooptekst op basis
                  van de foto.
                </div>

                <p style={mutedStyle}>Verkoopadvies</p>
                <div style={resultBox}>
                  Controleer staat, compleetheid en vergelijkbare prijzen.
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

const mutedStyle = {
  color: "var(--text-light)",
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
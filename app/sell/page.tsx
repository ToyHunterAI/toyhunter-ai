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
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>

        <h1 style={titleStyle}>
          Sell Smarter <span style={{ color: "#f59e0b" }}>Listings.</span>
        </h1>

        <p style={subtitleStyle}>
          Upload a toy photo and let ToyHunter prepare a collector-focused
          listing title, description and pricing advice.
        </p>
      </section>

      <section style={gridStyle}>
        <div style={uploadPanelStyle}>
          <h2 style={panelTitleOrangeStyle}>Upload Toy</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          <div style={uploadBoxStyle} onClick={handleChooseFile}>
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Toy preview"
                style={previewImageStyle}
              />
            ) : (
              <>
                <div style={uploadIconStyle}>⇧</div>
                <p style={uploadMainTextStyle}>Select toy photo</p>
                <p style={uploadSubTextStyle}>
                  Upload a clear image of the item you want to sell.
                </p>
              </>
            )}
          </div>

          <button
            onClick={handleGenerateListing}
            disabled={!imagePreview}
            style={{
              ...generateButtonStyle,
              opacity: imagePreview ? 1 : 0.45,
              cursor: imagePreview ? "pointer" : "not-allowed",
            }}
          >
            Generate Listing
          </button>
        </div>

        <div style={resultPanelStyle}>
          <h2 style={panelTitleCyanStyle}>Listing Assistant</h2>

          {!showResult && (
            <div style={emptyStateStyle}>
              <p style={{ color: "#22d3ee", fontWeight: "900" }}>
                READY TO WRITE
              </p>

              <p style={{ color: "#94a3b8", lineHeight: "1.6" }}>
                Upload a photo to prepare a sales listing. In a future version,
                ToyHunter will use AI to generate the listing automatically.
              </p>
            </div>
          )}

          {showResult && (
            <>
              <ListingBlock label="Item Name" value="Awaiting AI connection" />
              <ListingBlock label="Category" value="Vintage toy / collectible" />
              <ListingBlock label="Estimated Value" value="Connect Analyse data later" />
              <ListingBlock
                label="Listing Title"
                value="Vintage collectible toy - title will be generated here"
              />
              <ListingBlock
                label="Description"
                value="ToyHunter will generate a clean seller description based on the photo, visible condition, accessories and collector keywords."
              />
              <ListingBlock
                label="Selling Advice"
                value="Check condition, completeness, copyright stamps and recent sold prices before listing."
              />
            </>
          )}
        </div>
      </section>

      <section style={futurePanelStyle}>
        <h2 style={futureTitleStyle}>Future Sell Engine</h2>

        <p style={futureTextStyle}>
          Later, ToyHunter will connect this page to the Analyse engine and
          generate platform-ready listings for Vinted, Marktplaats, eBay and
          Facebook Marketplace.
        </p>
      </section>
    </main>
  );
}

function ListingBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={listingBlockStyle}>
      <p style={listingLabelStyle}>{label}</p>
      <p style={listingValueStyle}>{value}</p>
    </div>
  );
}

const pageStyle = {
  padding: "60px 40px",
};

const headerStyle = {
  maxWidth: "1200px",
  margin: "0 auto 36px",
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
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const basePanelStyle = {
  backgroundColor: "rgba(6,10,30,0.68)",
  borderRadius: "22px",
  padding: "26px",
  boxShadow: "0 0 40px rgba(0,0,0,0.38)",
};

const uploadPanelStyle = {
  ...basePanelStyle,
  border: "1px solid rgba(245,158,11,0.55)",
};

const resultPanelStyle = {
  ...basePanelStyle,
  border: "1px solid rgba(34,211,238,0.45)",
};

const panelTitleOrangeStyle = {
  color: "#f59e0b",
  textTransform: "uppercase" as const,
  marginTop: 0,
  letterSpacing: "1px",
};

const panelTitleCyanStyle = {
  color: "#22d3ee",
  textTransform: "uppercase" as const,
  marginTop: 0,
  letterSpacing: "1px",
};

const uploadBoxStyle = {
  minHeight: "330px",
  border: "1px dashed rgba(245,158,11,0.8)",
  borderRadius: "18px",
  backgroundColor: "rgba(245,158,11,0.08)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  cursor: "pointer",
  overflow: "hidden",
  marginTop: "24px",
};

const uploadIconStyle = {
  fontSize: "58px",
  color: "#f59e0b",
};

const uploadMainTextStyle = {
  color: "#22d3ee",
  fontWeight: "900",
  textTransform: "uppercase" as const,
};

const uploadSubTextStyle = {
  color: "#94a3b8",
  margin: 0,
  maxWidth: "320px",
  lineHeight: "1.5",
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  backgroundColor: "rgba(0,0,0,0.35)",
};

const generateButtonStyle = {
  width: "100%",
  marginTop: "22px",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(90deg, #f59e0b, #22d3ee)",
  color: "#020617",
  fontWeight: "900",
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  border: "1px solid rgba(34,211,238,0.45)",
  borderRadius: "16px",
  padding: "24px",
  backgroundColor: "rgba(34,211,238,0.08)",
  marginTop: "24px",
};

const listingBlockStyle = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "14px",
  marginBottom: "12px",
  backgroundColor: "rgba(255,255,255,0.04)",
};

const listingLabelStyle = {
  color: "#94a3b8",
  margin: "0 0 8px",
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const listingValueStyle = {
  color: "#e2e8f0",
  margin: 0,
  lineHeight: "1.5",
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
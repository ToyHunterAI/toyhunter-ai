"use client";

import { useEffect, useRef, useState } from "react";

export default function AnalysePage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [radarAngle, setRadarAngle] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 40);

    return () => clearInterval(interval);
  }, []);

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Image = reader.result as string;

      setImagePreview(base64Image);
      setShowResult(false);
      setIsScanning(false);
      setScanStage(1);
      setAiResult("");
    };

    reader.readAsDataURL(file);
  }

  async function handleAnalyse() {
    if (!imagePreview) return;

    setShowResult(false);
    setIsScanning(true);
    setScanStage(1);
    setAiResult("");

    setTimeout(() => setScanStage(2), 700);
    setTimeout(() => setScanStage(3), 1400);
    setTimeout(() => setScanStage(4), 2100);

    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imagePreview,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAiResult(data.result);
      } else {
        setAiResult({
          platform: "Unknown",
          askingPrice: "Not visible",
          object: "AI Analysis Failed",
          serie: "Unknown",
          manufacturer: "Unknown",
          jaar: "Unknown",
          periode: "Unknown",
          waarde: "Unknown",
          rarity: "☆☆☆☆☆",
          confidence: "0%",
          buyScore: "0 / 10",
          advies: "NO",
          toelichting: data.error,
        });
      }
    } catch {
      setAiResult({
        platform: "Unknown",
        askingPrice: "Not visible",
        object: "Connection Error",
        serie: "Unknown",
        manufacturer: "Unknown",
        jaar: "Unknown",
        periode: "Unknown",
        waarde: "Unknown",
        rarity: "☆☆☆☆☆",
        confidence: "0%",
        buyScore: "0 / 10",
        advies: "NO",
        toelichting: "Failed to connect to ToyHunter AI.",
      });
    }

    setTimeout(() => {
      setIsScanning(false);
      setShowResult(true);
      setScanStage(4);
    }, 3000);
  }

  const verdictColor =
    aiResult?.advies === "BUY"
      ? "#22c55e"
      : aiResult?.advies === "NO"
      ? "#ef4444"
      : "#f59e0b";

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>Analyse Assistant</p>

        <h1 style={titleStyle}>
  <span style={{ color: "#a855f7" }}>Scan.</span>{" "}
  <span style={{ color: "#22d3ee" }}>Detect.</span>{" "}
  <span style={{ color: "#22c55e" }}>Value.</span>
</h1>

        <p style={subtitleStyle}>
          Upload toys and discover hidden value before others do.
        </p>
      </section>

      <section style={machineStyle}>
        <div style={uploadPanelStyle}>
          <h2 style={uploadTitleStyle}>Upload Target</h2>

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
                <p style={uploadMainTextStyle}>Select target</p>
                <p style={uploadSubTextStyle}>Click to choose a photo</p>
              </>
            )}
          </div>

          <button
            onClick={handleAnalyse}
            disabled={!imagePreview || isScanning}
            style={{
              ...scanButtonStyle,
              opacity: imagePreview && !isScanning ? 1 : 0.45,
              cursor: imagePreview && !isScanning ? "pointer" : "not-allowed",
            }}
          >
            {isScanning ? "Scanning..." : "Scan Object"}
          </button>
        </div>

        <div style={scanPanelStyle}>
          <h2 style={scanTitleStyle}>Scan Chamber</h2>

          <div style={radarStyle}>
            <div style={ringOneStyle} />
            <div style={ringTwoStyle} />
            <div style={ringThreeStyle} />
            <div style={horizontalLineStyle} />
            <div style={verticalLineStyle} />

            <div
              style={{
                ...sweepStyle,
                transform: `rotate(${radarAngle}deg)`,
              }}
            />

            <div style={targetDotOneStyle} />
            <div style={targetDotTwoStyle} />
            <div style={centerDotStyle} />
          </div>

          <h3 style={machineStatusStyle}>
            {!imagePreview
              ? "AWAITING TARGET"
              : isScanning
              ? "SCANNING TARGET"
              : showResult
              ? "ANALYSIS COMPLETE"
              : "TARGET ACQUIRED"}
          </h3>

          <div style={statusListStyle}>
            <ScanStep active={scanStage >= 1} label="Target Acquired" />
            <ScanStep active={scanStage >= 2} label="Signal Locked" />
            <ScanStep active={scanStage >= 3} label="Market Search" />
            <ScanStep active={scanStage >= 4} label="Value Estimate" />
          </div>

          <div style={progressBarStyle}>
            <div
              style={{
                ...progressFillStyle,
                width:
                  scanStage === 0
                    ? "8%"
                    : scanStage === 1
                    ? "28%"
                    : scanStage === 2
                    ? "52%"
                    : scanStage === 3
                    ? "76%"
                    : "100%",
              }}
            />
          </div>
        </div>

        <div style={reportPanelStyle}>
          <h2 style={reportTitleStyle}>Analysis Report</h2>

          {!showResult && (
            <div style={emptyReportStyle}>
              <p style={{ color: "#22c55e", fontWeight: "900" }}>
                {isScanning ? "ANALYSING SIGNAL" : "READY TO SCAN"}
              </p>
              <p style={{ color: "#94a3b8", lineHeight: "1.6" }}>
                {isScanning
                  ? "ToyHunter is processing the scan and preparing the report."
                  : "Upload an image and start the scan to generate a report."}
              </p>
            </div>
          )}

          {showResult && (
            <>
              <div style={signalStyle}>SIGNAL DETECTED</div>

              <ReportRow
                label="Platform"
                value={aiResult?.platform || "Unknown"}
              />
              <ReportRow
                label="Asking Price"
                value={aiResult?.askingPrice || "Not visible"}
              />
              <ReportRow
                label="Object"
                value={aiResult?.object || "Preparing analysis..."}
              />
              <ReportRow
                label="Series"
                value={aiResult?.serie || "Not identified"}
              />
              <ReportRow
                label="Manufacturer"
                value={aiResult?.manufacturer || "Unknown"}
              />
              <ReportRow
                label="Year"
                value={aiResult?.jaar || aiResult?.periode || "Unknown"}
              />
              <ReportRow label="Value" value={aiResult?.waarde || "Unknown"} />
              <ReportRow
                label="Rarity"
                value={aiResult?.rarity || "☆☆☆☆☆"}
              />
              <ReportRow
                label="Confidence"
                value={aiResult?.confidence || "0%"}
              />
              <ReportRow
                label="Buy Score"
                value={aiResult?.buyScore || "0 / 10"}
              />

              <div
                style={{
                  ...verdictStyle,
                  border: `1px solid ${verdictColor}`,
                  backgroundColor:
                    aiResult?.advies === "BUY"
                      ? "rgba(34,197,94,0.1)"
                      : aiResult?.advies === "NO"
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(245,158,11,0.1)",
                }}
              >
                <p style={{ margin: 0, color: "#94a3b8" }}>Verdict</p>
                <h2 style={{ margin: "8px 0", color: verdictColor }}>
                  {aiResult?.advies || "MAYBE"}
                </h2>
                <p style={{ margin: 0, color: "#cbd5e1" }}>
                  {aiResult?.toelichting || "Awaiting analysis..."}
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ScanStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div style={scanStepStyle}>
      <span style={{ color: active ? "#22c55e" : "#64748b" }}>
        {active ? "✓" : "○"}
      </span>
      <span style={{ color: active ? "#cbd5e1" : "#64748b" }}>{label}</span>
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={reportRowStyle}>
      <span style={reportLabelStyle}>{label}</span>
      <strong style={reportValueStyle}>{value}</strong>
    </div>
  );
}

const pageStyle = {
  padding: "56px 40px",
};

const headerStyle = {
  maxWidth: "1400px",
  margin: "0 auto 34px",
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
  maxWidth: "680px",
  lineHeight: "1.6",
};

const machineStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "0.8fr 1.4fr 1fr",
  gap: "22px",
  alignItems: "stretch",
};

const basePanelStyle = {
  backgroundColor: "rgba(6,10,30,0.68)",
  borderRadius: "22px",
  padding: "26px",
  boxShadow: "0 0 40px rgba(0,0,0,0.38)",
};

const uploadPanelStyle = {
  ...basePanelStyle,
  border: "1px solid rgba(168,85,247,0.55)",
};

const scanPanelStyle = {
  ...basePanelStyle,
  border: "1px solid rgba(34,211,238,0.55)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
};

const reportPanelStyle = {
  ...basePanelStyle,
  border: "1px solid rgba(34,197,94,0.45)",
};

const uploadTitleStyle = {
  color: "#a855f7",
  textTransform: "uppercase" as const,
  marginTop: 0,
  letterSpacing: "1px",
};

const scanTitleStyle = {
  color: "#22d3ee",
  textTransform: "uppercase" as const,
  marginTop: 0,
  letterSpacing: "1px",
};

const reportTitleStyle = {
  color: "#22c55e",
  textTransform: "uppercase" as const,
  marginTop: 0,
  letterSpacing: "1px",
};

const uploadBoxStyle = {
  minHeight: "300px",
  border: "1px dashed rgba(168,85,247,0.8)",
  borderRadius: "18px",
  backgroundColor: "rgba(168,85,247,0.08)",
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
  color: "#a855f7",
};

const uploadMainTextStyle = {
  color: "#22d3ee",
  fontWeight: "900",
  textTransform: "uppercase" as const,
};

const uploadSubTextStyle = {
  color: "#94a3b8",
  margin: 0,
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  backgroundColor: "rgba(0,0,0,0.35)",
};

const scanButtonStyle = {
  width: "100%",
  marginTop: "22px",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(90deg, #0891b2, #f59e0b)",
  color: "white",
  fontWeight: "900",
  textTransform: "uppercase" as const,
};

const radarStyle = {
  position: "relative" as const,
  width: "310px",
  height: "310px",
  borderRadius: "50%",
  border: "2px solid rgba(34,211,238,0.85)",
  margin: "32px 0 26px",
  boxShadow:
    "0 0 45px rgba(34,211,238,0.42), inset 0 0 42px rgba(34,211,238,0.18)",
  overflow: "hidden",
};

const ringBase = {
  position: "absolute" as const,
  borderRadius: "50%",
  border: "1px solid rgba(34,211,238,0.45)",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
};

const ringOneStyle = { ...ringBase, width: "90px", height: "90px" };
const ringTwoStyle = { ...ringBase, width: "180px", height: "180px" };
const ringThreeStyle = { ...ringBase, width: "260px", height: "260px" };

const horizontalLineStyle = {
  position: "absolute" as const,
  left: 0,
  top: "50%",
  width: "100%",
  height: "1px",
  backgroundColor: "rgba(34,211,238,0.35)",
};

const verticalLineStyle = {
  position: "absolute" as const,
  top: 0,
  left: "50%",
  width: "1px",
  height: "100%",
  backgroundColor: "rgba(34,211,238,0.35)",
};

const sweepStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  width: "50%",
  height: "50%",
  background:
    "linear-gradient(45deg, rgba(34,211,238,0.5), rgba(34,211,238,0.08), transparent 70%)",
  transformOrigin: "left top",
  clipPath: "polygon(0 0, 100% 0, 0 100%)",
};

const centerDotStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  backgroundColor: "#22d3ee",
  transform: "translate(-50%, -50%)",
  boxShadow: "0 0 22px #22d3ee",
};

const targetDotOneStyle = {
  position: "absolute" as const,
  left: "210px",
  top: "95px",
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  backgroundColor: "#fb7185",
  boxShadow: "0 0 18px #fb7185",
};

const targetDotTwoStyle = {
  position: "absolute" as const,
  left: "95px",
  top: "210px",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#f59e0b",
  boxShadow: "0 0 18px #f59e0b",
};

const machineStatusStyle = {
  color: "#22d3ee",
  letterSpacing: "3px",
  margin: "0 0 18px",
};

const statusListStyle = {
  width: "100%",
  display: "grid",
  gap: "10px",
  marginTop: "6px",
};

const scanStepStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  paddingBottom: "9px",
  fontSize: "14px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const progressBarStyle = {
  width: "100%",
  height: "10px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.08)",
  marginTop: "24px",
  overflow: "hidden",
};

const progressFillStyle = {
  height: "100%",
  backgroundColor: "#22d3ee",
  borderRadius: "999px",
  boxShadow: "0 0 18px #22d3ee",
  transition: "width 0.4s ease",
};

const emptyReportStyle = {
  border: "1px solid rgba(34,197,94,0.45)",
  borderRadius: "16px",
  padding: "24px",
  backgroundColor: "rgba(34,197,94,0.08)",
  marginTop: "24px",
};

const signalStyle = {
  padding: "14px",
  borderRadius: "14px",
  backgroundColor: "rgba(34,197,94,0.12)",
  border: "1px solid #22c55e",
  color: "#22c55e",
  fontWeight: "900",
  textAlign: "center" as const,
  margin: "20px 0",
};

const reportRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  marginBottom: "10px",
  backgroundColor: "rgba(255,255,255,0.04)",
  fontSize: "14px",
  gap: "16px",
};

const reportLabelStyle = {
  color: "#94a3b8",
  minWidth: "95px",
  fontSize: "14px",
};

const reportValueStyle = {
  color: "white",
  textAlign: "right" as const,
  lineHeight: "1.35",
  wordBreak: "break-word" as const,
};

const verdictStyle = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "16px",
};
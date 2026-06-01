import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "70px 40px" }}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>AI Powered. Treasure Detected.</p>

          <h1 style={titleStyle}>
            Find Hidden
            <br />
            Treasure.
          </h1>

          <p style={subtitleStyle}>
            ToyHunter AI helpt je straks vintage speelgoed scannen, herkennen en
            beoordelen voordat iemand anders de verborgen waarde ziet.
          </p>

          <div style={{ display: "flex", gap: "16px", marginTop: "34px" }}>
            <Link href="/analyse" style={primaryButton}>
              Start Scanning
            </Link>

            <Link href="/hunt" style={secondaryButton}>
              View Dashboard
            </Link>
          </div>
        </div>

        <div style={radarWrapperStyle}>
          <div style={radarStyle}>
            <div style={ringOneStyle} />
            <div style={ringTwoStyle} />
            <div style={ringThreeStyle} />
            <div style={ringFourStyle} />

            <div style={horizontalLineStyle} />
            <div style={verticalLineStyle} />
            <div style={diagonalLineOneStyle} />
            <div style={diagonalLineTwoStyle} />

            <div style={sweepStyle} />

            <div style={targetOneStyle} />
            <div style={targetTwoStyle} />
            <div style={targetThreeStyle} />
            <div style={targetFourStyle} />

            <div style={centerDotStyle} />
          </div>
        </div>
      </section>
    </main>
  );
}

const heroStyle = {
  maxWidth: "1150px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "60px",
  alignItems: "center",
  minHeight: "72vh",
};

const eyebrowStyle = {
  color: "#22d3ee",
  fontWeight: "800",
  letterSpacing: "3px",
  textTransform: "uppercase" as const,
  fontSize: "14px",
};

const titleStyle = {
  fontSize: "76px",
  lineHeight: "0.95",
  margin: "14px 0 24px",
  color: "white",
  letterSpacing: "-2px",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontWeight: "900",
};

const subtitleStyle = {
  fontSize: "20px",
  lineHeight: "1.7",
  color: "#cbd5e1",
  maxWidth: "600px",
};

const primaryButton = {
  padding: "15px 24px",
  borderRadius: "999px",
  backgroundColor: "#22d3ee",
  color: "#06121f",
  textDecoration: "none",
  fontWeight: "900",
  boxShadow: "0 0 24px rgba(34,211,238,0.45)",
};

const secondaryButton = {
  padding: "15px 24px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.08)",
  color: "white",
  textDecoration: "none",
  fontWeight: "800",
  border: "1px solid rgba(255,255,255,0.18)",
};

const radarWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const radarStyle = {
  position: "relative" as const,
  width: "460px",
  height: "460px",
  borderRadius: "50%",
  border: "2px solid rgba(34,211,238,0.85)",
  background:
    "radial-gradient(circle, rgba(34,211,238,0.18), rgba(34,211,238,0.04) 45%, transparent 70%)",
  boxShadow:
    "0 0 45px rgba(34,211,238,0.45), inset 0 0 45px rgba(34,211,238,0.22)",
  overflow: "hidden",
};

const ringBase = {
  position: "absolute" as const,
  border: "1px solid rgba(34,211,238,0.45)",
  borderRadius: "50%",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
};

const ringOneStyle = {
  ...ringBase,
  width: "80px",
  height: "80px",
};

const ringTwoStyle = {
  ...ringBase,
  width: "170px",
  height: "170px",
};

const ringThreeStyle = {
  ...ringBase,
  width: "270px",
  height: "270px",
};

const ringFourStyle = {
  ...ringBase,
  width: "370px",
  height: "370px",
};

const lineBase = {
  position: "absolute" as const,
  backgroundColor: "rgba(34,211,238,0.35)",
  left: "50%",
  top: "50%",
  transformOrigin: "center",
};

const horizontalLineStyle = {
  ...lineBase,
  width: "100%",
  height: "1px",
  left: "0",
};

const verticalLineStyle = {
  ...lineBase,
  width: "1px",
  height: "100%",
  top: "0",
};

const diagonalLineOneStyle = {
  ...lineBase,
  width: "100%",
  height: "1px",
  left: "0",
  transform: "rotate(45deg)",
};

const diagonalLineTwoStyle = {
  ...lineBase,
  width: "100%",
  height: "1px",
  left: "0",
  transform: "rotate(-45deg)",
};

const sweepStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  width: "50%",
  height: "50%",
  background:
    "linear-gradient(45deg, rgba(34,211,238,0.55), rgba(34,211,238,0.08), transparent 70%)",
  transformOrigin: "left top",
  transform: "rotate(-35deg)",
  clipPath: "polygon(0 0, 100% 0, 0 100%)",
  filter: "blur(0.5px)",
};

const centerDotStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#22d3ee",
  transform: "translate(-50%, -50%)",
  boxShadow: "0 0 22px rgba(34,211,238,1)",
};

const targetOneStyle = {
  position: "absolute" as const,
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#fb7185",
  top: "115px",
  left: "285px",
  boxShadow: "0 0 18px rgba(251,113,133,0.95)",
};

const targetTwoStyle = {
  position: "absolute" as const,
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#f59e0b",
  top: "295px",
  left: "145px",
  boxShadow: "0 0 18px rgba(245,158,11,0.95)",
};

const targetThreeStyle = {
  position: "absolute" as const,
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#22d3ee",
  top: "210px",
  left: "350px",
  boxShadow: "0 0 18px rgba(34,211,238,0.95)",
};

const targetFourStyle = {
  position: "absolute" as const,
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  backgroundColor: "#22d3ee",
  top: "145px",
  left: "190px",
  boxShadow: "0 0 18px rgba(34,211,238,0.95)",
};
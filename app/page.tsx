import Link from "next/link";
import type React from "react";

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
            Identify toys, estimate value, discover hidden gems and let ToyHunter
            scan marketplaces daily for new opportunities.
          </p>

          <div style={{ display: "flex", gap: "16px", marginTop: "34px" }}>
            <Link href="/analyse" style={primaryButton}>
              Start Scanning
            </Link>

            <Link href="/hunt" style={secondaryButton}>
              Daily Hunt
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

      <section style={featuresSectionStyle}>
        <FeatureCard
          color="#fb7185"
          title="AI Detection"
          text="Advanced AI identifies valuable toys in seconds."
        >
          <TargetIcon color="#fb7185" />
        </FeatureCard>

        <FeatureCard
          color="#22d3ee"
          title="Market Analysis"
          text="Real-time market data and sales trends."
        >
          <ChartIcon color="#22d3ee" />
        </FeatureCard>

        <FeatureCard
          color="#f59e0b"
          title="Value Estimation"
          text="Get accurate price ranges and profit potential."
        >
          <CoinIcon color="#f59e0b" />
        </FeatureCard>

        <FeatureCard
          color="#fb7185"
          title="Stay Ahead"
          text="Find gems others miss before they do."
        >
          <TrophyIcon color="#fb7185" />
        </FeatureCard>
      </section>

      <section style={howItWorksSectionStyle}>
        <h2 style={howItWorksTitleStyle}>How ToyHunter Works</h2>

        <div style={howItWorksGridStyle}>
          <div style={stepCardStyle}>
            <div style={stepNumberStyle}>1</div>
            <h3 style={stepTitleStyle}>Set Your Hunt Profile</h3>
            <p style={stepTextStyle}>
              Choose your toy lines, platforms, budget and profit targets.
            </p>
          </div>

          <div style={stepCardStyle}>
            <div style={stepNumberStyle}>2</div>
            <h3 style={stepTitleStyle}>ToyHunter Scans Daily</h3>
            <p style={stepTextStyle}>
              Our hunt engine searches marketplaces for new opportunities.
            </p>
          </div>

          <div style={stepCardStyle}>
            <div style={stepNumberStyle}>3</div>
            <h3 style={stepTitleStyle}>Hidden Gems Detected</h3>
            <p style={stepTextStyle}>
              Listings are scored using rarity, market value and profit potential.
            </p>
          </div>

          <div style={stepCardStyle}>
            <div style={stepNumberStyle}>4</div>
            <h3 style={stepTitleStyle}>Buy Before Others</h3>
            <p style={stepTextStyle}>
              Review your Daily Hunt dashboard and grab the best finds first.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  color,
  title,
  text,
  children,
}: {
  color: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...featureCardStyle,
        border: `1px solid ${color}`,
        boxShadow: `0 0 30px ${color}33`,
      }}
    >
      <div>{children}</div>
      <div>
        <h2 style={{ ...featureTitleStyle, color }}>{title}</h2>
        <p style={featureTextStyle}>{text}</p>
      </div>
    </div>
  );
}

function TargetIcon({ color }: { color: string }) {
  return (
    <div
      style={{
        ...iconBoxStyle,
        borderColor: color,
        boxShadow: `0 0 18px ${color}66`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "10px",
          border: `2px solid ${color}`,
          borderRadius: "50%",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "22px",
          border: `2px solid ${color}`,
          borderRadius: "50%",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "8px",
          bottom: "8px",
          width: "1px",
          backgroundColor: color,
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "8px",
          right: "8px",
          height: "1px",
          backgroundColor: color,
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 12px ${color}`,
        }}
      />
    </div>
  );
}

function ChartIcon({ color }: { color: string }) {
  return (
    <div
      style={{
        ...iconBoxStyle,
        borderColor: color,
        boxShadow: `0 0 18px ${color}66`,
      }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <line x1="16" y1="48" x2="16" y2="18" stroke={color} strokeWidth="2" />
        <line x1="16" y1="48" x2="50" y2="48" stroke={color} strokeWidth="2" />
        <polyline
          points="20,42 28,34 35,38 46,24"
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        <polyline
          points="42,24 46,24 46,28"
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function CoinIcon({ color }: { color: string }) {
  return (
    <div
      style={{
        ...iconBoxStyle,
        borderColor: color,
        boxShadow: `0 0 18px ${color}66`,
      }}
    >
      <div style={{ ...coinCircleStyle, borderColor: color, color }}>€</div>
    </div>
  );
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <div
      style={{
        ...iconBoxStyle,
        borderColor: color,
        boxShadow: `0 0 18px ${color}66`,
      }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <polygon
          points="32,14 44,24 39,42 25,42 20,24"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
        />

        <polygon
          points="32,20 38,26 35,36 29,36 26,26"
          fill={color}
          opacity="0.3"
        />
      </svg>
    </div>
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

const ringOneStyle = { ...ringBase, width: "80px", height: "80px" };
const ringTwoStyle = { ...ringBase, width: "170px", height: "170px" };
const ringThreeStyle = { ...ringBase, width: "270px", height: "270px" };
const ringFourStyle = { ...ringBase, width: "370px", height: "370px" };

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
  animation: "radarSweep 8s linear infinite",
  clipPath: "polygon(0 0, 100% 0, 0 100%)",
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

const featuresSectionStyle = {
  maxWidth: "1400px",
  margin: "20px auto 60px",
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "22px",
};

const featureCardStyle = {
  backgroundColor: "rgba(6,10,30,0.55)",
  borderRadius: "18px",
  padding: "24px",
  minHeight: "145px",
  display: "flex",
  alignItems: "center",
  gap: "22px",
  backdropFilter: "blur(8px)",
};

const featureTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  margin: "0 0 8px 0",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
};

const featureTextStyle = {
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: 0,
};

const howItWorksSectionStyle = {
  maxWidth: "1400px",
  margin: "80px auto",
};

const howItWorksTitleStyle = {
  color: "white",
  fontSize: "42px",
  fontWeight: "900",
  textAlign: "center" as const,
  marginBottom: "34px",
};

const howItWorksGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "22px",
};

const stepCardStyle = {
  backgroundColor: "rgba(6,10,30,0.55)",
  border: "1px solid rgba(34,211,238,0.2)",
  borderRadius: "18px",
  padding: "26px",
  minHeight: "170px",
  boxShadow: "0 0 30px rgba(34,211,238,0.08)",
  backdropFilter: "blur(8px)",
};

const stepNumberStyle = {
  color: "#22d3ee",
  fontSize: "34px",
  fontWeight: "900",
  marginBottom: "12px",
};

const stepTitleStyle = {
  color: "white",
  fontSize: "20px",
  fontWeight: "900",
  margin: "0 0 10px",
};

const stepTextStyle = {
  color: "#94a3b8",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: 0,
};

const iconBoxStyle = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  border: "2px solid",
  position: "relative" as const,
  flexShrink: 0,
};

const coinCircleStyle = {
  position: "absolute" as const,
  inset: "12px",
  border: "2px solid",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "26px",
};
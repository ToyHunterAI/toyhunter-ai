"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "18px 40px",
        backgroundColor: "#0f172a",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <nav
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={logoRadarStyle}>
  <div style={logoOuterRingStyle} />
  <div style={logoMiddleRingStyle} />
  <div style={logoInnerRingStyle} />
  <div style={logoHorizontalLineStyle} />
  <div style={logoVerticalLineStyle} />
  <span style={logoTextStyle}>TH</span>
</div>

            <span
              style={{
                color: "white",
                fontSize: "22px",
                fontWeight: "800",
                letterSpacing: "0.5px",
              }}
            >
              ToyHunter AI
            </span>
          </div>
        </Link>

        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/" style={getLinkStyle(pathname === "/")}>
            Home
          </Link>

          <Link href="/hunt" style={getLinkStyle(pathname === "/hunt")}>
            Hunt
          </Link>

          <Link href="/analyse" style={getLinkStyle(pathname === "/analyse")}>
            Analyse
          </Link>

          <Link href="/sell" style={getLinkStyle(pathname === "/sell")}>
            Sell
          </Link>
        </div>
      </nav>
    </header>
  );
}

function getLinkStyle(active: boolean) {
  return {
    textDecoration: "none",
    color: active ? "#f59e0b" : "#cbd5e1",
    fontSize: "16px",
    fontWeight: active ? "700" : "500",
  };
}

const logoRadarStyle = {
  position: "relative" as const,
  width: "46px",
  height: "46px",
  borderRadius: "50%",
  boxShadow: "0 0 22px rgba(34,211,238,0.45)",
};

const logoOuterRingStyle = {
  position: "absolute" as const,
  inset: "0",
  border: "2px solid rgba(34,211,238,0.95)",
  borderRadius: "50%",
};

const logoMiddleRingStyle = {
  position: "absolute" as const,
  inset: "7px",
  border: "1px solid rgba(34,211,238,0.65)",
  borderRadius: "50%",
};

const logoInnerRingStyle = {
  position: "absolute" as const,
  inset: "14px",
  border: "1px solid rgba(34,211,238,0.45)",
  borderRadius: "50%",
};

const logoHorizontalLineStyle = {
  position: "absolute" as const,
  left: "4px",
  right: "4px",
  top: "50%",
  height: "1px",
  backgroundColor: "rgba(34,211,238,0.45)",
};

const logoVerticalLineStyle = {
  position: "absolute" as const,
  top: "4px",
  bottom: "4px",
  left: "50%",
  width: "1px",
  backgroundColor: "rgba(34,211,238,0.45)",
};

const logoTextStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "0.5px",
  textShadow: "0 0 8px rgba(34,211,238,0.9)",
};
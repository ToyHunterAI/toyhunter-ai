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
            <div
              style={{
                position: "relative",
                width: "42px",
                height: "42px",
              }}
            >
              <div style={outerRingStyle} />
              <div style={middleRingStyle} />
              <div style={coreDotStyle} />
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

const outerRingStyle = {
  position: "absolute" as const,
  inset: "0",
  border: "2px solid rgba(245,158,11,0.9)",
  borderRadius: "50%",
  boxShadow: "0 0 18px rgba(245,158,11,0.25)",
};

const middleRingStyle = {
  position: "absolute" as const,
  inset: "7px",
  border: "2px solid rgba(245,158,11,0.55)",
  borderRadius: "50%",
};

const coreDotStyle = {
  position: "absolute" as const,
  inset: "15px",
  background: "#f59e0b",
  borderRadius: "50%",
  boxShadow: "0 0 24px rgba(245,158,11,0.9)",
};
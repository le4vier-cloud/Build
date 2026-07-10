"use client";

import Link from "next/link";
import { Monitor, HardHat } from "lucide-react";

export default function LandingPage() {
  return (
    <div style={s.page}>
      <div style={s.logo}>
        <img src="/Build-Logo.ico" alt="Build" style={s.logoImg} />
        <span style={s.logoText}>Build</span>
      </div>

      <p style={s.tagline}>Where are you working today?</p>

      <div style={s.cards}>
        <Link href="/home" style={{ ...s.card, ...s.cardDark }}>
          <Monitor size={40} color="#ffffff" strokeWidth={1.5} />
          <div>
            <p style={s.cardTitle}>Back-End</p>
            <p style={{ ...s.cardSub, color: "rgba(255,255,255,0.6)" }}>
              Management · Engineering · Office
            </p>
          </div>
        </Link>

        <Link href="/floor" style={{ ...s.card, ...s.cardLight }}>
          <HardHat size={40} color="#1D1D1F" strokeWidth={1.5} />
          <div>
            <p style={{ ...s.cardTitle, color: "#1D1D1F" }}>Front-End</p>
            <p style={{ ...s.cardSub, color: "#6E6E73" }}>
              Production Floor · Workshop · Factory
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F5F5F7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    padding: 24,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 800,
    color: "#1D1D1F",
    letterSpacing: "-0.04em",
  },
  tagline: {
    fontSize: 16,
    color: "#6E6E73",
    fontWeight: 400,
    marginTop: -20,
  },
  cards: {
    display: "flex",
    gap: 16,
    width: "100%",
    maxWidth: 600,
  },
  card: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 20,
    padding: 32,
    borderRadius: 20,
    textDecoration: "none",
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  cardDark: {
    backgroundColor: "#1D1D1F",
    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E5EA",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#FFFFFF",
    letterSpacing: "-0.02em",
    marginBottom: 4,
    whiteSpace: "nowrap",
  },
  cardSub: {
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
  },
};

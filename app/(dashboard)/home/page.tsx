"use client";

import { useState, useEffect } from "react";

const FIRST_NAME = "Janco";

type Bucket = "dawn" | "morning" | "midday" | "afternoon" | "evening" | "night";

function getBucket(hour: number): Bucket {
  if (hour >= 4 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 13) return "midday";
  if (hour >= 13 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const GREETINGS: Record<Bucket, string[]> = {
  dawn: [
    "Wake and bake, {name}",
    "Sun's barely up, Boss",
    "Early bird catches the braai, {name}",
  ],
  morning: [
    "Morning, {name}",
    "Howzit, Boss",
    "Sharp sharp, {name}",
    "Morning, Bossy",
  ],
  midday: [
    "Lekker lunch vibes, {name}",
    "Halfway there, Chief",
    "Braai o'clock soon, {name}",
  ],
  afternoon: [
    "Afternoon, {name}",
    "Howzit Big Boss",
    "Afternoon, Bossy",
    "Still going strong, {name}",
  ],
  evening: [
    "Evening, {name}",
    "Knock-off time, Boss",
    "Eish, still at it, {name}?",
  ],
  night: [
    "Burning the midnight oil, {name}",
    "Still grinding, Legend",
    "Night owl vibes, {name}",
    "Howzit, night shift {name}",
  ],
};

function buildGreeting(): string {
  const bucket = getBucket(new Date().getHours());
  const options = GREETINGS[bucket];
  const pick = options[Math.floor(Math.random() * options.length)];
  return pick.replace("{name}", FIRST_NAME);
}

export default function HomePage() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(buildGreeting());
  }, []);

  return (
    <div style={s.wrap}>
      <div style={s.content}>
        <img src="/build-logo-pixel.png" alt="" style={s.logo} draggable={false} />
        <h1 style={s.greeting}>{greeting || " "}</h1>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    height: "calc(100vh - 100px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: 28,
  },
  logo: {
    width: 76,
    height: 76,
    imageRendering: "pixelated",
    flexShrink: 0,
  },
  greeting: {
    fontFamily: "var(--font-geist-pixel-square)",
    fontSize: 44,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
    margin: 0,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  },
};

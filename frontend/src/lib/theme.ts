import type { Evidence, GroupId } from "./types";

export const GROUP_LABEL: Record<GroupId, string> = {
  callers: "Callers",
  non_callers: "Non-callers",
};

export const VERDICT: Record<GroupId, string> = {
  callers: "Likely to call",
  non_callers: "Unlikely to call",
};

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  weak: "Weak evidence",
  moderate: "Moderate evidence",
  strong: "Strong evidence",
};

/** Group colours: orange and blue stay distinguishable for the common types of colour blindness. */
export const GROUP_COLOR: Record<GroupId, string> = {
  callers: "var(--color-callers)",
  non_callers: "var(--color-noncallers)",
};

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

function interpolate(stops: string[], t: number): Rgb {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  return mix(hexToRgb(stops[index]), hexToRgb(stops[index + 1]), scaled - index);
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const rgb = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

const SEQUENTIAL = {
  light: ["#f5f7ff", "#c7d2fe", "#818cf8", "#4f46e5", "#312e81"],
  dark: ["#161b2e", "#272f5c", "#4338ca", "#818cf8", "#e0e7ff"],
};

const DIVERGING = {
  light: ["#1d4ed8", "#93c5fd", "#f8fafc", "#fdba74", "#c2410c"],
  dark: ["#93c5fd", "#2563eb", "#1a1f2e", "#c2410c", "#fdba74"],
};

// Small differences matter, so the diverging scale is stretched near zero (the ends stay fixed).
const DIVERGING_GAMMA = 0.6;

export interface CellColor {
  fill: string;
  text: string;
}

/** Probability → colour, 0 … max. */
export function sequentialColor(value: number, max: number, theme: "light" | "dark"): CellColor {
  const color = interpolate(SEQUENTIAL[theme], max > 0 ? value / max : 0);
  return { fill: rgb(color), text: luminance(color) > 0.35 ? "#0f172a" : "#f8fafc" };
}

/** Difference → colour: blue (non-callers) … neutral … orange (callers). */
export function divergingColor(value: number, limit: number, theme: "light" | "dark"): CellColor {
  const share = limit > 0 ? Math.max(-1, Math.min(1, value / limit)) : 0;
  const stretched = Math.sign(share) * Math.abs(share) ** DIVERGING_GAMMA;
  const color = interpolate(DIVERGING[theme], 0.5 + stretched / 2);
  return { fill: rgb(color), text: luminance(color) > 0.35 ? "#0f172a" : "#f8fafc" };
}

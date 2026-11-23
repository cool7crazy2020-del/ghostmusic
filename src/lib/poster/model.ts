/** Poster Studio data model: sizes, templates, defaults and export maths. Pure + testable. */

export interface PosterTrack {
  /** Display label for the track number, e.g. "3" or "2-3" for multi-disc albums. */
  number: string;
  title: string;
  durationSec?: number;
}

export interface PosterAlbum {
  key: string;
  sourceLabel: string;
  isDemo: boolean;
  title: string;
  artist: string;
  year?: number;
  /** Remote/data URL artwork returned by the source. */
  artworkUrl?: string;
  /** Demo albums use a CSS artwork placeholder class instead of an image. */
  artClass?: string;
  tracks: PosterTrack[];
}

export type SizeId = "a4" | "12x18" | "18x24" | "square";
export const SIZES: Record<SizeId, { label: string; wIn: number; hIn: number }> = {
  a4: { label: "A4 · 210×297 mm", wIn: 8.268, hIn: 11.693 },
  "12x18": { label: "12×18 in", wIn: 12, hIn: 18 },
  "18x24": { label: "18×24 in", wIn: 18, hIn: 24 },
  square: { label: "Square · 12×12 in", wIn: 12, hIn: 12 },
};

/** Posters are laid out at a fixed design width, then scaled for preview/export. */
export const DESIGN_WIDTH = 1200;
export const designHeight = (size: SizeId) => Math.round((DESIGN_WIDTH * SIZES[size].hIn) / SIZES[size].wIn);

/** Pixel size for export at the target DPI, reduced only if the browser canvas limit would be exceeded. */
export function exportPixels(size: SizeId, targetDpi = 300, maxArea = 40_000_000) {
  const { wIn, hIn } = SIZES[size];
  let dpi = targetDpi;
  if (wIn * hIn * dpi * dpi > maxArea) dpi = Math.floor(Math.sqrt(maxArea / (wIn * hIn)));
  return { dpi, width: Math.round(wIn * dpi), height: Math.round(hIn * dpi), pixelRatio: (wIn * dpi) / DESIGN_WIDTH };
}

export type TemplateId = "minimal" | "editorial" | "dark" | "modern";
export type FontId = "classic" | "editorial" | "condensed" | "grotesk";

export const FONTS: Record<FontId, { label: string; display: string; body: string; displayWeight: number; uppercase: boolean }> = {
  classic: { label: "Fraunces / DM Sans", display: "'Fraunces', Georgia, serif", body: "'DM Sans', system-ui, sans-serif", displayWeight: 600, uppercase: false },
  editorial: { label: "Playfair / Figtree", display: "'Playfair Display', Georgia, serif", body: "'Figtree', system-ui, sans-serif", displayWeight: 700, uppercase: false },
  condensed: { label: "Bebas Neue / Space Mono", display: "'Bebas Neue', Impact, sans-serif", body: "'Space Mono', ui-monospace, monospace", displayWeight: 400, uppercase: true },
  grotesk: { label: "Syne / Figtree", display: "'Syne', system-ui, sans-serif", body: "'Figtree', system-ui, sans-serif", displayWeight: 800, uppercase: false },
};
/** Google Fonts families needed for each pairing (used for the page link and export embedding). */
export const FONT_FAMILIES: Record<FontId, string[]> = {
  classic: ["Fraunces:wght@400;600", "DM+Sans:wght@400;500;700"],
  editorial: ["Playfair+Display:wght@500;700", "Figtree:wght@400;500;700"],
  condensed: ["Bebas+Neue", "Space+Mono:wght@400;700"],
  grotesk: ["Syne:wght@600;800", "Figtree:wght@400;500;700"],
};
export const fontCssUrl = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;

export interface PosterSettings {
  template: TemplateId;
  size: SizeId;
  bg: string;
  text: string;
  accent: string;
  font: FontId;
  align: "left" | "center";
  showNumbers: boolean;
  showYear: boolean;
  showDuration: boolean;
  /** Tracklist line spacing multiplier. */
  spacing: number;
  /** Typography scale multiplier. */
  scale: number;
}

export const TEMPLATES: Record<TemplateId, { label: string; blurb: string; defaults: Omit<PosterSettings, "template" | "size"> }> = {
  minimal: {
    label: "Minimal",
    blurb: "Gallery paper, centred cover",
    defaults: { bg: "#f3f0e8", text: "#151515", accent: "#6d28d9", font: "classic", align: "center", showNumbers: true, showYear: true, showDuration: false, spacing: 1, scale: 1 },
  },
  editorial: {
    label: "Editorial",
    blurb: "Magazine grid with rules",
    defaults: { bg: "#ebe3d3", text: "#1c1712", accent: "#9a3412", font: "editorial", align: "left", showNumbers: true, showYear: true, showDuration: true, spacing: 1, scale: 1 },
  },
  dark: {
    label: "Dark",
    blurb: "Full-bleed cover, neon accent",
    defaults: { bg: "#0b0a10", text: "#f3f1f9", accent: "#a855f7", font: "condensed", align: "left", showNumbers: true, showYear: true, showDuration: true, spacing: 1, scale: 1 },
  },
  modern: {
    label: "Modern",
    blurb: "Bold type, offset cover",
    defaults: { bg: "#1a1030", text: "#f6f1ff", accent: "#c084fc", font: "grotesk", align: "left", showNumbers: true, showYear: true, showDuration: false, spacing: 1, scale: 1 },
  },
};

export function templateDefaults(template: TemplateId, size: SizeId): PosterSettings {
  return { template, size, ...TEMPLATES[template].defaults };
}

export function formatDuration(sec?: number) {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Choose the tracklist layout: fewest columns whose fitted font stays near the base size, else the largest font. */
export function pickColumns(fits: Array<{ columns: number; fontPx: number }>, basePx: number) {
  const good = fits.find((f) => f.fontPx >= basePx * 0.82);
  if (good) return good;
  return fits.reduce((a, b) => (b.fontPx > a.fontPx ? b : a));
}

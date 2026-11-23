import { FONT_FAMILIES, fontCssUrl, SIZES, exportPixels, DESIGN_WIDTH, designHeight, type FontId, type SizeId } from "./model";

const fontCache = new Map<FontId, string>();

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Inline the latin @font-face rules of the chosen pairing so the export uses the same type as the preview. */
async function fontEmbedCss(font: FontId) {
  const cached = fontCache.get(font);
  if (cached) return cached;
  const css = await (await fetch(fontCssUrl(FONT_FAMILIES[font]))).text();
  const blocks = [...css.matchAll(/\/\*\s*latin\s*\*\/\s*(@font-face\s*{[^}]*})/g)].map((m) => m[1]);
  const out = await Promise.all(
    blocks.map(async (b) => {
      const url = b.match(/url\((https:[^)]+)\)/)?.[1];
      return url ? b.replace(url, await toDataUrl(url)) : b;
    }),
  );
  const result = out.join("\n");
  fontCache.set(font, result);
  return result;
}

export async function renderPosterCanvas(node: HTMLElement, size: SizeId, font: FontId, onStep: (s: string) => void) {
  const { toCanvas } = await import("html-to-image");
  onStep("Embedding fonts…");
  let fontCss = "";
  try {
    fontCss = await fontEmbedCss(font);
  } catch {
    /* fall back to whatever fonts are already loaded */
  }
  await document.fonts?.ready;
  const px = exportPixels(size);
  onStep(`Rendering ${px.width}×${px.height}px (${px.dpi} DPI)…`);
  const canvas = await toCanvas(node, {
    width: DESIGN_WIDTH,
    height: designHeight(size),
    pixelRatio: px.pixelRatio,
    fontEmbedCSS: fontCss,
    cacheBust: false,
    style: { transform: "none" },
  });
  if (!canvas.width || !canvas.height) throw new Error("Your browser could not create a canvas this large. Try a smaller size.");
  return { canvas, px };
}

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportPng(canvas: HTMLCanvasElement, name: string) {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("PNG encoding failed — the image may be too large for this browser.");
  const url = URL.createObjectURL(blob);
  download(url, `${name}.png`);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportPdf(canvas: HTMLCanvasElement, size: SizeId, name: string) {
  const { jsPDF } = await import("jspdf");
  const { wIn, hIn } = SIZES[size];
  const pdf = new jsPDF({ orientation: wIn > hIn ? "landscape" : "portrait", unit: "in", format: [wIn, hIn], compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, wIn, hIn, undefined, "FAST");
  pdf.setProperties({ title: name, creator: "GHOST Music Poster Studio" });
  pdf.save(`${name}.pdf`);
}

export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "poster";

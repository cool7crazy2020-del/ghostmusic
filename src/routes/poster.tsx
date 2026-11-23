import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { FileImage, FileText, LoaderCircle, Music2, RotateCcw, Search, Sparkles } from "lucide-react";

import { Page } from "@/components/ghost/page-parts";
import { Button } from "@/components/ui/button";
import { fetchArtworkDataUrl, getCatalogAlbum } from "@/lib/poster/albums.functions";
import { exportPdf, exportPng, fileSafe, renderPosterCanvas } from "@/lib/poster/export";
import {
  FONTS,
  SIZES,
  TEMPLATES,
  formatDuration,
  templateDefaults,
  type FontId,
  type PosterAlbum,
  type PosterSettings,
  type SizeId,
  type TemplateId,
} from "@/lib/poster/model";

export const Route = createFileRoute("/poster")({
  head: () => ({
    meta: [
      { title: "Poster Studio — GHOST Music" },
      { name: "description", content: "Create and export custom album tracklist posters." },
    ],
  }),
  component: PosterStudioPage,
});

function PosterStudioPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [settings, setSettings] = useState<PosterSettings>(() => templateDefaults("minimal", "a4"));
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const posterRef = useRef<HTMLDivElement>(null);

  const search = useQuery({
    queryKey: ["poster-albums", submittedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(submittedQuery)}&type=albums`);
      const payload = await response.json() as { results?: Array<{ id: string; title: string; artist: string; year?: number; artworkUrl?: string; trackCount?: number }>; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Album search request failed.");
      return payload.results ?? [];
    },
    enabled: submittedQuery.trim().length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["poster-album", selectedId],
    queryFn: () => getCatalogAlbum({ data: { id: selectedId } }),
    enabled: !!selectedId,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const album: PosterAlbum | null = detail.data
    ? {
        key: detail.data.id,
        sourceLabel: detail.data.id.startsWith("deezer:") ? "Deezer catalog" : "Apple catalog",
        isDemo: false,
        title: detail.data.title,
        artist: detail.data.artist,
        year: detail.data.year,
        artworkUrl: detail.data.artworkUrl,
        tracks: detail.data.tracks.map((track) => ({
          number: detail.data!.discCount > 1 ? `${track.disc}-${track.number}` : String(track.number),
          title: track.title,
          durationSec: track.durationSec,
        })),
      }
    : null;

  const artwork = useQuery({
    queryKey: ["poster-artwork-data", album?.key, album?.artworkUrl],
    queryFn: () => fetchArtworkDataUrl({ data: { url: album!.artworkUrl! } }),
    enabled: !!album?.artworkUrl,
    staleTime: Infinity,
    retry: false,
  });

  const trackColumns = useMemo(() => {
    if (!album) return 1;
    const count = album.tracks.length;
    // Use multiple columns early enough that a full-length album fits comfortably.
    if (count >= 24) return 3;
    if (count >= 10) return 2;
    return 1;
  }, [album]);

  const update = (patch: Partial<PosterSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const chooseTemplate = (template: TemplateId) => setSettings((current) => ({ ...templateDefaults(template, current.size) }));

  async function handleExport(kind: "png" | "pdf") {
    if (!posterRef.current || !album) return;
    setExporting(kind);
    setExportStatus("Preparing poster…");
    try {
      const { canvas } = await renderPosterCanvas(posterRef.current, settings.size, settings.font, setExportStatus);
      const name = fileSafe(`${album.artist} - ${album.title}`);
      setExportStatus(kind === "png" ? "Creating PNG…" : "Creating print-ready PDF…");
      if (kind === "png") await exportPng(canvas, name);
      else await exportPdf(canvas, settings.size, name);
      setExportStatus("Export complete.");
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const size = SIZES[settings.size];
  const trackFont = Math.max(14, Math.min(27, 27 - Math.max(0, (album?.tracks.length ?? 0) - 10) * 0.55)) * settings.scale;
  const isMinimal = settings.template === "minimal";
  const coverWidth = isMinimal ? "42%" : settings.template === "editorial" ? "34%" : "38%";
  const previewImage = artwork.data ?? "";

  return (
    <Page className="pb-16">
      <header className="header-glow -mx-4 mb-7 px-4 pb-7 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <Sparkles className="size-4" /> GHOST CREATIVE TOOLS
        </div>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Poster Studio</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Turn any album into a print-ready tracklist poster. Search, style, preview, and export.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-border/70 bg-surface/70 p-4 sm:p-5" aria-label="Find an album">
        <div className="mb-3 flex items-center gap-2">
          <Search className="size-4 text-primary" />
          <h2 className="font-semibold">Find an album</h2>
          <span className="ml-auto text-xs text-muted-foreground">Apple catalog with Deezer fallback</span>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedId("");
            setSubmittedQuery(query.trim());
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search album or artist…"
            aria-label="Search album or artist"
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" className="h-11 gap-2" disabled={!query.trim()}>
            <Search className="size-4" /> Search albums
          </Button>
        </form>
        {search.isFetching && <p className="mt-3 text-sm text-muted-foreground">Searching albums…</p>}
        {search.isError && <p role="alert" className="mt-3 text-sm text-destructive">{search.error instanceof Error ? search.error.message : "Album search is unavailable right now. Please try again in a moment."}</p>}
        {search.data && submittedQuery && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {search.data.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`group min-w-0 rounded-xl border p-2 text-left transition hover:border-primary/60 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === item.id ? "border-primary bg-accent/60" : "border-border/70 bg-background/50"}`}
              >
                {item.artworkUrl ? (
                  <img src={item.artworkUrl} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted"><Music2 /></div>
                )}
                <span className="mt-2 block truncate text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.artist}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{item.year ?? "Release year unavailable"}{item.trackCount ? ` · ${item.trackCount} tracks` : ""}</span>
              </button>
            ))}
            {search.data.length === 0 && <p className="col-span-full py-5 text-center text-sm text-muted-foreground">No albums found. Try another title or artist.</p>}
          </div>
        )}
        {detail.isFetching && <p className="mt-4 text-sm text-muted-foreground">Loading album and tracklist…</p>}
        {detail.isError && <p role="alert" className="mt-3 text-sm text-destructive">{detail.error instanceof Error ? detail.error.message : "Could not load this album. Choose another result and try again."}</p>}
      </section>

      {!album ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><FileImage className="size-6" /></div>
          <h2 className="text-lg font-bold">Your poster starts with an album</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Search above, then choose an album to generate its artwork and complete tracklist.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Selected album</p>
              <h2 className="mt-1 truncate text-xl font-bold">{album.title}</h2>
              <p className="text-sm text-muted-foreground">{album.artist}{album.year ? ` · ${album.year}` : ""} · {album.tracks.length} tracks</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSelectedId(""); setExportStatus(""); }}>
              Choose another album
            </Button>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0" aria-label="Live poster preview">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Live preview</h3>
                <span className="text-xs text-muted-foreground">{size.label} · 300 DPI target</span>
              </div>
              <div className="flex justify-center overflow-x-auto overflow-y-visible rounded-2xl border border-border/70 bg-[#09080d] p-3 shadow-inner sm:p-6">
                <div
                  ref={posterRef}
                  className="relative flex w-full max-w-[560px] shrink-0 flex-col overflow-hidden p-[5.5%] shadow-2xl"
                  style={{ aspectRatio: `${size.wIn} / ${size.hIn}`, background: settings.bg, color: settings.text, fontFamily: FONTS[settings.font].body }}
                >
                  <div className="flex items-center justify-between text-[clamp(7px,0.8vw,12px)] font-semibold uppercase tracking-[0.22em]" style={{ color: settings.accent }}>
                    <span>GHOST MUSIC / ALBUM STUDY</span>
                    <span>{settings.showYear && album.year ? album.year : "TRACKLIST EDITION"}</span>
                  </div>
                  <div className={`mt-[4%] flex min-h-0 flex-1 gap-[5%] ${isMinimal ? "flex-col items-center text-center" : "flex-col"}`}>
                    <div className={`flex min-h-0 ${isMinimal ? "w-full flex-col items-center" : "w-full flex-row items-center gap-[5%]"}`}>
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={`${album.title} album artwork`}
                          className="aspect-square shrink-0 rounded-[2px] object-cover shadow-xl"
                          style={{ width: coverWidth, maxWidth: "100%" }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="flex aspect-square shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-violet-500/50 to-black" style={{ width: coverWidth }}>
                          <Music2 className="size-10 opacity-60" />
                        </div>
                      )}
                      <div className={`min-w-0 ${isMinimal ? "mt-[4%] w-full" : "flex-1"}`}>
                        <p className="mb-[1.5%] text-[clamp(7px,0.9vw,13px)] font-bold uppercase tracking-[0.2em]" style={{ color: settings.accent }}>{album.artist}</p>
                        <h2
                          className="break-words leading-[0.95]"
                          style={{
                            fontFamily: FONTS[settings.font].display,
                            fontWeight: FONTS[settings.font].displayWeight,
                            fontSize: `clamp(24px, ${Math.max(2.1, 4.2 * settings.scale)}vw, 64px)`,
                            textAlign: settings.align,
                            textTransform: FONTS[settings.font].uppercase ? "uppercase" : "none",
                          }}
                        >
                          {album.title}
                        </h2>
                        <div className="mt-[3%] h-[2px] w-12" style={{ background: settings.accent, marginInline: settings.align === "center" ? "auto" : 0 }} />
                      </div>
                    </div>
                    <div className="mt-[5%] min-h-0 flex-1">
                      <div className="mb-[2.5%] flex items-center justify-between border-b pb-[1.5%]" style={{ borderColor: settings.accent }}>
                        <span className="text-[clamp(7px,0.8vw,12px)] font-bold uppercase tracking-[0.2em]">Tracklist</span>
                        <span className="text-[clamp(7px,0.8vw,12px)] opacity-60">{String(album.tracks.length).padStart(2, "0")} TRACKS</span>
                      </div>
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${trackColumns}, minmax(0, 1fr))`,
                          columnGap: "5%",
                          rowGap: `${Math.max(3, 7 * settings.spacing)}px`,
                          textAlign: settings.align === "center" && isMinimal ? "center" : "left",
                        }}
                      >
                        {album.tracks.map((track, index) => (
                          <div key={`${track.number}-${index}`} className="flex min-w-0 items-baseline gap-2 border-b pb-[1.2%]" style={{ borderColor: `${settings.text}22`, fontSize: `clamp(8px, ${trackFont / 1200 * 100}vw, 19px)`, lineHeight: settings.spacing + 1.1 }}>
                            {settings.showNumbers && <span className="shrink-0 tabular-nums" style={{ color: settings.accent }}>{(track.number && track.number !== "0" ? track.number : String(index + 1)).padStart(2, "0")}</span>}
                            <span className="min-w-0 flex-1 break-words font-medium">{track.title}</span>
                            {settings.showDuration && track.durationSec && <span className="shrink-0 tabular-nums opacity-55">{formatDuration(track.durationSec)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-[4%] flex items-center justify-between border-t pt-[2%] text-[clamp(7px,0.7vw,10px)] uppercase tracking-[0.18em]" style={{ borderColor: `${settings.text}33`, color: settings.text, opacity: 0.62 }}>
                    <span>{album.artist}</span><span>GHOST · POSTER STUDIO</span>
                  </div>
                </div>
              </div>
              {artwork.isError && <p className="mt-2 text-xs text-amber-300">Artwork could not be prepared for export. You can still edit the layout, but exports may omit the cover image.</p>}
            </section>

            <aside className="space-y-4 rounded-2xl border border-border/70 bg-surface/70 p-4 sm:p-5" aria-label="Poster settings">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Design</h3>
                  <button type="button" onClick={() => setSettings(templateDefaults(settings.template, settings.size))} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
                    <button key={id} type="button" onClick={() => chooseTemplate(id)} className={`rounded-xl border p-3 text-left transition ${settings.template === id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-accent/50"}`}>
                      <span className="block text-sm font-semibold">{TEMPLATES[id].label}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{TEMPLATES[id].blurb}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <label className="block text-xs font-medium text-muted-foreground">Poster size
                  <select value={settings.size} onChange={(e) => update({ size: e.target.value as SizeId })} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                    {(Object.keys(SIZES) as SizeId[]).map((id) => <option key={id} value={id}>{SIZES[id].label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted-foreground">Font pairing
                  <select value={settings.font} onChange={(e) => update({ font: e.target.value as FontId })} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                    {(Object.keys(FONTS) as FontId[]).map((id) => <option key={id} value={id}>{FONTS[id].label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted-foreground">Text alignment
                  <select value={settings.align} onChange={(e) => update({ align: e.target.value as "left" | "center" })} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                    <option value="left">Left</option><option value="center">Centered</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                {([{ key: "bg", label: "Background" }, { key: "text", label: "Text" }, { key: "accent", label: "Accent" }] as const).map(({ key, label }) => (
                  <label key={key} className="min-w-0 text-center text-[11px] text-muted-foreground">
                    <input type="color" value={settings[key]} onChange={(e) => update({ [key]: e.target.value })} aria-label={label + " color"} className="mb-1 h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1" />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                {([
                  ["showNumbers", "Track numbers"],
                  ["showYear", "Release year"],
                  ["showDuration", "Track durations"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    {label}
                    <input type="checkbox" checked={settings[key]} onChange={(e) => update({ [key]: e.target.checked })} className="size-4 accent-violet-500" />
                  </label>
                ))}
                <label className="block text-xs text-muted-foreground">Track spacing <span className="float-right text-foreground">{settings.spacing.toFixed(1)}×</span>
                  <input type="range" min="0.7" max="1.6" step="0.1" value={settings.spacing} onChange={(e) => update({ spacing: Number(e.target.value) })} className="mt-2 w-full accent-violet-500" />
                </label>
                <label className="block text-xs text-muted-foreground">Typography scale <span className="float-right text-foreground">{settings.scale.toFixed(1)}×</span>
                  <input type="range" min="0.8" max="1.3" step="0.1" value={settings.scale} onChange={(e) => update({ scale: Number(e.target.value) })} className="mt-2 w-full accent-violet-500" />
                </label>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-semibold">Export poster</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleExport("png")} disabled={!!exporting || (album.artworkUrl ? !artwork.data && !artwork.isError : false)} className="gap-2">
                    {exporting === "png" ? <LoaderCircle className="size-4 animate-spin" /> : <FileImage className="size-4" />} PNG
                  </Button>
                  <Button variant="outline" onClick={() => handleExport("pdf")} disabled={!!exporting || (album.artworkUrl ? !artwork.data : false)} className="gap-2">
                    {exporting === "pdf" ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF
                  </Button>
                </div>
                {exportStatus && <p role="status" className="mt-3 break-words text-xs text-muted-foreground">{exportStatus}</p>}
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Use artwork only when you have the rights or permission to print or distribute it. GHOST does not grant artwork licenses.</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </Page>
  );
}

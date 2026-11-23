import { describe, expect, it } from "vitest";
import { exportPixels, designHeight, pickColumns, templateDefaults, formatDuration } from "./model";

describe("poster model", () => {
  it("exports A4 at 300 DPI", () => {
    const p = exportPixels("a4");
    expect(p.dpi).toBe(300);
    expect(p.width).toBe(2480);
    expect(p.height).toBe(3508);
  });
  it("exports 18x24 at 300 DPI (5400×7200)", () => {
    expect(exportPixels("18x24")).toMatchObject({ dpi: 300, width: 5400, height: 7200 });
  });
  it("square poster is square", () => {
    expect(designHeight("square")).toBe(1200);
  });
  it("prefers fewer columns when legible", () => {
    expect(pickColumns([{ columns: 1, fontPx: 25 }, { columns: 2, fontPx: 28 }], 28).columns).toBe(1);
    expect(pickColumns([{ columns: 1, fontPx: 10 }, { columns: 2, fontPx: 18 }, { columns: 3, fontPx: 16 }], 28).columns).toBe(2);
  });
  it("each template has its own defaults", () => {
    expect(templateDefaults("dark", "a4").bg).toBe("#0b0a10");
    expect(templateDefaults("minimal", "a4").align).toBe("center");
  });
  it("omits unknown durations", () => {
    expect(formatDuration(undefined)).toBe("");
    expect(formatDuration(245)).toBe("4:05");
  });
});

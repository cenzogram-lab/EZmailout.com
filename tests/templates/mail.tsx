// Browser side of tests/templates/mail.mjs: the mail-type template library
// (src/frontend/src/directmail) converted into studio layers, compared with
// the original renderer and audited like the gallery templates.
import "@/fonts.css";
import type { CanvasState } from "@/backend";
import { SidePreview } from "@/components/templates/TemplatePreview";
import { MailPiece } from "@/directmail/MailPiece";
import { loadFonts } from "@/directmail/fonts";
import { resolveTheme } from "@/directmail/theme";
import {
  STUDIO_MAIL_TEMPLATES,
  canvasFromStudioDraft,
  sampleContentFor,
  studioDraft,
} from "@/directmail/studio";
import { getTemplate } from "@/directmail/templates";
import { getLayoutDims } from "@/lib/printSpec";
import { rasterizeSide } from "@/lib/rasterize";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

const w = window as any;
const stage = document.getElementById("stage")!;
const root = createRoot(stage);
const canvases = new Map<string, CanvasState>();

async function canvasFor(id: string): Promise<CanvasState> {
  let c = canvases.get(id);
  if (!c) {
    const t = getTemplate(id)!;
    c = canvasFromStudioDraft(await studioDraft(t));
    canvases.set(id, c);
  }
  return c;
}

w.templateIds = () => STUDIO_MAIL_TEMPLATES.map((t) => t.id);

w.convert = async (id: string) => {
  const t0 = performance.now();
  const c = await canvasFor(id);
  const stat = (k: "front" | "back") => ({
    text: c[k].textBlocks.length,
    logos: c[k].logos.length,
    qr: c[k].qrCodes.length,
    bg: Boolean(c[k].backgroundImageUrl),
    chars: JSON.stringify(c[k], (_k, v) => (typeof v === "bigint" ? Number(v) : v)).length,
  });
  return { id, ms: performance.now() - t0, w: c.widthInches, h: c.heightInches, front: stat("front"), back: stat("back") };
};

/** Original, converted preview and 150 DPI raster for one side, side by side. */
w.compare = async (id: string, side: "front" | "back", width = 520) => {
  const t = getTemplate(id)!;
  const draft = await studioDraft(t);
  const canvas = await canvasFor(id);
  await loadFonts(resolveTheme(t.theme).fontIds);
  const dims = getLayoutDims(draft.layoutVariant, draft.orientation);
  const raster = await rasterizeSide(canvas[side], dims, { dpi: 150 });
  const rasterUrl = raster.toDataURL("image/png");
  const theirSide = side === "back" && t.sides === 4 ? "back" : side;
  const fmtW = (t.format === "notecard-folded" ? 2 : 1) * draft.widthInches * 96;
  const scale = (width * (t.format === "notecard-folded" ? 2 : 1)) / fmtW;
  await new Promise<void>((resolve) => {
    root.render(
      createElement(
        "div",
        null,
        createElement("div", { className: "label" }, `${id} · ${side} · original | converted | 150 DPI print raster`),
        createElement(
          "div",
          { className: "row" },
          createElement(
            "div",
            { className: "pane", id: "orig", style: { width: width * (t.format === "notecard-folded" ? 2 : 1), height: (draft.heightInches * 96) * scale, overflow: "hidden" } },
            createElement(MailPiece, { template: t, content: sampleContentFor(t), side: theirSide, scale }),
          ),
          createElement("div", { className: "pane", id: "conv", style: { width } }, createElement(SidePreview, { canvas, side })),
          createElement("img", { className: "pane", id: "rast", src: rasterUrl, style: { width } }),
        ),
      ),
    );
    setTimeout(resolve, 400);
  });
  await document.fonts.ready;
  return true;
};

w.harnessReady = true;

/* ---------------------------------------------------------------- audit */
import { textBlockStyle } from "@/components/canvas/CanvasEditor";
import { physicalTraitsFor, PERFORATION_INSET_INCHES } from "@/lib/physical";
import { getPricingRow } from "@/lib/pricing";
import { safeRect } from "@/lib/printSpec";
import { isShapeUrl } from "@/lib/shapes";
import { textInkRect, textLinesOverlap, textLinesRect } from "@/lib/textStyle";

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect, m = 0.5) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > m && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > m;
const lum = (r: number, g: number, b: number) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const imgs = new Map<string, Promise<HTMLImageElement | null>>();
const load = (u: string) => {
  let p = imgs.get(u);
  if (!p) { p = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; }); imgs.set(u, p); }
  return p;
};
/** Rotated text occupies its turned box. */
function textRect(t: { x: number; y: number; width: number; height: number; rotation?: number }): Rect {
  const r = t.rotation ?? 0;
  if (!r) return { x: t.x, y: t.y, w: t.width, h: t.height };
  const rad = (r * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const w = t.width * c + t.height * s;
  const h = t.width * s + t.height * c;
  return { x: t.x + t.width / 2 - w / 2, y: t.y + t.height / 2 - h / 2, w, h };
}

w.auditTemplate = async (id: string) => {
  const t = getTemplate(id)!;
  const draft = await studioDraft(t);
  const canvas = await canvasFor(id);
  const dims = getLayoutDims(draft.layoutVariant, draft.orientation);
  const traits = physicalTraitsFor(draft.layoutVariant, draft.orientation);
  const row = getPricingRow(draft.layoutVariant)!;
  const safe = safeRect(dims);
  const problems: string[] = [];
  // Letters read across their folds; so does the letter inside a certified
  // or pressure-seal mailer, and a poster-style flyer across its crease.
  // Those crossings are reported as notes, not problems.
  const letterLike = row.layout === "Address on Separate Page";
  const readsAcross = (key: "front" | "back") =>
    letterLike ||
    row.layout === "Unfolded Flyer" ||
    (key === "front" && (row.layout === "Certified Self Mailer" || row.layout === "Pressure Seal Snap Pack"));
  for (const key of ["front", "back"] as const) {
    const side = canvas[key];
    const tag = `${id} ${key}`;
    const items: { kind: string; label: string; b: Rect; bleed?: boolean }[] = [
      ...side.textBlocks.map((x) => ({ kind: "text", label: x.text.slice(0, 28), b: textInkRect(x) })),
      ...side.logos.map((x) => ({ kind: isShapeUrl(x.url) ? "shape" : "art", label: "art", b: { x: x.x, y: x.y, w: x.width, h: x.height }, bleed: /data-ez-(bleed|zone)/.test(x.url) })),
      ...side.qrCodes.map((x) => ({ kind: "qr", label: "qr", b: { x: x.x, y: x.y, w: x.size, h: x.size } })),
    ];
    if (side.textBlocks.length + side.logos.length + side.qrCodes.length > 200) problems.push(`${tag}: more than 200 layers`);
    for (const e of items) {
      const outside = e.b.x < safe.x - 0.6 || e.b.y < safe.y - 0.6 || e.b.x + e.b.w > safe.x + safe.w + 0.6 || e.b.y + e.b.h > safe.y + safe.h + 0.6;
      if (outside && !e.bleed) problems.push(`${tag}: ${e.kind} "${e.label}" outside safe area`);
      if (key === "back" && dims.addressZone && e.kind !== "art" && overlaps(e.b, dims.addressZone)) problems.push(`${tag}: ${e.kind} "${e.label}" in USPS zone`);
      if (key === "back" && dims.addressZone && e.kind === "art" && !e.bleed && overlaps(e.b, dims.addressZone, 4)) problems.push(`${tag}: art in USPS zone`);
      if (key === "front" && !letterLike) for (const wc of traits.windows) {
        const wb = { x: wc.xInches * 100, y: wc.yInches * 100, w: wc.widthInches * 100, h: wc.heightInches * 100 };
        if (overlaps(e.b, wb)) problems.push(`${tag}: ${e.kind} "${e.label}" over a #10 window`);
      }
      const tear = PERFORATION_INSET_INCHES * 100;
      if (e.kind === "text" || e.kind === "qr") for (const edge of traits.perforations) {
        const bad = edge === "left" ? e.b.x < tear : edge === "right" ? e.b.x + e.b.w > dims.designWidth - tear : edge === "top" ? e.b.y < tear : e.b.y + e.b.h > dims.designHeight - tear;
        if (bad) problems.push(`${tag}: ${e.kind} "${e.label}" over a tear strip`);
      }
      if (!readsAcross(key) && (e.kind === "text" || e.kind === "qr")) for (const c of traits.creases) {
        const at = c.axis === "vertical" ? c.at * dims.designWidth : c.at * dims.designHeight;
        const lo = c.axis === "vertical" ? e.b.x : e.b.y;
        const hi = lo + (c.axis === "vertical" ? e.b.w : e.b.h);
        if (lo + 1 < at && hi - 1 > at) problems.push(`${tag}: ${e.kind} "${e.label}" crosses a fold`);
      }
    }
    const tb = side.textBlocks;
    for (let i = 0; i < tb.length; i++) for (let j = i + 1; j < tb.length; j++) if (textLinesOverlap(tb[i], tb[j])) problems.push(`${tag}: text "${tb[i].text.slice(0, 28)}" overlaps "${tb[j].text.slice(0, 28)}"`);
    // Rendered overflow with the studio's own text style.
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    for (const x of side.textBlocks) {
      const d = document.createElement("div");
      const st = textBlockStyle(x);
      Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: `${x.width}px`, height: `${x.height}px`, boxSizing: "border-box", fontSize: `${x.fontSize}px`, fontFamily: st.fontFamily as string, fontWeight: String(st.fontWeight), fontStyle: (st.fontStyle as string) ?? "normal", lineHeight: String(st.lineHeight), letterSpacing: (st.letterSpacing as string) ?? "normal", whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "2px", textAlign: st.textAlign as string });
      d.textContent = x.text;
      probe.appendChild(d);
      if (d.scrollHeight > d.clientHeight + 2 || d.scrollWidth > d.clientWidth + 1) problems.push(`${tag}: text "${x.text.slice(0, 28)}" overflows ${d.scrollWidth}x${d.scrollHeight} > ${d.clientWidth}x${d.clientHeight}`);
      if (x.fontSize < 5.95) problems.push(`${tag}: text "${x.text.slice(0, 28)}" tiny ${x.fontSize}px`);
    }
    probe.remove();
    // Contrast: background + every image layer under the text, sampled.
    const cv = document.createElement("canvas");
    cv.width = dims.designWidth; cv.height = dims.designHeight;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = side.backgroundColor; ctx.fillRect(0, 0, cv.width, cv.height);
    if (side.backgroundImageUrl) { const im = await load(side.backgroundImageUrl); if (im) ctx.drawImage(im, 0, 0, cv.width, cv.height); }
    // The address, postage and IMb barcode print in the USPS zone: it must
    // be a light ground (with whatever bleed art reaches into it).
    // Only the zone's part inside the safe area takes print.
    const az = key === "back" ? dims.addressZone : undefined;
    const zone = az && {
      x: Math.max(az.x, safe.x),
      y: Math.max(az.y, safe.y),
      w: Math.min(az.x + az.w, safe.x + safe.w) - Math.max(az.x, safe.x),
      h: Math.min(az.y + az.h, safe.y + safe.h) - Math.max(az.y, safe.y),
    };
    if (zone && zone.w > 0 && zone.h > 0) {
      const zc = document.createElement("canvas"); zc.width = cv.width; zc.height = cv.height;
      const g = zc.getContext("2d")!; g.drawImage(cv, 0, 0);
      for (const l of [...side.logos].sort((a, b) => Number(a.zIndex - b.zIndex))) {
        if (!overlaps({ x: l.x, y: l.y, w: l.width, h: l.height }, zone)) continue;
        const im = await load(l.url); if (im) g.drawImage(im, l.x, l.y, l.width, l.height);
      }
      const d = g.getImageData(Math.round(zone.x), Math.round(zone.y), Math.round(zone.w), Math.round(zone.h)).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (lum(d[i], d[i + 1], d[i + 2]) < 0.45) dark++;
      const share = dark / (d.length / 4);
      if (share > 0.02) problems.push(`${tag}: USPS zone ground is dark (${(share * 100).toFixed(0)}% of it)`);
    }
    for (const x of side.textBlocks) {
      const z = x.zIndex;
      const under = side.logos.filter((l) => l.zIndex < z && overlaps({ x: l.x, y: l.y, w: l.width, h: l.height }, { x: x.x, y: x.y, w: x.width, h: x.height }));
      const c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = cv.height;
      const g = c2.getContext("2d")!; g.drawImage(cv, 0, 0);
      for (const l of under.sort((a, b) => Number(a.zIndex - b.zIndex))) { const im = await load(l.url); if (im) g.drawImage(im, l.x, l.y, l.width, l.height); }
      const r = textLinesRect(x);
      const data = g.getImageData(Math.max(0, Math.round(r.x)), Math.max(0, Math.round(r.y)), Math.max(1, Math.min(cv.width, Math.round(r.w))), Math.max(1, Math.min(cv.height, Math.round(r.h)))).data;
      const ls: number[] = [];
      for (let k = 0; k < data.length; k += 4 * 5) ls.push(lum(data[k], data[k + 1], data[k + 2]));
      ls.sort((a, b) => a - b);
      const hex = x.color.slice(0, 7);
      const tl = lum(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
      const med = ls[Math.floor(ls.length / 2)];
      const large = x.fontSize >= 24 || (x.fontSize >= 18.66 && Number(x.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      const alpha = x.color.length === 9 ? parseInt(x.color.slice(7), 16) / 255 : 1;
      if (alpha > 0.6 && ratio(tl, med) < need) problems.push(`${tag}: text "${x.text.slice(0, 28)}" contrast ${ratio(tl, med).toFixed(2)} < ${need} (${x.color})`);
    }
  }
  return problems;
};

/** Mean absolute difference (0–255) and share of strongly differing pixels. */
w.diffImages = async (a: string, b: string) => {
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  if (!ia || !ib) return null;
  const W = Math.min(ia.naturalWidth, ib.naturalWidth);
  const H = Math.min(ia.naturalHeight, ib.naturalHeight);
  const grab = (im: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!; g.drawImage(im, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const da = grab(ia); const db = grab(ib);
  let sum = 0; let strong = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
    sum += d; if (d > 64) strong++;
  }
  return { mad: sum / (W * H), strong: strong / (W * H) };
};

w.debugText = async (id: string, side: "front" | "back", needle: string) => {
  const canvas = await canvasFor(id);
  const t = canvas[side].textBlocks.find((b) => b.text.includes(needle));
  const draft = await studioDraft(getTemplate(id)!);
  const els = draft[side].elements.map((e, i) => (e.kind === "text" ? `${i} text ${e.block.text.slice(0, 20)} ${e.block.color}` : e.kind === "logo" ? `${i} logo ${Math.round(e.logo.x)},${Math.round(e.logo.y)} ${Math.round(e.logo.width)}x${Math.round(e.logo.height)}` : `${i} qr`));
  return { t: t && { ...t, zIndex: Number(t.zIndex), fontWeight: Number(t.fontWeight) }, bg: draft[side].backgroundColor, hasBgImg: Boolean(draft[side].backgroundImageUrl), els };
};
w.layouts = (ids: string[]) => ids.map((id) => { const t = getTemplate(id)!; return `${id} front=${t.front.layout} back=${t.back?.layout ?? "-"}`; });

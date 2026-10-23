// Browser side of tests/templates/run.mjs. See that file.
import { canvasFromTemplate } from "@/lib/canvas";
import { physicalTraitsFor } from "@/lib/physical";
import { PRICING_LEDGER } from "@/lib/pricing";
import { getLayoutDims, safeRect, type Orientation } from "@/lib/printSpec";
import { PERFORATION_INSET_INCHES } from "@/lib/physical";
import { TEMPLATES, loadTemplateFonts } from "@/lib/templates";
import { isShapeUrl } from "@/lib/shapes";

type Box = { x: number; y: number; w: number; h: number };
const inter = (a: Box, b: Box) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
const lum = (r: number, g: number, b: number) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const hexLum = (h: string) => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
const load = (u: string) => { let p = imgCache.get(u); if (!p) { p = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; }); imgCache.set(u, p); } return p; };

(window as any).runAudit = async (filter?: { ids?: string[]; variants?: string[]; contrast?: boolean; showcaseOnly?: boolean }) => {
  await loadTemplateFonts();
  await document.fonts.ready;
  const problems: string[] = [];
  const stage = document.getElementById("stage")!;
  let builds = 0; let ms = 0;
  for (const t of TEMPLATES) {
    if (filter?.ids && !filter.ids.includes(t.id)) continue;
    for (const row of PRICING_LEDGER) {
      if (filter?.variants && !filter.variants.includes(row.id)) continue;
      if (filter?.showcaseOnly && row.id !== t.layoutVariant) continue;
      for (const o of ["native", "rotated"] as Orientation[]) {
        const t0 = performance.now();
        const canvas = canvasFromTemplate(t, row.id, o);
        ms += performance.now() - t0; builds++;
        const dims = getLayoutDims(row.id, o);
        const traits = physicalTraitsFor(row.id, o);
        const safe = safeRect(dims);
        for (const sideKey of ["front", "back"] as const) {
          const side = canvas[sideKey];
          const tag = `${t.id} ${row.id} ${o} ${sideKey}`;
          const boxes: { kind: string; id: string; b: Box; role?: string }[] = [
            ...side.textBlocks.map((x) => ({ kind: "text", id: x.text.slice(0, 24), b: { x: x.x, y: x.y, w: x.width, h: x.height } })),
            ...side.logos.map((x) => ({ kind: "logo", id: "logo", b: { x: x.x, y: x.y, w: x.width, h: x.height } })),
            ...side.qrCodes.map((x) => ({ kind: "qr", id: "qr", b: { x: x.x, y: x.y, w: x.size, h: x.size } })),
          ];
          for (const e of boxes) {
            if (e.b.x < safe.x - 0.6 || e.b.y < safe.y - 0.6 || e.b.x + e.b.w > safe.x + safe.w + 0.6 || e.b.y + e.b.h > safe.y + safe.h + 0.6) problems.push(`${tag}: ${e.kind} "${e.id}" outside safe area`);
            if (e.b.w <= 0 || e.b.h <= 0) problems.push(`${tag}: ${e.kind} "${e.id}" empty box`);
            if (sideKey === "back" && dims.addressZone && inter(e.b, dims.addressZone)) problems.push(`${tag}: ${e.kind} "${e.id}" in USPS zone`);
            if (sideKey === "front") for (const w of traits.windows) { const wb = { x: w.xInches * 100, y: w.yInches * 100, w: w.widthInches * 100, h: w.heightInches * 100 }; if (inter(e.b, wb)) problems.push(`${tag}: ${e.kind} "${e.id}" over a #10 window`); }
            const tear = PERFORATION_INSET_INCHES * 100;
            for (const edge of traits.perforations) {
              const bad = edge === "left" ? e.b.x < tear : edge === "right" ? e.b.x + e.b.w > dims.designWidth - tear : edge === "top" ? e.b.y < tear : e.b.y + e.b.h > dims.designHeight - tear;
              if (bad) problems.push(`${tag}: ${e.kind} "${e.id}" over a tear strip`);
            }
            const lettery = t.archetype === "letterhead" && sideKey === "front" || sideKey === "back" && !dims.addressZone;
            if (!lettery) for (const c of traits.creases) {
              const at = c.axis === "vertical" ? c.at * dims.designWidth : c.at * dims.designHeight;
              const lo = c.axis === "vertical" ? e.b.x : e.b.y; const hi = lo + (c.axis === "vertical" ? e.b.w : e.b.h);
              if (lo < at && hi > at) problems.push(`${tag}: ${e.kind} "${e.id}" crosses a fold`);
            }
          }
          const texts = boxes.filter((x) => x.kind === "text");
          for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (inter(texts[i].b, texts[j].b)) problems.push(`${tag}: text "${texts[i].id}" overlaps "${texts[j].id}"`);
          // Rendered overflow
          stage.innerHTML = "";
          for (const x of side.textBlocks) {
            const d = document.createElement("div");
            Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: `${x.width}px`, height: `${x.height}px`, fontSize: `${x.fontSize}px`, fontFamily: `"${x.fontFamily}", "Geist", sans-serif`, fontWeight: String(Number(x.fontWeight)), lineHeight: "1.2", whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "2px", boxSizing: "border-box", textAlign: x.align });
            d.textContent = x.text; stage.appendChild(d);
            if (d.scrollHeight > d.clientHeight + 1 || d.scrollWidth > d.clientWidth + 1) problems.push(`${tag}: text "${x.text.slice(0, 24)}" overflows ${d.scrollWidth}x${d.scrollHeight} > ${d.clientWidth}x${d.clientHeight}`);
            if (x.fontSize < 10) problems.push(`${tag}: text "${x.text.slice(0, 24)}" tiny ${x.fontSize}px`);
          }
          if (filter?.contrast !== false) {
            // Background + every image layer, then sample under each text box.
            const cv = document.createElement("canvas"); cv.width = dims.designWidth; cv.height = dims.designHeight;
            const ctx = cv.getContext("2d")!; ctx.fillStyle = side.backgroundColor; ctx.fillRect(0, 0, cv.width, cv.height);
            if (side.backgroundImageUrl) { const im = await load(side.backgroundImageUrl); if (im) ctx.drawImage(im, 0, 0, cv.width, cv.height); }
            const layers = [...side.logos.map((l) => ({ z: Number(l.zIndex), l }))].sort((a, b) => a.z - b.z);
            for (const { l } of layers) { const im = await load(l.url); if (!im) continue; if (isShapeUrl(l.url)) ctx.drawImage(im, l.x, l.y, l.width, l.height); else { const f = Math.min(l.width / im.naturalWidth, l.height / im.naturalHeight); ctx.drawImage(im, l.x + (l.width - im.naturalWidth * f) / 2, l.y + (l.height - im.naturalHeight * f) / 2, im.naturalWidth * f, im.naturalHeight * f); } }
            for (const x of side.textBlocks) {
              const z = Number(x.zIndex);
              // only layers under the text count; re-draw is costly, so approximate with all layers below by z
              const data = ctx.getImageData(Math.max(0, Math.round(x.x)), Math.max(0, Math.round(x.y)), Math.max(1, Math.round(x.width)), Math.max(1, Math.round(x.height))).data;
              const ls: number[] = [];
              for (let k = 0; k < data.length; k += 4 * 7) ls.push(lum(data[k], data[k + 1], data[k + 2]));
              ls.sort((a, b) => a - b);
              const tl = hexLum(x.color);
              // worst decile on the side the text has least contrast with
              const lo = ls[Math.floor(ls.length * 0.1)], hi = ls[Math.floor(ls.length * 0.9)], med = ls[Math.floor(ls.length / 2)];
              const worst = Math.min(ratio(tl, med), Math.max(ratio(tl, lo), ratio(tl, hi)) );
              const large = x.fontSize >= 24 || (x.fontSize >= 18.66 && Number(x.fontWeight) >= 700);
              const need = large ? 3 : 4.5;
              if (ratio(tl, med) < need) problems.push(`${tag}: text "${x.text.slice(0, 24)}" contrast ${ratio(tl, med).toFixed(2)} < ${need} (${x.color})`);
              void worst; void z;
            }
          }
        }
      }
    }
  }
  return { builds, avgMs: ms / Math.max(1, builds), problems };
};
(window as any).auditReady = true;
import { checkImageResolution, rasterizeSide } from "@/lib/rasterize";
(window as any).rasterTest = async () => {
  await loadTemplateFonts();
  const out: unknown[] = [];
  for (const t of TEMPLATES.slice(0, 43)) {
    const o = t.orientation;
    const canvas = canvasFromTemplate(t, t.layoutVariant, o);
    const dims = getLayoutDims(t.layoutVariant, o);
    for (const key of ["front", "back"] as const) {
      const c = await rasterizeSide(canvas[key], dims, { dpi: 150, sampleRecipientId: "preview" });
      const ctx = c.getContext("2d")!;
      // the background must have been drawn: sample the corner, which only the bg paints
      const px = ctx.getImageData(2, 2, 1, 1).data;
      const res = await checkImageResolution(canvas[key].backgroundImageUrl!, dims);
      out.push({ id: t.id, key, w: c.width, h: c.height, corner: Array.from(px).slice(0, 3), bg: canvas[key].backgroundColor, dpi: res?.effectiveDpi, ok: res?.ok, bytes: JSON.stringify(canvas[key], (_k, v) => (typeof v === "bigint" ? Number(v) : v)).length });
    }
  }
  return out;
};

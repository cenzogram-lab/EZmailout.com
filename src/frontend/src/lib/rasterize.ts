import type { CanvasSide } from "@/backend";
import { QrMode } from "@/backend";
import { DESIGN_PPI, type LayoutDims, RASTER_DPI } from "@/lib/printSpec";
import { normalizeDestinationUrl, qrToCanvas } from "@/lib/qr";
import { isShapeUrl } from "@/lib/shapes";
import { wrapText } from "@/lib/textFit";
import { canvasFont, fontSpecOf, textExtras } from "@/lib/textStyle";

export interface RasterizeOptions {
  dpi?: number;
  /** Recipient id substituted into `{{recipientId}}` dynamic QR placeholders. */
  sampleRecipientId?: string;
  /**
   * Fail when an image cannot be loaded, instead of leaving it out. The
   * print file sets it: the editor's `<img>` can still show a picture the
   * rasterizer cannot read (an expired or cross-origin URL), and a paid file
   * missing it would print that side as a flat colour.
   */
  requireImages?: boolean;
}

export const IMAGE_LOAD_ERROR =
  "An image in your design couldn't be loaded for printing (a generated image's link may have expired). Replace it in the studio, then launch again; nothing has been charged.";

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Makes sure every typeface used on a side is loaded before the 2D context
 * measures or draws text, otherwise the browser silently falls back.
 */
async function ensureFontsLoaded(side: CanvasSide): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  // Geist is self-hosted; wait for the stylesheet's @font-face loads first so
  // no glyph is measured with a substituted face.
  await document.fonts.ready;
  const requests = side.textBlocks.map((block) =>
    document.fonts
      .load(`${Number(block.fontWeight)} 16px "${block.fontFamily}"`)
      .catch(() => []),
  );
  await Promise.all(requests);
}

/**
 * Renders one canvas side into an HTMLCanvasElement at print resolution.
 * Coordinates in `side` are design pixels (DESIGN_PPI); output is `dpi` px/in.
 */
export async function rasterizeSide(
  side: CanvasSide,
  dims: LayoutDims,
  options: RasterizeOptions = {},
): Promise<HTMLCanvasElement> {
  const dpi = options.dpi ?? RASTER_DPI;
  const scale = dpi / DESIGN_PPI;
  await ensureFontsLoaded(side);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(dims.widthInches * dpi);
  canvas.height = Math.round(dims.heightInches * dpi);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = side.backgroundColor || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (side.backgroundImageUrl) {
    const img = await loadImage(side.backgroundImageUrl);
    if (!img && options.requireImages) throw new Error(IMAGE_LOAD_ERROR);
    if (img) {
      const ratio = Math.max(
        canvas.width / img.width,
        canvas.height / img.height,
      );
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
  }

  type Layer =
    | { kind: "text"; z: bigint; draw: () => Promise<void> }
    | { kind: "logo"; z: bigint; draw: () => Promise<void> }
    | { kind: "qr"; z: bigint; draw: () => Promise<void> };
  const layers: Layer[] = [];

  for (const logo of side.logos) {
    layers.push({
      kind: "logo",
      z: logo.zIndex,
      draw: async () => {
        const img = await loadImage(logo.url);
        if (!img && options.requireImages) throw new Error(IMAGE_LOAD_ERROR);
        if (!img) return;
        const x = logo.x * scale;
        const y = logo.y * scale;
        const w = logo.width * scale;
        const h = logo.height * scale;
        // Shapes stretch to their box; images are fitted inside it and
        // centred, exactly as the editor draws them (object-fill / contain).
        if (isShapeUrl(logo.url) || !img.naturalWidth || !img.naturalHeight) {
          ctx.drawImage(img, x, y, w, h);
          return;
        }
        const fit = Math.min(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * fit;
        const dh = img.naturalHeight * fit;
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      },
    });
  }

  for (const block of side.textBlocks) {
    layers.push({
      kind: "text",
      z: block.zIndex,
      draw: async () => {
        const spec = fontSpecOf(block);
        const { rotation } = textExtras(block);
        const fontSize = block.fontSize * scale;
        ctx.save();
        ctx.font = canvasFont(spec, fontSize);
        ctx.fillStyle = block.color;
        // Tracking: CSS adds it after every character. Where the 2D context
        // supports `letterSpacing` it draws it natively; elsewhere each line
        // is drawn character by character.
        const tracking = spec.letterSpacing * fontSize;
        const nativeTracking = "letterSpacing" in (ctx as object);
        if (nativeTracking) ctx.letterSpacing = `${tracking}px`;
        const measure = (line: string) =>
          ctx.measureText(line).width +
          (nativeTracking ? 0 : tracking * [...line].length);
        // Place each line on its baseline exactly where CSS does: the font's
        // ascent + descent is centred in the line box (half-leading), so
        // the PDF matches the editor. `textBaseline = "top"` sat ~0.15 em high.
        const metrics = ctx.measureText("Hg");
        const ascent = metrics.fontBoundingBoxAscent;
        const descent = metrics.fontBoundingBoxDescent;
        const cssBaseline = Number.isFinite(ascent) && Number.isFinite(descent);
        ctx.textBaseline = cssBaseline ? "alphabetic" : "top";
        const align =
          block.align === "center" || block.align === "right"
            ? block.align
            : "left";
        ctx.textAlign = "left";
        const boxX = block.x * scale;
        const boxY = block.y * scale;
        const boxW = block.width * scale;
        const boxH = block.height * scale;
        if (rotation) {
          // Turned about the box centre, as the editor's CSS transform does.
          ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-(boxX + boxW / 2), -(boxY + boxH / 2));
        }
        // Wrapped exactly as the editor and the height refit wrap it.
        const lines = wrapText(block.text, boxW - 4 * scale, measure);
        const lineHeight = fontSize * spec.lineHeight;
        const baselineOffset = cssBaseline
          ? (lineHeight - (ascent + descent)) / 2 + ascent
          : 0;
        lines.forEach((line, i) => {
          const width = measure(line);
          const x =
            align === "center"
              ? boxX + (boxW - width) / 2
              : align === "right"
                ? boxX + boxW - 2 * scale - width
                : boxX + 2 * scale;
          const y = boxY + 2 * scale + i * lineHeight + baselineOffset;
          if (nativeTracking || !tracking) {
            ctx.fillText(line, x, y);
            return;
          }
          let cx = x;
          for (const ch of line) {
            ctx.fillText(ch, cx, y);
            cx += ctx.measureText(ch).width + tracking;
          }
        });
        ctx.restore();
      },
    });
  }

  for (const qr of side.qrCodes) {
    layers.push({
      kind: "qr",
      z: qr.zIndex,
      draw: async () => {
        const target =
          qr.mode === QrMode.DynamicTracking
            ? qr.url.replace(
                "{{recipientId}}",
                options.sampleRecipientId ?? "preview",
              )
            : // A bare domain typed into a static code still opens in a browser.
              (normalizeDestinationUrl(qr.url) ?? qr.url);
        const size = Math.round(qr.size * scale);
        const tmp = document.createElement("canvas");
        await qrToCanvas(tmp, target || "https://ezmailout.com", {
          size,
          foreground: qr.foreground,
          background: qr.background,
        });
        ctx.drawImage(tmp, qr.x * scale, qr.y * scale, size, size);
      },
    });
  }

  layers.sort((a, b) => (a.z < b.z ? -1 : a.z > b.z ? 1 : 0));
  for (const layer of layers) {
    await layer.draw();
  }
  return canvas;
}

/**
 * Turns a side rendered in its design orientation onto the page the print partner
 * prints. Native designs pass through; a rotated design (the sheet viewed a
 * quarter turn counter-clockwise, see `rotateRect`) is turned back a quarter
 * turn clockwise, so every page keeps the product's own size and the USPS
 * zone, folds and windows land where the press expects them.
 */
export function toNativePage(
  raster: HTMLCanvasElement,
  dims: LayoutDims,
  dpi: number = RASTER_DPI,
): HTMLCanvasElement {
  if (!dims.rotated) return raster;
  const page = document.createElement("canvas");
  page.width = Math.round(dims.nativeWidthInches * dpi);
  page.height = Math.round(dims.nativeHeightInches * dpi);
  const ctx = page.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  // View point (u, v) sits at sheet point (W − v, u): the view's top edge is
  // the sheet's right edge.
  ctx.setTransform(0, 1, -1, 0, page.width, 0);
  ctx.drawImage(raster, 0, 0);
  return page;
}

export function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("JPEG encoding failed")),
      "image/jpeg",
      quality,
    );
  });
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG encoding failed")),
      "image/png",
    );
  });
}

/** Warns when a raster background is too small to print crisply at 300 DPI. */
export async function checkImageResolution(
  url: string,
  dims: LayoutDims,
): Promise<{
  ok: boolean;
  effectiveDpi: number;
  width: number;
  height: number;
} | null> {
  const img = await loadImage(url);
  if (!img) return null;
  const effectiveDpi = Math.min(
    img.width / dims.widthInches,
    img.height / dims.heightInches,
  );
  return {
    ok: effectiveDpi >= 150,
    effectiveDpi: Math.round(effectiveDpi),
    width: img.width,
    height: img.height,
  };
}

import type { CanvasSide } from "@/backend";
import { QrMode } from "@/backend";
import { DESIGN_PPI, type LayoutDims, RASTER_DPI } from "@/lib/printSpec";
import { qrToCanvas } from "@/lib/qr";

export interface RasterizeOptions {
  dpi?: number;
  /** Recipient id substituted into `{{recipientId}}` dynamic QR placeholders. */
  sampleRecipientId?: string;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/**
 * Makes sure every typeface used on a side is loaded before the 2D context
 * measures or draws text, otherwise the browser silently falls back.
 */
async function ensureFontsLoaded(side: CanvasSide): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
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
        if (!img) return;
        ctx.drawImage(
          img,
          logo.x * scale,
          logo.y * scale,
          logo.width * scale,
          logo.height * scale,
        );
      },
    });
  }

  for (const block of side.textBlocks) {
    layers.push({
      kind: "text",
      z: block.zIndex,
      draw: async () => {
        const fontSize = block.fontSize * scale;
        ctx.font = `${Number(block.fontWeight)} ${fontSize}px "${block.fontFamily}", "Geist", sans-serif`;
        ctx.fillStyle = block.color;
        ctx.textBaseline = "top";
        const align =
          block.align === "center" || block.align === "right"
            ? block.align
            : "left";
        ctx.textAlign = align;
        const boxX = block.x * scale;
        const boxW = block.width * scale;
        const lines = wrapLines(ctx, block.text, boxW - 4 * scale);
        const lineHeight = fontSize * 1.2;
        const originX =
          align === "center"
            ? boxX + boxW / 2
            : align === "right"
              ? boxX + boxW
              : boxX + 2 * scale;
        lines.forEach((line, i) => {
          ctx.fillText(
            line,
            originX,
            block.y * scale + 2 * scale + i * lineHeight,
          );
        });
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
            : qr.url;
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

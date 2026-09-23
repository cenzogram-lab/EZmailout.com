import type { CanvasSide, CanvasState } from "@/backend";
import { type PdfImagePage, buildPdfFromJpegs } from "@/lib/pdf";
import { RASTER_DPI, getLayoutDims } from "@/lib/printSpec";
import {
  canvasToJpegBlob,
  checkImageResolution,
  rasterizeSide,
} from "@/lib/rasterize";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

/** Minimum effective DPI for a raster background to print crisply. */
export const MIN_PRINT_DPI = 150;

/** JPEG quality used for the print-ready pages. */
export const PRINT_JPEG_QUALITY = 0.92;

const FALLBACK_LAYOUT = "6x9";

export interface ImageResolutionReport {
  side: CanvasSideKey;
  /** `null` when the image could not be loaded for inspection. */
  effectiveDpi: number | null;
  ok: boolean;
  width: number;
  height: number;
}

export type PreflightRasterStatus = "idle" | "running" | "done" | "error";

export interface PreflightRaster {
  status: PreflightRasterStatus;
  /** Downscaled JPEG data URL of the front face rendered at 300 DPI. */
  frontPreviewUrl: string | null;
  images: ImageResolutionReport[];
  /** Lowest effective DPI across inspected backgrounds (`null` when none). */
  minEffectiveDpi: number | null;
  error: string | null;
}

export interface BuiltPrintDocument {
  pdf: Uint8Array;
  pages: number;
  widthInches: number;
  heightInches: number;
}

const IDLE_RASTER: PreflightRaster = {
  status: "idle",
  frontPreviewUrl: null,
  images: [],
  minEffectiveDpi: null,
  error: null,
};

const WHITE_COLORS = new Set(["#fff", "#ffffff", "white", "rgb(255,255,255)"]);

/** True when a background color is effectively blank white. */
export function isBlankWhite(color: string): boolean {
  return WHITE_COLORS.has(color.trim().toLowerCase().replace(/\s+/g, ""));
}

/** True when a side has anything worth printing (image, elements, tinted bg). */
export function sideHasContent(side: CanvasSide): boolean {
  if (side.backgroundImageUrl) return true;
  if (side.textBlocks.length > 0) return true;
  if (side.logos.length > 0) return true;
  if (side.qrCodes.length > 0) return true;
  return !!side.backgroundColor && !isBlankWhite(side.backgroundColor);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unknown rendering error";
}

async function canvasToPage(canvas: HTMLCanvasElement): Promise<PdfImagePage> {
  const blob = await canvasToJpegBlob(canvas, PRINT_JPEG_QUALITY);
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  return { jpeg, widthPx: canvas.width, heightPx: canvas.height };
}

function downscaleToDataUrl(source: HTMLCanvasElement, maxWidth = 720): string {
  const scale = Math.min(1, maxWidth / source.width);
  if (scale >= 1) return source.toDataURL("image/jpeg", 0.85);
  const thumb = document.createElement("canvas");
  thumb.width = Math.max(1, Math.round(source.width * scale));
  thumb.height = Math.max(1, Math.round(source.height * scale));
  const ctx = thumb.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", 0.85);
  ctx.drawImage(source, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", 0.85);
}

/**
 * Builds the print-ready PDF for a campaign: the front face, plus the back
 * face when it carries any content, each rasterized at 300 DPI and embedded
 * as a JPEG page sized to the physical mail piece.
 */
export async function buildPrintPdf(
  canvas: CanvasState,
  layoutVariant: string,
  sampleRecipientId: string,
): Promise<BuiltPrintDocument> {
  const dims = getLayoutDims(layoutVariant);
  const options = { dpi: RASTER_DPI, sampleRecipientId };
  const pages: PdfImagePage[] = [];
  const front = await rasterizeSide(canvas.front, dims, options);
  pages.push(await canvasToPage(front));
  if (sideHasContent(canvas.back)) {
    const back = await rasterizeSide(canvas.back, dims, options);
    pages.push(await canvasToPage(back));
  }
  const pdf = buildPdfFromJpegs(pages, dims.widthInches, dims.heightInches);
  return {
    pdf,
    pages: pages.length,
    widthInches: dims.widthInches,
    heightInches: dims.heightInches,
  };
}

/**
 * Print-document helper for the review step. Runs a one-time preflight raster
 * of the front face (proving the design exports and measuring background
 * image resolution) and builds the final PDF on demand, caching the result so
 * a retried launch reuses the same bytes.
 */
export function usePrintDocument() {
  const canvas = useWizardStore((s) => s.canvas);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const layoutVariant = selectedLayout ?? FALLBACK_LAYOUT;

  const [preflight, setPreflight] = useState<PreflightRaster>(IDLE_RASTER);
  const lastRunFor = useRef<CanvasState | null>(null);
  const pdfCache = useRef<{ key: string; doc: BuiltPrintDocument } | null>(
    null,
  );

  const runPreflight = useCallback(async () => {
    setPreflight((p) => ({ ...p, status: "running", error: null }));
    try {
      const dims = getLayoutDims(layoutVariant);
      const front = await rasterizeSide(canvas.front, dims, {
        dpi: RASTER_DPI,
        sampleRecipientId: "preview",
      });
      const frontPreviewUrl = downscaleToDataUrl(front);
      const images: ImageResolutionReport[] = [];
      const sides: CanvasSideKey[] = ["front", "back"];
      for (const sideKey of sides) {
        const url = canvas[sideKey].backgroundImageUrl;
        if (!url) continue;
        const report = await checkImageResolution(url, dims);
        images.push(
          report
            ? {
                side: sideKey,
                effectiveDpi: report.effectiveDpi,
                ok: report.ok,
                width: report.width,
                height: report.height,
              }
            : {
                side: sideKey,
                effectiveDpi: null,
                ok: false,
                width: 0,
                height: 0,
              },
        );
      }
      const measured = images
        .map((i) => i.effectiveDpi)
        .filter((dpi): dpi is number => dpi !== null);
      setPreflight({
        status: "done",
        frontPreviewUrl,
        images,
        minEffectiveDpi: measured.length ? Math.min(...measured) : null,
        error: null,
      });
    } catch (error) {
      setPreflight({
        status: "error",
        frontPreviewUrl: null,
        images: [],
        minEffectiveDpi: null,
        error: messageOf(error),
      });
    }
  }, [canvas, layoutVariant]);

  useEffect(() => {
    if (lastRunFor.current === canvas) return;
    lastRunFor.current = canvas;
    pdfCache.current = null;
    void runPreflight();
  }, [canvas, runPreflight]);

  const buildPdf = useCallback(
    async (sampleRecipientId: string): Promise<BuiltPrintDocument> => {
      const key = `${layoutVariant}:${sampleRecipientId}`;
      const cached = pdfCache.current;
      if (cached && cached.key === key) return cached.doc;
      const doc = await buildPrintPdf(canvas, layoutVariant, sampleRecipientId);
      pdfCache.current = { key, doc };
      return doc;
    },
    [canvas, layoutVariant],
  );

  return {
    preflight,
    runPreflight,
    buildPdf,
    hasBackContent: sideHasContent(canvas.back),
  };
}

import type { TextBlockState } from "@/backend";
import { type LayoutDims, safeRect } from "@/lib/printSpec";
import { bandHeight, fitFontSize, measuredHeight } from "@/lib/textFit";

/** A ready-made arrangement of text blocks for the current format. */
export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  blocks: (dims: LayoutDims) => Partial<TextBlockState>[];
}

const INK = "#01080a";
const MUTED = "#575859";
const INDIGO = "#6366f1";

/** Smallest headline size a preset will fall back to before it stops shrinking. */
const MIN_HEADLINE = 11;

interface Built {
  blocks: Partial<TextBlockState>[];
  /** Lowest edge the blocks reach, in design px. */
  bottom: number;
}

/**
 * Runs `build` at successively smaller headline sizes until the whole stack
 * fits above `limit`. Every band is measured, so the returned blocks never
 * overflow their own height and never paint into the block below.
 */
function shrinkToFit(
  startBig: number,
  build: (big: number) => Built,
  limit: number,
): Partial<TextBlockState>[] {
  const start = Math.max(MIN_HEADLINE, Math.floor(startBig));
  for (let big = start; big > MIN_HEADLINE; big -= 1) {
    const built = build(big);
    if (built.bottom <= limit) return built.blocks;
  }
  return build(MIN_HEADLINE).blocks;
}

/** Headline size the format suggests before any fitting. */
function baseSize(dims: LayoutDims, divisor: number): number {
  return Math.round(Math.min(dims.designWidth, dims.designHeight) / divisor);
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "hero",
    name: "Hero headline",
    description: "Big headline, supporting line and a call to action.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const w = Math.round(safe.w * 0.7);
      const headline = "Your big idea, delivered";
      const support =
        "One line that explains the offer and why it matters right now.";
      const cta = "Call 555-0142 · ezmailout.com/offer";
      return shrinkToFit(
        baseSize(dims, 9),
        (big) => {
          // The headline is capped at two lines, and its band is budgeted for
          // exactly those two lines, so it can never bleed into the support.
          const headSize = fitFontSize(headline, {
            width: w,
            maxLines: 2,
            startSize: big,
            minSize: MIN_HEADLINE,
            fontWeight: 800,
          });
          const headH = bandHeight(2, { fontSize: headSize, fontWeight: 800 });
          const gap = Math.round(headSize * 0.35);
          const bodySize = Math.max(9, Math.round(headSize * 0.5));
          const supportH = measuredHeight(support, {
            width: w,
            fontSize: bodySize,
            fontWeight: 500,
          });
          const ctaH = measuredHeight(cta, {
            width: w,
            fontSize: bodySize,
            fontWeight: 700,
          });
          const headY = safe.y + 16;
          const supportY = headY + headH + gap;
          // Sits on the safe-zone floor unless the stack above needs the room.
          const ctaY = Math.max(
            supportY + supportH + gap,
            safe.y + safe.h - ctaH,
          );
          return {
            bottom: ctaY + ctaH,
            blocks: [
              {
                text: headline,
                x: safe.x + 16,
                y: headY,
                width: w,
                height: headH,
                fontSize: headSize,
                fontWeight: 800n,
                color: INK,
              },
              {
                text: support,
                x: safe.x + 16,
                y: supportY,
                width: w,
                height: supportH,
                fontSize: bodySize,
                fontWeight: 500n,
                color: MUTED,
              },
              {
                text: cta,
                x: safe.x + 16,
                y: ctaY,
                width: w,
                height: ctaH,
                fontSize: bodySize,
                fontWeight: 700n,
                color: INDIGO,
              },
            ],
          };
        },
        safe.y + safe.h,
      );
    },
  },
  {
    id: "split",
    name: "Split offer",
    description: "Headline left, price and details on the right.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const half = Math.round(safe.w * 0.46);
      const headline = "Spring special";
      const price = "$99";
      const detail =
        "Includes inspection, tune-up and a written report. Book before the 30th.";
      return shrinkToFit(
        baseSize(dims, 10),
        (big) => {
          const headSize = fitFontSize(headline, {
            width: half,
            maxLines: 2,
            startSize: big,
            minSize: MIN_HEADLINE,
            fontWeight: 800,
          });
          const headH = bandHeight(2, { fontSize: headSize, fontWeight: 800 });
          const priceSize = fitFontSize(price, {
            width: half,
            maxLines: 1,
            startSize: Math.round(headSize * 1.8),
            minSize: MIN_HEADLINE,
            fontWeight: 800,
          });
          const priceH = bandHeight(1, { fontSize: priceSize, fontWeight: 800 });
          const detailSize = Math.max(9, Math.round(headSize * 0.45));
          const detailH = measuredHeight(detail, {
            width: half,
            fontSize: detailSize,
            fontWeight: 500,
          });
          const top = safe.y + 12;
          const detailY = top + priceH + Math.round(headSize * 0.25);
          return {
            bottom: Math.max(top + headH, detailY + detailH),
            blocks: [
              {
                text: headline,
                x: safe.x + 12,
                y: top,
                width: half,
                height: headH,
                fontSize: headSize,
                fontWeight: 800n,
                color: INK,
              },
              {
                text: price,
                x: safe.x + safe.w - half - 12,
                y: top,
                width: half,
                height: priceH,
                fontSize: priceSize,
                fontWeight: 800n,
                color: INDIGO,
                align: "right",
              },
              {
                text: detail,
                x: safe.x + safe.w - half - 12,
                y: detailY,
                width: half,
                height: detailH,
                fontSize: detailSize,
                fontWeight: 500n,
                color: MUTED,
                align: "right",
              },
            ],
          };
        },
        safe.y + safe.h,
      );
    },
  },
  {
    id: "photo",
    name: "Photo + caption",
    description: "Leaves the top two-thirds for artwork; caption band below.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const w = Math.round(safe.w * 0.9);
      const headline = "Now open in your neighbourhood";
      const caption = "Show this card for 20% off your first visit.";
      return shrinkToFit(
        baseSize(dims, 11),
        (big) => {
          const headSize = fitFontSize(headline, {
            width: w,
            maxLines: 2,
            startSize: big,
            minSize: MIN_HEADLINE,
            fontWeight: 800,
          });
          const headH = bandHeight(2, { fontSize: headSize, fontWeight: 800 });
          const capSize = Math.max(9, Math.round(headSize * 0.55));
          const capH = measuredHeight(caption, {
            width: w,
            fontSize: capSize,
            fontWeight: 500,
          });
          const gap = Math.round(headSize * 0.25);
          // Anchored to the caption band so artwork keeps the space above it.
          const headY = Math.min(
            safe.y + Math.round(safe.h * 0.68),
            safe.y + safe.h - headH - gap - capH,
          );
          const capY = headY + headH + gap;
          return {
            bottom: capY + capH,
            blocks: [
              {
                text: headline,
                x: safe.x + 12,
                y: headY,
                width: w,
                height: headH,
                fontSize: headSize,
                fontWeight: 800n,
                color: INK,
              },
              {
                text: caption,
                x: safe.x + 12,
                y: capY,
                width: w,
                height: capH,
                fontSize: capSize,
                fontWeight: 500n,
                color: MUTED,
              },
            ],
          };
        },
        safe.y + safe.h,
      );
    },
  },
  {
    id: "event",
    name: "Event card",
    description: "Date block, title and venue details, centred.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const w = Math.round(safe.w * 0.8);
      const x = safe.x + Math.round((safe.w - w) / 2);
      const date = "SATURDAY · JUNE 14";
      const title = "Community open house";
      const venue = "10am–4pm · 120 Harbor View Dr · Free admission";
      return shrinkToFit(
        baseSize(dims, 10),
        (big) => {
          const titleSize = fitFontSize(title, {
            width: w,
            maxLines: 2,
            startSize: big,
            minSize: MIN_HEADLINE,
            fontWeight: 800,
          });
          const titleH = bandHeight(2, { fontSize: titleSize, fontWeight: 800 });
          const dateSize = Math.max(9, Math.round(titleSize * 0.5));
          const dateH = measuredHeight(date, {
            width: w,
            fontSize: dateSize,
            fontWeight: 700,
          });
          const venueSize = Math.max(9, Math.round(titleSize * 0.45));
          const venueH = measuredHeight(venue, {
            width: w,
            fontSize: venueSize,
            fontWeight: 500,
          });
          const gap = Math.round(titleSize * 0.2);
          const dateY = safe.y + 16;
          const titleY = dateY + dateH + gap;
          const venueY = titleY + titleH + gap;
          return {
            bottom: venueY + venueH,
            blocks: [
              {
                text: date,
                x,
                y: dateY,
                width: w,
                height: dateH,
                fontSize: dateSize,
                fontWeight: 700n,
                color: INDIGO,
                align: "center",
              },
              {
                text: title,
                x,
                y: titleY,
                width: w,
                height: titleH,
                fontSize: titleSize,
                fontWeight: 800n,
                color: INK,
                align: "center",
              },
              {
                text: venue,
                x,
                y: venueY,
                width: w,
                height: venueH,
                fontSize: venueSize,
                fontWeight: 500n,
                color: MUTED,
                align: "center",
              },
            ],
          };
        },
        safe.y + safe.h,
      );
    },
  },
];

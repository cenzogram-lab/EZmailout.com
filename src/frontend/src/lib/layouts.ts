import type { TextBlockState } from "@/backend";
import { type LayoutDims, safeRect } from "@/lib/printSpec";

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

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "hero",
    name: "Hero headline",
    description: "Big headline, supporting line and a call to action.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const w = Math.round(safe.w * 0.7);
      const big = Math.round(Math.min(dims.designWidth, dims.designHeight) / 9);
      return [
        {
          text: "Your big idea, delivered",
          x: safe.x + 16,
          y: safe.y + 16,
          width: w,
          height: big * 2.6,
          fontSize: big,
          fontWeight: 800n,
          color: INK,
        },
        {
          text: "One line that explains the offer and why it matters right now.",
          x: safe.x + 16,
          y: safe.y + 16 + big * 2.8,
          width: w,
          height: Math.round(big * 1.6),
          fontSize: Math.round(big * 0.5),
          fontWeight: 500n,
          color: MUTED,
        },
        {
          text: "Call 555-0142 · ezmailout.com/offer",
          x: safe.x + 16,
          y: safe.y + safe.h - Math.round(big * 1.2),
          width: w,
          height: Math.round(big * 1.1),
          fontSize: Math.round(big * 0.5),
          fontWeight: 700n,
          color: INDIGO,
        },
      ];
    },
  },
  {
    id: "split",
    name: "Split offer",
    description: "Headline left, price and details on the right.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const half = Math.round(safe.w * 0.46);
      const big = Math.round(
        Math.min(dims.designWidth, dims.designHeight) / 10,
      );
      return [
        {
          text: "Spring special",
          x: safe.x + 12,
          y: safe.y + 12,
          width: half,
          height: big * 2.6,
          fontSize: big,
          fontWeight: 800n,
          color: INK,
        },
        {
          text: "$99",
          x: safe.x + safe.w - half - 12,
          y: safe.y + 12,
          width: half,
          height: Math.round(big * 2.2),
          fontSize: Math.round(big * 1.8),
          fontWeight: 800n,
          color: INDIGO,
          align: "right",
        },
        {
          text: "Includes inspection, tune-up and a written report. Book before the 30th.",
          x: safe.x + safe.w - half - 12,
          y: safe.y + 12 + Math.round(big * 2.4),
          width: half,
          height: Math.round(big * 2),
          fontSize: Math.round(big * 0.45),
          fontWeight: 500n,
          color: MUTED,
          align: "right",
        },
      ];
    },
  },
  {
    id: "photo",
    name: "Photo + caption",
    description: "Leaves the top two-thirds for artwork; caption band below.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const big = Math.round(
        Math.min(dims.designWidth, dims.designHeight) / 11,
      );
      const y = safe.y + Math.round(safe.h * 0.68);
      return [
        {
          text: "Now open in your neighbourhood",
          x: safe.x + 12,
          y,
          width: Math.round(safe.w * 0.9),
          height: Math.round(big * 1.6),
          fontSize: big,
          fontWeight: 800n,
          color: INK,
        },
        {
          text: "Show this card for 20% off your first visit.",
          x: safe.x + 12,
          y: y + Math.round(big * 1.7),
          width: Math.round(safe.w * 0.9),
          height: Math.round(big * 1.2),
          fontSize: Math.round(big * 0.55),
          fontWeight: 500n,
          color: MUTED,
        },
      ];
    },
  },
  {
    id: "event",
    name: "Event card",
    description: "Date block, title and venue details, centred.",
    blocks: (dims) => {
      const safe = safeRect(dims);
      const big = Math.round(
        Math.min(dims.designWidth, dims.designHeight) / 10,
      );
      const w = Math.round(safe.w * 0.8);
      const x = safe.x + Math.round((safe.w - w) / 2);
      return [
        {
          text: "SATURDAY · JUNE 14",
          x,
          y: safe.y + 16,
          width: w,
          height: Math.round(big * 1.1),
          fontSize: Math.round(big * 0.5),
          fontWeight: 700n,
          color: INDIGO,
          align: "center",
        },
        {
          text: "Community open house",
          x,
          y: safe.y + 16 + Math.round(big * 1.2),
          width: w,
          height: big * 2.4,
          fontSize: big,
          fontWeight: 800n,
          color: INK,
          align: "center",
        },
        {
          text: "10am–4pm · 120 Harbor View Dr · Free admission",
          x,
          y: safe.y + 16 + Math.round(big * 3.8),
          width: w,
          height: Math.round(big * 1.2),
          fontSize: Math.round(big * 0.45),
          fontWeight: 500n,
          color: MUTED,
          align: "center",
        },
      ];
    },
  },
];

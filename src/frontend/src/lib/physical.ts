import { getPricingRow } from "@/lib/pricing";

/**
 * How each Click2Mail layout behaves as a physical piece of mail.
 *
 * Keyed off `ProductSpec.layout` — the production layout Click2Mail actually
 * runs — rather than the marketing category, so a format only picks up creases,
 * perforations or a spine if the press really puts them there. Everything is
 * expressed as a fraction of the finished trim or in inches from its top-left
 * corner, so it scales with the artboard and stays true at any zoom.
 */

export type FoldAxis = "vertical" | "horizontal";

export interface Crease {
  axis: FoldAxis;
  /** Position along the sheet, 0–1 from the left (vertical) or top (horizontal). */
  at: number;
  label: string;
}

export type SheetEdge = "left" | "right" | "top" | "bottom";

/** A cut in the carrier envelope the artwork has to line up with. */
export interface WindowCut {
  label: string;
  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
}

export interface PhysicalTraits {
  /** Substrate weight — drives the proof's edge thickness and sheen. */
  stock: "card" | "paper";
  /** Short description of the finished piece, shown on the stage. */
  label: string;
  /** Creases the press scores into the sheet. */
  creases: Crease[];
  /** Edges a pressure-seal piece tears open along. */
  perforations: SheetEdge[];
  /** Bound edge of a saddle-stitched booklet. */
  spine: SheetEdge | null;
  /** Carrier-envelope window cuts the address must sit inside. */
  windows: WindowCut[];
}

/**
 * Where the #10 double-window cuts fall on the outward panel of a letter
 * C-folded into thirds. Click2Mail prints the address itself for these
 * formats, so these are alignment guides for the designer, not a print spec.
 */
const RETURN_WINDOW = {
  xInches: 0.5,
  widthInches: 3.5,
  heightInches: 0.75,
  /** Offset below the top crease of the outward panel. */
  offsetInches: 0.25,
};
const ADDRESS_WINDOW = {
  xInches: 0.875,
  widthInches: 4,
  heightInches: 1,
  offsetInches: 1.25,
};

const LETTER_FOLD: Crease[] = [
  { axis: "horizontal", at: 1 / 3, label: "Fold" },
  { axis: "horizontal", at: 2 / 3, label: "Fold" },
];
const TRIFOLD: Crease[] = [
  { axis: "vertical", at: 1 / 3, label: "Fold" },
  { axis: "vertical", at: 2 / 3, label: "Fold" },
];
const BIFOLD: Crease[] = [{ axis: "vertical", at: 0.5, label: "Fold" }];
const HALF_FOLD: Crease[] = [{ axis: "horizontal", at: 0.5, label: "Fold" }];

const FLAT: PhysicalTraits = {
  stock: "card",
  label: "Flat card",
  creases: [],
  perforations: [],
  spine: null,
  windows: [],
};

/** Window cuts for a sheet folded in thirds, measured from the sheet top. */
function tenWindows(heightInches: number): WindowCut[] {
  const panelTop = heightInches / 3;
  return [
    {
      label: "Return window",
      xInches: RETURN_WINDOW.xInches,
      yInches: panelTop + RETURN_WINDOW.offsetInches,
      widthInches: RETURN_WINDOW.widthInches,
      heightInches: RETURN_WINDOW.heightInches,
    },
    {
      label: "#10 address window",
      xInches: ADDRESS_WINDOW.xInches,
      yInches: panelTop + ADDRESS_WINDOW.offsetInches,
      widthInches: ADDRESS_WINDOW.widthInches,
      heightInches: ADDRESS_WINDOW.heightInches,
    },
  ];
}

/** Physical behaviour of the finished piece for a layout variant. */
export function physicalTraitsFor(layoutVariant: string): PhysicalTraits {
  const row = getPricingRow(layoutVariant);
  if (!row) return FLAT;
  const enveloped = Boolean(row.envelope);
  switch (row.layout) {
    case "Double Sided Postcard":
      return {
        ...FLAT,
        label: "Flat card · heavy stock",
      };
    case "Flat Notecard":
      return { ...FLAT, label: "Flat notecard · heavy stock" };
    case "Business Reply Postcard":
      return { ...FLAT, label: "Reply card · heavy stock" };
    case "Folded Notecard":
      return {
        stock: "card",
        label: "Folded notecard · scored at the bound edge",
        creases: [],
        perforations: [],
        // The artboard is the finished 4.25 x 5.5 face, not the flat spread,
        // so the score sits on the bound edge rather than across the panel.
        spine: "left",
        windows: [],
      };
    case "Address on Separate Page":
      return {
        stock: "paper",
        label: enveloped
          ? "Letter · folded into a #10 double-window envelope"
          : "Letter · inserted into an envelope",
        creases: LETTER_FOLD,
        perforations: [],
        spine: null,
        windows: enveloped ? tenWindows(row.heightInches) : [],
      };
    case "Certified Self Mailer":
      return {
        stock: "paper",
        label: "Certified self-mailer · folded and sealed",
        creases: HALF_FOLD,
        perforations: [],
        spine: null,
        windows: [],
      };
    case "EDDM Self Mailer":
      return {
        stock: "paper",
        label: "EDDM® self-mailer · folded and tabbed",
        creases: HALF_FOLD,
        perforations: [],
        spine: null,
        windows: [],
      };
    case "Unfolded Flyer":
      return {
        stock: "paper",
        label: "Flyer · bifold, 2 panels",
        creases: BIFOLD,
        perforations: [],
        spine: null,
        windows: [],
      };
    case "Trifold Self-Mailer":
      return {
        stock: "paper",
        label: "Brochure · trifold, 3 panels",
        creases: TRIFOLD,
        perforations: [],
        spine: null,
        windows: [],
      };
    case "Pressure Seal Snap Pack":
      return {
        stock: "paper",
        label: "Snap pack · pressure sealed, tears on three edges",
        creases: LETTER_FOLD,
        perforations: ["left", "right", "bottom"],
        spine: null,
        windows: [],
      };
    case "Saddle Stitched Booklet":
    case "Address on Front Page":
    case "Address on Back Page":
      return {
        stock: "paper",
        label: "Booklet · saddle stitched on the left edge",
        creases: [],
        perforations: [],
        spine: "left",
        windows: [],
      };
    default:
      return FLAT;
  }
}

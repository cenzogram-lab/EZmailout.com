import type {
  CanvasSide,
  CanvasState,
  LogoState,
  ProductSelection,
  QrCodeState,
  ReturnAddress,
  TextBlockState,
  VerifiedAddress,
} from "@/backend";
import {
  canvasFromTemplate,
  emptyCanvasState,
  getSide,
  makeLogo,
  makeQrCode,
  makeTextBlock,
  rotateCanvasState,
  withSide,
} from "@/lib/canvas";
import type { CatalogMailClass } from "@/lib/pricing";
import { getPricingRow } from "@/lib/pricing";
import { canvasDims, getLayoutDims, orientationOf } from "@/lib/printSpec";
import type {
  CanvasAlignment,
  CanvasSideKey,
  DesignTemplate,
  MapTarget,
  WizardAudienceType,
} from "@/types";
import { create } from "zustand";

const DEFAULT_LAYOUT = "6x9";

/**
 * Snapshot of the chosen Click2Mail document class, taken when the format is
 * picked so the rest of the wizard and the invoice work from one source.
 */
export interface SelectedSpec {
  layoutVariant: string;
  documentClass: string;
  widthInches: number;
  heightInches: number;
  unitPriceCents: number;
  mailClass: CatalogMailClass;
  supportedMailClasses: CatalogMailClass[];
}

interface WizardData {
  currentStep: number;
  campaignName: string;
  selectedProduct: ProductSelection | null;
  selectedLayout: string | null;
  /** Persisted document class, trim size, unit price and mail class. */
  selectedSpec: SelectedSpec | null;
  audienceType: WizardAudienceType | null;
  verifiedAddresses: VerifiedAddress[];
  recipientCount: number;
  geoTarget: MapTarget | null;
  sourcePresetId: string | null;
  designTemplate: DesignTemplate | null;
  canvas: CanvasState;
  /**
   * The canvas as it was before the last turn, paired with the canvas that
   * turn produced. Turning back while the canvas is still that exact object
   * (nothing edited since) restores the original instead of re-laying it, so
   * elements the turn had to shrink come back at full size.
   */
  rotationUndo: { rotated: CanvasState; original: CanvasState } | null;
  activeSide: CanvasSideKey;
  selectedElementId: string | null;
  qrDestinationUrl: string;
  returnAddress: ReturnAddress | null;
  campaignId: string | null;
  paymentIntentId: string | null;
}

interface WizardActions {
  setStep: (step: number) => void;
  setCurrentStep: (step: number) => void;
  setCampaignName: (name: string) => void;
  setProduct: (product: ProductSelection) => void;
  setLayout: (layoutVariant: string) => void;
  /** Switches the USPS mail class (only classes the product supports apply). */
  setMailClass: (mailClass: CatalogMailClass) => void;
  setAudienceType: (type: WizardAudienceType) => void;
  setVerifiedAddresses: (addresses: VerifiedAddress[]) => void;
  setRecipientCount: (count: number) => void;
  setGeoTarget: (target: MapTarget | null) => void;
  setSourcePresetId: (id: string | null) => void;
  setDesignTemplate: (template: DesignTemplate | null) => void;
  setCanvas: (canvas: CanvasState) => void;
  /**
   * Turns the artboard between the product's own orientation and the
   * rotated one (width ↔ height), re-laying both sides for the new frame.
   */
  rotateCanvas: () => void;
  setActiveSide: (side: CanvasSideKey) => void;
  setSelectedElementId: (id: string | null) => void;
  updateSide: (side: CanvasSideKey, patch: Partial<CanvasSide>) => void;
  addTextBlock: (
    side: CanvasSideKey,
    partial?: Partial<TextBlockState>,
  ) => string;
  updateTextBlock: (
    side: CanvasSideKey,
    id: string,
    patch: Partial<TextBlockState>,
  ) => void;
  removeTextBlock: (side: CanvasSideKey, id: string) => void;
  addLogo: (
    side: CanvasSideKey,
    url: string,
    partial?: Partial<LogoState>,
  ) => string;
  updateLogo: (
    side: CanvasSideKey,
    id: string,
    patch: Partial<LogoState>,
  ) => void;
  removeLogo: (side: CanvasSideKey, id: string) => void;
  addQrCode: (side: CanvasSideKey, partial?: Partial<QrCodeState>) => string;
  updateQrCode: (
    side: CanvasSideKey,
    id: string,
    patch: Partial<QrCodeState>,
  ) => void;
  removeQrCode: (side: CanvasSideKey, id: string) => void;
  setBackgroundImage: (side: CanvasSideKey, url: string | null) => void;
  setBackgroundColor: (side: CanvasSideKey, color: string) => void;
  bringToFront: (side: CanvasSideKey, id: string) => void;
  sendToBack: (side: CanvasSideKey, id: string) => void;
  bringForward: (side: CanvasSideKey, id: string) => void;
  sendBackward: (side: CanvasSideKey, id: string) => void;
  /** Aligns an element to the canvas (left/center/right/top/middle/bottom). */
  alignElement: (
    side: CanvasSideKey,
    id: string,
    alignment: CanvasAlignment,
  ) => void;
  duplicateElement: (side: CanvasSideKey, id: string) => string | null;
  removeElement: (side: CanvasSideKey, id: string) => void;
  setQrDestinationUrl: (url: string) => void;
  setReturnAddress: (address: ReturnAddress | null) => void;
  setCampaignId: (id: string | null) => void;
  setPaymentIntentId: (id: string | null) => void;
  reset: () => void;
}

export type WizardStore = WizardData & WizardActions;

function initialData(): WizardData {
  return {
    currentStep: 1,
    campaignName: "",
    selectedProduct: null,
    selectedLayout: null,
    selectedSpec: null,
    audienceType: null,
    verifiedAddresses: [],
    recipientCount: 0,
    geoTarget: null,
    sourcePresetId: null,
    designTemplate: null,
    canvas: emptyCanvasState(DEFAULT_LAYOUT),
    rotationUndo: null,
    activeSide: "front",
    selectedElementId: null,
    qrDestinationUrl: "",
    returnAddress: null,
    campaignId: null,
    paymentIntentId: null,
  };
}

function maxZ(side: CanvasSide): bigint {
  let max = 0n;
  for (const t of side.textBlocks) if (t.zIndex > max) max = t.zIndex;
  for (const l of side.logos) if (l.zIndex > max) max = l.zIndex;
  for (const q of side.qrCodes) if (q.zIndex > max) max = q.zIndex;
  return max;
}

interface ElementGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  z: bigint;
}

function geometryOf(side: CanvasSide, id: string): ElementGeometry | null {
  const t = side.textBlocks.find((b) => b.id === id);
  if (t)
    return { x: t.x, y: t.y, width: t.width, height: t.height, z: t.zIndex };
  const l = side.logos.find((b) => b.id === id);
  if (l)
    return { x: l.x, y: l.y, width: l.width, height: l.height, z: l.zIndex };
  const q = side.qrCodes.find((b) => b.id === id);
  if (q) return { x: q.x, y: q.y, width: q.size, height: q.size, z: q.zIndex };
  return null;
}

function moveTo(
  side: CanvasSide,
  id: string,
  x: number,
  y: number,
): CanvasSide {
  return {
    ...side,
    textBlocks: side.textBlocks.map((t) => (t.id === id ? { ...t, x, y } : t)),
    logos: side.logos.map((l) => (l.id === id ? { ...l, x, y } : l)),
    qrCodes: side.qrCodes.map((q) => (q.id === id ? { ...q, x, y } : q)),
  };
}

/** Every element's id and z-index on a side, sorted by paint order. */
function zOrder(side: CanvasSide): { id: string; z: bigint }[] {
  return [
    ...side.textBlocks.map((t) => ({ id: t.id, z: t.zIndex })),
    ...side.logos.map((l) => ({ id: l.id, z: l.zIndex })),
    ...side.qrCodes.map((q) => ({ id: q.id, z: q.zIndex })),
  ].sort((a, b) => (a.z < b.z ? -1 : a.z > b.z ? 1 : 0));
}

/** Swaps the z-index of `id` with its neighbour above (`+1`) or below (`-1`). */
function stepZ(side: CanvasSide, id: string, direction: 1 | -1): CanvasSide {
  const order = zOrder(side);
  const index = order.findIndex((e) => e.id === id);
  const neighbour = order[index + direction];
  if (index < 0 || !neighbour) return side;
  const current = order[index];
  // Identical z-indices (e.g. templates) would swap into a no-op, so spread them.
  const lower = direction === 1 ? current : neighbour;
  const upper = direction === 1 ? neighbour : current;
  const base = lower.z;
  const swapped = reindex(reindex(side, upper.id, base), lower.id, base + 1n);
  return swapped;
}

function reindex(side: CanvasSide, id: string, z: bigint): CanvasSide {
  return {
    ...side,
    textBlocks: side.textBlocks.map((t) =>
      t.id === id ? { ...t, zIndex: z } : t,
    ),
    logos: side.logos.map((l) => (l.id === id ? { ...l, zIndex: z } : l)),
    qrCodes: side.qrCodes.map((q) => (q.id === id ? { ...q, zIndex: z } : q)),
  };
}

export const useWizardStore = create<WizardStore>()((set, get) => ({
  ...initialData(),

  setStep: (step) => set({ currentStep: step }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setCampaignName: (campaignName) => set({ campaignName }),
  setProduct: (selectedProduct) => set({ selectedProduct }),
  setLayout: (layoutVariant) =>
    set((s) => {
      const row = getPricingRow(layoutVariant);
      return {
        selectedLayout: layoutVariant,
        selectedSpec: row
          ? {
              layoutVariant: row.id,
              documentClass: row.documentClass,
              widthInches: row.widthInches,
              heightInches: row.heightInches,
              unitPriceCents: row.retailPriceCents,
              mailClass: row.defaultMailClass,
              supportedMailClasses: row.supportedMailClasses,
            }
          : null,
        canvas:
          s.selectedLayout === layoutVariant
            ? s.canvas
            : emptyCanvasState(layoutVariant),
        rotationUndo:
          s.selectedLayout === layoutVariant ? s.rotationUndo : null,
        selectedElementId: null,
      };
    }),
  setMailClass: (mailClass) =>
    set((s) =>
      s.selectedSpec?.supportedMailClasses.includes(mailClass)
        ? { selectedSpec: { ...s.selectedSpec, mailClass } }
        : {},
    ),
  setAudienceType: (audienceType) => set({ audienceType }),
  setVerifiedAddresses: (verifiedAddresses) => set({ verifiedAddresses }),
  setRecipientCount: (recipientCount) => set({ recipientCount }),
  setGeoTarget: (geoTarget) => set({ geoTarget }),
  setSourcePresetId: (sourcePresetId) => set({ sourcePresetId }),
  setDesignTemplate: (template) =>
    set((s) => ({
      designTemplate: template,
      canvas: template
        ? canvasFromTemplate(
            template,
            s.selectedLayout ?? template.layoutVariant,
            orientationOf(s.canvas, s.selectedLayout ?? template.layoutVariant),
          )
        : s.canvas,
      rotationUndo: template ? null : s.rotationUndo,
      selectedElementId: null,
    })),
  setCanvas: (canvas) => set({ canvas }),
  rotateCanvas: () =>
    set((s) => {
      if (s.rotationUndo?.rotated === s.canvas) {
        return { canvas: s.rotationUndo.original, rotationUndo: null };
      }
      const layout = s.selectedLayout ?? DEFAULT_LAYOUT;
      const from = canvasDims(s.canvas, layout);
      const to = getLayoutDims(layout, from.rotated ? "native" : "rotated");
      if (
        to.widthInches === from.widthInches &&
        to.heightInches === from.heightInches
      ) {
        return {};
      }
      const rotated = rotateCanvasState(s.canvas, from, to);
      return {
        canvas: rotated,
        rotationUndo: { rotated, original: s.canvas },
      };
    }),
  setActiveSide: (activeSide) => set({ activeSide, selectedElementId: null }),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
  updateSide: (sideKey, patch) =>
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...getSide(s.canvas, sideKey),
        ...patch,
      }),
    })),

  addTextBlock: (sideKey, partial) => {
    const side = getSide(get().canvas, sideKey);
    const block = makeTextBlock(side, partial);
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...side,
        textBlocks: [...side.textBlocks, block],
      }),
      selectedElementId: block.id,
    }));
    return block.id;
  },
  updateTextBlock: (sideKey, id, patch) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          textBlocks: side.textBlocks.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        }),
      };
    }),
  removeTextBlock: (sideKey, id) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          textBlocks: side.textBlocks.filter((t) => t.id !== id),
        }),
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    }),

  addLogo: (sideKey, url, partial) => {
    const side = getSide(get().canvas, sideKey);
    const logo = makeLogo(side, url, partial);
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...side,
        logos: [...side.logos, logo],
      }),
      selectedElementId: logo.id,
    }));
    return logo.id;
  },
  updateLogo: (sideKey, id, patch) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          logos: side.logos.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
      };
    }),
  removeLogo: (sideKey, id) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          logos: side.logos.filter((l) => l.id !== id),
        }),
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    }),

  addQrCode: (sideKey, partial) => {
    const side = getSide(get().canvas, sideKey);
    const qr = makeQrCode(side, partial);
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...side,
        qrCodes: [...side.qrCodes, qr],
      }),
      selectedElementId: qr.id,
    }));
    return qr.id;
  },
  updateQrCode: (sideKey, id, patch) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          qrCodes: side.qrCodes.map((q) =>
            q.id === id ? { ...q, ...patch } : q,
          ),
        }),
      };
    }),
  removeQrCode: (sideKey, id) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, {
          ...side,
          qrCodes: side.qrCodes.filter((q) => q.id !== id),
        }),
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    }),

  setBackgroundImage: (sideKey, url) =>
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...getSide(s.canvas, sideKey),
        backgroundImageUrl: url ?? undefined,
      }),
    })),
  setBackgroundColor: (sideKey, color) =>
    set((s) => ({
      canvas: withSide(s.canvas, sideKey, {
        ...getSide(s.canvas, sideKey),
        backgroundColor: color,
      }),
    })),
  bringToFront: (sideKey, id) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      return {
        canvas: withSide(s.canvas, sideKey, reindex(side, id, maxZ(side) + 1n)),
      };
    }),
  sendToBack: (sideKey, id) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      // Shift everyone up by one, then put the target at 1.
      const shifted: CanvasSide = {
        ...side,
        textBlocks: side.textBlocks.map((t) => ({
          ...t,
          zIndex: t.zIndex + 1n,
        })),
        logos: side.logos.map((l) => ({ ...l, zIndex: l.zIndex + 1n })),
        qrCodes: side.qrCodes.map((q) => ({ ...q, zIndex: q.zIndex + 1n })),
      };
      return { canvas: withSide(s.canvas, sideKey, reindex(shifted, id, 1n)) };
    }),
  bringForward: (sideKey, id) =>
    set((s) => ({
      canvas: withSide(
        s.canvas,
        sideKey,
        stepZ(getSide(s.canvas, sideKey), id, 1),
      ),
    })),
  sendBackward: (sideKey, id) =>
    set((s) => ({
      canvas: withSide(
        s.canvas,
        sideKey,
        stepZ(getSide(s.canvas, sideKey), id, -1),
      ),
    })),
  alignElement: (sideKey, id, alignment) =>
    set((s) => {
      const side = getSide(s.canvas, sideKey);
      const geo = geometryOf(side, id);
      if (!geo) return {};
      const dims = canvasDims(s.canvas, s.selectedLayout ?? DEFAULT_LAYOUT);
      let { x, y } = geo;
      switch (alignment) {
        case "left":
          x = 0;
          break;
        case "center":
          x = (dims.designWidth - geo.width) / 2;
          break;
        case "right":
          x = dims.designWidth - geo.width;
          break;
        case "top":
          y = 0;
          break;
        case "middle":
          y = (dims.designHeight - geo.height) / 2;
          break;
        case "bottom":
          y = dims.designHeight - geo.height;
          break;
      }
      return {
        canvas: withSide(
          s.canvas,
          sideKey,
          moveTo(
            side,
            id,
            Math.round(Math.max(0, x)),
            Math.round(Math.max(0, y)),
          ),
        ),
      };
    }),
  duplicateElement: (sideKey, id) => {
    const side = getSide(get().canvas, sideKey);
    const offset = 24;
    const text = side.textBlocks.find((t) => t.id === id);
    if (text) {
      const { id: _id, zIndex: _z, ...rest } = text;
      return get().addTextBlock(sideKey, {
        ...rest,
        x: text.x + offset,
        y: text.y + offset,
      });
    }
    const logo = side.logos.find((l) => l.id === id);
    if (logo) {
      const { id: _id, zIndex: _z, url, ...rest } = logo;
      return get().addLogo(sideKey, url, {
        ...rest,
        x: logo.x + offset,
        y: logo.y + offset,
      });
    }
    const qr = side.qrCodes.find((q) => q.id === id);
    if (qr) {
      const { id: _id, zIndex: _z, ...rest } = qr;
      return get().addQrCode(sideKey, {
        ...rest,
        x: qr.x + offset,
        y: qr.y + offset,
      });
    }
    return null;
  },
  removeElement: (sideKey, id) => {
    const { removeTextBlock, removeLogo, removeQrCode } = get();
    removeTextBlock(sideKey, id);
    removeLogo(sideKey, id);
    removeQrCode(sideKey, id);
  },
  setQrDestinationUrl: (qrDestinationUrl) => set({ qrDestinationUrl }),
  setReturnAddress: (returnAddress) => set({ returnAddress }),
  setCampaignId: (campaignId) => set({ campaignId }),
  setPaymentIntentId: (paymentIntentId) => set({ paymentIntentId }),
  reset: () => set(initialData()),
}));

/**
 * The step a deep link such as `/wizard?step=3` may open. Steps 2–4 are sized
 * from the mail piece chosen in Step 1 (audience pricing, the artboard, the
 * invoice), so until one is chosen every deep link lands on Step 1.
 */
export function reachableWizardStep(requested: number): number {
  const step = Math.min(4, Math.max(1, Math.round(requested)));
  return step > 1 && !useWizardStore.getState().selectedLayout ? 1 : step;
}

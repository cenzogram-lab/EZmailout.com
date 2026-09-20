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
  withSide,
} from "@/lib/canvas";
import type {
  CanvasSideKey,
  DesignTemplate,
  MapTarget,
  WizardAudienceType,
} from "@/types";
import { create } from "zustand";

const DEFAULT_LAYOUT = "6x9";

interface WizardData {
  currentStep: number;
  campaignName: string;
  selectedProduct: ProductSelection | null;
  selectedLayout: string | null;
  audienceType: WizardAudienceType | null;
  verifiedAddresses: VerifiedAddress[];
  recipientCount: number;
  geoTarget: MapTarget | null;
  sourcePresetId: string | null;
  designTemplate: DesignTemplate | null;
  canvas: CanvasState;
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
  setAudienceType: (type: WizardAudienceType) => void;
  setVerifiedAddresses: (addresses: VerifiedAddress[]) => void;
  setRecipientCount: (count: number) => void;
  setGeoTarget: (target: MapTarget | null) => void;
  setSourcePresetId: (id: string | null) => void;
  setDesignTemplate: (template: DesignTemplate | null) => void;
  setCanvas: (canvas: CanvasState) => void;
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
    audienceType: null,
    verifiedAddresses: [],
    recipientCount: 0,
    geoTarget: null,
    sourcePresetId: null,
    designTemplate: null,
    canvas: emptyCanvasState(DEFAULT_LAYOUT),
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
    set((s) => ({
      selectedLayout: layoutVariant,
      canvas:
        s.selectedLayout === layoutVariant
          ? s.canvas
          : emptyCanvasState(layoutVariant),
      selectedElementId: null,
    })),
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
          )
        : s.canvas,
      selectedElementId: null,
    })),
  setCanvas: (canvas) => set({ canvas }),
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

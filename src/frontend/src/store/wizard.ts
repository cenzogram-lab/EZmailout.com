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
  canvasSignature,
  emptyCanvasState,
  getSide,
  makeLogo,
  makeQrCode,
  makeTextBlock,
  rotateCanvasState,
  withSide,
} from "@/lib/canvas";
import { draftStorage } from "@/lib/draftStorage";
import type { CatalogMailClass } from "@/lib/pricing";
import { getPricingRow } from "@/lib/pricing";
import {
  type Orientation,
  canvasDims,
  getLayoutDims,
  orientationOf,
} from "@/lib/printSpec";
import { isShapeUrl, reshapeForBox } from "@/lib/shapes";
import { measuredHeight } from "@/lib/textFit";
import {
  type StudioTextBlock,
  changesTextLayout,
  fontSpecOf,
} from "@/lib/textStyle";
import type {
  CanvasAlignment,
  CanvasSideKey,
  DesignTemplate,
  MapTarget,
  WizardAudienceType,
} from "@/types";
import { create } from "zustand";
import {
  type PersistStorage,
  type StorageValue,
  persist,
} from "zustand/middleware";

const DEFAULT_LAYOUT = "6x9";

/**
 * Snapshot of the chosen print document class, taken when the format is
 * picked so the rest of the wizard and the invoice work from one source.
 */
export interface SelectedSpec {
  layoutVariant: string;
  documentClass: string;
  widthInches: number;
  heightInches: number;
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
  /**
   * The mail-type library template (`src/directmail`) the canvas was built
   * from, when it was; its layers are the design, so only its identity is
   * kept.
   */
  mailTemplate: { id: string; name: string } | null;
  canvas: CanvasState;
  /**
   * The canvas as it was before the last turn, paired with the canvas that
   * turn produced. Turning back while the canvas is still that exact object
   * (nothing edited since) restores the original instead of re-laying it, so
   * elements the turn had to shrink come back at full size.
   */
  rotationUndo: {
    rotated: CanvasState;
    original: CanvasState;
    /** `templateSignature` as it was before the turn, restored with it. */
    templateSignature: string | null;
  } | null;
  /**
   * `canvasSignature` of both sides as `designTemplate` last laid them out.
   * While the canvas still matches it the template is untouched
   * ("pristine"), and turning the artboard rebuilds it natively instead of
   * re-laying it.
   */
  templateSignature: string | null;
  activeSide: CanvasSideKey;
  selectedElementId: string | null;
  qrDestinationUrl: string;
  returnAddress: ReturnAddress | null;
  /** The campaign the last launch created (not persisted). */
  campaignId: string | null;
  /**
   * `launchOrderKey` of the order `campaignId` was created for. A launch
   * reuses the campaign only while it is unpaid and the order still matches;
   * anything else (another product, audience, return address…) is a new
   * campaign, so a design can never be uploaded onto someone else's order.
   */
  campaignOrderKey: string | null;
  /**
   * What the canister priced `campaignId` at (`createCampaign`'s unit price
   * and total): checkout charges this, so Step 4 shows it, and a launch
   * reuses the campaign only while today's price is the same.
   */
  campaignPrice: { unitCents: number; totalCents: number } | null;
  /** True once `campaignId` is paid: no later launch may reuse it. */
  campaignPaid: boolean;
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
  /**
   * Lays `template` out on the current format, both sides. `orientation`
   * defaults to the canvas's current one.
   */
  setDesignTemplate: (
    template: DesignTemplate | null,
    orientation?: Orientation,
  ) => void;
  /**
   * Puts a converted mail-type template on the artboard: `canvas` holds
   * both sides, laid out for the current format.
   */
  applyMailTemplate: (
    template: { id: string; name: string },
    canvas: CanvasState,
  ) => void;
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
    patch: Partial<StudioTextBlock>,
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
  /** Records the campaign a launch created, its order and its price. */
  setLaunchedCampaign: (
    id: string,
    orderKey: string,
    price: { unitCents: number; totalCents: number },
  ) => void;
  /** Marks the launched campaign paid, so no later launch reuses it. */
  markCampaignPaid: () => void;
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
    mailTemplate: null,
    canvas: emptyCanvasState(DEFAULT_LAYOUT),
    rotationUndo: null,
    templateSignature: null,
    activeSide: "front",
    selectedElementId: null,
    qrDestinationUrl: "",
    returnAddress: null,
    campaignId: null,
    campaignOrderKey: null,
    campaignPrice: null,
    campaignPaid: false,
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

/**
 * True while both sides are exactly what `designTemplate` laid out: no
 * element added, moved, restyled or removed since, in the current
 * orientation.
 */
export function isTemplatePristine(
  s: Pick<WizardData, "designTemplate" | "templateSignature" | "canvas">,
): boolean {
  return (
    s.designTemplate !== null &&
    s.templateSignature !== null &&
    s.templateSignature === canvasSignature(s.canvas)
  );
}

/** Height (design px) that holds a text block's words without overflow. */
function fittedHeight(block: TextBlockState): number {
  return Math.ceil(
    measuredHeight(block.text || " ", {
      ...fontSpecOf(block),
      width: block.width,
    }),
  );
}

/**
 * Bumped by every template choice and format change. A library template is
 * converted asynchronously; `claimTemplateApply` lets it land only if nothing
 * else was chosen meanwhile, so a slow conversion can never replace a design
 * picked after it or one laid out for another format.
 */
let templateApplySeq = 0;

/** Starts applying a template; the check says whether it may still land. */
export function claimTemplateApply(): () => boolean {
  const seq = ++templateApplySeq;
  return () => seq === templateApplySeq;
}

/** IndexedDB key of the saved draft. */
export const WIZARD_DRAFT_KEY = "ezmailout_wizard_draft";

/**
 * Off from a confirmed payment until `reset()`: the paid design must not come
 * back from storage and be launched (and paid for) a second time.
 */
let draftSaving = true;

// Canvas z-indexes, PPI and font weights are bigints. `main.tsx` gives
// BigInt a `toJSON` that turns them into strings before a replacer sees the
// value, so read the original from the holder (`this[key]`).
function draftReplacer(
  this: Record<string, unknown>,
  key: string,
  value: unknown,
): unknown {
  const raw = this[key];
  return typeof raw === "bigint" ? { __bigint: raw.toString() } : value;
}

function draftReviver(_key: string, value: unknown): unknown {
  return value !== null &&
    typeof value === "object" &&
    "__bigint" in value &&
    typeof (value as { __bigint: unknown }).__bigint === "string"
    ? BigInt((value as { __bigint: string }).__bigint)
    : value;
}

/**
 * Every store update asks to save the draft, and a drag updates the store
 * on every pointer move; serialising a design that holds multi-MB image data
 * URLs that often made dragging stutter. Saves are coalesced: at most one
 * write per `DRAFT_SAVE_MS`, always of the latest state, flushed when the
 * page is hidden or closed.
 */
const DRAFT_SAVE_MS = 400;
let pendingDraft: {
  name: string;
  value: StorageValue<Partial<WizardData>>;
} | null = null;
let draftTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * The audience is saved under its own key (`<name>:addresses`), written only
 * when the list itself changes: a campaign can hold hundreds of thousands of
 * recipients, and re-serialising them with every studio edit froze the editor.
 * The draft holds `ADDRESSES_REF` in their place.
 */
const ADDRESSES_REF = { __ezAddresses: true } as const;
let savedAddresses: unknown = null;
const addressesKey = (name: string) => `${name}:addresses`;

function isAddressesRef(v: unknown): boolean {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { __ezAddresses?: unknown }).__ezAddresses === true
  );
}

function writeDraftNow(): void {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = null;
  const pending = pendingDraft;
  pendingDraft = null;
  if (!pending || !draftSaving) return;
  const state = pending.value.state;
  const addresses = state.verifiedAddresses;
  if (addresses !== savedAddresses) {
    savedAddresses = addresses;
    void draftStorage.setItem(
      addressesKey(pending.name),
      JSON.stringify(addresses ?? [], draftReplacer),
    );
  }
  void draftStorage.setItem(
    pending.name,
    JSON.stringify(
      {
        ...pending.value,
        state: { ...state, verifiedAddresses: ADDRESSES_REF },
      },
      draftReplacer,
    ),
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", writeDraftNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") writeDraftNow();
  });
}

const draftJson: PersistStorage<Partial<WizardData>> = {
  getItem: async (name) => {
    const raw = await draftStorage.getItem(name);
    if (!raw) return null;
    const value = JSON.parse(raw, draftReviver) as StorageValue<
      Partial<WizardData>
    >;
    // Drafts saved before the audience had its own key hold it inline.
    if (isAddressesRef(value.state.verifiedAddresses)) {
      const list = await draftStorage.getItem(addressesKey(name));
      const addresses = list
        ? (JSON.parse(list, draftReviver) as WizardData["verifiedAddresses"])
        : [];
      // Already stored as it is: the next save need not write it again.
      savedAddresses = addresses;
      value.state = { ...value.state, verifiedAddresses: addresses };
    }
    return value;
  },
  setItem: (name, value) => {
    if (!draftSaving) return;
    pendingDraft = { name, value };
    draftTimer ??= setTimeout(writeDraftNow, DRAFT_SAVE_MS);
  },
  removeItem: (name) => {
    pendingDraft = null;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = null;
    savedAddresses = null;
    void draftStorage.removeItem(addressesKey(name));
    return draftStorage.removeItem(name);
  },
};

/**
 * Set when the first render stopped waiting for the saved draft. A draft
 * read after that lands only while the customer has not started anything,
 * so a slow read can never replace work done in the meantime.
 */
let restoreGaveUp = false;

function untouched(s: WizardData): boolean {
  return (
    s.selectedLayout === null &&
    s.campaignName === "" &&
    s.verifiedAddresses.length === 0 &&
    s.designTemplate === null &&
    s.mailTemplate === null
  );
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...initialData(),

      setStep: (step) => set({ currentStep: step }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setCampaignName: (campaignName) => set({ campaignName }),
      setProduct: (selectedProduct) => set({ selectedProduct }),
      setLayout: (layoutVariant) =>
        set((s) => {
          // A conversion still running for the old format must not land.
          if (s.selectedLayout !== layoutVariant) templateApplySeq++;
          const row = getPricingRow(layoutVariant);
          return {
            selectedLayout: layoutVariant,
            selectedSpec: row
              ? {
                  layoutVariant: row.id,
                  documentClass: row.documentClass,
                  widthInches: row.widthInches,
                  heightInches: row.heightInches,
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
            templateSignature:
              s.selectedLayout === layoutVariant ? s.templateSignature : null,
            // The blank canvas no longer carries the template.
            designTemplate:
              s.selectedLayout === layoutVariant ? s.designTemplate : null,
            mailTemplate:
              s.selectedLayout === layoutVariant ? s.mailTemplate : null,
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
      setDesignTemplate: (template, orientation) =>
        set((s) => {
          // Picked after a library template that is still converting: it wins.
          templateApplySeq++;
          if (!template) {
            return {
              designTemplate: null,
              mailTemplate: null,
              templateSignature: null,
              selectedElementId: null,
            };
          }
          const layout = s.selectedLayout ?? template.layoutVariant;
          const built = canvasFromTemplate(
            template,
            layout,
            orientation ?? orientationOf(s.canvas, layout),
          );
          // A template designs both sides, so it replaces the whole canvas.
          return {
            // An unnamed campaign takes the template's name (still editable).
            campaignName: s.campaignName.trim()
              ? s.campaignName
              : template.name,
            designTemplate: template,
            mailTemplate: null,
            canvas: built,
            templateSignature: canvasSignature(built),
            rotationUndo: null,
            selectedElementId: null,
          };
        }),
      applyMailTemplate: (template, canvas) =>
        set((s) => ({
          campaignName: s.campaignName.trim() ? s.campaignName : template.name,
          designTemplate: null,
          mailTemplate: { id: template.id, name: template.name },
          canvas,
          templateSignature: canvasSignature(canvas),
          rotationUndo: null,
          selectedElementId: null,
        })),
      setCanvas: (canvas) => set({ canvas }),
      rotateCanvas: () =>
        set((s) => {
          if (s.rotationUndo?.rotated === s.canvas) {
            const original = s.rotationUndo.original;
            // A rebuilt front has new ids, so the selection may not survive.
            const selected =
              s.selectedElementId &&
              geometryOf(getSide(original, s.activeSide), s.selectedElementId)
                ? s.selectedElementId
                : null;
            return {
              canvas: original,
              templateSignature: s.rotationUndo.templateSignature,
              rotationUndo: null,
              selectedElementId: selected,
            };
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
          const relaid = rotateCanvasState(s.canvas, from, to);
          const rotationUndo = {
            original: s.canvas,
            templateSignature: s.templateSignature,
          };
          if (isTemplatePristine(s) && s.designTemplate) {
            // An untouched template is laid out again, both sides, for the
            // new frame.
            const rotated = canvasFromTemplate(
              s.designTemplate,
              layout,
              to.rotated ? "rotated" : "native",
            );
            return {
              canvas: rotated,
              templateSignature: canvasSignature(rotated),
              rotationUndo: { ...rotationUndo, rotated },
              // Every id is new.
              selectedElementId: null,
            };
          }
          return {
            canvas: relaid,
            rotationUndo: { ...rotationUndo, rotated: relaid },
          };
        }),
      setActiveSide: (activeSide) =>
        set({ activeSide, selectedElementId: null }),
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
      updateTextBlock: (sideKey, id, patch) => {
        // A box hugs its text, as in Canva: a change to the words, typeface,
        // size, weight or width re-measures its height (an explicit height, as
        // from a resize handle, is kept). Without this, longer copy or a wider
        // face ran out of the box and printed over whatever sat below it.
        const refit = patch.height === undefined && changesTextLayout(patch);
        set((s) => {
          const side = getSide(s.canvas, sideKey);
          return {
            canvas: withSide(s.canvas, sideKey, {
              ...side,
              textBlocks: side.textBlocks.map((t) => {
                if (t.id !== id) return t;
                const next = { ...t, ...patch };
                return refit ? { ...next, height: fittedHeight(next) } : next;
              }),
            }),
          };
        });
        // A face that has not loaded yet is measured with a fallback; measure
        // again once it arrives.
        const block = getSide(get().canvas, sideKey).textBlocks.find(
          (t) => t.id === id,
        );
        if (
          refit &&
          block &&
          typeof document !== "undefined" &&
          "fonts" in document
        ) {
          const face = `${Number(block.fontWeight)} 16px "${block.fontFamily}"`;
          if (!document.fonts.check(face)) {
            document.fonts
              .load(face)
              .then(() => {
                const now = getSide(get().canvas, sideKey).textBlocks.find(
                  (t) => t.id === id,
                );
                if (!now || now.fontFamily !== block.fontFamily) return;
                const height = fittedHeight(now);
                if (Math.abs(height - now.height) < 0.5) return;
                set((s) => {
                  const side = getSide(s.canvas, sideKey);
                  return {
                    canvas: withSide(s.canvas, sideKey, {
                      ...side,
                      textBlocks: side.textBlocks.map((t) =>
                        t.id === id ? { ...t, height } : t,
                      ),
                    }),
                  };
                });
              })
              .catch(() => {});
          }
        }
      },
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
              logos: side.logos.map((l) => {
                if (l.id !== id) return l;
                const next = { ...l, ...patch };
                // A resized pill or rounded rectangle is redrawn for its new
                // aspect, so its corners stay round instead of stretching.
                if (
                  (patch.width !== undefined || patch.height !== undefined) &&
                  patch.url === undefined &&
                  isShapeUrl(next.url)
                ) {
                  next.url = reshapeForBox(next.url, next.width, next.height);
                }
                return next;
              }),
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
            canvas: withSide(
              s.canvas,
              sideKey,
              reindex(side, id, maxZ(side) + 1n),
            ),
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
          return {
            canvas: withSide(s.canvas, sideKey, reindex(shifted, id, 1n)),
          };
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
      setLaunchedCampaign: (campaignId, campaignOrderKey, campaignPrice) => {
        // A new order is in progress: its design is saved again.
        draftSaving = true;
        set({
          campaignId,
          campaignOrderKey,
          campaignPrice,
          campaignPaid: false,
        });
      },
      markCampaignPaid: () => set({ campaignPaid: true }),
      setPaymentIntentId: (paymentIntentId) => set({ paymentIntentId }),
      reset: () => {
        draftSaving = true;
        set(initialData());
      },
    }),
    {
      // Restored by `restoreWizardDraft()` before the first render, so a
      // late read can never overwrite what the customer has started.
      skipHydration: true,
      // The design in progress survives a reload or a closed tab: product,
      // audience, both sides of the canvas, the QR destination and the
      // return address. Selection, undo for a turn and the launch ids are
      // left out: a reloaded Step 4 starts its launch from the top.
      name: WIZARD_DRAFT_KEY,
      version: 1,
      storage: draftJson,
      merge: (persisted, current) =>
        restoreGaveUp && !untouched(current)
          ? current
          : { ...current, ...(persisted as Partial<WizardData>) },
      partialize: (s): Partial<WizardData> => ({
        currentStep: s.currentStep,
        campaignName: s.campaignName,
        selectedProduct: s.selectedProduct,
        selectedLayout: s.selectedLayout,
        selectedSpec: s.selectedSpec,
        audienceType: s.audienceType,
        verifiedAddresses: s.verifiedAddresses,
        recipientCount: s.recipientCount,
        geoTarget: s.geoTarget,
        sourcePresetId: s.sourcePresetId,
        designTemplate: s.designTemplate,
        mailTemplate: s.mailTemplate,
        canvas: s.canvas,
        templateSignature: s.templateSignature,
        activeSide: s.activeSide,
        qrDestinationUrl: s.qrDestinationUrl,
        returnAddress: s.returnAddress,
      }),
    },
  ),
);

/**
 * Loads the saved draft into the store. `main.tsx` waits for it (at most
 * 1.5 s, so a stuck IndexedDB never holds the app back) before rendering.
 */
export function restoreWizardDraft(): Promise<void> {
  return Promise.race([
    Promise.resolve(useWizardStore.persist.rehydrate()).catch(() => {}),
    new Promise<void>((r) =>
      setTimeout(() => {
        // Rendering goes ahead without it; see `restoreGaveUp`.
        restoreGaveUp = true;
        r();
      }, 1500),
    ),
  ]).then(() => undefined);
}

/**
 * Forgets the saved draft and stops saving until the next `reset()`. Called
 * once a payment is confirmed and on sign-out (the next person on this
 * browser must not inherit someone else's audience).
 */
export function discardWizardDraft(): void {
  draftSaving = false;
  void useWizardStore.persist.clearStorage();
}

/**
 * Everything a launch sends to `createCampaign` except the design, which a
 * re-upload may replace while the campaign is unpaid. Two launches with the
 * same key are the same order.
 */
export function launchOrderKey(s: WizardData): string {
  return JSON.stringify(
    [
      s.campaignName.trim(),
      s.selectedProduct,
      s.selectedSpec?.mailClass ?? null,
      s.audienceType,
      s.recipientCount,
      s.verifiedAddresses,
      s.qrDestinationUrl.trim(),
      s.returnAddress,
      s.sourcePresetId,
    ],
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
  );
}

/**
 * The step a deep link such as `/wizard?step=3` may open. Steps 2–4 are sized
 * from the mail piece chosen in Step 1 (audience pricing, the artboard, the
 * invoice), so until one is chosen every deep link lands on Step 1.
 */
export function reachableWizardStep(requested: number): number {
  const step = Math.min(4, Math.max(1, Math.round(requested)));
  return step > 1 && !useWizardStore.getState().selectedLayout ? 1 : step;
}

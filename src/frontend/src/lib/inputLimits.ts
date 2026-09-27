/**
 * Text bounds the canister enforces where input enters it. Mirrors
 * `src/backend/lib/inputs.mo` and `mixins/support-api.mo`; change both.
 */
import type { CanvasSide, CanvasState } from "@/backend";

export const MAX_CAMPAIGN_NAME_CHARS = 100;
export const MAX_PRESET_NAME_CHARS = 100;
/** Every line of a recipient or return address, the name included. */
export const MAX_ADDRESS_FIELD_CHARS = 100;
export const MAX_TICKET_SUBJECT_CHARS = 160;
export const MAX_TICKET_MESSAGE_CHARS = 2000;
export const MAX_REDIRECT_URL_CHARS = 2048;

// Canvas bounds (`Inputs.canvasError`). The stored canvas is a preview of
// the design: the print file is uploaded on its own.
export const MAX_CANVAS_LAYERS_PER_SIDE = 200;
export const MAX_CANVAS_TEXT_CHARS = 5000;
/** Layer ids, colours, font family, alignment. */
export const MAX_CANVAS_SHORT_CHARS = 100;
export const MAX_CANVAS_CAPTION_CHARS = 200;
/** Every image URL on both sides together. */
export const MAX_CANVAS_IMAGE_CHARS = 1_000_000;

/** Image sources the canister stores: none, `blob:`, `data:image/` or `https://`. */
export function imageUrlAllowed(url: string): boolean {
  if (url === "") return true;
  const l = url.toLowerCase();
  return (
    l.startsWith("data:image/") ||
    l.startsWith("blob:") ||
    l.startsWith("https://")
  );
}

const clip = (t: string, max: number) => (t.length > max ? t.slice(0, max) : t);

function sideForStorage(side: CanvasSide): CanvasSide {
  const short = (t: string) => clip(t, MAX_CANVAS_SHORT_CHARS);
  const textBlocks = side.textBlocks
    .slice(0, MAX_CANVAS_LAYERS_PER_SIDE)
    .map((b) => ({
      ...b,
      id: short(b.id),
      text: clip(b.text, MAX_CANVAS_TEXT_CHARS),
      color: short(b.color),
      fontFamily: short(b.fontFamily),
      align: short(b.align),
    }));
  const logos = side.logos
    .filter((l) => imageUrlAllowed(l.url))
    .slice(0, MAX_CANVAS_LAYERS_PER_SIDE - textBlocks.length)
    .map((l) => ({ ...l, id: short(l.id) }));
  const qrCodes = side.qrCodes
    .slice(0, MAX_CANVAS_LAYERS_PER_SIDE - textBlocks.length - logos.length)
    .map((q) => ({
      ...q,
      id: short(q.id),
      foreground: short(q.foreground),
      background: short(q.background),
      url: q.url.length > MAX_REDIRECT_URL_CHARS ? "" : q.url,
      caption:
        q.caption === undefined
          ? undefined
          : clip(q.caption, MAX_CANVAS_CAPTION_CHARS),
    }));
  const bg = side.backgroundImageUrl;
  return {
    ...side,
    backgroundColor: short(side.backgroundColor),
    backgroundImageUrl:
      bg !== undefined && imageUrlAllowed(bg) ? bg : undefined,
    textBlocks,
    logos,
    qrCodes,
  };
}

/**
 * The canvas as `createCampaign` stores it; always passes the canister's
 * `canvasError`. It is only a preview, so what is over a bound is left out
 * of this copy instead of blocking the order: layers past the per-side
 * limit, image sources the canister refuses and, largest first, images past
 * the shared image budget (a cleaned-up AI logo is a PNG data URL of 1 MB or
 * more). JavaScript lengths count UTF-16 units, never fewer than the
 * canister's characters, so the checks here are never looser than its own.
 */
export function canvasForStorage(canvas: CanvasState): CanvasState {
  let front = sideForStorage(canvas.front);
  let back = sideForStorage(canvas.back);
  const images = [
    { side: "front", logo: null, size: front.backgroundImageUrl?.length ?? 0 },
    { side: "back", logo: null, size: back.backgroundImageUrl?.length ?? 0 },
    ...front.logos.map((l) => ({
      side: "front",
      logo: l.id,
      size: l.url.length,
    })),
    ...back.logos.map((l) => ({
      side: "back",
      logo: l.id,
      size: l.url.length,
    })),
  ].sort((a, b) => b.size - a.size);
  let total = images.reduce((sum, i) => sum + i.size, 0);
  for (const image of images) {
    if (total <= MAX_CANVAS_IMAGE_CHARS) break;
    if (image.size === 0) continue;
    const drop = (s: CanvasSide): CanvasSide =>
      image.logo === null
        ? { ...s, backgroundImageUrl: undefined }
        : { ...s, logos: s.logos.filter((l) => l.id !== image.logo) };
    if (image.side === "front") front = drop(front);
    else back = drop(back);
    total -= image.size;
  }
  return { ...canvas, front, back };
}

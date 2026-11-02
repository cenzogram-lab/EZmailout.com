import type { LogoState, QrCodeState } from "@/backend";

/**
 * Rotation for every studio layer: text blocks, images, shapes and QR codes
 * all carry an optional `rotation` (the canister's candid has it on
 * `TextBlockState`, `LogoState` and `QrCodeState` since migration
 * `20261102_000000_LayerRotation`). It drives the editor, the 3D proof, the
 * preflight bounds and the 300 DPI export, and `canvasForStorage` keeps it
 * (normalised, omitted when 0) so the campaign page shows layers turned as
 * they were designed and printed.
 */
export interface Rotatable {
  /** Clockwise turn in degrees about the box centre. */
  rotation?: number;
}

export type StudioLogo = LogoState & Rotatable;
export type StudioQrCode = QrCodeState & Rotatable;

/** The layer's turn in degrees (0 when unset). */
export function rotationOf(layer: object): number {
  const r = (layer as Rotatable).rotation;
  return typeof r === "number" && Number.isFinite(r) ? r : 0;
}

/** Any angle as the studio keeps it: (-180, 180], to a tenth of a degree. */
export function normalizeRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  const r = Math.round(d * 10) / 10;
  return r === -180 ? 180 : Object.is(r, -0) ? 0 : r;
}

/** Steps for Shift-dragging the handle and for the `[` / `]` keys. */
export const ROTATION_STEP = 15;
/** A free drag settles on a right angle when it comes this close to one. */
const RIGHT_ANGLE_PULL = 4;

/**
 * The angle a rotation drag lands on: Shift snaps to 15° steps; otherwise
 * the right angles (0°, ±90°, 180°) pull it in when it is within 4°, and
 * anything else is kept to the whole degree.
 */
export function snapRotation(deg: number, stepped: boolean): number {
  if (stepped)
    return normalizeRotation(Math.round(deg / ROTATION_STEP) * ROTATION_STEP);
  const right = Math.round(deg / 90) * 90;
  if (Math.abs(deg - right) <= RIGHT_ANGLE_PULL)
    return normalizeRotation(right);
  return normalizeRotation(Math.round(deg));
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a box covers once turned `deg` about its centre (axis-aligned). */
export function turnedBounds(r: Rect, deg: number): Rect {
  if (!deg) return r;
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const w = r.w * c + r.h * s;
  const h = r.w * s + r.h * c;
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
}

/** CSS transform for a turned layer (undefined when it is not turned). */
export function rotationTransform(deg: number): string | undefined {
  return deg ? `rotate(${deg}deg)` : undefined;
}

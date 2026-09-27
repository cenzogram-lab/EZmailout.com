import { MAX_REDIRECT_URL_CHARS } from "@/lib/inputLimits";
import QRCode from "qrcode";

export interface QrRenderOptions {
  size: number;
  foreground?: string;
  background?: string;
  margin?: number;
}

/** PNG data URL for a QR code (raster; used for previews). */
export async function qrDataUrl(
  text: string,
  options: QrRenderOptions,
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: Math.max(32, Math.round(options.size)),
    margin: options.margin ?? 1,
    errorCorrectionLevel: "M",
    color: {
      dark: options.foreground ?? "#0f172a",
      light: options.background ?? "#ffffff",
    },
  });
}

/** Vector SVG markup for a QR code (sharp at any scale). */
export async function qrSvgString(
  text: string,
  options: Omit<QrRenderOptions, "size"> = {},
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: options.margin ?? 1,
    errorCorrectionLevel: "M",
    color: {
      dark: options.foreground ?? "#0f172a",
      light: options.background ?? "#ffffff",
    },
  });
}

/** Draws a QR code into an existing canvas element at the given pixel size. */
export async function qrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QrRenderOptions,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: Math.max(32, Math.round(options.size)),
    margin: options.margin ?? 1,
    errorCorrectionLevel: "M",
    color: {
      dark: options.foreground ?? "#0f172a",
      light: options.background ?? "#ffffff",
    },
  });
}

/** Basic destination URL validation for the QR tool. */
/**
 * A tracked QR code's redirect target, as the canister accepts it
 * (`Inputs.redirectUrl` in `src/backend/lib/inputs.mo`): an absolute
 * `http(s)` web address with a dotted host and no `user@` part. A bare domain
 * gets `https://`; `tel:`, `mailto:`, `javascript:`, `data:` and relative
 * paths give `null`. Static QR codes, which encode their target directly,
 * use `normalizeDestinationUrl` instead.
 */
export function normalizeRedirectUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_REDIRECT_URL_CHARS) return null;
  // Any other scheme ("tel:", "javascript:", "data:"…) is not a web address.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed))
    return null;
  if (trimmed.startsWith("/") || trimmed.includes("\\")) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".") || !/^[a-z0-9.-]+$/.test(url.hostname))
      return null;
    const out = url.toString();
    return out.length <= MAX_REDIRECT_URL_CHARS ? out : null;
  } catch {
    return null;
  }
}

export function normalizeDestinationUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^(tel:|mailto:|sms:)/i.test(trimmed)) return trimmed;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

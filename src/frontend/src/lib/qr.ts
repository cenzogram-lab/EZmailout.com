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

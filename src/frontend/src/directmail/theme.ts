import type { CSSProperties } from "react";
import { contrast, isDark, luminance, mix } from "./color";
import { FONT_LIBRARY, fontStack } from "./fonts";
import type {
  FontId,
  MailColors,
  MailTheme,
  MailThemeOverrides,
  PatternKind,
  PhotoTreatment,
} from "./types";

export interface ResolvedTheme {
  colors: MailColors;
  /** compatibility with the shared illustration/photo helpers */
  dark: boolean;
  fontIds: FontId[];
  font: { display: string; body: string; accent: string };
  scriptAccent: boolean;
  scriptDisplay: boolean;
  display: {
    weight: number;
    transform: "none" | "uppercase";
    tracking: number;
    italic: boolean;
    scale: number;
  };
  pattern: { kind: PatternKind; tint: string; opacity: number; scale: number };
  photo: PhotoTreatment;
  radius: number;
  frame: boolean;
  shadow: "none" | "hard" | "soft";
  ink: string;
  /** headline style (size set by the layout) */
  displayCss: CSSProperties;
  /** small-caps label style */
  labelCss: CSSProperties;
  /** body copy style */
  bodyCss: CSSProperties;
  /** card / coupon container */
  cardCss: CSSProperties;
}

export function mergeTheme(base: MailTheme, o?: MailThemeOverrides): MailTheme {
  if (!o) return base;
  return {
    ...base,
    ...o,
    colors: { ...base.colors, ...(o.colors ?? {}) },
    fonts: { ...base.fonts, ...(o.fonts ?? {}) },
    display: { ...(base.display ?? {}), ...(o.display ?? {}) },
    pattern: { ...(base.pattern ?? {}), ...(o.pattern ?? {}) },
  };
}

export function resolveTheme(
  theme: MailTheme,
  overrides?: MailThemeOverrides,
): ResolvedTheme {
  const t = mergeTheme(theme, overrides);
  const colors = t.colors;
  const dark = isDark(colors.bg);
  const accentId = t.fonts.accent ?? t.fonts.display;
  const fontIds = Array.from(
    new Set([t.fonts.display, t.fonts.body, accentId]),
  );
  const font = {
    display: fontStack(t.fonts.display),
    body: fontStack(t.fonts.body),
    accent: fontStack(accentId),
  };
  const scriptAccent = FONT_LIBRARY[accentId]?.fallback === "cursive";
  const scriptDisplay = FONT_LIBRARY[t.fonts.display]?.fallback === "cursive";
  const display = {
    weight: t.display?.weight ?? 700,
    transform: t.display?.transform ?? "none",
    tracking: t.display?.tracking ?? -0.01,
    italic: t.display?.italic ?? false,
    scale: t.display?.scale ?? 1,
  };
  const ink = t.inkColor ?? colors.text;
  const radius = t.radius ?? 10;
  const shadow = t.shadow ?? "none";

  const displayCss: CSSProperties = {
    fontFamily: font.display,
    fontWeight: display.weight,
    fontStyle: display.italic ? "italic" : "normal",
    textTransform: display.transform,
    letterSpacing: `${display.tracking}em`,
    lineHeight: scriptDisplay ? 1.1 : 0.98,
    margin: 0,
    color: colors.text,
  };
  const labelCss: CSSProperties = {
    fontFamily: font.body,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    margin: 0,
    color: colors.text,
  };
  const bodyCss: CSSProperties = {
    fontFamily: font.body,
    fontWeight: 400,
    lineHeight: 1.4,
    margin: 0,
    color: colors.text,
  };
  const cardCss: CSSProperties = {
    background: colors.surface,
    color: colors.text,
    borderRadius: radius,
    boxSizing: "border-box",
    ...(shadow === "hard"
      ? { border: `2px solid ${ink}`, boxShadow: `6px 6px 0 ${ink}` }
      : shadow === "soft"
        ? { boxShadow: "0 10px 30px rgba(0,0,0,.14)" }
        : {}),
  };

  return {
    colors,
    dark,
    fontIds,
    font,
    scriptAccent,
    scriptDisplay,
    display,
    pattern: {
      kind: t.pattern?.kind ?? "none",
      tint: t.pattern?.tint ?? (dark ? colors.text : colors.accent),
      opacity: t.pattern?.opacity ?? 0.12,
      scale: t.pattern?.scale ?? 1,
    },
    photo: t.photo ?? "color",
    radius,
    frame: t.frame ?? false,
    shadow,
    ink,
    displayCss,
    labelCss,
    bodyCss,
    cardCss,
  };
}

/** Theme recoloured so text sits on the accent (used for colour blocks). */
export function onAccent(
  t: ResolvedTheme,
  which: "accent" | "accent2" = "accent",
): ResolvedTheme {
  const bg = which === "accent" ? t.colors.accent : t.colors.accent2;
  const fg = which === "accent" ? t.colors.onAccent : t.colors.onAccent2;
  const muted = fg;
  return {
    ...t,
    dark: isDark(bg),
    colors: { ...t.colors, bg, text: fg, muted, surface: bg, border: fg },
    displayCss: { ...t.displayCss, color: fg },
    labelCss: { ...t.labelCss, color: fg },
    bodyCss: { ...t.bodyCss, color: fg },
  };
}

/** Theme recoloured for text on a photo overlay panel. */
export function onInk(t: ResolvedTheme): ResolvedTheme {
  const bg = t.ink;
  const fg = isDark(bg) ? "#FFFFFF" : "#111111";
  return {
    ...t,
    dark: isDark(bg),
    colors: { ...t.colors, bg, text: fg, muted: fg, surface: bg, border: fg },
    displayCss: { ...t.displayCss, color: fg },
    labelCss: { ...t.labelCss, color: fg },
    bodyCss: { ...t.bodyCss, color: fg },
  };
}

/**
 * Letters are printed on white paper, so a dark palette is turned into its
 * "paper" counterpart: white page, the old page colour becomes the primary
 * accent, type in the darkest tone available. Light palettes pass through.
 */
export function paperTheme(t: ResolvedTheme): ResolvedTheme {
  const c = t.colors;
  // near-white pages (cream, linen, white …) are already paper
  if (luminance(c.bg) >= 0.78) return t;
  const bg = "#FFFFFF";
  // body type stays near-black (a 30% tint of the brand colour), the brand colour moves to the accents
  const text = t.dark
    ? mix("#161616", c.bg, 0.3)
    : contrast(c.text, bg) >= 7
      ? c.text
      : "#1A1A1A";
  const accent =
    contrast(c.onAccent, c.accent) >= 4.5 && c.accent !== bg ? c.accent : c.bg;
  const onAccentColor =
    accent === c.accent
      ? c.onAccent
      : t.dark
        ? c.text
        : contrast(text, accent) >= 4.5
          ? text
          : "#FFFFFF";
  const colors: MailColors = {
    bg,
    surface: mix(bg, text, 0.05),
    text,
    muted: mix(bg, text, 0.68),
    accent,
    onAccent: onAccentColor,
    accent2: contrast(c.onAccent2, c.accent2) >= 4.5 ? c.accent2 : accent,
    onAccent2:
      contrast(c.onAccent2, c.accent2) >= 4.5 ? c.onAccent2 : onAccentColor,
    border: mix(bg, text, 0.16),
  };
  return {
    ...t,
    dark: false,
    colors,
    ink: text,
    pattern: { ...t.pattern, tint: accent },
    displayCss: { ...t.displayCss, color: text },
    labelCss: { ...t.labelCss, color: text },
    bodyCss: { ...t.bodyCss, color: text },
    cardCss: {
      ...t.cardCss,
      background: colors.surface,
      color: text,
      ...(t.shadow === "hard"
        ? { border: `2px solid ${text}`, boxShadow: `6px 6px 0 ${text}` }
        : {}),
    },
  };
}

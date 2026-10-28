"use client";

import { useTheme } from "@/lib/theme";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Rich-colour toast palette from the theme tokens, so `richColors` toasts pass
 * WCAG AA in both themes (sonner's own light inks are 3.1–4.4:1 on their
 * tints). The ground is an opaque 8 % tint of the status fill over the popover
 * surface; the text is that colour's ink token (≥ 5.2:1 light, ≥ 7.5:1 dark).
 * Info uses `--primary-ink`: `--primary-text` is under 4.5:1 on a light tint.
 * Inline variables on the toaster override sonner's `[data-theme]` defaults.
 */
const tone = (fill: string, ink: string) => ({
  bg: `color-mix(in srgb, oklch(var(${fill})) 8%, oklch(var(--popover)))`,
  border: `color-mix(in srgb, oklch(var(${fill})) 24%, oklch(var(--popover)))`,
  text: `oklch(var(${ink}))`,
});
const TONES = {
  success: tone("--emerald", "--emerald-ink"),
  warning: tone("--amber", "--amber-ink"),
  error: tone("--destructive", "--destructive-text"),
  info: tone("--primary", "--primary-ink"),
};
const richColorVars = Object.fromEntries(
  Object.entries(TONES).flatMap(([kind, t]) => [
    [`--${kind}-bg`, t.bg],
    [`--${kind}-border`, t.border],
    [`--${kind}-text`, t.text],
  ]),
);

/** Toasts follow the light / dark switch (lib/theme.ts). */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "oklch(var(--popover))",
          "--normal-text": "oklch(var(--popover-foreground))",
          "--normal-border": "var(--hairline)",
          "--border-radius": "1.25rem",
          ...richColorVars,
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

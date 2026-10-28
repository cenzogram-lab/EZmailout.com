/**
 * Shared tactile classes for the storefront (landing page, catalog tiles,
 * pricing calculator, membership card). Every colour is a theme token or a
 * fixed brand indigo that keeps white text ≥ 4.97:1, so each works in the
 * light (default) and the dark theme.
 */

/** Glossy icon tile: indigo tint with a bright top bevel. Add a size. */
export const ICON_TILE =
  "inline-flex shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/15 to-primary/5 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_6px_14px_-8px_rgb(79_70_229/0.45)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_18px_-10px_rgb(0_0_0/0.8)]";

/**
 * Glossy indigo panel (membership price column, AI Studio teaser): the
 * primary button's gradient as a surface, deeper in the dark theme. White
 * text passes on every stop (#5c5ee8 4.97:1 is the lightest); inner cards
 * darken it (`bg-black/15`), never lighten it.
 */
export const BRAND_PANEL =
  "relative isolate overflow-hidden bg-primary bg-[linear-gradient(160deg,#5c5ee8_0%,#4f46e5_55%,#4338ca_100%)] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28)] dark:bg-[linear-gradient(160deg,#4f46e5_0%,#4338ca_55%,#3730a3_100%)]";

/** Inner card on a BRAND_PANEL: darkens the indigo under its text. */
export const BRAND_PANEL_INSET =
  "rounded-2xl border border-white/15 bg-black/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]";

/** Section eyebrow: a mono capsule in the indigo status-pill colours. */
export const EYEBROW =
  "status-pill status-pill-indigo px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]";

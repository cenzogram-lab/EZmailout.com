import { CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * Shared tactile pieces for the campaign portal, the campaign page and the
 * Admin page: glossy icon tiles, card headers, stat tiles and insets. Every
 * colour is a theme token or a gradient that reads the same in both themes.
 */

type Tone = "primary" | "emerald" | "amber";

/**
 * The same bevelled gradients as `.btn-3d-primary` / `.btn-3d-success`:
 * white icon on the indigo and the amber, dark ink on the bright emerald
 * (white fails on it). Identical in both themes.
 */
const TILE_TONES: Record<Tone, string> = {
  primary:
    "border-[#3730a3] bg-[#4f46e5] bg-gradient-to-b from-[#6366f1] via-[#4f46e5] to-[#4338ca] text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.4),0_6px_14px_-6px_rgb(79_70_229/0.6)]",
  emerald:
    "border-[#00994c] bg-[#00cc66] bg-gradient-to-b from-[#00e575] to-[#00b359] text-[#04120a] shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),0_6px_14px_-6px_rgb(0_160_80/0.5)]",
  amber:
    "border-[#92400e] bg-[#c2600a] bg-gradient-to-b from-[#d97706] to-[#b45309] text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.35),0_6px_14px_-6px_rgb(180_83_9/0.55)]",
};

/** A raised, glossy icon tile (decorative). */
export function GlossyTile({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center border border-t-white/30",
        size === "sm"
          ? "size-8 rounded-xl"
          : size === "md"
            ? "size-10 rounded-2xl"
            : "size-12 rounded-2xl sm:size-14",
        TILE_TONES[tone],
        className,
      )}
    >
      <Icon
        className={
          size === "sm"
            ? "size-4"
            : size === "md"
              ? "size-[18px]"
              : "size-5 sm:size-6"
        }
      />
    </span>
  );
}

/**
 * Card header: glossy icon tile, heavy title and an optional action on the
 * first row; the description runs under the title.
 */
export function PanelHeader({
  icon,
  tone,
  title,
  description,
  action,
  className,
  descriptionProps,
}: {
  icon: React.ElementType;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  descriptionProps?: React.ComponentProps<"div"> & { "data-ocid"?: string };
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-x-3 gap-y-2",
        action
          ? "grid-cols-[auto_minmax(0,1fr)_auto]"
          : "grid-cols-[auto_minmax(0,1fr)]",
        className,
      )}
    >
      <GlossyTile icon={icon} tone={tone} />
      <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 font-display text-lg font-black leading-tight tracking-tight text-foreground">
        {title}
      </CardTitle>
      {action ? <div className="justify-self-end">{action}</div> : null}
      {description ? (
        <CardDescription
          {...descriptionProps}
          className={cn(
            "leading-relaxed",
            action
              ? "col-span-3 sm:col-span-2 sm:col-start-2"
              : "col-span-2 sm:col-span-1 sm:col-start-2",
            descriptionProps?.className,
          )}
        >
          {description}
        </CardDescription>
      ) : null}
    </div>
  );
}

/** Small-caps label inside a card ("Recent scans", "Stripe"). */
export function SectionLabel({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

/**
 * A raised stat tile: small label and a big heavy number (`.stat-number`).
 * Below `sm` it is a row (label left, number right) so three tiles stack
 * compactly on a phone; from `sm` the number sits under the label and scales
 * with the tile's own width, so long totals never overflow it.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  title,
  className,
  valueClassName,
  "data-ocid": ocid,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ElementType;
  /** Full value as a tooltip (the number may truncate in a narrow tile). */
  title?: string;
  className?: string;
  valueClassName?: string;
  "data-ocid"?: string;
}) {
  return (
    <div
      className={cn(
        "@container relative flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-3xl border border-hairline bg-card px-5 py-4 shadow-surface sm:flex-col sm:items-stretch",
        className,
      )}
      data-ocid={ocid}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-bold uppercase leading-snug tracking-[0.12em] text-muted-foreground sm:pt-2">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden="true"
            className="hidden size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary-ink sm:flex"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "stat-number min-w-0 truncate text-[length:2rem] leading-none text-foreground sm:text-[length:clamp(2.25rem,18cqw,3rem)]",
          valueClassName,
        )}
        title={title}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * A sunken inset for id lists and code. Light keeps it pale (a faint muted
 * fill, a firmer hairline and a soft inner shadow): the #ECEDF1 well under
 * white raised rows read as greyed-out, disabled fields. Dark uses the well.
 */
export const insetClass =
  "rounded-2xl border border-hairline-strong bg-muted/60 shadow-[inset_0_1px_2px_rgb(15_17_23/0.05)] dark:border-hairline dark:bg-well dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)]";

/** A raised inner panel (nested rows, grouped settings). */
export const raisedClass =
  "rounded-2xl border border-hairline bg-card-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]";

/**
 * The brand backlight behind a page title: the shared glow layer, drawn as
 * an ellipse that fades out before every edge of its box, so a wide header
 * shows no hard rim against the page. Put it first inside a
 * `relative isolate` wrapper (it sits behind the wrapper's content).
 */
export const titleGlowClass =
  "ambient-glow-backdrop -inset-x-4 -top-14 -bottom-10 bg-[radial-gradient(closest-side,var(--glow-brand),transparent)] sm:-inset-x-6";

import { CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

type Tone = "primary" | "emerald";

/**
 * Glossy icon tiles: the same bevelled gradients as `.btn-3d-primary` /
 * `.btn-3d-success`, identical in both themes (white icon on the indigo,
 * dark ink on the emerald, where white would fail).
 */
const TONES: Record<Tone, string> = {
  primary:
    "border-[#3730a3] bg-[#4f46e5] bg-gradient-to-b from-[#6366f1] via-[#4f46e5] to-[#4338ca] text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.4),0_6px_14px_-6px_rgb(79_70_229/0.6)]",
  emerald:
    "border-[#00994c] bg-[#00cc66] bg-gradient-to-b from-[#00e575] to-[#00b359] text-[#04120a] shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),0_6px_14px_-6px_rgb(0_160_80/0.5)]",
};

/** A raised, glossy icon tile for card headers (decorative). */
export function GlossyIcon({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl border border-t-white/30",
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/**
 * Card header for the dashboard widgets: glossy icon tile, heavy title and an
 * optional action on the first row; the description runs full width under
 * them on phones and lines up under the title from `sm`.
 */
export function WidgetHeader({
  icon,
  tone,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
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
      <GlossyIcon icon={icon} tone={tone} />
      <CardTitle className="font-display text-lg font-black leading-tight tracking-tight text-foreground">
        {title}
      </CardTitle>
      {action ? <div className="justify-self-end">{action}</div> : null}
      {description ? (
        <CardDescription
          className={cn(
            "leading-relaxed",
            action
              ? "col-span-3 sm:col-span-2 sm:col-start-2"
              : "col-span-2 sm:col-span-1 sm:col-start-2",
          )}
        >
          {description}
        </CardDescription>
      ) : null}
    </div>
  );
}

/** Small-caps section label inside a card ("Price list", "Recent activity"). */
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
 * A raised stat tile: small label, big heavy number (`.stat-number`). Labels
 * of different lengths keep the numbers on one baseline across a row.
 */
export function StatTile({
  label,
  value,
  className,
  "data-ocid": ocid,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  "data-ocid"?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-2 rounded-2xl border border-hairline bg-card-raised px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]",
        className,
      )}
      data-ocid={ocid}
    >
      <p className="text-xs font-semibold leading-snug text-muted-foreground">
        {label}
      </p>
      <p className="stat-number truncate text-foreground">{value}</p>
    </div>
  );
}

/**
 * An inset panel for summaries inside a card. In light it is a raised white
 * panel with a hairline and a top highlight (the grey well read as a
 * disabled field on a white card); in dark it sinks into the well.
 */
export const wellClass =
  "rounded-2xl border border-hairline bg-card-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] dark:bg-well dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)]";

/**
 * "Nothing here yet" inside a card: a dashed outline with centred muted
 * copy, so an empty list never looks like an empty text field.
 */
export const emptyNoteClass =
  "rounded-2xl border border-dashed border-hairline-strong px-4 py-4 text-center text-sm leading-relaxed text-muted-foreground dark:bg-well/60";

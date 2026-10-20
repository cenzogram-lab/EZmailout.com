import { cn } from "@/lib/utils";
import type * as React from "react";
import { StampyStep1Catalog } from "./StampyStep1Catalog";
import { StampyStep2Audience } from "./StampyStep2Audience";
import { StampyStep3Studio } from "./StampyStep3Studio";
import { StampyStep4Preflight } from "./StampyStep4Preflight";

/**
 * Which Stampy fits the empty list: a postcard for mailings, the map for
 * audiences and recipients, the palette for designs and drafts, the clipboard
 * for logs and inboxes.
 */
const POSES = {
  mail: StampyStep1Catalog,
  audience: StampyStep2Audience,
  design: StampyStep3Studio,
  checklist: StampyStep4Preflight,
} as const;

export type MascotPose = keyof typeof POSES;

/** Empty state with Stampy in place of a generic icon. */
export function MascotEmptyState({
  pose = "mail",
  title,
  description,
  action,
  size = "md",
  className,
  "data-ocid": ocid,
}: {
  pose?: MascotPose;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  "data-ocid"?: string;
}) {
  const Mascot = POSES[pose];
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "md" ? "gap-3 py-10" : "gap-2 py-6",
        className,
      )}
      data-ocid={ocid}
    >
      <Mascot
        className={cn(
          "mascot-shadow motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
          size === "md" ? "size-32" : "size-20",
        )}
      />
      <p
        className={cn(
          "font-display font-bold tracking-tight text-foreground",
          size === "md" ? "text-lg" : "text-sm",
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="max-w-xs text-sm font-medium text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

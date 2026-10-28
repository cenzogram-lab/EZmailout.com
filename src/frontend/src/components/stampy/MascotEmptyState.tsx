import { cn } from "@/lib/utils";
import type * as React from "react";
import { type MascotPose, MascotStage } from "./MascotStage";

export type { MascotPose } from "./MascotStage";

/**
 * Empty state with Stampy in place of a generic icon: the glossy mascot on
 * stage (spotlight, floor shadow, idle float), a heavy display title, muted
 * micro-copy and an optional call to action (pass a `Button`; its default
 * variant is the glossy 3D primary). It paints no background of its own, so
 * it sits on whatever card or page holds it, in either theme.
 */
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
  /** `sm` for tables and side panels, `md` for a page's main list, `lg` for a whole screen. */
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-ocid"?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "sm"
          ? "gap-2 py-6"
          : size === "md"
            ? "gap-3 py-10"
            : "gap-4 py-12",
        className,
      )}
      data-ocid={ocid}
    >
      <MascotStage
        pose={pose}
        size={size}
        className={size === "sm" ? "mb-2" : "mb-4"}
      />
      <p
        className={cn(
          "font-display font-black tracking-tight text-foreground text-balance",
          size === "sm"
            ? "text-base"
            : size === "md"
              ? "text-xl"
              : "text-2xl sm:text-3xl",
        )}
      >
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            "text-sm leading-relaxed text-muted-foreground text-pretty",
            size === "sm" ? "max-w-xs" : "max-w-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? (
        <div className={size === "sm" ? "mt-1" : "mt-3"}>{action}</div>
      ) : null}
    </div>
  );
}

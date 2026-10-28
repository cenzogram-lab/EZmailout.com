import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import { StampyStep1Catalog } from "./StampyStep1Catalog";
import { StampyStep2Audience } from "./StampyStep2Audience";
import { StampyStep3Studio } from "./StampyStep3Studio";
import { StampyStep4Preflight } from "./StampyStep4Preflight";
import type { StampyProps } from "./stampy";

/**
 * Stampy's poses by what the screen is about: `mail` waves a postcard
 * (campaigns, scans, rewards, a sent order), `audience` holds the map
 * (audiences, recipients), `design` the palette (designs, drafts) and
 * `checklist` a ticked clipboard (logs, inboxes, checks passed, order placed).
 */
export const MASCOT_POSES = {
  mail: StampyStep1Catalog,
  audience: StampyStep2Audience,
  design: StampyStep3Studio,
  checklist: StampyStep4Preflight,
} as const satisfies Record<string, ComponentType<StampyProps>>;

export type MascotPose = keyof typeof MASCOT_POSES;

export type MascotStageSize = "sm" | "md" | "lg";

/**
 * Per size: the mascot's box and how far the idle float lifts him (more for
 * a bigger Stampy, so the motion reads the same at every size).
 */
const SIZES: Record<MascotStageSize, { mascot: string; lift: string }> = {
  sm: { mascot: "size-20", lift: "motion-safe:slide-in-from-top-[3px]" },
  md: { mascot: "size-32", lift: "motion-safe:slide-in-from-top-[5px]" },
  lg: {
    mascot: "size-40 sm:size-44",
    lift: "motion-safe:slide-in-from-top-[6px]",
  },
};

/**
 * The float and the floor shadow share one timing, so the shadow shrinks and
 * fades as Stampy rises and firms up as he settles. `animate-in` with
 * `repeat-infinite direction-alternate` swings between the `from` values
 * below (Stampy lifted) and the element's own resting state (on the floor).
 * Everything is `motion-safe:`, so with reduced motion he simply stands.
 */
const FLOAT_TIMING =
  "motion-safe:animate-in motion-safe:repeat-infinite motion-safe:direction-alternate motion-safe:ease-in-out motion-safe:[animation-duration:2600ms]";

export interface MascotStageProps {
  /** Which Stampy (default `mail`, the wave). Ignored when `mascot` is set. */
  pose?: MascotPose;
  /** Any Stampy component instead of a pose, e.g. `StampyChatAvatarTip`. */
  mascot?: ComponentType<StampyProps>;
  /** sm 80 px, md 128 px, lg 160 px (176 px from `sm`). Default `md`. */
  size?: MascotStageSize;
  /** Gentle idle float (default on; always still for reduced motion). */
  float?: boolean;
  /** Fade-and-zoom entrance when it mounts (default on; motion-safe). */
  enter?: boolean;
  /** Accessible name. Omit it when Stampy is decoration (the usual case). */
  title?: string;
  /** Classes for the stage (margins, placement). */
  className?: string;
  /** Classes for the mascot itself, e.g. responsive sizes that override `size`. */
  mascotClassName?: string;
}

/**
 * Stampy on stage: the glossy 3D mascot (`.mascot-3d`: depth, rim glow and,
 * with <MascotGloss /> mounted, the specular sheen) standing in a soft indigo
 * spotlight, with a pool of light and a contact shadow on the floor and a
 * gentle idle float. For empty states and success screens; it works on the
 * page and on cards in both themes (every colour is a theme token:
 * `--spotlight`, `--stage-floor`, `--mascot-depth`).
 *
 * The light layers reach 30 % past the mascot's box on every side (a 176 px
 * Stampy needs about 280 px), so keep it in a column at least that wide; they
 * take no layout space and never catch the pointer.
 */
export function MascotStage({
  pose = "mail",
  mascot,
  size = "md",
  float = true,
  enter = true,
  title,
  className,
  mascotClassName,
}: MascotStageProps) {
  const Mascot = mascot ?? MASCOT_POSES[pose];
  const { mascot: mascotSize, lift } = SIZES[size];
  return (
    <div
      className={cn(
        "relative isolate inline-grid place-items-center",
        className,
      )}
      data-mascot-stage={size}
    >
      {/* Spotlight behind Stampy. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[30%] -z-10 rounded-full bg-[radial-gradient(closest-side,var(--spotlight),transparent)]"
      />
      {/* The pool of light on the floor. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-[20%] -bottom-[9%] -z-10 h-[20%] bg-[radial-gradient(closest-side,var(--spotlight),transparent)]"
      />
      {/* Contact shadow: tightens and fades while he floats up. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-[3%] -z-10 mx-auto h-[8%] w-[56%] bg-[radial-gradient(closest-side,var(--stage-floor),transparent)]",
          float &&
            `${FLOAT_TIMING} motion-safe:zoom-in-[0.84] motion-safe:fade-in-[0.5]`,
        )}
      />
      <div className={cn(float && `${FLOAT_TIMING} ${lift}`)}>
        <Mascot
          title={title}
          className={cn(
            "mascot-3d block",
            mascotSize,
            enter &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
            mascotClassName,
          )}
        />
      </div>
    </div>
  );
}

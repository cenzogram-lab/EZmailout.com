import { CampaignStatus, type TrackingEvent, TrackingSource } from "@/backend";
import {
  CAMPAIGN_STAGES,
  type CampaignStage,
  DELIVERY_EXCEPTIONS,
  stageIndex,
} from "@/components/campaigns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type StageState = "done" | "current" | "pending" | "exception";

/**
 * The five stages as this campaign sees them: an undeliverable or returned
 * campaign shows that outcome in place of "Delivered".
 */
function stagesFor(status: CampaignStatus): CampaignStage[] {
  const outcome = DELIVERY_EXCEPTIONS.find((stage) => stage.key === status);
  return outcome ? [...CAMPAIGN_STAGES.slice(0, -1), outcome] : CAMPAIGN_STAGES;
}

const SOURCE_VARIANTS: Record<TrackingSource, "info" | "neutral" | "success"> =
  {
    [TrackingSource.Webhook]: "info",
    [TrackingSource.Poll]: "neutral",
    [TrackingSource.Manual]: "info",
    [TrackingSource.System]: "success",
  };

export function SourceBadge({ source }: { source: TrackingSource }) {
  return (
    <Badge
      variant={SOURCE_VARIANTS[source]}
      className="h-5 px-1.5 font-mono text-[10px] uppercase tracking-wider"
    >
      {source}
    </Badge>
  );
}

/** Most recent event recorded for a stage. */
export function latestEventFor(
  events: TrackingEvent[],
  stage: CampaignStatus,
): TrackingEvent | undefined {
  let latest: TrackingEvent | undefined;
  for (const event of events) {
    if (event.status !== stage) continue;
    if (!latest || event.timestamp > latest.timestamp) latest = event;
  }
  return latest;
}

function stateFor(
  idx: number,
  currentIdx: number,
  stage: CampaignStage,
): StageState {
  if (DELIVERY_EXCEPTIONS.includes(stage)) return "exception";
  if (idx < currentIdx) return "done";
  if (idx === currentIdx) return "current";
  return "pending";
}

/**
 * Glossy 3D markers: emerald for a stage passed (dark ink, as on the success
 * button), indigo with a soft halo for the current one, a raised neutral for
 * those ahead and amber for an exception. A delivered campaign's last stage
 * reads as complete (emerald) while staying the current step.
 */
const MARKER_STYLES: Record<StageState | "complete", string> = {
  done: "border-[#00994c] border-t-white/40 bg-[#00cc66] bg-gradient-to-b from-[#00e575] to-[#00b359] text-[#04120a] shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),0_6px_16px_-6px_rgb(0_200_100/0.55)]",
  complete:
    "border-[#00994c] border-t-white/40 bg-[#00cc66] bg-gradient-to-b from-[#00e575] to-[#00b359] text-[#04120a] shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),0_0_0_4px_rgb(0_200_100/0.18),0_8px_24px_-6px_rgb(0_200_100/0.6)]",
  current:
    "motion-safe:animate-pipeline-pulse border-[#3730a3] border-t-white/40 bg-[#4f46e5] bg-gradient-to-b from-[#6366f1] via-[#4f46e5] to-[#4338ca] text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.4),0_0_0_4px_rgb(99_102_241/0.2),0_8px_24px_-6px_rgb(79_70_229/0.65)]",
  pending: "btn-3d-neutral text-muted-foreground",
  exception:
    "border-[#92400e] border-t-white/35 bg-[#c2600a] bg-gradient-to-b from-[#d97706] to-[#b45309] text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.35),0_0_0_4px_rgb(245_158_11/0.2),0_8px_24px_-6px_rgb(180_83_9/0.6)]",
};

function StageMarker({
  stage,
  state,
}: {
  stage: CampaignStage;
  state: StageState;
}) {
  const Icon = stage.icon;
  const complete =
    state === "current" && stage.key === CampaignStatus.Delivered;
  return (
    <div
      className={cn(
        "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border transition-smooth",
        MARKER_STYLES[complete ? "complete" : state],
      )}
      aria-current={state === "current" ? "step" : undefined}
    >
      {state === "done" || complete ? (
        <Check className="size-5" strokeWidth={2.75} />
      ) : (
        <Icon className="size-5" />
      )}
    </div>
  );
}

/**
 * One rail segment between two stages: a sunken track, lit (emerald, with a
 * glow) once the mail has passed it; the segment into the current stage
 * fades from emerald into indigo, or into amber for an exception.
 */
function railFill(idx: number, currentIdx: number, stages: CampaignStage[]) {
  if (idx >= currentIdx) return null;
  const next = stages[idx + 1];
  const intoCurrent = idx + 1 === currentIdx;
  const exception = !!next && DELIVERY_EXCEPTIONS.includes(next);
  if (!intoCurrent) return "from-[#00e575] to-[#00c364]";
  if (exception) return "from-[#00e575] to-[#d97706]";
  if (next?.key === CampaignStatus.Delivered)
    return "from-[#00e575] to-[#00c364]";
  return "from-[#00e575] to-[#6366f1]";
}

function RailSegment({
  idx,
  currentIdx,
  stages,
  orientation,
  className,
}: {
  idx: number;
  currentIdx: number;
  stages: CampaignStage[];
  orientation: "horizontal" | "vertical";
  className?: string;
}) {
  const fill = railFill(idx, currentIdx, stages);
  return (
    <span
      aria-hidden="true"
      className={cn(
        // The unlit track is a foreground tint with a firm hairline edge: the
        // well colour all but vanished on the card (about 1.1:1 either way).
        "absolute overflow-hidden rounded-full bg-foreground/[0.08] shadow-[inset_0_1px_2px_rgb(15_17_23/0.12)] ring-1 ring-inset ring-hairline-strong dark:bg-foreground/[0.12] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.6)]",
        className,
      )}
    >
      {fill ? (
        <span
          className={cn(
            "absolute inset-0 rounded-full shadow-[0_0_10px_rgb(0_220_110/0.55)]",
            orientation === "horizontal"
              ? "bg-gradient-to-r"
              : "bg-gradient-to-b",
            fill,
          )}
        />
      ) : null}
    </span>
  );
}

/**
 * Date and time stay whole: in a narrow column the time drops under the date
 * as one piece instead of leaving "PM" alone on a line.
 */
function StageTimestamp({
  timestamp,
  centered,
}: {
  timestamp: TrackingEvent["timestamp"];
  centered: boolean;
}) {
  const className = "text-xs font-medium tabular-nums text-foreground";
  // The text is formatTimestamp's, as everywhere else; where it is the date,
  // a separator and the time, the line may break between date and time only.
  const full = formatTimestamp(timestamp);
  const ms = Number(BigInt(timestamp) / 1_000_000n);
  const date = ms ? new Date(ms) : null;
  const datePart = date?.toLocaleDateString() ?? "";
  const timePart = date?.toLocaleTimeString() ?? "";
  if (
    !date ||
    !full.startsWith(datePart) ||
    !full.endsWith(timePart) ||
    full.length <= datePart.length + timePart.length
  ) {
    return <span className={className}>{full}</span>;
  }
  const separator = full.slice(datePart.length, full.length - timePart.length);
  // dir="auto": the two parts follow the string's own direction (an
  // Arabic timestamp reads time before date, as the whole string does).
  return (
    <span
      dir="auto"
      className={cn(className, "flex flex-wrap", centered && "justify-center")}
    >
      <span className="whitespace-pre">{datePart + separator}</span>
      <span className="whitespace-nowrap">{timePart}</span>
    </span>
  );
}

function StageDetails({
  stage,
  state,
  event,
  align,
}: {
  stage: CampaignStage;
  state: StageState;
  event: TrackingEvent | undefined;
  align: "center" | "left";
}) {
  const centered = align === "center";
  // A delivered campaign's last stage reads as complete, like its marker.
  const complete =
    state === "current" && stage.key === CampaignStatus.Delivered;
  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        centered ? "flex flex-col items-center text-center" : "text-left",
      )}
    >
      <p
        className={cn(
          "font-display text-sm font-bold leading-tight tracking-tight",
          state === "current" && !complete && "text-primary",
          complete && "text-emerald-brand",
          state === "done" && "text-foreground",
          state === "pending" && "font-semibold text-muted-foreground",
          state === "exception" && "text-amber-brand",
        )}
      >
        {stage.label}
      </p>
      {event ? (
        <div
          className={cn(
            "mt-1 flex flex-col gap-1",
            centered ? "items-center" : "items-start",
          )}
        >
          <StageTimestamp timestamp={event.timestamp} centered={centered} />
          <div
            className={cn(
              "flex flex-wrap items-center gap-1",
              centered && "justify-center",
            )}
          >
            <SourceBadge source={event.source} />
            {event.providerEventId ? (
              <span
                className="max-w-[160px] truncate font-mono text-[10px] tracking-wider text-muted-foreground"
                title={event.providerEventId}
              >
                {event.providerEventId}
              </span>
            ) : null}
          </div>
          {event.detail ? (
            <p
              className="max-w-[220px] text-xs leading-snug text-muted-foreground"
              title={event.detail}
            >
              {event.detail}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {state === "pending"
            ? "Awaiting update"
            : state === "current" || state === "exception"
              ? stage.description
              : "Completed"}
        </p>
      )}
    </div>
  );
}

export interface TrackingTimelineProps {
  status: CampaignStatus;
  events: TrackingEvent[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Five-stage delivery stepper: horizontal on desktop, vertical on mobile, on a
 * glowing progress rail. Done stages are emerald, the current stage is
 * indigo, upcoming stages raised neutral; an undeliverable or returned
 * outcome takes the last slot in amber.
 */
export function TrackingTimeline({
  status,
  events,
  isLoading = false,
  className,
}: TrackingTimelineProps) {
  const currentIdx = stageIndex(status);
  const stages = stagesFor(status);

  return (
    <div
      className={cn("relative", className)}
      data-ocid="campaign_detail.tracking.timeline"
    >
      {isLoading ? (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Refreshing tracking events…
        </div>
      ) : null}

      {/* Desktop: horizontal stepper */}
      <ol className="hidden md:grid md:grid-cols-5 md:gap-3">
        {stages.map((stage, idx) => {
          const state = stateFor(idx, currentIdx, stage);
          const event = latestEventFor(events, stage.key);
          return (
            <li
              key={stage.key}
              className="relative flex flex-col items-center gap-3"
              data-ocid={`campaign_detail.tracking.item.${idx + 1}`}
            >
              {idx < stages.length - 1 ? (
                <RailSegment
                  idx={idx}
                  currentIdx={currentIdx}
                  stages={stages}
                  orientation="horizontal"
                  className="left-[calc(50%+1.625rem)] top-[1.0625rem] h-2.5 w-[calc(100%-3.25rem+0.75rem)]"
                />
              ) : null}
              <StageMarker stage={stage} state={state} />
              <StageDetails
                stage={stage}
                state={state}
                event={event}
                align="center"
              />
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical stepper */}
      <ol className="md:hidden">
        {stages.map((stage, idx) => {
          const state = stateFor(idx, currentIdx, stage);
          const event = latestEventFor(events, stage.key);
          const isLast = idx === stages.length - 1;
          return (
            <li
              key={stage.key}
              className={cn("relative flex gap-4", !isLast && "pb-7")}
              data-ocid={`campaign_detail.tracking.mobile_item.${idx + 1}`}
            >
              {!isLast ? (
                <RailSegment
                  idx={idx}
                  currentIdx={currentIdx}
                  stages={stages}
                  orientation="vertical"
                  className="left-[1.0625rem] top-[3.125rem] h-[calc(100%-3.5rem)] w-2.5"
                />
              ) : null}
              <StageMarker stage={stage} state={state} />
              <div className="min-w-0 pt-2.5">
                <StageDetails
                  stage={stage}
                  state={state}
                  event={event}
                  align="left"
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

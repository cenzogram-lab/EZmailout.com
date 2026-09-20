import {
  type CampaignStatus,
  type TrackingEvent,
  TrackingSource,
} from "@/backend";
import {
  CAMPAIGN_STAGES,
  type CampaignStage,
  stageIndex,
} from "@/components/campaigns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type StageState = "done" | "current" | "pending";

const SOURCE_STYLES: Record<TrackingSource, string> = {
  [TrackingSource.Webhook]: "border-primary/20 bg-primary/10 text-primary",
  [TrackingSource.Poll]: "border-border bg-muted text-muted-foreground",
  [TrackingSource.Manual]:
    "border-accent/40 bg-accent/15 text-accent-foreground",
  [TrackingSource.System]:
    "border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand",
};

export function SourceBadge({ source }: { source: TrackingSource }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-1.5 text-[10px] uppercase", SOURCE_STYLES[source])}
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

function stateFor(idx: number, currentIdx: number): StageState {
  if (idx < currentIdx) return "done";
  if (idx === currentIdx) return "current";
  return "pending";
}

function StageMarker({
  stage,
  state,
}: {
  stage: CampaignStage;
  state: StageState;
}) {
  const Icon = stage.icon;
  return (
    <div
      className={cn(
        "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-smooth",
        state === "done" &&
          "border-emerald-brand bg-emerald-brand text-white shadow-sm",
        state === "current" &&
          "animate-pipeline-pulse border-accent bg-accent text-accent-foreground ring-4 ring-accent/20",
        state === "pending" && "border-border bg-card text-muted-foreground",
      )}
      aria-current={state === "current" ? "step" : undefined}
    >
      {state === "done" ? (
        <Check className="size-5" />
      ) : (
        <Icon className="size-5" />
      )}
    </div>
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
  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        centered ? "flex flex-col items-center text-center" : "text-left",
      )}
    >
      <p
        className={cn(
          "font-display text-sm font-semibold leading-tight",
          state === "current" && "text-accent",
          state === "done" && "text-foreground",
          state === "pending" && "text-muted-foreground",
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
          <span className="text-xs text-foreground/80">
            {formatTimestamp(event.timestamp)}
          </span>
          <div
            className={cn(
              "flex flex-wrap items-center gap-1",
              centered && "justify-center",
            )}
          >
            <SourceBadge source={event.source} />
            {event.providerEventId ? (
              <span
                className="max-w-[160px] truncate font-mono text-[10px] text-muted-foreground"
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
            : state === "current"
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
 * Five-stage delivery stepper: horizontal on desktop, vertical on mobile.
 * Done stages are emerald, the current stage is orange, upcoming stages muted.
 */
export function TrackingTimeline({
  status,
  events,
  isLoading = false,
  className,
}: TrackingTimelineProps) {
  const currentIdx = stageIndex(status);

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
        {CAMPAIGN_STAGES.map((stage, idx) => {
          const state = stateFor(idx, currentIdx);
          const event = latestEventFor(events, stage.key);
          return (
            <li
              key={stage.key}
              className="relative flex flex-col items-center gap-3"
              data-ocid={`campaign_detail.tracking.item.${idx + 1}`}
            >
              {idx < CAMPAIGN_STAGES.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 top-5 h-0.5 w-full",
                    idx < currentIdx ? "bg-emerald-brand" : "bg-border",
                  )}
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
        {CAMPAIGN_STAGES.map((stage, idx) => {
          const state = stateFor(idx, currentIdx);
          const event = latestEventFor(events, stage.key);
          const isLast = idx === CAMPAIGN_STAGES.length - 1;
          return (
            <li
              key={stage.key}
              className={cn("relative flex gap-4", !isLast && "pb-7")}
              data-ocid={`campaign_detail.tracking.mobile_item.${idx + 1}`}
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5",
                    idx < currentIdx ? "bg-emerald-brand" : "bg-border",
                  )}
                />
              ) : null}
              <StageMarker stage={stage} state={state} />
              <div className="pt-2">
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

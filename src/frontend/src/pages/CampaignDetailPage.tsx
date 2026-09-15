import { CampaignStatus, type TrackingEvent } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  useCampaign,
  useExportCampaign,
  useTrackingEvents,
} from "@/hooks/use-backend";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Inbox,
  Loader2,
  MapPin,
  Package,
  Truck,
} from "lucide-react";

const STAGES: {
  key: CampaignStatus;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: CampaignStatus.Created, label: "Created", icon: Clock },
  { key: CampaignStatus.InProduction, label: "In Production", icon: Package },
  { key: CampaignStatus.InTransit, label: "In Transit", icon: Truck },
  {
    key: CampaignStatus.SortedAtLocalHub,
    label: "Sorted at Local Hub",
    icon: MapPin,
  },
  { key: CampaignStatus.Delivered, label: "Delivered", icon: Inbox },
];

function statusBadge(status: CampaignStatus) {
  switch (status) {
    case CampaignStatus.Created:
      return <Badge variant="secondary">Created</Badge>;
    case CampaignStatus.InProduction:
      return (
        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20">
          In Production
        </Badge>
      );
    case CampaignStatus.InTransit:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20">
          In Transit
        </Badge>
      );
    case CampaignStatus.SortedAtLocalHub:
      return (
        <Badge className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/20">
          Sorted at Local Hub
        </Badge>
      );
    case CampaignStatus.Delivered:
      return (
        <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20">
          Delivered
        </Badge>
      );
    default:
      return <Badge variant="secondary">{String(status)}</Badge>;
  }
}

function stageIndex(status: CampaignStatus): number {
  return STAGES.findIndex((s) => s.key === status);
}

function progressPercent(status: CampaignStatus): number {
  const idx = stageIndex(status);
  return idx >= 0 ? Math.round(((idx + 1) / STAGES.length) * 100) : 0;
}

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts / 1_000_000n));
  return d.toLocaleString();
}

function eventForStage(
  events: TrackingEvent[],
  stage: CampaignStatus,
): TrackingEvent | undefined {
  return events.find((e) => e.eventType === stage);
}

export function CampaignDetailPage() {
  const { campaignId } = useParams({ from: "/campaigns/$campaignId" });
  const { data: campaign, isLoading: campaignLoading } =
    useCampaign(campaignId);
  const { data: events, isLoading: eventsLoading } =
    useTrackingEvents(campaignId);
  const exportMutation = useExportCampaign();

  async function handleExport() {
    const csv = await exportMutation.mutateAsync(campaignId);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign_${campaignId}_recipients.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const currentStageIdx = campaign ? stageIndex(campaign.status) : -1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/campaigns">
        <Button
          variant="ghost"
          className="mb-4 gap-2 pl-0 text-muted-foreground hover:text-foreground"
          data-ocid="campaign_detail.back_link"
        >
          <ArrowLeft className="size-4" />
          Back to Campaigns
        </Button>
      </Link>

      {campaignLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading campaign…
        </div>
      ) : !campaign ? (
        <div className="text-center text-muted-foreground">
          Campaign not found.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-xl font-bold text-foreground">
                  {campaign.id}
                </h1>
                {statusBadge(campaign.status)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaign.product.productType} ·{" "}
                {campaign.product.layoutVariant}
                {campaign.product.colorOption
                  ? ` · ${campaign.product.colorOption}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Created {formatDate(campaign.createdAt)}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              data-ocid="campaign_detail.export_button"
            >
              {exportMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export Mail List
            </Button>
          </div>

          <Separator />

          {/* Progress */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Delivery Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={progressPercent(campaign.status)}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercent(campaign.status)}% complete</span>
                <span>
                  Stage {currentStageIdx + 1} of {STAGES.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Tracking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading tracking events…
                </div>
              ) : (
                <ol className="relative space-y-0">
                  {STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIdx;
                    const isActive = idx === currentStageIdx;
                    const evt = events
                      ? eventForStage(events, stage.key)
                      : undefined;
                    const Icon = stage.icon;

                    return (
                      <li
                        key={stage.key}
                        className="relative flex gap-4 pb-8 last:pb-0"
                        data-ocid={`campaign_detail.timeline.${idx + 1}.item`}
                      >
                        {/* connector */}
                        {idx < STAGES.length - 1 && (
                          <span
                            className={`absolute left-[19px] top-10 h-full w-px ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${
                            isActive
                              ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                              : isCompleted
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted bg-card text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>

                        <div className="flex-1 pt-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold ${
                                isActive
                                  ? "text-cyan-400"
                                  : isCompleted
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {stage.label}
                            </span>
                            {evt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(evt.timestamp)}
                              </span>
                            )}
                          </div>
                          {evt && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Event ID: {evt.lobEventId}
                            </p>
                          )}
                          {!evt && !isCompleted && !isActive && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Awaiting update…
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

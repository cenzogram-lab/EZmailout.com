import {
  type CampaignRecordShared,
  type CampaignStatus,
  type CanvasState,
  PaymentPurpose,
  PaymentStatus,
  ProductionStatus,
} from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { DraftExpiryNote } from "@/components/campaigns/DraftExpiry";
import {
  PanelHeader,
  SectionLabel,
  insetClass,
  raisedClass,
  titleGlowClass,
} from "@/components/campaigns/PanelParts";
import {
  CAMPAIGN_STAGES,
  DELIVERY_EXCEPTIONS,
  PaymentStatusBadge,
  ProductionStatusBadge,
  StatusBadge,
  deliveryMoveAllowed,
  isDeliveryException,
  isDeliveryOutcome,
  stageIndex,
  statusLabel,
} from "@/components/campaigns/StatusBadge";
import { TrackingTimeline } from "@/components/campaigns/TrackingTimeline";
import { MascotEmptyState } from "@/components/stampy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useAdminKeys,
  useCampaign,
  useDeleteCampaignDraft,
  useDispatchPrintJob,
  useExportCampaign,
  useQrScanStats,
  useSyncPrintTracking,
  useTrackingEvents,
  useUpdateCampaignStatus,
} from "@/hooks/use-backend";
import { downloadText } from "@/lib/download";
import {
  formatNumber,
  formatTimestamp,
  layoutLabel,
  productTypeLabel,
} from "@/lib/format";
import { formatCents, mailClassLabel } from "@/lib/pricing";
import { isShapeUrl } from "@/lib/shapes";
import { shownText } from "@/lib/textFit";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Download,
  ExternalLink,
  Factory,
  Image as ImageIcon,
  Loader2,
  MapPinned,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const THUMB_WIDTH = 320;

function IdRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "meta-mono max-w-[60%] truncate",
          value ? "text-foreground" : undefined,
        )}
        title={value}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

/** Read-only render of the front side, scaled into a fixed-width box. */
function CanvasThumbnail({ canvas }: { canvas: CanvasState }) {
  const ppi = Number(canvas.designPpi) || 100;
  const designWidth = canvas.widthInches * ppi;
  const designHeight = canvas.heightInches * ppi;
  if (designWidth <= 0 || designHeight <= 0) return null;
  const scale = THUMB_WIDTH / designWidth;
  const height = Math.round(designHeight * scale);
  const side = canvas.front;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-lg border border-hairline-strong shadow-raised"
      style={{
        width: THUMB_WIDTH,
        height,
        backgroundColor: side.backgroundColor || "#ffffff",
        backgroundImage: side.backgroundImageUrl
          ? `url(${side.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      data-ocid="campaign_detail.design.thumbnail"
    >
      {side.logos.map((logo) => (
        <img
          key={logo.id}
          src={logo.url}
          alt=""
          className={cn(
            "absolute",
            isShapeUrl(logo.url) ? "object-fill" : "object-contain",
          )}
          style={{
            left: logo.x * scale,
            top: logo.y * scale,
            width: logo.width * scale,
            height: logo.height * scale,
            zIndex: Number(logo.zIndex),
          }}
        />
      ))}
      {side.textBlocks.map((block) => (
        <div
          key={block.id}
          className="absolute overflow-hidden whitespace-pre-wrap break-words"
          style={{
            left: block.x * scale,
            top: block.y * scale,
            width: block.width * scale,
            height: block.height * scale,
            fontSize: Math.max(4, block.fontSize * scale),
            lineHeight: 1.15,
            color: block.color,
            fontFamily: block.fontFamily,
            fontWeight: Number(block.fontWeight),
            textAlign: block.align as "left" | "center" | "right",
            zIndex: Number(block.zIndex),
          }}
        >
          {shownText(block.text)}
        </div>
      ))}
      {side.qrCodes.map((qr) => (
        <div
          key={qr.id}
          className="absolute flex items-center justify-center rounded-sm border"
          style={{
            left: qr.x * scale,
            top: qr.y * scale,
            width: qr.size * scale,
            height: qr.size * scale,
            backgroundColor: qr.background,
            color: qr.foreground,
            borderColor: qr.foreground,
            zIndex: Number(qr.zIndex),
          }}
        >
          <QrCode style={{ width: "70%", height: "70%" }} />
        </div>
      ))}
    </div>
  );
}

function PayNowDialog({
  campaign,
  open,
  onOpenChange,
  onPaid,
}: {
  campaign: CampaignRecordShared;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}) {
  const total =
    Number(campaign.recipientCount) * Number(campaign.unitPriceCents);
  // No way out once the card was charged and the payment is unconfirmed:
  // a second checkout would charge it again (`onLockedChange`).
  const [locked, setLocked] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => (o || !locked) && onOpenChange(o)}>
      <DialogContent
        className="sm:max-w-lg"
        data-ocid="campaign_detail.pay_now.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black tracking-tight">
            Pay for this campaign
          </DialogTitle>
          <DialogDescription>
            {formatNumber(campaign.recipientCount)} pieces ×{" "}
            {formatCents(campaign.unitPriceCents)} ={" "}
            <span className="font-bold tabular-nums text-foreground">
              {formatCents(total)}
            </span>
            . Production starts as soon as payment clears.
          </DialogDescription>
        </DialogHeader>
        <StripeCheckout
          purpose={PaymentPurpose.CampaignOrder}
          reference={campaign.id}
          amountLabel={formatCents(total)}
          title={campaign.name || "Campaign order"}
          description={`${formatNumber(campaign.recipientCount)} × ${layoutLabel(campaign.product.layoutVariant)}`}
          submitLabel="Pay"
          onSuccess={(result) => {
            if (result.ok) {
              toast.success(
                "Payment received. Your campaign is ready to dispatch.",
              );
              onPaid();
              onOpenChange(false);
            } else {
              toast.error(result.error ?? "Payment could not be confirmed.");
            }
          }}
          onCancel={() => onOpenChange(false)}
          onLockedChange={setLocked}
        />
      </DialogContent>
    </Dialog>
  );
}

export function CampaignDetailPage() {
  const params = useParams({ strict: false }) as { campaignId?: string };
  const campaignId = params.campaignId ?? "";

  const campaignQuery = useCampaign(campaignId);
  const eventsQuery = useTrackingEvents(campaignId);
  const qrStatsQuery = useQrScanStats(campaignId);
  const adminKeysQuery = useAdminKeys();
  const exportMutation = useExportCampaign();
  const dispatchMutation = useDispatchPrintJob();
  const deleteDraft = useDeleteCampaignDraft();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const syncMutation = useSyncPrintTracking();
  const overrideMutation = useUpdateCampaignStatus();

  const [payOpen, setPayOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<CampaignStatus | "">("");

  const campaign = campaignQuery.data ?? null;
  // The stages an admin may move this campaign to (`deliveryMoveAllowed`).
  const overrideTargets = campaign
    ? [...CAMPAIGN_STAGES, ...DELIVERY_EXCEPTIONS].filter((stage) =>
        deliveryMoveAllowed(
          campaign.productionStatus,
          campaign.status,
          stage.key,
        ),
      )
    : [];
  const events = eventsQuery.data ?? [];
  const qrStats = qrStatsQuery.data ?? null;
  const isAdmin = adminKeysQuery.data?.callerIsAdmin === true;

  async function handleExport() {
    if (!campaign) return;
    try {
      const csv = await exportMutation.mutateAsync(campaign.id);
      if (!csv) {
        toast.error("Nothing to export for this campaign.");
        return;
      }
      downloadText(`campaign_${campaign.id}_recipients.csv`, csv, "text/csv");
      toast.success("Mail list exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    }
  }

  async function handleDispatch() {
    if (!campaign) return;
    try {
      const result = await dispatchMutation.mutateAsync(campaign.id);
      if (result.ok) {
        toast.success(
          result.jobId
            ? `Submitted for printing — job ${result.jobId}.`
            : "Sent to print.",
        );
      } else {
        toast.error(result.error ?? "Dispatch failed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispatch failed.");
    }
  }

  async function handleSync() {
    if (!campaign) return;
    try {
      const result = await syncMutation.mutateAsync(campaign.id);
      if (result.ok && result.cached) {
        // No lookup was made: tracking is finished, or the backend's 6-hour
        // cooldown (the automatic poll's interval) has not run out.
        const finished =
          isDeliveryOutcome(campaign.status) ||
          campaign.productionStatus === ProductionStatus.Failed;
        toast.info(
          finished
            ? "Tracking is complete for this campaign — showing the final status."
            : "Tracking was checked in the last 6 hours — showing the latest status.",
        );
      } else if (result.ok) {
        const count = Number(result.newEvents);
        toast.success(
          count > 0
            ? `Tracking synced — ${formatNumber(count)} new event${count === 1 ? "" : "s"}.`
            : "Tracking synced — no new events yet.",
        );
      } else {
        toast.error(result.error ?? "Tracking sync failed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    }
  }

  async function handleOverride() {
    if (!campaign || !overrideStatus) return;
    try {
      const ok = await overrideMutation.mutateAsync({
        id: campaign.id,
        status: overrideStatus,
        providerEventId: `manual_${Date.now()}`,
        timestamp: BigInt(Date.now()) * 1_000_000n,
      });
      if (ok) {
        toast.success("Campaign status overridden.");
        setOverrideStatus("");
      } else {
        toast.error(
          "The canister refused this move: the timeline only moves forward, once the print job is submitted.",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Override failed.");
    }
  }

  /** Two clicks: the first arms the button, the second deletes. */
  async function handleDeleteDraft() {
    if (!campaign) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    try {
      const result = await deleteDraft.mutateAsync(campaign.id);
      if (result.ok) {
        toast.success("Draft deleted.");
        void navigate({ to: "/campaigns" });
      } else {
        toast.error(result.error ?? "The draft could not be deleted.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The draft could not be deleted.",
      );
    }
  }

  const canPay = campaign?.paymentStatus === PaymentStatus.Unpaid;
  const isPaidOrWaived =
    campaign?.paymentStatus === PaymentStatus.Paid ||
    campaign?.paymentStatus === PaymentStatus.Waived;
  const canDispatch =
    !!campaign &&
    isPaidOrWaived &&
    campaign.productionStatus !== ProductionStatus.Submitted;
  const invoiceTotal = campaign
    ? Number(campaign.recipientCount) * Number(campaign.unitPriceCents)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Button
        asChild
        variant="ghost"
        className="mb-4 h-11 gap-2 pl-2 pr-4 text-muted-foreground hover:text-foreground sm:h-9"
        data-ocid="campaign_detail.back.link"
      >
        <Link to="/campaigns">
          <ArrowLeft className="size-4" />
          Back to Campaign Portal
        </Link>
      </Button>

      {!campaignId ? (
        <div
          className="py-20 text-center text-muted-foreground"
          data-ocid="campaign_detail.missing.state"
        >
          No campaign id in the URL.
        </div>
      ) : campaignQuery.isLoading ? (
        <div
          className="flex items-center justify-center py-20 text-muted-foreground"
          data-ocid="campaign_detail.loading.state"
        >
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading campaign…
        </div>
      ) : !campaign &&
        campaignQuery.isError &&
        !/not found or access denied/i.test(
          String(campaignQuery.error?.message ?? ""),
        ) ? (
        // The canister answers an unknown or foreign id with that message;
        // anything else is a failed load, not a missing campaign.
        <div
          className="surface-card border-dashed border-hairline-strong px-4 py-20 text-center"
          data-ocid="campaign_detail.error.state"
        >
          <p className="font-display text-xl font-black tracking-tight text-foreground">
            We couldn't load this campaign
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            EZmailout didn't answer just now; try again in a moment.
          </p>
          <Button
            variant="outline"
            className="mt-5 h-11 px-5"
            onClick={() => void campaignQuery.refetch()}
            data-ocid="campaign_detail.error.retry.button"
          >
            Try again
          </Button>
        </div>
      ) : !campaign ? (
        <div
          className="surface-card border-dashed border-hairline-strong px-4 py-20 text-center"
          data-ocid="campaign_detail.not_found.state"
        >
          <p className="font-display text-xl font-black tracking-tight text-foreground">
            Campaign not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may belong to another account or the id is mistyped.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Header */}
          <div className="relative isolate">
            {/* The brand backlight behind the title. */}
            <div aria-hidden="true" className={titleGlowClass} />
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="display-heading min-w-0 break-words text-3xl sm:text-4xl">
                    {campaign.name || "Untitled campaign"}
                  </h1>
                  <StatusBadge status={campaign.status} />
                </div>
                <p className="meta-mono mt-1.5">{campaign.id}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {layoutLabel(campaign.product.layoutVariant)} ·{" "}
                  {productTypeLabel(campaign.product.productType)}
                  {campaign.product.colorOption
                    ? ` · ${campaign.product.colorOption}`
                    : ""}{" "}
                  · {mailClassLabel(campaign.printSpec.mailClass)} · Created{" "}
                  {formatTimestamp(campaign.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 px-5 sm:h-10"
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  data-ocid="campaign_detail.export.button"
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Export mail list
                </Button>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <Card className="relative isolate overflow-hidden">
            <div aria-hidden="true" className="ambient-glow-backdrop" />
            <CardHeader>
              <PanelHeader
                icon={MapPinned}
                title="Delivery tracking"
                descriptionProps={{
                  "data-ocid": "campaign_detail.tracking.summary",
                }}
                description={
                  isDeliveryException(campaign.status)
                    ? `Outcome: ${statusLabel(campaign.status)} · tracking lookups have stopped; later USPS updates still arrive through EZmailout tracking webhooks.`
                    : `Stage ${stageIndex(campaign.status) + 1} of ${CAMPAIGN_STAGES.length} · updates arrive from USPS via EZmailout tracking webhooks and polling.`
                }
              />
            </CardHeader>
            <CardContent>
              <TrackingTimeline
                status={campaign.status}
                events={events}
                isLoading={eventsQuery.isLoading}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              {/* Production */}
              <Card data-ocid="campaign_detail.production.panel">
                <CardHeader>
                  <PanelHeader
                    icon={Factory}
                    title="Production"
                    description="Payment, print job and fulfilment identifiers."
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className={cn(
                        raisedClass,
                        "flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 text-sm",
                      )}
                    >
                      <span className="text-muted-foreground">Payment</span>
                      <PaymentStatusBadge status={campaign.paymentStatus} />
                    </div>
                    <div
                      className={cn(
                        raisedClass,
                        "flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 text-sm",
                      )}
                    >
                      <span className="text-muted-foreground">Production</span>
                      <ProductionStatusBadge
                        status={campaign.productionStatus}
                      />
                    </div>
                  </div>

                  <div className={cn(insetClass, "divide-y divide-hairline")}>
                    <IdRow
                      label="Print document"
                      value={campaign.printDocumentId}
                    />
                    <IdRow
                      label="Address list"
                      value={campaign.printAddressListId}
                    />
                    <IdRow label="Print job" value={campaign.printJobId} />
                    <IdRow
                      label="Payment intent"
                      value={campaign.paymentIntentId}
                    />
                  </div>

                  {campaign.lastError ? (
                    <Alert
                      variant="destructive"
                      data-ocid="campaign_detail.production.error.alert"
                    >
                      <AlertTriangle />
                      <AlertTitle>Last production error</AlertTitle>
                      <AlertDescription className="break-words">
                        {campaign.lastError}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <DraftExpiryNote expiresAt={campaign.draftExpiresAt} />

                  <Separator className="bg-hairline" />

                  {/* A full-width stack on phones, a wrapping row from sm. */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
                    {canPay ? (
                      <Button
                        type="button"
                        className="h-11 w-full gap-2 px-5 sm:h-10 sm:w-auto"
                        onClick={() => setPayOpen(true)}
                        data-ocid="campaign_detail.pay_now.button"
                      >
                        <CreditCard className="size-4" />
                        Pay now
                      </Button>
                    ) : null}
                    {canPay ? (
                      <Button
                        type="button"
                        variant={confirmDelete ? "destructive" : "outline"}
                        className="h-11 w-full gap-2 px-5 sm:h-10 sm:w-auto"
                        onClick={handleDeleteDraft}
                        onBlur={() => setConfirmDelete(false)}
                        disabled={deleteDraft.isPending}
                        data-ocid="campaign_detail.delete_draft.button"
                      >
                        {deleteDraft.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        {confirmDelete ? "Confirm delete" : "Delete draft"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={canPay ? "outline" : "default"}
                      className="h-11 w-full gap-2 px-5 sm:h-10 sm:w-auto"
                      onClick={handleDispatch}
                      disabled={!canDispatch || dispatchMutation.isPending}
                      title={
                        canDispatch
                          ? undefined
                          : isPaidOrWaived
                            ? "Already submitted"
                            : campaign?.paymentStatus === PaymentStatus.Refunded
                              ? "This order was refunded and won't be printed"
                              : "Pay first to enable dispatch"
                      }
                      data-ocid="campaign_detail.dispatch.button"
                    >
                      {dispatchMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Send to print
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full gap-2 px-5 sm:h-10 sm:w-auto"
                      onClick={handleSync}
                      disabled={syncMutation.isPending}
                      data-ocid="campaign_detail.sync.button"
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Sync USPS tracking
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full gap-2 px-4 sm:h-10 sm:w-auto"
                      onClick={handleExport}
                      disabled={exportMutation.isPending}
                      data-ocid="campaign_detail.export_secondary.button"
                    >
                      <Download className="size-4" />
                      Export mail list
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* QR analytics */}
              <Card data-ocid="campaign_detail.qr.panel">
                <CardHeader>
                  <PanelHeader
                    icon={ScanLine}
                    title="QR analytics"
                    description="Dynamic QR codes route through ezmailout.com/t/… so every scan is counted for this campaign."
                  />
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className={cn(
                        raisedClass,
                        "flex min-w-0 items-center justify-between gap-3 rounded-3xl px-5 py-4 sm:flex-col sm:items-stretch sm:justify-start",
                      )}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Total scans
                      </p>
                      <p className="font-display text-2xl font-black leading-none tracking-tight tabular-nums text-foreground sm:mt-auto sm:text-3xl">
                        {formatNumber(
                          qrStats ? qrStats.totalScans : campaign.qrScanCount,
                        )}
                      </p>
                    </div>
                    {/* Every piece carries the campaign's code (one print
                        file per campaign), so scans are counted, not told
                        apart by recipient. */}
                    <div
                      className={cn(
                        raisedClass,
                        "flex min-w-0 items-center justify-between gap-3 rounded-3xl px-5 py-4 sm:flex-col sm:items-stretch sm:justify-start",
                      )}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Latest scan
                      </p>
                      <p
                        className="font-display text-base font-black leading-tight tracking-tight tabular-nums text-foreground sm:mt-auto sm:text-lg"
                        data-ocid="campaign_detail.qr.latest_scan"
                      >
                        {qrStats?.recentScans[0]
                          ? formatTimestamp(qrStats.recentScans[0].timestamp)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      insetClass,
                      "flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm",
                    )}
                  >
                    <span className="text-muted-foreground">Destination</span>
                    {campaign.qrDestinationUrl ? (
                      <a
                        href={campaign.qrDestinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate rounded-sm font-mono text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                        data-ocid="campaign_detail.qr.destination.link"
                      >
                        <span className="truncate">
                          {campaign.qrDestinationUrl}
                        </span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No QR destination set
                      </span>
                    )}
                  </div>

                  <div>
                    <SectionLabel className="mb-2">Recent scans</SectionLabel>
                    {qrStatsQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading scans…
                      </div>
                    ) : !qrStats || qrStats.recentScans.length === 0 ? (
                      <MascotEmptyState
                        pose="mail"
                        size="sm"
                        title="No scans yet"
                        description="They appear here as recipients scan their mail piece."
                        className="rounded-3xl border border-dashed border-hairline-strong px-3"
                        data-ocid="campaign_detail.qr.empty.state"
                      />
                    ) : (
                      <ul
                        className={cn(
                          raisedClass,
                          "divide-y divide-hairline overflow-hidden",
                        )}
                        data-ocid="campaign_detail.qr.scan.list"
                      >
                        {qrStats.recentScans.map((scan, idx) => (
                          <li
                            key={`${scan.recipientId}-${scan.timestamp.toString()}`}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                            data-ocid={`campaign_detail.qr.scan.item.${idx + 1}`}
                          >
                            <span className="meta-mono truncate text-foreground">
                              {scan.recipientId}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {formatTimestamp(scan.timestamp)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 space-y-6">
              {/* Invoice */}
              <Card
                className="relative isolate overflow-hidden"
                data-ocid="campaign_detail.invoice.panel"
              >
                <div aria-hidden="true" className="ambient-glow-backdrop" />
                <CardHeader>
                  <PanelHeader icon={Receipt} title="Invoice" />
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div
                    className={cn(
                      raisedClass,
                      "divide-y divide-hairline overflow-hidden",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-muted-foreground">Pieces</span>
                      <span className="font-display text-xl font-black tracking-tight tabular-nums text-foreground">
                        {formatNumber(campaign.recipientCount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-muted-foreground">Unit price</span>
                      <span className="font-display text-xl font-black tracking-tight tabular-nums text-foreground">
                        {formatCents(campaign.unitPriceCents)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                    <span className="pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Total
                    </span>
                    <span className="stat-number min-w-0 break-all text-foreground lg:text-[length:2.5rem]">
                      {formatCents(invoiceTotal)}
                    </span>
                  </div>
                  {campaign.paymentStatus === PaymentStatus.Paid ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Charged</span>
                      <span className="meta-mono text-foreground">
                        {formatCents(campaign.totalAmountChargedCents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Status
                    </span>
                    <PaymentStatusBadge status={campaign.paymentStatus} />
                  </div>
                  {canPay ? (
                    <Button
                      type="button"
                      size="lg"
                      className="mt-1 w-full gap-2"
                      onClick={() => setPayOpen(true)}
                      data-ocid="campaign_detail.invoice.pay.button"
                    >
                      <CreditCard className="size-4" />
                      Pay {formatCents(invoiceTotal)}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              {/* Design preview */}
              {campaign.canvasState ? (
                <Card data-ocid="campaign_detail.design.panel">
                  <CardHeader>
                    <PanelHeader
                      icon={ImageIcon}
                      title="Design preview"
                      description={`Front side · ${campaign.canvasState.widthInches}" × ${campaign.canvasState.heightInches}"`}
                    />
                  </CardHeader>
                  <CardContent className="px-0">
                    {/* A strip of the studio's dotted workspace, edge to edge
                        in the card, around the artwork; the thumbnail keeps
                        the design's own print colours. */}
                    <figure className="studio-dotgrid m-0 overflow-x-auto border-y border-hairline px-3 py-6">
                      <CanvasThumbnail canvas={campaign.canvasState} />
                    </figure>
                  </CardContent>
                </Card>
              ) : null}

              {/* Admin override */}
              {isAdmin ? (
                <Card
                  className="border-primary/30"
                  data-ocid="campaign_detail.admin.panel"
                >
                  <CardHeader>
                    <PanelHeader
                      icon={ShieldCheck}
                      title="Override status"
                      action={<Badge variant="info">Admin</Badge>}
                      description="Records a manual tracking event and moves the campaign forward to the chosen stage."
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overrideTargets.length === 0 ? (
                      <p
                        className={cn(
                          insetClass,
                          "px-4 py-3 text-sm text-muted-foreground",
                        )}
                        data-ocid="campaign_detail.admin.override.unavailable"
                      >
                        {campaign.productionStatus !==
                        ProductionStatus.Submitted
                          ? "Stages can be set once the print job has been accepted."
                          : "This campaign has reached its last stage."}
                      </p>
                    ) : (
                      <>
                        <Label htmlFor="campaign-override-status">
                          New stage
                        </Label>
                        <Select
                          value={overrideStatus}
                          onValueChange={(value) =>
                            setOverrideStatus(value as CampaignStatus)
                          }
                        >
                          <SelectTrigger
                            id="campaign-override-status"
                            className="w-full"
                            data-ocid="campaign_detail.admin.status.select"
                          >
                            <SelectValue placeholder="Choose a stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {overrideTargets.map((stage) => (
                              <SelectItem
                                key={stage.key}
                                value={stage.key}
                                data-ocid={`campaign_detail.admin.status.option.${stage.key.toLowerCase()}`}
                              >
                                {stage.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          className="h-11 w-full sm:h-10"
                          onClick={handleOverride}
                          disabled={
                            !overrideStatus ||
                            !overrideTargets.some(
                              (s) => s.key === overrideStatus,
                            ) ||
                            overrideMutation.isPending
                          }
                          data-ocid="campaign_detail.admin.override.button"
                        >
                          {overrideMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Apply override
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          <PayNowDialog
            campaign={campaign}
            open={payOpen}
            onOpenChange={setPayOpen}
            onPaid={() => {
              campaignQuery.refetch();
              eventsQuery.refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}

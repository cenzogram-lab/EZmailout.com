import {
  type CampaignRecordShared,
  type CampaignStatus,
  type CanvasState,
  PaymentPurpose,
  PaymentStatus,
  ProductionStatus,
} from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import {
  CAMPAIGN_STAGES,
  PaymentStatusBadge,
  ProductionStatusBadge,
  StatusBadge,
} from "@/components/campaigns/StatusBadge";
import { TrackingTimeline } from "@/components/campaigns/TrackingTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  useDispatchClick2MailJob,
  useExportCampaign,
  useQrScanStats,
  useSyncClick2MailTracking,
  useTrackingEvents,
  useUpdateCampaignStatus,
} from "@/hooks/use-backend";
import { downloadText } from "@/lib/download";
import { formatNumber, formatTimestamp, layoutLabel } from "@/lib/format";
import { formatCents } from "@/lib/pricing";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Download,
  ExternalLink,
  Factory,
  Loader2,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const THUMB_WIDTH = 320;

function IdRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="max-w-[60%] truncate font-mono text-xs text-foreground"
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
      className="relative mx-auto overflow-hidden rounded-lg border shadow-sm"
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
          className="absolute object-contain"
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
          {block.text}
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-ocid="campaign_detail.pay_now.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">
            Pay for this campaign
          </DialogTitle>
          <DialogDescription>
            {formatNumber(campaign.recipientCount)} pieces ×{" "}
            {formatCents(campaign.unitPriceCents)} ={" "}
            <span className="font-semibold text-foreground">
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
          submitLabel={`Pay ${formatCents(total)}`}
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
  const dispatchMutation = useDispatchClick2MailJob();
  const syncMutation = useSyncClick2MailTracking();
  const overrideMutation = useUpdateCampaignStatus();

  const [payOpen, setPayOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<CampaignStatus | "">("");

  const campaign = campaignQuery.data ?? null;
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
            ? `Submitted to Click2Mail — job ${result.jobId}.`
            : "Dispatched to Click2Mail.",
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
      if (result.ok) {
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
        toast.error("The canister rejected the status override.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Override failed.");
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
        className="mb-4 gap-2 pl-0 text-muted-foreground hover:text-foreground"
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
      ) : !campaign ? (
        <div
          className="rounded-xl border border-dashed bg-card py-20 text-center"
          data-ocid="campaign_detail.not_found.state"
        >
          <p className="font-display text-lg font-semibold text-foreground">
            Campaign not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may belong to another account or the id is mistyped.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {campaign.name || "Untitled campaign"}
                </h1>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {campaign.id}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {layoutLabel(campaign.product.layoutVariant)} ·{" "}
                {campaign.product.productType}
                {campaign.product.colorOption
                  ? ` · ${campaign.product.colorOption}`
                  : ""}{" "}
                · {campaign.printSpec.mailClass} · Created{" "}
                {formatTimestamp(campaign.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
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

          {/* Tracking */}
          <Card className="surface-glow">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Delivery tracking
              </CardTitle>
              <CardDescription>
                Stage{" "}
                {Math.max(
                  1,
                  CAMPAIGN_STAGES.findIndex((s) => s.key === campaign.status) +
                    1,
                )}{" "}
                of {CAMPAIGN_STAGES.length} · updates arrive from USPS via
                Click2Mail webhooks and polling.
              </CardDescription>
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
            <div className="space-y-6 lg:col-span-2">
              {/* Production */}
              <Card data-ocid="campaign_detail.production.panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <Factory className="size-4 text-primary" />
                    Production
                  </CardTitle>
                  <CardDescription>
                    Payment, print job and Click2Mail identifiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <PaymentStatusBadge status={campaign.paymentStatus} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Production</span>
                      <ProductionStatusBadge
                        status={campaign.productionStatus}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border px-3 py-2">
                    <IdRow
                      label="Click2Mail document"
                      value={campaign.c2mDocumentId}
                    />
                    <IdRow
                      label="Click2Mail address list"
                      value={campaign.c2mAddressListId}
                    />
                    <IdRow label="Click2Mail job" value={campaign.c2mJobId} />
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

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {canPay ? (
                      <Button
                        type="button"
                        className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => setPayOpen(true)}
                        data-ocid="campaign_detail.pay_now.button"
                      >
                        <CreditCard className="size-4" />
                        Pay now
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={canPay ? "outline" : "default"}
                      className="gap-2"
                      onClick={handleDispatch}
                      disabled={!canDispatch || dispatchMutation.isPending}
                      title={
                        canDispatch
                          ? undefined
                          : isPaidOrWaived
                            ? "Already submitted"
                            : "Pay first to enable dispatch"
                      }
                      data-ocid="campaign_detail.dispatch.button"
                    >
                      {dispatchMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Dispatch to Click2Mail
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
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
                      className="gap-2"
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
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <ScanLine className="size-4 text-primary" />
                    QR analytics
                  </CardTitle>
                  <CardDescription>
                    Dynamic QR codes route through ezmailout.com/t/… so every
                    scan is attributed to a recipient.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total scans
                      </p>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {formatNumber(
                          qrStats ? qrStats.totalScans : campaign.qrScanCount,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Unique recipients
                      </p>
                      <p className="font-display text-2xl font-bold text-emerald-brand">
                        {formatNumber(qrStats ? qrStats.uniqueRecipients : 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Destination</span>
                    {campaign.qrDestinationUrl ? (
                      <a
                        href={campaign.qrDestinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-primary hover:underline"
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
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Recent scans
                    </p>
                    {qrStatsQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading scans…
                      </div>
                    ) : !qrStats || qrStats.recentScans.length === 0 ? (
                      <p
                        className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground"
                        data-ocid="campaign_detail.qr.empty.state"
                      >
                        No scans yet. They appear here as recipients scan their
                        mail piece.
                      </p>
                    ) : (
                      <ul
                        className="divide-y rounded-lg border"
                        data-ocid="campaign_detail.qr.scan.list"
                      >
                        {qrStats.recentScans.map((scan, idx) => (
                          <li
                            key={`${scan.recipientId}-${scan.timestamp.toString()}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                            data-ocid={`campaign_detail.qr.scan.item.${idx + 1}`}
                          >
                            <span className="truncate font-mono text-xs text-foreground">
                              {scan.recipientId}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
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

            <div className="space-y-6">
              {/* Invoice */}
              <Card data-ocid="campaign_detail.invoice.panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <Receipt className="size-4 text-primary" />
                    Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pieces</span>
                    <span className="font-mono">
                      {formatNumber(campaign.recipientCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unit price</span>
                    <span className="font-mono">
                      {formatCents(campaign.unitPriceCents)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="font-display text-lg font-bold text-foreground">
                      {formatCents(invoiceTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Charged</span>
                    <span className="font-mono">
                      {formatCents(campaign.totalAmountChargedCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Status
                    </span>
                    <PaymentStatusBadge status={campaign.paymentStatus} />
                  </div>
                  {canPay ? (
                    <Button
                      type="button"
                      className="mt-1 w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
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
                    <CardTitle className="font-display text-base">
                      Design preview
                    </CardTitle>
                    <CardDescription>
                      Front side · {campaign.canvasState.widthInches}" ×{" "}
                      {campaign.canvasState.heightInches}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <CanvasThumbnail canvas={campaign.canvasState} />
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
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                      <ShieldCheck className="size-4 text-primary" />
                      Override status
                      <Badge
                        variant="outline"
                        className="ml-auto border-primary/20 bg-primary/10 text-primary"
                      >
                        Admin
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Records a manual tracking event and moves the campaign to
                      the chosen stage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label htmlFor="campaign-override-status">New stage</Label>
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
                        {CAMPAIGN_STAGES.map((stage) => (
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
                      className="w-full"
                      onClick={handleOverride}
                      disabled={
                        !overrideStatus ||
                        overrideStatus === campaign.status ||
                        overrideMutation.isPending
                      }
                      data-ocid="campaign_detail.admin.override.button"
                    >
                      {overrideMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Apply override
                    </Button>
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

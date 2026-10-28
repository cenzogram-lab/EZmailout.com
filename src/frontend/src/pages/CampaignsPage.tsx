import {
  CampaignStatus,
  type CampaignSummary,
  ProductionStatus,
} from "@/backend";
import { DraftExpiry } from "@/components/campaigns/DraftExpiry";
import {
  GlossyTile,
  StatTile,
  raisedClass,
  titleGlowClass,
} from "@/components/campaigns/PanelParts";
import { SavePresetDialog } from "@/components/campaigns/SavePresetDialog";
import {
  PaymentStatusBadge,
  ProductionStatusBadge,
  StatusBadge,
  isDeliveryOutcome,
} from "@/components/campaigns/StatusBadge";
import { MascotEmptyState } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCampaignRecipients,
  useCampaigns,
  useExportCampaign,
} from "@/hooks/use-backend";
import { downloadText } from "@/lib/download";
import {
  formatNumber,
  formatTimestamp,
  layoutLabel,
  productTypeLabel,
} from "@/lib/format";
import { MAX_CAMPAIGN_NAME_CHARS } from "@/lib/inputLimits";
import { wireMailClassToCatalog } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookmarkPlus,
  Download,
  Eye,
  LayoutDashboard,
  Loader2,
  Mailbox,
  Repeat,
  Rocket,
  Send,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const RERUN_TOAST_ID = "campaigns-rerun";

function productLabel(campaign: CampaignSummary): string {
  return layoutLabel(campaign.product.layoutVariant);
}

function productSubLabel(campaign: CampaignSummary): string {
  const color = campaign.product.colorOption
    ? ` · ${campaign.product.colorOption}`
    : "";
  return `${productTypeLabel(campaign.product.productType)}${color}`;
}

interface RowActionsProps {
  campaign: CampaignSummary;
  index: number;
  exporting: boolean;
  rerunning: boolean;
  onExport: (campaign: CampaignSummary) => void;
  onSavePreset: (campaign: CampaignSummary) => void;
  onRerun: (campaign: CampaignSummary) => void;
}

function RowActions({
  campaign,
  index,
  exporting,
  rerunning,
  onExport,
  onSavePreset,
  onRerun,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5 xl:gap-1">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mr-auto h-11 gap-1.5 px-4 xl:mr-1 xl:h-8 xl:px-3"
        data-ocid={`campaigns.item.${index}.view.link`}
      >
        <Link to="/campaigns/$campaignId" params={{ campaignId: campaign.id }}>
          <Eye className="size-3.5" />
          View
        </Link>
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full text-muted-foreground xl:size-8"
            onClick={() => onExport(campaign)}
            disabled={exporting}
            aria-label="Export CSV"
            data-ocid={`campaigns.item.${index}.export.button`}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export CSV</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full text-muted-foreground xl:size-8"
            onClick={() => onSavePreset(campaign)}
            aria-label="Save audience as preset"
            data-ocid={`campaigns.item.${index}.save_preset.button`}
          >
            <BookmarkPlus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save audience as preset</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full text-muted-foreground xl:size-8"
            onClick={() => onRerun(campaign)}
            disabled={rerunning}
            aria-label="Re-run audience"
            data-ocid={`campaigns.item.${index}.rerun.button`}
          >
            {rerunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Repeat className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Re-run this audience in the wizard</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: campaigns,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useCampaigns();
  const exportMutation = useExportCampaign();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [presetTarget, setPresetTarget] = useState<CampaignSummary | null>(
    null,
  );
  const [presetOpen, setPresetOpen] = useState(false);
  const [rerunTarget, setRerunTarget] = useState<CampaignSummary | null>(null);
  const rerunRecipients = useCampaignRecipients(rerunTarget?.id ?? null);

  const resetWizard = useWizardStore((s) => s.reset);
  const setCampaignName = useWizardStore((s) => s.setCampaignName);
  const setProduct = useWizardStore((s) => s.setProduct);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setMailClass = useWizardStore((s) => s.setMailClass);
  const setAudienceType = useWizardStore((s) => s.setAudienceType);
  const setSourcePresetId = useWizardStore((s) => s.setSourcePresetId);
  const setVerifiedAddresses = useWizardStore((s) => s.setVerifiedAddresses);
  const setRecipientCount = useWizardStore((s) => s.setRecipientCount);
  const setCurrentStep = useWizardStore((s) => s.setCurrentStep);

  // Once the recipients for the re-run target arrive, seed the wizard and go.
  useEffect(() => {
    if (!rerunTarget) return;
    // A retry of a read that failed before waits for its refetch.
    if (rerunRecipients.isError && !rerunRecipients.isFetching) {
      toast.error("Could not load that campaign's audience.", {
        id: RERUN_TOAST_ID,
      });
      setRerunTarget(null);
      return;
    }
    if (rerunRecipients.data === undefined || rerunRecipients.isFetching)
      return;

    const addresses = rerunRecipients.data;
    const count = addresses.length || Number(rerunTarget.recipientCount);
    resetWizard();
    // Within the canister's name limit, and without stacking "(re-run)".
    const base = rerunTarget.name.replace(/(\s*\(re-run\))+$/, "");
    const suffix = " (re-run)";
    setCampaignName(
      `${base.slice(0, MAX_CAMPAIGN_NAME_CHARS - suffix.length).trimEnd()}${suffix}`,
    );
    setProduct(rerunTarget.product);
    setLayout(rerunTarget.product.layoutVariant);
    // The same class as the original (ignored when the format no longer
    // offers it, so the format's default stands).
    setMailClass(wireMailClassToCatalog(rerunTarget.mailClass));
    setAudienceType("preset");
    setSourcePresetId(null);
    setVerifiedAddresses(addresses);
    setRecipientCount(count);
    setCurrentStep(3);
    if (addresses.length === 0) {
      toast.warning(
        "No stored addresses for this campaign — the audience count was carried over.",
        { id: RERUN_TOAST_ID },
      );
    } else {
      toast.success(
        `Loaded ${formatNumber(addresses.length)} recipients into the wizard.`,
        { id: RERUN_TOAST_ID },
      );
    }
    setRerunTarget(null);
    navigate({ to: "/wizard" });
  }, [
    rerunTarget,
    rerunRecipients.data,
    rerunRecipients.isError,
    rerunRecipients.isFetching,
    navigate,
    resetWizard,
    setCampaignName,
    setProduct,
    setLayout,
    setMailClass,
    setAudienceType,
    setSourcePresetId,
    setVerifiedAddresses,
    setRecipientCount,
    setCurrentStep,
  ]);

  async function handleExport(campaign: CampaignSummary) {
    setExportingId(campaign.id);
    try {
      const csv = await exportMutation.mutateAsync(campaign.id);
      if (!csv) {
        toast.error("Nothing to export for this campaign.");
        return;
      }
      downloadText(`campaign_${campaign.id}_recipients.csv`, csv, "text/csv");
      toast.success("Mail list exported.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Try again.",
      );
    } finally {
      setExportingId(null);
    }
  }

  function handleSavePreset(campaign: CampaignSummary) {
    setPresetTarget(campaign);
    setPresetOpen(true);
  }

  function handleRerun(campaign: CampaignSummary) {
    toast.loading("Loading audience…", { id: RERUN_TOAST_ID });
    // Always a fresh read: the list may have changed, or the last read failed.
    void queryClient.invalidateQueries({
      queryKey: ["campaignRecipients", campaign.id],
    });
    setRerunTarget(campaign);
  }

  const list = campaigns ?? [];
  // Only campaigns handed to the print partner count as mailed; drafts and
  // campaigns still dispatching do not.
  const totalPieces = list
    .filter(
      (campaign) => campaign.productionStatus === ProductionStatus.Submitted,
    )
    .reduce((sum, campaign) => sum + Number(campaign.recipientCount), 0);
  const deliveredCount = list.filter(
    (campaign) => campaign.status === CampaignStatus.Delivered,
  ).length;
  const inFlightCount = list.filter(
    (campaign) =>
      !isDeliveryOutcome(campaign.status) &&
      campaign.status !== CampaignStatus.Created,
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative isolate mb-8">
        {/* The brand backlight behind the page title. */}
        <div aria-hidden="true" className={titleGlowClass} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <GlossyTile icon={LayoutDashboard} size="lg" />
            <div className="min-w-0">
              <h1 className="display-heading text-3xl sm:text-4xl">
                Campaign Portal
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Track production, delivery and results for every mailing.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="gap-2"
            data-ocid="campaigns.new_campaign.button"
          >
            <Link to="/wizard">
              <Rocket className="size-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {!isLoading && list.length > 0 ? (
        <div
          className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4"
          data-ocid="campaigns.summary.panel"
        >
          <StatTile
            label="Campaigns"
            icon={Mailbox}
            value={formatNumber(list.length)}
          />
          <StatTile
            label="Pieces mailed"
            icon={Send}
            value={formatNumber(totalPieces)}
            title={formatNumber(totalPieces)}
            valueClassName={
              // A million pieces and up steps down so it still fits a
              // narrow tablet tile.
              formatNumber(totalPieces).length > 7
                ? "sm:text-[length:clamp(1.75rem,15cqw,3rem)]"
                : undefined
            }
          />
          <StatTile
            label="In flight / delivered"
            icon={Truck}
            // Wraps at the " / " rather than cutting a count off; on phones
            // (label and number in one row) the label wraps first.
            valueClassName="whitespace-normal max-sm:max-w-[60%] max-sm:shrink-0 max-sm:text-right"
            value={
              <>
                <span className="text-primary">
                  {formatNumber(inFlightCount)}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-emerald-brand">
                  {formatNumber(deliveredCount)}
                </span>
              </>
            }
          />
        </div>
      ) : null}

      {isLoading ? (
        <div
          className="flex items-center justify-center py-20 text-muted-foreground"
          data-ocid="campaigns.loading.state"
        >
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading campaigns…
        </div>
      ) : isError && !campaigns ? (
        // Unreachable is not empty: "No mailouts yet" here read as if the
        // customer's campaigns were gone.
        <div
          className="surface-card px-4 py-10 text-center"
          data-ocid="campaigns.error.state"
        >
          <p className="font-display text-xl font-black tracking-tight text-foreground">
            We couldn't load your campaigns
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            EZmailout didn't answer just now. Your campaigns are safe; try again
            in a moment.
          </p>
          <Button
            variant="outline"
            className="mt-5 h-11 gap-2 px-5"
            onClick={() => void refetch()}
            disabled={isRefetching}
            data-ocid="campaigns.error.retry.button"
          >
            {isRefetching ? <Loader2 className="size-4 animate-spin" /> : null}
            Try again
          </Button>
        </div>
      ) : list.length === 0 ? (
        <div className="surface-card relative isolate overflow-hidden px-4 py-6">
          <div aria-hidden="true" className="ambient-glow-backdrop" />
          <MascotEmptyState
            pose="mail"
            title="No mailouts yet"
            description="Start your first campaign: pick a mail piece, build an audience and design it. The wizard takes about five minutes."
            data-ocid="campaigns.empty.state"
            action={
              <Button
                asChild
                size="lg"
                className="gap-2"
                data-ocid="campaigns.empty.cta.button"
              >
                <Link to="/wizard">
                  Start your first campaign
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table (from xl: below it the columns would scroll) */}
          <div className="surface-card hidden overflow-hidden xl:block">
            <Table data-ocid="campaigns.table">
              <TableHeader className="bg-card-raised">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-5">Campaign</TableHead>
                  <TableHead className="h-11">Product</TableHead>
                  <TableHead className="h-11 pr-8 text-right">
                    Audience
                  </TableHead>
                  <TableHead className="h-11">Payment</TableHead>
                  <TableHead className="h-11">Production</TableHead>
                  <TableHead className="h-11">Delivery</TableHead>
                  <TableHead className="h-11">Created</TableHead>
                  <TableHead className="h-11 pr-5 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((campaign, idx) => (
                  <TableRow
                    key={campaign.id}
                    className="hover:bg-muted/40"
                    data-ocid={`campaigns.item.${idx + 1}.row`}
                  >
                    <TableCell className="max-w-[240px] py-3.5 pl-5">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="block truncate rounded-sm font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                        data-ocid={`campaigns.item.${idx + 1}.name.link`}
                      >
                        {campaign.name || "Untitled campaign"}
                      </Link>
                      <span className="meta-mono">{campaign.id}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <p className="text-sm font-medium text-foreground">
                        {productLabel(campaign)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {productSubLabel(campaign)}
                      </p>
                    </TableCell>
                    <TableCell className="py-3.5 pr-8 text-right font-display text-lg font-black tracking-tight tabular-nums text-foreground">
                      {formatNumber(campaign.recipientCount)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <PaymentStatusBadge status={campaign.paymentStatus} />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <ProductionStatusBadge
                        status={campaign.productionStatus}
                      />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3.5 text-sm tabular-nums text-muted-foreground">
                      {formatTimestamp(campaign.createdAt, false)}
                      <DraftExpiry expiresAt={campaign.draftExpiresAt} />
                    </TableCell>
                    <TableCell className="py-3.5 pr-5">
                      <RowActions
                        campaign={campaign}
                        index={idx + 1}
                        exporting={exportingId === campaign.id}
                        rerunning={rerunTarget?.id === campaign.id}
                        onExport={handleExport}
                        onSavePreset={handleSavePreset}
                        onRerun={handleRerun}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phone, tablet and small-laptop cards (two columns from md) */}
          <div
            className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:hidden"
            data-ocid="campaigns.card.list"
          >
            {list.map((campaign, idx) => (
              <Card
                key={campaign.id}
                className="gap-4 py-4"
                data-ocid={`campaigns.item.${idx + 1}.card`}
              >
                <CardContent className="space-y-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* The name wraps (up to two lines) beside the badge,
                        so a phone never cuts a short name. */}
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="line-clamp-2 break-words rounded-sm font-display text-lg font-black leading-tight tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                        data-ocid={`campaigns.item.${idx + 1}.mobile_name.link`}
                      >
                        {campaign.name || "Untitled campaign"}
                      </Link>
                      <span className="meta-mono mt-1 block">
                        {campaign.id}
                      </span>
                    </div>
                    <StatusBadge status={campaign.status} className="mt-0.5" />
                  </div>
                  <dl
                    className={cn(
                      raisedClass,
                      "grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm",
                    )}
                  >
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-muted-foreground">
                        Product
                      </dt>
                      <dd className="font-medium text-foreground">
                        {productLabel(campaign)}
                        {/* From md the card stands in for the table, which
                            also showed the type and colour option. */}
                        <span className="hidden text-xs font-normal text-muted-foreground md:block">
                          {productSubLabel(campaign)}
                        </span>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-muted-foreground">
                        Audience
                      </dt>
                      <dd className="font-display text-xl font-black leading-tight tracking-tight tabular-nums text-foreground">
                        {formatNumber(campaign.recipientCount)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="mb-1 text-xs font-semibold text-muted-foreground">
                        Payment
                      </dt>
                      <dd>
                        <PaymentStatusBadge status={campaign.paymentStatus} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="mb-1 text-xs font-semibold text-muted-foreground">
                        Production
                      </dt>
                      <dd>
                        <ProductionStatusBadge
                          status={campaign.productionStatus}
                        />
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-semibold text-muted-foreground">
                        Created
                      </dt>
                      <dd className="tabular-nums text-foreground">
                        {formatTimestamp(campaign.createdAt, false)}
                        <DraftExpiry expiresAt={campaign.draftExpiresAt} />
                      </dd>
                    </div>
                  </dl>
                  <RowActions
                    campaign={campaign}
                    index={idx + 1}
                    exporting={exportingId === campaign.id}
                    rerunning={rerunTarget?.id === campaign.id}
                    onExport={handleExport}
                    onSavePreset={handleSavePreset}
                    onRerun={handleRerun}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <SavePresetDialog
        campaignId={presetTarget?.id ?? null}
        campaignName={presetTarget?.name}
        open={presetOpen}
        onOpenChange={setPresetOpen}
      />
    </div>
  );
}

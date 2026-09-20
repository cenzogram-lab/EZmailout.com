import { type CampaignRecordShared, CampaignStatus } from "@/backend";
import { SavePresetDialog } from "@/components/campaigns/SavePresetDialog";
import {
  PaymentStatusBadge,
  ProductionStatusBadge,
  StatusBadge,
} from "@/components/campaigns/StatusBadge";
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
import { formatNumber, formatTimestamp, layoutLabel } from "@/lib/format";
import { useWizardStore } from "@/store/wizard";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookmarkPlus,
  Download,
  Eye,
  LayoutDashboard,
  Loader2,
  Repeat,
  Rocket,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const RERUN_TOAST_ID = "campaigns-rerun";

function productLabel(campaign: CampaignRecordShared): string {
  return layoutLabel(campaign.product.layoutVariant);
}

function productSubLabel(campaign: CampaignRecordShared): string {
  const color = campaign.product.colorOption
    ? ` · ${campaign.product.colorOption}`
    : "";
  return `${campaign.product.productType}${color}`;
}

interface RowActionsProps {
  campaign: CampaignRecordShared;
  index: number;
  exporting: boolean;
  rerunning: boolean;
  onExport: (campaign: CampaignRecordShared) => void;
  onSavePreset: (campaign: CampaignRecordShared) => void;
  onRerun: (campaign: CampaignRecordShared) => void;
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
    <div className="flex items-center justify-end gap-1">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="gap-1.5"
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
            variant="ghost"
            size="icon"
            className="size-8"
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
            variant="ghost"
            size="icon"
            className="size-8"
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
            variant="ghost"
            size="icon"
            className="size-8"
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
  const { data: campaigns, isLoading } = useCampaigns();
  const exportMutation = useExportCampaign();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [presetTarget, setPresetTarget] = useState<CampaignRecordShared | null>(
    null,
  );
  const [presetOpen, setPresetOpen] = useState(false);
  const [rerunTarget, setRerunTarget] = useState<CampaignRecordShared | null>(
    null,
  );
  const rerunRecipients = useCampaignRecipients(rerunTarget?.id ?? null);

  const resetWizard = useWizardStore((s) => s.reset);
  const setCampaignName = useWizardStore((s) => s.setCampaignName);
  const setProduct = useWizardStore((s) => s.setProduct);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setAudienceType = useWizardStore((s) => s.setAudienceType);
  const setSourcePresetId = useWizardStore((s) => s.setSourcePresetId);
  const setVerifiedAddresses = useWizardStore((s) => s.setVerifiedAddresses);
  const setRecipientCount = useWizardStore((s) => s.setRecipientCount);
  const setCurrentStep = useWizardStore((s) => s.setCurrentStep);

  // Once the recipients for the re-run target arrive, seed the wizard and go.
  useEffect(() => {
    if (!rerunTarget) return;
    if (rerunRecipients.isError) {
      toast.error("Could not load that campaign's audience.", {
        id: RERUN_TOAST_ID,
      });
      setRerunTarget(null);
      return;
    }
    if (rerunRecipients.data === undefined) return;

    const addresses = rerunRecipients.data;
    const count = addresses.length || Number(rerunTarget.recipientCount);
    resetWizard();
    setCampaignName(`${rerunTarget.name} (re-run)`);
    setProduct(rerunTarget.product);
    setLayout(rerunTarget.product.layoutVariant);
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
    navigate,
    resetWizard,
    setCampaignName,
    setProduct,
    setLayout,
    setAudienceType,
    setSourcePresetId,
    setVerifiedAddresses,
    setRecipientCount,
    setCurrentStep,
  ]);

  async function handleExport(campaign: CampaignRecordShared) {
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

  function handleSavePreset(campaign: CampaignRecordShared) {
    setPresetTarget(campaign);
    setPresetOpen(true);
  }

  function handleRerun(campaign: CampaignRecordShared) {
    toast.loading("Loading audience…", { id: RERUN_TOAST_ID });
    setRerunTarget(campaign);
  }

  const list = campaigns ?? [];
  const totalPieces = list.reduce(
    (sum, campaign) => sum + Number(campaign.recipientCount),
    0,
  );
  const deliveredCount = list.filter(
    (campaign) => campaign.status === CampaignStatus.Delivered,
  ).length;
  const inFlightCount = list.filter(
    (campaign) =>
      campaign.status !== CampaignStatus.Delivered &&
      campaign.status !== CampaignStatus.Created,
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Campaign Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Track production, delivery and results for every mailing.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          data-ocid="campaigns.new_campaign.button"
        >
          <Link to="/wizard">
            <Rocket className="size-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {!isLoading && list.length > 0 ? (
        <div
          className="mb-6 grid gap-3 sm:grid-cols-3"
          data-ocid="campaigns.summary.panel"
        >
          <Card className="gap-1 py-4">
            <CardContent className="px-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Campaigns
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                {formatNumber(list.length)}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-1 py-4">
            <CardContent className="px-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pieces mailed
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                {formatNumber(totalPieces)}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-1 py-4">
            <CardContent className="px-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                In flight / delivered
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                <span className="text-accent">
                  {formatNumber(inFlightCount)}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-emerald-brand">
                  {formatNumber(deliveredCount)}
                </span>
              </p>
            </CardContent>
          </Card>
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
      ) : list.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-20 text-center"
          data-ocid="campaigns.empty.state"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LayoutDashboard className="size-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
            No campaigns yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Pick a product, build an audience and design your piece — the wizard
            takes about five minutes.
          </p>
          <Button
            asChild
            className="mt-6 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-ocid="campaigns.empty.cta.button"
          >
            <Link to="/wizard">
              Launch your first campaign
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table data-ocid="campaigns.table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Campaign</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Audience</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((campaign, idx) => (
                  <TableRow
                    key={campaign.id}
                    data-ocid={`campaigns.item.${idx + 1}.row`}
                  >
                    <TableCell className="max-w-[240px]">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                        data-ocid={`campaigns.item.${idx + 1}.name.link`}
                      >
                        {campaign.name || "Untitled campaign"}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {campaign.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">
                        {productLabel(campaign)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {productSubLabel(campaign)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(campaign.recipientCount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={campaign.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <ProductionStatusBadge
                        status={campaign.productionStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(campaign.createdAt, false)}
                    </TableCell>
                    <TableCell>
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

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden" data-ocid="campaigns.card.list">
            {list.map((campaign, idx) => (
              <Card
                key={campaign.id}
                className="gap-4 py-4"
                data-ocid={`campaigns.item.${idx + 1}.card`}
              >
                <CardContent className="space-y-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="block truncate font-display font-semibold text-foreground"
                        data-ocid={`campaigns.item.${idx + 1}.mobile_name.link`}
                      >
                        {campaign.name || "Untitled campaign"}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {campaign.id}
                      </span>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Product</dt>
                      <dd className="text-foreground">
                        {productLabel(campaign)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Audience
                      </dt>
                      <dd className="font-mono text-foreground">
                        {formatNumber(campaign.recipientCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Payment</dt>
                      <dd>
                        <PaymentStatusBadge status={campaign.paymentStatus} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Production
                      </dt>
                      <dd>
                        <ProductionStatusBadge
                          status={campaign.productionStatus}
                        />
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Created</dt>
                      <dd className="text-foreground">
                        {formatTimestamp(campaign.createdAt, false)}
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

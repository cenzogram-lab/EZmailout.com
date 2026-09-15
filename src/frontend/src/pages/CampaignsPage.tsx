import { CampaignStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns, useExportCampaign } from "@/hooks/use-backend";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Download,
  LayoutDashboard,
  Loader2,
  Rocket,
} from "lucide-react";

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

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts / 1_000_000n));
  return d.toLocaleDateString();
}

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const exportMutation = useExportCampaign();

  async function handleExport(campaignId: string) {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Campaign Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor and manage your direct mail campaigns.
            </p>
          </div>
        </div>
        <Link to="/">
          <Button
            variant="outline"
            className="gap-2"
            data-ocid="campaigns.new_campaign_button"
          >
            <Rocket className="size-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading campaigns…
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-20 text-center">
          <LayoutDashboard className="size-12 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
            No campaigns yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by launching one from the wizard.
          </p>
          <Link to="/" className="mt-4">
            <Button className="gap-2" data-ocid="campaigns.empty_state_button">
              Launch Campaign
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Campaign ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Audience Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c, idx) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  data-ocid={`campaigns.item.${idx + 1}.row`}
                >
                  <TableCell
                    className="font-mono text-xs"
                    onClick={() => {
                      window.location.href = `/campaigns/${c.id}`;
                    }}
                  >
                    <Link
                      to="/campaigns/$campaignId"
                      params={{ campaignId: c.id }}
                      className="text-primary hover:underline"
                      data-ocid={`campaigns.item.${idx + 1}.link`}
                    >
                      {c.id}
                    </Link>
                  </TableCell>
                  <TableCell
                    onClick={() => {
                      window.location.href = `/campaigns/${c.id}`;
                    }}
                  >
                    {c.product.productType}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={() => {
                      window.location.href = `/campaigns/${c.id}`;
                    }}
                  >
                    {Number(c.recipientCount).toLocaleString()}
                  </TableCell>
                  <TableCell
                    onClick={() => {
                      window.location.href = `/campaigns/${c.id}`;
                    }}
                  >
                    {statusBadge(c.status)}
                  </TableCell>
                  <TableCell
                    onClick={() => {
                      window.location.href = `/campaigns/${c.id}`;
                    }}
                  >
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(c.id);
                      }}
                      disabled={exportMutation.isPending}
                      data-ocid={`campaigns.item.${idx + 1}.export_button`}
                    >
                      {exportMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      Export
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

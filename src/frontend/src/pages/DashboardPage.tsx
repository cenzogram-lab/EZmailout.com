import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { StatusBadge } from "@/components/campaigns/StatusBadge";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { CreditsWidget } from "@/components/dashboard/CreditsWidget";
import { ReferralWidget } from "@/components/dashboard/ReferralWidget";
import { SubscriptionWidget } from "@/components/dashboard/SubscriptionWidget";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { useCampaigns } from "@/hooks/use-backend";
import { formatNumber, formatTimestamp, layoutLabel } from "@/lib/format";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Mailbox,
  Plus,
  Rocket,
} from "lucide-react";
import { useEffect } from "react";

const RECENT_LIMIT = 5;

function RecentCampaigns() {
  const { data: campaigns, isLoading } = useCampaigns();
  const recent = [...(campaigns ?? [])]
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, RECENT_LIMIT);

  return (
    <Card data-ocid="dashboard.recent_campaigns.card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mailbox className="size-4 text-primary" />
              Recent campaigns
            </CardTitle>
            <CardDescription>
              Your latest mailings and where they are in the pipeline.
            </CardDescription>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1"
            data-ocid="dashboard.recent_campaigns.all.link"
          >
            <Link to="/campaigns">
              All campaigns <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading campaigns…
          </div>
        ) : recent.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-8 text-center"
            data-ocid="dashboard.recent_campaigns.empty"
          >
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Launch your first mailing in minutes.
            </p>
            <Button
              asChild
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="dashboard.recent_campaigns.new.link"
            >
              <Link to="/wizard">
                <Rocket className="size-4" /> New campaign
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((campaign, idx) => (
              <li
                key={campaign.id}
                data-ocid={`dashboard.recent_campaigns.item.${idx + 1}`}
              >
                <Link
                  to="/campaigns/$campaignId"
                  params={{ campaignId: campaign.id }}
                  className="flex items-center justify-between gap-3 py-3 transition-smooth hover:bg-muted/40"
                  data-ocid={`dashboard.recent_campaigns.item.${idx + 1}.link`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {campaign.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {layoutLabel(campaign.product.layoutVariant)} ·{" "}
                      {formatNumber(campaign.recipientCount)} recipients ·{" "}
                      {formatTimestamp(campaign.createdAt, false)}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLinks() {
  return (
    <Card data-ocid="dashboard.quick_links.card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <Button
          asChild
          className="justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="dashboard.quick_links.wizard.link"
        >
          <Link to="/wizard">
            <Plus className="size-4" /> New campaign
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="justify-start gap-2"
          data-ocid="dashboard.quick_links.templates.link"
        >
          <Link to="/templates">
            <LayoutTemplate className="size-4" /> Browse templates
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="justify-start gap-2"
          data-ocid="dashboard.quick_links.campaigns.link"
        >
          <Link to="/campaigns">
            <Mailbox className="size-4" /> Campaign tracking
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { isAuthenticated, isInitializing } = useAccountSync();
  const hash = useRouterState({ select: (s) => s.location.hash });

  // `/dashboard#referrals` (Stampy's Referral Rewards chip): the sections only
  // exist once signed in, so scroll after they render.
  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id || !isAuthenticated) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, isAuthenticated]);

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      data-ocid="dashboard.page"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Membership, AI credits, referrals and your latest campaigns.
          </p>
        </div>
      </div>

      {isInitializing ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking your session…
        </div>
      ) : !isAuthenticated ? (
        <SignInPrompt message="Sign in with Internet Identity to see your dashboard, credits and referral rewards." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-1">
            <AccountCard />
            <SubscriptionWidget />
          </div>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <QuickLinks />
            <RecentCampaigns />
            <CreditsWidget />
            <div id="referrals" className="scroll-mt-24">
              <ReferralWidget />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

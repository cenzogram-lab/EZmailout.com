import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { StatusBadge } from "@/components/campaigns/StatusBadge";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { CreditsWidget } from "@/components/dashboard/CreditsWidget";
import { ReferralWidget } from "@/components/dashboard/ReferralWidget";
import { RewardsBanner } from "@/components/dashboard/RewardsBanner";
import { SubscriptionWidget } from "@/components/dashboard/SubscriptionWidget";
import { MascotEmptyState } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { GroupedList, GroupedListRow } from "@/components/ui/grouped-list";
import { LoadError } from "@/components/ui/load-error";
import { useAccountSync } from "@/hooks/use-account";
import { useCampaigns } from "@/hooks/use-backend";
import { formatNumber, formatTimestamp, layoutLabel } from "@/lib/format";
import { Link, useRouterState } from "@tanstack/react-router";
import {
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
  const {
    data: campaigns,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useCampaigns();
  const recent = [...(campaigns ?? [])]
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, RECENT_LIMIT);

  if (isLoading) {
    return (
      // Rows shaped like the real ones, so the cards below do not jump when
      // the list arrives.
      <GroupedList title="Recent campaigns">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5"
            aria-hidden="true"
          >
            <span className="size-9 shrink-0 animate-pulse rounded-xl bg-muted" />
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-4 w-2/5 animate-pulse rounded bg-muted" />
              <span className="block h-3 w-3/5 animate-pulse rounded bg-muted/70" />
            </span>
          </div>
        ))}
        <output className="sr-only">Loading campaigns…</output>
      </GroupedList>
    );
  }
  if (isError && !campaigns) {
    return (
      <GroupedList
        title="Recent campaigns"
        data-ocid="dashboard.recent_campaigns.card"
      >
        <LoadError
          what="your recent campaigns"
          onRetry={() => void refetch()}
          retrying={isRefetching}
          data-ocid="dashboard.recent_campaigns.error"
        />
      </GroupedList>
    );
  }
  if (recent.length === 0) {
    return (
      <GroupedList
        title="Recent campaigns"
        data-ocid="dashboard.recent_campaigns.card"
      >
        <MascotEmptyState
          pose="mail"
          title="No mailouts yet"
          description="Start your first campaign: it takes about five minutes."
          data-ocid="dashboard.recent_campaigns.empty"
          action={
            <Button
              asChild
              className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="dashboard.recent_campaigns.new.link"
            >
              <Link to="/wizard">
                <Rocket className="size-4" /> New campaign
              </Link>
            </Button>
          }
        />
      </GroupedList>
    );
  }
  return (
    <GroupedList
      title="Recent campaigns"
      data-ocid="dashboard.recent_campaigns.card"
    >
      {recent.map((campaign, idx) => (
        <GroupedListRow
          key={campaign.id}
          to={`/campaigns/${campaign.id}`}
          icon={Mailbox}
          label={campaign.name}
          description={`${layoutLabel(campaign.product.layoutVariant)} · ${formatNumber(campaign.recipientCount)} recipients · ${formatTimestamp(campaign.createdAt, false)}`}
          value={<StatusBadge status={campaign.status} />}
          data-ocid={`dashboard.recent_campaigns.item.${idx + 1}.link`}
        />
      ))}
      <GroupedListRow
        to="/campaigns"
        icon={LayoutDashboard}
        label="All campaigns"
        data-ocid="dashboard.recent_campaigns.all.link"
      />
    </GroupedList>
  );
}

function QuickLinks() {
  return (
    <GroupedList title="Create" data-ocid="dashboard.quick_links.card">
      <GroupedListRow
        to="/wizard"
        icon={Plus}
        label="New campaign"
        description="Product, audience, design and checkout in four steps"
        data-ocid="dashboard.quick_links.wizard.link"
      />
      <GroupedListRow
        to="/templates"
        icon={LayoutTemplate}
        label="Browse templates"
        description="Print-ready starting points for every format"
        data-ocid="dashboard.quick_links.templates.link"
      />
      <GroupedListRow
        to="/campaigns"
        icon={Mailbox}
        label="Campaign tracking"
        description="Production, USPS scans and QR results"
        data-ocid="dashboard.quick_links.campaigns.link"
      />
    </GroupedList>
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
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Membership, AI credits, referrals and your latest campaigns.
        </p>
      </div>

      {isInitializing ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking your session…
        </div>
      ) : !isAuthenticated ? (
        <SignInPrompt message="Sign in with Internet Identity to see your dashboard, credits and referral rewards." />
      ) : (
        <div className="space-y-6">
          <RewardsBanner />
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
        </div>
      )}
    </div>
  );
}

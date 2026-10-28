import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { StatusBadge } from "@/components/campaigns/StatusBadge";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { CreditsWidget } from "@/components/dashboard/CreditsWidget";
import { PaymentHistory } from "@/components/dashboard/PaymentHistory";
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
import { useEffect, useLayoutEffect, useState } from "react";

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
              size="lg"
              className="gap-2 px-5"
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
          // No stage icon: the row's mail tile already carries one, and the
          // narrower pill leaves the campaign name its room (on a phone it
          // drops under the name and description instead).
          value={<StatusBadge status={campaign.status} showIcon={false} />}
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

/**
 * The sticky left column (from `lg`). While it fits the window it rests just
 * under the floating header. When it is taller (a laptop screen, or the
 * membership checkout opened inside it) it scrolls along with the page in
 * either direction until one of its ends is in view and only then holds:
 * scrolling down reveals its bottom, scrolling up its top, so every card
 * and button in it stays reachable, and content that grows inside it (the
 * checkout) opens downward from where it is. `top` is written to the element
 * directly, so scrolling never re-renders the page.
 */
function useStickyColumn(el: HTMLElement | null) {
  useLayoutEffect(() => {
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    let min = 0;
    let max = 0;
    let top: number | null = null;
    let lastY = window.scrollY;
    const apply = (delta: number) => {
      const next = Math.round(
        Math.min(max, Math.max(min, (top ?? max) - delta)),
      );
      if (next !== top) {
        top = next;
        el.style.top = `${next}px`;
      }
    };
    const measure = () => {
      const header = document.querySelector("header");
      max = (header?.getBoundingClientRect().bottom ?? 96) + 24;
      min = Math.min(max, window.innerHeight - el.offsetHeight - 24);
      apply(0);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (wide.matches) apply(delta);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      el.style.top = "";
    };
  }, [el]);
}

export function DashboardPage() {
  const { isAuthenticated, isInitializing } = useAccountSync();
  const hash = useRouterState({ select: (s) => s.location.hash });
  // A callback ref: the column mounts only once the session is known.
  const [leftColumn, setLeftColumn] = useState<HTMLDivElement | null>(null);
  useStickyColumn(leftColumn);

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
      className="relative isolate mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      data-ocid="dashboard.page"
    >
      {/* Brand backlight behind the title and the rewards hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,var(--glow-brand),transparent_75%)]"
      />
      <div className="mb-6">
        <h1 className="display-heading text-3xl sm:text-4xl">Dashboard</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
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
          {/* Two columns from `lg`: you and your campaigns on the left (it
              stays in view while the wider money column scrolls past),
              credits, payments and referrals on the right. Phones read the
              cards in the same order, one under another. */}
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <div
              ref={setLeftColumn}
              className="min-w-0 space-y-6 lg:sticky lg:col-span-1"
            >
              <AccountCard />
              <SubscriptionWidget />
              <QuickLinks />
              <RecentCampaigns />
            </div>
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <CreditsWidget />
              <PaymentHistory />
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

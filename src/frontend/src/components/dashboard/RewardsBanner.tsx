import { StampyStep1Catalog } from "@/components/stampy";
import { useAccountSync } from "@/hooks/use-account";
import { formatNumber } from "@/lib/format";
import { useAccountStore } from "@/store/account";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";

/**
 * Credits and referral rewards at a glance: the balance on the left and
 * Stampy leaning in from the right edge. "See how you earn" jumps to the
 * referral section, where a referred member's first payment earns a free
 * month.
 */
export function RewardsBanner() {
  const { account, creditBalance } = useAccountSync();
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const freeMonths = account ? Number(account.freeMonthsAvailable) : 0;

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
      data-ocid="dashboard.rewards.banner"
      aria-label="Credits and rewards"
    >
      {/* Soft brand glow under the mascot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-10 -z-10 size-64 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative z-10 max-w-[64%] p-5 sm:max-w-[70%] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-ink">
          Credits &amp; rewards
        </p>
        <p className="mt-1.5 flex items-baseline gap-2 font-display font-bold tracking-tight text-foreground">
          <span
            className="text-4xl sm:text-5xl"
            data-ocid="dashboard.rewards.credits"
          >
            {account ? (
              formatNumber(creditBalance)
            ) : (
              <span
                className="inline-block h-9 w-16 animate-pulse rounded-lg bg-muted align-bottom sm:h-11"
                aria-label="Loading credits"
              />
            )}
          </span>
          <span className="text-base font-semibold text-muted-foreground">
            credits
          </span>
        </p>
        <Link
          to="/dashboard"
          hash="referrals"
          className="mt-1.5 inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          data-ocid="dashboard.rewards.earn.link"
        >
          {account
            ? `${freeMonths} free ${freeMonths === 1 ? "month" : "months"} · `
            : ""}
          See how you earn
          <ChevronRight className="size-4" />
        </Link>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            data-ocid="dashboard.rewards.top_up.button"
          >
            <Plus className="size-4" /> Top up credits
          </button>
        </div>
      </div>
      <StampyStep1Catalog className="mascot-shadow pointer-events-none absolute -bottom-4 -right-5 size-40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-700 sm:-right-3 sm:size-52" />
    </section>
  );
}

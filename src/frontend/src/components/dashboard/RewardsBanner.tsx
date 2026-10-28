import { MascotStage } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { useAccountSync } from "@/hooks/use-account";
import { formatNumber } from "@/lib/format";
import { useAccountStore } from "@/store/account";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";

/**
 * Credits and referral rewards at a glance: the balance as a huge figure on
 * the left and Stampy on stage at the right edge, in the brand backlight.
 * "See how you earn" jumps to the referral section, where a referred
 * member's first payment earns a free month.
 */
export function RewardsBanner() {
  const { account, creditBalance } = useAccountSync();
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const freeMonths = account ? Number(account.freeMonthsAvailable) : 0;

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl border border-hairline bg-card shadow-surface"
      data-ocid="dashboard.rewards.banner"
      aria-label="Credits and rewards"
    >
      {/* Brand backlight from the top edge, and a pool of indigo under
          Stampy. Both sit behind the text on the solid card. */}
      <div aria-hidden className="ambient-glow-backdrop" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 -z-10 size-80 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20"
      />
      {/* The airmail stripe along the top edge. */}
      <div
        aria-hidden
        className="airmail-stripe pointer-events-none absolute inset-x-0 top-0 opacity-80"
      />
      {/* On a phone the text runs the card's full width, the Top up button
          sits right under the link (the row is top-aligned, so Stampy's
          height never pushes it down) and Stampy fills the lower right
          beside it, inset from the rounded corner so the radius never crops
          him (a size smaller below 360 px so he still fits there; if he
          ever does not, the row wraps him under the button rather than
          overlapping it). From `sm` he is staged at the right edge
          (positioned against the section: the text column is static there)
          and the text keeps to the left two thirds. */}
      <div className="relative z-10 p-5 pt-6 sm:static sm:max-w-[68%] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-ink">
          Credits &amp; rewards
        </p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0 font-display text-foreground">
          <span
            className="text-5xl font-black leading-none tracking-tighter tabular-nums sm:text-6xl md:text-7xl"
            data-ocid="dashboard.rewards.credits"
          >
            {account ? (
              formatNumber(creditBalance)
            ) : (
              <span
                className="inline-block h-12 w-20 animate-pulse rounded-xl bg-muted align-bottom sm:h-14 md:h-16"
                aria-label="Loading credits"
              />
            )}
          </span>
          <span className="text-base font-bold text-muted-foreground">
            credits
          </span>
        </p>
        <Link
          to="/dashboard"
          hash="referrals"
          className="mt-2 inline-block rounded-md py-1 text-sm font-medium leading-snug text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
          data-ocid="dashboard.rewards.earn.link"
        >
          {account
            ? `${freeMonths} free ${freeMonths === 1 ? "month" : "months"} · `
            : ""}
          See how you earn
          <ChevronRight className="ml-0.5 inline size-4 align-[-3px]" />
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-3 max-[359px]:gap-x-2 sm:mt-4">
          <Button
            type="button"
            size="lg"
            onClick={() => setTopUpOpen(true)}
            className="gap-1.5 px-5"
            data-ocid="dashboard.rewards.top_up.button"
          >
            <Plus className="size-4" /> Top up credits
          </Button>
          <MascotStage
            pose="mail"
            size="lg"
            className="pointer-events-none -mb-1 ml-auto mr-1 shrink-0 max-[359px]:mr-0 sm:absolute sm:bottom-1 sm:right-6 sm:mb-0 sm:mr-0 md:right-10"
            mascotClassName="size-[4.5rem] min-[360px]:size-24 min-[400px]:size-28 sm:size-48 md:size-52"
          />
        </div>
      </div>
    </section>
  );
}

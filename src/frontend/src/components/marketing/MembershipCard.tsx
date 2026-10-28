import { Button } from "@/components/ui/button";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Gift,
  Layers,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { BRAND_PANEL, BRAND_PANEL_INSET } from "./tactile";

interface Perk {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PERKS: Perk[] = [
  {
    icon: Tag,
    title: "The 10,000-piece rate on small batches",
    description:
      "On volume-priced sizes (4.25 × 6, 6 × 9 and 6 × 11 postcards, letters, trifold brochures) members pay the 10,000-piece price, and any lower 50,000-piece price past that. Smaller orders cost more per piece, because each card payment carries a fixed fee; Step 4 shows the exact price.",
  },
  {
    icon: Layers,
    title: "No minimum volume",
    description:
      "Test a single postcard or mail a whole city: there is no minimum order.",
  },
  {
    icon: Sparkles,
    title: `${MONTHLY_ALLOWANCE} AI credits with every pass`,
    description:
      "Generate backgrounds and copy in the AI Studio without buying a credit pack.",
  },
  {
    icon: Gift,
    title: "Referral rewards",
    description: `Earn one free month for every referred user whose first payment of ${formatCents(SUBSCRIPTION_PRICE_CENTS)} or more comes while your membership is active.`,
  },
];

const INCLUDED = [
  "30 days, never renews by itself",
  "EZmailout print & USPS delivery",
  "Real-time IMb tracking",
  "Dynamic QR tracking links",
];

/** The $9 30-day platform membership card used on the landing page. */
export function MembershipCard() {
  return (
    <div
      className="surface-card relative overflow-hidden"
      data-ocid="membership.card.panel"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Price column: the glossy indigo panel. */}
        <div className={`${BRAND_PANEL} p-6 sm:p-10`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 -z-10 size-72 rounded-full bg-black/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />
          <div className="relative">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
              Platform membership
            </span>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-display text-7xl font-black leading-none tracking-[-0.05em] tabular-nums">
                {formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "")}
              </span>
              <span className="pb-1.5 font-mono text-sm font-semibold tracking-wider text-primary-foreground">
                / 30 days
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground">
              One flat fee gets you the 10,000-piece rate on small batches. Pay
              per piece only for what you actually mail.
            </p>
            <ul className={`${BRAND_PANEL_INSET} mt-6 space-y-2.5 p-4`}>
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-primary-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
                    <Check
                      className="size-3 text-primary-foreground"
                      strokeWidth={3}
                    />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="mt-8 h-12 w-full gap-2 px-7 text-base sm:w-auto"
            >
              <Link to="/dashboard" data-ocid="membership.start.link">
                Start membership
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Perks column */}
        <div className="p-6 sm:p-10">
          <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
            What your membership unlocks
          </h3>
          <ul className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-brand/25 bg-gradient-to-b from-emerald-brand/20 to-emerald-brand/5 text-emerald-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
                  <perk.icon className="size-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">
                    {perk.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {perk.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-7 rounded-2xl border border-dashed border-hairline-strong bg-well px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Membership billing and per-piece charges go through our secure
            payment processor. Sign in with Internet Identity to activate — no
            card is needed until you launch.
          </p>
        </div>
      </div>
    </div>
  );
}

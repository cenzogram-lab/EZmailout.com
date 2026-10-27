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
      className="surface-glow relative overflow-hidden rounded-2xl border border-border bg-card"
      data-ocid="membership.card.panel"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-primary" />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Price column */}
        <div className="relative overflow-hidden border-b border-border bg-primary p-8 text-primary-foreground lg:border-b-0 lg:border-r sm:p-10">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
              Platform membership
            </span>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-display text-6xl font-extrabold leading-none tracking-tight">
                {formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "")}
              </span>
              <span className="pb-1 text-base text-primary-foreground">
                / 30 days
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground">
              One flat fee gets you the 10,000-piece rate on small batches. Pay
              per piece only for what you actually mail.
            </p>
            <ul className="mt-6 space-y-2">
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-primary-foreground"
                >
                  <Check className="size-4 shrink-0 text-primary-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-8 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              <Link to="/dashboard" data-ocid="membership.start.link">
                Start membership
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Perks column */}
        <div className="p-8 sm:p-10">
          <h3 className="font-display text-xl font-bold text-foreground">
            What your membership unlocks
          </h3>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-brand/10 text-emerald-brand">
                  <perk.icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {perk.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {perk.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Membership billing and per-piece charges go through our secure
            payment processor. Sign in with Internet Identity to activate — no
            card is needed until you launch.
          </p>
        </div>
      </div>
    </div>
  );
}

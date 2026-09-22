import { BookDemoModal } from "@/components/BookDemoModal";
import { MembershipCard } from "@/components/marketing/MembershipCard";
import { PricingCalculator } from "@/components/marketing/PricingCalculator";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { Button } from "@/components/ui/button";
import { AI_COSTS, CREDIT_PACKS, MONTHLY_ALLOWANCE } from "@/lib/credits";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Barcode,
  Check,
  Image as ImageIcon,
  Layers,
  MapPin,
  Minus,
  Palette,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Truck,
  Type,
  Upload,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

/* ─── Shared section shell ─── */
function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20 lg:px-8 ${className}`}
    >
      <div className="mb-10 text-center">
        {eyebrow && (
          <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─── Animated Mail Pipeline Widget ─── */
function PipelineStage({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {children}
      <div className="text-center">
        <div className="text-xs font-semibold text-foreground sm:text-sm">
          {label}
        </div>
        <div className="hidden text-[11px] text-muted-foreground sm:block">
          {caption}
        </div>
      </div>
    </div>
  );
}

function PipelineConnector({ delay }: { delay?: string }) {
  return (
    <div className="relative flex-1">
      <div className="border-t-2 border-dashed border-border" />
      <div
        className={`absolute -top-1.5 left-0 size-3 rounded-full bg-primary/70 animate-ping ${delay ?? ""}`}
      />
    </div>
  );
}

function PipelineWidget() {
  return (
    <div className="surface-glow relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative flex items-start justify-between gap-2 sm:gap-4">
        <PipelineStage label="Design" caption="Templates or AI Studio">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16">
            <Palette className="size-7 text-primary sm:size-8" />
            <span className="absolute -right-1 -top-1 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
          </div>
        </PipelineStage>

        <PipelineConnector />

        <PipelineStage label="Click2Mail print" caption="Next-day production">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16 animate-pipeline-pulse">
            <Printer className="size-7 text-primary sm:size-8" />
          </div>
        </PipelineStage>

        <PipelineConnector delay="delay-500" />

        <PipelineStage label="USPS transit" caption="IMb scan events">
          <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:size-16">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-border" />
            </div>
            <Truck className="size-7 text-primary sm:size-8 animate-pipeline-truck" />
          </div>
        </PipelineStage>

        <PipelineConnector delay="delay-1000" />

        <PipelineStage label="Mailbox" caption="Delivered & tracked">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16">
            <svg
              role="img"
              aria-label="Delivered mailbox icon"
              className="size-7 text-emerald-brand sm:size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="6" width="14" height="14" rx="2" />
              <path d="M17 10h4v10h-4z" />
              <path
                d="M17 8v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"
                className="origin-bottom-left animate-pipeline-flag"
                style={{
                  transformOrigin: "3px 20px",
                  transformBox: "fill-box",
                }}
              />
            </svg>
          </div>
        </PipelineStage>
      </div>
    </div>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const text =
    "No minimums • $9/month membership • Wholesale print rates • CASS-certified addresses • USPS IMb tracking • Click2Mail fulfillment • AI design studio • Dynamic QR tracking links • Radius targeting with EDDM estimates • ";
  return (
    <div className="relative overflow-hidden border-y border-primary/20 bg-primary/10 py-3">
      <div className="flex whitespace-nowrap animate-marquee-scroll">
        <span className="px-4 text-sm font-medium text-primary">{text}</span>
        <span className="px-4 text-sm font-medium text-primary">{text}</span>
      </div>
    </div>
  );
}

/* ─── Stats Row ─── */
const STATS = [
  { value: "90%", label: "Open rate", sub: "vs ~20% email average" },
  { value: "8x", label: "Avg ROI", sub: "retail campaigns" },
  { value: "4-day", label: "Delivery", sub: "nationwide average" },
  { value: "USPS", label: "Verified", sub: "CASS-certified addresses" },
];

function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STATS.map((s) => (
        <div
          key={s.value}
          className="rounded-xl border border-border bg-card p-5 text-center shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md"
        >
          <div className="font-display text-3xl font-bold text-primary sm:text-4xl">
            {s.value}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {s.label}
          </div>
          <div className="text-xs text-muted-foreground">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Dual Value Pillars ─── */
function ValuePillars() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-smooth hover:shadow-md">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl transition-smooth group-hover:bg-primary/10" />
        <div className="relative">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Upload className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Win back the customers you already have
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Upload a CSV of past buyers. Every row is scrubbed to USPS standards
            through Click2Mail's CASS verification — ZIP+4 appended,
            undeliverable addresses flagged — before a single piece is printed.
            Save the clean list as a preset and reuse it next quarter.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "CASS-certified scrub via Click2Mail",
              "ZIP+4 and delivery-point correction",
              "Invalid rows highlighted before you pay",
              "Saved audience presets for repeat drops",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="size-4 shrink-0 text-emerald-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-smooth hover:shadow-md">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl transition-smooth group-hover:bg-primary/10" />
        <div className="relative">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Reach every mailbox around your location
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            No list? Drop a pin, drag the radius, and see an instant household
            estimate built from USPS EDDM carrier routes. Target the ZIP codes
            and routes that matter and launch without buying a single record.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "Interactive radius builder on a live map",
              "EDDM carrier-route household estimates",
              "ZIP code and route-level targeting",
              "Works alongside your CSV audiences",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="size-4 shrink-0 text-emerald-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Studio teaser ─── */
function AiStudioTeaser() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-primary p-8 text-primary-foreground sm:p-10">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
            <Sparkles className="size-3.5 text-primary" />
            AI Studio
          </div>
          <h3 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
            Backgrounds and copy, generated inside the canvas
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
            Describe the vibe and drop a DALL·E 3 background straight onto your
            postcard. Ask GPT-4o mini for headlines, bullets and calls to action
            tuned to your offer. Every member gets {MONTHLY_ALLOWANCE} credits a
            month — one credit is one cent.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="size-4 text-primary" />
                DALL·E 3 backgrounds
              </div>
              <div className="mt-1 text-xs text-primary-foreground/70">
                From {AI_COSTS.squareImage} credits (square) ·{" "}
                {AI_COSTS.wideImage} wide · {AI_COSTS.hdImage} HD
              </div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Type className="size-4 text-primary" />
                GPT-4o mini copy
              </div>
              <div className="mt-1 text-xs text-primary-foreground/70">
                {AI_COSTS.copy} credit per generation — headlines, bullets and
                CTAs
              </div>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="mt-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/wizard" data-ocid="ai_studio.try.link">
              Try it in the wizard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h4 className="font-display text-lg font-bold text-foreground">
          Need more credits?
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Top up any time. Bigger packs include bonus credits.
        </p>
        <ul className="mt-5 space-y-3">
          {CREDIT_PACKS.map((pack) => (
            <li
              key={pack.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
              data-ocid={`ai_studio.pack.${pack.id.toLowerCase()}.item`}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {pack.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pack.credits.toLocaleString("en-US")} credits
                  {pack.bonus > 0 ? ` · includes ${pack.bonus} bonus` : ""}
                </div>
              </div>
              <div className="font-display text-lg font-bold text-primary">
                {formatCents(pack.priceCents)}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Credits never expire while your membership is active.
        </p>
      </div>
    </div>
  );
}

/* ─── Feature Comparison Table ─── */
type Support = "yes" | "no" | "partial";

interface FeatureRow {
  label: string;
  us: Support;
  generic: Support;
  traditional: Support;
  note?: string;
}

const FEATURES: FeatureRow[] = [
  {
    label: `${formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "")}/mo no-minimum membership`,
    us: "yes",
    generic: "no",
    traditional: "no",
    note: "Usage tiers or minimum print runs elsewhere",
  },
  {
    label: "CASS address verification",
    us: "yes",
    generic: "partial",
    traditional: "partial",
    note: "Paid add-on or manual list hygiene",
  },
  {
    label: "Live radius builder with EDDM estimates",
    us: "yes",
    generic: "no",
    traditional: "no",
  },
  {
    label: "Real-time USPS IMb tracking",
    us: "yes",
    generic: "partial",
    traditional: "no",
  },
  {
    label: "AI design studio",
    us: "yes",
    generic: "no",
    traditional: "no",
  },
  {
    label: "Dynamic QR tracking links",
    us: "yes",
    generic: "no",
    traditional: "no",
  },
  {
    label: "Transparent per-piece pricing",
    us: "yes",
    generic: "partial",
    traditional: "no",
    note: "Quote-based pricing at most print shops",
  },
  {
    label: "Saved audience presets",
    us: "yes",
    generic: "partial",
    traditional: "no",
  },
];

function SupportCell({ value }: { value: Support }) {
  if (value === "yes") {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-brand/10">
        <Check className="size-4 text-emerald-brand" aria-label="Included" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted">
        <Minus
          className="size-4 text-muted-foreground"
          aria-label="Partial or add-on"
        />
      </span>
    );
  }
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-destructive/10">
      <X className="size-4 text-destructive" aria-label="Not included" />
    </span>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-6 py-4 text-left font-display font-bold text-foreground">
                Feature
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-primary">
                EZmailout
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-muted-foreground">
                Generic API provider
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-muted-foreground">
                Traditional print shop
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr
                key={f.label}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{f.label}</div>
                  {f.note && (
                    <div className="text-xs text-muted-foreground">
                      {f.note}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <SupportCell value={f.us} />
                </td>
                <td className="px-6 py-4 text-center">
                  <SupportCell value={f.generic} />
                </td>
                <td className="px-6 py-4 text-center">
                  <SupportCell value={f.traditional} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3.5 text-emerald-brand" /> Included
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Minus className="size-3.5" /> Partial or paid add-on
        </span>
        <span className="inline-flex items-center gap-1.5">
          <X className="size-3.5 text-destructive" /> Not offered
        </span>
      </div>
    </div>
  );
}

/* ─── Hero Section ─── */
interface TrustBadge {
  icon: LucideIcon;
  label: string;
}

const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, label: "CASS-certified addresses" },
  { icon: Barcode, label: "USPS IMb tracking" },
  { icon: Printer, label: "Click2Mail fulfillment" },
  { icon: Layers, label: "No minimums" },
];

function HeroSection({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-12 sm:pt-24 sm:pb-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -right-32 top-10 size-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-brand opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-brand" />
          </span>
          Membership {formatCents(SUBSCRIPTION_PRICE_CENTS)}/month · cancel
          anytime
        </div>

        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground animate-fade-up sm:text-6xl sm:leading-[1.05]">
          Direct mail without minimums.
          <span className="block bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent">
            Wholesale print rates for $9/month.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Design a postcard, letter or brochure in minutes, target by CSV or map
          radius, and let Click2Mail print while USPS delivers — one piece or
          five thousand, same per-piece price.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="gap-2 bg-primary px-8 text-base text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
          >
            <Link to="/wizard" data-ocid="hero.launch_campaign.button">
              Launch a campaign
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="px-8 text-base"
          >
            <a href="#pricing" data-ocid="hero.see_pricing.link">
              See pricing
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Prefer a walkthrough?{" "}
          <button
            type="button"
            onClick={onOpenDemo}
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-ocid="hero.book_demo.button"
          >
            Book a demo
          </button>
        </p>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {TRUST_BADGES.map((badge) => (
            <li
              key={badge.label}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
            >
              <badge.icon className="size-3.5 text-primary" />
              {badge.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── Final CTA Banner ─── */
function FinalCTA({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="surface-glow relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-primary/10 p-8 text-center sm:p-12">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Your first campaign can be in the mail tomorrow
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          Pick a format, upload a list or drop a pin, design it in the canvas
          and launch. Membership is {formatCents(SUBSCRIPTION_PRICE_CENTS)} a
          month, and you only pay per piece for what you send.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="gap-2 bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/wizard" data-ocid="final_cta.launch_campaign.button">
              Launch a campaign
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="px-8 text-base"
          >
            <Link to="/templates" data-ocid="final_cta.templates.link">
              Browse templates
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="px-6 text-base"
            data-ocid="final_cta.book_demo.button"
            onClick={onOpenDemo}
          >
            Book a demo
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Page ─── */
export function StoreFront() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="flex flex-col bg-background text-foreground">
      <HeroSection onOpenDemo={() => setDemoOpen(true)} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <PipelineWidget />
      </section>

      <Marquee />

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <StatsRow />
      </section>

      <Section
        id="membership"
        eyebrow="Membership"
        title="One membership. Every wholesale rate."
        subtitle="Skip the volume tiers and quote requests. Members pay the same low per-piece price on every format from day one."
      >
        <MembershipCard />
      </Section>

      <Section
        id="pricing"
        eyebrow="Live pricing"
        title="See what you'd save"
        subtitle="Pick a format and a quantity. Every number below is computed from the same price list the wizard charges."
      >
        <PricingCalculator />
      </Section>

      <Section
        id="products"
        eyebrow="Products"
        title="Five formats, one transparent price list"
        subtitle="Printed and mailed by Click2Mail. Prices include print, postage and address verification."
      >
        <ProductShowcase />
      </Section>

      <Section
        id="audiences"
        eyebrow="Audiences"
        title="Two ways to win"
        subtitle="Retention or acquisition — bring a list or build one from the map."
      >
        <ValuePillars />
      </Section>

      <Section
        id="ai-studio"
        eyebrow="AI Studio"
        title="Design help that lives in the editor"
        subtitle={`${MONTHLY_ALLOWANCE} AI credits are included every month. Top up with packs from ${formatCents(CREDIT_PACKS[0].priceCents)}.`}
      >
        <AiStudioTeaser />
      </Section>

      <Section
        id="compare"
        eyebrow="Compare"
        title="Why EZmailout?"
        subtitle="Everything a print shop does, everything an API does, without the minimums or the engineering."
      >
        <ComparisonTable />
      </Section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <FinalCTA onOpenDemo={() => setDemoOpen(true)} />
      </section>

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

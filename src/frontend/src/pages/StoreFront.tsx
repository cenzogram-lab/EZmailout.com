import { BookDemoModal } from "@/components/BookDemoModal";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  Package,
  Printer,
  Shield,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

/* ─── Animated Mail Pipeline Widget ─── */
function PipelineWidget() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative flex items-center justify-between gap-2 sm:gap-4">
        {/* Stage 1: Digital Trigger */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16">
            <svg
              role="img"
              aria-label="Digital trigger icon"
              className="size-7 text-primary sm:size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="3" width="20" height="8" rx="2" />
              <rect x="2" y="13" width="20" height="8" rx="2" />
              <circle
                cx="6"
                cy="7"
                r="1"
                fill="currentColor"
                className="animate-pulse"
              />
              <circle
                cx="10"
                cy="7"
                r="1"
                fill="currentColor"
                className="animate-pulse delay-75"
              />
              <circle
                cx="14"
                cy="7"
                r="1"
                fill="currentColor"
                className="animate-pulse delay-150"
              />
              <circle
                cx="6"
                cy="17"
                r="1"
                fill="currentColor"
                className="animate-pulse delay-100"
              />
              <circle
                cx="10"
                cy="17"
                r="1"
                fill="currentColor"
                className="animate-pulse delay-200"
              />
              <circle
                cx="14"
                cy="17"
                r="1"
                fill="currentColor"
                className="animate-pulse delay-300"
              />
            </svg>
          </div>
          <span className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
            Digital Trigger
          </span>
        </div>

        {/* Connector 1 */}
        <div className="relative flex-1">
          <div className="border-t-2 border-dashed border-muted" />
          <div className="absolute -top-1.5 left-0 size-3 rounded-full bg-primary/60 animate-ping" />
        </div>

        {/* Stage 2: Print Network */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16 animate-pipeline-pulse">
            <Printer className="size-7 text-accent sm:size-8" />
          </div>
          <span className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
            Print Network
          </span>
        </div>

        {/* Connector 2 */}
        <div className="relative flex-1">
          <div className="border-t-2 border-dashed border-muted" />
          <div className="absolute -top-1.5 left-0 size-3 rounded-full bg-primary/60 animate-ping delay-500" />
        </div>

        {/* Stage 3: In Transit */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16 overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-muted/50" />
            </div>
            <Truck className="size-7 text-primary sm:size-8 animate-pipeline-truck" />
          </div>
          <span className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
            In Transit
          </span>
        </div>

        {/* Connector 3 */}
        <div className="relative flex-1">
          <div className="border-t-2 border-dashed border-muted" />
          <div className="absolute -top-1.5 left-0 size-3 rounded-full bg-primary/60 animate-ping delay-1000" />
        </div>

        {/* Stage 4: Delivered */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-background sm:size-16">
            <svg
              role="img"
              aria-label="Delivered mailbox icon"
              className="size-7 text-green-400 sm:size-8"
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
          <span className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
            Delivered
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const text =
    "✨ 90% Open Rates Locked • USPS Address Verification Active • 8x Average Retail ROI Delivered • Intelligent Mail Barcodes Armed • 4-Day Delivery Window • 1,000+ Commercial Printers • Personalized Per Recipient • Real-Time USPS Tracking • ";
  return (
    <div className="relative overflow-hidden bg-accent/10 py-3">
      <div className="flex whitespace-nowrap animate-marquee-scroll">
        <span className="text-sm font-medium text-accent/90 px-4">{text}</span>
        <span className="text-sm font-medium text-accent/90 px-4">{text}</span>
      </div>
    </div>
  );
}

/* ─── Stats Row ─── */
const STATS = [
  { value: "90%", label: "Open Rate", sub: "vs 20% email avg" },
  { value: "8x", label: "Avg ROI", sub: "retail campaigns" },
  { value: "4-Day", label: "Delivery", sub: "nationwide avg" },
  { value: "USPS", label: "Verified", sub: "CASS-certified" },
];

function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STATS.map((s) => (
        <div
          key={s.value}
          className="rounded-xl border border-border bg-card/50 p-5 text-center backdrop-blur-sm transition-smooth hover:bg-card hover:-translate-y-1"
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
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm transition-smooth hover:bg-card">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl transition-smooth group-hover:bg-primary/10" />
        <div className="relative">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Upload className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Win Back Lapsed Customers
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Upload your CSV of past buyers. Our Lob-powered address verification
            engine scrubs every row to USPS standards, appends missing ZIP+4
            codes, and strips undeliverable addresses. Then we automatically
            trigger a personalized re-engagement mailer drop.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "CASS-certified address scrubbing",
              "Auto-append ZIP+4 & delivery point",
              "Invalid row highlighting & removal",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="size-4 shrink-0 text-green-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm transition-smooth hover:bg-card">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-accent/5 blur-2xl transition-smooth group-hover:bg-accent/10" />
        <div className="relative">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <MapPin className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Acquire New Local Customers
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Drop a pin on our interactive map canvas, set your radius with a
            smooth slider, and instantly see how many verified mailboxes sit in
            that zone. No existing list required — we surface local household
            counts matched to USPS EDDM boundaries.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "Interactive radius builder",
              "ZIP code & area code targeting",
              "Real-time household count estimator",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="size-4 shrink-0 text-green-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Price Grid ─── */
const PRODUCTS = [
  {
    name: "Postcards",
    desc: "4×6, 6×9, 6×11 formats. Full-color front & back.",
    price: "From $0.95 / address",
    icon: Mail,
  },
  {
    name: "Standard Letters",
    desc: "8.5×11 pages stuffed into #10 double-window envelopes.",
    price: "$1.50 / address",
    icon: FileText,
  },
  {
    name: "Self-Mailer Brochures",
    desc: "Bifold & trifold layouts tabbed shut. No envelope needed.",
    price: "$2.10 / address",
    icon: Package,
  },
  {
    name: "Security Snap Packs",
    desc: "Perforated pressure-sealed mailers for urgent notices.",
    price: "Custom pricing",
    icon: Shield,
  },
  {
    name: "Booklets",
    desc: "Multi-page edge-bound catalogs & annual showcases.",
    price: "Custom pricing",
    icon: BookOpen,
  },
];

function ProductGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <div
          key={p.name}
          className="group relative flex flex-col rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-smooth hover:bg-card hover:-translate-y-1"
        >
          <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
            <p.icon className="size-5" />
          </div>
          <h4 className="font-display text-lg font-bold text-foreground">
            {p.name}
          </h4>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.desc}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Starting from {p.price}
            </span>
            <ChevronRight className="size-4 text-muted-foreground transition-smooth group-hover:translate-x-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Feature Comparison Table ─── */
const FEATURES = [
  {
    label: "Built-in Address Verification",
    us: true,
    generic: false,
    traditional: false,
  },
  {
    label: "Live Map Radius Builder",
    us: true,
    generic: false,
    traditional: false,
  },
  {
    label: "Real-Time USPS Tracking",
    us: true,
    generic: false,
    traditional: false,
  },
  {
    label: "API-Triggered Campaigns",
    us: true,
    generic: true,
    traditional: false,
  },
  {
    label: "4-Day Delivery Window",
    us: true,
    generic: false,
    traditional: false,
  },
  {
    label: "Per-Recipient Personalization",
    us: true,
    generic: false,
    traditional: true,
  },
  {
    label: "Transparent Pricing",
    us: true,
    generic: false,
    traditional: false,
  },
];

function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-4 text-left font-display font-bold text-foreground">
                Feature
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-primary">
                MailCommand
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-muted-foreground">
                Generic Provider
              </th>
              <th className="px-6 py-4 text-center font-display font-bold text-muted-foreground">
                Traditional Print Shop
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr
                key={f.label}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-6 py-4 font-medium text-foreground">
                  {f.label}
                </td>
                <td className="px-6 py-4 text-center">
                  <Check className="mx-auto size-5 text-green-400" />
                </td>
                <td className="px-6 py-4 text-center">
                  {f.generic ? (
                    <Check className="mx-auto size-5 text-green-400" />
                  ) : (
                    <X className="mx-auto size-5 text-red-400" />
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {f.traditional ? (
                    <Check className="mx-auto size-5 text-green-400" />
                  ) : (
                    <X className="mx-auto size-5 text-red-400" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Hero Section ─── */
function HeroSection({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-12 sm:pt-24 sm:pb-16">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-400" />
          </span>
          Now shipping 1,000+ campaigns daily
        </div>

        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
          Turn Mail Into{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Money
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Connect your list, drop a pin on a map, and launch automated direct
          mail that actually gets opened.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/wizard">
            <Button
              size="lg"
              className="gap-2 px-8 text-base"
              data-ocid="hero.start_campaign_button"
            >
              Start Free Campaign
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="px-8 text-base"
            data-ocid="hero.book_demo_button"
            onClick={onOpenDemo}
          >
            Book a Demo
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA Banner ─── */
function FinalCTA({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/5 p-8 text-center sm:p-12">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Ready to Launch Your First Campaign?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          No credit card required. Upload your list or drop a pin and send your
          first piece in under 10 minutes.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/wizard">
            <Button
              size="lg"
              className="gap-2 px-8 text-base"
              data-ocid="final_cta.start_now_button"
            >
              Start Now
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="px-8 text-base"
            data-ocid="final_cta.book_demo_button"
            onClick={onOpenDemo}
          >
            Book a Demo
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
    <div className="flex flex-col">
      <HeroSection onOpenDemo={() => setDemoOpen(true)} />

      {/* Pipeline Widget */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PipelineWidget />
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Stats */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <StatsRow />
      </section>

      {/* Value Pillars */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Two Ways to Win
          </h2>
          <p className="mt-2 text-muted-foreground">
            Retention or acquisition — we have you covered.
          </p>
        </div>
        <ValuePillars />
      </section>

      {/* Product Grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Transparent Pricing
          </h2>
          <p className="mt-2 text-muted-foreground">
            Wholesale-to-retail card matrix for every format.
          </p>
        </div>
        <ProductGrid />
      </section>

      {/* Comparison Table */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Why MailCommand?
          </h2>
          <p className="mt-2 text-muted-foreground">
            The features that separate us from the pack.
          </p>
        </div>
        <ComparisonTable />
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <FinalCTA onOpenDemo={() => setDemoOpen(true)} />
      </section>

      {/* Book a Demo Modal */}
      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

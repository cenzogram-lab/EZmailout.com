import { BookDemoModal } from "@/components/BookDemoModal";
import { CatalogIcon } from "@/components/catalog/CatalogIcon";
import { MembershipCard } from "@/components/marketing/MembershipCard";
import { PricingCalculator } from "@/components/marketing/PricingCalculator";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { Button } from "@/components/ui/button";
import { CATALOG, CATALOG_SIZE_COUNT } from "@/lib/catalog";
import { AI_COSTS, CREDIT_PACKS, MONTHLY_ALLOWANCE } from "@/lib/credits";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenterVertical,
  AlignStartVertical,
  ArrowRight,
  Barcode,
  Check,
  Copy,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  MapPin,
  Minus,
  Palette,
  Printer,
  QrCode,
  Rocket,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Users,
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
          <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
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

/* ─── Studio mock (hero illustration built from the real design tokens) ─── */
const RAIL_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutTemplate, label: "Templates" },
  { icon: Layers, label: "Elements" },
  { icon: Type, label: "Text" },
  { icon: Upload, label: "Uploads" },
  { icon: Palette, label: "Brand" },
  { icon: QrCode, label: "QR" },
  { icon: Sparkles, label: "AI" },
];

function StudioMock() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-card shadow-xl shadow-navy/10"
      data-ocid="hero.studio_mock"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#f0f1f5]" />
        <span className="size-2.5 rounded-full bg-[#f0f1f5]" />
        <span className="size-2.5 rounded-full bg-[#f0f1f5]" />
        <span className="ml-2 rounded-full bg-[#f0f1f5] px-2 py-0.5 text-[10px] font-medium text-[#575859]">
          Spring open-house · 6″ × 4.25″ Postcard
        </span>
        <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Continue to review
        </span>
      </div>
      <div className="flex">
        <div className="flex w-14 flex-col items-center gap-2 border-r border-[#e5e7eb] bg-[#f6f7f9] py-3">
          {RAIL_ITEMS.map((item, i) => (
            <span
              key={item.label}
              className={`flex size-9 items-center justify-center rounded-lg ${i === 2 ? "bg-card text-primary shadow-sm" : "text-[#575859]"}`}
            >
              <item.icon className="size-4" strokeWidth={1.75} />
            </span>
          ))}
        </div>
        <div className="studio-dotgrid relative flex-1 p-6 sm:p-8">
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#e5e7eb] bg-card px-1.5 py-1 shadow-md">
            <span className="px-1 text-[9px] font-semibold uppercase text-[#575859]">
              text
            </span>
            <AlignStartVertical className="size-3.5 text-[#575859]" />
            <AlignCenterVertical className="size-3.5 text-primary" />
            <Copy className="size-3.5 text-[#575859]" />
            <Trash2 className="size-3.5 text-destructive" />
          </div>
          <div className="relative mx-auto mt-6 aspect-[6/4.25] w-full max-w-[360px]">
            <div className="absolute -inset-1.5 rounded-sm border-2 border-[#ef4444]/80" />
            <div className="relative h-full w-full overflow-hidden rounded-sm bg-white shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#cff3fd] via-white to-[#b5d8fc]/60" />
              <div className="absolute inset-[6%] rounded-sm border border-dashed border-emerald-brand/70" />
              <div className="absolute left-[10%] top-[16%] w-[62%]">
                <div className="relative rounded-sm outline outline-2 outline-primary">
                  <div className="px-1 font-display text-[clamp(14px,3.6vw,22px)] font-extrabold leading-tight text-[#01080a]">
                    Open house Saturday 10–4
                  </div>
                  {[
                    "-left-1.5 -top-1.5",
                    "-right-1.5 -top-1.5",
                    "-left-1.5 -bottom-1.5",
                    "-right-1.5 -bottom-1.5",
                  ].map((pos) => (
                    <span
                      key={pos}
                      className={`absolute ${pos} size-3 rounded-full border-2 border-primary bg-white shadow`}
                    />
                  ))}
                </div>
                <p className="mt-2 px-1 text-[10px] font-medium text-[#575859] sm:text-xs">
                  120 Harbor View Dr · Free valuation for every visitor
                </p>
                <span className="mt-2 inline-block rounded-full bg-navy px-3 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Book today
                </span>
              </div>
              <div className="absolute bottom-[10%] right-[8%] flex size-12 items-center justify-center rounded-sm bg-white shadow sm:size-14">
                <QrCode className="size-9 text-[#01080a]" strokeWidth={1.5} />
              </div>
            </div>
            <span className="absolute -right-2 -top-3 rounded-full bg-[#607bf7] px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              You
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            {["#f0f1f5", "#0e2b4f", "#b5d8fc", "#6366f1", "#dbefad"].map(
              (hex) => (
                <span
                  key={hex}
                  className="size-5 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
interface TrustBadge {
  icon: LucideIcon;
  label: string;
}

const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, label: "CASS-certified addresses" },
  { icon: Barcode, label: "USPS IMb tracking" },
  { icon: Printer, label: "Click2Mail fulfilment" },
  { icon: Layers, label: "No minimums" },
];

function HeroSection({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-background pb-14 pt-14 sm:pb-20 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,oklch(var(--primary)/0.12),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-brand opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-brand" />
            </span>
            Membership {formatCents(SUBSCRIPTION_PRICE_CENTS)}/month · cancel
            anytime
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground animate-fade-up sm:text-6xl sm:leading-[1.02]">
            Design it. Target it.
            <span className="block text-primary">Mail it tomorrow.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            A Canva-style studio, {CATALOG_SIZE_COUNT} Click2Mail formats and
            wholesale per-piece pricing for{" "}
            {formatCents(SUBSCRIPTION_PRICE_CENTS)} a month. Upload a list or
            draw a radius, design in the browser, and USPS delivers with live
            IMb tracking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="gap-2 px-8 shadow-md shadow-primary/25"
            >
              <Link to="/wizard" data-ocid="hero.launch_campaign.button">
                Start a campaign
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <a href="#products" data-ocid="hero.see_pricing.link">
                Browse the catalog
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
          <ul className="mt-8 flex flex-wrap items-center gap-2">
            {TRUST_BADGES.map((badge) => (
              <li
                key={badge.label}
                className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
              >
                <badge.icon className="size-3.5 text-primary" />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-fade-up">
          <StudioMock />
        </div>
      </div>
    </section>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const text =
    "No minimums • $9/month membership • Wholesale print rates • CASS-certified addresses • USPS IMb tracking • Click2Mail fulfilment • Canva-style design studio • AI backgrounds & copy • Dynamic QR tracking links • Radius targeting with EDDM® estimates • ";
  return (
    <div className="relative overflow-hidden border-y border-[#e5e7eb] bg-ice py-3">
      <div className="flex whitespace-nowrap animate-marquee-scroll">
        <span className="px-4 text-sm font-medium text-navy">{text}</span>
        <span className="px-4 text-sm font-medium text-navy">{text}</span>
      </div>
    </div>
  );
}

/* ─── How it works ─── */
const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutTemplate,
    title: "1 · Pick a format",
    body: `${CATALOG.length} Click2Mail families, every size on the sheet, one transparent per-piece price.`,
  },
  {
    icon: Users,
    title: "2 · Choose the audience",
    body: "Upload a CSV for CASS verification, reuse a saved preset, or size a drop from the radius map.",
  },
  {
    icon: Palette,
    title: "3 · Design in the studio",
    body: "Templates, shapes, Geist type, brand swatches, AI backgrounds and QR codes on a true-to-scale artboard.",
  },
  {
    icon: Rocket,
    title: "4 · Launch & track",
    body: "Preflight, pay per piece, and follow every scan from production to the mailbox.",
  },
];

function HowItWorks() {
  return (
    <ol className="grid gap-4 md:grid-cols-4" data-ocid="home.how_it_works">
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className="relative rounded-2xl border border-[#e5e7eb] bg-card p-6 shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <step.icon className="size-5" />
          </span>
          <h3 className="mt-4 font-display text-base font-bold text-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
          {i < STEPS.length - 1 && (
            <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-primary/50 md:block" />
          )}
        </li>
      ))}
    </ol>
  );
}

/* ─── Studio feature trio ─── */
const STUDIO_FEATURES: {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
}[] = [
  {
    icon: Palette,
    title: "Canva-style studio",
    body: "A tool rail, drawers and a dotted stage — with print guides Click2Mail actually uses.",
    bullets: [
      "Round grab handles, align & depth toolbar",
      "Cut, ⅛″ bleed and ¼″ safe-zone overlays",
      "USPS address & IMb zone kept clear",
    ],
  },
  {
    icon: ScanEye,
    title: "Live 3D proof",
    body: "Both faces re-render on every edit; flip, rotate and export at 300 DPI.",
    bullets: [
      "Front / back in sync with the editor",
      "Geist typefaces embedded in the PDF",
      "Preflight before you pay",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Studio",
    body: `DALL·E 3 backgrounds and GPT-4o mini copy, paid in credits (${MONTHLY_ALLOWANCE} included monthly).`,
    bullets: [
      `Backgrounds from ${AI_COSTS.squareImage} credits`,
      `Copywriter at ${AI_COSTS.copy} credit per round`,
      "Industry quick-prompts built in",
    ],
  },
];

function StudioFeatures() {
  return (
    <div className="grid gap-5 md:grid-cols-3" data-ocid="home.studio_features">
      {STUDIO_FEATURES.map((f) => (
        <div
          key={f.title}
          className="rounded-2xl border border-[#e5e7eb] bg-card p-6 shadow-sm"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-ice text-navy">
            <f.icon className="size-5" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {f.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          <ul className="mt-4 space-y-2">
            {f.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-brand" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ─── FAQ ─── */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is there really no minimum order?",
    a: "No. Members pay the same per-piece price for one postcard or ten thousand. Membership is billed monthly and can be cancelled any time.",
  },
  {
    q: "Which formats can I send?",
    a: `Every family on the Click2Mail product sheet — postcards, letters, Certified Mail™, EDDM®, Priority Mail®, flyers, secure mailers, notecards, rack cards, brochures, reply mail, booklets and card stock — ${CATALOG_SIZE_COUNT} sizes in total.`,
  },
  {
    q: "How do addresses get verified?",
    a: "Uploaded lists run through Click2Mail's CASS verification, appending ZIP+4 and flagging undeliverable rows before anything is printed. Clean lists can be saved as presets.",
  },
  {
    q: "What does the AI Studio cost?",
    a: `One credit is one cent. Copy costs ${AI_COSTS.copy} credit, backgrounds ${AI_COSTS.squareImage}–${AI_COSTS.hdImage} credits, and members receive ${MONTHLY_ALLOWANCE} credits every month.`,
  },
  {
    q: "Can I track delivery?",
    a: "Yes. Every piece carries a USPS Intelligent Mail barcode; scans appear on a five-stage timeline from production to delivery, and dynamic QR codes report responses.",
  },
];

function Faq() {
  return (
    <div
      className="mx-auto max-w-3xl divide-y divide-[#e5e7eb] rounded-2xl border border-[#e5e7eb] bg-card"
      data-ocid="home.faq"
    >
      {FAQ.map((item, i) => (
        <details key={item.q} className="group px-6 py-4" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-foreground">
            {item.q}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </p>
        </details>
      ))}
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

/* ─── Final CTA Banner ─── */
function FinalCTA({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy p-8 text-center text-white sm:p-12">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-primary/40 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-ice/30 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Your first campaign can be in the mail tomorrow
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/75 sm:text-base">
          Pick a format, upload a list or drop a pin, design it in the studio
          and launch. Membership is {formatCents(SUBSCRIPTION_PRICE_CENTS)} a
          month, and you only pay per piece for what you send.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2 px-8">
            <Link to="/wizard" data-ocid="final_cta.launch_campaign.button">
              Launch a campaign
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-white px-8 text-navy hover:bg-white/90"
          >
            <Link to="/templates" data-ocid="final_cta.templates.link">
              Browse templates
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="px-6 text-white hover:bg-white/10 hover:text-white"
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

      <Marquee />

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <StatsRow />
      </section>

      <Section
        id="products"
        eyebrow="Catalog"
        title="Every Click2Mail format, one price list"
        subtitle="Pick a family to open its sizes in the wizard. Prices include print, postage and address verification."
      >
        <ProductShowcase />
      </Section>

      <Section
        id="how-it-works"
        eyebrow="How it works"
        title="Four steps from idea to mailbox"
        subtitle="The wizard walks you through product, audience, design and launch — nothing to install, nothing to quote."
      >
        <HowItWorks />
      </Section>

      <Section
        id="studio"
        eyebrow="Design studio"
        title="A studio that knows how mail is printed"
        subtitle="Everything you expect from a design tool, plus the guides, zones and proofs a print job needs."
      >
        <StudioFeatures />
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
        id="membership"
        eyebrow="Membership"
        title="One membership. Every wholesale rate."
        subtitle="Skip the volume tiers and quote requests. Members pay the same low per-piece price on every format from day one."
      >
        <MembershipCard />
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

      <Section id="faq" eyebrow="FAQ" title="Questions, answered">
        <Faq />
      </Section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <FinalCTA onOpenDemo={() => setDemoOpen(true)} />
      </section>

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

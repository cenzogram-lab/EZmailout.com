import { BookDemoModal } from "@/components/BookDemoModal";
import { MembershipCard } from "@/components/marketing/MembershipCard";
import { PricingCalculator } from "@/components/marketing/PricingCalculator";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import {
  BRAND_PANEL,
  BRAND_PANEL_INSET,
  EYEBROW,
  ICON_TILE,
} from "@/components/marketing/tactile";
import { MascotStage } from "@/components/stampy";
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
      <div className="mb-10 text-center sm:mb-12">
        {eyebrow && <div className={`${EYEBROW} mb-4`}>{eyebrow}</div>}
        <h2 className="display-heading text-balance text-[2rem] leading-[1.08] sm:text-[2.75rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
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
      className="relative overflow-hidden rounded-3xl border border-hairline bg-card shadow-raised ring-1 ring-primary/10"
      data-ocid="hero.studio_mock"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-hairline bg-card-raised px-3 py-2.5">
        <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
        <span className="ml-2 min-w-0 truncate rounded-full border border-hairline bg-well px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Spring open-house · 6″ × 4.25″ Postcard
        </span>
        <span className="btn-3d-primary ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
          Continue to review
        </span>
      </div>
      <div className="flex">
        <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-hairline bg-card-raised py-3">
          {RAIL_ITEMS.map((item, i) => (
            <span
              key={item.label}
              className={`flex size-9 items-center justify-center rounded-xl ${i === 2 ? "bg-primary/15 text-primary-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] ring-1 ring-primary/25" : "text-muted-foreground"}`}
            >
              <item.icon className="size-4" strokeWidth={1.75} />
            </span>
          ))}
        </div>
        <div className="studio-dotgrid relative min-w-0 flex-1 p-6 sm:p-8">
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-full border border-hairline bg-popover px-2 py-1 shadow-raised">
            <span className="px-1 text-[9px] font-semibold uppercase text-muted-foreground">
              text
            </span>
            <AlignStartVertical className="size-3.5 text-muted-foreground" />
            <AlignCenterVertical className="size-3.5 text-primary" />
            <Copy className="size-3.5 text-muted-foreground" />
            <Trash2 className="size-3.5 text-destructive" />
          </div>
          <div className="relative mx-auto mt-6 aspect-[6/4.25] w-full max-w-[360px]">
            <div className="absolute -inset-1.5 rounded-sm border-2 border-[#ef4444]/80" />
            {/* The postcard is artwork: print colours, the same in both
                themes (the studio keeps an artboard's own colours too). */}
            <div className="relative h-full w-full overflow-hidden rounded-sm shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#cff3fd] via-white to-[#d3e8fd]" />
              <div className="absolute inset-[6%] rounded-sm border border-dashed border-[#008058]/70" />
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
                <p className="mt-2 px-1 text-[10px] font-medium text-[#475467] sm:text-xs">
                  120 Harbor View Dr · Free valuation for every visitor
                </p>
                <span className="mt-2 inline-block rounded-full bg-[#0e2b4f] px-3 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Book today
                </span>
              </div>
              <div className="absolute bottom-[10%] right-[8%] flex size-12 items-center justify-center rounded-sm bg-white shadow sm:size-14">
                <QrCode className="size-9 text-[#01080a]" strokeWidth={1.5} />
              </div>
            </div>
            <span className="absolute -right-2 -top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
              You
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            {["#f0f1f5", "#0e2b4f", "#b5d8fc", "#6366f1", "#dbefad"].map(
              (hex) => (
                <span
                  key={hex}
                  className="size-5 rounded-full border border-hairline-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
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
  { icon: Printer, label: "EZmailout fulfilment" },
  { icon: Layers, label: "No minimums" },
];

function HeroSection({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative isolate overflow-hidden bg-background pb-20 pt-10 sm:pb-24 sm:pt-16 lg:pt-20">
      {/* Ambient indigo backlight from the top edge (its own layer, so the
          section keeps its solid page colour under the text). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,var(--spotlight),transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-20 -z-10 hidden size-[40rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-brand),transparent)] lg:block"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-1.5 text-balance rounded-full border border-hairline bg-card px-3 py-1.5 text-[11px] font-medium leading-4 text-muted-foreground shadow-surface min-[390px]:gap-2 min-[390px]:px-3.5 min-[390px]:text-xs">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-brand opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-brand" />
            </span>
            {/* Two unbreakable halves: when the capsule cannot hold one line
                (under ~360 px) it breaks after the "·", never mid-phrase. */}
            <span>
              <span className="whitespace-nowrap">
                Membership {formatCents(SUBSCRIPTION_PRICE_CENTS)} for 30 days ·
              </span>{" "}
              <span className="whitespace-nowrap">never renews by itself</span>
            </span>
          </div>
          <h1 className="mt-6 font-display text-balance text-[clamp(2rem,11.2vw,2.625rem)] font-black leading-[1.02] tracking-[-0.04em] text-foreground motion-safe:animate-fade-up sm:text-6xl xl:text-[4rem]">
            Design it. Target it.
            <span className="block text-primary">Mail it tomorrow.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A Canva-style studio, {CATALOG_SIZE_COUNT} mail formats and
            per-piece prices that drop with volume, or the 10,000-piece rate on
            small batches with a {formatCents(SUBSCRIPTION_PRICE_CENTS)} 30-day
            membership. Upload a list or draw a radius, design in the browser,
            and USPS delivers with live IMb tracking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 gap-2 px-8 text-base">
              <Link to="/wizard" data-ocid="hero.launch_campaign.button">
                Start a campaign
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
            >
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
              className="rounded-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/80"
              data-ocid="hero.book_demo.button"
            >
              Book a demo
            </button>
          </p>
          <ul className="mt-8 flex flex-wrap items-center gap-2">
            {TRUST_BADGES.map((badge) => (
              <li
                key={badge.label}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-surface"
              >
                <badge.icon className="size-3.5 text-primary" />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative min-w-0 motion-safe:animate-fade-up lg:pl-6">
          <StudioMock />
          {/* Stampy with his palette, presenting the studio. */}
          <MascotStage
            pose="design"
            size="lg"
            className="pointer-events-none absolute -bottom-12 -right-1 sm:-bottom-14 sm:-left-5 sm:right-auto lg:-left-6"
            mascotClassName="size-24 sm:size-32 lg:size-36 xl:size-40"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const text =
    "No minimums • $9 30-day membership • Wholesale print rates • CASS-certified addresses • USPS IMb tracking • EZmailout fulfilment • Canva-style design studio • AI backgrounds & copy • Dynamic QR tracking links • Radius targeting with EDDM® estimates • ";
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-ice py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]">
      <div className="flex whitespace-nowrap animate-marquee-scroll motion-reduce:animate-none">
        <span className="px-4 text-sm font-semibold text-navy">{text}</span>
        <span className="px-4 text-sm font-semibold text-navy">{text}</span>
      </div>
    </div>
  );
}

/* ─── How it works ─── */
const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutTemplate,
    title: "1 · Pick a format",
    body: `${CATALOG.length} product families, every size on the sheet, one transparent per-piece price.`,
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
    <ol
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-ocid="home.how_it_works"
    >
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className="surface-card relative p-6 transition-smooth hover:-translate-y-1 hover:shadow-raised"
        >
          <span className={`${ICON_TILE} size-12`}>
            <step.icon className="size-5" />
          </span>
          <h3 className="mt-5 font-display text-base font-extrabold tracking-tight text-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
          {i < STEPS.length - 1 && (
            <span
              aria-hidden="true"
              className="btn-3d-neutral absolute -right-[22px] top-1/2 z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full lg:flex"
            >
              <ArrowRight className="size-3.5 text-primary" />
            </span>
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
    body: "A tool rail, drawers and a dotted stage — with the print guides our press actually uses.",
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
    body: `AI backgrounds and AI copywriting, paid in credits (${MONTHLY_ALLOWANCE} with each 30-day membership).`,
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
          className="surface-card relative isolate overflow-hidden p-6 sm:p-7"
        >
          <div aria-hidden="true" className="ambient-glow-backdrop" />
          <span className={`${ICON_TILE} size-12`}>
            <f.icon className="size-5" />
          </span>
          <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-foreground">
            {f.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {f.body}
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-hairline pt-5">
            {f.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-brand/15">
                  <Check
                    className="size-3 text-emerald-brand"
                    strokeWidth={3}
                  />
                </span>
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
    a: "No. You can send a single piece. Volume prices start at 1,000 pieces, and members pay the 10,000-piece price on those sizes (smaller orders cost more per piece, because each card payment carries a fixed fee). Membership is a 30-day pass you renew when you choose: nothing is billed automatically, so there is nothing to cancel.",
  },
  {
    q: "Which formats can I send?",
    a: `Every family on the EZmailout product sheet — postcards, letters, Certified Mail™, EDDM®, Priority Mail®, flyers, secure mailers, notecards, rack cards, brochures, reply mail, booklets and card stock — ${CATALOG_SIZE_COUNT} sizes in total.`,
  },
  {
    q: "How do addresses get verified?",
    a: "Uploaded lists run through EZmailout's CASS verification, appending ZIP+4 and flagging undeliverable rows before anything is printed. Clean lists can be saved as presets.",
  },
  {
    q: "What does the AI Studio cost?",
    a: `One credit is one cent. Copy costs ${AI_COSTS.copy} credit, backgrounds ${AI_COSTS.squareImage}–${AI_COSTS.hdImage} credits, and members receive ${MONTHLY_ALLOWANCE} credits with each 30-day membership.`,
  },
  {
    q: "Can I track delivery?",
    a: "Yes. Every piece carries a USPS Intelligent Mail barcode; scans appear on a five-stage timeline from production to delivery, and dynamic QR codes report responses.",
  },
];

function Faq() {
  return (
    <div
      className="surface-card mx-auto max-w-3xl divide-y divide-hairline overflow-hidden"
      data-ocid="home.faq"
    >
      {FAQ.map((item, i) => (
        <details key={item.q} className="group px-5 sm:px-6" open={i === 0}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-4 font-display text-base font-bold tracking-tight text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="btn-3d-neutral flex size-8 shrink-0 items-center justify-center rounded-full pb-px text-xl font-medium leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none">
              +
            </span>
          </summary>
          <p className="-mt-1 pb-5 text-sm leading-relaxed text-muted-foreground">
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {STATS.map((s) => (
        <div
          key={s.value}
          className="surface-card relative isolate overflow-hidden p-4 text-center transition-smooth hover:-translate-y-1 hover:shadow-raised sm:p-6"
        >
          <div aria-hidden="true" className="ambient-glow-backdrop" />
          <div className="stat-number text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {s.value}
          </div>
          <div className="mt-2 text-sm font-bold text-foreground">
            {s.label}
          </div>
          <div className="meta-mono mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Dual Value Pillars ─── */
function ValuePillars() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="surface-card group relative isolate overflow-hidden p-6 transition-smooth hover:-translate-y-0.5 hover:shadow-raised sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 -z-10 size-44 rounded-full bg-primary/10 blur-3xl transition-smooth group-hover:bg-primary/20"
        />
        <div className="relative">
          <div className={`${ICON_TILE} mb-5 size-14`}>
            <Upload className="size-6" />
          </div>
          <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Win back the customers you already have
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Upload a CSV of past buyers. Every row is scrubbed to USPS standards
            through EZmailout's CASS verification — ZIP+4 appended,
            undeliverable addresses flagged — before a single piece is printed.
            Save the clean list as a preset and reuse it next quarter.
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-hairline pt-5">
            {[
              "CASS-certified scrub via EZmailout",
              "ZIP+4 and delivery-point correction",
              "Invalid rows highlighted before you pay",
              "Saved audience presets for repeat drops",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-brand/15">
                  <Check
                    className="size-3 text-emerald-brand"
                    strokeWidth={3}
                  />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface-card group relative isolate overflow-hidden p-6 transition-smooth hover:-translate-y-0.5 hover:shadow-raised sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 -z-10 size-44 rounded-full bg-primary/10 blur-3xl transition-smooth group-hover:bg-primary/20"
        />
        <div className="relative">
          <div className={`${ICON_TILE} mb-5 size-14`}>
            <MapPin className="size-6" />
          </div>
          <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Reach every mailbox around your location
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            No list? Drop a pin, drag the radius, and see an instant household
            estimate built from USPS EDDM carrier routes. Target the ZIP codes
            and routes that matter and launch without buying a single record.
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-hairline pt-5">
            {[
              "Interactive radius builder on a live map",
              "EDDM carrier-route household estimates",
              "ZIP code and route-level targeting",
              "Works alongside your CSV audiences",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-brand/15">
                  <Check
                    className="size-3 text-emerald-brand"
                    strokeWidth={3}
                  />
                </span>
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
      <div className={`${BRAND_PANEL} rounded-3xl p-6 sm:p-10`}>
        {/* Depth only ever darkens the indigo under the white text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 -z-10 size-80 rounded-full bg-black/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Sparkles className="size-3.5 text-primary-foreground" />
            AI Studio
          </div>
          <h3 className="mt-5 font-display text-2xl font-black leading-tight tracking-tight sm:text-[2rem]">
            Backgrounds and copy, generated inside the canvas
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground">
            Describe the vibe and drop an AI background straight onto your
            postcard. Ask the AI copywriter for headlines, bullets and calls to
            action tuned to your offer. Every member gets {MONTHLY_ALLOWANCE}{" "}
            credits with each 30-day pass — one credit is one cent.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className={`${BRAND_PANEL_INSET} p-4`}>
              <div className="flex items-center gap-2 text-sm font-bold">
                <ImageIcon className="size-4 text-primary-foreground" />
                AI backgrounds
              </div>
              <div className="mt-1 text-xs text-primary-foreground">
                From {AI_COSTS.squareImage} credits (square) ·{" "}
                {AI_COSTS.wideImage} wide · {AI_COSTS.hdImage} HD
              </div>
            </div>
            <div className={`${BRAND_PANEL_INSET} p-4`}>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Type className="size-4 text-primary-foreground" />
                AI copywriting
              </div>
              <div className="mt-1 text-xs text-primary-foreground">
                {AI_COSTS.copy} credit per generation — headlines, bullets and
                CTAs
              </div>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="mt-6 h-12 w-full gap-2 px-7 text-base sm:w-auto"
          >
            <Link to="/wizard" data-ocid="ai_studio.try.link">
              Try it in the wizard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Beside the taller AI Studio panel (lg) the pack rows share the
          card's extra height, so the card ends with the panel and no empty
          space collects under the note. */}
      <div className="surface-card flex flex-col p-6 sm:p-8">
        <h4 className="font-display text-lg font-extrabold tracking-tight text-foreground">
          Need more credits?
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Top up any time. Bigger packs include bonus credits.
        </p>
        <ul className="mt-5 flex flex-1 flex-col gap-3">
          {CREDIT_PACKS.map((pack) => (
            <li
              key={pack.id}
              className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-hairline bg-card-raised px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] transition-smooth hover:border-primary/30 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
              data-ocid={`ai_studio.pack.${pack.id.toLowerCase()}.item`}
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">
                  {pack.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pack.credits.toLocaleString("en-US")} credits
                  {pack.bonus > 0 ? ` · includes ${pack.bonus} bonus` : ""}
                </div>
              </div>
              <div className="shrink-0 font-display text-xl font-black tabular-nums tracking-tight text-primary">
                {formatCents(pack.priceCents)}
              </div>
            </li>
          ))}
        </ul>
        <p className="status-pill status-pill-emerald mt-4 self-start">
          <Check className="size-3.5" strokeWidth={2.5} />
          Credits never expire.
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
    label: `${formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "")} 30-day membership, no minimums`,
    us: "yes",
    generic: "no",
    traditional: "no",
    note: "Minimum print runs or quotes elsewhere",
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
      <span className="inline-flex size-7 items-center justify-center rounded-full border border-emerald-brand/25 bg-emerald-brand/15">
        <Check
          className="size-4 text-emerald-brand"
          strokeWidth={2.5}
          aria-label="Included"
        />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full border border-hairline bg-muted">
        <Minus
          className="size-4 text-muted-foreground"
          aria-label="Partial or add-on"
        />
      </span>
    );
  }
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
      <X className="size-4 text-destructive" aria-label="Not included" />
    </span>
  );
}

function ComparisonTable() {
  return (
    <div className="surface-card overflow-hidden">
      {/* Below sm the table scrolls sideways: the next column starts inside
          the card and runs under a shadow on the right edge, which says there
          is more to see; the last column's extra right padding keeps its
          content clear of the shadow at the end of the scroll. */}
      <div className="relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm sm:min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline bg-card-raised">
                <th className="px-4 py-4 text-left font-display font-extrabold text-foreground sm:px-6">
                  Feature
                </th>
                <th className="bg-primary/5 px-4 py-4 text-center font-display font-extrabold text-primary-ink sm:px-6">
                  EZmailout
                </th>
                <th className="px-4 py-4 text-center font-display font-bold text-muted-foreground sm:px-6">
                  Generic API provider
                </th>
                <th className="py-4 pl-4 pr-10 text-center font-display font-bold text-muted-foreground sm:pl-6 sm:pr-6">
                  Traditional print shop
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr
                  key={f.label}
                  className="border-b border-hairline transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-4 sm:px-6">
                    <div className="font-semibold text-foreground">
                      {f.label}
                    </div>
                    {f.note && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {f.note}
                      </div>
                    )}
                  </td>
                  <td className="bg-primary/5 px-4 py-4 text-center sm:px-6">
                    <SupportCell value={f.us} />
                  </td>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <SupportCell value={f.generic} />
                  </td>
                  <td className="py-4 pl-4 pr-10 text-center sm:pl-6 sm:pr-6">
                    <SupportCell value={f.traditional} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/[0.07] to-transparent dark:from-black/50 sm:hidden"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline bg-card-raised px-6 py-3 text-xs text-muted-foreground">
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
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-navy px-6 pb-10 pt-8 text-center text-white shadow-raised sm:px-12 sm:pb-12">
      {/* Indigo backlight behind Stampy and the headline; it only deepens
          the navy into indigo, so the white text keeps ≥ 6:1. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_65%_at_50%_0%,rgb(99_102_241/0.42),transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="airmail-stripe absolute inset-x-0 bottom-0"
      />
      <div className="relative">
        <MascotStage
          pose="mail"
          size="md"
          className="mx-auto mb-5"
          mascotClassName="size-24 sm:size-28"
        />
        <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-balance sm:text-[2.25rem]">
          Your first campaign can be in the mail tomorrow
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
          Pick a format, upload a list or drop a pin, design it in the studio
          and launch. You pay per piece, printing and postage included, and
          membership ({formatCents(SUBSCRIPTION_PRICE_CENTS)} for 30 days) is
          optional.
        </p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-12 gap-2 px-8 text-base">
            <Link to="/wizard" data-ocid="final_cta.launch_campaign.button">
              Launch a campaign
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-8 text-base"
          >
            <Link to="/templates" data-ocid="final_cta.templates.link">
              Browse templates
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 px-6 text-base text-white hover:bg-white/10 hover:text-white"
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
        title="Every EZmailout format, one price list"
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
        title="One membership. The best volume rate."
        subtitle="Skip the volume tiers and quote requests. Members pay the 10,000-piece rate on every volume-priced size; smaller orders cost more per piece, because each card payment carries a fixed fee."
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
        subtitle={`${MONTHLY_ALLOWANCE} AI credits come with each 30-day membership. Top up with packs from ${formatCents(CREDIT_PACKS[0].priceCents)}.`}
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

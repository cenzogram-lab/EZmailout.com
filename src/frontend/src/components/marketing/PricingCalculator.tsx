import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CATALOG, categoryRows } from "@/lib/catalog";
import { formatNumber } from "@/lib/format";
import {
  PRICING_LEDGER,
  SUBSCRIPTION_PRICE_CENTS,
  formatCents,
  getBenchmarkCents,
  getPricingRow,
  getUnitPriceCents,
  mailClassLabel,
  pieceRateCents,
  startingPriceCents,
  tierSummary,
  volumeTiers,
} from "@/lib/pricing";

/** The most one card payment can take (`PricingLib.maxOrderCents`). */
const MAX_ORDER_CENTS = 99_999_999;
import { Calculator, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";

const MIN_QTY = 50;
/** Campaigns have no size limit; the box takes up to this many pieces. */
const MAX_QTY = 1_000_000;
/** The slider spans every volume tier (the last starts at 50,000). */
const SLIDER_MAX = 100_000;
const STEP = 50;
const DEFAULT_QTY = 500;
// Opens on the most-mailed card, which has volume tiers.
const DEFAULT_VARIANT = getPricingRow("4.25x6")?.id ?? PRICING_LEDGER[0].id;

function clampQty(value: number): number {
  if (!Number.isFinite(value)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(value)));
}

interface Quote {
  retailCents: number;
  /** How much the card fee's fixed part lifts this order's per-piece price. */
  smallOrderCents: number;
  memberCents: number;
  benchmarkCents: number;
  ezTotalCents: number;
  shopTotalCents: number;
  savingsCents: number;
  savingsPercent: number;
  perPieceSavingsCents: number;
  breakEvenPieces: number | null;
  memberNetCents: number;
}

function buildQuote(layoutVariant: string, qty: number): Quote {
  const row = getPricingRow(layoutVariant) ?? PRICING_LEDGER[0];
  // Volume pricing as checkout applies it: the tier for this many pieces,
  // and the member rate (any volume) for the membership comparison.
  const retailCents = getUnitPriceCents(row.id, qty, false);
  const memberCents = getUnitPriceCents(row.id, qty, true);
  const benchmarkCents = getBenchmarkCents(row.id);
  const ezTotalCents = qty * retailCents;
  const shopTotalCents = qty * benchmarkCents;
  const savingsCents = shopTotalCents - ezTotalCents;
  const savingsPercent =
    shopTotalCents > 0 ? (savingsCents / shopTotalCents) * 100 : 0;
  const perPieceSavingsCents = benchmarkCents - retailCents;
  const memberSavingsPerPiece = retailCents - memberCents;
  const breakEvenPieces =
    memberSavingsPerPiece > 0
      ? Math.ceil(SUBSCRIPTION_PRICE_CENTS / memberSavingsPerPiece)
      : null;
  return {
    retailCents,
    smallOrderCents: Math.max(0, retailCents - pieceRateCents(row.id, qty)),
    memberCents,
    benchmarkCents,
    ezTotalCents,
    shopTotalCents,
    savingsCents,
    savingsPercent,
    perPieceSavingsCents,
    breakEvenPieces,
    memberNetCents: memberSavingsPerPiece * qty - SUBSCRIPTION_PRICE_CENTS,
  };
}

/** Interactive EZmailout vs. print-shop savings calculator (all math client-side). */
export function PricingCalculator() {
  const [layoutVariant, setLayoutVariant] = useState<string>(DEFAULT_VARIANT);
  const [qty, setQty] = useState<number>(DEFAULT_QTY);
  const [qtyInput, setQtyInput] = useState<string>(String(DEFAULT_QTY));

  const row = getPricingRow(layoutVariant) ?? PRICING_LEDGER[0];
  const quote = useMemo(
    () => buildQuote(layoutVariant, qty),
    [layoutVariant, qty],
  );

  function commitQty(next: number) {
    const clamped = clampQty(next);
    setQty(clamped);
    setQtyInput(String(clamped));
  }

  function handleInputChange(raw: string) {
    setQtyInput(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed)) {
      setQty(clampQty(parsed));
    }
  }

  const savingsPositive = quote.savingsCents > 0;

  return (
    <div
      className="surface-card overflow-hidden"
      data-ocid="pricing_calc.panel"
    >
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Inputs */}
        <div className="min-w-0 border-b border-hairline p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="status-pill status-pill-indigo px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">
            <Calculator className="size-3.5" />
            Build your estimate
          </div>

          <div className="mt-6 space-y-2">
            <Label
              htmlFor="pricing-calc-product"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Product &amp; format
            </Label>
            <Select value={layoutVariant} onValueChange={setLayoutVariant}>
              <SelectTrigger
                id="pricing-calc-product"
                className="h-11 w-full rounded-2xl"
                data-ocid="pricing_calc.product.select"
              >
                <SelectValue placeholder="Choose a format" />
              </SelectTrigger>
              <SelectContent>
                {CATALOG.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel>{category.name}</SelectLabel>
                    {categoryRows(category).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.documentClass} ·{" "}
                        {tierSummary(item.id) ? "from " : ""}
                        {formatCents(startingPriceCents(item.id))}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {row.documentClass} · {row.paperType} ·{" "}
              {mailClassLabel(row.mailClass)}
              {row.envelope ? ` · ${row.envelope} envelope` : ""}
            </p>
            {tierSummary(row.id) ? (
              <p
                className="text-xs text-muted-foreground"
                data-ocid="pricing_calc.tiers.text"
              >
                Volume pricing: {tierSummary(row.id)}
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="pricing-calc-qty"
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Pieces to mail
              </Label>
              <Input
                id="pricing-calc-qty"
                type="number"
                inputMode="numeric"
                min={MIN_QTY}
                max={MAX_QTY}
                step={STEP}
                value={qtyInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={() => commitQty(Number(qtyInput))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitQty(Number(qtyInput));
                }}
                className="h-11 w-32 rounded-2xl text-right font-mono text-base font-bold tabular-nums"
                data-ocid="pricing_calc.quantity.input"
              />
            </div>
            <Slider
              value={[Math.min(qty, SLIDER_MAX)]}
              min={MIN_QTY}
              max={SLIDER_MAX}
              step={STEP}
              onValueChange={(values) => commitQty(values[0] ?? MIN_QTY)}
              aria-label="Pieces to mail"
              data-ocid="pricing_calc.quantity.slider"
              className="py-2"
            />
            <div className="meta-mono flex justify-between text-[11px]">
              <span>{formatNumber(MIN_QTY)}</span>
              <span>{formatNumber(SLIDER_MAX)}+</span>
            </div>
          </div>

          {/* Per-piece tiles. Below sm the mono label drops to 10 px with no
              tracking so "Print shop / piece" stays on one line in a
              half-width tile (from 360 px); narrower phones stack the tiles
              as rows, label beside the price. "/ piece" never breaks apart. */}
          <dl className="mt-6 grid grid-cols-1 gap-2 text-sm min-[360px]:grid-cols-2 sm:gap-3">
            <div className="flex min-w-0 items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl border border-hairline bg-card-raised px-3 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] min-[360px]:flex-col min-[360px]:items-start min-[360px]:px-2.5 sm:p-3.5 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
              <dt className="min-w-0 font-mono text-[10px] uppercase tracking-normal text-muted-foreground sm:text-[11px] sm:tracking-[0.06em]">
                EZmailout <span className="whitespace-nowrap">/ piece</span>
              </dt>
              <dd className="font-display text-2xl font-black tabular-nums tracking-tight text-primary">
                {formatCents(quote.retailCents)}
              </dd>
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl border border-hairline bg-card-raised px-3 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] min-[360px]:flex-col min-[360px]:items-start min-[360px]:px-2.5 sm:p-3.5 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
              <dt className="min-w-0 font-mono text-[10px] uppercase tracking-normal text-muted-foreground sm:text-[11px] sm:tracking-[0.06em]">
                Print shop <span className="whitespace-nowrap">/ piece</span>
              </dt>
              <dd className="font-display text-2xl font-black tabular-nums tracking-tight text-muted-foreground line-through decoration-muted-foreground/60 decoration-2">
                {formatCents(quote.benchmarkCents)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Results: the order summary, in the indigo backlight. */}
        <div className="relative isolate min-w-0 bg-card-raised p-6 sm:p-8">
          <div aria-hidden="true" className="ambient-glow-backdrop" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-primary/30 bg-card p-4 shadow-surface ring-1 ring-primary/10 sm:p-5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                EZmailout total
              </div>
              <div
                className="mt-1.5 font-display text-[2rem] font-black leading-none tabular-nums tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl"
                data-ocid="pricing_calc.ez_total.value"
              >
                {formatCents(quote.ezTotalCents)}
              </div>
              <div className="meta-mono mt-2">
                {formatNumber(qty)} × {formatCents(quote.retailCents)}
              </div>
              {quote.smallOrderCents > 0 ? (
                <div
                  className="mt-2 text-xs text-muted-foreground"
                  data-ocid="pricing_calc.small_order.note"
                >
                  Includes {formatCents(quote.smallOrderCents)} a piece toward
                  the fixed card fee on small orders.
                </div>
              ) : null}
              {quote.ezTotalCents > MAX_ORDER_CENTS ? (
                <div
                  className="mt-2 text-xs text-muted-foreground"
                  data-ocid="pricing_calc.split.note"
                >
                  Over the {formatCents(MAX_ORDER_CENTS)} one card payment can
                  take: send it as several campaigns.
                </div>
              ) : null}
            </div>
            <div className="min-w-0 rounded-2xl border border-hairline bg-card p-4 shadow-surface sm:p-5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Traditional print shop
              </div>
              <div
                className="mt-1.5 font-display text-[1.75rem] font-black leading-none tabular-nums tracking-tight text-muted-foreground [overflow-wrap:anywhere] sm:text-3xl"
                data-ocid="pricing_calc.shop_total.value"
              >
                {formatCents(quote.shopTotalCents)}
              </div>
              <div className="meta-mono mt-2">
                {formatNumber(qty)} × {formatCents(quote.benchmarkCents)}
              </div>
            </div>
          </div>

          <div
            className={
              savingsPositive
                ? "mt-4 rounded-2xl border border-emerald-brand/30 bg-card bg-gradient-to-b from-emerald-brand/[0.13] to-emerald-brand/[0.05] p-5 shadow-surface"
                : "mt-4 rounded-2xl border border-hairline bg-card p-5"
            }
            data-ocid="pricing_calc.savings.panel"
          >
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-brand">
              <TrendingDown className="size-4" />
              You save
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="stat-number min-w-0 text-[clamp(1.75rem,9vw,2.25rem)] text-foreground [overflow-wrap:anywhere] md:text-5xl">
                {formatCents(Math.max(0, quote.savingsCents))}
              </span>
              <span className="rounded-full border border-black/10 bg-emerald-brand px-2.5 py-0.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
                {Math.max(0, quote.savingsPercent).toFixed(0)}% less
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatCents(Math.max(0, quote.perPieceSavingsCents))} saved on
              every piece versus a typical local print shop + postage quote.
            </p>
          </div>

          <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-card text-sm shadow-surface">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-muted-foreground">Member rate / piece</span>
              <span
                className="font-mono font-bold tabular-nums text-foreground"
                data-ocid="pricing_calc.member_rate.value"
              >
                {formatCents(quote.memberCents)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-muted-foreground">
                EZmailout membership
              </span>
              <span className="shrink-0 font-mono font-bold tabular-nums text-foreground">
                {formatCents(SUBSCRIPTION_PRICE_CENTS)} / 30 days
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-muted-foreground">
                Member savings on this order, after the fee
              </span>
              <span
                className={
                  quote.memberNetCents >= 0
                    ? "font-mono font-bold tabular-nums text-emerald-brand"
                    : "font-mono font-bold tabular-nums text-muted-foreground"
                }
              >
                {quote.memberNetCents >= 0 ? "" : "−"}
                {formatCents(Math.abs(quote.memberNetCents))}
              </span>
            </div>
          </div>

          <p
            className="mt-4 text-center text-sm font-semibold text-foreground"
            data-ocid="pricing_calc.break_even.note"
          >
            {quote.breakEvenPieces !== null
              ? `Membership pays for itself after ${formatNumber(quote.breakEvenPieces)} ${
                  quote.breakEvenPieces === 1 ? "piece" : "pieces"
                }.`
              : volumeTiers(row.id)
                ? "At this volume members pay the same as everyone."
                : "This format costs the same for everyone; members save on volume-priced formats."}
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Print-shop benchmark is a typical local quote including postage.
            EZmailout charges the per-piece rate for your volume; membership is
            optional.
          </p>
        </div>
      </div>
    </div>
  );
}

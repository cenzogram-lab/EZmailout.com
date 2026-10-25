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
  startingPriceCents,
  tierSummary,
} from "@/lib/pricing";
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
      className="surface-glow overflow-hidden rounded-2xl border border-border bg-card"
      data-ocid="pricing_calc.panel"
    >
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Inputs */}
        <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Calculator className="size-4" />
            Build your estimate
          </div>

          <div className="mt-6 space-y-2">
            <Label
              htmlFor="pricing-calc-product"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Product &amp; format
            </Label>
            <Select value={layoutVariant} onValueChange={setLayoutVariant}>
              <SelectTrigger
                id="pricing-calc-product"
                className="w-full"
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
            <div className="flex items-end justify-between gap-4">
              <Label
                htmlFor="pricing-calc-qty"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                className="w-32 text-right font-mono"
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
            />
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>{formatNumber(MIN_QTY)}</span>
              <span>{formatNumber(SLIDER_MAX)}+</span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-background p-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                EZmailout / piece
              </dt>
              <dd className="mt-1 font-display text-lg font-bold text-primary">
                {formatCents(quote.retailCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Print shop / piece
              </dt>
              <dd className="mt-1 font-display text-lg font-bold text-muted-foreground line-through decoration-muted-foreground/50">
                {formatCents(quote.benchmarkCents)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Results */}
        <div className="bg-muted/30 p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/30 bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                EZmailout total
              </div>
              <div
                className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground"
                data-ocid="pricing_calc.ez_total.value"
              >
                {formatCents(quote.ezTotalCents)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatNumber(qty)} × {formatCents(quote.retailCents)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Traditional print shop
              </div>
              <div
                className="mt-1 font-display text-3xl font-extrabold tracking-tight text-muted-foreground"
                data-ocid="pricing_calc.shop_total.value"
              >
                {formatCents(quote.shopTotalCents)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatNumber(qty)} × {formatCents(quote.benchmarkCents)}
              </div>
            </div>
          </div>

          <div
            className={
              savingsPositive
                ? "mt-4 rounded-xl border border-emerald-brand/30 bg-emerald-brand/10 p-5"
                : "mt-4 rounded-xl border border-border bg-card p-5"
            }
            data-ocid="pricing_calc.savings.panel"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-brand">
              <TrendingDown className="size-4" />
              You save
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                {formatCents(Math.max(0, quote.savingsCents))}
              </span>
              <span className="rounded-full bg-emerald-brand px-2.5 py-0.5 text-xs font-bold text-white">
                {Math.max(0, quote.savingsPercent).toFixed(0)}% less
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatCents(Math.max(0, quote.perPieceSavingsCents))} saved on
              every piece versus a typical local print shop + postage quote.
            </p>
          </div>

          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card text-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted-foreground">Member rate / piece</span>
              <span
                className="font-mono font-medium text-foreground"
                data-ocid="pricing_calc.member_rate.value"
              >
                {formatCents(quote.memberCents)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted-foreground">
                EZmailout membership
              </span>
              <span className="font-mono font-medium text-foreground">
                {formatCents(SUBSCRIPTION_PRICE_CENTS)} / mo
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted-foreground">
                Member savings on this order, after the fee
              </span>
              <span
                className={
                  quote.memberNetCents >= 0
                    ? "font-mono font-semibold text-emerald-brand"
                    : "font-mono font-semibold text-muted-foreground"
                }
              >
                {quote.memberNetCents >= 0 ? "" : "−"}
                {formatCents(Math.abs(quote.memberNetCents))}
              </span>
            </div>
          </div>

          <p
            className="mt-4 text-center text-sm font-medium text-foreground"
            data-ocid="pricing_calc.break_even.note"
          >
            {quote.breakEvenPieces !== null
              ? `Membership pays for itself after ${formatNumber(quote.breakEvenPieces)} ${
                  quote.breakEvenPieces === 1 ? "piece" : "pieces"
                }.`
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

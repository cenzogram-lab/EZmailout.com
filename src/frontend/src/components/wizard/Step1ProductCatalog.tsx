import { CatalogIcon } from "@/components/catalog/CatalogIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATALOG,
  CATALOG_SIZE_COUNT,
  type CatalogCategory,
  categoryForVariant,
  categoryFromCents,
  categoryRows,
} from "@/lib/catalog";
import { layoutLabel, sizeLabel } from "@/lib/format";
import {
  type CatalogMailClass,
  type PricingRowUi,
  SUBSCRIPTION_PRICE_CENTS,
  catalogMailClassLabel,
  formatCents,
  getPricingRow,
  mailClassDelivery,
  supportsBlackAndWhite,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

const COLOR_OPTIONS = [
  { label: "Full Color", value: "full_color" },
  { label: "Black & White", value: "bw" },
];

function suggestCampaignName(layoutVariant: string): string {
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return `${layoutLabel(layoutVariant)} campaign – ${month}`;
}

/** Tiny proportional rectangle that previews a format's aspect ratio. */
export function AspectBadge({
  row,
  className,
}: {
  row: PricingRowUi;
  className?: string;
}) {
  const ratio = row.widthInches / row.heightInches;
  const box = 28;
  const w = ratio >= 1 ? box : Math.max(8, Math.round(box * ratio));
  const h = ratio >= 1 ? Math.max(8, Math.round(box / ratio)) : box;
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted",
        className,
      )}
      title={`${row.widthInches}″ × ${row.heightInches}″`}
      data-ocid={`catalog.aspect.${row.id}`}
    >
      <span
        className="block rounded-[2px] border border-navy/60 bg-card"
        style={{ width: w, height: h }}
      />
    </span>
  );
}

function SizeRow({
  row,
  selected,
  mailClass,
  onSelect,
  onMailClass,
}: {
  row: PricingRowUi;
  selected: boolean;
  mailClass: CatalogMailClass;
  onSelect: () => void;
  onMailClass: (mailClass: CatalogMailClass) => void;
}) {
  const multiClass = row.supportedMailClasses.length > 1;
  return (
    <div
      className={cn(
        "rounded-xl border transition-smooth",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40",
      )}
      data-ocid={`catalog.size.${row.id}.row`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm"
        data-ocid={`catalog.format.${row.id}.button`}
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card",
          )}
        >
          {selected && <Check className="size-3" />}
        </span>
        <AspectBadge row={row} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug text-foreground">
            {row.documentClass}
          </span>
          <span
            className="block font-mono text-xs text-muted-foreground"
            data-ocid={`catalog.size.${row.id}.meta`}
          >
            {sizeLabel(row.id)} · {row.paperType}
            {row.envelope ? ` · ${row.envelope}` : ""}
          </span>
        </span>
        <Badge
          className="mt-0.5 shrink-0 bg-primary text-primary-foreground"
          data-ocid={`catalog.size.${row.id}.price`}
        >
          {formatCents(row.retailPriceCents)} / piece
        </Badge>
      </button>
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 pl-[4.25rem]">
        {row.supportedMailClasses.map((option) => {
          const active = option === mailClass;
          return (
            <button
              key={option}
              type="button"
              disabled={!multiClass}
              onClick={() => {
                if (!selected) onSelect();
                onMailClass(option);
              }}
              aria-pressed={active}
              title={
                multiClass
                  ? `Send this format as ${catalogMailClassLabel(option)}`
                  : catalogMailClassLabel(option)
              }
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-smooth",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/60 text-muted-foreground",
                multiClass && !active && "hover:border-primary/50",
                !multiClass && "cursor-default",
              )}
              data-ocid={`catalog.size.${row.id}.class.${option}`}
            >
              {catalogMailClassLabel(option)} · {mailClassDelivery(option)}
            </button>
          );
        })}
        {row.note ? (
          <span className="text-[11px] text-muted-foreground">{row.note}</span>
        ) : null}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  expanded,
  selected,
  onToggle,
}: {
  category: CatalogCategory;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const rows = categoryRows(category);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-2xl border bg-card px-3 py-5 text-center transition-smooth",
        expanded
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        selected && !expanded && "border-primary/60",
      )}
      data-ocid={`catalog.category.${category.id}.button`}
    >
      <CatalogIcon
        id={category.icon}
        className={cn(
          "size-10 transition-smooth",
          expanded || selected
            ? "text-primary"
            : "text-[#575859] group-hover:text-primary",
        )}
      />
      <span className="text-sm font-semibold leading-tight text-foreground">
        {category.name}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {rows.length} size{rows.length === 1 ? "" : "s"} · from{" "}
        {formatCents(categoryFromCents(category))}
      </span>
      <ChevronDown
        className={cn(
          "size-4 text-muted-foreground transition-transform",
          expanded && "rotate-180 text-primary",
        )}
      />
    </button>
  );
}

/** Step 1: browse the Click2Mail catalog, expand a category and pick a size. */
export function Step1ProductCatalog() {
  const campaignName = useWizardStore((s) => s.campaignName);
  const setCampaignName = useWizardStore((s) => s.setCampaignName);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const setProduct = useWizardStore((s) => s.setProduct);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setMailClass = useWizardStore((s) => s.setMailClass);
  const selectedSpec = useWizardStore((s) => s.selectedSpec);
  const setStep = useWizardStore((s) => s.setStep);

  const selectedCategory = selectedLayout
    ? categoryForVariant(selectedLayout)
    : undefined;
  const [expandedId, setExpandedId] = useState<string | null>(
    selectedCategory?.id ?? null,
  );
  const [colorOption, setColorOption] = useState<string>(
    selectedProduct?.colorOption ?? "full_color",
  );

  const expanded = CATALOG.find((c) => c.id === expandedId) ?? null;
  const selectedRow = selectedLayout ? getPricingRow(selectedLayout) : null;

  function chooseFormat(category: CatalogCategory, layoutVariant: string) {
    const bw = supportsBlackAndWhite(category.productType);
    setProduct({
      productType: category.productType,
      layoutVariant,
      colorOption: bw ? colorOption : undefined,
    });
    setLayout(layoutVariant);
  }

  function chooseColor(value: string) {
    setColorOption(value);
    if (selectedProduct && selectedLayout) {
      setProduct({ ...selectedProduct, colorOption: value });
    }
  }

  function handleContinue() {
    if (!selectedLayout || !selectedProduct) return;
    if (!campaignName.trim()) {
      setCampaignName(suggestCampaignName(selectedLayout));
    }
    setStep(2);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Choose your mail piece
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {CATALOG.length} Click2Mail product families, {CATALOG_SIZE_COUNT}{" "}
            sizes. Every price includes printing, postage and CASS address
            verification — no minimum order.
          </p>
        </div>
        <div className="w-full space-y-1.5 lg:max-w-sm">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder={
              selectedLayout
                ? suggestCampaignName(selectedLayout)
                : "e.g. Spring open-house mailer"
            }
            maxLength={120}
            className="rounded-xl bg-card"
            data-ocid="catalog.campaign_name.input"
          />
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        data-ocid="catalog.category.grid"
      >
        {CATALOG.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            expanded={expandedId === category.id}
            selected={selectedCategory?.id === category.id}
            onToggle={() =>
              setExpandedId((current) =>
                current === category.id ? null : category.id,
              )
            }
          />
        ))}
      </div>

      {expanded ? (
        <div
          className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm animate-fade-up sm:p-6"
          data-ocid={`catalog.sizes.${expanded.id}.panel`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CatalogIcon id={expanded.icon} className="size-7" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {expanded.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {expanded.blurb}
                </p>
                {expanded.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {expanded.note}
                  </p>
                ) : null}
              </div>
            </div>
            {supportsBlackAndWhite(expanded.productType) ? (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Print colour
                </span>
                {COLOR_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={colorOption === opt.value ? "default" : "outline"}
                    onClick={() => chooseColor(opt.value)}
                    data-ocid={`catalog.color.${opt.value}.button`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div
            className="mt-4 grid gap-2 lg:grid-cols-2"
            data-ocid={`catalog.sizes.${expanded.id}.list`}
          >
            {categoryRows(expanded).map((row) => (
              <SizeRow
                key={row.id}
                row={row}
                selected={selectedLayout === row.id}
                mailClass={
                  selectedLayout === row.id && selectedSpec
                    ? selectedSpec.mailClass
                    : row.defaultMailClass
                }
                onSelect={() => chooseFormat(expanded, row.id)}
                onMailClass={setMailClass}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Pick a category above to see every size, aspect ratio and per-piece
          price.
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <p className="text-sm text-foreground">
          <span className="font-semibold">
            {formatCents(SUBSCRIPTION_PRICE_CENTS)}/month membership
          </span>{" "}
          unlocks these wholesale rates on every size — send one piece or ten
          thousand at the same per-piece price, next-day production by
          Click2Mail, USPS IMb tracking included.
        </p>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <div
          className="text-sm text-muted-foreground"
          data-ocid="catalog.selection.summary"
        >
          {selectedRow ? (
            <span>
              Selected:{" "}
              <span className="font-medium text-foreground">
                {selectedRow.documentClass}
              </span>{" "}
              · {sizeLabel(selectedRow.id)} ·{" "}
              {formatCents(selectedRow.retailPriceCents)} per piece (
              {catalogMailClassLabel(
                selectedSpec?.mailClass ?? selectedRow.defaultMailClass,
              )}
              )
            </span>
          ) : (
            "Pick a size to continue."
          )}
        </div>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedLayout}
          className="gap-2"
          data-ocid="catalog.continue.button"
        >
          Continue to audience
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

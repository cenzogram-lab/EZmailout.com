import { CatalogIcon } from "@/components/catalog/CatalogIcon";
import { WizardGlow } from "@/components/layout/WizardLayout";
import { StampyStep1Catalog, StampyTip } from "@/components/stampy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { MAX_CAMPAIGN_NAME_CHARS } from "@/lib/inputLimits";
import {
  type CatalogMailClass,
  type PricingRowUi,
  SUBSCRIPTION_PRICE_CENTS,
  catalogMailClassLabel,
  classSurchargeCents,
  firstClassAddLabel,
  formatCents,
  getPricingRow,
  mailClassDelivery,
  pieceRateCents,
  startingPriceCents,
  supportsBlackAndWhite,
  tierSummary,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { sideHasContent } from "./usePrintDocument";

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
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-hairline bg-well",
        className,
      )}
      title={`${row.widthInches}″ × ${row.heightInches}″`}
      data-ocid={`catalog.aspect.${row.id}`}
    >
      <span
        className="block rounded-[3px] border border-muted-foreground/60 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.18)] dark:border-transparent dark:bg-muted-foreground"
        style={{ width: w, height: h }}
      />
    </span>
  );
}

/** A per-piece price as a heavy figure: "from $0.59 / piece". */
function PriceTag({
  from,
  cents,
  className,
  ocid,
}: {
  from: boolean;
  cents: number;
  className?: string;
  ocid: string;
}) {
  return (
    <span
      className={cn(
        "items-baseline gap-1 whitespace-nowrap text-foreground",
        className,
      )}
      data-ocid={ocid}
    >
      {from ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {"from "}
        </span>
      ) : null}
      <span className="text-xl font-black leading-none tracking-tight tabular-nums sm:text-2xl">
        {formatCents(cents)}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">
        {" / piece"}
      </span>
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
  /** Chooses this format, in `mailClass` when a class chip was pressed. */
  onSelect: (mailClass?: CatalogMailClass) => void;
  onMailClass: (mailClass: CatalogMailClass) => void;
}) {
  const multiClass = row.supportedMailClasses.length > 1;
  // Volume-tiered formats show the lowest price a customer can reach and
  // spell out the tiers; flat-priced ones show their one price.
  const tiers = tierSummary(row.id);
  const fromCents = startingPriceCents(row.id);
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border transition-smooth",
        selected
          ? "border-primary/60 bg-primary/[0.07] shadow-[0_12px_28px_-16px_rgb(79_70_229/0.7)] ring-1 ring-primary/30"
          : "border-hairline bg-card-raised hover:border-primary/40 hover:shadow-surface",
      )}
      data-ocid={`catalog.size.${row.id}.row`}
    >
      <button
        type="button"
        onClick={() => onSelect()}
        aria-pressed={selected}
        className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:px-4"
        data-ocid={`catalog.format.${row.id}.button`}
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
            selected
              ? "btn-3d-primary text-primary-foreground"
              : "border border-input bg-card",
          )}
        >
          {selected && <Check className="size-3" />}
        </span>
        <AspectBadge row={row} className="hidden sm:inline-flex" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug tracking-tight text-foreground">
            {row.documentClass}
          </span>
          <span
            className="meta-mono mt-0.5 block tracking-normal"
            data-ocid={`catalog.size.${row.id}.meta`}
          >
            {sizeLabel(row.id)} · {row.paperType}
            {row.envelope ? ` · ${row.envelope}` : ""}
          </span>
          {tiers ? (
            <span
              className="mt-1 block text-xs text-muted-foreground"
              data-ocid={`catalog.size.${row.id}.tiers`}
            >
              {tiers}
            </span>
          ) : null}
          {/* On phones the price sits under the name, so the name and paper
              line keep the row's full width instead of one word per line. */}
          <PriceTag
            from={!!tiers}
            cents={fromCents}
            className="mt-2 flex sm:hidden"
            ocid={`catalog.size.${row.id}.price_inline`}
          />
        </span>
        <PriceTag
          from={!!tiers}
          cents={fromCents}
          className="mt-0.5 hidden shrink-0 sm:flex"
          ocid={`catalog.size.${row.id}.price`}
        />
      </button>
      {/* Mail classes. With several, a capsule segmented control (the
          chosen class is the raised pill): the options share the track
          equally and wrap their labels inside the pill (class name, then
          delivery time and any surcharge), so the choices stay side by side
          instead of the inactive one dropping to a bare second line. With
          one class there is nothing to choose, so it is a flat label, not a
          pill that reads as a toggle. */}
      <div className="space-y-1.5 px-3 pb-3 sm:px-4 sm:pl-[6.25rem]">
        {multiClass ? (
          <div className="segmented flex w-full max-w-full gap-1 rounded-[1.125rem] p-1">
            {row.supportedMailClasses.map((option) => {
              const active = option === mailClass;
              const surcharge =
                classSurchargeCents(row.id, option) > 0
                  ? `${firstClassAddLabel(row.id)}/pc`
                  : "";
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    // Another format's chip chooses that format in this
                    // class; a size change can wait on a dialog, so the
                    // class travels with it rather than landing on the
                    // current selection.
                    if (selected) onMailClass(option);
                    else onSelect(option);
                  }}
                  aria-pressed={active}
                  title={`Send this format as ${catalogMailClassLabel(option)}`}
                  className="segmented-item min-h-11 min-w-0 flex-1 basis-0 flex-col gap-0.5 whitespace-normal rounded-[0.875rem] px-2 py-1.5 text-center text-[11px] leading-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-10 sm:px-3"
                  data-ocid={`catalog.size.${row.id}.class.${option}`}
                >
                  {/* The hidden separator keeps the accessible name
                      "Class · delivery · surcharge" as one phrase. */}
                  <span className="text-balance">
                    {catalogMailClassLabel(option)}
                    <span className="sr-only"> · </span>
                  </span>
                  {/* Delivery time and surcharge each stay whole; when
                      they wrap, the "·" stays with the delivery time. */}
                  <span className="font-medium">
                    <span className="whitespace-nowrap">
                      {mailClassDelivery(option)}
                      {surcharge ? " ·" : ""}
                    </span>
                    {surcharge ? (
                      <>
                        {" "}
                        <span className="whitespace-nowrap">{surcharge}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          row.supportedMailClasses.map((option) => {
            const surcharge =
              classSurchargeCents(row.id, option) > 0
                ? `${firstClassAddLabel(row.id)}/pc`
                : "";
            return (
              <Badge
                key={option}
                variant="neutral"
                title={catalogMailClassLabel(option)}
                className="max-w-full whitespace-normal px-2.5 py-1 text-left text-[11px] font-medium leading-tight"
                data-ocid={`catalog.size.${row.id}.class.${option}`}
              >
                {catalogMailClassLabel(option)} · {mailClassDelivery(option)}
                {surcharge ? ` · ${surcharge}` : ""}
              </Badge>
            );
          })
        )}
        {row.note ? (
          <p className="text-[11px] text-muted-foreground">{row.note}</p>
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
        "group flex flex-col items-center gap-2.5 rounded-3xl border bg-card px-3 py-5 text-center shadow-surface outline-none transition-smooth focus-visible:ring-[3px] focus-visible:ring-ring/80",
        expanded
          ? "border-primary/60 bg-primary/[0.05] shadow-[0_16px_36px_-18px_rgb(79_70_229/0.75)] ring-2 ring-primary/25"
          : "border-hairline hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:hover:translate-y-0",
        selected && !expanded && "border-primary/50",
      )}
      data-ocid={`catalog.category.${category.id}.button`}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl transition-smooth",
          expanded || selected
            ? "btn-3d-primary text-primary-foreground"
            : "border border-hairline bg-well text-muted-foreground group-hover:text-foreground",
        )}
      >
        <CatalogIcon id={category.icon} className="size-8" />
      </span>
      <span className="text-sm font-bold leading-tight tracking-tight text-foreground">
        {category.name}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {rows.length} size{rows.length === 1 ? "" : "s"} · from{" "}
        <span className="font-bold text-foreground tabular-nums">
          {formatCents(categoryFromCents(category))}
        </span>
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

/** Step 1: browse the print catalog, expand a category and pick a size. */
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

  /** A size change that would wipe a design waits for a yes. */
  const [pendingFormat, setPendingFormat] = useState<{
    category: CatalogCategory;
    layoutVariant: string;
    mailClass?: CatalogMailClass;
  } | null>(null);

  function applyFormat(
    category: CatalogCategory,
    layoutVariant: string,
    mailClass?: CatalogMailClass,
  ) {
    const bw = supportsBlackAndWhite(category.productType);
    setProduct({
      productType: category.productType,
      layoutVariant,
      colorOption: bw ? colorOption : undefined,
    });
    setLayout(layoutVariant);
    if (mailClass) setMailClass(mailClass);
  }

  function chooseFormat(
    category: CatalogCategory,
    layoutVariant: string,
    mailClass?: CatalogMailClass,
  ) {
    // A design is laid out for its size: another size starts a blank one.
    const { canvas } = useWizardStore.getState();
    const designed =
      sideHasContent(canvas.front) || sideHasContent(canvas.back);
    if (selectedLayout && selectedLayout !== layoutVariant && designed) {
      setPendingFormat({ category, layoutVariant, mailClass });
      return;
    }
    applyFormat(category, layoutVariant, mailClass);
  }

  function chooseColor(value: string) {
    setColorOption(value);
    // Black & white applies only to the products printed that way; on a
    // postcard it would show on the invoice and print in colour anyway.
    if (
      selectedProduct &&
      selectedLayout &&
      supportsBlackAndWhite(selectedProduct.productType)
    ) {
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
    <div className="mx-auto w-full max-w-6xl space-y-6 py-2 sm:space-y-8">
      <div className="relative isolate flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <WizardGlow />
        <div className="space-y-2">
          <h2 className="display-heading text-3xl sm:text-4xl">
            Choose your mail piece
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {CATALOG.length} EZmailout product families, {CATALOG_SIZE_COUNT}{" "}
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
            maxLength={MAX_CAMPAIGN_NAME_CHARS}
            className="h-11 rounded-2xl"
            data-ocid="catalog.campaign_name.input"
          />
        </div>
      </div>

      <StampyTip id="step1" mascot={StampyStep1Catalog}>
        Pick your canvas! Need fast turnaround? Choose First-Class Postcards.
        Looking for high impact? Try our Jumbo 6×11 or Trifold Brochures.
      </StampyTip>

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
          className="relative isolate rounded-3xl border border-primary/25 bg-card p-4 shadow-surface animate-fade-up sm:p-6"
          data-ocid={`catalog.sizes.${expanded.id}.panel`}
        >
          <WizardGlow anchor="top" className="top-0 bottom-auto h-72" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="btn-3d-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
                <CatalogIcon id={expanded.icon} className="size-7" />
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
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
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Print colour
                </span>
                <div className="segmented gap-1 p-1">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={colorOption === opt.value}
                      onClick={() => chooseColor(opt.value)}
                      className="segmented-item min-h-10 px-3.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-9 sm:text-sm"
                      data-ocid={`catalog.color.${opt.value}.button`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div
            className="mt-5 grid gap-3 lg:grid-cols-2"
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
                onSelect={(mailClass) =>
                  chooseFormat(expanded, row.id, mailClass)
                }
                onMailClass={setMailClass}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-hairline-strong bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Pick a category above to see every size, aspect ratio and per-piece
          price.
        </div>
      )}

      <div className="relative isolate grid grid-cols-[auto_1fr] items-start gap-4 rounded-3xl border border-primary/20 bg-card p-5 shadow-surface sm:items-center sm:p-6">
        <div aria-hidden className="ambient-glow-backdrop" />
        <span className="btn-3d-primary flex size-11 items-center justify-center rounded-2xl">
          <Sparkles className="size-5" />
        </span>
        <p className="text-sm text-foreground">
          <span className="font-semibold">
            {formatCents(SUBSCRIPTION_PRICE_CENTS)} 30-day membership
          </span>{" "}
          skips the volume tiers: members pay the 10,000-piece rate on
          volume-priced sizes (the 4.25 × 6, 6 × 9 and 6 × 11 postcards, the
          letter and the trifold brochure); smaller orders cost more per piece,
          because each card payment carries a fixed fee. Next-day production by
          EZmailout, USPS IMb tracking included.
        </p>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 rounded-3xl border border-hairline bg-card p-4 shadow-surface sm:flex-row sm:items-center sm:p-5">
        <div
          className="min-w-0 text-sm text-muted-foreground"
          data-ocid="catalog.selection.summary"
        >
          {selectedRow ? (
            <span>
              Selected:{" "}
              <span className="font-bold text-foreground">
                {selectedRow.documentClass}
              </span>{" "}
              · {sizeLabel(selectedRow.id)} ·{" "}
              {tierSummary(selectedRow.id, selectedSpec?.mailClass) ??
                `${formatCents(pieceRateCents(selectedRow.id, 1, false, selectedSpec?.mailClass))} per piece`}{" "}
              (
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
          className="h-12 shrink-0 gap-2 px-7 text-base"
          data-ocid="catalog.continue.button"
        >
          Continue to audience
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <AlertDialog
        open={pendingFormat !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFormat(null);
        }}
      >
        <AlertDialogContent data-ocid="catalog.change_format.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Start a new design for this size?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your design is laid out for{" "}
              {selectedLayout
                ? layoutLabel(selectedLayout)
                : "the current size"}
              . Switching to{" "}
              {pendingFormat ? layoutLabel(pendingFormat.layoutVariant) : ""}{" "}
              starts with a blank canvas, and both sides of the current design
              are cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="catalog.change_format.cancel">
              Keep my design
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="catalog.change_format.confirm"
              onClick={() => {
                if (pendingFormat)
                  applyFormat(
                    pendingFormat.category,
                    pendingFormat.layoutVariant,
                    pendingFormat.mailClass,
                  );
                setPendingFormat(null);
              }}
            >
              Switch size
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

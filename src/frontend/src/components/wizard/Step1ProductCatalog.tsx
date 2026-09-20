import { MailClass, ProductType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { layoutLabel } from "@/lib/format";
import {
  SUBSCRIPTION_PRICE_CENTS,
  formatCents,
  getPricingRow,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

interface FormatDef {
  layoutVariant: string;
  label: string;
}

interface ProductDef {
  type: ProductType;
  name: string;
  description: string;
  icon: ReactNode;
  formats: FormatDef[];
  colorOptions?: { label: string; value: string }[];
}

const PRODUCTS: ProductDef[] = [
  {
    type: ProductType.Postcard,
    name: "Postcards",
    description:
      "Glossy UV-coated cards printed both sides in three commercial sizes, from budget mailers to jumbo attention grabbers.",
    icon: <Mail className="size-6" />,
    formats: [
      { layoutVariant: "4x6", label: "4×6 Standard" },
      { layoutVariant: "6x9", label: "6×9 Large" },
      { layoutVariant: "6x11", label: "6×11 Jumbo" },
    ],
  },
  {
    type: ProductType.Letter,
    name: "Letters",
    description:
      "8.5×11 letters printed on 24# white stock and machine-inserted into #10 double-window envelopes.",
    icon: <FileText className="size-6" />,
    formats: [{ layoutVariant: "letter", label: "8.5×11 Letter" }],
    colorOptions: [
      { label: "Full Color", value: "full_color" },
      { label: "Black & White", value: "bw" },
    ],
  },
  {
    type: ProductType.SelfMailer,
    name: "Self-Mailers",
    description:
      "Folded brochures tabbed shut with no envelope needed. Room for menus, catalogs and multi-offer promotions.",
    icon: <Layers className="size-6" />,
    formats: [
      { layoutVariant: "6x18_bifold", label: "6×18 Bifold" },
      { layoutVariant: "11x17_trifold", label: "11×17 Trifold" },
    ],
  },
  {
    type: ProductType.SnapPack,
    name: "Snap Packs",
    description:
      "Pressure-sealed, perforated security mailers that look official. Ideal for statements, notices and checks.",
    icon: <ShieldCheck className="size-6" />,
    formats: [
      { layoutVariant: "8.5x11_perforated", label: "8.5×11 Snap Pack" },
    ],
  },
  {
    type: ProductType.Booklet,
    name: "Booklets",
    description:
      "Saddle-stitched multi-page booklets for catalogs, guides and lookbooks that deserve more than a single page.",
    icon: <BookOpen className="size-6" />,
    formats: [{ layoutVariant: "multi_page", label: "8.5×11 Booklet" }],
  },
];

function mailClassLabel(mailClass: MailClass): string {
  return mailClass === MailClass.FirstClass ? "First-Class" : "Marketing Mail";
}

function sizeLabel(layoutVariant: string): string {
  const row = getPricingRow(layoutVariant);
  if (!row) return "";
  return `${row.widthInches}" × ${row.heightInches}"`;
}

function suggestCampaignName(layoutVariant: string): string {
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return `${layoutLabel(layoutVariant)} campaign – ${month}`;
}

/** Step 1: pick a product format and name the campaign. */
export function Step1ProductCatalog() {
  const campaignName = useWizardStore((s) => s.campaignName);
  const setCampaignName = useWizardStore((s) => s.setCampaignName);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const setProduct = useWizardStore((s) => s.setProduct);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setStep = useWizardStore((s) => s.setStep);

  const [colorOption, setColorOption] = useState<string>(
    selectedProduct?.colorOption ?? "full_color",
  );

  const selectedRow = selectedLayout ? getPricingRow(selectedLayout) : null;

  function chooseFormat(product: ProductDef, layoutVariant: string) {
    const color = product.colorOptions ? colorOption : undefined;
    setProduct({
      productType: product.type,
      layoutVariant,
      colorOption: color,
    });
    setLayout(layoutVariant);
  }

  function chooseColor(product: ProductDef, value: string) {
    setColorOption(value);
    if (selectedProduct?.productType === product.type && selectedLayout) {
      setProduct({
        productType: product.type,
        layoutVariant: selectedLayout,
        colorOption: value,
      });
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
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Choose your mail piece
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every format is printed, addressed and mailed by Click2Mail. Prices
          include printing and postage, with no minimum order.
        </p>
      </div>

      <Card className="bg-card">
        <CardContent className="flex flex-col gap-2 py-5 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1 space-y-2">
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
              data-ocid="catalog.campaign_name.input"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:max-w-xs sm:pb-2">
            Leave it blank and we will name it after the format you pick.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {PRODUCTS.map((product) => {
          const isProductSelected =
            selectedProduct?.productType === product.type;
          const rows = product.formats
            .map((f) => ({ format: f, row: getPricingRow(f.layoutVariant) }))
            .filter((r) => r.row !== undefined);
          const lowest = Math.min(
            ...rows.map((r) => r.row?.retailPriceCents ?? 0),
          );
          return (
            <Card
              key={product.type}
              className={cn(
                "bg-card transition-smooth",
                isProductSelected
                  ? "border-accent shadow-md ring-2 ring-accent/30"
                  : "hover:border-primary/40",
              )}
              data-ocid={`catalog.product.${product.type.toLowerCase()}.card`}
            >
              <CardContent className="space-y-4 py-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      isProductSelected
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {product.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {product.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
                      >
                        from {formatCents(lowest)} / piece
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  {rows.map(({ format, row }) => {
                    if (!row) return null;
                    const isSelected =
                      isProductSelected &&
                      selectedLayout === format.layoutVariant;
                    return (
                      <button
                        key={format.layoutVariant}
                        type="button"
                        onClick={() =>
                          chooseFormat(product, format.layoutVariant)
                        }
                        className={cn(
                          "flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-smooth",
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-border bg-background hover:border-primary/40",
                        )}
                        aria-pressed={isSelected}
                        data-ocid={`catalog.format.${format.layoutVariant}.button`}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected ? (
                            <Check className="size-4 text-accent" />
                          ) : (
                            <span className="size-4 rounded-full border border-border" />
                          )}
                          <span className="font-medium text-foreground">
                            {format.label}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {sizeLabel(format.layoutVariant)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-normal">
                            {mailClassLabel(row.mailClass)}
                          </Badge>
                          <Badge className="bg-primary text-primary-foreground">
                            {formatCents(row.retailPriceCents)} / piece
                          </Badge>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {product.colorOptions && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Print color
                    </span>
                    {product.colorOptions.map((opt) => {
                      const active = colorOption === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => chooseColor(product, opt.value)}
                          data-ocid={`catalog.color.${opt.value}.button`}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card className="surface-glow border-primary/20 bg-primary/5">
          <CardContent className="flex h-full flex-col justify-between gap-4 py-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Membership pricing
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A {formatCents(SUBSCRIPTION_PRICE_CENTS)}/month EZmailout
                membership unlocks these wholesale rates with no minimums. Send
                one piece or ten thousand at the same per-piece price.
              </p>
            </div>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-brand" /> Printing and
                postage included
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-brand" /> Next-day
                production by Click2Mail
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-brand" /> CASS-verified
                addressing and USPS tracking
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <div className="text-sm text-muted-foreground">
          {selectedRow ? (
            <span>
              Selected:{" "}
              <span className="font-medium text-foreground">
                {selectedRow.displayName}
              </span>{" "}
              at {formatCents(selectedRow.retailPriceCents)} per piece (
              {mailClassLabel(selectedRow.mailClass)})
            </span>
          ) : (
            "Pick a format to continue."
          )}
        </div>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedLayout}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          data-ocid="catalog.continue.button"
        >
          Continue to audience
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

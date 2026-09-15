import { ProductType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

interface ProductDef {
  type: ProductType;
  name: string;
  description: string;
  icon: React.ReactNode;
  layouts: { label: string; value: string }[];
  colorOptions?: { label: string; value: string }[];
}

const PRODUCTS: ProductDef[] = [
  {
    type: ProductType.Postcard,
    name: "Postcards",
    description:
      "High-impact direct mail cards in three commercial sizes for every budget and campaign goal.",
    icon: <Mail className="size-8" />,
    layouts: [
      { label: '4"×6" Budget', value: "4x6" },
      { label: '6"×9" Standard', value: "6x9" },
      { label: '6"×11" Jumbo', value: "6x11" },
    ],
  },
  {
    type: ProductType.Letter,
    name: "Letters & Envelopes",
    description:
      '8.5"×11" pages printed and automatically stuffed into #10 double-window envelopes.',
    icon: <FileText className="size-8" />,
    layouts: [{ label: '8.5"×11" Letter', value: "letter" }],
    colorOptions: [
      { label: "Full Color", value: "full_color" },
      { label: "B&W", value: "bw" },
    ],
  },
  {
    type: ProductType.SelfMailer,
    name: "Self-Mailers",
    description:
      "Folding premium brochures tabbed shut — no envelope required.",
    icon: <Layers className="size-8" />,
    layouts: [
      { label: '6"×18" Bifold', value: "6x18_bifold" },
      { label: '11"×17" Trifold', value: "11x17_trifold" },
    ],
  },
  {
    type: ProductType.SnapPack,
    name: "Snap Packs",
    description:
      "High-security perforated pressure-sealed mailers for urgent notices and checks.",
    icon: <ShieldCheck className="size-8" />,
    layouts: [{ label: '8.5"×11" Perforated', value: "8.5x11_perforated" }],
  },
  {
    type: ProductType.Booklet,
    name: "Booklets",
    description:
      "Multi-page edge-bound catalogs, annual reports, and dense product showcases.",
    icon: <BookOpen className="size-8" />,
    layouts: [{ label: "Multi-Page Edge-Bound", value: "multi_page" }],
  },
];

export function Step1ProductCatalog() {
  const { selectedProduct, selectedLayout, setProduct, setLayout, setStep } =
    useWizardStore();

  const [localColor, setLocalColor] = useState<string | null>(null);

  const activeProduct = PRODUCTS.find(
    (p) => p.type === selectedProduct?.productType,
  );

  const canContinue =
    selectedProduct !== null &&
    selectedLayout !== null &&
    (activeProduct?.colorOptions ? localColor !== null : true);

  function handleSelectProduct(product: ProductDef) {
    setProduct({
      productType: product.type,
      layoutVariant: product.layouts[0].value,
      colorOption: product.colorOptions?.[0].value,
    });
    setLayout(product.layouts[0].value);
    if (product.colorOptions) {
      setLocalColor(product.colorOptions[0].value);
    } else {
      setLocalColor(null);
    }
  }

  function handleSelectLayout(layoutValue: string) {
    setLayout(layoutValue);
    if (selectedProduct) {
      setProduct({
        ...selectedProduct,
        layoutVariant: layoutValue,
      });
    }
  }

  function handleSelectColor(colorValue: string) {
    setLocalColor(colorValue);
    if (selectedProduct) {
      setProduct({
        ...selectedProduct,
        colorOption: colorValue,
      });
    }
  }

  function handleContinue() {
    if (!canContinue) return;
    setStep(2);
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Select Your Mail Product
        </h2>
        <p className="mt-2 text-muted-foreground">
          Choose a format and layout to begin your campaign.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((product) => {
          const isSelected = selectedProduct?.productType === product.type;
          return (
            <button
              key={product.type}
              type="button"
              onClick={() => handleSelectProduct(product)}
              data-ocid={`product.select.${product.type}`}
              className={cn(
                "relative flex flex-col items-start rounded-xl border bg-card p-5 text-left transition-smooth",
                "hover:border-primary/50 hover:shadow-sm",
                isSelected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border",
              )}
            >
              <div className="mb-3 flex w-full items-center justify-between">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {product.icon}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent-foreground"
                >
                  {(() => {
                    const activeLayout = isSelected
                      ? selectedLayout
                      : product.layouts[0].value;
                    const price = getPrice(activeLayout ?? "");
                    return price > 0
                      ? `${price.toFixed(2)} / address`
                      : "Custom pricing";
                  })()}
                </Badge>
              </div>

              <h3 className="font-display text-lg font-semibold text-foreground">
                {product.name}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {product.layouts.map((layout) => (
                  <button
                    key={layout.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProduct(product);
                      handleSelectLayout(layout.value);
                    }}
                    data-ocid={`product.layout.${product.type}.${layout.value}`}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-smooth",
                      isSelected && selectedLayout === layout.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>

              {product.colorOptions && isSelected && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectColor(color.value);
                      }}
                      data-ocid={`product.color.${product.type}.${color.value}`}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-smooth",
                        localColor === color.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          data-ocid="product.continue_button"
          className="gap-2"
        >
          Continue to Audience Targeting
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

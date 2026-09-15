import { AudienceType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCreateCampaign } from "@/hooks/use-backend";
import { formatPrice, getPrice } from "@/lib/pricing";
import { useWizardStore } from "@/store/wizard";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Palette,
  Rocket,
  Users,
} from "lucide-react";
import { useState } from "react";

export function Step4ReviewLaunch() {
  const navigate = useNavigate();
  const store = useWizardStore();
  const createCampaign = useCreateCampaign();
  const [launched, setLaunched] = useState(false);

  const productName = store.selectedProduct
    ? store.selectedProduct.productType
    : "—";
  const layout = store.selectedLayout ?? "—";
  const audienceLabel =
    store.audienceType === "map"
      ? "Geo-Targeted Map"
      : store.audienceType === "csv"
        ? "CSV Upload"
        : "—";
  const recipientCount = store.recipientCount;
  const designStatus = store.designTemplate ? "Configured" : "Default";

  async function handleLaunch() {
    if (!store.selectedProduct || store.recipientCount === 0) return;
    const audienceType =
      store.audienceType === "csv" ? AudienceType.CSV : AudienceType.Map_;
    try {
      await createCampaign.mutateAsync({
        product: store.selectedProduct,
        recipientCount: BigInt(recipientCount),
        audienceType,
      });
      setLaunched(true);
      setTimeout(() => {
        navigate({ to: "/campaigns" });
        store.reset();
      }, 1200);
    } catch {
      // error handled by mutation state
    }
  }

  if (launched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="size-16 text-green-500" />
        <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
          Campaign Launched!
        </h2>
        <p className="mt-2 text-muted-foreground">
          Redirecting to your campaign portal…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Review & Launch
        </h2>
        <p className="mt-2 text-muted-foreground">
          Confirm your campaign details before sending to print.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Rocket className="size-4 text-primary" />
              Product & Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium text-foreground">{productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Layout</span>
              <span className="font-medium text-foreground">{layout}</span>
            </div>
            {store.selectedProduct?.colorOption && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color</span>
                <span className="font-medium text-foreground">
                  {store.selectedProduct.colorOption}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="size-4 text-primary" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {store.audienceType === "map" ? (
                  <MapPin className="size-3.5" />
                ) : (
                  <FileSpreadsheet className="size-3.5" />
                )}
                {audienceLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients</span>
              <span className="font-medium text-foreground">
                {recipientCount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Palette className="size-4 text-primary" />
              Design
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary">{designStatus}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="size-4 text-primary" />
              Total Price
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const variant = store.selectedLayout ?? "";
              const unitPrice = getPrice(variant);
              const totalAmount = recipientCount * unitPrice;
              const totalAmountCents = Math.round(totalAmount * 100);
              const hasPricing = unitPrice > 0;
              return (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-primary">
                      {hasPricing ? formatPrice(totalAmount) : "Custom"}
                    </span>
                    {hasPricing && (
                      <span className="text-sm text-muted-foreground">
                        total
                      </span>
                    )}
                  </div>
                  {hasPricing && recipientCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {recipientCount.toLocaleString()} addresses ×{" "}
                      {formatPrice(unitPrice)} = {formatPrice(totalAmount)}
                    </p>
                  )}
                  {!hasPricing && (
                    <p className="text-xs text-muted-foreground">
                      Pricing for this product is quoted on request.
                    </p>
                  )}
                  <p className="text-xs font-medium text-primary">
                    {hasPricing
                      ? `Total charged at launch: ${formatPrice(totalAmount)} (${totalAmountCents} cents)`
                      : "Contact sales for a quote"}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleLaunch}
          disabled={
            createCampaign.isPending ||
            !store.selectedProduct ||
            recipientCount === 0
          }
          data-ocid="review.launch_button"
          className="gap-2"
          size="lg"
        >
          {createCampaign.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          {createCampaign.isPending ? "Launching…" : "Launch Campaign"}
        </Button>
      </div>

      {createCampaign.isError && (
        <p className="text-right text-sm text-destructive">
          Failed to launch campaign. Please try again.
        </p>
      )}
    </div>
  );
}

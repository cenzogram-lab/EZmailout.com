import { type ConfirmPaymentResult, PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAccountSync } from "@/hooks/use-account";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
import { formatTimestamp } from "@/lib/format";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { BadgeCheck, CalendarClock, Crown, Gift, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function SubscriptionWidget() {
  const { account, subscriptionActive, refresh } = useAccountSync();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const freeMonths = account ? Number(account.freeMonthsAvailable) : 0;
  const renewsAt = account ? account.subscriptionRenewsAt : 0n;
  const priceLabel = formatCents(SUBSCRIPTION_PRICE_CENTS);

  const handleSuccess = useCallback(
    (result: ConfirmPaymentResult) => {
      toast.success(
        result.subscriptionActive === false
          ? "Payment recorded."
          : "Membership active — welcome aboard!",
      );
      setCheckoutOpen(false);
      void refresh();
    },
    [refresh],
  );

  return (
    <Card
      className={subscriptionActive ? "surface-glow" : undefined}
      data-ocid="dashboard.subscription.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="size-4 text-accent" />
              Membership
            </CardTitle>
            <CardDescription>
              {priceLabel}/month · {MONTHLY_ALLOWANCE} AI credits included every
              renewal.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              subscriptionActive
                ? "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand"
                : "border-border bg-muted text-muted-foreground"
            }
            data-ocid={`dashboard.subscription.${subscriptionActive ? "active" : "inactive"}.badge`}
          >
            {subscriptionActive ? <BadgeCheck className="size-3" /> : null}
            {subscriptionActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="size-4" />
            {subscriptionActive ? "Renews" : "Last renewal"}
          </span>
          <span
            className="font-medium text-foreground"
            data-ocid="dashboard.subscription.renews_at.text"
          >
            {renewsAt > 0n ? formatTimestamp(renewsAt, false) : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Gift className="size-4" />
            Free months
          </span>
          <span
            className="font-medium text-foreground"
            data-ocid="dashboard.subscription.free_months.text"
          >
            {freeMonths} available
          </span>
        </div>
        {freeMonths > 0 && (
          <p className="rounded-lg border border-emerald-brand/30 bg-emerald-brand/10 px-3 py-2 text-xs text-emerald-brand">
            <Sparkles className="mr-1 inline size-3.5" />
            {freeMonths} free month{freeMonths === 1 ? "" : "s"} available
            (referral rewards). Your next renewal is waived automatically.
          </p>
        )}

        <Separator />

        {checkoutOpen ? (
          <StripeCheckout
            purpose={PaymentPurpose.Subscription}
            amountLabel={priceLabel}
            title="EZmailout membership"
            description={`${priceLabel} per month. Cancel any time.`}
            submitLabel="Subscribe"
            onSuccess={handleSuccess}
            onCancel={() => setCheckoutOpen(false)}
          />
        ) : (
          <Button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={!account}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-ocid="dashboard.subscription.checkout.button"
          >
            <Crown className="size-4" />
            {subscriptionActive
              ? "Renew"
              : `Start membership — ${priceLabel}/mo`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

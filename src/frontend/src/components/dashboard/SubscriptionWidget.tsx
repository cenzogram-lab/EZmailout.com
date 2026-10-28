import { type ConfirmPaymentResult, PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
import { formatTimestamp } from "@/lib/format";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { BadgeCheck, CalendarClock, Crown, Gift, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { WidgetHeader, wellClass } from "./WidgetParts";

export function SubscriptionWidget() {
  const { account, accountReady, subscriptionActive, refresh } =
    useAccountSync();
  // Until the account arrives nothing below is known: no made-up "Inactive".
  const pulse = (width: string) => (
    <span
      className={`inline-block h-4 ${width} animate-pulse rounded bg-muted align-middle`}
    />
  );
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
      className={cn(
        "relative isolate overflow-hidden",
        subscriptionActive && "surface-glow border-primary/25",
      )}
      data-ocid="dashboard.subscription.card"
    >
      {/* An active membership glows with the brand backlight. */}
      {subscriptionActive ? (
        <div aria-hidden className="ambient-glow-backdrop" />
      ) : null}
      <CardHeader className="pb-0">
        <WidgetHeader
          icon={Crown}
          title="Membership"
          description={`${priceLabel} for 30 days · ${MONTHLY_ALLOWANCE} AI credits with each pass.`}
          action={
            accountReady ? (
              <Badge
                variant={subscriptionActive ? "success" : "neutral"}
                data-ocid={`dashboard.subscription.${subscriptionActive ? "active" : "inactive"}.badge`}
              >
                {subscriptionActive ? <BadgeCheck className="size-3" /> : null}
                {subscriptionActive ? "Active" : "Inactive"}
              </Badge>
            ) : (
              pulse("w-16")
            )
          }
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className={cn(wellClass, "divide-y divide-hairline")}>
          <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <dt className="inline-flex items-center gap-2 font-medium text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" />
              {!accountReady
                ? "Active until"
                : subscriptionActive
                  ? "Active until"
                  : "Ended"}
            </dt>
            <dd
              className="font-mono text-sm font-semibold tracking-wide text-foreground"
              data-ocid="dashboard.subscription.renews_at.text"
            >
              {!accountReady
                ? pulse("w-24")
                : renewsAt > 0n
                  ? formatTimestamp(renewsAt, false)
                  : "—"}
            </dd>
          </div>
          <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <dt className="inline-flex items-center gap-2 font-medium text-muted-foreground">
              <Gift className="size-4 shrink-0" />
              Free months
            </dt>
            <dd
              className="font-semibold text-foreground"
              data-ocid="dashboard.subscription.free_months.text"
            >
              {accountReady ? `${freeMonths} available` : pulse("w-16")}
            </dd>
          </div>
        </dl>
        {freeMonths > 0 && (
          <p className="rounded-2xl border border-emerald-brand/30 bg-emerald-brand/10 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-brand">
            <Sparkles className="mr-1 inline size-3.5" />
            {freeMonths} free month{freeMonths === 1 ? "" : "s"} available
            (referral rewards). Your next renewal is free: renew below and it is
            used instead of a charge.
          </p>
        )}

        {checkoutOpen ? (
          <StripeCheckout
            purpose={PaymentPurpose.Subscription}
            amountLabel={priceLabel}
            title="EZmailout membership"
            description={`${priceLabel} for 30 days. Nothing renews automatically.`}
            submitLabel="Subscribe"
            onSuccess={handleSuccess}
            onCancel={() => setCheckoutOpen(false)}
          />
        ) : (
          // Sized by the card's own width (it sits in a third of the page
          // from `lg`): one line wherever the label fits, at 13 px in the
          // narrow column; otherwise two balanced lines with the crown
          // leading the first, never an orphaned last word.
          <div className="@container">
            <Button
              type="button"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
              disabled={!account}
              className="h-auto min-h-11 w-full whitespace-normal px-3 py-2.5 text-center text-[13px] leading-snug @[19.5rem]:text-sm"
              data-ocid="dashboard.subscription.checkout.button"
            >
              <span className="text-balance">
                <Crown className="mr-1.5 inline-block size-4 align-[-3px]" />
                {/* A no-break space keeps the dash with "membership", so a
                    wrapped label breaks before the price. */}
                {subscriptionActive
                  ? "Renew"
                  : `Start membership\u00a0— ${priceLabel} for 30 days`}
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

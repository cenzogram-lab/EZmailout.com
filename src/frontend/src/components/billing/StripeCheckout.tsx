import type {
  ConfirmPaymentResult,
  CreditPack,
  PaymentPurpose,
} from "@/backend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { useConfirmPayment, useCreatePaymentIntent } from "@/hooks/use-backend";
import { useAccountStore } from "@/store/account";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { type Stripe, loadStripe } from "@stripe/stripe-js";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignInPrompt } from "./SignInPrompt";

export interface StripeCheckoutProps {
  purpose: PaymentPurpose;
  reference?: string | null;
  pack?: CreditPack | null;
  amountLabel: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  onSuccess: (result: ConfirmPaymentResult) => void;
  onCancel?: () => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "creating" }
  | {
      kind: "elements";
      clientSecret: string;
      paymentIntentId: string;
      publishableKey: string;
    }
  | { kind: "confirming"; paymentIntentId: string }
  | { kind: "done"; result: ConfirmPaymentResult }
  | { kind: "error"; message: string; paymentIntentId?: string };

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(publishableKey: string): Promise<Stripe | null> {
  let promise = stripeCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripeCache.set(publishableKey, promise);
  }
  return promise;
}

function PaymentForm({
  amountLabel,
  submitLabel,
  onConfirmed,
  onCancel,
}: {
  amountLabel: string;
  submitLabel: string;
  onConfirmed: () => Promise<void>;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/dashboard` },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment was not completed.");
      setSubmitting(false);
      return;
    }
    if (
      paymentIntent &&
      paymentIntent.status !== "succeeded" &&
      paymentIntent.status !== "processing"
    ) {
      setError(`Payment status: ${paymentIntent.status}`);
      setSubmitting(false);
      return;
    }
    await onConfirmed();
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ocid="checkout.payment.form"
    >
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Secured by Stripe
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              data-ocid="checkout.cancel.button"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!stripe || !elements || submitting}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-ocid="checkout.pay.button"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            {submitLabel} {amountLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Live Stripe Elements checkout bound to the canister payment ledger.
 * Creates the PaymentIntent, collects the card, then asks the canister to
 * verify the intent with Stripe and apply its effects (campaign paid,
 * credits added, subscription activated, referral reward).
 */
export function StripeCheckout({
  purpose,
  reference = null,
  pack = null,
  amountLabel,
  title = "Checkout",
  description,
  submitLabel = "Pay",
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const { isAuthenticated } = useAccountSync();
  const createIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();
  const setCreditBalance = useAccountStore((s) => s.setCreditBalance);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const started = useRef(false);

  const finish = useCallback(
    async (paymentIntentId: string) => {
      setPhase({ kind: "confirming", paymentIntentId });
      try {
        const result = await confirmPayment.mutateAsync(paymentIntentId);
        if (!result.ok) {
          setPhase({
            kind: "error",
            message: result.error ?? "Payment could not be confirmed.",
            paymentIntentId,
          });
          return;
        }
        if (result.creditBalance !== undefined)
          setCreditBalance(result.creditBalance);
        setPhase({ kind: "done", result });
        onSuccess(result);
      } catch (e) {
        setPhase({
          kind: "error",
          message: e instanceof Error ? e.message : "Confirmation failed.",
          paymentIntentId,
        });
      }
    },
    [confirmPayment, onSuccess, setCreditBalance],
  );

  const start = useCallback(async () => {
    setPhase({ kind: "creating" });
    try {
      const intent = await createIntent.mutateAsync({
        purpose,
        reference,
        pack,
      });
      if (!intent.ok) {
        setPhase({
          kind: "error",
          message: intent.error ?? "Could not start checkout.",
        });
        return;
      }
      if (intent.waived) {
        // Referral free month: nothing to charge; the canister already applied it.
        const result: ConfirmPaymentResult = {
          ok: true,
          state: undefined,
          creditBalance: undefined,
          campaignId: undefined,
          subscriptionActive: true,
          referralRewardApplied: false,
        };
        setPhase({ kind: "done", result });
        onSuccess(result);
        return;
      }
      if (!intent.paymentIntentId) {
        setPhase({
          kind: "error",
          message: "Checkout did not return a payment id.",
        });
        return;
      }
      if (intent.sandbox || !intent.clientSecret) {
        await finish(intent.paymentIntentId);
        return;
      }
      if (!intent.publishableKey) {
        setPhase({
          kind: "error",
          message:
            "Stripe publishable key is not configured (Admin → Stripe Publishable Key).",
        });
        return;
      }
      setPhase({
        kind: "elements",
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
        publishableKey: intent.publishableKey,
      });
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not start checkout.",
      });
    }
  }, [createIntent, purpose, reference, pack, finish, onSuccess]);

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    void start();
  }, [isAuthenticated, start]);

  const stripePromise = useMemo(
    () => (phase.kind === "elements" ? getStripe(phase.publishableKey) : null),
    [phase],
  );

  if (!isAuthenticated) {
    return (
      <SignInPrompt message="Sign in with Internet Identity to check out securely." />
    );
  }

  return (
    <Card data-ocid="checkout.card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-emerald-brand" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {(phase.kind === "idle" || phase.kind === "creating") && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Preparing secure
            checkout…
          </div>
        )}
        {phase.kind === "confirming" && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Confirming payment with
            the ledger…
          </div>
        )}
        {phase.kind === "elements" && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: phase.clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#f97316",
                  borderRadius: "10px",
                  fontFamily: "DM Sans, sans-serif",
                },
              },
            }}
          >
            <PaymentForm
              amountLabel={amountLabel}
              submitLabel={submitLabel}
              onConfirmed={() => finish(phase.paymentIntentId)}
              onCancel={onCancel}
            />
          </Elements>
        )}
        {phase.kind === "done" && (
          <Alert className="border-emerald-brand/40 bg-emerald-brand/10">
            <ShieldCheck className="size-4 text-emerald-brand" />
            <AlertTitle>Payment confirmed</AlertTitle>
            <AlertDescription>
              {phase.result.referralRewardApplied
                ? "Your referrer just earned a free month. Thanks for joining through their link!"
                : "Your payment has been recorded on the ledger."}
            </AlertDescription>
          </Alert>
        )}
        {phase.kind === "error" && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Checkout problem</AlertTitle>
              <AlertDescription>{phase.message}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              {phase.paymentIntentId ? (
                <Button
                  variant="outline"
                  onClick={() => finish(phase.paymentIntentId as string)}
                  data-ocid="checkout.retry_confirm.button"
                >
                  Re-check payment
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => void start()}
                  data-ocid="checkout.retry.button"
                >
                  Try again
                </Button>
              )}
              {onCancel && (
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

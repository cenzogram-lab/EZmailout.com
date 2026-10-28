import type {
  ConfirmPaymentResult,
  CreditPack,
  PaymentPurpose,
} from "@/backend";
import { GlossyIcon } from "@/components/dashboard/WidgetParts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { useConfirmPayment, useCreatePaymentIntent } from "@/hooks/use-backend";
import { formatCents } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";
import { useAccountStore } from "@/store/account";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { type Appearance, type Stripe, loadStripe } from "@stripe/stripe-js";
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
  /** `testMode` is true when the canister settled it as a test-mode order. */
  onSuccess: (result: ConfirmPaymentResult, testMode: boolean) => void;
  onCancel?: () => void;
  /**
   * True while leaving would risk a second charge: the card is being
   * charged, or was and the payment is not yet confirmed. Hosts must then
   * offer no way out (no close, no "change", no step back), or a new
   * checkout could take the same payment again.
   */
  onLockedChange?: (locked: boolean) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "creating" }
  | {
      kind: "elements";
      /** What the canister will charge, from the payment intent itself. */
      amountCents: bigint | undefined;
      clientSecret: string;
      paymentIntentId: string;
      publishableKey: string;
    }
  | { kind: "confirming"; paymentIntentId: string }
  | { kind: "done"; result: ConfirmPaymentResult }
  | { kind: "error"; message: string; paymentIntentId?: string };

const stripeCache = new Map<string, Promise<Stripe | null>>();

/** A sunken inset panel for the loading states. */
const WELL =
  "rounded-2xl border border-hairline bg-well shadow-[inset_0_1px_2px_rgb(15_17_23/0.06)] dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)]";

/**
 * The card form's look in each theme: brand indigo, the card surface behind
 * the fields and 14 px rounding, so the payment form matches the checkout
 * card around it (light: white; dark: the obsidian card).
 */
function stripeAppearance(isDark: boolean): Appearance {
  return isDark
    ? {
        theme: "night",
        variables: {
          colorPrimary: "#818cf8",
          colorBackground: "#161a26",
          colorText: "#f4f5f9",
          colorTextSecondary: "#a1a6b4",
          colorDanger: "#ff8a8a",
          borderRadius: "14px",
          fontFamily: "Geist, sans-serif",
        },
      }
    : {
        theme: "stripe",
        variables: {
          colorPrimary: "#5c5ee8",
          colorBackground: "#ffffff",
          colorText: "#01080a",
          colorDanger: "#c70a0d",
          borderRadius: "14px",
          fontFamily: "Geist, sans-serif",
        },
      };
}

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
  onSubmittingChange,
}: {
  amountLabel: string;
  submitLabel: string;
  onConfirmed: () => Promise<void>;
  onCancel?: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmittingState] = useState(false);
  const setSubmitting = (value: boolean) => {
    setSubmittingState(value);
    onSubmittingChange(value);
  };
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const confirmed = await stripe
      .confirmPayment({
        elements,
        redirect: "if_required",
        // Intents are card-only, so nothing leaves the page; Stripe still
        // requires a return address.
        confirmParams: { return_url: `${window.location.origin}/dashboard` },
      })
      .catch(() => null);
    if (!confirmed) {
      setError("Payment could not be completed. Please try again.");
      setSubmitting(false);
      return;
    }
    const { error: stripeError, paymentIntent } = confirmed;
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5 text-emerald-brand" /> Secure, encrypted
          checkout
        </span>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="px-4"
              onClick={onCancel}
              // Never while the card is being charged (3-D Secure included):
              // leaving then invited a second checkout and a second charge.
              disabled={submitting}
              data-ocid="checkout.cancel.button"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!stripe || !elements || submitting}
            size="lg"
            className="gap-2 px-5"
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
  onLockedChange,
}: StripeCheckoutProps) {
  const { isAuthenticated } = useAccountSync();
  const { isDark } = useTheme();
  const createIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();
  const setCreditBalance = useAccountStore((s) => s.setCreditBalance);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const started = useRef(false);
  const [cardRunning, setCardRunning] = useState(false);
  // Only a card actually submitted here can have been charged: test-mode
  // and recovered checkouts confirm without one, and must stay closable.
  const [cardRan, setCardRan] = useState(false);
  const onSubmittingChange = useCallback((running: boolean) => {
    setCardRunning(running);
    if (running) setCardRan(true);
  }, []);
  const locked =
    cardRunning ||
    (cardRan &&
      (phase.kind === "confirming" ||
        (phase.kind === "error" && phase.paymentIntentId !== undefined)));
  const lockedRef = useRef(onLockedChange);
  lockedRef.current = onLockedChange;
  useEffect(() => {
    lockedRef.current?.(locked);
  }, [locked]);
  useEffect(() => () => lockedRef.current?.(false), []);
  // Closing or reloading the tab while a charged card is unconfirmed is the
  // one way left to lose the payment: the browser asks first.
  useEffect(() => {
    if (!locked) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [locked]);

  const finish = useCallback(
    async (paymentIntentId: string, testMode = false) => {
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
        onSuccess(result, testMode);
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
        onSuccess(result, false);
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
        await finish(intent.paymentIntentId, intent.sandbox === true);
        return;
      }
      if (!intent.publishableKey) {
        setPhase({
          kind: "error",
          message: "Checkout isn't set up yet; please try again later.",
        });
        return;
      }
      setPhase({
        kind: "elements",
        amountCents: intent.amountCents,
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
    <Card className="gap-5" data-ocid="checkout.card">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-3">
          <GlossyIcon icon={ShieldCheck} tone="emerald" />
          <CardTitle className="font-display text-lg font-black leading-tight tracking-tight text-foreground">
            {title}
          </CardTitle>
        </div>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {(phase.kind === "idle" || phase.kind === "creating") && (
          <div
            className={`${WELL} flex items-center gap-2.5 px-4 py-5 text-sm font-medium text-muted-foreground`}
          >
            <Loader2 className="size-4 animate-spin text-primary" /> Preparing
            secure checkout…
          </div>
        )}
        {phase.kind === "confirming" && (
          <div
            className={`${WELL} flex items-center gap-2.5 px-4 py-5 text-sm font-medium text-muted-foreground`}
          >
            <Loader2 className="size-4 animate-spin text-primary" /> Confirming
            payment with the ledger…
          </div>
        )}
        {phase.kind === "elements" && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: phase.clientSecret,
              appearance: stripeAppearance(isDark),
            }}
          >
            <PaymentForm
              amountLabel={
                phase.amountCents !== undefined
                  ? formatCents(phase.amountCents)
                  : amountLabel
              }
              submitLabel={submitLabel}
              onConfirmed={() => finish(phase.paymentIntentId)}
              onCancel={onCancel}
              onSubmittingChange={onSubmittingChange}
            />
          </Elements>
        )}
        {phase.kind === "done" && (
          <Alert className="relative isolate overflow-hidden rounded-2xl border-emerald-brand/35 bg-card px-4 py-4 has-[>svg]:grid-cols-[1.25rem_1fr] has-[>svg]:gap-x-3 [&>svg]:translate-y-0">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-emerald-brand/10"
            />
            <ShieldCheck className="!size-5 text-emerald-brand" />
            <AlertTitle className="font-display text-base font-black text-emerald-brand">
              Payment confirmed
            </AlertTitle>
            <AlertDescription className="text-foreground">
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
            {phase.paymentIntentId && (
              // The card step ran: the charge may already be on its way, so
              // there is no way out that leads to paying a second time.
              <p
                className="text-xs text-muted-foreground"
                data-ocid="checkout.recheck.note"
              >
                If your card was charged, don't pay again: re-check here, or
                open the order under Campaigns once the payment clears.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
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
              {onCancel && !phase.paymentIntentId && (
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

import { PaymentPurpose, PaymentState, type PaymentView } from "@/backend";
import {
  GlossyTile,
  PanelHeader,
  raisedClass,
} from "@/components/campaigns/PanelParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/ui/load-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminAdjustCredits,
  useAdminPayments,
  useAdminRefundPayment,
} from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { formatTimestamp } from "@/lib/format";
import { paymentLabel, refundableCents } from "@/lib/payments";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Copy, Loader2, Receipt, Search, Sparkles, Undo2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

const REFUND_REASONS = [
  "Duplicate payment",
  "Requested by customer",
  "Order not printed",
  "Print or delivery problem",
  "Other",
];

/** Dollars typed by the admin → cents, or null when not a valid amount. */
function parseDollars(text: string): bigint | null {
  const clean = text.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return BigInt(whole) * 100n + BigInt(`${frac}00`.slice(0, 2));
}

function centsToDollars(cents: bigint): string {
  const c = cents % 100n;
  return `${cents / 100n}.${c < 10n ? "0" : ""}${c}`;
}

/** What "take back what it granted" does for this payment. */
function revokeNote(p: PaymentView, full: boolean): string {
  if (p.purpose === PaymentPurpose.CreditPack) {
    return "Deducts the pack's credits in proportion to the refund (never below zero).";
  }
  if (p.purpose === PaymentPurpose.Subscription) {
    return full
      ? "Removes the 30 days and the monthly AI credits this membership added."
      : "Only a full refund changes the membership.";
  }
  if (!p.settledCampaign) {
    return "This payment did not pay its campaign (a duplicate or a removed draft), so the campaign is left as it is.";
  }
  if (p.campaignInProduction) {
    return "The campaign is already with the print partner, so it stays in production; only the money is returned.";
  }
  return full
    ? "Marks the campaign refunded: it can no longer be sent to print or paid again."
    : "Only a full refund stops the campaign from going to print.";
}

/**
 * Admin: finds a customer's payments by the invoice number (payment id),
 * account ID, campaign ID or email they give support, refunds them to the
 * card through Stripe, and credits accounts.
 */
export function PaymentsCard() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const payments = useAdminPayments(search, true);
  const [refunding, setRefunding] = useState<PaymentView | null>(null);
  const [crediting, setCrediting] = useState<string | null>(null);
  const list = payments.data ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    setSearch(query.trim());
  }

  async function copy(text: string) {
    if (await copyText(text)) toast.success("Copied");
  }

  return (
    <Card className="lg:col-span-2" data-ocid="admin.payments.card">
      <CardHeader className="pb-0 max-sm:px-4">
        <PanelHeader
          icon={Receipt}
          title={<>Payments &amp; refunds</>}
          description="Find a payment by the invoice number, account ID, campaign ID or email the customer gives support. Refunds go back to the card through Stripe; credits go onto the account's AI credit balance."
        />
      </CardHeader>
      <CardContent className="space-y-4 max-sm:px-4">
        {/* Below sm the field spans the card and Search takes the
            full-width line under it; the hint is set a step smaller and ends
            in an ellipsis where a phone is still too narrow for all of it. */}
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 sm:flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Invoice (pi_…), account ID, campaign ID or email"
              className="h-11 text-ellipsis rounded-full pl-10 pr-4 placeholder:text-sm sm:h-10"
              aria-label="Search payments"
              data-ocid="admin.payments.search.input"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full px-5 sm:h-10 sm:w-auto"
            data-ocid="admin.payments.search.button"
          >
            Search
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {search
            ? `Results for “${search}”.`
            : "The newest completed payments."}
        </p>
        {payments.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : payments.isError ? (
          <LoadError
            what="payments"
            onRetry={() => void payments.refetch()}
            retrying={payments.isFetching}
          />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching payments.</p>
        ) : (
          <ul className={cn(raisedClass, "divide-y divide-hairline")}>
            {list.map((p) => {
              const left = refundableCents(p);
              return (
                <li
                  key={p.paymentIntentId}
                  className="space-y-2.5 px-4 py-3.5"
                  data-ocid={`admin.payments.item.${p.paymentIntentId}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold text-foreground">
                      {paymentLabel(p)}
                    </p>
                    <span className="font-display text-xl font-black tracking-tight tabular-nums text-foreground">
                      {formatCents(p.amountCents)}
                    </span>
                  </div>
                  {/* Below sm each copy chip is a full 44 px touch target. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-muted-foreground sm:gap-y-1">
                    <button
                      type="button"
                      onClick={() => void copy(p.paymentIntentId)}
                      className="meta-mono -mx-1.5 inline-flex min-h-11 max-w-full sm:min-h-7 items-center gap-1.5 rounded-full px-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                    >
                      <span className="truncate">{p.paymentIntentId}</span>{" "}
                      <Copy className="size-4 shrink-0 sm:size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void copy(p.userId)}
                      className="meta-mono -mx-1.5 inline-flex min-h-11 max-w-full sm:min-h-7 items-center gap-1.5 rounded-full px-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                    >
                      <span className="truncate">Account {p.userId}</span>
                      <Copy className="size-4 shrink-0 sm:size-3" />
                    </button>
                    <span className="tabular-nums">
                      {formatTimestamp(p.confirmedAt ?? p.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.state === PaymentState.Created ||
                    p.state === PaymentState.Failed ? (
                      <Badge variant="neutral">Not completed</Badge>
                    ) : null}
                    {p.testMode ? (
                      <Badge variant="info">Test mode</Badge>
                    ) : null}
                    {p.purpose === PaymentPurpose.CampaignOrder &&
                    !p.settledCampaign &&
                    !p.testMode ? (
                      <Badge className="border-transparent bg-amber-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
                        Did not pay its campaign
                      </Badge>
                    ) : null}
                    {p.campaignInProduction ? (
                      <Badge variant="success">In production</Badge>
                    ) : null}
                    {p.refundedCents > 0n ? (
                      <Badge
                        variant="neutral"
                        className="border-destructive/30 bg-destructive/10 text-destructive"
                      >
                        {formatCents(p.refundedCents)} refunded
                      </Badge>
                    ) : null}
                    <div className="ml-auto flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-11 gap-1.5 px-4 sm:h-8 sm:px-3"
                        onClick={() => setCrediting(p.userId)}
                        data-ocid={`admin.payments.credit.${p.paymentIntentId}`}
                      >
                        <Sparkles className="size-3.5" /> Credit account
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-11 gap-1.5 px-4 sm:h-8 sm:px-3"
                        disabled={left === 0n}
                        onClick={() => setRefunding(p)}
                        data-ocid={`admin.payments.refund.${p.paymentIntentId}`}
                      >
                        <Undo2 className="size-3.5" /> Refund
                      </Button>
                    </div>
                  </div>
                  {p.refunds.length > 0 ? (
                    <ul className="space-y-0.5 border-t border-hairline pt-2 text-xs text-muted-foreground">
                      {p.refunds.map((r) => (
                        <li key={r.refundId}>
                          Refunded {formatCents(r.amountCents)} on{" "}
                          {formatTimestamp(r.createdAt)} · {r.reason} ·{" "}
                          <span className="font-mono tracking-wider">
                            {r.refundId}
                          </span>{" "}
                          ({r.status})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {refunding ? (
        <RefundDialog payment={refunding} onClose={() => setRefunding(null)} />
      ) : null}
      {crediting ? (
        <CreditDialog userId={crediting} onClose={() => setCrediting(null)} />
      ) : null}
    </Card>
  );
}

function RefundDialog({
  payment,
  onClose,
}: { payment: PaymentView; onClose: () => void }) {
  const left = refundableCents(payment);
  const [amount, setAmount] = useState(centsToDollars(left));
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [revoke, setRevoke] = useState(true);
  const refund = useAdminRefundPayment();
  const cents = parseDollars(amount);
  const valid = cents !== null && cents > 0n && cents <= left;
  const full =
    cents !== null && payment.refundedCents + cents >= payment.amountCents;
  const fullReason = detail.trim() ? `${reason}: ${detail.trim()}` : reason;

  async function confirm() {
    if (!valid || cents === null) return;
    try {
      const result = await refund.mutateAsync({
        paymentIntentId: payment.paymentIntentId,
        amountCents: cents,
        reason: fullReason,
        revokeEffects: revoke,
      });
      if (result.ok) {
        toast.success(
          `Refunded ${formatCents(cents)} to the card (${result.refundId ?? "refund recorded"})`,
        );
        onClose();
      } else {
        toast.error(result.error ?? "The refund was not made.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The refund was not made.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !refund.isPending && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="admin.refund.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-display text-xl font-black tracking-tight">
            <GlossyTile icon={Undo2} size="sm" />
            Refund to the card
          </DialogTitle>
          <DialogDescription>
            {paymentLabel(payment)} · invoice{" "}
            <span className="font-mono text-foreground">
              {payment.paymentIntentId}
            </span>{" "}
            · {formatCents(left)} of {formatCents(payment.amountCents)} can
            still be refunded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Amount (USD)</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!valid}
              className="h-11 font-display text-lg font-bold tabular-nums sm:h-10"
              data-ocid="admin.refund.amount.input"
            />
            {!valid ? (
              <p className="text-xs text-destructive">
                Enter between $0.01 and {formatCents(left)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger
                className="h-11 w-full sm:h-10"
                data-ocid="admin.refund.reason.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Details (support ticket, what went wrong)"
              maxLength={150}
              aria-label="Refund details"
              className="h-11 sm:h-10"
            />
          </div>
          <div
            className={cn(
              raisedClass,
              "flex items-start gap-3 px-4 py-3 text-sm",
            )}
          >
            <Checkbox
              id="refund-revoke"
              checked={revoke}
              onCheckedChange={(v) => setRevoke(v === true)}
              className="mt-0.5"
              data-ocid="admin.refund.revoke.checkbox"
            />
            <Label htmlFor="refund-revoke" className="font-normal">
              Also take back what it granted
              <span className="block text-xs text-muted-foreground">
                {revokeNote(payment, full)}
              </span>
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-5 sm:h-9"
            onClick={onClose}
            disabled={refund.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void confirm()}
            disabled={!valid || refund.isPending}
            className="h-11 gap-2 px-5 sm:h-9"
            data-ocid="admin.refund.confirm.button"
          >
            {refund.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Refund {cents !== null && valid ? formatCents(cents) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({
  userId,
  onClose,
}: { userId: string; onClose: () => void }) {
  const [credits, setCredits] = useState("100");
  const [note, setNote] = useState("");
  const adjust = useAdminAdjustCredits();
  const delta = /^-?\d+$/.test(credits.trim()) ? BigInt(credits.trim()) : null;
  const valid =
    delta !== null &&
    delta !== 0n &&
    delta <= 1_000_000n &&
    delta >= -1_000_000n &&
    note.trim() !== "";

  async function confirm() {
    if (!valid || delta === null) return;
    try {
      const result = await adjust.mutateAsync({
        userId,
        delta,
        note: note.trim(),
      });
      if (result.ok) {
        toast.success(
          `Credits ${delta > 0n ? "added" : "deducted"}; balance ${result.creditBalance ?? "updated"}`,
        );
        onClose();
      } else {
        toast.error(result.error ?? "The credits were not changed.");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "The credits were not changed.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !adjust.isPending && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="admin.credit.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-display text-xl font-black tracking-tight">
            <GlossyTile icon={Sparkles} size="sm" />
            Credit the account
          </DialogTitle>
          <DialogDescription className="break-all">
            AI credits for account{" "}
            <span className="font-mono text-foreground">{userId}</span> (1
            credit = $0.01 of AI use). A negative number takes credits back.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="credit-amount">Credits</Label>
            <Input
              id="credit-amount"
              inputMode="numeric"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="h-11 font-display text-lg font-bold tabular-nums sm:h-10"
              data-ocid="admin.credit.amount.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credit-note">
              Note (shown on the customer's ledger)
            </Label>
            <Input
              id="credit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={150}
              placeholder="e.g. Sorry for the delay with your order"
              className="h-11 sm:h-10"
              data-ocid="admin.credit.note.input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-5 sm:h-9"
            onClick={onClose}
            disabled={adjust.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void confirm()}
            disabled={!valid || adjust.isPending}
            className="h-11 gap-2 px-5 sm:h-9"
            data-ocid="admin.credit.confirm.button"
          >
            {adjust.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {delta !== null && delta < 0n ? "Deduct credits" : "Add credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

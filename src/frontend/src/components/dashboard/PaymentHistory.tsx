import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadError } from "@/components/ui/load-error";
import { useMyPayments } from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { formatTimestamp } from "@/lib/format";
import { paymentLabel } from "@/lib/payments";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Copy, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { WidgetHeader, emptyNoteClass } from "./WidgetParts";

/**
 * The customer's payments, newest first. Each carries its invoice number
 * (the payment id), which support asks for, with the account ID above, to
 * look a payment up and refund it.
 */
export function PaymentHistory() {
  const payments = useMyPayments();
  const list = payments.data ?? [];

  async function copy(invoice: string) {
    if (await copyText(invoice)) toast.success("Invoice number copied");
    else toast.error("Couldn't copy; select it instead");
  }

  return (
    <Card data-ocid="dashboard.payments.card">
      <CardHeader className="pb-0">
        <WidgetHeader
          icon={Receipt}
          title="Payment history"
          description="Need a refund? Contact support with your account ID and the invoice number of the payment."
        />
      </CardHeader>
      <CardContent>
        {payments.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : payments.isError ? (
          <LoadError
            what="your payments"
            onRetry={() => void payments.refetch()}
            retrying={payments.isFetching}
            data-ocid="dashboard.payments.error"
          />
        ) : list.length === 0 ? (
          <p className={emptyNoteClass}>No payments yet.</p>
        ) : (
          <ul className="@container divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-card-raised">
            {list.map((p) => (
              // Narrow rows (a phone) stack the amount and its pill under
              // the details, so the invoice number customers quote for a
              // refund is always shown whole; wider rows put them at the
              // right. Sized by the list's own width.
              <li
                key={p.paymentIntentId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5"
                data-ocid={`dashboard.payments.item.${p.paymentIntentId}`}
              >
                <div className="min-w-0 flex-1 basis-full space-y-1 @md:basis-0">
                  <p className="line-clamp-2 break-words text-[15px] font-semibold text-foreground">
                    {paymentLabel(p)}
                  </p>
                  <p className="meta-mono whitespace-nowrap">
                    {formatTimestamp(p.confirmedAt ?? p.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copy(p.paymentIntentId)}
                    className="meta-mono -mx-1.5 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl px-1.5 py-0.5 text-left transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-7"
                    aria-label={`Copy invoice number ${p.paymentIntentId}`}
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      Invoice {p.paymentIntentId}
                    </span>
                    <Copy className="size-3.5 shrink-0" />
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 @md:flex-col @md:items-end @md:gap-1.5">
                  <span className="font-display text-xl font-black tracking-tight text-foreground tabular-nums">
                    {formatCents(p.amountCents)}
                  </span>
                  {p.testMode ? (
                    <Badge variant="info">Test mode</Badge>
                  ) : p.refundedCents > 0n ? (
                    <span
                      className={cn(
                        "status-pill",
                        p.refundedCents >= p.amountCents
                          ? "status-pill-red"
                          : "status-pill-amber",
                      )}
                    >
                      {p.refundedCents >= p.amountCents
                        ? "Refunded"
                        : `${formatCents(p.refundedCents)} refunded`}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

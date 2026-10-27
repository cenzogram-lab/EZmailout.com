import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadError } from "@/components/ui/load-error";
import { useMyPayments } from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { formatTimestamp } from "@/lib/format";
import { paymentLabel } from "@/lib/payments";
import { formatCents } from "@/lib/pricing";
import { Copy, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4 text-primary" /> Payment history
        </CardTitle>
        <CardDescription>
          Need a refund? Contact support with your account ID and the invoice
          number of the payment.
        </CardDescription>
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
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.map((p) => (
              <li
                key={p.paymentIntentId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                data-ocid={`dashboard.payments.item.${p.paymentIntentId}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {paymentLabel(p)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(p.confirmedAt ?? p.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copy(p.paymentIntentId)}
                    className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                    aria-label={`Copy invoice number ${p.paymentIntentId}`}
                  >
                    <span className="truncate">
                      Invoice {p.paymentIntentId}
                    </span>
                    <Copy className="size-3 shrink-0" />
                  </button>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCents(p.amountCents)}
                  </span>
                  {p.testMode ? (
                    <Badge variant="outline">Test mode</Badge>
                  ) : p.refundedCents > 0n ? (
                    <Badge variant="outline">
                      {p.refundedCents >= p.amountCents
                        ? "Refunded"
                        : `${formatCents(p.refundedCents)} refunded`}
                    </Badge>
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

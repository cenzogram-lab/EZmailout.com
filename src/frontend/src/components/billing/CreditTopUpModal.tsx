import type { CreditPack } from "@/backend";
import { PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { GlossyIcon } from "@/components/dashboard/WidgetParts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccountSync } from "@/hooks/use-account";
import { CREDIT_PACKS, MONTHLY_ALLOWANCE } from "@/lib/credits";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Global AI-credit top-up modal (Starter / Growth / Agency packs via Stripe). */
export function CreditTopUpModal() {
  const open = useAccountStore((s) => s.topUpOpen);
  const setOpen = useAccountStore((s) => s.setTopUpOpen);
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const { refresh } = useAccountSync();
  const [pack, setPack] = useState<CreditPack | null>(null);
  // Once the card step has run, the modal stays until the payment is
  // confirmed: a new checkout from "Change" or a reopened modal could charge
  // the card a second time (`StripeCheckout` `onLockedChange`).
  const [locked, setLocked] = useState(false);

  const selected = CREDIT_PACKS.find((p) => p.id === pack) ?? null;

  function close() {
    setOpen(false);
    setPack(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : !locked && close())}
    >
      <DialogContent
        className={cn(
          "max-w-lg sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:overflow-y-auto",
          // Below `sm` it is a bottom sheet with a grab handle.
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:data-[state=open]:slide-in-from-bottom-8 max-sm:data-[state=closed]:slide-out-to-bottom-8",
        )}
        data-ocid="credits.topup.modal"
      >
        <span aria-hidden className="sheet-handle -mt-4 mb-0 sm:hidden" />
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-3 pr-8 font-display text-xl font-black">
            <GlossyIcon icon={Sparkles} /> Top up AI credits
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            1 credit = $0.01. Copy assistant 1 credit · square art 7 ·
            widescreen 14 · HD 20. Members get {MONTHLY_ALLOWANCE} free credits
            with each 30-day pass. Current balance:{" "}
            <strong className="font-black tabular-nums text-foreground">
              {creditBalance}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        {!selected ? (
          <div className="grid gap-1.5 rounded-[1.75rem] border border-hairline bg-well p-1.5 shadow-[inset_0_1px_2px_rgb(15_17_23/0.06)] sm:grid-cols-3 dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.5)]">
            {CREDIT_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                className={cn(
                  "grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-[1.375rem] border border-hairline bg-card px-4 py-3 text-left shadow-surface transition-[transform,border-color,box-shadow] hover:border-primary/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 motion-reduce:transition-none motion-reduce:active:scale-100 sm:flex sm:flex-col sm:items-start sm:p-4 sm:hover:-translate-y-0.5 sm:motion-reduce:hover:translate-y-0",
                  p.bonus > 0 && "border-emerald-brand/40",
                )}
                data-ocid={`credits.pack.${p.id.toLowerCase()}.button`}
              >
                <span className="col-start-1 row-start-1 font-display text-sm font-bold text-foreground">
                  {p.name}
                </span>
                <span className="col-start-2 row-span-3 row-start-1 font-display text-2xl font-black tracking-tight text-primary tabular-nums sm:mt-1 sm:text-3xl">
                  {formatCents(p.priceCents)}
                </span>
                <span className="col-start-1 row-start-2 text-xs font-medium text-muted-foreground">
                  {p.credits.toLocaleString()} credits
                </span>
                {p.bonus > 0 && (
                  <span className="status-pill status-pill-emerald col-start-1 row-start-3 mt-1.5 text-[11px] sm:mt-2">
                    includes {p.bonus} bonus
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-well px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgb(15_17_23/0.06)] dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.5)]">
              <span className="min-w-0 font-semibold text-foreground">
                {selected.name} · {selected.credits.toLocaleString()} credits
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPack(null)}
                disabled={locked}
                data-ocid="credits.change_pack.button"
              >
                Change
              </Button>
            </div>
            <StripeCheckout
              purpose={PaymentPurpose.CreditPack}
              pack={selected.id}
              amountLabel={formatCents(selected.priceCents)}
              title="Buy credits"
              submitLabel="Pay"
              onSuccess={(result) => {
                toast.success(
                  `Credits added${result.creditBalance !== undefined ? ` — balance ${Number(result.creditBalance)}` : ""}`,
                );
                void refresh();
                close();
              }}
              onCancel={() => setPack(null)}
              onLockedChange={setLocked}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

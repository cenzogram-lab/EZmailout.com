import type { CreditPack } from "@/backend";
import { PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
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

  const selected = CREDIT_PACKS.find((p) => p.id === pack) ?? null;

  function close() {
    setOpen(false);
    setPack(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg" data-ocid="credits.topup.modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-5 text-primary" /> Top up AI credits
          </DialogTitle>
          <DialogDescription>
            1 credit = $0.01. Copy assistant 1 credit · square art 7 ·
            widescreen 14 · HD 20. Members get {MONTHLY_ALLOWANCE} free credits
            every month. Current balance: <strong>{creditBalance}</strong>.
          </DialogDescription>
        </DialogHeader>
        {!selected ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                className={cn(
                  "flex flex-col items-start rounded-xl border bg-card p-4 text-left transition-smooth hover:border-primary hover:shadow-sm",
                  p.bonus > 0 && "border-emerald-brand/40",
                )}
                data-ocid={`credits.pack.${p.id.toLowerCase()}.button`}
              >
                <span className="font-display text-sm font-semibold">
                  {p.name}
                </span>
                <span className="mt-1 font-display text-2xl font-bold text-primary">
                  {formatCents(p.priceCents)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.credits.toLocaleString()} credits
                </span>
                {p.bonus > 0 && (
                  <span className="mt-2 rounded-full bg-emerald-brand/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-brand">
                    +{p.bonus} bonus
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>
                {selected.name} · {selected.credits.toLocaleString()} credits
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPack(null)}
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
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

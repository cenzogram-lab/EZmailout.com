import { Button } from "@/components/ui/button";
import { useAccountSync } from "@/hooks/use-account";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { Plus, Sparkles } from "lucide-react";

/** "✨ Credits: N (+ Top Up)" indicator for the AI toolbar and dashboard. */
export function CreditBadge({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, login } = useAccountSync();
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={login}
        className="gap-1.5"
        data-ocid="credits.badge.sign_in"
      >
        <Sparkles className="size-3.5 text-primary" /> Sign in for AI credits
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-hairline bg-card py-1 pl-3 pr-1 text-sm shadow-surface",
        compact && "gap-1.5 pl-2.5 text-xs",
      )}
      data-ocid="credits.badge"
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      <span className="whitespace-nowrap font-medium text-muted-foreground">
        Credits:{" "}
        <strong className="font-display font-black tabular-nums text-foreground">
          {creditBalance.toLocaleString()}
        </strong>
      </span>
      <button
        type="button"
        onClick={() => setTopUpOpen(true)}
        className="btn-3d-primary inline-flex min-h-7 items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
        data-ocid="credits.badge.topup"
      >
        <Plus className="size-3" /> Top up
      </button>
    </div>
  );
}

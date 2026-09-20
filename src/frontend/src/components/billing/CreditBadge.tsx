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
        <Sparkles className="size-3.5 text-accent" /> Sign in for AI credits
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm shadow-xs",
        compact && "px-2 text-xs",
      )}
      data-ocid="credits.badge"
    >
      <Sparkles className="size-3.5 text-accent" />
      <span>
        Credits:{" "}
        <strong className="font-mono">{creditBalance.toLocaleString()}</strong>
      </span>
      <button
        type="button"
        onClick={() => setTopUpOpen(true)}
        className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent hover:bg-accent/25"
        data-ocid="credits.badge.topup"
      >
        <Plus className="size-3" /> Top up
      </button>
    </div>
  );
}

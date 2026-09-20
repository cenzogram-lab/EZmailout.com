import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccountSync } from "@/hooks/use-account";
import { useAiPricing, useCreditLedger } from "@/hooks/use-backend";
import { AI_COSTS, creditsToUsd } from "@/lib/credits";
import { formatNumber, formatTimestamp } from "@/lib/format";
import { formatPrice } from "@/lib/pricing";
import { useAccountStore } from "@/store/account";
import { History, Loader2, Plus, Sparkles } from "lucide-react";

const LEDGER_LIMIT = 8;

interface PriceRow {
  key: string;
  label: string;
  credits: number;
}

export function CreditsWidget() {
  const { isAuthenticated } = useAccountSync();
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const pricingQuery = useAiPricing();
  const ledgerQuery = useCreditLedger(isAuthenticated);

  const pricing = pricingQuery.data ?? null;
  const prices: PriceRow[] = [
    {
      key: "copy",
      label: "AI copy (headlines, bullets, CTAs)",
      credits: pricing ? Number(pricing.copyCredits) : AI_COSTS.copy,
    },
    {
      key: "square",
      label: "AI image · 1024 × 1024",
      credits: pricing
        ? Number(pricing.squareImageCredits)
        : AI_COSTS.squareImage,
    },
    {
      key: "wide",
      label: "AI image · 1792 × 1024",
      credits: pricing ? Number(pricing.wideImageCredits) : AI_COSTS.wideImage,
    },
    {
      key: "hd",
      label: "AI image · 1792 × 1024 HD",
      credits: pricing ? Number(pricing.hdImageCredits) : AI_COSTS.hdImage,
    },
  ];

  const ledger = [...(ledgerQuery.data ?? [])]
    .sort((a, b) => Number(b.timestamp - a.timestamp))
    .slice(0, LEDGER_LIMIT);

  return (
    <Card data-ocid="dashboard.credits.card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-accent" />
              AI credits
            </CardTitle>
            <CardDescription>
              1 credit = {formatPrice(creditsToUsd(1))}. Spend them on AI copy
              and imagery in the design studio.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setTopUpOpen(true)}
            className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
            data-ocid="dashboard.credits.topup.button"
          >
            <Plus className="size-3.5" /> Top up
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p
              className="font-display text-3xl font-bold tracking-tight text-foreground"
              data-ocid="dashboard.credits.balance.text"
            >
              {formatNumber(creditBalance)}
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            ≈ {formatPrice(creditsToUsd(creditBalance))}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Price list
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {prices.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between px-3 py-2 text-sm"
                data-ocid={`dashboard.credits.price.${row.key}.row`}
              >
                <span className="text-foreground">{row.label}</span>
                <span className="font-mono text-muted-foreground">
                  {row.credits} cr · {formatPrice(creditsToUsd(row.credits))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" /> Recent activity
          </p>
          {ledgerQuery.isLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading ledger…
            </div>
          ) : ledger.length === 0 ? (
            <p
              className="py-3 text-sm text-muted-foreground"
              data-ocid="dashboard.credits.ledger.empty"
            >
              No credit activity yet. Your monthly allowance and top-ups will
              show here.
            </p>
          ) : (
            <Table data-ocid="dashboard.credits.ledger.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry, idx) => {
                  const delta = Number(entry.delta);
                  return (
                    <TableRow
                      key={entry.id.toString()}
                      data-ocid={`dashboard.credits.ledger.item.${idx + 1}`}
                    >
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {entry.reason}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${
                          delta >= 0 ? "text-emerald-brand" : "text-destructive"
                        }`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {formatNumber(delta)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(entry.balanceAfter)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

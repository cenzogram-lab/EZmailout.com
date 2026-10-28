import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadError } from "@/components/ui/load-error";
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
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { History, Loader2, Plus, Sparkles } from "lucide-react";
import { SectionLabel, WidgetHeader, emptyNoteClass } from "./WidgetParts";

const LEDGER_LIMIT = 8;

interface PriceRow {
  key: string;
  /** What the credits buy; a no-break space keeps "AI image ·" together. */
  label: string;
  /** Its size or scope; image sizes are kept on one line. */
  detail: string;
  keepDetailTogether: boolean;
  credits: number;
}

export function CreditsWidget() {
  const { isAuthenticated, accountReady } = useAccountSync();
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const pricingQuery = useAiPricing();
  const ledgerQuery = useCreditLedger(isAuthenticated);

  const pricing = pricingQuery.data ?? null;
  const prices: PriceRow[] = [
    {
      key: "copy",
      label: "AI copy",
      detail: "(headlines, bullets, CTAs)",
      keepDetailTogether: false,
      credits: pricing ? Number(pricing.copyCredits) : AI_COSTS.copy,
    },
    {
      key: "square",
      label: "AI image\u00a0·",
      detail: "1024 × 1024",
      keepDetailTogether: true,
      credits: pricing
        ? Number(pricing.squareImageCredits)
        : AI_COSTS.squareImage,
    },
    {
      key: "wide",
      label: "AI image\u00a0·",
      detail: "1792 × 1024",
      keepDetailTogether: true,
      credits: pricing ? Number(pricing.wideImageCredits) : AI_COSTS.wideImage,
    },
    {
      key: "hd",
      label: "AI image\u00a0·",
      detail: "1792 × 1024 HD",
      keepDetailTogether: true,
      credits: pricing ? Number(pricing.hdImageCredits) : AI_COSTS.hdImage,
    },
  ];

  const ledger = [...(ledgerQuery.data ?? [])]
    .sort((a, b) => Number(b.timestamp - a.timestamp))
    .slice(0, LEDGER_LIMIT);

  return (
    <Card data-ocid="dashboard.credits.card">
      <CardHeader className="pb-0">
        <WidgetHeader
          icon={Sparkles}
          title="AI credits"
          description={`1 credit = ${formatPrice(creditsToUsd(1))}. Spend them on AI copy and imagery in the design studio.`}
          action={
            <Button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="h-11 gap-1 px-4 sm:h-10"
              data-ocid="dashboard.credits.topup.button"
            >
              <Plus className="size-3.5" /> Top up
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative isolate flex flex-wrap items-end justify-between gap-3 overflow-hidden rounded-2xl border border-hairline bg-card-raised px-5 py-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]">
          <div aria-hidden className="ambient-glow-backdrop" />
          <div className="min-w-0">
            <SectionLabel>Balance</SectionLabel>
            <p
              className="stat-number mt-1 font-display text-foreground"
              data-ocid="dashboard.credits.balance.text"
            >
              {accountReady ? (
                formatNumber(creditBalance)
              ) : (
                <span className="inline-block h-9 w-24 animate-pulse rounded-xl bg-muted align-middle md:h-12" />
              )}
            </p>
          </div>
          {accountReady ? (
            <Badge variant="info" className="mb-1 font-mono tracking-wide">
              ≈ {formatPrice(creditsToUsd(creditBalance))}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <SectionLabel>Price list</SectionLabel>
          {/* A narrow list (a phone) stacks each price under its credits so
              the labels keep the width; a wide one reads "7 cr · $0.07". */}
          <ul className="@container divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-card-raised">
            {prices.map((row) => (
              <li
                key={row.key}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-sm"
                data-ocid={`dashboard.credits.price.${row.key}.row`}
              >
                <span className="min-w-0 text-balance text-foreground">
                  {row.label}{" "}
                  <span
                    className={cn(
                      row.keepDetailTogether && "whitespace-nowrap",
                    )}
                  >
                    {row.detail}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end whitespace-nowrap font-mono text-xs leading-4 tracking-wide text-muted-foreground @md:flex-row @md:items-baseline @md:gap-1.5">
                  <span className="font-bold text-foreground">
                    {row.credits} cr
                  </span>
                  <span aria-hidden className="hidden @md:inline">
                    ·
                  </span>
                  <span>{formatPrice(creditsToUsd(row.credits))}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-hairline pt-5">
          <SectionLabel icon={History}>Recent activity</SectionLabel>
          {ledgerQuery.isLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading ledger…
            </div>
          ) : ledgerQuery.isError && !ledgerQuery.data ? (
            <LoadError
              what="your credit activity"
              onRetry={() => void ledgerQuery.refetch()}
              retrying={ledgerQuery.isRefetching}
              data-ocid="dashboard.credits.ledger.error"
            />
          ) : ledger.length === 0 ? (
            <p
              className={emptyNoteClass}
              data-ocid="dashboard.credits.ledger.empty"
            >
              No credit activity yet. Your membership credits and top-ups will
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
                      <TableCell className="max-w-[180px] truncate text-sm font-medium">
                        {entry.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "status-pill ml-auto font-mono tabular-nums",
                            delta >= 0
                              ? "status-pill-emerald"
                              : "status-pill-red",
                          )}
                        >
                          {delta >= 0 ? "+" : ""}
                          {formatNumber(delta)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {formatNumber(entry.balanceAfter)}
                      </TableCell>
                      <TableCell className="meta-mono whitespace-nowrap text-right">
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

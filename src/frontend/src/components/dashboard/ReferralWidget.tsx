import { MascotEmptyState } from "@/components/stampy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccountSync } from "@/hooks/use-account";
import { useReferralStats } from "@/hooks/use-backend";
import { BRAND, referralUrlFor } from "@/lib/brand";
import { copyText } from "@/lib/download";
import { formatNumber, formatTimestamp } from "@/lib/format";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { Check, Copy, Gift, Loader2, Share2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SectionLabel, StatTile, WidgetHeader } from "./WidgetParts";

const REWARD_LIMIT = 8;

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function ReferralWidget() {
  const { isAuthenticated, account } = useAccountSync();
  const statsQuery = useReferralStats(isAuthenticated);
  const [copied, setCopied] = useState(false);

  const stats = statsQuery.data ?? null;
  const referralCode = stats?.referralCode ?? account?.referralCode ?? "";
  const referralLink =
    stats?.referralLink ||
    account?.referralLink ||
    (referralCode ? referralUrlFor(referralCode) : "");
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const rewards = [...(stats?.rewards ?? [])]
    .sort((a, b) => Number(b.timestamp - a.timestamp))
    .slice(0, REWARD_LIMIT);

  async function handleCopy() {
    if (!referralLink) return;
    const ok = await copyText(referralLink);
    if (ok) {
      setCopied(true);
      toast.success("Referral link copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Could not copy to clipboard.");
    }
  }

  async function handleShare() {
    if (!referralLink) return;
    if (!canShare) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `Join me on ${BRAND.name}`,
        text: `Send real postcards and letters in minutes with ${BRAND.name}. Sign up with my link:`,
        url: referralLink,
      });
    } catch {
      // The user dismissed the share sheet; nothing to report.
    }
  }

  return (
    <Card
      className="relative isolate overflow-hidden"
      data-ocid="dashboard.referral.card"
    >
      <div aria-hidden className="ambient-glow-backdrop" />
      <CardHeader className="pb-0">
        <WidgetHeader
          icon={Gift}
          title={<>Referrals &amp; Rewards</>}
          description={`Earn a free 30-day membership (worth ${formatCents(SUBSCRIPTION_PRICE_CENTS)}) each time someone you refer makes their first payment of ${formatCents(SUBSCRIPTION_PRICE_CENTS)} or more while your membership is active. Use it whenever you renew.`}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        {statsQuery.isLoading && !stats ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading referral stats…
          </div>
        ) : (
          <>
            <div className="@container space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Your referral link
              </Label>
              {/* A narrow card (a phone) gives the link the whole row, with
                  the referral code, copy and share under it; a wide one puts
                  the buttons beside the link and the code below. */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  readOnly
                  value={referralLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 basis-full rounded-full px-3.5 font-mono text-xs tracking-normal @sm:basis-0 @sm:flex-1 @sm:px-4 @sm:tracking-wide"
                  data-ocid="dashboard.referral.link.input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="order-2 size-11 shrink-0 rounded-full"
                  onClick={handleCopy}
                  disabled={!referralLink}
                  aria-label="Copy referral link"
                  data-ocid="dashboard.referral.copy.button"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-brand" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="order-2 size-11 shrink-0 rounded-full"
                  onClick={handleShare}
                  disabled={!referralLink}
                  aria-label="Share referral link"
                  data-ocid="dashboard.referral.share.button"
                >
                  <Share2 className="size-4" />
                </Button>
                <p className="order-1 flex min-w-0 flex-1 basis-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground @sm:order-3 @sm:basis-full">
                  Referral code{" "}
                  <Badge
                    variant="info"
                    className="font-mono tracking-wider"
                    data-ocid="dashboard.referral.code.badge"
                  >
                    {referralCode || "—"}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatTile
                label="Referrals"
                value={formatNumber(stats?.referralCount ?? 0)}
                data-ocid="dashboard.referral.count.stat"
              />
              <StatTile
                label="Free months earned"
                value={formatNumber(stats?.referralCreditsEarned ?? 0)}
                data-ocid="dashboard.referral.earned.stat"
              />
              <StatTile
                label="Free months used"
                value={formatNumber(stats?.referralCreditsRedeemed ?? 0)}
                data-ocid="dashboard.referral.redeemed.stat"
              />
              <StatTile
                label="Free months"
                value={formatNumber(stats?.freeMonthsAvailable ?? 0)}
                data-ocid="dashboard.referral.free_months.stat"
              />
            </div>

            {stats && !stats.subscriptionActive && (
              <p className="rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs leading-relaxed text-primary-ink">
                Your membership is inactive. Rewards only accrue while it is
                active — start or renew it to keep earning.
              </p>
            )}

            <div className="space-y-2 border-t border-hairline pt-5">
              <SectionLabel icon={Users}>Reward history</SectionLabel>
              {rewards.length === 0 ? (
                <MascotEmptyState
                  pose="mail"
                  size="sm"
                  title="No rewards yet"
                  description={`Share your link: a friend's first payment of ${formatCents(SUBSCRIPTION_PRICE_CENTS)} or more earns you a free month while your membership is active.`}
                  data-ocid="dashboard.referral.rewards.empty"
                />
              ) : (
                <Table data-ocid="dashboard.referral.rewards.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referee</TableHead>
                      <TableHead className="text-right">Reward</TableHead>
                      <TableHead className="text-right">When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward, idx) => (
                      <TableRow
                        key={reward.id.toString()}
                        data-ocid={`dashboard.referral.rewards.item.${idx + 1}`}
                      >
                        <TableCell className="meta-mono text-foreground">
                          {shortId(reward.refereeId)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="status-pill status-pill-emerald ml-auto">
                            1 free month ({formatCents(reward.amountCents)}{" "}
                            value)
                          </span>
                        </TableCell>
                        <TableCell className="meta-mono whitespace-nowrap text-right">
                          {formatTimestamp(reward.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

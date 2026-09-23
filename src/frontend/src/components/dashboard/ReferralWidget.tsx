import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useReferralStats } from "@/hooks/use-backend";
import { BRAND, referralUrlFor } from "@/lib/brand";
import { copyText } from "@/lib/download";
import { formatNumber, formatTimestamp } from "@/lib/format";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { Check, Copy, Gift, Loader2, Share2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const REWARD_LIMIT = 8;

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function Stat({
  label,
  value,
  ocid,
}: {
  label: string;
  value: string;
  ocid: string;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-muted/40 px-3 py-2"
      data-ocid={ocid}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
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
    <Card data-ocid="dashboard.referral.card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4 text-primary" />
          Referrals &amp; Rewards
        </CardTitle>
        <CardDescription>
          Earn 1 free month ({formatCents(SUBSCRIPTION_PRICE_CENTS)} credit)
          each time someone you refer makes their first payment. Keep your
          membership active to accrue and redeem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statsQuery.isLoading && !stats ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading referral stats…
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Your referral link
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={referralLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 font-mono text-xs"
                  data-ocid="dashboard.referral.link.input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
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
                  className="size-9 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleShare}
                  disabled={!referralLink}
                  aria-label="Share referral link"
                  data-ocid="dashboard.referral.share.button"
                >
                  <Share2 className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Referral code{" "}
                <Badge
                  variant="outline"
                  className="ml-1 font-mono"
                  data-ocid="dashboard.referral.code.badge"
                >
                  {referralCode || "—"}
                </Badge>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Referrals"
                value={formatNumber(stats?.referralCount ?? 0)}
                ocid="dashboard.referral.count.stat"
              />
              <Stat
                label="Credits earned"
                value={formatNumber(stats?.referralCreditsEarned ?? 0)}
                ocid="dashboard.referral.earned.stat"
              />
              <Stat
                label="Credits redeemed"
                value={formatNumber(stats?.referralCreditsRedeemed ?? 0)}
                ocid="dashboard.referral.redeemed.stat"
              />
              <Stat
                label="Free months"
                value={formatNumber(stats?.freeMonthsAvailable ?? 0)}
                ocid="dashboard.referral.free_months.stat"
              />
            </div>

            {stats && !stats.subscriptionActive && (
              <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary-foreground">
                Your membership is inactive. Rewards only accrue while it is
                active — start or renew it to keep earning.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" /> Reward history
              </p>
              {rewards.length === 0 ? (
                <p
                  className="py-3 text-sm text-muted-foreground"
                  data-ocid="dashboard.referral.rewards.empty"
                >
                  No rewards yet. Share your link to get started.
                </p>
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
                        <TableCell className="font-mono text-xs">
                          {shortId(reward.refereeId)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-brand">
                          +{formatCents(reward.amountCents)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
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

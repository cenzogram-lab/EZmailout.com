import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Unpaid drafts are removed this many days after their last activity.
 * Mirrors `CampaignLib.draftTtlNs`; change both.
 */
export const DRAFT_TTL_DAYS = 14;

function isPast(expiresAt: bigint): boolean {
  return Number(expiresAt / 1_000_000n) <= Date.now();
}

/** "Expires <date>" under an unpaid draft's row; nothing for anything else. */
export function DraftExpiry({
  expiresAt,
  className,
}: {
  expiresAt?: bigint;
  className?: string;
}) {
  if (expiresAt === undefined) return null;
  return (
    <span
      className={cn("block text-xs text-muted-foreground", className)}
      title={`Unpaid drafts are removed ${DRAFT_TTL_DAYS} days after their last activity`}
      data-ocid="campaign.draft_expiry"
    >
      {isPast(expiresAt)
        ? "Removal pending"
        : `Expires ${formatTimestamp(expiresAt, false)}`}
    </span>
  );
}

/** The detail page's sentence about when an unpaid draft is removed. */
export function DraftExpiryNote({ expiresAt }: { expiresAt?: bigint }) {
  if (expiresAt === undefined) return null;
  return (
    <p
      className="text-sm text-muted-foreground"
      data-ocid="campaign_detail.draft_expiry"
    >
      Unpaid drafts are removed {DRAFT_TTL_DAYS} days after their last activity.{" "}
      {isPast(expiresAt)
        ? "This one is due for removal."
        : `This one will be removed on ${formatTimestamp(expiresAt, false)} unless it is paid.`}
    </p>
  );
}

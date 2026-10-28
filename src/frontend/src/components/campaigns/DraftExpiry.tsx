import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Hourglass } from "lucide-react";

/**
 * Unpaid drafts are removed this many days after their last activity.
 * Mirrors `CampaignLib.draftTtlNs`; change both.
 */
export const DRAFT_TTL_DAYS = 14;

function isPast(expiresAt: bigint): boolean {
  return Number(expiresAt / 1_000_000n) <= Date.now();
}

/**
 * "Expires <date>" under an unpaid draft's row, as an amber status pill;
 * nothing for anything else.
 */
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
      className={cn(
        "status-pill status-pill-amber mt-1.5 flex gap-1 px-2 text-[11px]",
        className,
      )}
      title={`Unpaid drafts are removed ${DRAFT_TTL_DAYS} days after their last activity`}
      data-ocid="campaign.draft_expiry"
    >
      <Hourglass className="size-3 shrink-0" aria-hidden="true" />
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
      className="status-pill-amber flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
      data-ocid="campaign_detail.draft_expiry"
    >
      <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Unpaid drafts are removed {DRAFT_TTL_DAYS} days after their last
        activity.{" "}
        {isPast(expiresAt)
          ? "This one is due for removal."
          : `This one will be removed on ${formatTimestamp(expiresAt, false)} unless it is paid.`}
      </span>
    </p>
  );
}

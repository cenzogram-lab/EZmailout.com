import { CampaignStatus, PaymentStatus, ProductionStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock,
  Factory,
  Inbox,
  type LucideIcon,
  MailX,
  MapPin,
  Truck,
  Undo2,
} from "lucide-react";

export interface CampaignStage {
  key: CampaignStatus;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The five delivery stages, in order. */
export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    key: CampaignStatus.Created,
    label: "Created",
    description: "Order received and queued for print.",
    icon: Clock,
  },
  {
    key: CampaignStatus.InProduction,
    label: "In Production",
    description: "Printing and addressing at the facility.",
    icon: Factory,
  },
  {
    key: CampaignStatus.InTransit,
    label: "In Transit",
    description: "Accepted by USPS and moving through the network.",
    icon: Truck,
  },
  {
    key: CampaignStatus.SortedAtLocalHub,
    label: "Sorted at Local Hub",
    description: "Sorted at the destination post office.",
    icon: MapPin,
  },
  {
    key: CampaignStatus.Delivered,
    label: "Delivered",
    description: "Landed in mailboxes.",
    icon: Inbox,
  },
];

/**
 * Outcomes that end a campaign without delivery. On the timeline one of them
 * takes the place of "Delivered"; tracking outcalls stop there.
 */
export const DELIVERY_EXCEPTIONS: CampaignStage[] = [
  {
    key: CampaignStatus.Undeliverable,
    label: "Undeliverable",
    description:
      "USPS could not deliver to the listed address (including forwarded mail).",
    icon: MailX,
  },
  {
    key: CampaignStatus.Returned,
    label: "Returned",
    description: "USPS returned the mail to the sender.",
    icon: Undo2,
  },
];

export function isDeliveryException(status: CampaignStatus): boolean {
  return (
    status === CampaignStatus.Undeliverable ||
    status === CampaignStatus.Returned
  );
}

/** Delivered, undeliverable or returned: USPS has finished with the mail. */
export function isDeliveryOutcome(status: CampaignStatus): boolean {
  return status === CampaignStatus.Delivered || isDeliveryException(status);
}

function stageFor(status: CampaignStatus): CampaignStage | undefined {
  return [...CAMPAIGN_STAGES, ...DELIVERY_EXCEPTIONS].find(
    (stage) => stage.key === status,
  );
}

/** Position on the five-stage timeline; an exception sits in the last slot. */
export function stageIndex(status: CampaignStatus): number {
  if (isDeliveryException(status)) return CAMPAIGN_STAGES.length - 1;
  return CAMPAIGN_STAGES.findIndex((stage) => stage.key === status);
}

/**
 * The canister's ranking (`CampaignLib.stageIndex`): the five stages, then
 * Undeliverable and Returned after Delivered. `stageIndex` above is the
 * timeline slot, where both exceptions share the last one.
 */
const STATUS_RANK: Record<CampaignStatus, number> = {
  [CampaignStatus.Created]: 0,
  [CampaignStatus.InProduction]: 1,
  [CampaignStatus.InTransit]: 2,
  [CampaignStatus.SortedAtLocalHub]: 3,
  [CampaignStatus.Delivered]: 4,
  [CampaignStatus.Undeliverable]: 5,
  [CampaignStatus.Returned]: 6,
};

/**
 * Mirrors `CampaignLib.deliveryMoveAllowed`: the timeline only moves forward
 * (a return overrides a delivery, never the reverse), and only once
 * The print partner has accepted the job.
 */
export function deliveryMoveAllowed(
  production: ProductionStatus,
  from: CampaignStatus,
  to: CampaignStatus,
): boolean {
  return (
    production === ProductionStatus.Submitted &&
    STATUS_RANK[to] > STATUS_RANK[from]
  );
}

export function statusLabel(status: CampaignStatus): string {
  return stageFor(status)?.label ?? status;
}

/**
 * Status pills: neutral until the order is under way, emerald (tinted, with a
 * live dot) while it is in production or moving through USPS, solid emerald
 * once delivered, amber for an exception; indigo stays a brand accent (test
 * mode, a step waiting on the customer). Tinted pills use the
 * `.status-pill-*` inks, which pass AA on their tint in both themes; solid
 * pills carry white text (≥ 4.97:1).
 */
const SOLID =
  "border-transparent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]";
const RED_PILL = "border-destructive/30 bg-destructive/10 text-destructive";

type PillVariant = "neutral" | "info" | "success" | "warning";

interface PillStyle {
  variant: PillVariant;
  className?: string;
  /** A live dot: the stage is under way. */
  live?: boolean;
}

const STATUS_STYLES: Record<CampaignStatus, PillStyle> = {
  [CampaignStatus.Created]: { variant: "neutral" },
  [CampaignStatus.InProduction]: { variant: "success", live: true },
  [CampaignStatus.InTransit]: { variant: "success", live: true },
  [CampaignStatus.SortedAtLocalHub]: { variant: "success", live: true },
  [CampaignStatus.Delivered]: {
    variant: "success",
    className: cn(SOLID, "bg-emerald-brand"),
  },
  [CampaignStatus.Undeliverable]: { variant: "warning" },
  [CampaignStatus.Returned]: {
    variant: "warning",
    className: cn(SOLID, "bg-amber-brand"),
  },
};

/** The pulsing dot of a stage that is under way (still for reduced motion). */
function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex size-1.5 shrink-0">
      <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />
      <span className="relative size-1.5 rounded-full bg-current" />
    </span>
  );
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: CampaignStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const stage = stageFor(status);
  const Icon = stage?.icon;
  const style = STATUS_STYLES[status];
  return (
    <Badge
      variant={style.variant}
      className={cn("gap-1.5", style.className, className)}
      data-ocid={`campaigns.status.${status.toLowerCase()}.badge`}
    >
      {showIcon && Icon ? <Icon className="size-3" /> : null}
      {stage?.label ?? status}
      {style.live ? <LiveDot /> : null}
    </Badge>
  );
}

const PAYMENT_STYLES: Record<PaymentStatus, PillStyle> = {
  [PaymentStatus.Unpaid]: { variant: "warning" },
  [PaymentStatus.Pending]: { variant: "neutral" },
  [PaymentStatus.Paid]: { variant: "success" },
  [PaymentStatus.Waived]: { variant: "info" },
  [PaymentStatus.Refunded]: { variant: "neutral", className: RED_PILL },
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const style = PAYMENT_STYLES[status];
  return (
    <Badge
      variant={style.variant}
      className={cn(style.className, className)}
      data-ocid={`campaigns.payment.${status.toLowerCase()}.badge`}
      title={
        status === PaymentStatus.Waived
          ? "Paid through test-mode checkout: the print job goes to the staging environment and never prints."
          : undefined
      }
    >
      {status === PaymentStatus.Waived ? "Test mode" : status}
    </Badge>
  );
}

const PRODUCTION_LABELS: Record<ProductionStatus, string> = {
  [ProductionStatus.Draft]: "Draft",
  [ProductionStatus.AwaitingPayment]: "Awaiting payment",
  [ProductionStatus.ReadyToDispatch]: "Ready to dispatch",
  [ProductionStatus.Processing]: "Dispatching…",
  [ProductionStatus.DocumentUploaded]: "Document uploaded",
  [ProductionStatus.AddressListReady]: "Address list ready",
  [ProductionStatus.JobCreated]: "Job created",
  [ProductionStatus.Submitted]: "Submitted",
  [ProductionStatus.Failed]: "Failed",
};

const PRODUCTION_STYLES: Record<ProductionStatus, PillStyle> = {
  [ProductionStatus.Draft]: { variant: "neutral" },
  [ProductionStatus.AwaitingPayment]: { variant: "warning" },
  [ProductionStatus.ReadyToDispatch]: { variant: "info" },
  [ProductionStatus.Processing]: {
    variant: "success",
    className: "motion-safe:animate-pulse",
    live: true,
  },
  [ProductionStatus.DocumentUploaded]: { variant: "success", live: true },
  [ProductionStatus.AddressListReady]: { variant: "success", live: true },
  [ProductionStatus.JobCreated]: { variant: "success", live: true },
  [ProductionStatus.Submitted]: {
    variant: "success",
    className: cn(SOLID, "bg-emerald-brand"),
  },
  [ProductionStatus.Failed]: { variant: "neutral", className: RED_PILL },
};

export function productionLabel(status: ProductionStatus): string {
  return PRODUCTION_LABELS[status] ?? status;
}

export function ProductionStatusBadge({
  status,
  className,
}: {
  status: ProductionStatus;
  className?: string;
}) {
  const style = PRODUCTION_STYLES[status];
  return (
    <Badge
      variant={style.variant}
      className={cn("gap-1.5", style.className, className)}
      data-ocid={`campaigns.production.${status.toLowerCase()}.badge`}
    >
      {productionLabel(status)}
      {style.live ? <LiveDot /> : null}
    </Badge>
  );
}

import { CampaignStatus, PaymentStatus, ProductionStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock,
  Factory,
  Inbox,
  type LucideIcon,
  MapPin,
  Truck,
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

export function stageIndex(status: CampaignStatus): number {
  return CAMPAIGN_STAGES.findIndex((stage) => stage.key === status);
}

export function statusLabel(status: CampaignStatus): string {
  return CAMPAIGN_STAGES.find((stage) => stage.key === status)?.label ?? status;
}

/** Navy → emerald progression across the five stages. */
const STATUS_STYLES: Record<CampaignStatus, string> = {
  [CampaignStatus.Created]: "border-border bg-muted text-muted-foreground",
  [CampaignStatus.InProduction]: "border-primary/20 bg-primary/10 text-primary",
  [CampaignStatus.InTransit]:
    "border-primary bg-primary text-primary-foreground",
  [CampaignStatus.SortedAtLocalHub]:
    "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand",
  [CampaignStatus.Delivered]:
    "border-emerald-brand bg-emerald-brand text-white",
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: CampaignStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const stage = CAMPAIGN_STAGES.find((s) => s.key === status);
  const Icon = stage?.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", STATUS_STYLES[status], className)}
      data-ocid={`campaigns.status.${status.toLowerCase()}.badge`}
    >
      {showIcon && Icon ? <Icon className="size-3" /> : null}
      {stage?.label ?? status}
    </Badge>
  );
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]:
    "border-primary/40 bg-primary/15 text-primary-foreground",
  [PaymentStatus.Pending]: "border-border bg-muted text-muted-foreground",
  [PaymentStatus.Paid]:
    "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand",
  [PaymentStatus.Waived]: "border-primary/20 bg-primary/10 text-primary",
  [PaymentStatus.Refunded]:
    "border-destructive/30 bg-destructive/10 text-destructive",
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", PAYMENT_STYLES[status], className)}
      data-ocid={`campaigns.payment.${status.toLowerCase()}.badge`}
    >
      {status}
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

const PRODUCTION_STYLES: Record<ProductionStatus, string> = {
  [ProductionStatus.Draft]: "border-border bg-muted text-muted-foreground",
  [ProductionStatus.AwaitingPayment]:
    "border-primary/40 bg-primary/15 text-primary-foreground",
  [ProductionStatus.ReadyToDispatch]:
    "border-primary/20 bg-primary/10 text-primary",
  [ProductionStatus.Processing]:
    "border-primary/30 bg-primary/10 text-primary animate-pulse",
  [ProductionStatus.DocumentUploaded]:
    "border-primary/20 bg-primary/10 text-primary",
  [ProductionStatus.AddressListReady]:
    "border-primary/20 bg-primary/10 text-primary",
  [ProductionStatus.JobCreated]:
    "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand",
  [ProductionStatus.Submitted]:
    "border-emerald-brand bg-emerald-brand text-white",
  [ProductionStatus.Failed]:
    "border-destructive/30 bg-destructive/10 text-destructive",
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
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", PRODUCTION_STYLES[status], className)}
      data-ocid={`campaigns.production.${status.toLowerCase()}.badge`}
    >
      {productionLabel(status)}
    </Badge>
  );
}

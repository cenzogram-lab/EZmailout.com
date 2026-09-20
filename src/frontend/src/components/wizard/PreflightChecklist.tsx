import type { CanvasSide, CanvasState, ReturnAddress } from "@/backend";
import { QrMode } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { getLayoutDims, insetRect } from "@/lib/printSpec";
import { cn } from "@/lib/utils";
import type { CanvasSideKey, WizardAudienceType } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ListChecks,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  MIN_PRINT_DPI,
  type PreflightRaster,
  sideHasContent,
} from "./usePrintDocument";

export type PreflightLevel = "pass" | "warn" | "fail" | "info" | "pending";

export interface PreflightItem {
  id: string;
  label: string;
  detail: string;
  level: PreflightLevel;
}

export interface PreflightInput {
  selectedLayout: string | null;
  productLabel: string | null;
  canvas: CanvasState;
  preflight: PreflightRaster;
  audienceType: WizardAudienceType | null;
  recipientCount: number;
  returnAddress: ReturnAddress | null;
  qrDestinationUrl: string;
}

export interface PreflightReport {
  items: PreflightItem[];
  /** True when a `fail` item blocks the launch. */
  blocked: boolean;
  warnings: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function within(el: Rect, bounds: Rect): boolean {
  return (
    el.x >= bounds.x &&
    el.y >= bounds.y &&
    el.x + el.w <= bounds.x + bounds.w &&
    el.y + el.h <= bounds.y + bounds.h
  );
}

function outOfBoundsIds(side: CanvasSide, bounds: Rect): string[] {
  const ids: string[] = [];
  for (const t of side.textBlocks) {
    if (!within({ x: t.x, y: t.y, w: t.width, h: t.height }, bounds))
      ids.push(t.id);
  }
  for (const l of side.logos) {
    if (!within({ x: l.x, y: l.y, w: l.width, h: l.height }, bounds))
      ids.push(l.id);
  }
  for (const q of side.qrCodes) {
    if (!within({ x: q.x, y: q.y, w: q.size, h: q.size }, bounds))
      ids.push(q.id);
  }
  return ids;
}

function hasDynamicQr(canvas: CanvasState): boolean {
  const sides: CanvasSideKey[] = ["front", "back"];
  return sides.some((key) =>
    canvas[key].qrCodes.some((q) => q.mode === QrMode.DynamicTracking),
  );
}

/** Pure preflight computation so the launch button can gate on `blocked`. */
export function computePreflight(input: PreflightInput): PreflightReport {
  const items: PreflightItem[] = [];

  // 1. Product / format
  if (input.selectedLayout && input.productLabel) {
    items.push({
      id: "product",
      label: "Product and format chosen",
      detail: input.productLabel,
      level: "pass",
    });
  } else {
    items.push({
      id: "product",
      label: "Product and format chosen",
      detail: "Go back to step 1 and pick a format.",
      level: "fail",
    });
  }

  // 2. Print resolution
  const pf = input.preflight;
  if (pf.status === "running" || pf.status === "idle") {
    items.push({
      id: "resolution",
      label: "Print resolution",
      detail: "Rendering the front face at 300 DPI…",
      level: "pending",
    });
  } else if (pf.status === "error") {
    items.push({
      id: "resolution",
      label: "Print resolution",
      detail: pf.error ?? "The design could not be rasterized.",
      level: "fail",
    });
  } else if (pf.images.length === 0) {
    items.push({
      id: "resolution",
      label: "Print resolution",
      detail: "No raster background; vector text and QR codes print crisp.",
      level: "pass",
    });
  } else {
    const unreadable = pf.images.filter((i) => i.effectiveDpi === null);
    const min = pf.minEffectiveDpi;
    if (unreadable.length > 0 && min === null) {
      items.push({
        id: "resolution",
        label: "Print resolution",
        detail:
          "A background image could not be inspected. Re-upload it to be safe.",
        level: "warn",
      });
    } else if (min !== null && min < MIN_PRINT_DPI) {
      items.push({
        id: "resolution",
        label: "Print resolution",
        detail: `Lowest background is ${Math.round(min)} DPI at print size; ${MIN_PRINT_DPI} DPI or more is recommended. It may look soft.`,
        level: "warn",
      });
    } else {
      items.push({
        id: "resolution",
        label: "Print resolution",
        detail: `Backgrounds measure ${Math.round(min ?? 0)} DPI or better at print size.`,
        level: "pass",
      });
    }
  }

  // 3. Safe-area boundary check
  if (input.selectedLayout) {
    const dims = getLayoutDims(input.selectedLayout);
    const safe = insetRect(dims, dims.safeInsetPct);
    const offenders = [
      ...outOfBoundsIds(input.canvas.front, safe).map((id) => `front:${id}`),
      ...outOfBoundsIds(input.canvas.back, safe).map((id) => `back:${id}`),
    ];
    items.push(
      offenders.length === 0
        ? {
            id: "bounds",
            label: "Elements inside the safe area",
            detail: "Nothing crosses the trim-safe margin.",
            level: "pass",
          }
        : {
            id: "bounds",
            label: "Elements inside the safe area",
            detail: `Outside the safe margin and may be trimmed: ${offenders.join(", ")}.`,
            level: "warn",
          },
    );
  }

  // 4. Back side
  items.push(
    sideHasContent(input.canvas.back)
      ? {
          id: "back",
          label: "Back side",
          detail: "Back side has content and will be printed.",
          level: "pass",
        }
      : {
          id: "back",
          label: "Back side",
          detail: "Back left blank; only the front face is printed.",
          level: "info",
        },
  );

  // 5. Recipients
  if (input.recipientCount > 0) {
    items.push({
      id: "recipients",
      label: "Recipients",
      detail:
        input.audienceType === "map"
          ? `${formatNumber(input.recipientCount)} households (EDDM saturation estimate; Click2Mail binds the carrier-route list at production).`
          : `${formatNumber(input.recipientCount)} verified recipients.`,
      level: "pass",
    });
  } else {
    items.push({
      id: "recipients",
      label: "Recipients",
      detail: "No audience selected. Go back to step 2.",
      level: "fail",
    });
  }

  // 6. Return address
  items.push(
    input.returnAddress
      ? {
          id: "return",
          label: "Return address",
          detail: `${input.returnAddress.name}, ${input.returnAddress.city}, ${input.returnAddress.state} ${input.returnAddress.zip_code}`,
          level: "pass",
        }
      : {
          id: "return",
          label: "Return address",
          detail: "Add and save a return address below.",
          level: "fail",
        },
  );

  // 7. Dynamic QR destination
  if (hasDynamicQr(input.canvas)) {
    items.push(
      input.qrDestinationUrl.trim()
        ? {
            id: "qr",
            label: "Dynamic QR destination",
            detail: `Scans redirect to ${input.qrDestinationUrl.trim()}.`,
            level: "pass",
          }
        : {
            id: "qr",
            label: "Dynamic QR destination",
            detail:
              "A tracking QR code is on the design but no destination URL is set. Go back to the designer.",
            level: "fail",
          },
    );
  }

  return {
    items,
    blocked: items.some((i) => i.level === "fail" || i.level === "pending"),
    warnings: items.filter((i) => i.level === "warn").length,
  };
}

const LEVEL_STYLES: Record<
  PreflightLevel,
  { icon: React.ReactNode; className: string }
> = {
  pass: {
    icon: <CheckCircle2 className="size-4 text-emerald-brand" />,
    className: "border-emerald-brand/20",
  },
  warn: {
    icon: <AlertTriangle className="size-4 text-accent" />,
    className: "border-accent/40 bg-accent/5",
  },
  fail: {
    icon: <XCircle className="size-4 text-destructive" />,
    className: "border-destructive/40 bg-destructive/5",
  },
  info: {
    icon: <Info className="size-4 text-primary" />,
    className: "border-border",
  },
  pending: {
    icon: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
    className: "border-border",
  },
};

/** Renders a computed preflight report. */
export function PreflightChecklist({ report }: { report: PreflightReport }) {
  return (
    <Card className="bg-card" data-ocid="review.preflight.card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" /> Preflight checklist
          </span>
          {report.blocked ? (
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-destructive"
            >
              Needs attention
            </Badge>
          ) : report.warnings > 0 ? (
            <Badge
              variant="outline"
              className="border-accent/40 bg-accent/10 text-accent"
            >
              {report.warnings} warning{report.warnings === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
            >
              Ready to print
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {report.items.map((item) => {
            const style = LEVEL_STYLES[item.level];
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3 py-2.5",
                  style.className,
                )}
                data-ocid={`review.preflight.item.${item.id}`}
              >
                <span className="mt-0.5 shrink-0">{style.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

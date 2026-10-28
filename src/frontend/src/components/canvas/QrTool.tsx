import { QrMode } from "@/backend";
import { ColorPicker } from "@/components/canvas/ColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { BRAND, DYNAMIC_QR_PLACEHOLDER } from "@/lib/brand";
import { freeSafeRect } from "@/lib/printSpec";
import {
  normalizeDestinationUrl,
  normalizeRedirectUrl,
  qrSvgString,
} from "@/lib/qr";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  CalendarDays,
  Link2,
  Phone,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const EXAMPLES = [
  {
    icon: Link2,
    label: "Landing page",
    value: "https://yourbusiness.com/spring-offer",
  },
  {
    icon: CalendarDays,
    label: "Booking link",
    value: "https://calendly.com/yourbusiness/consult",
  },
  { icon: Phone, label: "Phone call", value: "tel:+15125550142" },
  {
    icon: UtensilsCrossed,
    label: "Menu",
    value: "https://yourbusiness.com/menu",
  },
];

/** A tracking-mode choice card; the chosen one gets the indigo tint. */
const MODE_CARD =
  "rounded-2xl border border-hairline-strong bg-card-raised p-3 text-left text-xs transition-smooth hover:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80";
const MODE_ON =
  "border-primary/60 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(var(--primary)/0.35)] hover:border-primary/60";

/** Dynamic link + QR code creator: destination, tracking mode, colours, size, live vector preview. */
export function QrTool() {
  const qrDestinationUrl = useWizardStore((s) => s.qrDestinationUrl);
  const setQrDestinationUrl = useWizardStore((s) => s.setQrDestinationUrl);
  const activeSide = useWizardStore((s) => s.activeSide);
  const dims = useCanvasDims();
  const addQrCode = useWizardStore((s) => s.addQrCode);
  const [mode, setMode] = useState<QrMode>(QrMode.DynamicTracking);
  const [size, setSize] = useState(110);
  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [svg, setSvg] = useState<string | null>(null);

  const normalized = normalizeDestinationUrl(qrDestinationUrl);
  // A tracked code redirects through ezmailout.com, which only forwards to
  // web addresses; a static code can encode tel:, mailto: and sms: directly.
  const redirectOk = normalizeRedirectUrl(qrDestinationUrl) !== null;
  const destinationInvalid =
    !!qrDestinationUrl.trim() &&
    (mode === QrMode.DynamicTracking ? !redirectOk : !normalized);
  const encoded = useMemo(
    () =>
      mode === QrMode.DynamicTracking
        ? `${BRAND.trackingBase}cmp_1_0`
        : (normalized ?? BRAND.domain),
    [mode, normalized],
  );

  useEffect(() => {
    let cancelled = false;
    qrSvgString(encoded, { foreground: fg, background: bg })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [encoded, fg, bg]);

  const svgUrl = svg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    : null;

  function add(target: "front" | "back") {
    if (mode === QrMode.StaticUrl && !normalized) {
      toast.error("Enter a valid destination URL first");
      return;
    }
    addQrCode(target, {
      mode,
      url:
        mode === QrMode.DynamicTracking
          ? DYNAMIC_QR_PLACEHOLDER
          : (normalized ?? ""),
      foreground: fg,
      background: bg,
      // The lower-right of the free area: on an address side, beside the
      // USPS zone rather than in it (the preflight requires it clear), and
      // never larger than that area, so it always lands on the sheet.
      ...(() => {
        const safe = freeSafeRect(dims, target);
        const fit = Math.max(
          40,
          Math.min(size, Math.floor(Math.min(safe.w, safe.h))),
        );
        return {
          size: fit,
          x: safe.x + Math.max(0, safe.w - fit - Math.round(safe.w * 0.1)),
          y: safe.y + Math.max(0, safe.h - fit - Math.round(safe.h * 0.1)),
        };
      })(),
    });
    toast.success(`QR code added to the ${target} side`);
  }

  // Laid out by the panel's own width (container queries), not the screen's:
  // on desktop it sits in the studio's narrow drawer, where screen breakpoints
  // gave it two columns and squeezed the mode cards to ~70 px.
  return (
    <div className="@container space-y-4" data-ocid="canvas.qr_tool">
      <div className="grid gap-4 @xl:grid-cols-[minmax(0,1fr)_170px]">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="qr-destination" className="text-sm font-medium">
              Destination URL
            </Label>
            <Input
              id="qr-destination"
              value={qrDestinationUrl}
              onChange={(e) => setQrDestinationUrl(e.target.value)}
              placeholder="https://yourbusiness.com/offer, a calendar link, tel:+1…, or your menu"
              className={cn(destinationInvalid && "border-destructive")}
              aria-invalid={destinationInvalid}
              data-ocid="canvas.qr.destination_input"
            />
            {mode === QrMode.DynamicTracking &&
            qrDestinationUrl.trim() &&
            !redirectOk ? (
              <p
                className="text-xs text-destructive"
                data-ocid="canvas.qr.destination_error"
              >
                Tracked codes forward to web addresses only (https://…). For a
                phone number or email, choose Static URL.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setQrDestinationUrl(ex.value)}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full border border-hairline-strong bg-card-raised px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
                  data-ocid={`canvas.qr.example.${ex.label.toLowerCase().replace(/\s+/g, "_")}`}
                >
                  <ex.icon className="size-3" /> {ex.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 @md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode(QrMode.DynamicTracking)}
              aria-pressed={mode === QrMode.DynamicTracking}
              className={cn(
                MODE_CARD,
                mode === QrMode.DynamicTracking && MODE_ON,
              )}
              data-ocid="canvas.qr.mode.dynamic"
            >
              <span className="font-semibold text-foreground">
                Dynamic tracking (recommended)
              </span>
              <p className="mt-1 text-muted-foreground">
                Every recipient gets a personal{" "}
                <span className="font-mono">ezmailout.com/t/…</span> code. Scans
                are logged per recipient, then redirected to your destination —
                change it any time.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode(QrMode.StaticUrl)}
              aria-pressed={mode === QrMode.StaticUrl}
              className={cn(MODE_CARD, mode === QrMode.StaticUrl && MODE_ON)}
              data-ocid="canvas.qr.mode.static"
            >
              <span className="font-semibold text-foreground">Static URL</span>
              <p className="mt-1 text-muted-foreground">
                The QR encodes your destination directly. No scan analytics.
              </p>
            </button>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Size · {size}px
              </Label>
              <Slider
                min={40}
                max={400}
                step={1}
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                data-ocid="canvas.qr.size_slider"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ink
              </Label>
              <ColorPicker
                value={fg}
                onChange={setFg}
                label="QR foreground"
                ocid="canvas.qr.fg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Paper
              </Label>
              <ColorPicker
                value={bg}
                onChange={setBg}
                label="QR background"
                ocid="canvas.qr.bg"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => add("front")}
              className="gap-1.5"
              data-ocid="canvas.qr.add_front"
            >
              <QrCode className="size-4" /> Add to front
            </Button>
            <Button
              variant="outline"
              onClick={() => add("back")}
              className="gap-1.5"
              data-ocid="canvas.qr.add_back"
            >
              <QrCode className="size-4" /> Add to back
            </Button>
            <span className="self-center text-[11px] text-muted-foreground">
              Editing side: {activeSide}. Drag and resize the code anywhere on
              the card.
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {/* The code's own colours are print data; the frame follows the theme. */}
          <div
            className="rounded-2xl border border-hairline bg-card-raised p-2.5 shadow-surface"
            data-ocid="canvas.qr.preview"
          >
            {svgUrl ? (
              <img
                src={svgUrl}
                alt="QR preview"
                className="size-[140px] rounded-lg"
              />
            ) : (
              <div className="size-[140px] rounded-lg bg-well motion-safe:animate-pulse" />
            )}
          </div>
          <span
            className="max-w-[170px] truncate font-mono text-[10px] tracking-wider text-muted-foreground"
            title={encoded}
          >
            {encoded}
          </span>
          <span className="text-center text-[10px] text-muted-foreground">
            Vector-sharp at any print size
          </span>
        </div>
      </div>
    </div>
  );
}

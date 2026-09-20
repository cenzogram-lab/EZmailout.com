import { QrMode } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BRAND, DYNAMIC_QR_PLACEHOLDER } from "@/lib/brand";
import { getLayoutDims } from "@/lib/printSpec";
import { normalizeDestinationUrl, qrSvgString } from "@/lib/qr";
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

/** Dynamic link + QR code creator: destination, tracking mode, colours, size, live vector preview. */
export function QrTool() {
  const qrDestinationUrl = useWizardStore((s) => s.qrDestinationUrl);
  const setQrDestinationUrl = useWizardStore((s) => s.setQrDestinationUrl);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const addQrCode = useWizardStore((s) => s.addQrCode);
  const [mode, setMode] = useState<QrMode>(QrMode.DynamicTracking);
  const [size, setSize] = useState(110);
  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [svg, setSvg] = useState<string | null>(null);

  const normalized = normalizeDestinationUrl(qrDestinationUrl);
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
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    addQrCode(target, {
      mode,
      url:
        mode === QrMode.DynamicTracking
          ? DYNAMIC_QR_PLACEHOLDER
          : (normalized ?? ""),
      size,
      foreground: fg,
      background: bg,
      x: Math.max(
        20,
        dims.designWidth - size - Math.round(dims.designWidth * 0.14),
      ),
      y: Math.max(
        20,
        dims.designHeight - size - Math.round(dims.designHeight * 0.14),
      ),
    });
    toast.success(`QR code added to the ${target} side`);
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]"
      data-ocid="canvas.qr_tool"
    >
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
            className={cn(
              qrDestinationUrl && !normalized && "border-destructive",
            )}
            data-ocid="canvas.qr.destination_input"
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setQrDestinationUrl(ex.value)}
                className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:border-accent hover:text-foreground"
                data-ocid={`canvas.qr.example.${ex.label.toLowerCase().replace(/\s+/g, "_")}`}
              >
                <ex.icon className="size-3" /> {ex.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode(QrMode.DynamicTracking)}
            className={cn(
              "rounded-lg border p-3 text-left text-xs transition-smooth",
              mode === QrMode.DynamicTracking
                ? "border-accent bg-accent/10"
                : "hover:border-accent/50",
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
            className={cn(
              "rounded-lg border p-3 text-left text-xs transition-smooth",
              mode === QrMode.StaticUrl
                ? "border-accent bg-accent/10"
                : "hover:border-accent/50",
            )}
            data-ocid="canvas.qr.mode.static"
          >
            <span className="font-semibold text-foreground">Static URL</span>
            <p className="mt-1 text-muted-foreground">
              The QR encodes your destination directly. No scan analytics.
            </p>
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
          <div className="space-y-1 text-center">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Ink
            </Label>
            <input
              type="color"
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              className="block size-9 cursor-pointer rounded border bg-transparent"
              aria-label="QR foreground"
              data-ocid="canvas.qr.fg"
            />
          </div>
          <div className="space-y-1 text-center">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Paper
            </Label>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="block size-9 cursor-pointer rounded border bg-transparent"
              aria-label="QR background"
              data-ocid="canvas.qr.bg"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => add("front")}
            className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
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
            Editing side: {activeSide}. Drag and resize the code anywhere on the
            card.
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div
          className="rounded-lg border bg-white p-2 shadow-sm"
          data-ocid="canvas.qr.preview"
        >
          {svgUrl ? (
            <img src={svgUrl} alt="QR preview" className="size-[140px]" />
          ) : (
            <div className="size-[140px] animate-pulse rounded bg-muted" />
          )}
        </div>
        <span
          className="max-w-[170px] truncate font-mono text-[10px] text-muted-foreground"
          title={encoded}
        >
          {encoded}
        </span>
        <span className="text-center text-[10px] text-muted-foreground">
          Vector-sharp at any print size
        </span>
      </div>
    </div>
  );
}

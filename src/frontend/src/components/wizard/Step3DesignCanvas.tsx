import { AiCopywriterDrawer } from "@/components/canvas/AiCopywriterDrawer";
import { AiStudioPanel } from "@/components/canvas/AiStudioPanel";
import { CanvasEditor, sortedElements } from "@/components/canvas/CanvasEditor";
import { CanvasPreview3D } from "@/components/canvas/CanvasPreview3D";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { ElementInspector } from "@/components/canvas/ElementInspector";
import { LayersPanel } from "@/components/canvas/LayersPanel";
import { QrTool } from "@/components/canvas/QrTool";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { layoutLabel } from "@/lib/format";
import { getLayoutDims, insetRect } from "@/lib/printSpec";
import { checkImageResolution } from "@/lib/rasterize";
import { useWizardStore } from "@/store/wizard";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  QrCode,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function useResolutionWarning(url: string | undefined, layoutVariant: string) {
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setWarning(null);
      return;
    }
    checkImageResolution(url, getLayoutDims(layoutVariant)).then((r) => {
      if (cancelled) return;
      if (r && !r.ok)
        setWarning(
          `Background is ${r.width}×${r.height}px (~${r.effectiveDpi} DPI). Use ≥ 150 DPI for crisp print.`,
        );
      else setWarning(null);
    });
    return () => {
      cancelled = true;
    };
  }, [url, layoutVariant]);
  return warning;
}

/**
 * Step 3 — side-by-side design studio: 2D editor with tools on the left,
 * live 3D proof on the right (desktop), stacked on smaller screens.
 */
export function Step3DesignCanvas() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const setStep = useWizardStore((s) => s.setStep);
  const [copywriterOpen, setCopywriterOpen] = useState(false);
  const [tab, setTab] = useState("upload");
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = getLayoutDims(layoutVariant);
  const side = activeSide === "front" ? canvas.front : canvas.back;
  const resolutionWarning = useResolutionWarning(
    side.backgroundImageUrl,
    layoutVariant,
  );

  const outsideSafe = useMemo(() => {
    const safe = insetRect(dims, dims.safeInsetPct);
    const offenders: string[] = [];
    for (const key of ["front", "back"] as const) {
      for (const el of sortedElements(canvas[key])) {
        const w = el.kind === "qr" ? el.data.size : el.data.width;
        const h = el.kind === "qr" ? el.data.size : el.data.height;
        if (
          el.data.x < safe.x ||
          el.data.y < safe.y ||
          el.data.x + w > safe.x + safe.w ||
          el.data.y + h > safe.y + safe.h
        ) {
          offenders.push(`${key}: ${el.kind}`);
        }
      }
    }
    return offenders;
  }, [canvas, dims]);

  return (
    <div className="space-y-4" data-ocid="canvas.step3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Design your mail piece
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedProduct?.productType ?? "Postcard"} ·{" "}
            {layoutLabel(layoutVariant)} · {dims.widthInches}″ ×{" "}
            {dims.heightInches}″ · exported at 300 DPI for Click2Mail
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resolutionWarning ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-accent-foreground"
              data-ocid="canvas.warning.resolution"
            >
              <AlertTriangle className="size-3.5 text-accent" />{" "}
              {resolutionWarning}
            </span>
          ) : null}
          {outsideSafe.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-destructive"
              data-ocid="canvas.warning.boundary"
            >
              <AlertTriangle className="size-3.5" /> {outsideSafe.length}{" "}
              element{outsideSafe.length > 1 ? "s" : ""} outside the safe zone
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-brand/40 bg-emerald-brand/10 px-2.5 py-1 text-emerald-brand"
              data-ocid="canvas.ok.boundary"
            >
              <CheckCircle2 className="size-3.5" /> All elements inside the safe
              zone
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <CanvasToolbar onOpenCopywriter={() => setCopywriterOpen(true)} />
          <CanvasEditor maxHeight={560} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start">
                <TabsTrigger
                  value="upload"
                  className="gap-1.5"
                  data-ocid="canvas.tab.upload"
                >
                  <Upload className="size-3.5" /> Upload
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="gap-1.5"
                  data-ocid="canvas.tab.ai"
                >
                  <Sparkles className="size-3.5 text-accent" /> AI Studio
                </TabsTrigger>
                <TabsTrigger
                  value="qr"
                  className="gap-1.5"
                  data-ocid="canvas.tab.qr"
                >
                  <QrCode className="size-3.5" /> QR &amp; Links
                </TabsTrigger>
                <TabsTrigger
                  value="layers"
                  className="gap-1.5"
                  data-ocid="canvas.tab.layers"
                >
                  <Layers className="size-3.5" /> Layers
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="upload"
                className="rounded-xl border p-4 text-sm text-muted-foreground"
              >
                <p className="mb-2 font-medium text-foreground">
                  Bring your own artwork
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Use the <strong>Background</strong> button for full-bleed
                    photos (≥ {Math.round(dims.widthInches * 150)}×
                    {Math.round(dims.heightInches * 150)} px recommended,{" "}
                    {Math.round(dims.widthInches * 300)}×
                    {Math.round(dims.heightInches * 300)} px for 300 DPI).
                  </li>
                  <li>
                    <strong>Logo</strong> adds transparent PNG/SVG layers you
                    can drag and resize; keep brand marks inside the emerald
                    safe zone.
                  </li>
                  <li>
                    Artwork should extend to the red bleed line; the orange cut
                    line is where the press trims.
                  </li>
                  <li>
                    The back side of postcards keeps the USPS address &amp; IMb
                    zone clear automatically.
                  </li>
                </ul>
              </TabsContent>
              <TabsContent value="ai" className="rounded-xl border p-4">
                <AiStudioPanel />
              </TabsContent>
              <TabsContent value="qr" className="rounded-xl border p-4">
                <QrTool />
              </TabsContent>
              <TabsContent value="layers" className="rounded-xl border p-4">
                <LayersPanel />
              </TabsContent>
            </Tabs>
            <div className="rounded-xl border p-4">
              <ElementInspector />
            </div>
          </div>
        </div>
        <CanvasPreview3D className="lg:sticky lg:top-24 lg:self-start" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => setStep(2)}
          className="gap-2"
          data-ocid="canvas.back_button"
        >
          <ArrowLeft className="size-4" /> Audience
        </Button>
        <Button
          onClick={() => setStep(4)}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          data-ocid="canvas.continue_button"
        >
          Continue to review <ArrowRight className="size-4" />
        </Button>
      </div>
      <AiCopywriterDrawer
        open={copywriterOpen}
        onOpenChange={setCopywriterOpen}
      />
    </div>
  );
}

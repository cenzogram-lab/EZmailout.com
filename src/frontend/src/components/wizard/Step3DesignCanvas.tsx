import { AiCopywriterDrawer } from "@/components/canvas/AiCopywriterDrawer";
import { AiStudioPanel } from "@/components/canvas/AiStudioPanel";
import { BrandPanel } from "@/components/canvas/BrandPanel";
import { CanvasEditor, sortedElements } from "@/components/canvas/CanvasEditor";
import { CanvasPreview3D } from "@/components/canvas/CanvasPreview3D";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { ElementInspector } from "@/components/canvas/ElementInspector";
import { ElementsPanel } from "@/components/canvas/ElementsPanel";
import { LayersPanel } from "@/components/canvas/LayersPanel";
import { QrTool } from "@/components/canvas/QrTool";
import { StudioRail } from "@/components/canvas/StudioRail";
import { TemplatesPanel } from "@/components/canvas/TemplatesPanel";
import { TextPanel } from "@/components/canvas/TextPanel";
import { UploadsPanel } from "@/components/canvas/UploadsPanel";
import { StampyStep3Studio, StampyTip } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { layoutLabel } from "@/lib/format";
import { getLayoutDims, safeRect } from "@/lib/printSpec";
import { checkImageResolution } from "@/lib/rasterize";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { StudioTool } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PanelLeftClose,
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
 * Step 3 — Canva-style design studio: tool rail + tool panel on the left,
 * the 2D editor in the middle (contextual toolbar above, inspector below) and
 * the live 3D proof pinned on the right at `lg+`; everything stacks below.
 */
export function Step3DesignCanvas() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const setStep = useWizardStore((s) => s.setStep);
  const [copywriterOpen, setCopywriterOpen] = useState(false);
  const [tool, setTool] = useState<StudioTool>("templates");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = getLayoutDims(layoutVariant);
  const side = activeSide === "front" ? canvas.front : canvas.back;
  const resolutionWarning = useResolutionWarning(
    side.backgroundImageUrl,
    layoutVariant,
  );

  const outsideSafe = useMemo(() => {
    const safe = safeRect(dims);
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

  const panel = (() => {
    switch (tool) {
      case "templates":
        return <TemplatesPanel />;
      case "elements":
        return <ElementsPanel />;
      case "text":
        return <TextPanel onOpenCopywriter={() => setCopywriterOpen(true)} />;
      case "uploads":
        return <UploadsPanel />;
      case "brand":
        return <BrandPanel />;
      case "ai":
        return <AiStudioPanel />;
      case "qr":
        return <QrTool />;
      case "layers":
        return <LayersPanel />;
      default:
        return null;
    }
  })();

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
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary"
              data-ocid="canvas.warning.resolution"
            >
              <AlertTriangle className="size-3.5" /> {resolutionWarning}
            </span>
          ) : null}
          {outsideSafe.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-destructive"
              data-ocid="canvas.warning.boundary"
            >
              <AlertTriangle className="size-3.5" /> {outsideSafe.length}{" "}
              element{outsideSafe.length > 1 ? "s" : ""} outside the ¼″ safe
              zone
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-brand/40 bg-emerald-brand/10 px-2.5 py-1 text-emerald-brand"
              data-ocid="canvas.ok.boundary"
            >
              <CheckCircle2 className="size-3.5" /> All elements inside the ¼″
              safe zone
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          className={cn(
            "flex flex-col gap-3 lg:sticky lg:top-24 lg:flex-row lg:items-start",
            drawerOpen ? "lg:w-[380px]" : "lg:w-[76px]",
          )}
        >
          <StudioRail
            active={tool}
            drawerOpen={drawerOpen}
            onSelect={(next) => {
              if (next === tool && drawerOpen) {
                setDrawerOpen(false);
                return;
              }
              setTool(next);
              setDrawerOpen(true);
            }}
          />
          {drawerOpen ? (
            <div
              className="relative min-w-0 flex-1 rounded-2xl border border-[#e5e7eb] bg-card p-4 shadow-xs lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
              data-ocid={`canvas.drawer.${tool}`}
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-2 top-2 hidden size-7 items-center justify-center rounded-lg text-[#575859] transition-smooth hover:bg-muted hover:text-foreground lg:flex"
                title="Collapse panel"
                aria-label="Collapse panel"
                data-ocid="canvas.panel.collapse"
              >
                <PanelLeftClose className="size-4" />
              </button>
              {panel}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <StampyTip id="step3" mascot={StampyStep3Studio} compact>
            Keep all essential copy and logos inside the green safe line! Need
            fresh copy or visuals? Tap AI Studio in the rail to generate
            print-ready assets.
          </StampyTip>
          <CanvasToolbar />
          <CanvasEditor maxHeight={540} />
          <div
            className="rounded-2xl border bg-card p-4 shadow-xs"
            data-ocid="canvas.inspector"
          >
            <ElementInspector key={selectedElementId ?? "none"} />
          </div>
        </div>

        <CanvasPreview3D className="lg:sticky lg:top-24 lg:w-[340px] lg:shrink-0" />
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
          className="gap-2"
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

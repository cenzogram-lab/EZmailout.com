import { AiCopywriterDrawer } from "@/components/canvas/AiCopywriterDrawer";
import { AiStudioPanel } from "@/components/canvas/AiStudioPanel";
import { BrandPanel } from "@/components/canvas/BrandPanel";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { CanvasPreview3D } from "@/components/canvas/CanvasPreview3D";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { ElementInspector } from "@/components/canvas/ElementInspector";
import { ElementsPanel } from "@/components/canvas/ElementsPanel";
import { LayersPanel } from "@/components/canvas/LayersPanel";
import { OrientationNotice } from "@/components/canvas/OrientationNotice";
import { QrTool } from "@/components/canvas/QrTool";
import { StudioRail } from "@/components/canvas/StudioRail";
import { TemplatesPanel } from "@/components/canvas/TemplatesPanel";
import { TextPanel } from "@/components/canvas/TextPanel";
import { UploadsPanel } from "@/components/canvas/UploadsPanel";
import { FadingScroll } from "@/components/canvas/popoverBounds";
import { StampyStep3Studio, StampyTip } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { layoutLabel } from "@/lib/format";
import { type LayoutDims, safeRect } from "@/lib/printSpec";
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
import { outOfBoundsIds } from "./PreflightChecklist";

function useResolutionWarning(url: string | undefined, dims: LayoutDims) {
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setWarning(null);
      return;
    }
    checkImageResolution(url, dims).then((r) => {
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
  }, [url, dims]);
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
  // Below lg the drawer stacks above the artboard, so an open drawer pushes
  // the design out of sight: start collapsed there; a rail tab opens it.
  const [drawerOpen, setDrawerOpen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = useCanvasDims();
  const side = activeSide === "front" ? canvas.front : canvas.back;
  const resolutionWarning = useResolutionWarning(side.backgroundImageUrl, dims);

  // The same rule as Step 4's preflight (ink, not padded boxes; template
  // art that bleeds on purpose is exempt), so the two never disagree.
  const outsideSafe = useMemo(() => {
    const safe = safeRect(dims);
    return (["front", "back"] as const).flatMap((key) =>
      outOfBoundsIds(canvas[key], safe).map((id) => `${key}: ${id}`),
    );
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
          <h2 className="display-heading text-2xl sm:text-3xl">
            Design your mail piece
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedProduct?.productType ?? "Postcard"} ·{" "}
            {layoutLabel(layoutVariant)} · {dims.widthInches}″ ×{" "}
            {dims.heightInches}″ · exported at 300 DPI for print
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resolutionWarning ? (
            <span
              className="status-pill status-pill-amber whitespace-normal py-1"
              data-ocid="canvas.warning.resolution"
            >
              <AlertTriangle className="size-3.5" /> {resolutionWarning}
            </span>
          ) : null}
          {outsideSafe.length > 0 ? (
            <span
              className="status-pill status-pill-red whitespace-normal py-1"
              data-ocid="canvas.warning.boundary"
            >
              <AlertTriangle className="size-3.5" /> {outsideSafe.length}{" "}
              element{outsideSafe.length > 1 ? "s" : ""} outside the ¼″ safe
              zone
            </span>
          ) : (
            <span
              className="status-pill status-pill-emerald whitespace-normal py-1"
              data-ocid="canvas.ok.boundary"
            >
              <CheckCircle2 className="size-3.5" /> All elements inside the ¼″
              safe zone
            </span>
          )}
        </div>
      </div>

      {/* Rail + drawer | editor | 3D proof. The proof is a third column only
          from 1400 px, where the editor keeps ≥ 550 px: at 1024 px the rail,
          drawer and a 340 px proof left the editor ~160 px wide (398 px at
          1280), so below 1400 px the row wraps and the proof sits full width
          under the editor. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start min-[1400px]:flex-nowrap">
        <div
          className={cn(
            // Pinned only while the proof is a side column: when the row wraps
            // (lg–1399 px) a pinned drawer slid over the full-width proof.
            "flex flex-col gap-3 lg:flex-row lg:items-start min-[1400px]:sticky min-[1400px]:top-24",
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
            // The frame keeps the rounded card; the scroller inside it fades
            // its bottom edge while more of the panel is below (as the colour
            // and font popovers do), so a tall panel cut by the frame from
            // lg up reads as "more below" rather than as clipped tiles.
            <div
              className="relative min-w-0 flex-1 rounded-3xl border border-hairline-strong bg-card-raised shadow-surface lg:flex lg:max-h-[calc(100vh-8rem)] lg:flex-col"
              data-ocid={`canvas.drawer.${tool}`}
            >
              <FadingScroll className="relative rounded-[calc(1.5rem-1px)] p-4 overscroll-auto max-lg:overflow-visible lg:min-h-0 lg:flex-1">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="absolute right-2.5 top-2.5 hidden size-8 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 lg:flex"
                  title="Collapse panel"
                  aria-label="Collapse panel"
                  data-ocid="canvas.panel.collapse"
                >
                  <PanelLeftClose className="size-4" />
                </button>
                {/* The drawer is the raised step on the wizard card, so its tiles
                  (bg-card-raised) step up once more: white in light, a lighter
                  graphite in dark. */}
                <div className="[--card-raised:var(--card)] dark:[--card-raised:var(--muted)]">
                  {panel}
                </div>
              </FadingScroll>
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
          <OrientationNotice />
          <CanvasEditor maxHeight={540} />
          {/* A size container: the inspector's number rows choose their
              columns by its width, not the screen's. */}
          <div
            className="@container rounded-3xl border border-hairline-strong bg-card-raised p-4 shadow-surface"
            data-ocid="canvas.inspector"
          >
            <ElementInspector key={selectedElementId ?? "none"} />
          </div>
        </div>

        <CanvasPreview3D className="lg:basis-full min-[1400px]:sticky min-[1400px]:top-24 min-[1400px]:w-[340px] min-[1400px]:shrink-0 min-[1400px]:basis-auto" />
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

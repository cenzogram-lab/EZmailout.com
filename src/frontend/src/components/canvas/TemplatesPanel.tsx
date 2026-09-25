import { Button } from "@/components/ui/button";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { LAYOUT_PRESETS } from "@/lib/layouts";
import { templatesForLayout } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { toast } from "sonner";

/** Templates & layouts tool: gallery designs for this format plus text layouts. */
export function TemplatesPanel() {
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const designTemplate = useWizardStore((s) => s.designTemplate);
  const activeSide = useWizardStore((s) => s.activeSide);
  const setDesignTemplate = useWizardStore((s) => s.setDesignTemplate);
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = useCanvasDims();
  const templates = templatesForLayout(
    layoutVariant,
    selectedProduct?.productType ?? null,
  );

  function applyLayout(id: string) {
    const preset = LAYOUT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    for (const block of preset.blocks(dims)) addTextBlock(activeSide, block);
    toast.success(`${preset.name} layout added to the ${activeSide} side`);
  }

  return (
    <div className="space-y-4" data-ocid="canvas.panel.templates">
      <div>
        <p className="font-display text-sm font-semibold">Templates</p>
        <p className="text-xs text-muted-foreground">
          Designs sized for this format. Applying one replaces the front side.
        </p>
      </div>
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
          <LayoutTemplate className="size-5" />
          No gallery template for this format yet — start from a layout below.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => {
            const active = designTemplate?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setDesignTemplate(t);
                  toast.success(`Applied “${t.name}”`);
                }}
                className={cn(
                  "group overflow-hidden rounded-xl border text-left transition-smooth hover:border-primary/50",
                  active && "border-primary ring-2 ring-primary/20",
                )}
                data-ocid={`canvas.template.${t.id}`}
              >
                <div
                  className="relative flex h-20 items-center justify-center px-2 text-center"
                  style={{ background: t.gradient }}
                >
                  <span
                    className="font-display text-[11px] font-bold leading-tight"
                    style={{ color: t.textBlocks[0]?.color ?? "#fff" }}
                  >
                    {t.textBlocks[0]?.text}
                  </span>
                  <span
                    className="absolute right-1 top-1 rounded px-1 text-[8px] font-bold uppercase text-white"
                    style={{ backgroundColor: t.accentColor }}
                  >
                    {t.overlayText}
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {t.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.industry}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="space-y-2 border-t pt-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Layouts
        </p>
        {LAYOUT_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            className="h-auto w-full items-start justify-start gap-2 whitespace-normal rounded-xl px-3 py-2 text-left"
            onClick={() => applyLayout(preset.id)}
            data-ocid={`canvas.layout.${preset.id}`}
          >
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              <span className="block text-sm font-medium">{preset.name}</span>
              <span className="block text-[11px] font-normal text-muted-foreground">
                {preset.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

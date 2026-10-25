import {
  LazyMailSide,
  useMailLibrary,
} from "@/components/templates/MailTemplatePreview";
import { LazyTemplateSide } from "@/components/templates/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { LAYOUT_PRESETS } from "@/lib/layouts";
import type { Orientation } from "@/lib/printSpec";
import { loadTemplateFonts, templatesForLayout } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { LayoutTemplate, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** Templates & layouts tool: every gallery design, laid out for this format. */
export function TemplatesPanel() {
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const designTemplate = useWizardStore((s) => s.designTemplate);
  const mailTemplate = useWizardStore((s) => s.mailTemplate);
  const applyMailTemplate = useWizardStore((s) => s.applyMailTemplate);
  const lib = useMailLibrary();
  const activeSide = useWizardStore((s) => s.activeSide);
  const setDesignTemplate = useWizardStore((s) => s.setDesignTemplate);
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = useCanvasDims();
  const orientation: Orientation = dims.rotated ? "rotated" : "native";
  const [query, setQuery] = useState("");
  const templates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templatesForLayout(
      layoutVariant,
      selectedProduct?.productType ?? null,
    ).filter(
      (t) =>
        !q ||
        q
          .split(/\s+/)
          .every((w) =>
            [t.name, t.theme, t.style, t.copy.headline, ...t.colors]
              .join(" ")
              .toLowerCase()
              .includes(w),
          ),
    );
  }, [layoutVariant, selectedProduct, query]);
  const aspect = dims.designWidth / dims.designHeight;
  // Library templates designed for exactly this product come first.
  const madeForThis = useMemo(() => {
    if (!lib) return [];
    const q = query.trim().toLowerCase();
    return lib.MAIL_GALLERY.filter(
      (e) =>
        e.layoutVariant === layoutVariant &&
        (!q || q.split(/\s+/).every((w) => e.search.includes(w))),
    );
  }, [lib, layoutVariant, query]);

  async function applyMail(id: string, name: string) {
    if (!lib) return;
    try {
      applyMailTemplate({ id, name }, await lib.mailCanvasForStudio(id));
      toast.success(`Applied “${name}”`);
    } catch {
      toast.error("That template could not be applied. Try another one.");
    }
  }

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
          Designs made for this size, then every design laid out for it.
          Applying one replaces both sides.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates"
          className="h-10 rounded-full pl-9"
          aria-label="Search templates"
          data-ocid="canvas.templates.search.input"
        />
      </div>
      {madeForThis.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Made for this size
          </p>
          <div className="grid grid-cols-2 gap-3">
            {madeForThis.map((e) => {
              const active = mailTemplate?.id === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => applyMail(e.id, e.name)}
                  className="group min-w-0 text-left"
                  aria-label={`Apply ${e.name}`}
                  data-ocid={`canvas.mail_template.${e.id}`}
                >
                  {lib && (
                    <LazyMailSide
                      lib={lib}
                      entry={e}
                      side="front"
                      className={cn(
                        "overflow-hidden rounded-lg border border-border/70 shadow-soft transition-smooth group-hover:border-primary/60",
                        active && "border-primary ring-2 ring-primary/30",
                      )}
                    />
                  )}
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                    {e.name}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Every design, laid out for this size
          </p>
        </div>
      )}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
          <LayoutTemplate className="size-5" />
          No template matches — try another word.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {templates.map((t) => {
            const active = designTemplate?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={async () => {
                  await loadTemplateFonts();
                  setDesignTemplate(t);
                  toast.success(`Applied “${t.name}”`);
                }}
                className={cn("group min-w-0 text-left")}
                aria-label={`Apply ${t.name}`}
                data-ocid={`canvas.template.${t.id}`}
              >
                <LazyTemplateSide
                  template={t}
                  layoutVariant={layoutVariant}
                  orientation={orientation}
                  side="front"
                  aspect={aspect}
                  className={cn(
                    "overflow-hidden rounded-lg border border-border/70 shadow-soft transition-smooth group-hover:border-primary/60",
                    active && "border-primary ring-2 ring-primary/30",
                  )}
                />
                <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                  {t.name}
                </p>
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

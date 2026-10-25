import {
  LazyMailSide,
  type MailLibrary,
  useMailCanvas,
  useMailLibrary,
} from "@/components/templates/MailTemplatePreview";
import {
  LazyTemplateSide,
  SidePreview,
  templateCanvas,
  useTemplateFonts,
} from "@/components/templates/TemplatePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MailGalleryEntry } from "@/directmail/gallery";
import { CATALOG, categoryForVariant, categoryRows } from "@/lib/catalog";
import { formatCents, getPricingRow } from "@/lib/pricing";
import { type Orientation, getLayoutDims } from "@/lib/printSpec";
import {
  TEMPLATES,
  TEMPLATE_COLORS,
  TEMPLATE_FEATURES,
  TEMPLATE_PRICE_BANDS,
  TEMPLATE_STYLES,
  TEMPLATE_THEMES,
  loadTemplateFonts,
  templateCategory,
  templatePriceCents,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { DesignTemplate } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  LayoutTemplate,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FacetKey = "style" | "theme" | "category" | "color" | "price" | "feature";

type Filters = Record<FacetKey, string[]>;

const EMPTY: Filters = {
  style: [],
  theme: [],
  category: [],
  color: [],
  price: [],
  feature: [],
};

/**
 * One card in the gallery: a design template (`lib/templates.ts`, laid out
 * natively for any format) or a mail-type library template
 * (`src/directmail`, designed for one product).
 */
type GalleryItem =
  | {
      kind: "design";
      id: string;
      name: string;
      description: string;
      style: string;
      theme: string;
      category: string;
      colors: string[];
      features: string[];
      priceCents: number;
      search: string;
      template: DesignTemplate;
    }
  | {
      kind: "mail";
      id: string;
      name: string;
      description: string;
      style: string;
      theme: string;
      category: string;
      colors: string[];
      features: string[];
      priceCents: number;
      search: string;
      entry: MailGalleryEntry;
    };

function designItem(t: DesignTemplate): GalleryItem {
  return {
    kind: "design",
    id: t.id,
    name: t.name,
    description: t.description,
    style: t.style,
    theme: t.theme,
    category: templateCategory(t),
    colors: t.colors,
    features: t.features,
    priceCents: templatePriceCents(t),
    search: [
      t.name,
      t.description,
      t.style,
      t.theme,
      templateCategory(t),
      t.copy.brand,
      t.copy.headline,
      t.copy.eyebrow,
      ...t.colors,
    ]
      .join(" ")
      .toLowerCase(),
    template: t,
  };
}

function mailItem(e: MailGalleryEntry): GalleryItem {
  return {
    kind: "mail",
    id: e.id,
    name: e.name,
    description: e.description,
    style: e.style,
    theme: e.theme,
    category: e.category,
    colors: e.colors,
    features: e.features,
    priceCents: e.priceCents,
    search: e.search,
    entry: e,
  };
}

const DESIGN_ITEMS: GalleryItem[] = TEMPLATES.map(designItem);

function priceBand(cents: number): string {
  return (
    TEMPLATE_PRICE_BANDS.find((b) => cents >= b.min && cents <= b.max) ??
    TEMPLATE_PRICE_BANDS[0]
  ).id;
}

interface Facet {
  key: FacetKey;
  label: string;
  options: { value: string; label: string; swatch?: string }[];
  /** Values of this facet a template carries. */
  of: (t: GalleryItem) => string[];
}

const FACETS: Facet[] = [
  {
    key: "style",
    label: "Style",
    options: TEMPLATE_STYLES.map((v) => ({ value: v, label: v })),
    of: (t) => [t.style],
  },
  {
    key: "theme",
    label: "Theme",
    options: TEMPLATE_THEMES.map((v) => ({ value: v, label: v })),
    of: (t) => [t.theme],
  },
  {
    key: "category",
    label: "Category",
    options: CATALOG.map((c) => ({ value: c.name, label: c.name })),
    of: (t) => [t.category],
  },
  {
    key: "color",
    label: "Color",
    options: TEMPLATE_COLORS.map((c) => ({
      value: c.name,
      label: c.name,
      swatch: c.hex,
    })),
    of: (t) => t.colors,
  },
  {
    key: "price",
    label: "Price",
    options: TEMPLATE_PRICE_BANDS.map((b) => ({ value: b.id, label: b.label })),
    of: (t) => [priceBand(t.priceCents)],
  },
  {
    key: "feature",
    label: "Feature",
    options: TEMPLATE_FEATURES.map((v) => ({ value: v, label: v })),
    of: (t) => t.features,
  },
];

function matches(t: GalleryItem, filters: Filters, query: string): boolean {
  for (const f of FACETS) {
    const picked = filters[f.key];
    if (picked.length && !f.of(t).some((v) => picked.includes(v))) return false;
  }
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((word) => t.search.includes(word));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");

/** Format name for a template, e.g. "Postcard 6 x 9". */
function formatLabel(variant: string): string {
  return getPricingRow(variant)?.documentClass ?? variant;
}

/** Puts a mail-type library template on the artboard and opens the studio. */
function useApplyMailTemplate() {
  const navigate = useNavigate();
  const store = useWizardStore();
  return async (lib: MailLibrary, entry: MailGalleryEntry) => {
    try {
      const canvas = await lib.mailCanvasForStudio(entry.id);
      const row = getPricingRow(entry.layoutVariant);
      if (row) {
        store.setProduct({
          productType: row.productType,
          layoutVariant: entry.layoutVariant,
        });
      }
      store.setLayout(entry.layoutVariant);
      store.applyMailTemplate({ id: entry.id, name: entry.name }, canvas);
      store.setCurrentStep(3);
      navigate({ to: "/wizard" });
    } catch {
      toast.error("That template could not be opened. Try another one.");
    }
  };
}

/** Puts a template on the canvas in the wizard and opens the studio. */
function useApplyTemplate() {
  const navigate = useNavigate();
  const store = useWizardStore();
  return async (
    template: DesignTemplate,
    layoutVariant = template.layoutVariant,
    orientation: Orientation = template.orientation,
  ) => {
    await loadTemplateFonts();
    store.setProduct({ productType: template.productType, layoutVariant });
    store.setLayout(layoutVariant);
    store.setDesignTemplate(template, orientation);
    store.setCurrentStep(3);
    navigate({ to: "/wizard" });
  };
}

function FacetOptions({
  facet,
  picked,
  onToggle,
  counts,
}: {
  facet: Facet;
  picked: string[];
  onToggle: (value: string) => void;
  counts: Map<string, number>;
}) {
  if (facet.key === "color") {
    return (
      <div className="grid grid-cols-5 gap-2">
        {facet.options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className="flex flex-col items-center gap-1 rounded-lg p-1 text-[11px] text-muted-foreground hover:bg-muted"
              aria-pressed={on}
              data-ocid={`templates.filter.color.${slug(o.value)}`}
            >
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border border-border shadow-sm",
                  on && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
                )}
                style={{ backgroundColor: o.swatch }}
              >
                {on && (
                  <Check
                    className="size-4"
                    style={{
                      color: ["White", "Cream", "Yellow"].includes(o.value)
                        ? "#111"
                        : "#fff",
                    }}
                  />
                )}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      {facet.options.map((o) => {
        const id = `facet-${facet.key}-${slug(o.value)}`;
        const count = counts.get(o.value) ?? 0;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted",
              count === 0 && !picked.includes(o.value) && "opacity-50",
            )}
          >
            <Checkbox
              id={id}
              checked={picked.includes(o.value)}
              onCheckedChange={() => onToggle(o.value)}
              data-ocid={`templates.filter.${facet.key}.${slug(o.value)}`}
            />
            <span className="flex-1">{o.label}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function TemplateCard({
  item,
  lib,
  onOpen,
}: {
  item: GalleryItem;
  lib: MailLibrary | null;
  onOpen: (t: GalleryItem) => void;
}) {
  const [showBack, setShowBack] = useState(false);
  const twoSided = item.kind === "design" || item.entry.twoSided;
  const aspect =
    item.kind === "design"
      ? (() => {
          const d = getLayoutDims(
            item.template.layoutVariant,
            item.template.orientation,
          );
          return d.designWidth / d.designHeight;
        })()
      : item.entry.aspect;
  const side = (key: "front" | "back", className?: string) =>
    item.kind === "design" ? (
      <LazyTemplateSide
        template={item.template}
        side={key}
        aspect={aspect}
        className={className}
      />
    ) : lib ? (
      <LazyMailSide
        lib={lib}
        entry={item.entry}
        side={key}
        className={className}
      />
    ) : (
      <div
        className={cn("w-full bg-muted motion-safe:animate-pulse", className)}
        style={{ aspectRatio: String(aspect) }}
      />
    );
  const format =
    item.kind === "design"
      ? formatLabel(item.template.layoutVariant)
      : item.entry.mailType;
  return (
    <div
      className="mb-5 break-inside-avoid sm:mb-7"
      data-ocid={`template.card.${item.id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        onMouseEnter={() => setShowBack(false)}
        className="group relative block w-full overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`Preview ${item.name}`}
        data-ocid={`template.open.${item.id}.button`}
      >
        <div className="relative">
          {side("front", cn(showBack && "invisible"))}
          {showBack && side("back", "absolute inset-0")}
        </div>
        {/* Page indicator and hover CTA, for pointers that hover. */}
        {twoSided && (
          <span className="pointer-events-none absolute bottom-2 left-2 hidden rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:inline">
            {showBack ? "2 of 2" : "1 of 2"}
          </span>
        )}
        <span className="pointer-events-none absolute right-2 top-2 hidden rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:inline">
          Preview
        </span>
      </button>
      {/* Flip to the back on hover-capable screens. */}
      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-foreground sm:text-[15px]"
            title={item.name}
          >
            {item.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {format} · from {formatCents(item.priceCents)}
          </p>
        </div>
        {twoSided && (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="hidden shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground sm:inline-flex"
            aria-pressed={showBack}
            aria-label={showBack ? "Show the front" : "Show the back"}
            data-ocid={`template.flip.${item.id}.button`}
          >
            {showBack ? "Front" : "Back"}
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewDialog({
  item,
  lib,
  onClose,
}: {
  item: GalleryItem;
  lib: MailLibrary | null;
  onClose: () => void;
}) {
  return item.kind === "design" ? (
    <DesignPreviewDialog template={item.template} onClose={onClose} />
  ) : (
    <MailPreviewDialog item={item} lib={lib} onClose={onClose} />
  );
}

/** Preview of a mail-type library template: designed for one product. */
function MailPreviewDialog({
  item,
  lib,
  onClose,
}: {
  item: Extract<GalleryItem, { kind: "mail" }>;
  lib: MailLibrary | null;
  onClose: () => void;
}) {
  const apply = useApplyMailTemplate();
  const [busy, setBusy] = useState(false);
  const e = item.entry;
  const canvas = useMailCanvas(lib, e.id);
  const dims = getLayoutDims(e.layoutVariant, e.orientation);
  const landscape = dims.designWidth >= dims.designHeight;
  const sides = e.twoSided
    ? (["front", "back"] as const)
    : (["front"] as const);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl"
        data-ocid="templates.preview.dialog"
      >
        <div
          className={cn(
            "grid gap-6",
            landscape ? "lg:grid-cols-[1fr_18rem]" : "md:grid-cols-[1fr_18rem]",
          )}
        >
          <div className="min-w-0 space-y-3">
            <div
              className={cn(
                "grid gap-3",
                sides.length === 1
                  ? "mx-auto w-full max-w-md grid-cols-1"
                  : landscape
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-2",
              )}
            >
              {sides.map((side) => (
                <figure key={side} className="min-w-0">
                  <div className="overflow-hidden rounded-lg border border-border/70 shadow-soft">
                    {canvas ? (
                      <SidePreview
                        canvas={canvas}
                        side={side}
                        addressZone={
                          side === "back" ? dims.addressZone : undefined
                        }
                      />
                    ) : (
                      <div
                        className="w-full bg-muted motion-safe:animate-pulse"
                        style={{ aspectRatio: String(e.aspect) }}
                      />
                    )}
                  </div>
                  <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
                    {sides.length === 1
                      ? "Front"
                      : side === "front"
                        ? "Front · 1 of 2"
                        : "Back · 2 of 2"}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <DialogTitle className="font-display text-xl leading-snug">
                {e.name}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                {e.description}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{e.style}</Badge>
              <Badge variant="secondary">{e.theme}</Badge>
              <Badge variant="outline">{e.category}</Badge>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Designed for</dt>
                <dd className="text-right font-medium">{e.mailType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="text-right font-medium">
                  from {formatCents(e.priceCents)} / piece
                </dd>
              </div>
            </dl>
            <ul className="space-y-1.5 text-sm">
              {e.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-primary" />
                {e.twoSided ? "Front and back, print-ready" : "Print-ready"}
              </li>
            </ul>
            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={!lib || busy}
              onClick={async () => {
                if (!lib) return;
                setBusy(true);
                await apply(lib, e);
                setBusy(false);
              }}
              data-ocid={`template.use.${e.id}.button`}
            >
              <Sparkles className="size-4" />
              {busy ? "Opening the studio…" : "Customize this template"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Every word, colour and picture stays editable in the design
              studio.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Preview of a design template, on any size and orientation. */
function DesignPreviewDialog({
  template,
  onClose,
}: {
  template: DesignTemplate | null;
  onClose: () => void;
}) {
  const apply = useApplyTemplate();
  const fonts = useTemplateFonts();
  const [variant, setVariant] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const t = template;
  const v = variant ?? t?.layoutVariant ?? "6x9";
  const o = orientation ?? t?.orientation ?? "native";
  const canvas = useMemo(
    () => (t && fonts ? templateCanvas(t, v, o) : null),
    [t, fonts, v, o],
  );
  if (!t) return null;
  const family = categoryForVariant(t.layoutVariant);
  const sizes = family ? categoryRows(family) : [];
  const native = getLayoutDims(v, "native");
  const square = native.widthInches === native.heightInches;
  const nativeIsLandscape = native.widthInches > native.heightInches;
  const orientations: { value: Orientation; label: string }[] = square
    ? []
    : [
        {
          value: "native",
          label: nativeIsLandscape ? "Landscape" : "Portrait",
        },
        {
          value: "rotated",
          label: nativeIsLandscape ? "Portrait" : "Landscape",
        },
      ];
  const dims = getLayoutDims(v, o);
  const landscape = dims.designWidth >= dims.designHeight;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setVariant(null);
          setOrientation(null);
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl"
        data-ocid="templates.preview.dialog"
      >
        <div
          className={cn(
            "grid gap-6",
            landscape ? "lg:grid-cols-[1fr_18rem]" : "md:grid-cols-[1fr_18rem]",
          )}
        >
          <div className="min-w-0 space-y-3">
            <div
              className={cn(
                "grid gap-3",
                landscape ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
              )}
            >
              {(["front", "back"] as const).map((side) => (
                <figure key={side} className="min-w-0">
                  <div className="overflow-hidden rounded-lg border border-border/70 shadow-soft">
                    {canvas ? (
                      <SidePreview
                        canvas={canvas}
                        side={side}
                        addressZone={
                          side === "back" ? dims.addressZone : undefined
                        }
                      />
                    ) : (
                      <div
                        className="w-full motion-safe:animate-pulse"
                        style={{
                          aspectRatio: `${dims.designWidth} / ${dims.designHeight}`,
                          backgroundColor: t.palette.bg,
                        }}
                      />
                    )}
                  </div>
                  <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
                    {side === "front" ? "Front · 1 of 2" : "Back · 2 of 2"}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <DialogTitle className="font-display text-xl leading-snug">
                {t.name}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                {t.description}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{t.style}</Badge>
              <Badge variant="secondary">{t.theme}</Badge>
              <Badge variant="outline">{templateCategory(t)}</Badge>
            </div>
            {sizes.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setVariant(row.id);
                        if (row.id !== v) setOrientation(null);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-smooth",
                        row.id === v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                      aria-pressed={row.id === v}
                      data-ocid={`templates.preview.size.${slug(row.id)}`}
                    >
                      {row.widthInches} × {row.heightInches}″
                    </button>
                  ))}
                </div>
              </div>
            )}
            {orientations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Orientation
                </p>
                <div className="inline-flex rounded-full border border-border bg-card p-0.5">
                  {orientations.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrientation(opt.value)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-smooth",
                        opt.value === o
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={opt.value === o}
                      data-ocid={`templates.preview.orientation.${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="text-right font-medium">{formatLabel(v)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="text-right font-medium">
                  from{" "}
                  {formatCents(templatePriceCents({ ...t, layoutVariant: v }))}{" "}
                  / piece
                </dd>
              </div>
            </dl>
            <ul className="space-y-1.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-primary" />
                Front and back, print-ready
              </li>
            </ul>
            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              onClick={() => apply(t, v, o)}
              data-ocid={`template.use.${t.id}.button`}
            >
              <Sparkles className="size-4" />
              Customize this template
            </Button>
            <p className="text-xs text-muted-foreground">
              Every word, colour and picture stays editable in the design
              studio.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TemplatesPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const [sheet, setSheet] = useState(false);
  // The mail-type library loads as its own chunk; the gallery opens with the
  // design templates and grows when it arrives.
  const lib = useMailLibrary();
  const items = useMemo(
    () =>
      lib ? [...DESIGN_ITEMS, ...lib.MAIL_GALLERY.map(mailItem)] : DESIGN_ITEMS,
    [lib],
  );

  const results = useMemo(
    () => items.filter((t) => matches(t, filters, query)),
    [items, filters, query],
  );
  const active = FACETS.reduce((n, f) => n + filters[f.key].length, 0);

  /** How many results each option would give with the other filters kept. */
  const countsFor = (facet: Facet) => {
    const others = { ...filters, [facet.key]: [] };
    const pool = items.filter((t) => matches(t, others, query));
    const counts = new Map<string, number>();
    for (const t of pool)
      for (const v of facet.of(t)) counts.set(v, (counts.get(v) ?? 0) + 1);
    return counts;
  };

  const toggle = (key: FacetKey, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const clear = () => {
    setFilters(EMPTY);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with search */}
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Direct mail templates
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            {lib ? items.length : `${TEMPLATES.length}+`} designs written for
            real businesses, for every mail piece we print: postcards, letters,
            EDDM®, brochures, booklets and more. Pick one, make it yours and
            mail it.
          </p>
          <div className="relative mt-5 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates: real estate, coupon, navy…"
              className="h-12 rounded-full pl-12 text-base"
              aria-label="Search templates"
              data-ocid="templates.search.input"
            />
          </div>
        </div>
      </div>

      {/* Filter bar: pinned under the sticky site header, not behind it. */}
      <div
        className="sticky top-[calc(var(--header-h)+4px+env(safe-area-inset-top,0px))] z-30 border-b border-border/60 bg-background"
        data-ocid="templates.filters.bar"
      >
        <div className="mx-auto max-w-[100rem] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-smooth",
                active
                  ? "border-primary bg-primary/10 text-primary-ink"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
              data-ocid="template.filter.all.button"
            >
              <SlidersHorizontal className="size-4" />
              All
              {active > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {active}
                </span>
              )}
            </button>
            {FACETS.map((facet) => {
              const n = filters[facet.key].length;
              return (
                <Popover key={facet.key}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-smooth",
                        n
                          ? "border-primary bg-primary/10 text-primary-ink"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                      data-ocid={`template.filter.${facet.key}.button`}
                    >
                      {facet.label}
                      {n > 0 && (
                        <span className="text-xs font-semibold">({n})</span>
                      )}
                      <ChevronDown className="size-4 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="max-h-[min(26rem,var(--radix-popover-content-available-height))] w-72 overflow-y-auto rounded-2xl p-3"
                    data-ocid={`templates.filter.${facet.key}.popover`}
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-sm font-semibold">{facet.label}</p>
                      {n > 0 && (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary-ink hover:underline"
                          onClick={() =>
                            setFilters((f) => ({ ...f, [facet.key]: [] }))
                          }
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <FacetOptions
                      facet={facet}
                      picked={filters[facet.key]}
                      onToggle={(v) => toggle(facet.key, v)}
                      counts={countsFor(facet)}
                    />
                  </PopoverContent>
                </Popover>
              );
            })}
            {(active > 0 || query) && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap px-2 text-sm font-medium text-primary-ink hover:underline"
                data-ocid="templates.filters.clear.button"
              >
                <X className="size-4" />
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? "template" : "templates"}
        </p>
        {results.length > 0 ? (
          <div
            className="columns-2 gap-3 sm:gap-6 md:columns-3 xl:columns-4 2xl:columns-5"
            data-ocid="templates.grid"
          >
            {results.map((t) => (
              <TemplateCard key={t.id} item={t} lib={lib} onOpen={setOpen} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutTemplate className="size-12 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              No templates match
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try fewer filters or a different search.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={clear}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            Want to build from scratch?{" "}
            <Link
              to="/wizard"
              className="inline-flex items-center gap-1 font-medium text-primary-ink hover:underline"
              data-ocid="templates.start_scratch.link"
            >
              Start a blank campaign
              <ArrowRight className="size-3.5" />
            </Link>
          </p>
        </div>
      </div>

      {open && (
        <PreviewDialog
          key={open.id}
          item={open}
          lib={lib}
          onClose={() => setOpen(null)}
        />
      )}

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          data-ocid="templates.filters.sheet"
        >
          <SheetHeader className="border-b border-border/60 p-4">
            <SheetTitle>All filters</SheetTitle>
            <SheetDescription>
              {results.length} templates match
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {FACETS.map((facet) => (
              <section key={facet.key}>
                <h3 className="mb-2 px-1 text-sm font-semibold">
                  {facet.label}
                </h3>
                <FacetOptions
                  facet={facet}
                  picked={filters[facet.key]}
                  onToggle={(v) => toggle(facet.key, v)}
                  counts={countsFor(facet)}
                />
              </section>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={clear}
            >
              Clear all
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => setSheet(false)}
            >
              Show {results.length}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

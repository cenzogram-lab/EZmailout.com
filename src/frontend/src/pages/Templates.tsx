import { MascotStage } from "@/components/stampy";
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
import { contrastRatio } from "@/lib/templateLayout";
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
import { claimTemplateApply, useWizardStore } from "@/store/wizard";
import type { DesignTemplate } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
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

/** The filter popover and sheet surface (`--popover`) in each theme. */
const POPOVER_LIGHT = "#ffffff";
const POPOVER_DARK = "#131622";

/**
 * Rim of a colour bead. A bead that stands out from the surface by less than
 * 3:1 (White, Cream, Yellow on the white popover; Black, Navy, Purple on the
 * dark one) gets the 3:1 field border (`--input`) as its outline, so it reads
 * as a bead instead of a faint ring; the others keep the soft hairline.
 */
function beadRim(hex: string | undefined): string {
  if (!hex) return "border-input";
  return cn(
    contrastRatio(hex, POPOVER_LIGHT) < 3
      ? "border-input"
      : "border-hairline-strong",
    contrastRatio(hex, POPOVER_DARK) < 3
      ? "dark:border-input"
      : "dark:border-hairline-strong",
  );
}

/** Format name for a template, e.g. "Postcard 6 x 9". */
function formatLabel(variant: string): string {
  return getPricingRow(variant)?.documentClass ?? variant;
}

/** Puts a mail-type library template on the artboard and opens the studio. */
function useApplyMailTemplate() {
  const navigate = useNavigate();
  const store = useWizardStore();
  return async (lib: MailLibrary, entry: MailGalleryEntry) => {
    const stillCurrent = claimTemplateApply();
    try {
      const canvas = await lib.mailCanvasForStudio(entry.id);
      // Another template chosen while this one converted wins.
      if (!stillCurrent()) return;
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
      <div className="grid grid-cols-5 gap-1.5">
        {facet.options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
                on && "text-foreground",
              )}
              aria-pressed={on}
              data-ocid={`templates.filter.color.${slug(o.value)}`}
            >
              {/* A glossy bead of the colour: top sheen, soft drop. */}
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),inset_0_-2px_4px_rgb(0_0_0/0.12),0_2px_6px_-1px_rgb(0_0_0/0.25)]",
                  beadRim(o.swatch),
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
        const on = picked.includes(o.value);
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 text-sm transition-colors hover:bg-muted",
              on && "bg-primary/10 font-semibold hover:bg-primary/15",
              count === 0 && !on && "opacity-50",
            )}
          >
            <Checkbox
              id={id}
              checked={on}
              onCheckedChange={() => onToggle(o.value)}
              data-ocid={`templates.filter.${facet.key}.${slug(o.value)}`}
            />
            <span className="flex-1">{o.label}</span>
            <span className="font-mono text-xs tabular-nums tracking-wider text-muted-foreground">
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
    // The card is a tactile surface framing the artwork; the artwork itself
    // (SidePreview) keeps its print colours in both themes.
    <div
      className="mb-3 break-inside-avoid rounded-[1.25rem] border border-hairline bg-card p-1.5 shadow-surface transition-smooth hover:shadow-raised motion-safe:hover:-translate-y-0.5 sm:mb-6 sm:rounded-3xl sm:p-2"
      data-ocid={`template.card.${item.id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        onMouseEnter={() => setShowBack(false)}
        className="group relative block w-full overflow-hidden rounded-[0.875rem] border border-hairline-strong bg-well text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:rounded-2xl"
        aria-label={`Preview ${item.name}`}
        data-ocid={`template.open.${item.id}.button`}
      >
        <div className="relative">
          {side("front", cn(showBack && "invisible"))}
          {showBack && side("back", "absolute inset-0")}
        </div>
        {/* Page indicator and hover CTA, for pointers that hover. */}
        {twoSided && (
          <span className="pointer-events-none absolute bottom-2 left-2 hidden rounded-full border border-white/15 bg-black/75 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:inline">
            {showBack ? "2 of 2" : "1 of 2"}
          </span>
        )}
        <span className="btn-3d-primary pointer-events-none absolute right-2 top-2 hidden rounded-full px-3.5 py-1.5 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:inline">
          Preview
        </span>
      </button>
      {/* Flip to the back on hover-capable screens. */}
      <div className="flex items-start gap-2 px-1.5 pb-1 pt-2.5 sm:px-2 sm:pb-1.5">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-[15px]"
            title={item.name}
          >
            {item.name}
          </p>
          {/* One line where it fits; in a narrow column the price moves
              under the format whole, so it is never cut off. */}
          <p className="mt-0.5 flex min-w-0 flex-wrap gap-x-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{format}</span>
            <span className="whitespace-nowrap">
              · from{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatCents(item.priceCents)}
              </span>
            </span>
          </p>
        </div>
        {twoSided && (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="btn-3d-neutral hidden h-7 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:inline-flex"
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

/**
 * Chrome shared by both previews: a centred sheet from `sm` (1 rem from each
 * edge up to 64 rem wide), a bottom sheet with a grab handle on phones (same
 * dialog, only positioned differently). The dialog itself does not scroll:
 * its top band (grab handle, close button) stays put and the content scrolls
 * under it, so a long sheet never loses its handle or its way out. The body
 * has no bottom padding of its own: `PreviewLayout` and `PreviewAction` give
 * it, so the pinned call to action can sit flush with the sheet's bottom.
 * Once the body scrolls, a hairline closes the band and the body's top edge
 * fades, so the content reads as passing under the band, never cut through.
 */
function PreviewSheet({
  onOpenChange,
  children,
}: {
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(64rem,calc(100%-2rem))] max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:data-[state=open]:slide-in-from-bottom-8"
        data-ocid="templates.preview.dialog"
      >
        {/* The top band: grab handle on phones, room for the close button. */}
        <div
          aria-hidden="true"
          className={cn(
            "h-12 shrink-0 border-b motion-safe:transition-colors",
            scrolled ? "border-hairline" : "border-transparent",
          )}
        >
          <span className="sheet-handle absolute inset-x-0 top-1 sm:hidden" />
        </div>
        {/* Scroll padding keeps a focused control clear of the pinned call
            to action. */}
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          className={cn(
            "min-h-0 scroll-pb-36 overflow-y-auto overscroll-contain px-6 max-sm:px-4",
            scrolled &&
              "[mask-image:linear-gradient(to_bottom,transparent,#000_1rem)]",
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Stage, details and call to action. One column until the details move
 * beside the stage (from `lg` for landscape art, `md` for portrait); there
 * the stage spans both rows and the action sits right under the details
 * (the `1fr` second row takes whatever height the stage adds, so no gap
 * opens between the two).
 */
function PreviewLayout({
  landscape,
  stage,
  details,
  action,
}: {
  landscape: boolean;
  stage: ReactNode;
  details: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-6",
        landscape
          ? "lg:grid-cols-[1fr_19rem] lg:grid-rows-[auto_1fr] lg:pb-6"
          : "md:grid-cols-[1fr_19rem] md:grid-rows-[auto_1fr] md:pb-6",
      )}
    >
      <div
        className={cn("min-w-0", landscape ? "lg:row-span-2" : "md:row-span-2")}
      >
        {stage}
      </div>
      <div className="min-w-0 space-y-5">{details}</div>
      {action}
    </div>
  );
}

/**
 * The call to action and its note. While the preview is one column it is a
 * footer pinned to the bottom of the sheet (the artwork and details scroll
 * under it), so the button is in reach as soon as the sheet opens; once the
 * details sit beside the stage it is inline under them.
 */
function PreviewAction({
  landscape,
  children,
}: {
  landscape: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        // A soft upward shadow over the hairline, so the details scrolling
        // under the pinned footer read as more content below, not a clip.
        "sticky bottom-0 z-10 -mx-6 min-w-0 space-y-3 border-t border-hairline bg-popover px-6 pb-6 pt-4 shadow-[0_-10px_24px_-10px_rgb(15_17_23/0.2)] dark:shadow-[0_-12px_28px_-8px_rgb(0_0_0/0.8)] max-sm:-mx-4 max-sm:px-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
        landscape
          ? "lg:static lg:col-start-2 lg:mx-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:shadow-none"
          : "md:static md:col-start-2 md:mx-0 md:border-t-0 md:bg-transparent md:p-0 md:shadow-none dark:md:shadow-none",
      )}
    >
      {children}
      <p className="text-center text-xs text-muted-foreground">
        Every word, colour and picture stays editable in the design studio.
      </p>
    </div>
  );
}

/** The sunken stage the artwork sits on (the artwork keeps its own colours). */
function PreviewStage({ children }: { children: ReactNode }) {
  return (
    <div className="isolate flex min-w-0 flex-col justify-center rounded-[1.25rem] border border-hairline bg-well p-3 shadow-[inset_0_1px_3px_rgb(0_0_0/0.08)] sm:p-4">
      {children}
    </div>
  );
}

/**
 * The artwork's sides on the stage. Portrait sides sit side by side.
 * Landscape ones sit side by side up to `lg`; from `lg` (details panel beside
 * the stage) they stack, each as wide as the stage or as the dialog's height
 * lets both show at once (`--stage-aspect` is width / height), whichever is
 * smaller, instead of two small cards in a tall empty stage.
 */
function PreviewSides({
  count,
  aspect,
  children,
}: {
  count: number;
  aspect: number;
  children: ReactNode;
}) {
  const stacked = count > 1 && aspect >= 1;
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        count === 1
          ? "mx-auto w-full max-w-md grid-cols-1"
          : stacked
            ? "grid-cols-1 sm:grid-cols-2 lg:mx-auto lg:w-full lg:max-w-[calc((100dvh-14rem)/2*var(--stage-aspect))] lg:grid-cols-1"
            : "grid-cols-2",
      )}
      style={
        stacked ? ({ "--stage-aspect": aspect } as CSSProperties) : undefined
      }
    >
      {children}
    </div>
  );
}

/** One side of the artwork, framed, with its page label. */
function PreviewFigure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-lg border border-hairline-strong bg-card shadow-surface">
        {children}
      </div>
      <figcaption className="meta-mono mt-2 text-center">{label}</figcaption>
    </figure>
  );
}

/** A label above a capsule control in the preview's side panel. */
function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

/** Format and price, the price as a big figure. */
function PreviewFacts({
  term,
  format,
  priceCents,
}: {
  term: string;
  format: string;
  priceCents: number;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-hairline bg-card-raised p-4">
      <div aria-hidden="true" className="ambient-glow-backdrop" />
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="text-right font-semibold">{format}</dd>
        </div>
        <div className="flex items-end justify-between gap-3">
          <dt className="pb-1 text-muted-foreground">Price</dt>
          <dd className="text-right text-muted-foreground">
            from{" "}
            <span className="text-3xl font-black tabular-nums tracking-tight text-foreground">
              {formatCents(priceCents)}
            </span>{" "}
            / piece
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** The template's features as a ticked list. */
function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((f) => (
        <li key={f} className="flex items-center gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-ink">
            <Check className="size-3" strokeWidth={3} />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

/** Name, description and facets at the top of the preview's side panel. */
function PreviewHeading({
  name,
  description,
  style,
  theme,
  category,
}: {
  name: string;
  description: string;
  style: string;
  theme: string;
  category: string;
}) {
  return (
    <>
      <div>
        <DialogTitle className="display-heading text-2xl leading-tight">
          {name}
        </DialogTitle>
        <DialogDescription className="mt-2 leading-relaxed">
          {description}
        </DialogDescription>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="info">{style}</Badge>
        <Badge variant="neutral">{theme}</Badge>
        <Badge variant="outline">{category}</Badge>
      </div>
    </>
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
    <PreviewSheet onOpenChange={(open) => !open && onClose()}>
      <PreviewLayout
        landscape={landscape}
        stage={
          <PreviewStage>
            <PreviewSides
              count={sides.length}
              aspect={dims.designWidth / dims.designHeight}
            >
              {sides.map((side) => (
                <PreviewFigure
                  key={side}
                  label={
                    sides.length === 1
                      ? "Front"
                      : side === "front"
                        ? "Front · 1 of 2"
                        : "Back · 2 of 2"
                  }
                >
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
                </PreviewFigure>
              ))}
            </PreviewSides>
          </PreviewStage>
        }
        details={
          <>
            <PreviewHeading
              name={e.name}
              description={e.description}
              style={e.style}
              theme={e.theme}
              category={e.category}
            />
            <PreviewFacts
              term="Designed for"
              format={e.mailType}
              priceCents={e.priceCents}
            />
            <FeatureList
              items={[
                ...e.features,
                e.twoSided ? "Front and back, print-ready" : "Print-ready",
              ]}
            />
          </>
        }
        action={
          <PreviewAction landscape={landscape}>
            <Button
              type="button"
              className="h-12 w-full gap-2 text-base"
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
          </PreviewAction>
        }
      />
    </PreviewSheet>
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
    <PreviewSheet
      onOpenChange={(open) => {
        if (!open) {
          setVariant(null);
          setOrientation(null);
          onClose();
        }
      }}
    >
      <PreviewLayout
        landscape={landscape}
        stage={
          <PreviewStage>
            <PreviewSides
              count={2}
              aspect={dims.designWidth / dims.designHeight}
            >
              {(["front", "back"] as const).map((side) => (
                <PreviewFigure
                  key={side}
                  label={side === "front" ? "Front · 1 of 2" : "Back · 2 of 2"}
                >
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
                </PreviewFigure>
              ))}
            </PreviewSides>
          </PreviewStage>
        }
        details={
          <>
            <PreviewHeading
              name={t.name}
              description={t.description}
              style={t.style}
              theme={t.theme}
              category={templateCategory(t)}
            />
            {sizes.length > 1 && (
              <div className="space-y-2 @container">
                <PanelLabel>Size</PanelLabel>
                {/* Equal cells in the capsule track, laid out by the panel's
                  own width: one row when every size fits, otherwise rows of
                  two or three (a rounded box instead of a capsule). */}
                <div
                  className={cn(
                    "segmented grid w-full",
                    sizes.length === 2
                      ? "grid-cols-2"
                      : sizes.length === 3
                        ? "grid-cols-3"
                        : sizes.length === 4
                          ? "grid-cols-2 rounded-[1.375rem] @sm:grid-cols-4 @sm:rounded-full"
                          : "grid-cols-3 rounded-[1.375rem] @lg:grid-cols-6 @lg:rounded-full",
                  )}
                >
                  {sizes.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setVariant(row.id);
                        if (row.id !== v) setOrientation(null);
                      }}
                      className="segmented-item min-h-11 min-w-0 px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-9"
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
              <div className="space-y-2">
                <PanelLabel>Orientation</PanelLabel>
                <div className="segmented">
                  {orientations.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrientation(opt.value)}
                      className="segmented-item min-h-11 px-4 text-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-9"
                      aria-pressed={opt.value === o}
                      data-ocid={`templates.preview.orientation.${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PreviewFacts
              term="Format"
              format={formatLabel(v)}
              priceCents={templatePriceCents({ ...t, layoutVariant: v })}
            />
            <FeatureList
              items={[...t.features, "Front and back, print-ready"]}
            />
          </>
        }
        action={
          <PreviewAction landscape={landscape}>
            <Button
              type="button"
              className="h-12 w-full gap-2 text-base"
              size="lg"
              onClick={() => apply(t, v, o)}
              data-ocid={`template.use.${t.id}.button`}
            >
              <Sparkles className="size-4" />
              Customize this template
            </Button>
          </PreviewAction>
        }
      />
    </PreviewSheet>
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

  /** Raised-pill look of the segmented control's active item, for a facet
   * that has values picked (or whose popover is open). */
  const raised =
    "border-[color:var(--segmented-active-border)] bg-[color:var(--segmented-active)] font-bold text-[color:var(--segmented-active-fg)] shadow-[var(--segmented-active-shadow)]";

  return (
    <div className="min-h-screen bg-background">
      {/* A solid band in the site header's footprint (pulled up into it by
          the negative margin, held there by sticky), under the floating
          header pill (z-50) and over the page. The filter bar pins right
          below it, so cards scrolling up never show in a window between the
          pill and the bar. At the top of the page it only covers the page
          colour behind the header. */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 z-30 -mt-[calc(var(--header-h)+4px+env(safe-area-inset-top,0px))] h-[calc(var(--header-h)+4px+env(safe-area-inset-top,0px))] bg-background"
      />
      {/* Header with search, under a soft brand backlight. */}
      <div className="relative isolate border-b border-hairline bg-card">
        <div aria-hidden="true" className="ambient-glow-backdrop" />
        <div className="mx-auto flex max-w-[100rem] items-center gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="display-heading text-[2rem] leading-[1.05] sm:text-5xl">
              Direct mail templates
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              <span className="font-bold tabular-nums text-foreground">
                {lib ? items.length : `${TEMPLATES.length}+`}
              </span>{" "}
              designs written for real businesses, for every mail piece we
              print: postcards, letters, EDDM®, brochures, booklets and more.
              Pick one, make it yours and mail it.
            </p>
            <div className="relative mt-6 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates: real estate, coupon, navy…"
                className="h-12 rounded-full pl-12 text-base shadow-surface"
                aria-label="Search templates"
                data-ocid="templates.search.input"
              />
            </div>
          </div>
          {/* Stampy with his palette, staged beside the title (decoration). */}
          <MascotStage
            pose="design"
            size="lg"
            className="mr-10 hidden shrink-0 lg:inline-grid"
          />
        </div>
      </div>

      {/* Filter bar: pinned under the sticky site header, not behind it. */}
      <div
        className="sticky top-[calc(var(--header-h)+4px+env(safe-area-inset-top,0px))] z-30 border-b border-hairline bg-background"
        data-ocid="templates.filters.bar"
      >
        <div className="mx-auto max-w-[100rem] px-4 py-2 sm:px-6 sm:py-2.5 lg:px-8">
          {/* Room above and below so focus rings are not clipped by the
              horizontal scroller. Below `md` the facets do not all fit: the
              row runs to the screen edge and fades out over its last 2 rem,
              so a cut-off facet reads as "more this way"; a trailing spacer
              (and scroll padding for keyboard focus) brings the last control
              clear of the fade once scrolled to the end. */}
          <div className="-mx-1 flex items-stretch gap-2 overflow-x-auto px-1 py-1 scrollbar-hide max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-md:scroll-pr-10 max-md:after:w-6 max-md:after:shrink-0 max-md:after:content-[''] max-sm:-mr-4 sm:max-md:-mr-6">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className={cn(
                "btn-3d-neutral inline-flex shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
                active > 0 && "text-primary-ink",
              )}
              data-ocid="template.filter.all.button"
            >
              <SlidersHorizontal className="size-4" />
              All
              {active > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
                  {active}
                </span>
              )}
            </button>
            <div className="segmented shrink-0 gap-1 p-1">
              {FACETS.map((facet) => {
                const n = filters[facet.key].length;
                return (
                  <Popover key={facet.key}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "segmented-item min-h-11 gap-1.5 px-3.5 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-h-9",
                          "data-[state=open]:border-[color:var(--segmented-active-border)] data-[state=open]:bg-[color:var(--segmented-active)] data-[state=open]:text-[color:var(--segmented-active-fg)] data-[state=open]:shadow-[var(--segmented-active-shadow)]",
                          n > 0 && raised,
                        )}
                        data-ocid={`template.filter.${facet.key}.button`}
                      >
                        {facet.label}
                        {n > 0 && (
                          <span className="text-xs font-semibold tabular-nums">
                            ({n})
                          </span>
                        )}
                        <ChevronDown className="size-4 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="max-h-[min(26rem,var(--radix-popover-content-available-height))] w-72 overflow-y-auto rounded-3xl p-2.5"
                      data-ocid={`templates.filter.${facet.key}.popover`}
                    >
                      <div className="mb-1.5 flex min-h-8 items-center justify-between px-1.5">
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {facet.label}
                        </p>
                        {n > 0 && (
                          <button
                            type="button"
                            className="rounded-full px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
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
            </div>
            {(active > 0 || query) && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
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
        <p
          className="mb-4 flex items-baseline gap-1.5 text-sm text-muted-foreground sm:mb-6"
          aria-live="polite"
        >
          <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
            {results.length}
          </span>{" "}
          {results.length === 1 ? "template" : "templates"}
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
          <div className="relative isolate flex flex-col items-center justify-center rounded-3xl border border-hairline bg-card px-6 py-14 text-center shadow-surface">
            <div aria-hidden="true" className="ambient-glow-backdrop" />
            <MascotStage pose="audience" size="md" className="mb-6" />
            <h3 className="display-heading text-xl sm:text-2xl">
              No templates match
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try fewer filters or a different search.
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-6"
              onClick={clear}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mx-auto max-w-[100rem] px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <div className="relative isolate rounded-3xl border border-hairline bg-card px-6 py-8 shadow-surface sm:py-10">
          <div aria-hidden="true" className="ambient-glow-backdrop" />
          <p className="flex flex-col items-center justify-center gap-4 text-center text-base text-muted-foreground sm:flex-row">
            Want to build from scratch?{" "}
            <Link
              to="/wizard"
              className="btn-3d-neutral inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
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
          <SheetHeader className="border-b border-hairline p-5 pr-14">
            <SheetTitle className="display-heading text-xl">
              All filters
            </SheetTitle>
            <SheetDescription>
              <span className="font-semibold tabular-nums text-foreground">
                {results.length}
              </span>{" "}
              templates match
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {FACETS.map((facet) => (
              <section key={facet.key}>
                <h3 className="mb-2 px-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {facet.label}
                </h3>
                <div className="rounded-2xl border border-hairline bg-card-raised p-1.5">
                  <FacetOptions
                    facet={facet}
                    picked={filters[facet.key]}
                    onToggle={(v) => toggle(facet.key, v)}
                    counts={countsFor(facet)}
                  />
                </div>
              </section>
            ))}
          </div>
          <div className="flex gap-2 border-t border-hairline p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={clear}
            >
              Clear all
            </Button>
            <Button
              type="button"
              size="lg"
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

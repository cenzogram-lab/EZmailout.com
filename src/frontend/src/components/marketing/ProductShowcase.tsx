import { CatalogIcon } from "@/components/catalog/CatalogIcon";
import { sideHasContent } from "@/components/wizard/usePrintDocument";
import {
  CATALOG,
  CATALOG_SIZE_COUNT,
  type CatalogCategory,
  categoryFromCents,
  categoryRows,
} from "@/lib/catalog";
import { formatCents } from "@/lib/pricing";
import { useWizardStore } from "@/store/wizard";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ICON_TILE } from "./tactile";

/**
 * Tile widths per breakpoint: n tiles and n − 1 gaps (gap-3) fill a row,
 * less 0.1 px so sub-pixel rounding never wraps a row early. The 14 families
 * fill rows of 2 on phones and 7 from lg; in between (4 and 5 a row) the
 * container centres the shorter last row.
 */
const TILE_WIDTHS =
  "w-[calc((100%_-_0.75rem)/2_-_0.1px)] sm:w-[calc((100%_-_2.25rem)/4_-_0.1px)] md:w-[calc((100%_-_3rem)/5_-_0.1px)] lg:w-[calc((100%_-_4.5rem)/7_-_0.1px)]";

function CategoryTile({ category }: { category: CatalogCategory }) {
  const navigate = useNavigate();
  const rows = categoryRows(category);
  const first = rows[0];

  function start() {
    const store = useWizardStore.getState();
    // A design in progress is laid out for its own size: a tile only
    // preselects a format while there is nothing to lose, and otherwise
    // opens Step 1, where changing size asks first.
    const designed =
      sideHasContent(store.canvas.front) || sideHasContent(store.canvas.back);
    if (first && !(designed && store.selectedLayout !== first.id)) {
      store.setProduct({
        productType: category.productType,
        layoutVariant: first.id,
      });
      store.setLayout(first.id);
    }
    store.setStep(1);
    navigate({ to: "/wizard" });
  }

  return (
    <button
      type="button"
      onClick={start}
      className={`${TILE_WIDTHS} surface-card group flex min-w-0 flex-col items-center gap-2 px-3 pb-5 pt-6 text-center outline-none transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/80 active:translate-y-0 motion-reduce:hover:translate-y-0`}
      data-ocid={`products.category.${category.id}`}
    >
      <span
        className={`${ICON_TILE} mb-1 size-16 transition-smooth group-hover:border-primary/40`}
      >
        <CatalogIcon id={category.icon} className="size-9" />
      </span>
      <span className="text-sm font-bold leading-snug tracking-tight text-foreground">
        {category.name}
      </span>
      <span className="meta-mono mb-2 text-[11px]">
        {rows.length} size{rows.length === 1 ? "" : "s"}
      </span>
      <span className="status-pill status-pill-indigo mt-auto">
        from {formatCents(categoryFromCents(category))}
        <ArrowRight className="-mr-0.5 hidden size-3 group-hover:block group-focus-visible:block" />
      </span>
    </button>
  );
}

/** Landing-page catalog: the 14 print product families as an icon grid. */
export function ProductShowcase() {
  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap justify-center gap-3"
        data-ocid="products.grid"
      >
        {CATALOG.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
      <p className="mx-auto max-w-3xl text-balance text-center text-xs text-muted-foreground">
        {CATALOG.length} product families · {CATALOG_SIZE_COUNT} sizes ·
        printed, addressed and mailed by EZmailout. Prices include print,
        postage and CASS verification.
      </p>
    </div>
  );
}

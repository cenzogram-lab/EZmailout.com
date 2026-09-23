import { CatalogIcon } from "@/components/catalog/CatalogIcon";
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

function CategoryTile({ category }: { category: CatalogCategory }) {
  const navigate = useNavigate();
  const rows = categoryRows(category);
  const first = rows[0];

  function start() {
    const store = useWizardStore.getState();
    if (first) {
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
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-6 text-center transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      data-ocid={`products.category.${category.id}`}
    >
      <CatalogIcon
        id={category.icon}
        className="size-11 text-[#575859] transition-smooth group-hover:text-primary"
      />
      <span className="text-sm font-semibold text-foreground">
        {category.name}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {rows.length} size{rows.length === 1 ? "" : "s"}
      </span>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        from {formatCents(categoryFromCents(category))}
        <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  );
}

/** Landing-page catalog: the 14 Click2Mail product families as an icon grid. */
export function ProductShowcase() {
  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        data-ocid="products.grid"
      >
        {CATALOG.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {CATALOG.length} product families · {CATALOG_SIZE_COUNT} sizes ·
        printed, addressed and mailed by Click2Mail. Prices include print,
        postage and CASS verification.
      </p>
    </div>
  );
}

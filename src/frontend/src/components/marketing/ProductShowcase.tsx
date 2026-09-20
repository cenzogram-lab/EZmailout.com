import { Badge } from "@/components/ui/badge";
import { type PricingRowUi, formatCents, getPricingRow } from "@/lib/pricing";
import { MailClass, ProductType } from "@/types";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Mail,
  Package,
  ShieldCheck,
} from "lucide-react";

interface ShowcaseProduct {
  productType: ProductType;
  name: string;
  tagline: string;
  icon: LucideIcon;
  layoutVariants: string[];
}

const PRODUCTS: ShowcaseProduct[] = [
  {
    productType: ProductType.Postcard,
    name: "Postcards",
    tagline:
      "Full-color both sides on gloss UV stock. The fastest way to get a local offer read.",
    icon: Mail,
    layoutVariants: ["4x6", "6x9", "6x11"],
  },
  {
    productType: ProductType.Letter,
    name: "Letters",
    tagline:
      "8.5×11 pages folded into a #10 double-window envelope. Full color or black & white.",
    icon: FileText,
    layoutVariants: ["letter"],
  },
  {
    productType: ProductType.SelfMailer,
    name: "Self-Mailers & Brochures",
    tagline:
      "Bifold and trifold panels tabbed shut — no envelope, maximum room for menus and catalogs.",
    icon: Package,
    layoutVariants: ["6x18_bifold", "11x17_trifold"],
  },
  {
    productType: ProductType.SnapPack,
    name: "Snap Packs",
    tagline:
      "Pressure-sealed, perforated security mailers for notices, statements and checks.",
    icon: ShieldCheck,
    layoutVariants: ["8.5x11_perforated"],
  },
  {
    productType: ProductType.Booklet,
    name: "Booklets",
    tagline:
      "Saddle-stitched multi-page catalogs and reports, printed and mailed as one piece.",
    icon: BookOpen,
    layoutVariants: ["multi_page"],
  },
];

function mailClassLabel(mailClass: MailClass): string {
  return mailClass === MailClass.FirstClass ? "First-Class" : "Marketing Mail";
}

function mailClassBadgeClass(mailClass: MailClass): string {
  return mailClass === MailClass.FirstClass
    ? "border-transparent bg-accent/15 text-accent"
    : "border-transparent bg-emerald-brand/10 text-emerald-brand";
}

function resolveRows(variants: string[]): PricingRowUi[] {
  const rows: PricingRowUi[] = [];
  for (const variant of variants) {
    const row = getPricingRow(variant);
    if (row) rows.push(row);
  }
  return rows;
}

function ProductCard({ product }: { product: ShowcaseProduct }) {
  const rows = resolveRows(product.layoutVariants);
  const fromCents = rows.length
    ? Math.min(...rows.map((r) => r.retailPriceCents))
    : 0;
  const mailClasses = Array.from(new Set(rows.map((r) => r.mailClass)));
  const Icon = product.icon;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      data-ocid={`products.card.${product.productType.toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {mailClasses.map((mailClass) => (
            <Badge
              key={mailClass}
              variant="outline"
              className={mailClassBadgeClass(mailClass)}
            >
              {mailClassLabel(mailClass)}
            </Badge>
          ))}
        </div>
      </div>

      <h4 className="mt-4 font-display text-lg font-bold text-foreground">
        {product.name}
      </h4>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {product.tagline}
      </p>

      <ul className="mt-4 flex-1 space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.layoutVariant}
            className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
          >
            <span className="font-medium text-foreground">
              {row.displayName}
            </span>
            <span className="font-mono text-muted-foreground">
              {formatCents(row.retailPriceCents)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            From
          </div>
          <div className="font-display text-xl font-bold text-primary">
            {formatCents(fromCents)}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              / piece
            </span>
          </div>
        </div>
        <Link
          to="/wizard"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-accent transition-smooth hover:bg-accent/10"
          data-ocid={`products.design_one.${product.productType.toLowerCase()}.link`}
        >
          Design one
          <ArrowRight className="size-4 transition-smooth group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/** All five EZmailout product families with live ledger pricing. */
export function ProductShowcase() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((product) => (
        <ProductCard key={product.productType} product={product} />
      ))}
    </div>
  );
}

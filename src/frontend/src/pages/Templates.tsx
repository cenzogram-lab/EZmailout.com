import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productTypeLabel } from "@/lib/format";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import { useWizardStore } from "@/store/wizard";
import type { DesignTemplate } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LayoutTemplate, QrCode, Sparkles } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["All", ...TEMPLATE_CATEGORIES] as const;

type Category = (typeof CATEGORIES)[number];

function TemplateCard({ template }: { template: DesignTemplate }) {
  const navigate = useNavigate();
  const store = useWizardStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleUseTemplate = () => {
    store.setProduct({
      productType: template.productType,
      layoutVariant: template.layoutVariant,
    });
    store.setLayout(template.layoutVariant);
    store.setDesignTemplate(template);
    store.setCurrentStep(3);
    navigate({ to: "/wizard" });
  };

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-ocid={`template.card.${template.id}`}
    >
      {/* Visual preview */}
      <div
        className="relative flex h-48 w-full items-center justify-center overflow-hidden"
        style={{ background: template.gradient }}
      >
        <div
          className="absolute -right-6 -top-6 size-24 rounded-full opacity-20"
          style={{ backgroundColor: template.accentColor }}
        />
        <div
          className="absolute -bottom-4 -left-4 size-16 rotate-45 opacity-15"
          style={{ backgroundColor: template.accentColor }}
        />
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: template.accentColor }}
        />

        <div
          className="absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: template.accentColor }}
        >
          {template.overlayText}
        </div>

        {template.hasQrCode && (
          <div
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
            title="Includes a dynamic QR tracking code"
          >
            <QrCode className="size-3" />
            QR
          </div>
        )}

        <div className="relative z-10 px-6 text-center">
          {template.textBlocks.slice(0, 2).map((tb, i) => (
            <div
              key={tb.text}
              className="font-display font-bold"
              style={{
                color: tb.color,
                fontSize: i === 0 ? "1.1rem" : "0.75rem",
                marginTop: i > 0 ? "0.35rem" : 0,
                opacity: 0.95,
              }}
            >
              {tb.text}
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          {template.sizeLabel}
        </div>

        {/* Hover overlay with CTA */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <Button
            onClick={handleUseTemplate}
            data-ocid={`template.use.${template.id}.button`}
            className="gap-2 bg-primary text-primary-foreground shadow-xl hover:bg-primary/90"
          >
            <Sparkles className="size-4" />
            Use This Template
          </Button>
        </div>
      </div>

      {/* Card info */}
      <div className="p-4">
        <h3 className="font-display text-sm font-semibold leading-snug text-foreground">
          {template.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px]"
            data-ocid={`template.badge_product.${template.id}`}
          >
            {productTypeLabel(template.productType)}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px]"
            data-ocid={`template.badge_industry.${template.id}`}
          >
            {template.industry}
          </Badge>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {template.sizeLabel}
          </span>
        </div>
        {/* Always-visible CTA for touch devices */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-1.5 sm:hidden"
          onClick={handleUseTemplate}
          data-ocid={`template.use_mobile.${template.id}.button`}
        >
          <Sparkles className="size-3.5" />
          Use this template
        </Button>
      </div>
    </div>
  );
}

export function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filteredTemplates =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutTemplate className="size-7" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              EZmailout templates
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              {TEMPLATES.length} print-ready starting points sized for every
              format we mail. Pick one, tweak it in the design canvas, and
              launch at wholesale rates.
            </p>
          </div>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                data-ocid={`template.filter.${cat.toLowerCase().replace(/[^a-z0-9]/g, "_")}.button`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutTemplate className="size-12 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try selecting a different category.
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            Want to build from scratch?{" "}
            <Link
              to="/wizard"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              data-ocid="templates.start_scratch.link"
            >
              Start a blank campaign
              <ArrowRight className="size-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizard";
import type { DesignTemplate, ProductType } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LayoutTemplate, Sparkles } from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
  "All",
  "Postcards",
  "Letters & Envelopes",
  "Self-Mailers",
  "Snap Packs",
  "Booklets",
] as const;

type Category = (typeof CATEGORIES)[number];

interface TemplateDef {
  id: string;
  name: string;
  category: string;
  productType: ProductType;
  layoutVariant: string;
  thumbnailDescription: string;
  backgroundColor: string;
  textBlocks: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  }[];
  hasQrCode: boolean;
  sizeLabel: string;
  industry: string;
  gradient: string;
  accentColor: string;
  overlayText: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "pc-001",
    name: "Real Estate Just Listed 4x6",
    category: "Postcards",
    productType: "Postcard" as ProductType,
    layoutVariant: "4x6",
    thumbnailDescription:
      "Dark navy real estate card with address text and For Sale badge",
    backgroundColor: "#0f1a2e",
    textBlocks: [
      { text: "JUST LISTED", x: 20, y: 20, fontSize: 18, color: "#ffffff" },
      { text: "123 Main Street", x: 20, y: 50, fontSize: 14, color: "#cbd5e1" },
    ],
    hasQrCode: false,
    sizeLabel: '4" × 6"',
    industry: "Real Estate",
    gradient: "linear-gradient(135deg, #0f1a2e 0%, #1e3a5f 50%, #0f1a2e 100%)",
    accentColor: "#f59e0b",
    overlayText: "FOR SALE",
  },
  {
    id: "pc-002",
    name: "Cart Abandonment Retargeting 4x6",
    category: "Postcards",
    productType: "Postcard" as ProductType,
    layoutVariant: "4x6",
    thumbnailDescription:
      "Warm gradient with We miss you copy for e-commerce retargeting",
    backgroundColor: "#2d1b14",
    textBlocks: [
      { text: "We miss you!", x: 20, y: 20, fontSize: 18, color: "#ffffff" },
      {
        text: "Come back and save 15%",
        x: 20,
        y: 50,
        fontSize: 12,
        color: "#fed7aa",
      },
    ],
    hasQrCode: true,
    sizeLabel: '4" × 6"',
    industry: "E-Commerce",
    gradient: "linear-gradient(135deg, #2d1b14 0%, #7c2d12 50%, #ea580c 100%)",
    accentColor: "#f97316",
    overlayText: "15% OFF",
  },
  {
    id: "pc-003",
    name: "Restaurant Grand Opening 6x9",
    category: "Postcards",
    productType: "Postcard" as ProductType,
    layoutVariant: "6x9",
    thumbnailDescription:
      "Bold red and gold restaurant grand opening announcement",
    backgroundColor: "#450a0a",
    textBlocks: [
      { text: "GRAND OPENING", x: 20, y: 20, fontSize: 20, color: "#fef08a" },
      {
        text: "Free appetizer with entrée",
        x: 20,
        y: 55,
        fontSize: 12,
        color: "#fca5a5",
      },
    ],
    hasQrCode: false,
    sizeLabel: '6" × 9"',
    industry: "Retail + Restaurants",
    gradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #b45309 100%)",
    accentColor: "#facc15",
    overlayText: "NOW OPEN",
  },
  {
    id: "pc-004",
    name: "Jumbo Spotlight Farm Mailer 6x11",
    category: "Postcards",
    productType: "Postcard" as ProductType,
    layoutVariant: "6x11",
    thumbnailDescription: "Real estate aerial photo style jumbo farm mailer",
    backgroundColor: "#0c1929",
    textBlocks: [
      { text: "FARM MAILER", x: 20, y: 20, fontSize: 18, color: "#ffffff" },
      {
        text: "Your neighborhood specialist",
        x: 20,
        y: 50,
        fontSize: 12,
        color: "#94a3b8",
      },
    ],
    hasQrCode: true,
    sizeLabel: '6" × 11"',
    industry: "Real Estate",
    gradient: "linear-gradient(135deg, #0c1929 0%, #1e40af 40%, #0f172a 100%)",
    accentColor: "#3b82f6",
    overlayText: "JUMBO",
  },
  {
    id: "pc-005",
    name: "Healthcare Appointment Reminder 6x9",
    category: "Postcards",
    productType: "Postcard" as ProductType,
    layoutVariant: "6x9",
    thumbnailDescription: "Clean clinical white and blue appointment reminder",
    backgroundColor: "#f0f9ff",
    textBlocks: [
      {
        text: "APPOINTMENT REMINDER",
        x: 20,
        y: 20,
        fontSize: 16,
        color: "#0369a1",
      },
      {
        text: "Your health matters to us",
        x: 20,
        y: 48,
        fontSize: 12,
        color: "#0ea5e9",
      },
    ],
    hasQrCode: false,
    sizeLabel: '6" × 9"',
    industry: "Healthcare",
    gradient: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)",
    accentColor: "#0284c7",
    overlayText: "HEALTH",
  },
  {
    id: "lt-001",
    name: "Professional B2B Invoice Letter",
    category: "Letters & Envelopes",
    productType: "Letter" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription: "Clean corporate letterhead with invoice styling",
    backgroundColor: "#ffffff",
    textBlocks: [
      { text: "INVOICE", x: 30, y: 30, fontSize: 22, color: "#1e293b" },
      {
        text: "Invoice #2024-001",
        x: 30,
        y: 65,
        fontSize: 12,
        color: "#64748b",
      },
    ],
    hasQrCode: false,
    sizeLabel: '8.5" × 11"',
    industry: "All",
    gradient: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    accentColor: "#334155",
    overlayText: "B2B",
  },
  {
    id: "lt-002",
    name: "Legal Notice Formal Letter",
    category: "Letters & Envelopes",
    productType: "Letter" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription: "Formal serif style legal notice letterhead",
    backgroundColor: "#fafaf9",
    textBlocks: [
      { text: "LEGAL NOTICE", x: 30, y: 30, fontSize: 20, color: "#292524" },
      {
        text: "Please review the enclosed documents",
        x: 30,
        y: 60,
        fontSize: 11,
        color: "#78716c",
      },
    ],
    hasQrCode: false,
    sizeLabel: '8.5" × 11"',
    industry: "All",
    gradient: "linear-gradient(180deg, #fafaf9 0%, #e7e5e4 100%)",
    accentColor: "#44403c",
    overlayText: "LEGAL",
  },
  {
    id: "lt-003",
    name: "Customer Welcome Package Letter",
    category: "Letters & Envelopes",
    productType: "Letter" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription: "Branded warm introduction welcome letter",
    backgroundColor: "#fffbeb",
    textBlocks: [
      { text: "WELCOME", x: 30, y: 30, fontSize: 24, color: "#92400e" },
      {
        text: "Thank you for choosing us",
        x: 30,
        y: 65,
        fontSize: 12,
        color: "#b45309",
      },
    ],
    hasQrCode: true,
    sizeLabel: '8.5" × 11"',
    industry: "E-Commerce",
    gradient: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
    accentColor: "#d97706",
    overlayText: "WELCOME",
  },
  {
    id: "sm-001",
    name: "Restaurant Bifold Menu Mailer",
    category: "Self-Mailers",
    productType: "SelfMailer" as ProductType,
    layoutVariant: "6x18-bifold",
    thumbnailDescription: "Food photography style bifold menu panels",
    backgroundColor: "#1a0f0a",
    textBlocks: [
      { text: "MENU", x: 20, y: 20, fontSize: 22, color: "#fef3c7" },
      {
        text: "Seasonal specials inside",
        x: 20,
        y: 55,
        fontSize: 11,
        color: "#d6d3d1",
      },
    ],
    hasQrCode: false,
    sizeLabel: '6" × 18" Bifold',
    industry: "Retail + Restaurants",
    gradient: "linear-gradient(135deg, #1a0f0a 0%, #451a03 50%, #78350f 100%)",
    accentColor: "#fbbf24",
    overlayText: "MENU",
  },
  {
    id: "sm-002",
    name: "Trifold Product Catalog",
    category: "Self-Mailers",
    productType: "SelfMailer" as ProductType,
    layoutVariant: "11x17-trifold",
    thumbnailDescription: "E-commerce product grid trifold catalog",
    backgroundColor: "#0f172a",
    textBlocks: [
      { text: "SPRING CATALOG", x: 20, y: 20, fontSize: 18, color: "#e2e8f0" },
      {
        text: "New arrivals & bestsellers",
        x: 20,
        y: 50,
        fontSize: 11,
        color: "#94a3b8",
      },
    ],
    hasQrCode: true,
    sizeLabel: '11" × 17" Trifold',
    industry: "E-Commerce",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    accentColor: "#818cf8",
    overlayText: "CATALOG",
  },
  {
    id: "sm-003",
    name: "Healthcare Services Brochure",
    category: "Self-Mailers",
    productType: "SelfMailer" as ProductType,
    layoutVariant: "6x18-bifold",
    thumbnailDescription: "Clean medical panels bifold brochure",
    backgroundColor: "#ecfeff",
    textBlocks: [
      { text: "OUR SERVICES", x: 20, y: 20, fontSize: 18, color: "#155e75" },
      {
        text: "Comprehensive care for your family",
        x: 20,
        y: 50,
        fontSize: 11,
        color: "#0891b2",
      },
    ],
    hasQrCode: false,
    sizeLabel: '6" × 18" Bifold',
    industry: "Healthcare",
    gradient: "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
    accentColor: "#06b6d4",
    overlayText: "CARE",
  },
  {
    id: "sp-001",
    name: "Security Notice Snap Pack",
    category: "Snap Packs",
    productType: "SnapPack" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription:
      "Official warning header with perforated edges visual",
    backgroundColor: "#fefce8",
    textBlocks: [
      {
        text: "IMPORTANT NOTICE",
        x: 25,
        y: 25,
        fontSize: 18,
        color: "#854d0e",
      },
      {
        text: "Please open immediately",
        x: 25,
        y: 55,
        fontSize: 11,
        color: "#a16207",
      },
    ],
    hasQrCode: false,
    sizeLabel: '8.5" × 11"',
    industry: "All",
    gradient: "linear-gradient(180deg, #fefce8 0%, #fef9c3 100%)",
    accentColor: "#ca8a04",
    overlayText: "URGENT",
  },
  {
    id: "sp-002",
    name: "Physical Check Mailer",
    category: "Snap Packs",
    productType: "SnapPack" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription: "Check stub style layout with perforated edges",
    backgroundColor: "#f0fdf4",
    textBlocks: [
      {
        text: "PAYMENT ENCLOSED",
        x: 25,
        y: 25,
        fontSize: 18,
        color: "#166534",
      },
      {
        text: "Do not bend — check inside",
        x: 25,
        y: 55,
        fontSize: 11,
        color: "#15803d",
      },
    ],
    hasQrCode: false,
    sizeLabel: '8.5" × 11"',
    industry: "All",
    gradient: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
    accentColor: "#16a34a",
    overlayText: "CHECK",
  },
  {
    id: "sp-003",
    name: "Insurance Policy Notice",
    category: "Snap Packs",
    productType: "SnapPack" as ProductType,
    layoutVariant: "8.5x11",
    thumbnailDescription: "Formal policy document style with security header",
    backgroundColor: "#eff6ff",
    textBlocks: [
      { text: "POLICY UPDATE", x: 25, y: 25, fontSize: 18, color: "#1e40af" },
      {
        text: "Review changes to your coverage",
        x: 25,
        y: 55,
        fontSize: 11,
        color: "#3b82f6",
      },
    ],
    hasQrCode: false,
    sizeLabel: '8.5" × 11"',
    industry: "Healthcare",
    gradient: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    accentColor: "#2563eb",
    overlayText: "POLICY",
  },
  {
    id: "bk-001",
    name: "Multi-Product Retail Catalog",
    category: "Booklets",
    productType: "Booklet" as ProductType,
    layoutVariant: "landscape-booklet",
    thumbnailDescription: "Colorful product grid multi-page catalog",
    backgroundColor: "#fdf4ff",
    textBlocks: [
      { text: "2024 CATALOG", x: 20, y: 20, fontSize: 18, color: "#86198f" },
      {
        text: "Everything you need in one place",
        x: 20,
        y: 50,
        fontSize: 11,
        color: "#a21caf",
      },
    ],
    hasQrCode: true,
    sizeLabel: "Landscape Booklet",
    industry: "Retail + Restaurants",
    gradient: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #f5d0fe 100%)",
    accentColor: "#c026d3",
    overlayText: "CATALOG",
  },
  {
    id: "bk-002",
    name: "Annual Report Booklet",
    category: "Booklets",
    productType: "Booklet" as ProductType,
    layoutVariant: "landscape-booklet",
    thumbnailDescription: "Corporate executive style annual report",
    backgroundColor: "#f8fafc",
    textBlocks: [
      { text: "ANNUAL REPORT", x: 20, y: 20, fontSize: 18, color: "#334155" },
      {
        text: "Fiscal year 2024 highlights",
        x: 20,
        y: 50,
        fontSize: 11,
        color: "#64748b",
      },
    ],
    hasQrCode: false,
    sizeLabel: "Landscape Booklet",
    industry: "All",
    gradient: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
    accentColor: "#475569",
    overlayText: "REPORT",
  },
  {
    id: "bk-003",
    name: "Healthcare Service Directory",
    category: "Booklets",
    productType: "Booklet" as ProductType,
    layoutVariant: "landscape-booklet",
    thumbnailDescription: "Medical directory pages with service listings",
    backgroundColor: "#ecfeff",
    textBlocks: [
      {
        text: "SERVICE DIRECTORY",
        x: 20,
        y: 20,
        fontSize: 16,
        color: "#155e75",
      },
      {
        text: "Find the right care for you",
        x: 20,
        y: 48,
        fontSize: 11,
        color: "#0e7490",
      },
    ],
    hasQrCode: false,
    sizeLabel: "Landscape Booklet",
    industry: "Healthcare",
    gradient: "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
    accentColor: "#0891b2",
    overlayText: "DIRECTORY",
  },
];

function getCategoryForFilter(filter: Category): string {
  switch (filter) {
    case "Letters & Envelopes":
      return "Letters & Envelopes";
    case "Self-Mailers":
      return "Self-Mailers";
    case "Snap Packs":
      return "Snap Packs";
    default:
      return filter;
  }
}

function TemplateCard({ template }: { template: TemplateDef }) {
  const navigate = useNavigate();
  const store = useWizardStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleUseTemplate = () => {
    const designTemplate: DesignTemplate = {
      id: template.id,
      name: template.name,
      category: template.industry,
      productType: template.productType,
      layoutVariant: template.layoutVariant,
      thumbnailDescription: template.thumbnailDescription,
      backgroundColor: template.backgroundColor,
      textBlocks: template.textBlocks.map((tb, i) => ({
        id: `tb-${i}`,
        text: tb.text,
        x: tb.x,
        y: tb.y,
        fontSize: tb.fontSize,
        color: tb.color,
      })),
      hasQrCode: template.hasQrCode,
      backgroundImage: null,
      qrCode: template.hasQrCode
        ? {
            id: "qr-1",
            x: 300,
            y: 20,
            url: "https://mailcommand.app/track/{{recipientId}}",
            size: 80,
          }
        : null,
    };

    store.setDesignTemplate(designTemplate);
    store.setProduct({
      productType: template.productType,
      layoutVariant: template.layoutVariant,
    });
    store.setLayout(template.layoutVariant);
    store.setCurrentStep(3);
    navigate({ to: "/wizard" });
  };

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-smooth hover:border-primary/40 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-ocid={`template.card.${template.id}`}
    >
      {/* Visual Preview Area */}
      <div
        className="relative flex h-48 w-full items-center justify-center overflow-hidden"
        style={{ background: template.gradient }}
      >
        {/* Decorative geometric shapes */}
        <div
          className="absolute -right-6 -top-6 size-24 rounded-full opacity-20"
          style={{ backgroundColor: template.accentColor }}
        />
        <div
          className="absolute -bottom-4 -left-4 size-16 rotate-45 opacity-15"
          style={{ backgroundColor: template.accentColor }}
        />

        {/* Thin accent bar */}
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: template.accentColor }}
        />

        {/* Overlay text badge */}
        <div
          className="absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: template.accentColor }}
        >
          {template.overlayText}
        </div>

        {/* Simulated text blocks */}
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

        {/* Size label */}
        <div className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          {template.sizeLabel}
        </div>

        {/* Hover overlay with CTA */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <Button
            onClick={handleUseTemplate}
            data-ocid={`template.use_button.${template.id}`}
            className="gap-2 shadow-xl"
          >
            <Sparkles className="size-4" />
            Use This Template
          </Button>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold leading-snug text-foreground">
            {template.name}
          </h3>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px]"
            data-ocid={`template.badge_product.${template.id}`}
          >
            {template.productType}
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
      </div>
    </div>
  );
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filteredTemplates =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter(
          (t) => t.category === getCategoryForFilter(activeCategory),
        );

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutTemplate className="size-7" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Direct Mail Templates
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Professional layouts for every campaign. Pick a template,
              customize your design, and launch.
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                data-ocid={`template.filter.${cat.toLowerCase().replace(/[^a-z0-9]/g, "_")}`}
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

      {/* Template Grid */}
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
            <button
              type="button"
              onClick={() => navigate({ to: "/wizard" })}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              data-ocid="templates.start_scratch_link"
            >
              Start a blank campaign
              <ArrowRight className="size-3.5" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

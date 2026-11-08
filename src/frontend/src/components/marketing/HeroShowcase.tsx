import { LazyTemplateSide } from "@/components/templates/TemplatePreview";
import { type Orientation, getLayoutDims } from "@/lib/printSpec";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { CanvasSideKey, DesignTemplate } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenterVertical,
  Copy,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Mailbox,
  Palette,
  Plus,
  QrCode,
  RotateCw,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The home hero's showcase: real gallery templates rendered on the mail
 * types they print as (postcard front and address side, letter, EDDM® flat,
 * tri-fold brochure), around the studio as it looks on a desktop browser and
 * on a phone. Every piece is laid out by the template engine at that
 * format's real size, so the collage is the product, not a drawing of it.
 *
 * The collage is drawn on a fixed 600 × 636 frame and placed by percentages
 * inside an `@container`, and the mock UIs size their type in `cqw`, so the
 * whole composition scales with its own width: the same picture on a 320 px
 * phone and beside the copy on a desktop.
 */

const FRAME_W = 600;
const FRAME_H = 636;

function template(id: string): DesignTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** A rect on the 600 × 636 frame as percentages of the collage. */
function place(x: number, y: number, w: number): CSSProperties {
  return {
    left: `${(x / FRAME_W) * 100}%`,
    top: `${(y / FRAME_H) * 100}%`,
    width: `${(w / FRAME_W) * 100}%`,
  };
}

function aspectOf(t: DesignTemplate, layout?: string, o?: Orientation) {
  const d = getLayoutDims(layout ?? t.layoutVariant, o ?? t.orientation);
  return d.widthInches / d.heightInches;
}

/** One printed piece: the template side at its format's size, on a card. */
function Artwork({
  t,
  side = "front",
  orientation = t.orientation,
  className,
}: {
  t: DesignTemplate;
  side?: CanvasSideKey;
  /** The orientation to lay the template out in (its showcase one by default). */
  orientation?: Orientation;
  className?: string;
}) {
  return (
    <div
      data-template-preview
      className={cn(
        "overflow-hidden rounded-[0.6cqw] bg-white shadow-[0_1.4cqw_3cqw_-0.8cqw_rgb(15_23_42/0.35),0_0.3cqw_0.8cqw_rgb(15_23_42/0.12)] ring-1 ring-black/5",
        className,
      )}
    >
      <LazyTemplateSide
        template={t}
        side={side}
        orientation={orientation}
        aspect={aspectOf(t, t.layoutVariant, orientation)}
      />
    </div>
  );
}

/** The labelled callout over a piece, pointing at it. */
function Tag({
  children,
  pointer = "down",
  ocid,
}: {
  children: ReactNode;
  pointer?: "down" | "up";
  ocid: string;
}) {
  return (
    <span
      className="relative inline-flex items-center whitespace-nowrap rounded-full bg-primary px-[2.2cqw] py-[0.9cqw] text-[max(9px,2cqw)] font-extrabold uppercase leading-none tracking-[0.08em] text-primary-foreground shadow-[0_0.8cqw_2cqw_-0.6cqw_rgb(92_94_232/0.65)]"
      data-ocid={ocid}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 size-[1.4cqw] -translate-x-1/2 rotate-45 bg-primary",
          pointer === "down" ? "-bottom-[0.6cqw]" : "-top-[0.6cqw]",
        )}
      />
    </span>
  );
}

/* ─── Desktop browser with the studio ─── */
const RAIL: LucideIcon[] = [
  LayoutTemplate,
  Type,
  Layers,
  Upload,
  Palette,
  QrCode,
  Sparkles,
];

function DesktopStudio({
  t,
  orientation,
}: {
  t: DesignTemplate;
  orientation?: Orientation;
}) {
  return (
    <div
      aria-hidden="true"
      data-ocid="hero.showcase.desktop_preview"
      className="overflow-hidden rounded-[1.6cqw] border border-hairline bg-card shadow-raised ring-1 ring-primary/10"
    >
      {/* Window bar */}
      <div className="flex items-center gap-[0.8cqw] border-b border-hairline bg-card-raised px-[1.6cqw] py-[1.1cqw]">
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span
            key={c}
            className="size-[1.3cqw] shrink-0 rounded-full"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="ml-[1cqw] min-w-0 truncate rounded-full border border-hairline bg-well px-[1.6cqw] py-[0.4cqw] text-[1.45cqw] font-medium text-muted-foreground">
          ezmailout.com/wizard · Design
        </span>
        <span className="btn-3d-primary ml-auto shrink-0 rounded-full px-[1.6cqw] py-[0.45cqw] text-[1.45cqw] font-semibold">
          Continue to review
        </span>
      </div>
      <div className="flex">
        {/* Tool rail */}
        <div className="flex w-[7cqw] shrink-0 flex-col items-center gap-[1cqw] border-r border-hairline bg-card-raised py-[1.6cqw]">
          {RAIL.map((Icon, i) => (
            <span
              key={Icon.displayName ?? i}
              className={cn(
                "flex size-[4.4cqw] items-center justify-center rounded-[1.1cqw]",
                i === 0
                  ? "bg-primary/15 text-primary-ink ring-1 ring-primary/25"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-[2.2cqw]" strokeWidth={1.9} />
            </span>
          ))}
        </div>
        {/* Artboard */}
        <div className="studio-dotgrid relative flex min-w-0 flex-1 flex-col items-center justify-center px-[4cqw] pb-[3.4cqw] pt-[6.4cqw]">
          <div className="absolute left-1/2 top-[1.6cqw] flex -translate-x-1/2 items-center gap-[0.9cqw] rounded-full border border-hairline bg-popover px-[1.2cqw] py-[0.7cqw] shadow-raised">
            <span className="px-[0.4cqw] text-[1.25cqw] font-semibold uppercase text-muted-foreground">
              text
            </span>
            <AlignCenterVertical className="size-[1.9cqw] text-primary" />
            <RotateCw className="size-[1.9cqw] text-muted-foreground" />
            <Copy className="size-[1.9cqw] text-muted-foreground" />
            <Trash2 className="size-[1.9cqw] text-destructive" />
          </div>
          <div className="relative w-full">
            {/* Bleed frame and the selected sheet, as the studio draws them. */}
            <div className="absolute -inset-[0.7cqw] rounded-[0.3cqw] border-[0.3cqw] border-[#ef4444]/75" />
            <Artwork
              t={t}
              orientation={orientation}
              className="rounded-[0.2cqw]"
            />
            <div className="pointer-events-none absolute inset-x-[8%] top-[14%] h-[30%] rounded-[0.2cqw] outline outline-[0.35cqw] outline-primary">
              {[
                "-left-[0.9cqw] -top-[0.9cqw]",
                "-right-[0.9cqw] -top-[0.9cqw]",
                "-left-[0.9cqw] -bottom-[0.9cqw]",
                "-right-[0.9cqw] -bottom-[0.9cqw]",
              ].map((pos) => (
                <span
                  key={pos}
                  className={`absolute ${pos} size-[1.8cqw] rounded-full border-[0.3cqw] border-primary bg-white`}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Inspector */}
        <div className="flex w-[15cqw] shrink-0 flex-col gap-[1.4cqw] border-l border-hairline bg-card-raised p-[1.6cqw]">
          <span className="text-[1.4cqw] font-bold uppercase tracking-wider text-muted-foreground">
            Text
          </span>
          <span className="truncate rounded-[0.8cqw] border border-hairline bg-card px-[1cqw] py-[0.7cqw] text-[1.5cqw] font-semibold text-foreground">
            {t.fonts.head}
          </span>
          <div className="space-y-[0.7cqw]">
            <div className="h-[0.6cqw] rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <div className="h-[0.6cqw] rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-[0.8cqw]">
            {(
              [
                ["accent", t.palette.accent],
                ["ink", t.palette.ink],
                ["bg", t.palette.bg],
                ["brand", "#5c5ee8"],
                ["white", "#ffffff"],
                ["amber", "#f59e0b"],
              ] as const
            ).map(([slot, c]) => (
              <span
                key={slot}
                className="aspect-square rounded-full border border-hairline-strong"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-auto flex items-center gap-[0.6cqw] rounded-[0.8cqw] bg-emerald-brand/10 px-[0.8cqw] py-[0.6cqw]">
            <span className="size-[1cqw] shrink-0 rounded-full bg-emerald-brand" />
            <span className="text-[1.25cqw] font-semibold text-emerald-brand">
              Print ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Phone with the studio ─── */
const PHONE_RAIL: LucideIcon[] = [
  LayoutTemplate,
  Type,
  Layers,
  ImageIcon,
  Palette,
  QrCode,
  Sparkles,
  Upload,
];

function PhoneStudio({ t }: { t: DesignTemplate }) {
  return (
    <div
      aria-hidden="true"
      data-ocid="hero.showcase.phone_preview"
      className="rounded-[4.6cqw] bg-[#0b0d14] p-[1cqw] shadow-[0_2.4cqw_5cqw_-1.6cqw_rgb(15_23_42/0.55)] ring-1 ring-white/10"
    >
      <div className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[3.8cqw] bg-background">
        {/* Status bar and island */}
        <div className="flex items-center justify-between px-[3cqw] pt-[1.5cqw] text-[1.6cqw] font-semibold text-foreground">
          <span>9:41</span>
          <span className="h-[1.9cqw] w-[8cqw] rounded-full bg-[#0b0d14]" />
          <span className="h-[1cqw] w-[2.2cqw] rounded-[0.3cqw] border border-foreground/70" />
        </div>
        {/* Glass header pill */}
        <div className="mx-[1.4cqw] mt-[1.2cqw] flex items-center gap-[1cqw] rounded-full border border-hairline bg-popover/95 px-[1.2cqw] py-[0.9cqw] shadow-surface">
          <span className="size-[3cqw] shrink-0 rounded-full bg-primary/15 ring-1 ring-primary/40" />
          <span className="text-[1.9cqw] font-black tracking-tight text-primary">
            EZmailout<span className="text-[#e5484d]">.</span>
          </span>
          <span className="ml-auto size-[3cqw] shrink-0 rounded-full bg-primary" />
        </div>
        {/* Wizard steps */}
        <div className="mx-[1.4cqw] mt-[1.4cqw] grid grid-cols-4 gap-[0.4cqw] rounded-full bg-well p-[0.4cqw]">
          {["Size", "List", "Design", "Send"].map((s, i) => (
            <span
              key={s}
              className={cn(
                "rounded-full py-[0.5cqw] text-center text-[1.3cqw] font-semibold",
                i === 2
                  ? "bg-card text-foreground shadow-surface"
                  : "text-muted-foreground",
              )}
            >
              {s}
            </span>
          ))}
        </div>
        {/* Artboard */}
        <div className="studio-dotgrid relative mx-[1.4cqw] mt-[1.4cqw] rounded-[2cqw] border border-hairline px-[1.8cqw] pb-[2.2cqw] pt-[5cqw]">
          <div className="absolute left-1/2 top-[1cqw] flex -translate-x-1/2 items-center gap-[0.7cqw] rounded-full border border-hairline bg-popover px-[1cqw] py-[0.5cqw] shadow-raised">
            <RotateCw className="size-[1.6cqw] text-primary" />
            <Copy className="size-[1.6cqw] text-muted-foreground" />
            <Trash2 className="size-[1.6cqw] text-destructive" />
          </div>
          <div className="relative">
            <Artwork t={t} className="rounded-[0.2cqw]" />
            <div className="absolute inset-x-[10%] bottom-[12%] h-[26%] outline outline-[0.3cqw] outline-primary" />
          </div>
        </div>
        {/* Rail: the phone's 4 × 2 grid */}
        <div className="mx-[1.4cqw] mt-[1.4cqw] grid grid-cols-4 gap-[0.8cqw]">
          {PHONE_RAIL.map((Icon, i) => (
            <span
              key={Icon.displayName ?? i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[1.4cqw] border border-hairline",
                i === 0
                  ? "bg-primary/15 text-primary-ink ring-1 ring-primary/25"
                  : "bg-card text-muted-foreground",
              )}
            >
              <Icon className="size-[2.2cqw]" strokeWidth={1.9} />
            </span>
          ))}
        </div>
        {/* Tab dock with the raised Create button */}
        <div className="absolute inset-x-[1.4cqw] bottom-[1.6cqw] flex items-end justify-between rounded-full border border-hairline bg-popover/95 px-[2cqw] py-[1cqw] shadow-raised">
          <Home className="size-[2.2cqw] text-primary" />
          <LayoutTemplate className="size-[2.2cqw] text-muted-foreground" />
          <span className="btn-3d-primary -mt-[3cqw] flex size-[5.2cqw] items-center justify-center rounded-full">
            <Plus className="size-[2.6cqw]" strokeWidth={2.6} />
          </span>
          <Mailbox className="size-[2.2cqw] text-muted-foreground" />
          <User className="size-[2.2cqw] text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

/* ─── The collage ─── */
const SHOW = {
  desktop: template("re-open-house-classic"),
  phone: template("rest-pizza-offer"),
  postcard: template("dental-reminder-gradient"),
  letter: template("re-seller-letter"),
  eddm: template("eddm-plumbing-poster"),
  brochure: template("spa-menu-brochure"),
};

export function HeroShowcase({ className }: { className?: string }) {
  return (
    <div
      className={cn("@container relative w-full", className)}
      data-ocid="hero.showcase"
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
      >
        {/* Desktop studio */}
        <div className="absolute z-10" style={place(0, 40, 404)}>
          <DesktopStudio t={SHOW.desktop} orientation="rotated" />
        </div>
        <div className="absolute z-30" style={place(20, 0, 200)}>
          <Tag ocid="hero.showcase.tag.desktop">Desktop studio</Tag>
        </div>

        {/* Phone studio */}
        <div className="absolute z-20" style={place(428, 14, 168)}>
          <PhoneStudio t={SHOW.phone} />
        </div>
        <div
          className="absolute z-30 flex justify-center"
          style={place(428, 368, 168)}
        >
          <Tag pointer="up" ocid="hero.showcase.tag.mobile">
            Mobile studio
          </Tag>
        </div>

        {/* Postcard: front over its address side */}
        <div
          className="absolute z-20 rotate-[-6deg]"
          style={place(52, 300, 212)}
        >
          <Artwork t={SHOW.postcard} side="back" />
        </div>
        <div className="absolute z-20 rotate-[2deg]" style={place(6, 326, 236)}>
          <Artwork t={SHOW.postcard} />
        </div>
        <div className="absolute z-30" style={place(18, 276, 200)}>
          <Tag ocid="hero.showcase.tag.postcards">Postcards</Tag>
        </div>

        {/* Letter */}
        <div
          className="absolute z-[21] rotate-[3deg]"
          style={place(262, 290, 122)}
        >
          <Artwork t={SHOW.letter} />
        </div>
        <div
          className="absolute z-30 flex justify-center"
          style={place(262, 258, 122)}
        >
          <Tag ocid="hero.showcase.tag.letters">Letters</Tag>
        </div>

        {/* Brochure */}
        <div
          className="absolute z-[26] rotate-[-2deg]"
          style={place(178, 436, 208)}
        >
          <Artwork t={SHOW.brochure} />
        </div>
        <div
          className="absolute z-30 flex justify-center"
          style={place(178, 604, 208)}
        >
          <Tag pointer="up" ocid="hero.showcase.tag.brochures">
            Brochures
          </Tag>
        </div>

        {/* EDDM flat */}
        <div
          className="absolute z-[24] rotate-[3deg]"
          style={place(398, 420, 198)}
        >
          <Artwork t={SHOW.eddm} orientation="rotated" />
        </div>
        <div
          className="absolute z-30 flex justify-center"
          style={place(398, 548, 198)}
        >
          <Tag pointer="up" ocid="hero.showcase.tag.eddm">
            EDDM®
          </Tag>
        </div>
      </div>
    </div>
  );
}

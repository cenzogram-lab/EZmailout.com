import type { CSSProperties, ReactNode } from "react";
import { alpha, mix } from "./color";
import { Icon } from "./icons";
import { LogoMark, QrCode } from "./placeholders";
import type { ResolvedTheme } from "./theme";
import type {
  FormatDef,
  MailContent,
  MailTemplateSpec,
  Offer,
  Side,
} from "./types";

/** Everything a layout needs: theme, content, pixel geometry and a size unit. */
export interface Ctx {
  t: ResolvedTheme;
  c: MailContent;
  /** 1 unit = 1% of the piece's short side (px) — all type and spacing scale with it */
  u: number;
  /** outer box (includes bleed when printing) */
  W: number;
  H: number;
  /** distance from the outer edge to the safe area */
  inset: number;
  bleedPx: number;
  fmt: FormatDef;
  seed: number;
  /** the template being rendered (campaign, mail type, inside spec …) */
  spec: MailTemplateSpec;
  /** which surface is being rendered */
  side: Side;
  /**
   * Area the layout must leave empty (piece px): the studio's USPS address
   * zone, so the message column of an address side ends before it.
   */
  keepOut?: { x: number; y: number; w: number; h: number };
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function Eyebrow({
  ctx,
  text,
  t = ctx.t,
  size = 2.7,
  style,
}: {
  ctx: Ctx;
  text?: string;
  t?: ResolvedTheme;
  size?: number;
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <p style={{ ...t.labelCss, fontSize: ctx.u * size, ...style }}>{text}</p>
  );
}

/**
 * A box whose content is zoomed down (client-side, see fit.ts) when it would
 * overflow. The outer box needs a definite height (absolute top+bottom, an
 * explicit height, a stretched flex item) or a `maxHeight`; the inner box is
 * `height: 100%` unless `fill` is false.
 */
export function FitBox({
  children,
  style,
  innerStyle,
  fill = true,
  min,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  innerStyle?: CSSProperties;
  fill?: boolean;
  min?: number;
}) {
  return (
    <div
      data-fitbox=""
      data-fit-min={min}
      style={{ overflow: "hidden", ...style }}
    >
      <div style={{ ...(fill ? { height: "100%" } : {}), ...innerStyle }}>
        {children}
      </div>
    </div>
  );
}

export function Headline({
  ctx,
  text,
  t = ctx.t,
  size = 11,
  script,
  style,
  lines,
  fit = true,
}: {
  ctx: Ctx;
  text?: string;
  t?: ResolvedTheme;
  size?: number;
  script?: boolean;
  style?: CSSProperties;
  lines?: number;
  fit?: boolean;
}) {
  if (!text) return null;
  const fitted = fit && Boolean(lines) && !script;
  const css: CSSProperties = script
    ? {
        fontFamily: t.font.accent,
        fontWeight: 400,
        fontStyle: "normal",
        textTransform: "none",
        letterSpacing: 0,
        lineHeight: 1.2,
        margin: 0,
        color: t.displayCss.color,
        fontSize: ctx.u * size * (t.scriptAccent ? 1.25 : 1),
        padding: `0 ${ctx.u * 1.5}px`,
      }
    : { ...t.displayCss, fontSize: ctx.u * size * t.display.scale };
  // script faces overhang their line box, so they are never clamped
  // clamped headlines have overflow:hidden, which would let a flex column crush them — never shrink
  const clamp: CSSProperties =
    lines && !script
      ? {
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          overflowWrap: "anywhere",
          flexShrink: 0,
        }
      : { flexShrink: 0 };
  return (
    <h1
      data-fittext={fitted ? "" : undefined}
      data-fit-base={fitted ? css.fontSize : undefined}
      style={{ ...css, ...clamp, ...style }}
    >
      {text}
    </h1>
  );
}

export function Sub({
  ctx,
  text,
  t = ctx.t,
  size = 3.6,
  style,
}: {
  ctx: Ctx;
  text?: string;
  t?: ResolvedTheme;
  size?: number;
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <p
      style={{
        ...t.bodyCss,
        fontWeight: 600,
        fontSize: ctx.u * size,
        lineHeight: 1.3,
        ...style,
      }}
    >
      {text}
    </p>
  );
}

export function Body({
  ctx,
  text,
  t = ctx.t,
  size = 3.1,
  style,
}: {
  ctx: Ctx;
  text?: string;
  t?: ResolvedTheme;
  size?: number;
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <p
      style={{
        ...t.bodyCss,
        fontSize: ctx.u * size,
        color: t.colors.muted,
        ...style,
      }}
    >
      {text}
    </p>
  );
}

export function Bullets({
  ctx,
  items,
  t = ctx.t,
  size = 3.1,
  icon = "check",
  columns = 1,
  style,
}: {
  ctx: Ctx;
  items?: string[];
  t?: ResolvedTheme;
  size?: number;
  icon?: string;
  columns?: 1 | 2;
  style?: CSSProperties;
}) {
  if (!items?.length) return null;
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: ctx.u * 1.6,
        ...style,
      }}
    >
      {items.map((it, i) => (
        <li
          key={i}
          style={{
            ...t.bodyCss,
            fontSize: ctx.u * size,
            display: "flex",
            alignItems: "flex-start",
            gap: ctx.u * 1.6,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: ctx.u * 4,
              height: ctx.u * 4,
              borderRadius: "50%",
              background: t.colors.accent2,
              color: t.colors.onAccent2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: ctx.u * 0.1,
            }}
          >
            <Icon name={icon} size={ctx.u * 2.4} strokeWidth={2.6} />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({
  ctx,
  items,
  t = ctx.t,
  size = 3.2,
  style,
}: {
  ctx: Ctx;
  items?: string[];
  t?: ResolvedTheme;
  size?: number;
  style?: CSSProperties;
}) {
  if (!items?.length) return null;
  return (
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: ctx.u * 1.8,
        ...style,
      }}
    >
      {items.map((it, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: ctx.u * 2.2,
            alignItems: "baseline",
            ...t.bodyCss,
            fontSize: ctx.u * size,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              ...t.displayCss,
              fontSize: ctx.u * size * 1.5,
              color:
                t.colors.accent2 === t.colors.bg
                  ? t.colors.text
                  : t.colors.accent2,
              minWidth: ctx.u * 5,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

export function CodeChip({
  ctx,
  code,
  t = ctx.t,
  style,
}: { ctx: Ctx; code: string; t?: ResolvedTheme; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: ctx.u * 1.2,
        padding: `${ctx.u * 0.9}px ${ctx.u * 2}px`,
        border: `1px dashed ${t.colors.text}`,
        borderRadius: Math.min(t.radius, 6),
        fontFamily: t.font.body,
        fontSize: ctx.u * 2.6,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: t.colors.text,
        ...style,
      }}
    >
      <Icon name="tag" size={ctx.u * 2.6} />
      {code}
    </span>
  );
}

/** Dashed-border coupon box. */
export function Coupon({
  ctx,
  offer,
  t = ctx.t,
  title,
  compact,
  style,
}: {
  ctx: Ctx;
  offer?: Offer;
  t?: ResolvedTheme;
  title?: string;
  compact?: boolean;
  style?: CSSProperties;
}) {
  if (!offer) return null;
  const u = ctx.u;
  return (
    <div
      style={{
        border: `${Math.max(1.5, u * 0.4)}px dashed ${t.colors.text}`,
        borderRadius: Math.min(t.radius, 10),
        padding: compact
          ? `${u * 2.4}px ${u * 3}px`
          : `${u * 3.2}px ${u * 3.6}px`,
        display: "flex",
        flexDirection: "column",
        gap: u * 1.2,
        background: alpha(t.colors.surface, 0.9),
        color: t.colors.text,
        boxSizing: "border-box",
        position: "relative",
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -u * 1.6,
          left: u * 3,
          background: t.colors.accent2,
          color: t.colors.onAccent2,
          fontFamily: t.font.body,
          fontSize: u * 2.2,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: `${u * 0.5}px ${u * 1.6}px`,
          borderRadius: 3,
        }}
      >
        {title ?? "Coupon"}
      </span>
      <span
        style={{
          ...t.displayCss,
          fontSize: u * (compact ? 8 : 10.5),
          color: t.colors.text,
        }}
      >
        {offer.headline}
      </span>
      <span style={{ ...t.bodyCss, fontSize: u * 3.1, fontWeight: 600 }}>
        {offer.detail}
      </span>
      <span
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: u * 2,
          alignItems: "center",
        }}
      >
        {offer.code && <CodeChip ctx={ctx} code={offer.code} t={t} />}
        {offer.expires && (
          <span
            style={{ ...t.bodyCss, fontSize: u * 2.4, color: t.colors.muted }}
          >
            Expires {offer.expires}
          </span>
        )}
      </span>
      {offer.fineprint && (
        <span style={{ ...t.bodyCss, fontSize: u * 2, color: t.colors.muted }}>
          {offer.fineprint}
        </span>
      )}
    </div>
  );
}

/** Giant offer line, e.g. "20% OFF" with detail below. */
export function OfferBig({
  ctx,
  offer,
  t = ctx.t,
  size = 20,
  align = "left",
  style,
}: {
  ctx: Ctx;
  offer?: Offer;
  t?: ResolvedTheme;
  size?: number;
  align?: "left" | "center";
  style?: CSSProperties;
}) {
  if (!offer) return null;
  const u = ctx.u;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: u * 1,
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        ...style,
      }}
    >
      <span
        style={{
          ...t.displayCss,
          fontSize: u * size * t.display.scale,
          lineHeight: 0.9,
        }}
      >
        {offer.headline}
      </span>
      <span
        style={{
          ...t.bodyCss,
          fontWeight: 700,
          fontSize: u * 3.8,
          letterSpacing: "0.04em",
        }}
      >
        {offer.detail}
      </span>
      {(offer.code || offer.expires) && (
        <span
          style={{
            display: "flex",
            gap: u * 2,
            alignItems: "center",
            marginTop: u * 1,
            flexWrap: "wrap",
            justifyContent: align === "center" ? "center" : "flex-start",
          }}
        >
          {offer.code && <CodeChip ctx={ctx} code={offer.code} t={t} />}
          {offer.expires && (
            <span style={{ ...t.bodyCss, fontSize: u * 2.4 }}>
              Expires {offer.expires}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CTA / contact / business                                            */
/* ------------------------------------------------------------------ */

export function Cta({
  ctx,
  label,
  t = ctx.t,
  size = 3,
  fill,
  style,
}: {
  ctx: Ctx;
  label?: string;
  t?: ResolvedTheme;
  size?: number;
  fill?: "accent" | "accent2" | "ink" | "outline";
  style?: CSSProperties;
}) {
  if (!label) return null;
  const u = ctx.u;
  const f = fill ?? "accent";
  const bg =
    f === "accent"
      ? t.colors.accent
      : f === "accent2"
        ? t.colors.accent2
        : f === "ink"
          ? t.ink
          : "transparent";
  const fg =
    f === "accent"
      ? t.colors.onAccent
      : f === "accent2"
        ? t.colors.onAccent2
        : f === "ink"
          ? t.dark && t.ink === t.colors.text
            ? t.colors.bg
            : "#FFFFFF"
          : t.colors.text;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: u * 1.6,
        padding: `${u * 2}px ${u * 4}px`,
        borderRadius: t.radius >= 20 ? 999 : Math.min(t.radius, 8),
        background: bg,
        color: fg,
        border:
          f === "outline"
            ? `${Math.max(1.5, u * 0.4)}px solid ${t.colors.text}`
            : "none",
        fontFamily: t.font.body,
        fontWeight: 800,
        fontSize: u * size,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        ...(t.shadow === "hard"
          ? { border: `2px solid ${t.ink}`, boxShadow: `4px 4px 0 ${t.ink}` }
          : {}),
        ...style,
      }}
    >
      {label}
      <Icon name="arrow-right" size={u * size * 1.1} strokeWidth={2.6} />
    </span>
  );
}

export function ContactStrip({
  ctx,
  t = ctx.t,
  size = 2.7,
  direction = "row",
  items,
  style,
}: {
  ctx: Ctx;
  t?: ResolvedTheme;
  size?: number;
  direction?: "row" | "column";
  items?: ("phone" | "website" | "address" | "email")[];
  style?: CSSProperties;
}) {
  const b = ctx.c.business;
  const u = ctx.u;
  const wanted = items ?? ["phone", "website", "address"];
  const rows: { icon: string; text: string }[] = [];
  for (const k of wanted) {
    if (k === "phone" && b.phone) rows.push({ icon: "phone", text: b.phone });
    if (k === "website" && b.website)
      rows.push({ icon: "globe", text: b.website.replace(/^https?:\/\//, "") });
    if (k === "address" && b.address)
      rows.push({
        icon: "map-pin",
        text: b.city ? `${b.address}, ${b.city}` : b.address,
      });
    if (k === "email" && b.email) rows.push({ icon: "mail", text: b.email });
  }
  if (!rows.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        flexWrap: "wrap",
        gap: direction === "row" ? `${u * 1.2}px ${u * 4}px` : u * 1.4,
        ...style,
      }}
    >
      {rows.map((r) => (
        <span
          key={r.icon + r.text}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: u * 1.4,
            ...t.bodyCss,
            fontSize: u * size,
            fontWeight: 600,
            color: t.colors.text,
          }}
        >
          <Icon
            name={r.icon}
            size={u * size * 1.15}
            strokeWidth={2.2}
            style={{ color: t.colors.text }}
          />
          {r.text}
        </span>
      ))}
    </div>
  );
}

export function BusinessLockup({
  ctx,
  t = ctx.t,
  size = 4,
  invert,
  align = "left",
  showTagline = true,
  logoShape = "circle",
  style,
}: {
  ctx: Ctx;
  t?: ResolvedTheme;
  size?: number;
  invert?: boolean;
  align?: "left" | "center";
  showTagline?: boolean;
  logoShape?: "circle" | "square" | "rounded";
  style?: CSSProperties;
}) {
  const b = ctx.c.business;
  const u = ctx.u;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: u * 2.2,
        flexDirection: align === "center" ? "column" : "row",
        textAlign: align,
        ...style,
      }}
    >
      <LogoMark
        t={t}
        name={b.name}
        logoUrl={b.logoUrl}
        size={u * size * 2.4}
        shape={logoShape}
        invert={invert}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: u * 0.4,
          alignItems: align === "center" ? "center" : "flex-start",
        }}
      >
        <span
          style={{
            ...t.displayCss,
            fontSize: u * size,
            textTransform: "none",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
          }}
        >
          {b.name}
        </span>
        {showTagline && b.tagline && (
          <span
            style={{
              ...t.labelCss,
              fontSize: u * size * 0.5,
              letterSpacing: "0.18em",
              color: t.colors.muted,
            }}
          >
            {b.tagline}
          </span>
        )}
      </div>
    </div>
  );
}

export function Website({
  ctx,
  t = ctx.t,
  size = 2.8,
  style,
}: { ctx: Ctx; t?: ResolvedTheme; size?: number; style?: CSSProperties }) {
  const w = ctx.c.business.website;
  if (!w) return null;
  return (
    <span
      style={{
        ...t.labelCss,
        fontSize: ctx.u * size,
        letterSpacing: "0.2em",
        ...style,
      }}
    >
      {w.replace(/^https?:\/\//, "")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Event / stats / testimonial / hours / QR                            */
/* ------------------------------------------------------------------ */

export function EventBlock({
  ctx,
  t = ctx.t,
  size = 1,
  horizontal,
  style,
}: {
  ctx: Ctx;
  t?: ResolvedTheme;
  size?: number;
  horizontal?: boolean;
  style?: CSSProperties;
}) {
  const e = ctx.c.event;
  if (!e) return null;
  const u = ctx.u * size;
  return (
    <div
      style={{
        display: "flex",
        gap: u * 3,
        alignItems: "center",
        flexDirection: horizontal ? "row" : "column",
        textAlign: horizontal ? "left" : "center",
        ...style,
      }}
    >
      <div
        style={{
          background: t.colors.accent2,
          color: t.colors.onAccent2,
          borderRadius: Math.min(t.radius, 8),
          padding: `${u * 1.6}px ${u * 2.4}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          minWidth: u * 13,
        }}
      >
        {e.dayLabel && (
          <span
            style={{
              fontFamily: t.font.body,
              fontWeight: 800,
              fontSize: u * 2.4,
              letterSpacing: "0.16em",
            }}
          >
            {e.dayLabel.toUpperCase()}
          </span>
        )}
        <span
          style={{
            fontFamily: t.font.display,
            fontWeight: 800,
            fontSize: u * 7,
            marginTop: u * 0.6,
          }}
        >
          {e.date}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: u * 0.8 }}>
        {e.time && (
          <span style={{ ...t.bodyCss, fontWeight: 700, fontSize: u * 3.2 }}>
            {e.time}
          </span>
        )}
        {e.venue && (
          <span style={{ ...t.bodyCss, fontWeight: 600, fontSize: u * 2.9 }}>
            {e.venue}
          </span>
        )}
        {e.address && (
          <span
            style={{ ...t.bodyCss, fontSize: u * 2.6, color: t.colors.muted }}
          >
            {e.address}
          </span>
        )}
      </div>
    </div>
  );
}

export function Stats({
  ctx,
  t = ctx.t,
  size = 1,
  style,
}: { ctx: Ctx; t?: ResolvedTheme; size?: number; style?: CSSProperties }) {
  const s = ctx.c.stats?.slice(0, 3);
  if (!s?.length) return null;
  const u = ctx.u * size;
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid ${t.colors.border}`,
        borderBottom: `1px solid ${t.colors.border}`,
        padding: `${u * 1.8}px 0`,
        ...style,
      }}
    >
      {s.map((x, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: u * 0.4,
            borderLeft: i ? `1px solid ${t.colors.border}` : "none",
            padding: `0 ${u}px`,
          }}
        >
          <span style={{ ...t.displayCss, fontSize: u * 6.5 }}>{x.value}</span>
          <span
            style={{ ...t.labelCss, fontSize: u * 2.1, color: t.colors.muted }}
          >
            {x.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Testimonial({
  ctx,
  t = ctx.t,
  size = 1,
  style,
}: { ctx: Ctx; t?: ResolvedTheme; size?: number; style?: CSSProperties }) {
  const q = ctx.c.testimonial;
  if (!q) return null;
  const u = ctx.u * size;
  return (
    <figure
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: u * 1,
        borderLeft: `${Math.max(2, u * 0.6)}px solid ${t.colors.accent2}`,
        paddingLeft: u * 2.6,
        ...style,
      }}
    >
      <blockquote
        style={{
          margin: 0,
          fontFamily: t.scriptAccent ? t.font.body : t.font.display,
          fontStyle: "italic",
          fontSize: u * 3.3,
          lineHeight: 1.35,
          color: t.colors.text,
          fontWeight: 500,
        }}
      >
        “{q.quote}”
      </blockquote>
      <figcaption
        style={{
          ...t.bodyCss,
          fontSize: u * 2.5,
          color: t.colors.muted,
          fontWeight: 600,
        }}
      >
        — {q.author}
      </figcaption>
    </figure>
  );
}

export function HoursList({
  ctx,
  t = ctx.t,
  size = 1,
  style,
}: { ctx: Ctx; t?: ResolvedTheme; size?: number; style?: CSSProperties }) {
  const h = ctx.c.hours;
  if (!h?.length) return null;
  const u = ctx.u * size;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: u * 0.8,
        ...style,
      }}
    >
      {h.map((row, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: u * 3,
            ...t.bodyCss,
            fontSize: u * 2.7,
          }}
        >
          <span style={{ color: t.colors.muted, fontWeight: 600 }}>
            {row.days}
          </span>
          <span style={{ fontWeight: 700 }}>{row.hours}</span>
        </div>
      ))}
    </div>
  );
}

export function QrBlock({
  ctx,
  t = ctx.t,
  size = 16,
  caption,
  light,
  direction = "row",
  style,
}: {
  ctx: Ctx;
  t?: ResolvedTheme;
  size?: number;
  caption?: string;
  light?: boolean;
  direction?: "row" | "column";
  style?: CSSProperties;
}) {
  const q = ctx.c.qr;
  if (!q) return null;
  const u = ctx.u;
  const cap = caption ?? q.caption ?? "Scan to learn more";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        alignItems: "center",
        gap: u * 2,
        minWidth: 0,
        ...style,
      }}
    >
      <QrCode
        t={t}
        svg={q.svg}
        size={u * size}
        light={light}
        style={{ flexShrink: 0 }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: u * 0.4,
          textAlign: direction === "column" ? "center" : "left",
          minWidth: 0,
        }}
      >
        <span style={{ ...t.bodyCss, fontWeight: 700, fontSize: u * 2.7 }}>
          {cap}
        </span>
        <span
          style={{
            ...t.bodyCss,
            fontSize: u * 2.3,
            color: t.colors.muted,
            overflowWrap: "anywhere",
          }}
        >
          {q.url.replace(/^https?:\/\//, "")}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* USPS address panel                                                  */
/* ------------------------------------------------------------------ */

/**
 * Address side panel. Indicia 1 in square inset 1/4 in from the trim; return
 * address top-left of the panel; recipient block roughly centred; the bottom
 * 5/8 in (barcode clear zone) is left empty.
 */
export function AddressPanel({
  ctx,
  t = ctx.t,
  style,
}: { ctx: Ctx; t?: ResolvedTheme; style?: CSSProperties }) {
  const { c, bleedPx } = ctx;
  const inch = 96;
  const m = c.mailing;
  const indicia = m?.indicia ?? {
    line1: "PRSRT STD",
    line2: "U.S. POSTAGE PAID",
    line3: `PERMIT NO. 000`,
  };
  const ret =
    m?.returnAddress ??
    [c.business.name, c.business.address ?? "", c.business.city ?? ""].filter(
      Boolean,
    );
  const rcp = m?.recipient ?? [
    "RESIDENTIAL CUSTOMER",
    "OR CURRENT RESIDENT",
    `${c.business.city ?? "ANYTOWN, US 00000"}`,
  ];
  const clear = (ctx.fmt.clearZone ?? 0.625) * inch + bleedPx;
  const fs = Math.max(9, Math.min(12, ctx.u * 2.6));
  return (
    <div
      data-dm="address"
      style={{
        position: "relative",
        height: "100%",
        boxSizing: "border-box",
        fontFamily: t.font.body,
        color: t.colors.text,
        ...style,
      }}
    >
      {/* return address */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          fontSize: fs * 0.85,
          lineHeight: 1.25,
          maxWidth: "55%",
        }}
      >
        {ret.map((l, i) => (
          <span key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>
            {l}
          </span>
        ))}
      </div>
      {/* indicia */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: inch * 0.95,
          height: inch * 0.95,
          border: `1px solid ${t.colors.text}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 8,
          lineHeight: 1.3,
          letterSpacing: "0.04em",
          padding: 4,
          boxSizing: "border-box",
          fontWeight: 600,
        }}
      >
        <span>{indicia.line1}</span>
        <span>{indicia.line2}</span>
        <span>{indicia.line3}</span>
      </div>
      {/* recipient */}
      <div
        style={{
          position: "absolute",
          left: "12%",
          right: 0,
          top: "48%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          fontSize: fs,
          lineHeight: 1.3,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {rcp.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      {/* barcode clear zone marker (invisible in print; guides draw it) */}
      <div
        aria-hidden="true"
        data-clear-zone
        style={{
          position: "absolute",
          left: -ctx.inset,
          right: -ctx.inset,
          bottom: -ctx.inset,
          height: clear,
        }}
      />
    </div>
  );
}

/** Thin colour bar used as a divider on back sides. */
export function Rule({
  t,
  vertical,
  color,
  style,
}: {
  t: ResolvedTheme;
  vertical?: boolean;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: color ?? t.colors.border,
        ...(vertical
          ? { width: 1, alignSelf: "stretch" }
          : { height: 1, width: "100%" }),
        ...style,
      }}
    />
  );
}

export function softBg(t: ResolvedTheme): string {
  return mix(t.colors.bg, t.colors.accent, t.dark ? 0.18 : 0.08);
}

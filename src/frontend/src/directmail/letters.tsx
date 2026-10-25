/**
 * Letter-size layouts: letters (8.5×11 / 8.5×14), the reply letter and the
 * secure-mailer inner pages. Letters use real typographic sizes (points) rather
 * than the `u` unit, because a letter is read, not glanced at.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  BusinessLockup,
  Coupon,
  Cta,
  type Ctx,
  FitBox,
  QrBlock,
  Stats,
  Testimonial,
} from "./blocks";
import { alpha, mix } from "./color";
import { inToPx } from "./formats";
import { Icon } from "./icons";
import { ImageSlot, LogoMark, Pattern } from "./placeholders";
import { type ResolvedTheme, onAccent, paperTheme } from "./theme";
import type { FrontSpec, MailContent } from "./types";

export const pt = (n: number) => (n * 96) / 72;
/** laser-printed letters have an unprintable border: edge-to-edge elements start here */
const edgeOf = (ctx: Ctx) => inToPx(ctx.fmt.printMargin ?? 0) + ctx.bleedPx;
const abs = (extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute",
  ...extra,
});

/* ------------------------------------------------------------------ */
/* composer                                                            */
/* ------------------------------------------------------------------ */

export type LetterTone =
  | "marketing"
  | "notice"
  | "urgent"
  | "thankyou"
  | "reply"
  | "statement";

export interface ComposedLetter {
  date: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signer: string;
  signerTitle?: string;
  ps?: string;
  reference: { label: string; value: string }[];
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const joinList = (items: string[]) =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const site = (c: MailContent) =>
  c.business.website?.replace(/^https?:\/\//, "");

/** Fills in whatever `content.letter` leaves out, in the register of `tone`. */
export function composeLetter(
  c: MailContent,
  tone: LetterTone = "marketing",
): ComposedLetter {
  const L = c.letter ?? {};
  const b = c.business;
  const bullets = (c.bullets ?? []).map((x) => lower(x.replace(/\.$/, "")));
  const o = c.offer;
  const contact = [
    b.phone ? `call ${b.phone}` : "",
    site(c) ? `visit ${site(c)}` : "",
  ]
    .filter(Boolean)
    .join(" or ");
  const date = L.date ?? "April 14, 2026";
  const paragraphs: string[] = [];
  let salutation = L.salutation ?? "Dear Neighbor,";
  let closing = L.closing ?? "Warm regards,";
  let ps = L.ps;

  if (!L.paragraphs) {
    switch (tone) {
      case "notice":
        salutation = L.salutation ?? "Dear Customer,";
        closing = L.closing ?? "Sincerely,";
        paragraphs.push(
          `This letter is to inform you about ${lower(c.headline.replace(/[.!?]$/, ""))}. ${c.body ?? ""}`.trim(),
        );
        if (bullets.length)
          paragraphs.push(`What this means for you: ${joinList(bullets)}.`);
        paragraphs.push(
          `No action is required beyond reviewing the details above. If anything is unclear, ${contact || "contact our office"} and a member of our team will walk you through it.`,
        );
        break;
      case "statement":
        salutation = L.salutation ?? "Dear Account Holder,";
        closing = L.closing ?? "Sincerely,";
        paragraphs.push(
          `Enclosed is your statement from ${b.name}. ${c.body ?? ""}`.trim(),
        );
        paragraphs.push(
          `Please keep this document for your records. The information it contains is confidential and intended only for the addressee${b.phone ? `; if you received it in error, call ${b.phone}` : ""}.`,
        );
        break;
      case "urgent":
        closing = L.closing ?? "Sincerely,";
        paragraphs.push(
          `Time is short on this one: ${c.body ?? lower(c.headline)}`,
        );
        if (bullets.length)
          paragraphs.push(`Here is what is included: ${joinList(bullets)}.`);
        paragraphs.push(
          o
            ? `${o.headline} — ${lower(o.detail)}${o.expires ? `, but only through ${o.expires}` : ""}. ${contact ? `To claim it, ${contact}.` : ""}`.trim()
            : `To take the next step, ${contact || "reach out to us today"}.`,
        );
        ps =
          ps ??
          (o?.expires
            ? `P.S. This ends ${o.expires}. After that the regular price applies.`
            : undefined);
        break;
      case "thankyou":
        salutation = L.salutation ?? "Dear Friend,";
        closing = L.closing ?? "With gratitude,";
        paragraphs.push(
          `Thank you for choosing ${b.name}. ${c.body ?? ""}`.trim(),
        );
        if (bullets.length)
          paragraphs.push(
            `It is customers like you who make it possible for us to keep offering ${joinList(bullets)}.`,
          );
        paragraphs.push(
          o
            ? `As a small thank-you: ${lower(o.detail)} — ${o.headline}${o.code ? ` with code ${o.code}` : ""}${o.expires ? `, through ${o.expires}` : ""}.`
            : `If there is ever anything we can do better, ${contact || "tell us"} — we read every message.`,
        );
        break;
      case "reply":
        paragraphs.push(
          `${c.body ?? c.headline} We would like to hear from you.`,
        );
        if (bullets.length)
          paragraphs.push(
            `A few of the things people ask us about: ${joinList(bullets)}.`,
          );
        paragraphs.push(
          `It takes less than a minute: tick the boxes on the slip below, detach it along the perforation and drop it back in the mail — no postage needed.${o ? ` Everyone who replies gets ${lower(o.detail)} (${o.headline}).` : ""}`,
        );
        break;
      default:
        paragraphs.push(c.body ?? c.headline);
        if (bullets.length)
          paragraphs.push(
            `Here is what you can count on: ${joinList(bullets)}.`,
          );
        paragraphs.push(
          o
            ? `For a limited time, ${lower(o.detail)} — ${o.headline}${o.code ? ` with code ${o.code}` : ""}${o.expires ? `, through ${o.expires}` : ""}. ${contact ? `To get started, ${contact}.` : ""}`.trim()
            : `To get started, ${contact || "reach out any time"}.`,
        );
        ps =
          ps ??
          (o
            ? `P.S. ${o.detail} — ${o.headline}${o.expires ? ` until ${o.expires}` : ""}.`
            : c.testimonial
              ? `P.S. “${c.testimonial.quote}” — ${c.testimonial.author}`
              : undefined);
    }
  }

  return {
    date,
    salutation,
    paragraphs: L.paragraphs ?? paragraphs,
    closing,
    signer: L.signer ?? `The ${b.name} team`,
    signerTitle: L.signerTitle ?? b.tagline,
    ps,
    reference: L.reference ?? [
      { label: "Date", value: date },
      { label: "Reference", value: "No. 2026-0417" },
      { label: "Re", value: c.headline },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */

interface LetterCtx extends Ctx {
  L: ComposedLetter;
  /** page margin px */
  m: number;
  body: CSSProperties;
  small: CSSProperties;
}

function letterCtx(base: Ctx, tone: LetterTone, margin = 0.75): LetterCtx {
  // letters go on white 24# stock: dark palettes are flipped to their paper variant
  const t = paperTheme(base.t);
  const ctx = { ...base, t };
  return {
    ...ctx,
    L: composeLetter(ctx.c, tone),
    m: Math.max(ctx.inset, margin * 96),
    body: {
      ...t.bodyCss,
      fontSize: pt(11),
      lineHeight: 1.55,
      color: t.colors.text,
      margin: 0,
    },
    small: {
      ...t.bodyCss,
      fontSize: pt(8.5),
      lineHeight: 1.4,
      color: t.colors.muted,
      margin: 0,
    },
  };
}

function toneFor(spec: FrontSpec, campaign?: string): LetterTone {
  if (spec.layout === "letter-notice")
    return campaign === "statement" ? "statement" : "notice";
  if (spec.layout === "letter-urgent") return "urgent";
  if (spec.layout === "letter-reply") return "reply";
  if (campaign === "thank-you") return "thankyou";
  if (campaign === "notice") return "notice";
  if (campaign === "statement") return "statement";
  return "marketing";
}

function Paragraphs({
  lc,
  t = lc.t,
  style,
}: { lc: LetterCtx; t?: ResolvedTheme; style?: CSSProperties }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: pt(9), ...style }}
    >
      {lc.L.paragraphs.map((p, i) => (
        <p key={i} style={{ ...lc.body, color: t.colors.text }}>
          {p}
        </p>
      ))}
    </div>
  );
}

function Signature({ lc, t = lc.t }: { lc: LetterCtx; t?: ResolvedTheme }) {
  const { L } = lc;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: pt(2),
        marginTop: pt(6),
      }}
    >
      <span style={{ ...lc.body, color: t.colors.text }}>{L.closing}</span>
      <span
        style={{
          fontFamily:
            t.font.accent && t.scriptAccent ? t.font.accent : t.font.display,
          fontSize: t.scriptAccent ? pt(22) : pt(16),
          lineHeight: 1.1,
          color: t.colors.text,
          marginTop: pt(4),
          fontStyle: t.scriptAccent ? "normal" : "italic",
        }}
      >
        {L.signer}
      </span>
      {L.signerTitle && (
        <span style={{ ...lc.small, color: t.colors.muted }}>
          {L.signerTitle}
        </span>
      )}
    </div>
  );
}

function DateLine({
  lc,
  show = true,
  t = lc.t,
}: { lc: LetterCtx; show?: boolean; t?: ResolvedTheme }) {
  if (!show) return null;
  return <span style={{ ...lc.body, color: t.colors.muted }}>{lc.L.date}</span>;
}

function Ps({
  lc,
  show = true,
  t = lc.t,
}: { lc: LetterCtx; show?: boolean; t?: ResolvedTheme }) {
  if (!show || !lc.L.ps) return null;
  return (
    <p
      style={{
        ...lc.body,
        color: t.colors.text,
        fontWeight: 600,
        marginTop: pt(6),
      }}
    >
      {lc.L.ps}
    </p>
  );
}

/** date · salutation · paragraphs · signature · P.S. */
function LetterText({
  lc,
  spec,
  t = lc.t,
  gap = pt(10),
}: { lc: LetterCtx; spec: FrontSpec; t?: ResolvedTheme; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      <DateLine lc={lc} show={spec.showDate !== false} t={t} />
      <span style={{ ...lc.body, color: t.colors.text }}>
        {lc.L.salutation}
      </span>
      <Paragraphs lc={lc} t={t} />
      <Signature lc={lc} t={t} />
      <Ps lc={lc} show={spec.showPs !== false} t={t} />
    </div>
  );
}

function ContactColumn({
  lc,
  t = lc.t,
  align = "right",
}: { lc: LetterCtx; t?: ResolvedTheme; align?: "left" | "right" }) {
  const b = lc.c.business;
  const rows = [
    b.address && b.city ? `${b.address}, ${b.city}` : b.address,
    b.phone,
    site(lc.c),
    b.email,
  ].filter(Boolean) as string[];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: pt(1.5),
        textAlign: align,
        ...lc.small,
        color: t.colors.muted,
      }}
    >
      {rows.map((r) => (
        <span key={r}>{r}</span>
      ))}
    </div>
  );
}

function Footer({
  lc,
  t = lc.t,
  style,
}: { lc: LetterCtx; t?: ResolvedTheme; style?: CSSProperties }) {
  const b = lc.c.business;
  const items = [
    site(lc.c),
    b.phone,
    b.address && b.city ? `${b.address}, ${b.city}` : b.address,
    b.license,
  ].filter(Boolean) as string[];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: pt(14),
        flexWrap: "wrap",
        borderTop: `1px solid ${t.colors.border}`,
        paddingTop: pt(8),
        ...lc.small,
        color: t.colors.muted,
        ...style,
      }}
    >
      {items.map((x) => (
        <span key={x}>{x}</span>
      ))}
    </div>
  );
}

function ReferenceBlock({
  lc,
  t = lc.t,
  style,
}: { lc: LetterCtx; t?: ResolvedTheme; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        columnGap: pt(14),
        rowGap: pt(3),
        border: `1px solid ${t.colors.border}`,
        padding: `${pt(8)}px ${pt(12)}px`,
        background: alpha(t.colors.surface, 0.6),
        ...style,
      }}
    >
      {lc.L.reference.map((r) => (
        <div key={r.label} style={{ display: "contents" }}>
          <span
            style={{
              ...lc.small,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: t.colors.muted,
            }}
          >
            {r.label}
          </span>
          <span
            style={{
              ...lc.body,
              fontSize: pt(10),
              lineHeight: 1.4,
              color: t.colors.text,
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Headline in the display face at letter scale. */
function LetterHeadline({
  lc,
  text,
  t = lc.t,
  size = 24,
  style,
}: {
  lc: LetterCtx;
  text?: string;
  t?: ResolvedTheme;
  size?: number;
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <h1
      data-fittext=""
      data-fit-base={pt(size)}
      style={{
        ...t.displayCss,
        fontSize: pt(size) * (lc.t.display.scale || 1),
        lineHeight: 1.05,
        color: t.colors.text,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {text}
    </h1>
  );
}

/** Page frame: optional pattern, then a FitBox column from top to bottom margins. */
function Page({
  ctx,
  lc,
  children,
  top,
  bottom,
  left,
  right,
  pattern = false,
  style,
}: {
  ctx: Ctx;
  lc: LetterCtx;
  children: ReactNode;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  pattern?: boolean;
  style?: CSSProperties;
}) {
  const { t, W, H } = ctx;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      {pattern && (
        <div style={abs({ inset: edgeOf(ctx), overflow: "hidden" })}>
          <Pattern
            t={t}
            w={W}
            h={H}
            opacity={Math.min(t.pattern.opacity, 0.18)}
          />
        </div>
      )}
      <FitBox
        style={abs({
          left: left ?? lc.m,
          right: right ?? lc.m,
          top: top ?? lc.m,
          bottom: bottom ?? lc.m,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          gap: pt(14),
          ...style,
        }}
      >
        {children}
      </FitBox>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* layouts                                                             */
/* ------------------------------------------------------------------ */

function Letterhead({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  return (
    <Page ctx={ctx} lc={lc}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <BusinessLockup ctx={ctx} size={3.1} logoShape="rounded" />
        <ContactColumn lc={lc} />
      </div>
      <div style={{ height: 2, background: t.colors.accent }} />
      <LetterHeadline lc={lc} text={ctx.c.headline} size={22} />
      <LetterText lc={lc} spec={spec} />
      <div style={{ flex: 1 }} />
      <Footer lc={lc} />
    </Page>
  );
}

function LetterBand({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t, W } = ctx;
  const band = onAccent(t);
  const edge = edgeOf(ctx);
  const bandH = 1.5 * 96;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <div
        style={abs({
          left: edge,
          right: edge,
          top: edge,
          height: bandH,
          background: band.colors.bg,
          overflow: "hidden",
        })}
      >
        <Pattern
          t={t}
          w={W}
          h={bandH}
          tint={band.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.12}
        />
        <div
          style={abs({
            left: lc.m,
            right: lc.m,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: pt(20),
          })}
        >
          <BusinessLockup ctx={ctx} t={band} size={3.4} invert />
          <div
            style={{
              textAlign: "right",
              ...lc.small,
              color: band.colors.text,
              opacity: 0.9,
            }}
          >
            <div>{ctx.c.business.phone}</div>
            <div>{site(ctx.c)}</div>
          </div>
        </div>
      </div>
      <FitBox
        style={abs({
          left: lc.m,
          right: lc.m,
          top: edge + bandH + pt(28),
          bottom: lc.m,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: pt(14) }}
      >
        <span
          style={{
            ...t.labelCss,
            fontSize: pt(8.5),
            color:
              t.colors.accent2 === t.colors.bg
                ? t.colors.text
                : t.colors.accent2,
          }}
        >
          {ctx.c.eyebrow ?? ctx.c.business.tagline}
        </span>
        <LetterHeadline lc={lc} text={ctx.c.headline} size={26} />
        <LetterText lc={lc} spec={spec} />
        <div style={{ flex: 1 }} />
        <Footer lc={lc} />
      </FitBox>
    </>
  );
}

function LetterSidebar({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t, H } = ctx;
  const strip = onAccent(t);
  const edge = edgeOf(ctx);
  const stripW = 0.9 * 96;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <div
        style={abs({
          left: edge,
          top: edge,
          bottom: edge,
          width: stripW,
          background: strip.colors.bg,
          overflow: "hidden",
        })}
      >
        <Pattern
          t={t}
          w={stripW}
          h={H}
          tint={strip.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.14}
        />
        <div
          style={abs({
            left: 0,
            right: 0,
            top: lc.m,
            display: "flex",
            justifyContent: "center",
          })}
        >
          <LogoMark
            t={strip}
            name={ctx.c.business.name}
            logoUrl={ctx.c.business.logoUrl}
            size={stripW * 0.56}
            shape="rounded"
            invert
          />
        </div>
        <div
          style={abs({
            left: 0,
            right: 0,
            bottom: lc.m,
            display: "flex",
            justifyContent: "center",
          })}
        >
          <span
            style={{
              ...strip.labelCss,
              fontSize: pt(9),
              letterSpacing: "0.3em",
              whiteSpace: "nowrap",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {site(ctx.c) ?? ctx.c.business.tagline ?? ctx.c.business.name}
          </span>
        </div>
      </div>
      <FitBox
        style={abs({
          left: edge + stripW + lc.m * 0.8,
          right: lc.m,
          top: lc.m,
          bottom: lc.m,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: pt(14) }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: pt(20),
          }}
        >
          <span
            style={{
              ...t.displayCss,
              fontSize: pt(16),
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {ctx.c.business.name}
          </span>
          <ContactColumn lc={lc} />
        </div>
        <LetterHeadline lc={lc} text={ctx.c.headline} size={24} />
        <LetterText lc={lc} spec={spec} />
        <div style={{ flex: 1 }} />
        <Footer lc={lc} />
      </FitBox>
    </>
  );
}

function LetterNotice({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  const m = Math.max(lc.m, 96);
  return (
    <Page ctx={ctx} lc={lc} left={m} right={m} top={m * 0.8} bottom={m * 0.8}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: pt(4),
          textAlign: "center",
        }}
      >
        <BusinessLockup
          ctx={ctx}
          size={3}
          align="center"
          logoShape="square"
          style={{ gap: pt(6) }}
        />
        <div
          style={{
            ...lc.small,
            display: "flex",
            gap: pt(10),
            marginTop: pt(4),
          }}
        >
          {[
            ctx.c.business.address && ctx.c.business.city
              ? `${ctx.c.business.address}, ${ctx.c.business.city}`
              : ctx.c.business.address,
            ctx.c.business.phone,
            site(ctx.c),
          ]
            .filter(Boolean)
            .map((x) => (
              <span key={x as string}>{x}</span>
            ))}
        </div>
      </div>
      <div style={{ height: 1, background: t.colors.text }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: pt(6) }}>
          <span
            style={{
              ...t.labelCss,
              fontSize: pt(9),
              color:
                t.colors.accent2 === t.colors.bg
                  ? t.colors.text
                  : t.colors.accent2,
            }}
          >
            {ctx.c.eyebrow ??
              (lc.L.reference[0]?.label === "Date"
                ? "Important notice"
                : "Notice")}
          </span>
          <LetterHeadline
            lc={lc}
            text={ctx.c.headline}
            size={20}
            style={{ fontWeight: Math.min(t.display.weight, 700) }}
          />
        </div>
        {spec.showReference !== false && (
          <ReferenceBlock lc={lc} style={{ minWidth: 2.6 * 96 }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: pt(10) }}>
        <span style={lc.body}>{lc.L.salutation}</span>
        {lc.L.paragraphs.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: pt(10) }}>
            <span
              style={{
                ...lc.body,
                fontWeight: 700,
                minWidth: pt(16),
                color: t.colors.muted,
              }}
            >
              {i + 1}.
            </span>
            <p style={lc.body}>{p}</p>
          </div>
        ))}
        <Signature lc={lc} />
      </div>
      <div style={{ flex: 1 }} />
      <p style={{ ...lc.small, textAlign: "center" }}>
        {ctx.c.business.license ? `${ctx.c.business.license} · ` : ""}This
        notice was sent to the address on file. Please keep it for your records.
      </p>
    </Page>
  );
}

function LetterOffer({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  return (
    <Page ctx={ctx} lc={lc} pattern>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <BusinessLockup ctx={ctx} size={3.1} />
        <ContactColumn lc={lc} />
      </div>
      <LetterHeadline lc={lc} text={ctx.c.headline} size={26} />
      <LetterText lc={lc} spec={{ ...spec, showPs: false }} gap={pt(9)} />
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: pt(16), alignItems: "stretch" }}>
        {ctx.c.offer && (
          <Coupon
            ctx={ctx}
            offer={ctx.c.offer}
            style={{ flex: 1.3, fontSize: pt(11) }}
          />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: pt(10),
            background: mix(t.colors.bg, t.colors.accent, 0.08),
            padding: pt(14),
            borderRadius: Math.min(t.radius, 10),
          }}
        >
          {ctx.c.cta && (
            <Cta
              ctx={ctx}
              label={ctx.c.cta.label}
              size={1.5}
              style={{ alignSelf: "flex-start" }}
            />
          )}
          <QrBlock ctx={ctx} size={9} />
        </div>
      </div>
      <Ps lc={lc} show={spec.showPs !== false} />
    </Page>
  );
}

function LetterUrgent({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  const alert = onAccent(t, "accent2");
  const edge = edgeOf(ctx);
  const deadline = ctx.c.offer?.expires ?? ctx.c.event?.date;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <div
        style={abs({
          left: edge,
          right: edge,
          top: edge,
          height: pt(28),
          background: alert.colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: pt(8),
          ...alert.labelCss,
          fontSize: pt(9),
          letterSpacing: "0.24em",
        })}
      >
        <Icon name="bell" size={pt(11)} strokeWidth={2.4} />
        {ctx.c.eyebrow ?? "Time-sensitive"}
        {deadline ? ` · respond by ${deadline}` : ""}
      </div>
      <FitBox
        style={abs({
          left: lc.m,
          right: lc.m,
          top: edge + pt(28) + lc.m * 0.7,
          bottom: lc.m,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: pt(14) }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: pt(20),
          }}
        >
          <BusinessLockup ctx={ctx} size={3.1} />
          <ContactColumn lc={lc} />
        </div>
        <LetterHeadline
          lc={lc}
          text={ctx.c.headline}
          size={28}
          style={{ color: t.colors.text }}
        />
        <LetterText lc={lc} spec={{ ...spec, showPs: false }} />
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: pt(16),
            border: `${pt(1.5)}px solid ${alert.colors.bg}`,
            padding: pt(12),
            borderRadius: Math.min(t.radius, 10),
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: alert.colors.bg,
              color: alert.colors.text,
              padding: `${pt(6)}px ${pt(12)}px`,
              borderRadius: Math.min(t.radius, 8),
              minWidth: pt(70),
            }}
          >
            <span style={{ ...alert.labelCss, fontSize: pt(7.5) }}>
              Deadline
            </span>
            <span
              style={{
                ...alert.displayCss,
                fontSize: pt(20),
                color: alert.colors.text,
              }}
            >
              {deadline ?? "Soon"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: pt(4),
              flex: 1,
            }}
          >
            <span style={{ ...lc.body, fontWeight: 700 }}>
              {ctx.c.offer
                ? `${ctx.c.offer.headline} ${ctx.c.offer.detail}`
                : ctx.c.subhead}
            </span>
            <span style={lc.small}>
              {ctx.c.offer?.fineprint ??
                `Call ${ctx.c.business.phone ?? ""} or visit ${site(ctx.c) ?? ""}`}
            </span>
          </div>
          {ctx.c.cta && (
            <Cta ctx={ctx} label={ctx.c.cta.label} fill="accent2" size={1.5} />
          )}
        </div>
        <Ps lc={lc} show={spec.showPs !== false} />
      </FitBox>
    </>
  );
}

/** Detachable reply slip (also used by the reply letter). */
export function ReplySlip({
  ctx,
  lc,
  height,
}: { ctx: Ctx; lc: LetterCtx; height: number }) {
  const { t, c } = ctx;
  const r = c.reply ?? {};
  const options =
    r.options ??
    (c.bullets ?? [])
      .slice(0, 4)
      .map((b) => `Yes — tell me more about ${lower(b.replace(/\.$/, ""))}`);
  const fields = r.fields ?? ["Name", "Phone", "Email"];
  const ret =
    c.mailing?.returnAddress ??
    [c.business.name, c.business.address ?? "", c.business.city ?? ""].filter(
      Boolean,
    );
  return (
    <div
      style={{
        height,
        display: "flex",
        flexDirection: "column",
        gap: pt(8),
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: pt(8),
          ...lc.small,
          color: t.colors.muted,
        }}
      >
        <Icon name="scissors" size={pt(11)} />
        <div style={{ flex: 1, borderTop: `1px dashed ${t.colors.text}` }} />
        <span
          style={{
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Detach and return
        </span>
        <div style={{ flex: 1, borderTop: `1px dashed ${t.colors.text}` }} />
      </div>
      <div style={{ display: "flex", gap: pt(18), flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1.2,
            display: "flex",
            flexDirection: "column",
            gap: pt(6),
          }}
        >
          <span style={{ ...t.labelCss, fontSize: pt(8.5) }}>
            {r.title ?? "Yes, I’m interested"}
          </span>
          {options.map((o) => (
            <label
              key={o}
              style={{
                display: "flex",
                alignItems: "center",
                gap: pt(6),
                ...lc.body,
                fontSize: pt(10),
                lineHeight: 1.3,
              }}
            >
              <span
                style={{
                  width: pt(10),
                  height: pt(10),
                  border: `1.5px solid ${t.colors.text}`,
                  flexShrink: 0,
                }}
              />
              {o}
            </label>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: pt(8),
            justifyContent: "flex-start",
          }}
        >
          {fields.map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: pt(6),
                ...lc.small,
                color: t.colors.text,
              }}
            >
              <span style={{ fontWeight: 700, minWidth: pt(34) }}>{f}</span>
              <span
                style={{
                  flex: 1,
                  borderBottom: `1px solid ${t.colors.text}`,
                  height: pt(12),
                }}
              />
            </div>
          ))}
          <div
            style={{ marginTop: "auto", ...lc.small, color: t.colors.muted }}
          >
            <span style={{ fontWeight: 700, color: t.colors.text }}>
              Mail to:{" "}
            </span>
            {ret.join(" · ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function LetterReply({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  const centered = spec.align === "center";
  const band = onAccent(t);
  return (
    <Page ctx={ctx} lc={lc}>
      {spec.showLogo === false ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              ...t.displayCss,
              fontSize: pt(20),
              textTransform: "none",
              letterSpacing: "-0.01em",
            }}
          >
            {ctx.c.business.name}
          </span>
          <span style={lc.small}>{site(ctx.c)}</span>
        </div>
      ) : centered ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: pt(6),
            textAlign: "center",
          }}
        >
          <BusinessLockup
            ctx={ctx}
            size={3.2}
            align="center"
            logoShape="rounded"
          />
          <span style={lc.small}>
            {[ctx.c.business.phone, site(ctx.c)].filter(Boolean).join(" · ")}
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: pt(20),
          }}
        >
          <BusinessLockup ctx={ctx} size={3.1} />
          <ContactColumn lc={lc} />
        </div>
      )}
      <div
        style={{
          height: spec.badge === "ribbon" ? pt(22) : 2,
          background:
            spec.badge === "ribbon" ? band.colors.bg : t.colors.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...band.labelCss,
          fontSize: pt(8),
          letterSpacing: "0.22em",
        }}
      >
        {spec.badge === "ribbon" ? (ctx.c.eyebrow ?? "Your reply matters") : ""}
      </div>
      <LetterHeadline
        lc={lc}
        text={ctx.c.headline}
        size={centered ? 24 : 22}
        style={centered ? { textAlign: "center" } : undefined}
      />
      {spec.showStats && <Stats ctx={ctx} size={1.1} />}
      <LetterText lc={lc} spec={{ ...spec, showPs: false }} gap={pt(8)} />
      <div style={{ flex: 1 }} />
      <ReplySlip ctx={ctx} lc={lc} height={3.1 * 96} />
    </Page>
  );
}

function LetterMinimal({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  const m = Math.max(lc.m, 96);
  return (
    <Page ctx={ctx} lc={lc} left={m} right={m} top={m * 0.9} bottom={m * 0.8}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            ...t.displayCss,
            fontSize: pt(20),
            textTransform: "none",
            letterSpacing: "-0.01em",
          }}
        >
          {ctx.c.business.name}
        </span>
        <span style={{ ...lc.small }}>{site(ctx.c)}</span>
      </div>
      <div style={{ height: pt(18) }} />
      <LetterText lc={lc} spec={spec} gap={pt(12)} />
      <div style={{ flex: 1 }} />
      <ContactColumn lc={lc} align="left" />
    </Page>
  );
}

function LetterStats({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  return (
    <Page ctx={ctx} lc={lc}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <BusinessLockup ctx={ctx} size={3.1} />
        <ContactColumn lc={lc} />
      </div>
      <LetterHeadline lc={lc} text={ctx.c.headline} size={26} />
      <Stats ctx={ctx} size={1.15} />
      <LetterText lc={lc} spec={spec} />
      {spec.showStats !== false && <Testimonial ctx={ctx} size={1.1} />}
      <div style={{ flex: 1 }} />
      <Footer lc={lc} />
    </Page>
  );
}

function LetterPhoto({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t } = ctx;
  const stripH = 1.9 * 96;
  const edge = edgeOf(ctx);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <div style={abs({ left: edge, right: edge, top: edge, height: stripH })}>
        <ImageSlot
          t={t}
          src={ctx.c.images?.hero}
          illustration={
            spec.image === "illustration"
              ? ctx.c.illustrations?.hero
              : undefined
          }
          seed={ctx.seed}
          style={{ width: "100%", height: "100%" }}
        >
          <div
            style={abs({
              left: lc.m,
              bottom: pt(14),
              background: alpha(t.colors.bg, 0.92),
              padding: `${pt(8)}px ${pt(12)}px`,
              borderRadius: Math.min(t.radius, 8),
            })}
          >
            <BusinessLockup ctx={ctx} size={3} showTagline={false} />
          </div>
        </ImageSlot>
      </div>
      <FitBox
        style={abs({
          left: lc.m,
          right: lc.m,
          top: edge + stripH + pt(24),
          bottom: lc.m,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: pt(14) }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: pt(20),
          }}
        >
          <LetterHeadline
            lc={lc}
            text={ctx.c.headline}
            size={24}
            style={{ flex: 1 }}
          />
          <ContactColumn lc={lc} />
        </div>
        <LetterText lc={lc} spec={spec} />
        <div style={{ flex: 1 }} />
        <Footer lc={lc} />
      </FitBox>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* secure mailer inner pages                                           */
/* ------------------------------------------------------------------ */

function SecureStatement({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t, c } = ctx;
  const rows = c.statement ?? [
    { label: "Statement date", value: lc.L.date },
    { label: "Account number", value: "•••• •••• 4821" },
    { label: "Account holder", value: "ADDRESSEE" },
    { label: "Status", value: c.offer ? c.offer.detail : "Current" },
  ];
  const strip = (ctx.fmt.tearStrip ?? 0) * 96;
  const m = lc.m + strip;
  return (
    <Page ctx={ctx} lc={lc} left={m} right={m} top={lc.m} bottom={lc.m}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <BusinessLockup ctx={ctx} size={3} logoShape="square" />
        <div
          style={{
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: pt(2),
          }}
        >
          <span style={{ ...t.labelCss, fontSize: pt(8.5) }}>
            {c.eyebrow ?? "Confidential"}
          </span>
          <span
            style={{
              ...t.displayCss,
              fontSize: pt(16),
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {c.headline}
          </span>
        </div>
      </div>
      <div style={{ height: 2, background: t.colors.accent }} />
      <div
        style={{
          border: `1px solid ${t.colors.border}`,
          borderRadius: Math.min(t.radius, 8),
          overflow: "hidden",
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: pt(16),
              padding: `${pt(7)}px ${pt(12)}px`,
              background: i % 2 ? alpha(t.colors.surface, 0.7) : "transparent",
              borderTop: i ? `1px solid ${t.colors.border}` : "none",
            }}
          >
            <span
              style={{
                ...lc.small,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {r.label}
            </span>
            <span
              style={{
                ...lc.body,
                fontSize: pt(10.5),
                lineHeight: 1.3,
                fontWeight: i === rows.length - 1 ? 700 : 500,
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
      <span style={lc.body}>{lc.L.salutation}</span>
      <Paragraphs lc={lc} />
      <Signature lc={lc} />
      <div style={{ flex: 1 }} />
      <p style={{ ...lc.small, textAlign: "center" }}>
        {spec.showReference !== false
          ? "This document is confidential and intended only for the addressee. "
          : ""}
        Questions? {c.business.phone ? `Call ${c.business.phone}` : ""}
        {site(c) ? ` · ${site(c)}` : ""}
      </p>
    </Page>
  );
}

function SecureNotice({
  ctx,
  spec,
  lc,
}: { ctx: Ctx; spec: FrontSpec; lc: LetterCtx }) {
  const { t, c } = ctx;
  const strip = (ctx.fmt.tearStrip ?? 0) * 96;
  const m = lc.m + strip;
  const code = c.offer?.code ?? "XXXX-XXXX-XXXX";
  return (
    <Page ctx={ctx} lc={lc} left={m} right={m} top={lc.m} bottom={lc.m}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: pt(20),
        }}
      >
        <BusinessLockup ctx={ctx} size={3} />
        <ContactColumn lc={lc} />
      </div>
      <div style={{ height: 1, background: t.colors.text }} />
      <LetterHeadline lc={lc} text={c.headline} size={20} />
      <span style={lc.body}>{lc.L.salutation}</span>
      <Paragraphs lc={lc} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: pt(16),
          border: `${pt(1.5)}px dashed ${t.colors.text}`,
          padding: pt(12),
          borderRadius: Math.min(t.radius, 8),
          background: alpha(t.colors.surface, 0.6),
        }}
      >
        <Icon name="key" size={pt(22)} strokeWidth={1.8} />
        <div style={{ display: "flex", flexDirection: "column", gap: pt(2) }}>
          <span style={{ ...t.labelCss, fontSize: pt(8) }}>
            {spec.showReference === false
              ? "Confirmation"
              : "Your confidential code"}
          </span>
          <span
            style={{
              fontFamily: t.font.body,
              fontWeight: 800,
              fontSize: pt(18),
              letterSpacing: "0.14em",
            }}
          >
            {code}
          </span>
          <span style={lc.small}>
            Keep this code private. We will never ask for it by phone or email.
          </span>
        </div>
      </div>
      <Signature lc={lc} />
      <div style={{ flex: 1 }} />
      <p style={{ ...lc.small, textAlign: "center" }}>
        Printed on a pressure-seal mailer. If the seal was broken when you
        received this,{" "}
        {c.business.phone ? `call ${c.business.phone}` : "contact us"}{" "}
        immediately.
      </p>
    </Page>
  );
}

/* ------------------------------------------------------------------ */

export function LetterFront({
  ctx: base,
  spec,
}: { ctx: Ctx; spec: FrontSpec }): ReactNode {
  const campaign = base.spec.campaign;
  const tone = toneFor(spec, campaign);
  const lc = letterCtx(base, tone);
  // layouts receive the paper-themed context so every block picks up the swapped colours
  const ctx: Ctx = lc;
  switch (spec.layout) {
    case "letter-band":
      return <LetterBand ctx={ctx} spec={spec} lc={lc} />;
    case "letter-sidebar":
      return <LetterSidebar ctx={ctx} spec={spec} lc={lc} />;
    case "letter-notice":
      return <LetterNotice ctx={ctx} spec={spec} lc={lc} />;
    case "letter-offer":
      return <LetterOffer ctx={ctx} spec={spec} lc={lc} />;
    case "letter-urgent":
      return <LetterUrgent ctx={ctx} spec={spec} lc={lc} />;
    case "letter-reply":
      return <LetterReply ctx={ctx} spec={spec} lc={lc} />;
    case "letter-minimal":
      return <LetterMinimal ctx={ctx} spec={spec} lc={lc} />;
    case "letter-stats":
      return <LetterStats ctx={ctx} spec={spec} lc={lc} />;
    case "letter-photo":
      return <LetterPhoto ctx={ctx} spec={spec} lc={lc} />;
    case "secure-statement":
      return (
        <SecureStatement
          ctx={ctx}
          spec={spec}
          lc={letterCtx(base, "statement")}
        />
      );
    case "secure-notice":
      return (
        <SecureNotice
          ctx={ctx}
          spec={spec}
          lc={letterCtx(
            base,
            campaign === "statement" ? "statement" : "notice",
          )}
        />
      );
    case "letterhead":
    default:
      return <Letterhead ctx={ctx} spec={spec} lc={lc} />;
  }
}

export const LETTER_LAYOUTS = new Set<string>([
  "letterhead",
  "letter-band",
  "letter-sidebar",
  "letter-notice",
  "letter-offer",
  "letter-urgent",
  "letter-reply",
  "letter-minimal",
  "letter-stats",
  "letter-photo",
  "secure-statement",
  "secure-notice",
]);

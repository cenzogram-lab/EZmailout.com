/**
 * Folded and specialty surfaces: trifold brochure, flat & folded notecards,
 * reply postcard (form + Business Reply Mail panel), booklet pages, the
 * letter-size self mailer outside and the pressure-seal (Z-fold) outside.
 *
 * Panels are rendered through a sub-context (`subCtx`) so every existing
 * block scales to the panel instead of the sheet.
 */
import { type CSSProperties, type ReactNode, useId } from "react";
import {
  AddressPanel,
  Body,
  Bullets,
  BusinessLockup,
  ContactStrip,
  Coupon,
  Cta,
  type Ctx,
  Eyebrow,
  FitBox,
  Headline,
  HoursList,
  NumberedList,
  QrBlock,
  Stats,
  Sub,
  Testimonial,
  Website,
} from "./blocks";
import { alpha, mix } from "./color";
import { inToPx } from "./formats";
import { Front } from "./fronts";
import { Icon } from "./icons";
import { composeLetter } from "./letters";
import { ImageSlot, MapPlaceholder, Pattern } from "./placeholders";
import { onAccent, onInk, paperTheme } from "./theme";
import type { BackSpec, FrontSpec, InsideSpec, MailContent } from "./types";

const abs = (extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute",
  ...extra,
});

/* ------------------------------------------------------------------ */
/* panel helpers                                                       */
/* ------------------------------------------------------------------ */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A context whose geometry is the panel, not the sheet. */
export function subCtx(ctx: Ctx, r: Rect, seedOffset = 0): Ctx {
  // tall narrow panels (trifold) get a slightly larger unit than their short side alone would give
  const u = Math.max(Math.min(r.w, r.h) / 100, Math.sqrt(r.w * r.h) / 135);
  return { ...ctx, W: r.w, H: r.h, u, bleedPx: 0, seed: ctx.seed + seedOffset };
}

/** `n` equal panels across the trim, outer panels extended into the bleed. */
export function panelsOf(
  ctx: Ctx,
  n: number,
  axis: "vertical" | "horizontal",
): Rect[] {
  const { W, H, bleedPx } = ctx;
  const out: Rect[] = [];
  if (axis === "vertical") {
    const pw = (W - 2 * bleedPx) / n;
    for (let i = 0; i < n; i++) {
      const x0 = i === 0 ? 0 : bleedPx + i * pw;
      const x1 = i === n - 1 ? W : bleedPx + (i + 1) * pw;
      out.push({ x: x0, y: 0, w: x1 - x0, h: H });
    }
  } else {
    const ph = (H - 2 * bleedPx) / n;
    for (let i = 0; i < n; i++) {
      const y0 = i === 0 ? 0 : bleedPx + i * ph;
      const y1 = i === n - 1 ? H : bleedPx + (i + 1) * ph;
      out.push({ x: 0, y: y0, w: W, h: y1 - y0 });
    }
  }
  return out;
}

export function Panel({
  r,
  children,
  style,
}: { r: Rect; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={abs({
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        overflow: "hidden",
        ...style,
      })}
    >
      {children}
    </div>
  );
}

/** Default sections for brochures/booklets when the content has none. */
function sectionsOf(c: MailContent) {
  if (c.sections?.length) return c.sections;
  const out: { title: string; body?: string; bullets?: string[] }[] = [
    { title: c.subhead ?? c.headline, body: c.body },
  ];
  if (c.bullets?.length)
    out.push({ title: c.listTitle ?? "What we offer", bullets: c.bullets });
  if (c.testimonial)
    out.push({
      title: "What people say",
      body: `“${c.testimonial.quote}” — ${c.testimonial.author}`,
    });
  else if (c.offer)
    out.push({
      title: "Right now",
      body: `${c.offer.headline} ${c.offer.detail}${c.offer.expires ? ` (through ${c.offer.expires})` : ""}.`,
    });
  return out;
}

function Section({
  ctx,
  s,
  size = 1,
}: {
  ctx: Ctx;
  s: { title: string; body?: string; bullets?: string[] };
  size?: number;
}) {
  const { t, u } = ctx;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: u * 1.6 * size }}
    >
      <span
        style={{
          ...t.displayCss,
          fontSize: u * 5 * size,
          textTransform: "none",
          letterSpacing: 0,
          lineHeight: 1.1,
        }}
      >
        {s.title}
      </span>
      {s.body && (
        <Body
          ctx={ctx}
          text={s.body}
          size={2.9 * size}
          style={{ color: t.colors.text }}
        />
      )}
      {s.bullets && <Bullets ctx={ctx} items={s.bullets} size={2.8 * size} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* cover panel (trifold cover, booklet cover fallback)                 */
/* ------------------------------------------------------------------ */

export function CoverPanel({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = ctx.inset + u * 2;
  const photoFirst = spec.flip;
  const imgH = H * (photoFirst ? 0.52 : 0.42);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      {spec.image !== "none" && (
        <div style={abs({ left: 0, right: 0, top: 0, height: imgH })}>
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
          />
        </div>
      )}
      <FitBox
        style={abs({
          left: p,
          right: p,
          top: (spec.image !== "none" ? imgH : 0) + u * 4,
          bottom: p,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          gap: u * 2.4,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 2,
            textAlign: spec.align === "center" ? "center" : "left",
            alignItems: spec.align === "center" ? "center" : "flex-start",
          }}
        >
          <Eyebrow
            ctx={ctx}
            text={ctx.c.eyebrow ?? ctx.c.business.tagline}
            size={2.5}
          />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline ? 12 : 9.5}
            script={spec.scriptHeadline}
            lines={4}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={2.9} />
          {spec.showOffer && ctx.c.offer && (
            <Coupon ctx={ctx} offer={ctx.c.offer} compact />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2.4 }}>
          {ctx.c.cta && (
            <Cta
              ctx={ctx}
              label={ctx.c.cta.label}
              size={2.6}
              style={{
                alignSelf: spec.align === "center" ? "center" : "flex-start",
              }}
            />
          )}
          <BusinessLockup
            ctx={ctx}
            size={2.8}
            showTagline={false}
            align={spec.align === "center" ? "center" : "left"}
          />
        </div>
      </FitBox>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* trifold brochure                                                    */
/* ------------------------------------------------------------------ */

/** Address face of a folded piece — rotated so the lines run along the long dimension. */
function RotatedAddressPanel({ ctx, r }: { ctx: Ctx; r: Rect }) {
  // the panel is r.w wide × r.h tall; the address block is laid out r.h wide × r.w tall and rotated -90°
  const inner = subCtx(ctx, { x: 0, y: 0, w: r.h, h: r.w });
  const p = inner.inset + inner.u * 2;
  return (
    <div
      style={abs({
        left: 0,
        top: r.h,
        width: r.h,
        height: r.w,
        transform: "rotate(-90deg)",
        transformOrigin: "top left",
      })}
    >
      <div
        style={abs({
          left: p,
          right: p,
          top: p,
          bottom: Math.max(p, (ctx.fmt.clearZone ?? 0.625) * 96),
        })}
      >
        <AddressPanel ctx={inner} />
      </div>
    </div>
  );
}

function TrifoldOutside({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, c } = ctx;
  const [flap, mailer, cover] = panelsOf(ctx, 3, "vertical");
  const fc = subCtx(ctx, flap, 1);
  const mc = subCtx(ctx, mailer, 2);
  const cc = subCtx(ctx, cover, 3);
  const p = fc.inset + fc.u * 2;
  const soft = mix(t.colors.bg, t.colors.accent, t.dark ? 0.2 : 0.07);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      {/* inside flap: contact + hours + QR */}
      <Panel r={flap} style={{ background: soft }}>
        <Pattern
          t={t}
          w={flap.w}
          h={flap.h}
          opacity={Math.min(t.pattern.opacity, 0.2)}
        />
        <FitBox
          style={abs({ left: p, right: p, top: p, bottom: p })}
          innerStyle={{
            display: "flex",
            flexDirection: "column",
            gap: fc.u * 3.2,
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: fc.u * 3 }}
          >
            <BusinessLockup ctx={fc} size={3} showTagline />
            <Headline
              ctx={fc}
              text={c.backHeadline ?? "Get in touch"}
              size={7}
              lines={2}
            />
            <Body ctx={fc} text={c.backBody ?? c.body} size={2.8} />
            {c.hours && (
              <div>
                <Eyebrow
                  ctx={fc}
                  text="Hours"
                  size={2.3}
                  style={{ marginBottom: fc.u * 1.2 }}
                />
                <HoursList ctx={fc} size={0.95} />
              </div>
            )}
            <div>
              <Eyebrow
                ctx={fc}
                text="Find us"
                size={2.3}
                style={{ marginBottom: fc.u * 1.2 }}
              />
              <ContactStrip ctx={fc} direction="column" size={2.6} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: fc.u * 2.4,
            }}
          >
            {spec.showOffer !== false && c.offer && (
              <Coupon ctx={fc} offer={c.offer} compact />
            )}
            <QrBlock ctx={fc} size={13} />
          </div>
        </FitBox>
      </Panel>
      {/* mailing panel */}
      <Panel r={mailer} style={{ background: t.colors.bg }}>
        <div
          style={abs({
            left: p,
            right: p,
            top: p,
            display: "flex",
            flexDirection: "column",
            gap: mc.u * 1.2,
            alignItems: "center",
            textAlign: "center",
          })}
        >
          <BusinessLockup
            ctx={mc}
            size={2.6}
            align="center"
            showTagline={false}
          />
          <Website ctx={mc} size={2.3} />
        </div>
        <RotatedAddressPanel
          ctx={ctx}
          r={{ x: mailer.x, y: mailer.y, w: mailer.w, h: mailer.h }}
        />
      </Panel>
      {/* cover */}
      <Panel r={cover}>
        <CoverPanel ctx={cc} spec={spec} />
      </Panel>
    </>
  );
}

function TrifoldInside({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, c } = ctx;
  const panels = panelsOf(ctx, 3, "vertical");
  const secs = sectionsOf(c);
  const recipe = spec.panels ?? "story";
  const band = onAccent(t);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={ctx.W}
          h={ctx.H}
          opacity={Math.min(t.pattern.opacity, 0.15)}
        />
      </div>
      {panels.map((r, i) => {
        const pc = subCtx(ctx, r, 10 + i);
        const p = pc.inset + pc.u * 2;
        const s = secs[i] ?? secs[secs.length - 1];
        const first = i === 0;
        const last = i === 2;
        return (
          <Panel
            key={i}
            r={r}
            style={
              first && recipe !== "gallery"
                ? { background: band.colors.bg }
                : undefined
            }
          >
            {first && recipe !== "gallery" && (
              <Pattern
                t={t}
                w={r.w}
                h={r.h}
                tint={band.colors.text}
                opacity={t.pattern.kind === "none" ? 0 : 0.1}
              />
            )}
            <FitBox
              style={abs({ left: p, right: p, top: p, bottom: p })}
              innerStyle={{
                display: "flex",
                flexDirection: "column",
                gap: pc.u * 3.2,
              }}
            >
              {first ? (
                <>
                  <Eyebrow
                    ctx={pc}
                    text={c.eyebrow ?? c.business.tagline}
                    t={band}
                    size={2.4}
                  />
                  <Headline
                    ctx={pc}
                    text={c.headline}
                    t={band}
                    size={9}
                    lines={4}
                  />
                  <Body
                    ctx={pc}
                    text={c.body}
                    t={band}
                    size={2.9}
                    style={{ color: band.colors.text, opacity: 0.92 }}
                  />
                  {recipe === "stats" && <Stats ctx={pc} t={band} size={0.9} />}
                  <div style={{ flex: 1 }} />
                  {spec.showQr && (
                    <QrBlock ctx={pc} t={band} size={12} light={band.dark} />
                  )}
                  <BusinessLockup
                    ctx={pc}
                    t={band}
                    size={2.6}
                    invert
                    showTagline={false}
                  />
                </>
              ) : last ? (
                <>
                  {(recipe === "services" || recipe === "menu") &&
                  c.coupons?.length ? (
                    <>
                      <Section
                        ctx={pc}
                        s={{ title: recipe === "menu" ? "Specials" : "Offers" }}
                      />
                      {c.coupons.slice(0, 2).map((cp, k) => (
                        <Coupon
                          key={k}
                          ctx={pc}
                          offer={cp}
                          title={cp.title}
                          compact
                        />
                      ))}
                    </>
                  ) : (
                    <Section ctx={pc} s={s} />
                  )}
                  {spec.showTestimonial !== false &&
                    c.testimonial &&
                    recipe !== "story" && <Testimonial ctx={pc} size={0.85} />}
                  <div style={{ flex: 1 }} />
                  {c.cta && (
                    <Cta
                      ctx={pc}
                      label={c.cta.label}
                      size={2.6}
                      style={{ alignSelf: "flex-start" }}
                    />
                  )}
                  <ContactStrip
                    ctx={pc}
                    items={["phone", "website"]}
                    size={2.5}
                    direction="column"
                  />
                </>
              ) : (
                <>
                  {recipe === "gallery" || recipe === "story" ? (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: recipe === "gallery" ? "1 / 1" : "4 / 3",
                        flexShrink: 0,
                      }}
                    >
                      <ImageSlot
                        t={t}
                        src={c.images?.secondary ?? c.images?.hero}
                        seed={pc.seed}
                        radius={t.radius}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  ) : null}
                  {recipe === "services" ? (
                    <>
                      <Section
                        ctx={pc}
                        s={{ title: c.listTitle ?? "Our services" }}
                      />
                      <NumberedList
                        ctx={pc}
                        items={(c.list ?? c.bullets)?.slice(0, 5)}
                        size={2.8}
                      />
                    </>
                  ) : (
                    <Section ctx={pc} s={s} />
                  )}
                  {recipe === "stats" && <Stats ctx={pc} size={0.9} />}
                  {recipe === "menu" && c.hours && (
                    <div>
                      <Eyebrow
                        ctx={pc}
                        text="Hours"
                        size={2.3}
                        style={{ marginBottom: pc.u * 1.2 }}
                      />
                      <HoursList ctx={pc} size={0.95} />
                    </div>
                  )}
                </>
              )}
            </FitBox>
          </Panel>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* notecards                                                           */
/* ------------------------------------------------------------------ */

function greetingOf(ctx: Ctx, spec: FrontSpec) {
  return ctx.c.greeting ?? spec.greeting ?? "Thank you";
}

function NotecardFrontPanel({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = ctx.inset + u * 2;
  const text = greetingOf(ctx, spec);
  const script = spec.scriptHeadline !== false;
  switch (spec.layout) {
    case "notecard-frame": {
      const block = spec.flip ? onAccent(t) : t;
      return (
        <>
          <div style={abs({ inset: 0, background: block.colors.bg })}>
            <Pattern
              t={t}
              w={W}
              h={H}
              tint={block.colors.text}
              opacity={Math.min(t.pattern.opacity, 0.12)}
            />
          </div>
          <div
            style={abs({
              inset: p,
              border: `${Math.max(1, u * 0.35)}px solid ${block.colors.text}`,
            })}
          />
          <div
            style={abs({
              inset: p + u * 1.6,
              border: `1px solid ${block.colors.text}`,
            })}
          />
          <FitBox
            style={abs({ inset: p + u * 5 })}
            innerStyle={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: u * 3,
            }}
          >
            <Eyebrow
              ctx={ctx}
              text={ctx.c.eyebrow ?? ctx.c.business.name}
              t={block}
              size={2.4}
            />
            <Headline
              ctx={ctx}
              text={text}
              t={block}
              size={script ? 16 : 13}
              script={script}
              lines={3}
            />
            <span
              aria-hidden="true"
              style={{
                width: u * 12,
                height: 1,
                background: block.colors.text,
                opacity: 0.6,
              }}
            />
            <Sub
              ctx={ctx}
              text={ctx.c.subhead}
              t={block}
              size={2.8}
              style={{ maxWidth: "85%" }}
            />
          </FitBox>
        </>
      );
    }
    case "notecard-typo": {
      const words = text.split(/\s+/).filter(Boolean).slice(0, 4);
      const longest = Math.max(...words.map((w) => w.length), 3);
      const size = Math.min(
        (W - 2 * p) / (longest * 0.6),
        (H - 2 * p - u * 16) / (words.length * 1.0),
      );
      const colors = [
        t.colors.text,
        t.colors.accent2 === t.colors.bg ? t.colors.accent : t.colors.accent2,
      ];
      return (
        <>
          <div style={abs({ inset: 0, background: t.colors.bg })}>
            <Pattern t={t} w={W} h={H} />
          </div>
          <FitBox
            style={abs({ inset: p })}
            innerStyle={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Eyebrow
              ctx={ctx}
              text={ctx.c.eyebrow ?? ctx.c.business.tagline}
              size={2.4}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {words.map((w, i) => (
                <span
                  key={i}
                  data-fittext=""
                  data-fit-base={size}
                  style={{
                    ...t.displayCss,
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textTransform: "uppercase",
                    fontSize: size,
                    lineHeight: 0.95,
                    color: colors[i % 2],
                    letterSpacing: "-0.02em",
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
            <BusinessLockup ctx={ctx} size={2.6} showTagline={false} />
          </FitBox>
        </>
      );
    }
    case "notecard-pattern": {
      const panelT = t;
      return (
        <>
          <div
            style={abs({
              inset: 0,
              background: spec.flip ? t.colors.accent : t.colors.bg,
            })}
          >
            <Pattern
              t={t}
              w={W}
              h={H}
              kind={t.pattern.kind === "none" ? "florals" : t.pattern.kind}
              tint={spec.flip ? t.colors.onAccent : t.colors.accent2}
              opacity={Math.max(t.pattern.opacity, 0.55)}
            />
          </div>
          <FitBox
            fill={false}
            style={abs({
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: W * 0.72,
              maxHeight: H * 0.6,
              background: alpha(panelT.colors.bg, 0.95),
              borderRadius: t.radius > 14 ? u * 2 : 0,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            })}
            innerStyle={{
              padding: `${u * 5}px ${u * 4}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: u * 2,
            }}
          >
            <Eyebrow
              ctx={ctx}
              text={ctx.c.eyebrow ?? ctx.c.business.name}
              size={2.2}
            />
            <Headline
              ctx={ctx}
              text={text}
              size={script ? 13 : 10}
              script={script}
              lines={3}
            />
          </FitBox>
        </>
      );
    }
    case "notecard-split": {
      const imgH = H * 0.56;
      return (
        <>
          <div style={abs({ inset: 0, background: t.colors.bg })}>
            <Pattern
              t={t}
              w={W}
              h={H}
              opacity={Math.min(t.pattern.opacity, 0.2)}
            />
          </div>
          <div style={abs({ left: 0, right: 0, top: 0, height: imgH })}>
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
            />
          </div>
          <FitBox
            style={abs({ left: p, right: p, top: imgH + u * 3, bottom: p })}
            innerStyle={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "center",
              gap: u * 2,
            }}
          >
            <Headline
              ctx={ctx}
              text={text}
              size={script ? 13 : 10}
              script={script}
              lines={2}
            />
            <Sub ctx={ctx} text={ctx.c.subhead} size={2.7} />
            <Website ctx={ctx} size={2.3} />
          </FitBox>
        </>
      );
    }
    case "notecard-art":
    default: {
      const panelT = onInk(t);
      return (
        <>
          <div style={abs({ inset: 0 })}>
            <ImageSlot
              t={t}
              src={ctx.c.images?.hero}
              illustration={
                spec.image !== "photo" ? ctx.c.illustrations?.hero : undefined
              }
              seed={ctx.seed}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <FitBox
            fill={false}
            style={abs({
              left: p,
              right: p,
              bottom: p,
              maxHeight: H * 0.42,
              background: alpha(
                spec.flip ? panelT.colors.bg : t.colors.bg,
                0.94,
              ),
              borderRadius: t.radius > 14 ? u * 2 : 0,
            })}
            innerStyle={{
              padding: `${u * 4}px ${u * 4}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: u * 1.6,
            }}
          >
            <Headline
              ctx={ctx}
              text={text}
              t={spec.flip ? panelT : t}
              size={script ? 12 : 9.5}
              script={script}
              lines={2}
            />
            <span
              style={{
                ...t.labelCss,
                fontSize: u * 2.2,
                color: spec.flip ? panelT.colors.text : t.colors.muted,
              }}
            >
              {ctx.c.business.name}
            </span>
          </FitBox>
        </>
      );
    }
  }
}

/** Message side: short note + writing lines + logo. */
function NotecardMessagePanel({
  ctx,
  lines = 5,
}: { ctx: Ctx; lines?: number }) {
  const { t, c, u, W, H } = ctx;
  const p = ctx.inset + u * 3;
  const msg = c.message ?? composeLetter(c, "thankyou").paragraphs[0];
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} opacity={Math.min(t.pattern.opacity, 0.1)} />
      </div>
      <FitBox
        style={abs({ left: p, right: p, top: p, bottom: p })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 3 }}
      >
        <Body
          ctx={ctx}
          text={msg}
          size={2.9}
          style={{
            color: t.colors.text,
            fontFamily: t.scriptAccent ? t.font.accent : t.font.body,
            fontSize: u * (t.scriptAccent ? 4.2 : 2.9),
            lineHeight: t.scriptAccent ? 1.35 : 1.5,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 6,
            marginTop: u * 2,
          }}
        >
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} style={{ height: 1, background: t.colors.border }} />
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 2,
          }}
        >
          <BusinessLockup ctx={ctx} size={2.4} showTagline={false} />
          <Website ctx={ctx} size={2.1} />
        </div>
      </FitBox>
    </>
  );
}

function NotecardFront({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  if (ctx.fmt.fold?.kind === "half" && ctx.fmt.fold.axis === "vertical") {
    // folded: outside spread = back cover (left) · front cover (right)
    const [back, front] = panelsOf(ctx, 2, "vertical");
    const bc = subCtx(ctx, back, 1);
    const { t } = ctx;
    const p = bc.inset + bc.u * 3;
    return (
      <>
        <div style={abs({ inset: 0, background: t.colors.bg })} />
        <Panel r={back}>
          <Pattern
            t={t}
            w={back.w}
            h={back.h}
            opacity={Math.min(t.pattern.opacity, 0.12)}
          />
          <div
            style={abs({
              left: p,
              right: p,
              bottom: p,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: bc.u * 1.6,
              textAlign: "center",
            })}
          >
            <BusinessLockup
              ctx={bc}
              size={2.6}
              align="center"
              showTagline={false}
            />
            <Website ctx={bc} size={2.2} />
          </div>
        </Panel>
        <Panel r={front}>
          <NotecardFrontPanel ctx={subCtx(ctx, front, 2)} spec={spec} />
        </Panel>
      </>
    );
  }
  return <NotecardFrontPanel ctx={ctx} spec={spec} />;
}

function NotecardBack({ ctx }: { ctx: Ctx }) {
  if (ctx.fmt.fold?.kind === "half" && ctx.fmt.fold.axis === "vertical") {
    const [left, right] = panelsOf(ctx, 2, "vertical");
    const lc = subCtx(ctx, left, 3);
    const { t } = ctx;
    return (
      <>
        <div style={abs({ inset: 0, background: t.colors.bg })} />
        <Panel r={left}>
          <div
            style={abs({
              inset: 0,
              background: mix(
                t.colors.bg,
                t.colors.accent,
                t.dark ? 0.15 : 0.06,
              ),
            })}
          >
            <Pattern
              t={t}
              w={left.w}
              h={left.h}
              kind={t.pattern.kind === "none" ? "sparkles" : t.pattern.kind}
              opacity={Math.max(Math.min(t.pattern.opacity, 0.5), 0.3)}
            />
          </div>
          <div
            style={abs({
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: left.w * 0.5,
              height: left.w * 0.5,
            })}
          >
            <ImageSlot
              t={t}
              illustration={
                ctx.c.illustrations?.secondary ?? ctx.c.illustrations?.hero
              }
              seed={lc.seed}
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
              }}
            />
          </div>
        </Panel>
        <Panel r={right}>
          <NotecardMessagePanel ctx={subCtx(ctx, right, 4)} lines={6} />
        </Panel>
      </>
    );
  }
  return <NotecardMessagePanel ctx={ctx} />;
}

/* ------------------------------------------------------------------ */
/* reply mail                                                          */
/* ------------------------------------------------------------------ */

function ReplyForm({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, c, u, W, H } = ctx;
  const p = ctx.inset + u * 2;
  const r = c.reply ?? {};
  const options = r.options ?? (c.bullets ?? []).slice(0, 4);
  const fields = r.fields ?? ["Name", "Phone", "Email"];
  const band = onAccent(t);
  const bandH = u * 16;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          opacity={Math.min(t.pattern.opacity, 0.12)}
        />
      </div>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: 0,
          height: bandH,
          background: band.colors.bg,
        })}
      >
        <div
          style={abs({
            left: p,
            right: p,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: u * 3,
          })}
        >
          <BusinessLockup
            ctx={ctx}
            t={band}
            size={3}
            invert
            showTagline={false}
          />
          <span style={{ ...band.labelCss, fontSize: u * 2.4 }}>
            {c.eyebrow ?? "Reply card"}
          </span>
        </div>
      </div>
      <FitBox
        style={abs({ left: p, right: p, top: bandH + u * 3, bottom: p })}
        innerStyle={{ display: "flex", gap: u * 5 }}
      >
        <div
          style={{
            flex: 1.1,
            display: "flex",
            flexDirection: "column",
            gap: u * 2,
          }}
        >
          <Headline
            ctx={ctx}
            text={r.title ?? c.headline}
            size={spec.scriptHeadline ? 11 : 8.5}
            script={spec.scriptHeadline}
            lines={3}
          />
          <Body ctx={ctx} text={r.intro ?? c.body} size={2.7} />
          <div style={{ flex: 1 }} />
          {c.offer && (
            <span style={{ ...t.bodyCss, fontSize: u * 2.6, fontWeight: 700 }}>
              Reply and get {c.offer.headline.toLowerCase()}{" "}
              {c.offer.detail.toLowerCase()}.
            </span>
          )}
          <span
            style={{ ...t.labelCss, fontSize: u * 2.1, color: t.colors.muted }}
          >
            No postage needed — just drop it in the mail
          </span>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: u * 2.2,
          }}
        >
          <span style={{ ...t.labelCss, fontSize: u * 2.3 }}>
            {spec.showBullets === false ? "Tell us" : "Check all that apply"}
          </span>
          {options.map((o) => (
            <label
              key={o}
              style={{
                display: "flex",
                alignItems: "center",
                gap: u * 1.8,
                ...t.bodyCss,
                fontSize: u * 2.7,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: u * 3.4,
                  height: u * 3.4,
                  border: `${Math.max(1, u * 0.35)}px solid ${t.colors.text}`,
                  flexShrink: 0,
                  borderRadius: Math.min(t.radius, 4),
                }}
              />
              {o}
            </label>
          ))}
          <div style={{ flex: 1 }} />
          {fields.map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: u * 1.6,
                ...t.bodyCss,
                fontSize: u * 2.3,
                color: t.colors.muted,
              }}
            >
              <span style={{ fontWeight: 700, minWidth: u * 10 }}>{f}</span>
              <span
                style={{
                  flex: 1,
                  borderBottom: `1px solid ${t.colors.text}`,
                  height: u * 3.2,
                }}
              />
            </div>
          ))}
        </div>
      </FitBox>
    </>
  );
}

/** USPS Business Reply Mail® panel: FIM, no-postage box, permit block, addressee, horizontal bars, barcode zone. */
function BrmBack({ ctx }: { ctx: Ctx }) {
  const { t, c, W, H, u } = ctx;
  const inch = 96;
  const m = ctx.inset + u * 1.5;
  const brm = c.reply?.brm ?? {
    permitNo: "1042",
    city: (c.business.city ?? "ANYTOWN US").toUpperCase(),
    addressee:
      c.mailing?.returnAddress ??
      [c.business.name, c.business.address ?? "", c.business.city ?? ""].filter(
        Boolean,
      ),
  };
  const ink = t.dark ? t.colors.text : "#111111";
  const paper = t.dark ? t.colors.bg : "#FFFFFF";
  const clear = (ctx.fmt.clearZone ?? 0.625) * inch + ctx.bleedPx;
  const fs = Math.max(8, Math.min(11, u * 2.5));
  return (
    <>
      <div style={abs({ inset: 0, background: paper })} />
      {/* FIM-C bars */}
      <div
        data-dm="address"
        style={abs({
          right: 2 * inch,
          top: ctx.bleedPx,
          width: 0.62 * inch,
          height: 0.6 * inch,
          display: "flex",
          alignItems: "flex-start",
          gap: 3,
        })}
        aria-hidden="true"
      >
        {[1, 0, 1, 1, 0, 1, 0, 1, 1].map((on, i) => (
          <span
            key={i}
            style={{ width: 2.5, height: on ? "100%" : "55%", background: ink }}
          />
        ))}
      </div>
      {/* no postage necessary box */}
      <div
        data-dm="address"
        style={abs({
          right: m,
          top: m,
          width: 1.05 * inch,
          height: 0.78 * inch,
          border: `1.5px solid ${ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 4,
          boxSizing: "border-box",
          fontFamily: t.font.body,
          fontWeight: 800,
          fontSize: 7,
          lineHeight: 1.3,
          letterSpacing: "0.04em",
          color: ink,
        })}
      >
        NO POSTAGE
        <br />
        NECESSARY
        <br />
        IF MAILED
        <br />
        IN THE
        <br />
        UNITED STATES
      </div>
      {/* horizontal bars */}
      <div
        data-dm="address"
        style={abs({
          right: m,
          top: m + 0.95 * inch,
          width: 1.05 * inch,
          display: "flex",
          flexDirection: "column",
          gap: 0.07 * inch,
        })}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ height: 0.045 * inch, background: ink }} />
        ))}
      </div>
      {/* permit block + addressee */}
      <div
        data-dm="address"
        style={abs({
          left: m + 0.4 * inch,
          top: m + 0.9 * inch,
          right: 1.6 * inch,
          display: "flex",
          flexDirection: "column",
          gap: u * 0.8,
          color: ink,
        })}
      >
        <span
          style={{
            fontFamily: t.font.body,
            fontWeight: 900,
            fontSize: Math.max(14, u * 4.4),
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          BUSINESS REPLY MAIL
        </span>
        <span
          style={{
            fontFamily: t.font.body,
            fontWeight: 700,
            fontSize: fs * 0.85,
            letterSpacing: "0.06em",
          }}
        >
          FIRST-CLASS MAIL PERMIT NO. {brm.permitNo} {brm.city}
        </span>
        <span
          style={{
            fontFamily: t.font.body,
            fontWeight: 700,
            fontSize: fs * 0.85,
            letterSpacing: "0.06em",
          }}
        >
          POSTAGE WILL BE PAID BY ADDRESSEE
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginTop: u * 3,
            fontFamily: t.font.body,
            fontSize: fs,
            fontWeight: 600,
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {brm.addressee.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
      {/* small brand mark, left */}
      <div style={abs({ left: m, top: m })}>
        <BusinessLockup ctx={ctx} size={2.4} showTagline={false} />
      </div>
      {/* barcode clear zone */}
      <div
        aria-hidden="true"
        data-clear-zone
        style={abs({ left: 0, right: 0, bottom: 0, height: clear })}
      />
      <span
        data-dm="address"
        style={abs({
          left: m,
          bottom: clear + u * 1,
          fontFamily: t.font.body,
          fontSize: 7,
          color: t.colors.muted,
          letterSpacing: "0.06em",
        })}
      >{`${W > H ? "ARTWORK PROOF — " : ""}ZIP+4 BARCODE PRINTED BY MAIL HOUSE`}</span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* letter-size self mailer (half fold) and secure Z-fold outsides       */
/* ------------------------------------------------------------------ */

function SelfMailerOuter({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, c, W } = ctx;
  const [teaser, mailer] = panelsOf(ctx, 2, "horizontal");
  const tc = subCtx(ctx, teaser, 5);
  const mc = subCtx(ctx, mailer, 6);
  const p = tc.inset + tc.u * 2;
  const band = onAccent(t);
  const certified = ctx.spec.mailType?.startsWith("certified");
  const clear = (ctx.fmt.clearZone ?? 0.625) * 96;
  const edge = inToPx(ctx.fmt.printMargin ?? 0);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <Panel r={teaser}>
        <div
          style={abs({
            left: edge,
            right: edge,
            top: edge,
            bottom: 0,
            background: band.colors.bg,
            overflow: "hidden",
          })}
        >
          <Pattern
            t={t}
            w={W - 2 * edge}
            h={teaser.h - edge}
            tint={band.colors.text}
            opacity={t.pattern.kind === "none" ? 0 : 0.12}
          />
        </div>
        <FitBox
          style={abs({
            left: Math.max(p, edge + tc.u * 2),
            right: Math.max(p, edge + tc.u * 2),
            top: Math.max(p, edge + tc.u * 2),
            bottom: p,
          })}
          innerStyle={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: tc.u * 2,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: tc.u * 3,
            }}
          >
            <BusinessLockup ctx={tc} t={band} size={3.2} invert />
            <ContactStrip
              ctx={tc}
              t={band}
              items={["phone", "website"]}
              size={2.4}
              direction="column"
              style={{ alignItems: "flex-end" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: tc.u * 1.6,
              maxWidth: "72%",
            }}
          >
            <Eyebrow
              ctx={tc}
              text={
                c.eyebrow ??
                (certified
                  ? "Certified Mail — important document enclosed"
                  : "Important information enclosed")
              }
              t={band}
              size={2.3}
            />
            <Headline
              ctx={tc}
              text={c.backHeadline ?? c.headline}
              t={band}
              size={8}
              lines={3}
            />
            <Body
              ctx={tc}
              text={c.backBody ?? c.subhead}
              t={band}
              size={2.7}
              style={{ color: band.colors.text, opacity: 0.9 }}
            />
          </div>
          <span style={{ ...band.labelCss, fontSize: tc.u * 2 }}>
            Open along the fold ·{" "}
            {spec.showQr === false ? "" : "Scan the code inside to respond"}
          </span>
        </FitBox>
      </Panel>
      <Panel r={mailer}>
        <div
          style={abs({ left: p, right: p, top: p, bottom: Math.max(p, clear) })}
        >
          <AddressPanel ctx={mc} />
          {certified && (
            <div
              style={abs({
                left: "12%",
                top: "22%",
                width: 3.6 * 96,
                height: 0.9 * 96,
                border: `1px dashed ${t.colors.text}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...t.labelCss,
                fontSize: 8,
                color: t.colors.muted,
                textAlign: "center",
                padding: 4,
              })}
            >
              USPS CERTIFIED MAIL™ LABEL / BARCODE APPLIED HERE
            </div>
          )}
        </div>
      </Panel>
      <div
        aria-hidden="true"
        data-fold
        style={abs({ left: 0, right: 0, top: mailer.y, height: 0 })}
      />
    </>
  );
}

function SecureOuter({ ctx }: { ctx: Ctx }) {
  const { t, c, W } = ctx;
  const [top, mid, bottom] = panelsOf(ctx, 3, "horizontal");
  const strip = (ctx.fmt.tearStrip ?? 0.5) * 96;
  const tc = subCtx(ctx, top, 7);
  const bc = subCtx(ctx, bottom, 8);
  const band = onAccent(t);
  const m = strip + tc.u * 2;
  const clear = (ctx.fmt.clearZone ?? 0.625) * 96;
  const edge = inToPx(ctx.fmt.printMargin ?? 0);
  const hatchColor = alpha(t.colors.text, 0.08);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      {/* tear strips */}
      <div
        aria-hidden="true"
        style={abs({
          left: 0,
          top: 0,
          bottom: 0,
          width: strip,
          borderRight: `1px dashed ${alpha(t.colors.text, 0.5)}`,
        })}
      >
        <Hatch w={strip} h={ctx.H} color={hatchColor} />
      </div>
      <div
        aria-hidden="true"
        style={abs({
          right: 0,
          top: 0,
          bottom: 0,
          width: strip,
          borderLeft: `1px dashed ${alpha(t.colors.text, 0.5)}`,
        })}
      >
        <Hatch w={strip} h={ctx.H} color={hatchColor} />
      </div>
      {/* address face */}
      <Panel r={top}>
        <div
          style={abs({
            left: strip,
            right: strip,
            top: edge,
            height: tc.u * 7,
            background: band.colors.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: tc.u * 1.5,
            ...band.labelCss,
            fontSize: tc.u * 2.2,
          })}
        >
          <Icon name="shield" size={tc.u * 3} strokeWidth={2.2} />
          Important document enclosed — do not discard
        </div>
        <div
          style={abs({
            left: m,
            right: m,
            top: edge + tc.u * 9,
            bottom: Math.max(tc.u * 2, clear),
          })}
        >
          <AddressPanel ctx={tc} />
        </div>
      </Panel>
      {/* inside-the-fold panel */}
      <Panel r={mid}>
        <div
          style={abs({
            left: strip,
            right: strip,
            top: 0,
            bottom: 0,
            background: mix(t.colors.bg, t.colors.accent, t.dark ? 0.12 : 0.05),
          })}
        >
          <Pattern
            t={t}
            w={W - 2 * strip}
            h={mid.h}
            opacity={Math.min(t.pattern.opacity, 0.12)}
          />
          <div
            style={abs({
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: tc.u * 1.5,
              textAlign: "center",
              whiteSpace: "nowrap",
            })}
          >
            <BusinessLockup
              ctx={tc}
              size={2.6}
              align="center"
              showTagline={false}
            />
            <span
              style={{
                ...t.labelCss,
                fontSize: tc.u * 2,
                color: t.colors.muted,
              }}
            >
              Confidential · sealed for the addressee
            </span>
          </div>
        </div>
      </Panel>
      {/* instructions face */}
      <Panel r={bottom}>
        <FitBox
          style={abs({
            left: m,
            right: m,
            top: bc.u * 3,
            bottom: Math.max(bc.u * 3, edge + bc.u * 1.5),
          })}
          innerStyle={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: bc.u * 2,
          }}
        >
          <div
            style={{ display: "flex", gap: bc.u * 4, alignItems: "flex-start" }}
          >
            {[
              ["1", "Tear off the strip on each side along the perforation"],
              ["2", "Fold the top panel back, then the bottom panel"],
              ["3", "Your document is inside — keep it for your records"],
            ].map(([n, txt]) => (
              <div
                key={n}
                style={{
                  flex: 1,
                  display: "flex",
                  gap: bc.u * 2,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    ...t.displayCss,
                    fontSize: bc.u * 7,
                    color:
                      t.colors.accent2 === t.colors.bg
                        ? t.colors.text
                        : t.colors.accent2,
                    lineHeight: 1,
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    ...t.bodyCss,
                    fontSize: bc.u * 2.6,
                    fontWeight: 600,
                  }}
                >
                  {txt}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: bc.u * 3,
            }}
          >
            <ContactStrip ctx={bc} items={["phone", "website"]} size={2.4} />
            <span
              style={{
                ...t.labelCss,
                fontSize: bc.u * 2,
                color: t.colors.muted,
              }}
            >
              {c.eyebrow ?? "Pressure-sealed mailer"}
            </span>
          </div>
        </FitBox>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* booklet pages                                                       */
/* ------------------------------------------------------------------ */

/** Cover with an optional reserved address zone (address-on-front-page booklets). */
function BookletCover({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  if (!spec.addressZone)
    return <Front ctx={ctx} spec={{ ...spec, addressZone: false }} />;
  const { t, W, H } = ctx;
  const zoneH = H * 0.4;
  const art: Rect = { x: 0, y: 0, w: W, h: H - zoneH };
  const zone: Rect = { x: 0, y: H - zoneH, w: W, h: zoneH };
  const zc = subCtx(ctx, zone, 9);
  const p = zc.inset + zc.u * 2;
  const clear = (ctx.fmt.clearZone ?? 0.625) * 96 + ctx.bleedPx;
  return (
    <>
      <Panel r={art}>
        <Front ctx={subCtx(ctx, art)} spec={{ ...spec, addressZone: false }} />
      </Panel>
      <Panel
        r={zone}
        style={{
          background: t.dark ? t.colors.surface : "#FFFFFF",
          borderTop: `1px solid ${t.colors.border}`,
        }}
      >
        <div
          style={abs({ left: p, right: p, top: p, bottom: Math.max(p, clear) })}
        >
          <AddressPanel
            ctx={zc}
            t={{
              ...t,
              colors: { ...t.colors, text: t.dark ? t.colors.text : "#111111" },
            }}
          />
        </div>
      </Panel>
    </>
  );
}

function InsidePage({
  ctx,
  page,
  inside,
}: { ctx: Ctx; page: "left" | "right"; inside: InsideSpec }) {
  const { t, c, u, W, H } = ctx;
  const p = ctx.inset + u * 2;
  const secs = sectionsOf(c);
  const layout = inside.layout;
  const left = page === "left";
  const band = onAccent(t);
  // right-page cards: the lead section repeats the left page and the testimonial has its own block
  const own = c.sections?.length
    ? secs
    : secs
        .slice(1)
        .filter(
          (s) => !s.bullets && (!c.testimonial || !s.body?.startsWith("“")),
        );
  const cards: { title: string; body?: string; bullets?: string[] }[] = (
    own.length >= 2
      ? own
      : (c.bullets ?? []).slice(0, 4).map((b) => ({ title: b }))
  ).slice(0, 4);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          opacity={Math.min(t.pattern.opacity, 0.12)}
        />
      </div>
      <FitBox
        style={abs({ left: p, right: p, top: p, bottom: p })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 3.2 }}
      >
        {left ? (
          <>
            <Eyebrow
              ctx={ctx}
              text={c.eyebrow ?? c.business.tagline}
              size={2.3}
            />
            <Headline ctx={ctx} text={c.headline} size={9} lines={3} />
            {layout === "stats" && <Stats ctx={ctx} size={1} />}
            <Body
              ctx={ctx}
              text={c.body}
              size={2.9}
              style={{ color: t.colors.text, maxWidth: "92%" }}
            />
            {layout === "gallery" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: u * 2,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <ImageSlot
                    key={i}
                    t={t}
                    src={
                      c.images?.gallery?.[i] ??
                      (i === 0 ? c.images?.hero : undefined)
                    }
                    seed={ctx.seed + i}
                    radius={t.radius}
                    style={{ width: "100%", height: "100%", minHeight: u * 20 }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: u * 24 }}>
                <ImageSlot
                  t={t}
                  src={c.images?.hero}
                  seed={ctx.seed}
                  radius={t.radius}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
            {layout === "services" && (
              <NumberedList
                ctx={ctx}
                items={(c.list ?? c.bullets)?.slice(0, 4)}
                size={2.8}
              />
            )}
            {layout === "story" && secs[0] && (
              <Section ctx={ctx} s={secs[1] ?? secs[0]} />
            )}
            {layout === "menu" && c.coupons?.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: u * 2.4,
                }}
              >
                {c.coupons.slice(0, 2).map((cp, i) => (
                  <Coupon
                    key={i}
                    ctx={ctx}
                    offer={cp}
                    title={cp.title}
                    compact
                  />
                ))}
              </div>
            ) : null}
            {inside.showTestimonial && layout !== "stats" && (
              <Testimonial ctx={ctx} size={0.9} />
            )}
          </>
        ) : (
          <>
            <div
              style={{
                background: band.colors.bg,
                padding: `${u * 3}px ${u * 3.5}px`,
                borderRadius: Math.min(t.radius, 10),
                display: "flex",
                flexDirection: "column",
                gap: u * 1.2,
              }}
            >
              <Eyebrow
                ctx={ctx}
                text={
                  layout === "menu"
                    ? "Specials & hours"
                    : layout === "services"
                      ? "Services"
                      : layout === "gallery"
                        ? "Highlights"
                        : "Why us"
                }
                t={band}
                size={2.2}
              />
              <Headline
                ctx={ctx}
                text={
                  c.listTitle ??
                  (layout === "services"
                    ? "What we offer"
                    : layout === "menu"
                      ? "On the menu"
                      : "What to expect")
                }
                t={band}
                size={7}
                lines={2}
              />
            </div>
            {layout === "services" || layout === "story" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: u * 2.6,
                }}
              >
                {cards.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      ...t.cardCss,
                      padding: u * 3,
                      boxShadow: "none",
                      border: `1px solid ${t.colors.border}`,
                    }}
                  >
                    <Section
                      ctx={ctx}
                      s={{ ...s, body: s.body?.slice(0, 160) }}
                      size={0.9}
                    />
                  </div>
                ))}
              </div>
            ) : layout === "gallery" ? (
              <>
                <Bullets ctx={ctx} items={c.bullets} size={2.9} columns={2} />
                <Body
                  ctx={ctx}
                  text={secs[0]?.body}
                  size={2.9}
                  style={{ color: t.colors.text }}
                />
              </>
            ) : layout === "menu" ? (
              <>
                <Bullets ctx={ctx} items={c.bullets} size={2.9} />
                {c.hours && (
                  <div style={{ display: "flex", gap: u * 5 }}>
                    <div style={{ flex: 1 }}>
                      <Eyebrow
                        ctx={ctx}
                        text="Hours"
                        size={2.3}
                        style={{ marginBottom: u * 1.2 }}
                      />
                      <HoursList ctx={ctx} size={1} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        ...t.cardCss,
                        overflow: "hidden",
                        minHeight: u * 24,
                        border: `1px solid ${t.colors.border}`,
                        boxShadow: "none",
                      }}
                    >
                      <MapPlaceholder t={t} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Bullets ctx={ctx} items={c.bullets} size={2.9} />
                {secs[2] && !c.testimonial && <Section ctx={ctx} s={secs[2]} />}
              </>
            )}
            {(layout === "stats" || layout === "services") &&
              c.stats &&
              layout !== "stats" && <Stats ctx={ctx} size={1} />}
            {inside.showTestimonial !== false &&
              c.testimonial &&
              layout !== "story" && <Testimonial ctx={ctx} size={0.95} />}
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: u * 4, alignItems: "stretch" }}>
              {inside.showOffer !== false && c.offer && (
                <Coupon ctx={ctx} offer={c.offer} style={{ flex: 1 }} />
              )}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: u * 2,
                }}
              >
                {c.cta && (
                  <Cta
                    ctx={ctx}
                    label={c.cta.label}
                    size={2.6}
                    style={{ alignSelf: "flex-start" }}
                  />
                )}
                <QrBlock ctx={ctx} size={12} />
              </div>
            </div>
          </>
        )}
      </FitBox>
    </>
  );
}

function BookletBack({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, c, u, W, H } = ctx;
  const p = ctx.inset + u * 2;
  const band = onAccent(t);
  const clear = (ctx.fmt.clearZone ?? 0.625) * 96 + ctx.bleedPx;
  const withZone =
    spec.layout === "booklet-mailer" || spec.layout === "booklet-address";
  const zoneH = spec.layout === "booklet-mailer" ? H * 0.5 : H * 0.42;
  const art: Rect = { x: 0, y: 0, w: W, h: withZone ? H - zoneH : H };
  const ac = subCtx(ctx, art, 11);
  const ap = ac.inset + ac.u * 2;
  const artT = spec.layout === "booklet-mailer" ? band : t;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })} />
      <Panel r={art} style={{ background: artT.colors.bg }}>
        <Pattern
          t={t}
          w={art.w}
          h={art.h}
          tint={artT === band ? band.colors.text : undefined}
          opacity={
            artT === band
              ? t.pattern.kind === "none"
                ? 0
                : 0.12
              : Math.min(t.pattern.opacity, 0.15)
          }
        />
        <FitBox
          style={abs({ left: ap, right: ap, top: ap, bottom: ap })}
          innerStyle={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: ac.u * 3,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: ac.u * 3,
            }}
          >
            <BusinessLockup
              ctx={ac}
              t={artT}
              size={3.2}
              invert={artT === band}
            />
            {spec.showQr !== false && (
              <QrBlock
                ctx={ac}
                t={artT}
                size={12}
                light={artT.dark}
                direction="column"
              />
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: ac.u * 2,
              maxWidth: "78%",
            }}
          >
            <Headline
              ctx={ac}
              text={c.backHeadline ?? c.headline}
              t={artT}
              size={withZone ? 8 : 10}
              lines={3}
            />
            <Body
              ctx={ac}
              text={c.backBody ?? c.body}
              t={artT}
              size={2.8}
              style={{ color: artT.colors.text, opacity: 0.9 }}
            />
            {!withZone && spec.showBullets && (
              <Bullets
                ctx={ac}
                items={c.bullets}
                t={artT}
                size={2.8}
                columns={2}
              />
            )}
            {!withZone && c.cta && (
              <Cta
                ctx={ac}
                label={c.cta.label}
                t={artT}
                fill={artT === band ? "ink" : "accent"}
                size={2.6}
                style={{ alignSelf: "flex-start" }}
              />
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: ac.u * 3,
            }}
          >
            <ContactStrip
              ctx={ac}
              t={artT}
              size={2.5}
              direction={withZone ? "row" : "column"}
            />
            {!withZone && spec.showHours !== false && c.hours && (
              <div style={{ minWidth: "34%" }}>
                <Eyebrow
                  ctx={ac}
                  text="Hours"
                  t={artT}
                  size={2.3}
                  style={{ marginBottom: ac.u * 1.2 }}
                />
                <HoursList ctx={ac} t={artT} size={0.95} />
              </div>
            )}
          </div>
        </FitBox>
      </Panel>
      {withZone && (
        <Panel
          r={{ x: 0, y: art.h, w: W, h: zoneH }}
          style={{
            background: t.dark ? t.colors.surface : "#FFFFFF",
            borderTop: `1px solid ${t.colors.border}`,
          }}
        >
          <div
            style={abs({
              left: p,
              right: p,
              top: p,
              bottom: Math.max(p, clear),
            })}
          >
            <AddressPanel
              ctx={subCtx(ctx, { x: 0, y: art.h, w: W, h: zoneH }, 12)}
              t={{
                ...t,
                colors: {
                  ...t.colors,
                  text: t.dark ? t.colors.text : "#111111",
                },
              }}
            />
          </div>
        </Panel>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* dispatchers                                                         */
/* ------------------------------------------------------------------ */

export const FOLD_FRONT_LAYOUTS = new Set<string>([
  "trifold",
  "notecard-art",
  "notecard-frame",
  "notecard-typo",
  "notecard-pattern",
  "notecard-split",
  "reply-form",
]);
export const FOLD_BACK_LAYOUTS = new Set<string>([
  "brm",
  "trifold-inside",
  "notecard-message",
  "notecard-back",
  "selfmailer-outer",
  "secure-outer",
  "booklet-mailer",
  "booklet-address",
  "booklet-back",
]);

export function FoldFront({
  ctx,
  spec,
}: { ctx: Ctx; spec: FrontSpec }): ReactNode {
  if (ctx.fmt.category === "booklet")
    return <BookletCover ctx={ctx} spec={spec} />;
  switch (spec.layout) {
    case "trifold":
      return <TrifoldOutside ctx={ctx} spec={spec} />;
    case "reply-form":
      return <ReplyForm ctx={ctx} spec={spec} />;
    case "notecard-art":
    case "notecard-frame":
    case "notecard-typo":
    case "notecard-pattern":
    case "notecard-split":
      return <NotecardFront ctx={ctx} spec={spec} />;
    default:
      return null;
  }
}

export function FoldBack({
  ctx: base,
  spec,
}: { ctx: Ctx; spec: BackSpec }): ReactNode {
  // letter-size self mailers print on white 24# stock: flip dark palettes to paper
  const ctx: Ctx =
    spec.layout === "selfmailer-outer" || spec.layout === "secure-outer"
      ? { ...base, t: paperTheme(base.t) }
      : base;
  switch (spec.layout) {
    case "brm":
      return <BrmBack ctx={ctx} />;
    case "trifold-inside":
      return <TrifoldInside ctx={ctx} spec={spec} />;
    case "notecard-message":
    case "notecard-back":
      return <NotecardBack ctx={ctx} />;
    case "selfmailer-outer":
      return <SelfMailerOuter ctx={ctx} spec={spec} />;
    case "secure-outer":
      return <SecureOuter ctx={ctx} />;
    case "booklet-mailer":
    case "booklet-address":
    case "booklet-back":
      return <BookletBack ctx={ctx} spec={spec} />;
    default:
      return null;
  }
}

export function BookletInside({
  ctx,
  page,
}: { ctx: Ctx; page: "left" | "right" }): ReactNode {
  return (
    <InsidePage
      ctx={ctx}
      page={page}
      inside={ctx.spec.inside ?? { layout: "story" }}
    />
  );
}

/** Diagonal hatching for the tear strips, as SVG (see `Pattern`). */
function Hatch({ w, h, color }: { w: number; h: number; color: string }) {
  const id = `h${useId().replace(/:/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        <pattern
          id={id}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={2} height={8} fill={color} />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
    </svg>
  );
}

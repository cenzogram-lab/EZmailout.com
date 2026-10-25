import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Bullets,
  BusinessLockup,
  ContactStrip,
  Coupon,
  Cta,
  type Ctx,
  EventBlock,
  Eyebrow,
  FitBox,
  Headline,
  NumberedList,
  OfferBig,
  Stats,
  Sub,
  Website,
} from "./blocks";
import { alpha } from "./color";
import {
  CircleStamp,
  ImageSlot,
  Pattern,
  Ribbon,
  Starburst,
  Tag,
} from "./placeholders";
import { type ResolvedTheme, onAccent, onInk } from "./theme";
import type { Coupon as CouponT, FrontSpec } from "./types";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const abs = (extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute",
  ...extra,
});

function pad(ctx: Ctx) {
  return ctx.inset + ctx.u * 2;
}

function Badge({
  ctx,
  spec,
  t = ctx.t,
  style,
}: { ctx: Ctx; spec: FrontSpec; t?: ResolvedTheme; style?: CSSProperties }) {
  const b = spec.badge ?? "none";
  const o = ctx.c.offer;
  const u = ctx.u;
  if (b === "none") return null;
  if (b === "starburst" && o)
    return (
      <Starburst
        t={t}
        lines={[o.headline, o.detail.length > 18 ? "limited time" : o.detail]}
        size={u * 26}
        style={style}
      />
    );
  if (b === "circle")
    return (
      <CircleStamp
        t={t}
        text={`${ctx.c.eyebrow ?? ctx.c.business.tagline ?? ctx.c.business.name} • `}
        inner={o ? o.headline : undefined}
        size={u * 22}
        style={style}
      />
    );
  if (b === "ribbon")
    return (
      <Ribbon
        t={t}
        text={ctx.c.eyebrow ?? o?.headline ?? "Limited time"}
        fontSize={u * 2.6}
        style={style}
      />
    );
  if (b === "tag" && o)
    return (
      <Tag
        t={t}
        text={o.headline}
        sub={o.detail.length > 22 ? undefined : o.detail}
        style={{ fontSize: u * 2, ...style }}
      />
    );
  return null;
}

function Frame({
  ctx,
  t = ctx.t,
  offset,
}: { ctx: Ctx; t?: ResolvedTheme; offset?: number }) {
  if (!t.frame) return null;
  const o = offset ?? ctx.inset + ctx.u * 1.2;
  return (
    <div
      aria-hidden="true"
      style={abs({
        inset: o,
        border: `${Math.max(1, ctx.u * 0.3)}px solid ${t.colors.text}`,
        pointerEvents: "none",
        borderRadius: t.radius > 14 ? ctx.u * 2 : 0,
      })}
    />
  );
}

function Eyebrowed({
  ctx,
  spec,
  t,
  size,
}: { ctx: Ctx; spec: FrontSpec; t?: ResolvedTheme; size?: number }) {
  const text =
    spec.showEyebrow === false
      ? undefined
      : (ctx.c.eyebrow ?? ctx.c.business.tagline);
  return <Eyebrow ctx={ctx} text={text} t={t} size={size} />;
}

function heroImage(ctx: Ctx, spec: FrontSpec, seed = 0, style?: CSSProperties) {
  if (spec.image === "none") return null;
  const c = ctx.c;
  return (
    <ImageSlot
      t={ctx.t}
      src={c.images?.hero}
      illustration={
        spec.image === "illustration"
          ? (c.illustrations?.hero ?? "star")
          : undefined
      }
      seed={ctx.seed + seed}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}

function Details({
  ctx,
  spec,
  t = ctx.t,
  align = "left",
  maxBullets = 4,
  bulletColumns = 1,
  showCta = true,
  offerSize,
}: {
  ctx: Ctx;
  spec: FrontSpec;
  t?: ResolvedTheme;
  align?: "left" | "center";
  maxBullets?: number;
  bulletColumns?: 1 | 2;
  showCta?: boolean;
  offerSize?: number;
}) {
  const u = ctx.u;
  const short = ctx.H < 500 && ctx.W >= ctx.H;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: u * 2.4,
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {spec.showOffer && ctx.c.offer && (
        <OfferBig
          ctx={ctx}
          offer={ctx.c.offer}
          t={t}
          size={offerSize ?? (short ? 10 : 12)}
          align={align}
        />
      )}
      {spec.showBullets && (
        <Bullets
          ctx={ctx}
          items={ctx.c.bullets?.slice(0, maxBullets)}
          t={t}
          columns={bulletColumns}
        />
      )}
      {spec.showEvent && (
        <EventBlock ctx={ctx} t={t} horizontal={align === "left"} size={0.9} />
      )}
      {spec.showStats && <Stats ctx={ctx} t={t} size={0.9} />}
      {showCta && ctx.c.cta && (
        <Cta
          ctx={ctx}
          label={ctx.c.cta.label}
          t={t}
          fill={t.colors.accent === t.colors.bg ? "accent2" : "accent"}
        />
      )}
      {spec.showContact && <ContactStrip ctx={ctx} t={t} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* layouts                                                             */
/* ------------------------------------------------------------------ */

function FullPhoto({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const panelT = t.colors.accent === t.colors.bg ? onInk(t) : onAccent(t);
  const center = (spec.align ?? "center") === "center";
  const short = H < 500 && W >= H;
  return (
    <>
      <div style={abs({ inset: 0 })}>{heroImage(ctx, spec)}</div>
      {spec.showLogo !== false && (
        <div style={abs({ left: p, top: p })}>
          <BusinessLockup
            ctx={ctx}
            t={onInk({ ...t, ink: "#FFFFFF" })}
            size={3.2}
            invert
            showTagline={false}
          />
        </div>
      )}
      <div style={abs({ right: p, top: p })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
      <FitBox
        fill={false}
        style={abs({
          ...(center
            ? {
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: W * 0.72,
              }
            : { left: p, bottom: p, maxWidth: W * 0.64 }),
          maxHeight: center ? H - 2 * (p + u * 7) : H - 2 * p - u * 8,
          background: alpha(panelT.colors.bg, 0.94),
          color: panelT.colors.text,
          borderRadius: t.radius > 14 ? u * 2 : 0,
        })}
        innerStyle={{
          padding: short ? `${u * 4}px ${u * 5}px` : `${u * 5}px ${u * 6}px`,
          display: "flex",
          flexDirection: "column",
          gap: u * (short ? 1.8 : 2.2),
          boxSizing: "border-box",
          ...(center ? { textAlign: "center", alignItems: "center" } : {}),
        }}
      >
        <Eyebrowed ctx={ctx} spec={spec} t={panelT} />
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          t={panelT}
          size={
            spec.scriptHeadline
              ? short
                ? 11.5
                : 14
              : H > W
                ? 12
                : short
                  ? 10
                  : 11
          }
          script={spec.scriptHeadline}
          lines={3}
        />
        <Sub ctx={ctx} text={ctx.c.subhead} t={panelT} size={short ? 3 : 3.3} />
        <Details
          ctx={ctx}
          spec={spec}
          t={panelT}
          align={center ? "center" : "left"}
        />
      </FitBox>
    </>
  );
}

function SplitH({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, u } = ctx;
  const p = pad(ctx);
  const block = onAccent(t);
  const imgLeft = !spec.flip;
  const split = 0.5;
  const imgStyle: CSSProperties = imgLeft
    ? { left: 0, width: W * split }
    : { right: 0, width: W * split };
  const textStyle: CSSProperties = imgLeft
    ? { right: 0, width: W * (1 - split) }
    : { left: 0, width: W * (1 - split) };
  return (
    <>
      <div style={abs({ top: 0, bottom: 0, ...imgStyle })}>
        {heroImage(ctx, spec)}
      </div>
      <div
        style={abs({
          top: 0,
          bottom: 0,
          ...textStyle,
          background: block.colors.bg,
          overflow: "hidden",
        })}
      >
        <Pattern
          t={t}
          w={W * (1 - split)}
          h={ctx.H}
          tint={block.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.12}
        />
        <FitBox
          style={abs({ inset: 0 })}
          innerStyle={{
            padding: `${p}px ${p}px ${p}px ${imgLeft ? u * 6 : p}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: u * 2,
            }}
          >
            {spec.showLogo !== false ? (
              <BusinessLockup
                ctx={ctx}
                t={block}
                size={3}
                invert
                showTagline={false}
              />
            ) : (
              <span />
            )}
            <Badge ctx={ctx} spec={spec} t={block} />
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: u * 2.4 }}
          >
            <Eyebrowed ctx={ctx} spec={spec} t={block} />
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              t={block}
              size={spec.scriptHeadline ? 13 : 11}
              script={spec.scriptHeadline}
              lines={4}
            />
            <Sub ctx={ctx} text={ctx.c.subhead} t={block} size={3.2} />
            <Details ctx={ctx} spec={spec} t={block} />
          </div>
          <Website ctx={ctx} t={block} size={2.4} />
        </FitBox>
      </div>
    </>
  );
}

function SplitV({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const portrait = H > W;
  const imgH = H * (spec.flip ? 0.4 : portrait ? 0.46 : 0.55);
  const top = !spec.flip;
  return (
    <>
      <div
        style={abs({
          left: 0,
          right: 0,
          ...(top ? { top: 0 } : { bottom: 0 }),
          height: imgH,
        })}
      >
        {heroImage(ctx, spec)}
      </div>
      <div
        style={abs({
          left: 0,
          right: 0,
          ...(top ? { bottom: 0 } : { top: 0 }),
          height: H - imgH,
          background: t.colors.bg,
          overflow: "hidden",
        })}
      >
        <Pattern t={t} w={W} h={H - imgH} />
        <FitBox
          style={abs({ inset: 0 })}
          innerStyle={{
            padding: `${u * 3.5}px ${p}px ${top ? p : u * 3.5}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: u * 2,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: u * 1.8 }}
          >
            <Eyebrowed ctx={ctx} spec={spec} />
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              size={spec.scriptHeadline ? 12 : portrait ? 9 : 10}
              script={spec.scriptHeadline}
              lines={2}
            />
            <Sub ctx={ctx} text={ctx.c.subhead} size={3} />
          </div>
          <Details
            ctx={ctx}
            spec={spec}
            maxBullets={4}
            bulletColumns={portrait ? 1 : 2}
            showCta={false}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: u * 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: u * 4 }}>
              {spec.showLogo !== false && (
                <BusinessLockup ctx={ctx} size={2.8} showTagline={false} />
              )}
              <ContactStrip ctx={ctx} items={["phone", "website"]} size={2.4} />
            </div>
            {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} size={2.7} />}
          </div>
        </FitBox>
      </div>
      <div style={abs({ right: p, ...(top ? { top: p } : { bottom: p }) })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

function ColorFrame({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const block = t.colors.accent === t.colors.bg ? t : onAccent(t);
  const p = pad(ctx);
  return (
    <>
      <div style={abs({ inset: 0, background: block.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          tint={block.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.1}
        />
      </div>
      <Frame ctx={ctx} t={block} offset={p} />
      <FitBox
        style={abs({
          left: p + u * 4,
          right: p + u * 4,
          top: p + u * 4,
          bottom: p + u * 7,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: u * 3,
        }}
      >
        <Eyebrowed ctx={ctx} spec={spec} t={block} />
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          t={block}
          size={spec.scriptHeadline ? (H < 500 && W >= H ? 13 : 16) : 13}
          script={spec.scriptHeadline}
          lines={4}
          style={{ maxWidth: "88%" }}
        />
        <span
          aria-hidden="true"
          style={{
            width: u * 2.2,
            height: u * 2.2,
            background: block.colors.text,
            transform: "rotate(45deg)",
            flexShrink: 0,
          }}
        />
        <Sub
          ctx={ctx}
          text={ctx.c.subhead}
          t={block}
          size={3.3}
          style={{ maxWidth: "80%" }}
        />
        <Details ctx={ctx} spec={spec} t={block} align="center" />
      </FitBox>
      <div
        style={abs({
          left: 0,
          right: 0,
          bottom: p + u * 2.2,
          display: "flex",
          justifyContent: "center",
        })}
      >
        <span style={{ ...block.labelCss, fontSize: u * 2.4 }}>
          {ctx.c.business.name}
        </span>
      </div>
      <div style={abs({ right: p + u * 2, top: p + u * 2 })}>
        <Badge ctx={ctx} spec={spec} t={block} />
      </div>
    </>
  );
}

function PatternPanel({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const stripW = Math.max(u * 9, ctx.inset + u * 6);
  const strip = onAccent(t);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          kind={t.pattern.kind === "none" ? "chevron" : t.pattern.kind}
          tint={t.colors.accent2}
          opacity={Math.max(t.pattern.opacity, 0.55)}
        />
      </div>
      <div
        style={abs({
          left: 0,
          top: 0,
          bottom: 0,
          width: stripW,
          background: strip.colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: ctx.inset * 0.7,
          boxSizing: "border-box",
        })}
      >
        <span
          style={{
            ...strip.labelCss,
            fontSize: u * 2.4,
            whiteSpace: "nowrap",
            transform: "rotate(-90deg)",
            letterSpacing: "0.3em",
          }}
        >
          {ctx.c.eyebrow ?? ctx.c.business.tagline ?? ctx.c.business.name}
        </span>
      </div>
      <FitBox
        style={abs({
          left: stripW + u * 6,
          right: p + u * 2,
          top: p + u * 3,
          bottom: p + u * 3,
          ...t.cardCss,
          borderRadius: t.radius > 14 ? u * 2 : 0,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: u * 2.4,
          padding: `${u * 5}px ${u * 6}px`,
          boxSizing: "border-box",
          textAlign: spec.align === "left" ? "left" : "center",
          alignItems: spec.align === "left" ? "flex-start" : "center",
        }}
      >
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          size={spec.scriptHeadline ? 15 : 12}
          script={spec.scriptHeadline}
          lines={3}
        />
        <Sub ctx={ctx} text={ctx.c.subhead} size={3.2} />
        <Details
          ctx={ctx}
          spec={spec}
          align={spec.align === "left" ? "left" : "center"}
        />
        <span
          style={{ ...t.labelCss, fontSize: u * 2.3, color: t.colors.muted }}
        >
          {ctx.c.business.name}
          {ctx.c.business.website
            ? ` · ${ctx.c.business.website.replace(/^https?:\/\//, "")}`
            : ""}
        </span>
      </FitBox>
      <div style={abs({ right: p + u * 1, top: p })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

function Shapes({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          kind={t.pattern.kind === "none" ? "memphis" : t.pattern.kind}
          opacity={
            t.pattern.kind === "memphis" || t.pattern.kind === "none"
              ? 0.9
              : t.pattern.opacity
          }
        />
      </div>
      <FitBox
        style={abs({ left: p, top: p, right: p, bottom: p })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {spec.showLogo !== false ? (
            <BusinessLockup ctx={ctx} size={3} showTagline={false} />
          ) : (
            <span />
          )}
          <Badge ctx={ctx} spec={spec} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 2.4,
            maxWidth: W * 0.62,
            background: alpha(t.colors.bg, 0.86),
            padding: u * 3,
            margin: `0 0 0 ${-u * 3}px`,
            borderRadius: u,
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline ? 14 : 12}
            script={spec.scriptHeadline}
            lines={3}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={3.2} />
          <Details ctx={ctx} spec={spec} />
        </div>
      </FitBox>
    </>
  );
}

function OverlapCard({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const card = onAccent(t);
  const landscape = W >= H;
  const imgW = landscape ? W * 0.6 : W;
  const imgH = landscape ? H : H * 0.55;
  const cardStyle: CSSProperties = landscape
    ? { right: p, top: p + u * 2, bottom: p + u * 2, width: W * 0.47 }
    : {
        left: p + u * 2,
        right: p + u * 2,
        top: imgH - u * 10,
        bottom: p + u * 9,
      };
  return (
    <>
      <div
        style={abs({
          left: spec.flip && landscape ? W - imgW : 0,
          top: 0,
          width: imgW,
          height: imgH,
        })}
      >
        {heroImage(ctx, spec)}
      </div>
      {landscape && (
        <div
          style={abs({
            left: spec.flip ? 0 : imgW,
            top: 0,
            bottom: 0,
            width: W - imgW,
            background: t.colors.bg,
          })}
        />
      )}
      {!landscape && (
        <div
          style={abs({
            left: 0,
            right: 0,
            top: imgH,
            bottom: 0,
            background: t.colors.bg,
          })}
        />
      )}
      <FitBox
        style={abs({
          ...cardStyle,
          ...(landscape && spec.flip
            ? { left: p, right: "auto", width: W * 0.47 }
            : {}),
          background: card.colors.bg,
          color: card.colors.text,
          borderRadius: t.radius > 14 ? u * 2 : 0,
          boxShadow:
            t.shadow === "hard"
              ? `6px 6px 0 ${t.ink}`
              : "0 12px 30px rgba(0,0,0,.18)",
        })}
        innerStyle={{
          padding: `${u * 5}px ${u * 5.5}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: u * 2.4,
          boxSizing: "border-box",
        }}
      >
        <Eyebrowed ctx={ctx} spec={spec} t={card} />
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          t={card}
          size={spec.scriptHeadline ? 13 : 10.5}
          script={spec.scriptHeadline}
          lines={4}
        />
        <Sub ctx={ctx} text={ctx.c.subhead} t={card} size={3} />
        <Details ctx={ctx} spec={spec} t={card} />
      </FitBox>
      <div
        style={abs({
          left: landscape && !spec.flip ? p : "auto",
          right: landscape && !spec.flip ? "auto" : p,
          bottom: p,
          display: "flex",
          alignItems: "center",
          gap: u * 2,
        })}
      >
        {spec.showLogo !== false && (
          <BusinessLockup
            ctx={ctx}
            t={landscape ? onInk({ ...t, ink: "#FFFFFF" }) : t}
            size={2.8}
            invert={landscape}
            showTagline={false}
          />
        )}
      </div>
      <div style={abs({ left: p, top: p })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

function Editorial({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const landscape = W >= H;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      <div
        style={abs({
          inset: p,
          display: "flex",
          flexDirection: landscape ? "row" : "column",
          gap: u * 6,
        })}
      >
        <div
          style={{
            flex: landscape ? "0 0 46%" : "0 0 48%",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            border: `1px solid ${t.colors.text}`,
            padding: u * 2,
            boxSizing: "border-box",
            background: t.colors.surface,
          }}
        >
          {heroImage(ctx, spec)}
        </div>
        <FitBox
          style={{ flex: 1, minWidth: 0 }}
          innerStyle={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: u * 2,
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: u * 0.8 }}
            >
              <span style={{ ...t.labelCss, fontSize: u * 2.5 }}>
                {ctx.c.business.name}
              </span>
              {ctx.c.eyebrow && (
                <span
                  style={{
                    ...t.bodyCss,
                    fontSize: u * 2.5,
                    color: t.colors.muted,
                  }}
                >
                  {ctx.c.eyebrow}
                </span>
              )}
            </div>
            <Badge ctx={ctx} spec={spec} />
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: u * 2.2 }}
          >
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              size={spec.scriptHeadline ? 14 : 12}
              script={spec.scriptHeadline}
              lines={4}
            />
            <div
              style={{ height: 1, background: t.colors.text, width: u * 12 }}
            />
            <Sub
              ctx={ctx}
              text={ctx.c.subhead}
              size={3.1}
              style={{ fontStyle: "italic", fontWeight: 500 }}
            />
            <Details ctx={ctx} spec={spec} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Website ctx={ctx} size={2.3} />
            <ContactStrip ctx={ctx} items={["phone"]} size={2.3} />
          </div>
        </FitBox>
      </div>
    </>
  );
}

function OfferHero({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const block = t.colors.accent === t.colors.bg ? t : onAccent(t);
  const o = ctx.c.offer;
  const illo = spec.image !== "none" && Boolean(ctx.c.illustrations?.hero);
  return (
    <>
      <div style={abs({ inset: 0, background: block.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          kind={t.pattern.kind === "none" ? "sunburst" : t.pattern.kind}
          tint={block.colors.text}
          opacity={t.pattern.kind === "none" ? 0.08 : t.pattern.opacity}
        />
      </div>
      <FitBox
        style={abs({ inset: p })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <BusinessLockup ctx={ctx} t={block} size={3.2} invert showTagline />
          <Badge
            ctx={ctx}
            spec={{ ...spec, badge: spec.badge ?? "starburst" }}
            t={block}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 2,
            alignItems: spec.align === "center" ? "center" : "flex-start",
            textAlign: spec.align === "center" ? "center" : "left",
            paddingRight: illo && spec.align !== "center" ? u * 28 : 0,
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} t={block} />
          {o ? (
            <>
              <span
                style={{
                  ...block.displayCss,
                  fontSize: u * (W > H ? 24 : 20) * t.display.scale,
                  lineHeight: 0.9,
                }}
              >
                {o.headline}
              </span>
              <span
                style={{
                  ...block.displayCss,
                  fontSize: u * 7,
                  fontWeight: Math.min(t.display.weight, 600),
                  textTransform: "none",
                  letterSpacing: "-0.01em",
                }}
              >
                {o.detail}
              </span>
            </>
          ) : (
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              t={block}
              size={14}
              lines={3}
            />
          )}
          <Sub ctx={ctx} text={ctx.c.subhead} t={block} size={3.2} />
          <div
            style={{
              display: "flex",
              gap: u * 3,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: u,
            }}
          >
            {ctx.c.cta && (
              <Cta
                ctx={ctx}
                label={ctx.c.cta.label}
                t={block}
                fill={block.colors.bg === t.colors.accent2 ? "ink" : "accent2"}
              />
            )}
            {o?.expires && (
              <span
                style={{ ...block.bodyCss, fontSize: u * 2.6, fontWeight: 600 }}
              >
                Offer ends {o.expires}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: u * 3,
          }}
        >
          <ContactStrip ctx={ctx} t={block} size={2.5} />
          {o?.code && (
            <span style={{ ...block.labelCss, fontSize: u * 2.4 }}>
              Code {o.code}
            </span>
          )}
        </div>
      </FitBox>
      {illo && (
        <div
          style={abs({
            right: p + u * 2,
            bottom: p + u * 12,
            width: u * 24,
            height: u * 24,
            opacity: 0.95,
          })}
        >
          <ImageSlot
            t={block}
            illustration={ctx.c.illustrations?.hero}
            seed={ctx.seed}
            radius={u * 3}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </>
  );
}

function BeforeAfter({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const imgH = H * 0.57;
  const [l1, l2] = ctx.c.compareLabels ?? ["Before", "After"];
  const inkT = onInk(t);
  const chip: CSSProperties = {
    position: "absolute",
    left: Math.max(u * 3, ctx.inset + u),
    top: Math.max(u * 3, ctx.inset + u),
    background: inkT.colors.bg,
    color: inkT.colors.text,
    fontFamily: t.font.body,
    fontWeight: 800,
    fontSize: u * 2.4,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    padding: `${u * 1}px ${u * 2}px`,
  };
  return (
    <>
      <div style={abs({ left: 0, top: 0, width: W / 2, height: imgH })}>
        <ImageSlot
          t={t}
          src={ctx.c.images?.before ?? ctx.c.images?.hero}
          seed={ctx.seed + 1}
          treatment="mono"
          style={{ width: "100%", height: "100%" }}
        >
          <span style={chip}>{l1}</span>
        </ImageSlot>
      </div>
      <div style={abs({ left: W / 2, top: 0, width: W / 2, height: imgH })}>
        <ImageSlot
          t={t}
          src={ctx.c.images?.after ?? ctx.c.images?.secondary}
          seed={ctx.seed + 2}
          treatment="color"
          style={{ width: "100%", height: "100%" }}
        >
          <span
            style={{
              ...chip,
              background: t.colors.accent2,
              color: t.colors.onAccent2,
            }}
          >
            {l2}
          </span>
        </ImageSlot>
      </div>
      <div
        style={abs({
          left: W / 2 - u * 0.5,
          top: 0,
          width: u,
          height: imgH,
          background: t.colors.bg,
        })}
      />
      <div
        style={abs({
          left: 0,
          right: 0,
          top: imgH,
          bottom: 0,
          background: t.colors.bg,
        })}
      >
        <FitBox
          style={abs({ left: p, right: p, top: u * 4, bottom: p })}
          innerStyle={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 4,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: u * 1.6,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Eyebrowed ctx={ctx} spec={spec} />
            <Headline ctx={ctx} text={ctx.c.headline} size={9} lines={2} />
            <Sub ctx={ctx} text={ctx.c.subhead} size={2.9} />
            <ContactStrip ctx={ctx} items={["phone", "website"]} size={2.4} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: u * 2,
              flexShrink: 0,
            }}
          >
            <Badge ctx={ctx} spec={spec} />
            {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} />}
          </div>
        </FitBox>
      </div>
    </>
  );
}

function CouponGrid({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const coupons: CouponT[] = (
    ctx.c.coupons?.length ? ctx.c.coupons : ctx.c.offer ? [ctx.c.offer] : []
  ).slice(0, W > H ? 3 : 2);
  const head = onAccent(t);
  const headH = H * 0.42;
  return (
    <>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: 0,
          height: headH,
          background: head.colors.bg,
          overflow: "hidden",
        })}
      >
        <Pattern
          t={t}
          w={W}
          h={headH}
          tint={head.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.12}
        />
        <div
          style={abs({
            left: p,
            right: p,
            top: p,
            bottom: u * 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 4,
          })}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: u * 1.6,
              flex: 1,
              minWidth: 0,
            }}
          >
            {spec.showLogo !== false && (
              <BusinessLockup
                ctx={ctx}
                t={head}
                size={2.8}
                invert
                showTagline={false}
              />
            )}
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              t={head}
              size={spec.scriptHeadline ? 13 : 10}
              script={spec.scriptHeadline}
              lines={2}
            />
            <Sub ctx={ctx} text={ctx.c.subhead} t={head} size={3} />
          </div>
          {spec.image !== "none" && (
            <div
              style={{
                width: headH * 0.78,
                height: headH * 0.78,
                flexShrink: 0,
              }}
            >
              <ImageSlot
                t={t}
                src={ctx.c.images?.hero}
                illustration={
                  spec.image === "illustration"
                    ? ctx.c.illustrations?.hero
                    : undefined
                }
                seed={ctx.seed}
                radius="50%"
                style={{
                  width: "100%",
                  height: "100%",
                  border: `${u * 1}px solid ${head.colors.text}`,
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: headH,
          bottom: 0,
          background: t.colors.bg,
        })}
      >
        <FitBox
          style={abs({ left: p, right: p, top: u * 5, bottom: p })}
          innerStyle={{ display: "flex", flexDirection: "column", gap: u * 3 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${coupons.length}, minmax(0, 1fr))`,
              gap: u * 3,
              flex: 1,
              minHeight: 0,
            }}
          >
            {coupons.map((cp, i) => (
              <Coupon
                key={i}
                ctx={ctx}
                offer={cp}
                title={cp.title ?? "Coupon"}
                compact
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: u * 3,
            }}
          >
            <ContactStrip ctx={ctx} size={2.5} />
            {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} size={2.6} />}
          </div>
        </FitBox>
      </div>
    </>
  );
}

function Typographic({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const words = ctx.c.headline.split(/\s+/).filter(Boolean).slice(0, 5);
  const longest = Math.max(...words.map((w) => w.length), 4);
  const inner = W - 2 * p;
  const fontSize = Math.min(
    inner / (longest * 0.62),
    (H - 2 * p - u * 14) / (words.length * 1.02),
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
      <div
        style={abs({
          left: p,
          right: p,
          top: p,
          bottom: p,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        })}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} />
          <Badge ctx={ctx} spec={spec} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: spec.align === "center" ? "center" : "flex-start",
          }}
        >
          {words.map((w, i) => (
            <span
              key={i}
              data-fittext=""
              data-fit-base={fontSize}
              style={{
                ...t.displayCss,
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textTransform: "uppercase",
                fontSize,
                lineHeight: 0.95,
                color: colors[i % 2],
                letterSpacing: "-0.02em",
                alignSelf: "stretch",
                textAlign: spec.align === "center" ? "center" : "left",
              }}
            >
              {w}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: u * 3,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: u * 1.6,
              maxWidth: "60%",
            }}
          >
            <Sub ctx={ctx} text={ctx.c.subhead} size={3} />
            <ContactStrip ctx={ctx} items={["website", "phone"]} size={2.4} />
          </div>
          {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} />}
        </div>
      </div>
    </>
  );
}

function Polaroid({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const n = W > H ? 3 : 2;
  const pw = W > H ? W * 0.24 : W * 0.44;
  const frames = Array.from({ length: n }).map((_, i) => {
    const rot = [-6, 4, -3][i];
    const left =
      W > H ? p + i * (pw * 1.08) + u * 2 : p + (i % 2) * pw * 1.05 + u * 2;
    const top = W > H ? p + u * 4 + (i % 2) * u * 6 : p + u * 4 + i * pw * 0.5;
    return (
      <div
        key={i}
        style={abs({
          left,
          top,
          width: pw,
          padding: u * 1.6,
          paddingBottom: u * 6,
          background: "#FFFFFF",
          boxShadow: "0 10px 24px rgba(0,0,0,.18)",
          transform: `rotate(${rot}deg)`,
        })}
      >
        <ImageSlot
          t={t}
          src={
            ctx.c.images?.gallery?.[i] ??
            (i === 0 ? ctx.c.images?.hero : undefined)
          }
          seed={ctx.seed + i}
          style={{ width: "100%", aspectRatio: "1" }}
        />
      </div>
    );
  });
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          kind={t.pattern.kind === "none" ? "dots" : t.pattern.kind}
        />
      </div>
      {frames}
      <div
        style={abs({
          left: p,
          right: p,
          bottom: p,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: u * 4,
        })}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 1.6,
            flex: "1 1 auto",
            minWidth: 0,
            maxWidth: W > H ? "58%" : undefined,
            background: alpha(t.colors.bg, 0.9),
            padding: u * 2.4,
            margin: `${-u * 2.4}px 0 ${-u * 2.4}px ${-u * 2.4}px`,
            borderRadius: u,
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline === false ? 10 : 13}
            script={spec.scriptHeadline !== false}
            lines={2}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={3} />
          <ContactStrip ctx={ctx} items={["website", "phone"]} size={2.4} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: u * 2,
            flexShrink: 0,
          }}
        >
          <Badge ctx={ctx} spec={spec} />
          {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} />}
        </div>
      </div>
    </>
  );
}

function Diagonal({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const block = onAccent(t);
  const landscape = W >= H;
  const clip = landscape
    ? "polygon(0 0, 58% 0, 42% 100%, 0 100%)"
    : "polygon(0 0, 100% 0, 100% 46%, 0 60%)";
  return (
    <>
      <div style={abs({ inset: 0 })}>{heroImage(ctx, spec)}</div>
      <div
        style={abs({ inset: 0, background: block.colors.bg, clipPath: clip })}
      >
        <Pattern
          t={t}
          w={W}
          h={H}
          tint={block.colors.text}
          opacity={t.pattern.kind === "none" ? 0 : 0.1}
        />
      </div>
      <FitBox
        style={abs({
          left: p,
          top: p,
          bottom: landscape ? p : H * 0.42,
          width: landscape ? W * 0.42 : W - 2 * p,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {spec.showLogo !== false ? (
          <BusinessLockup
            ctx={ctx}
            t={block}
            size={3}
            invert
            showTagline={false}
          />
        ) : (
          <span />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 2.2,
            maxWidth: landscape ? "100%" : "70%",
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} t={block} />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            t={block}
            size={spec.scriptHeadline ? 13 : 11}
            script={spec.scriptHeadline}
            lines={4}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} t={block} size={3.1} />
          {landscape && <Details ctx={ctx} spec={spec} t={block} />}
        </div>
        {landscape ? <Website ctx={ctx} t={block} size={2.4} /> : <span />}
      </FitBox>
      {!landscape && (
        <div
          style={abs({
            left: p,
            right: p,
            bottom: p,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          })}
        >
          <div
            style={{
              background: alpha(t.ink, 0.9),
              padding: u * 2.4,
              borderRadius: u,
            }}
          >
            <Details ctx={ctx} spec={spec} t={onInk(t)} />
          </div>
          <Badge ctx={ctx} spec={spec} />
        </div>
      )}
      {landscape && (
        <div style={abs({ right: p, top: p })}>
          <Badge ctx={ctx} spec={spec} />
        </div>
      )}
    </>
  );
}

function Botanical({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const block =
    t.colors.accent === t.colors.bg ? t : spec.flip ? onAccent(t) : t;
  return (
    <>
      <div style={abs({ inset: 0, background: block.colors.bg })}>
        <Pattern
          t={t}
          w={W}
          h={H}
          kind={t.pattern.kind === "none" ? "florals" : t.pattern.kind}
          tint={
            block.colors.bg === t.colors.bg
              ? t.colors.accent2
              : block.colors.text
          }
          opacity={Math.max(t.pattern.opacity, 0.45)}
        />
      </div>
      <FitBox
        style={abs({
          inset: p + u * 4,
          border: `${Math.max(1, u * 0.3)}px solid ${block.colors.text}`,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: u * 2,
          padding: `${u * 3.5}px ${u * 5}px`,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            ...block.labelCss,
            fontSize: u * 2.5,
            letterSpacing: "0.3em",
          }}
        >
          {ctx.c.eyebrow ?? ctx.c.business.name}
        </span>
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          t={block}
          size={
            spec.scriptHeadline === false ? 12 : H < 500 && W >= H ? 12.5 : 15
          }
          script={spec.scriptHeadline !== false}
          lines={3}
          style={{ maxWidth: "90%" }}
        />
        {ctx.c.subhead && (
          <span
            style={{
              ...block.labelCss,
              fontSize: u * 2.8,
              letterSpacing: "0.28em",
              fontWeight: 600,
            }}
          >
            {ctx.c.subhead}
          </span>
        )}
        <span
          aria-hidden="true"
          style={{
            width: u * 14,
            height: 1,
            background: block.colors.text,
            opacity: 0.6,
          }}
        />
        <Details ctx={ctx} spec={spec} t={block} align="center" />
        <span
          style={{
            ...block.bodyCss,
            fontSize: u * 2.5,
            color: block.colors.muted,
          }}
        >
          {[ctx.c.business.address, ctx.c.business.city]
            .filter(Boolean)
            .join(", ") || ctx.c.business.website?.replace(/^https?:\/\//, "")}
        </span>
      </FitBox>
    </>
  );
}

function BandTop({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const band = onAccent(t);
  // The band's content keeps to the safe inset: on a small card a band
  // 17% of the height would centre the lockup closer to the trim than that.
  const bandH = Math.max(H * 0.17, ctx.inset + u * 9);
  const imgH = H * (spec.showBullets ? 0.4 : 0.45);
  return (
    <>
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
            top: ctx.inset,
            bottom: u * 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          })}
        >
          <BusinessLockup ctx={ctx} t={band} size={3.2} invert />
          <ContactStrip
            ctx={ctx}
            t={band}
            items={["phone", "website"]}
            size={2.5}
            direction={W > H ? "row" : "column"}
          />
        </div>
      </div>
      <div style={abs({ left: 0, right: 0, top: bandH, height: imgH })}>
        {heroImage(ctx, spec)}
      </div>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: bandH + imgH,
          bottom: 0,
          background: t.colors.bg,
        })}
      >
        <Pattern t={t} w={W} h={H - bandH - imgH} />
        <FitBox
          style={abs({ left: p, right: p, top: u * 3.5, bottom: p })}
          innerStyle={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 4,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: u * 1.6,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Eyebrowed ctx={ctx} spec={spec} />
            <Headline
              ctx={ctx}
              text={ctx.c.headline}
              size={spec.scriptHeadline ? 12 : H < 500 ? 8.5 : 9.5}
              script={spec.scriptHeadline}
              lines={2}
            />
            <Sub ctx={ctx} text={ctx.c.subhead} size={2.9} />
            {spec.showBullets && (
              <Bullets
                ctx={ctx}
                items={ctx.c.bullets?.slice(0, 4)}
                size={2.7}
                columns={W > H ? 2 : 1}
              />
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: u * 2,
              flexShrink: 0,
            }}
          >
            <Badge ctx={ctx} spec={spec} />
            {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} />}
          </div>
        </FitBox>
      </div>
    </>
  );
}

function EventPoster({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const e = ctx.c.event;
  const landscape = W >= H;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      {spec.image !== "none" && (
        <div
          style={abs({
            right: 0,
            top: 0,
            bottom: 0,
            width: landscape ? W * 0.38 : 0,
            ...(landscape ? {} : { display: "none" }),
          })}
        >
          {heroImage(ctx, spec)}
        </div>
      )}
      <FitBox
        style={abs({
          left: p,
          top: p,
          bottom: p,
          right: landscape && spec.image !== "none" ? W * 0.38 + u * 5 : p,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <span style={{ ...t.labelCss, fontSize: u * 2.6 }}>
            {ctx.c.eyebrow ?? `${ctx.c.business.name} presents`}
          </span>
          <Badge ctx={ctx} spec={spec} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2.4 }}>
          {e && (
            <div
              style={{ display: "flex", alignItems: "baseline", gap: u * 3 }}
            >
              <span
                style={{
                  ...t.displayCss,
                  fontSize: u * (landscape ? (H < 500 ? 16 : 20) : 17),
                  lineHeight: 0.85,
                  color:
                    t.colors.accent2 === t.colors.bg
                      ? t.colors.text
                      : t.colors.accent2,
                }}
              >
                {e.date}
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: u * 0.6,
                }}
              >
                {e.dayLabel && (
                  <span style={{ ...t.labelCss, fontSize: u * 3 }}>
                    {e.dayLabel}
                  </span>
                )}
                {e.time && (
                  <span
                    style={{ ...t.bodyCss, fontWeight: 700, fontSize: u * 3.2 }}
                  >
                    {e.time}
                  </span>
                )}
              </div>
            </div>
          )}
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline ? 14 : 11}
            script={spec.scriptHeadline}
            lines={3}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={3} />
          {e?.venue && (
            <span style={{ ...t.bodyCss, fontSize: u * 3, fontWeight: 600 }}>
              {e.venue}
              {e.address ? ` · ${e.address}` : ""}
            </span>
          )}
          <Details
            ctx={ctx}
            spec={{ ...spec, showEvent: false }}
            maxBullets={3}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 3,
          }}
        >
          <BusinessLockup ctx={ctx} size={2.8} showTagline={false} />
          <Website ctx={ctx} size={2.4} />
        </div>
      </FitBox>
    </>
  );
}

function List({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const landscape = W >= H;
  const imgW = landscape ? W * 0.38 : W;
  const imgH = landscape ? H : H * 0.36;
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      <div style={abs({ right: 0, top: 0, width: imgW, height: imgH })}>
        {heroImage(ctx, spec)}
      </div>
      <FitBox
        style={abs({
          left: p,
          top: landscape ? p : imgH + u * 4,
          bottom: p,
          right: landscape ? imgW + u * 6 : p,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: u * 3,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
          <Eyebrowed ctx={ctx} spec={spec} />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline ? 13 : 10.5}
            script={spec.scriptHeadline}
            lines={3}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={3} />
        </div>
        <NumberedList
          ctx={ctx}
          items={(ctx.c.list ?? ctx.c.bullets)?.slice(0, 5)}
          size={2.9}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 3,
          }}
        >
          <BusinessLockup ctx={ctx} size={2.8} showTagline={false} />
          {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} size={2.6} />}
        </div>
      </FitBox>
      <div style={abs({ right: p, top: p })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

/** Tall stack for door hangers and rack cards. */
function Stack({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u, fmt } = ctx;
  const p = pad(ctx);
  const holeClear = fmt.hole
    ? (fmt.hole.top + fmt.hole.diameter + 0.35) * 96 + ctx.bleedPx
    : 0;
  const head = onAccent(t);
  const headH = Math.max(holeClear + u * 11, H * 0.16);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: 0,
          height: headH,
          background: head.colors.bg,
        })}
      >
        <div
          style={abs({
            left: p,
            right: p,
            top: holeClear ? holeClear - ctx.bleedPx * 0 : p,
            bottom: u * 3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: u * 1.6,
            textAlign: "center",
          })}
        >
          <BusinessLockup ctx={ctx} t={head} size={3.4} invert align="center" />
        </div>
      </div>
      <FitBox
        style={abs({ left: p, right: p, top: headH + u * 3.5, bottom: p })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 2.6 }}
      >
        {spec.image !== "none" && (
          <div style={{ width: "100%", aspectRatio: "16 / 10", flexShrink: 0 }}>
            {heroImage(ctx, spec, 0, { borderRadius: t.radius })}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 1.4,
            textAlign: spec.align === "left" ? "left" : "center",
            alignItems: spec.align === "left" ? "flex-start" : "center",
          }}
        >
          <Eyebrowed ctx={ctx} spec={spec} size={2.4} />
          <Headline
            ctx={ctx}
            text={ctx.c.headline}
            size={spec.scriptHeadline ? 11 : 8.5}
            script={spec.scriptHeadline}
            lines={3}
          />
          <Sub ctx={ctx} text={ctx.c.subhead} size={2.8} />
        </div>
        {spec.showBullets && (
          <Bullets ctx={ctx} items={ctx.c.bullets?.slice(0, 4)} size={2.7} />
        )}
        {spec.showOffer !== false && ctx.c.offer && (
          <Coupon
            ctx={ctx}
            offer={ctx.c.offer}
            title={ctx.c.offer.code ? "Coupon" : "Offer"}
            compact
          />
        )}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: u * 1.8,
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} size={2.7} />}
          <ContactStrip
            ctx={ctx}
            items={["phone", "website"]}
            size={2.5}
            style={{ justifyContent: "center" }}
          />
        </div>
      </FitBox>
      <div style={abs({ right: p, top: headH - u * 2.5 })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

/** Rack card / flyer: photo top, headline band, info panels, coupon, footer. */
function Panels({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }) {
  const { t, W, H, u } = ctx;
  const p = pad(ctx);
  const imgH = H * 0.34;
  const bandH = u * (spec.scriptHeadline ? 36 : 30);
  const band = onAccent(t);
  const items = (ctx.c.bullets ?? []).slice(0, 3);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} />
      </div>
      <div style={abs({ left: 0, right: 0, top: 0, height: imgH })}>
        {heroImage(ctx, spec)}
      </div>
      <FitBox
        style={abs({
          left: 0,
          right: 0,
          top: imgH,
          height: bandH,
          background: band.colors.bg,
        })}
        innerStyle={{
          padding: `${u * 3}px ${p}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: u * 1.4,
          boxSizing: "border-box",
        }}
      >
        <Eyebrowed ctx={ctx} spec={spec} t={band} />
        <Headline
          ctx={ctx}
          text={ctx.c.headline}
          t={band}
          size={spec.scriptHeadline ? 12 : 9.5}
          script={spec.scriptHeadline}
          lines={2}
        />
        <Sub ctx={ctx} text={ctx.c.subhead} t={band} size={2.9} />
      </FitBox>
      <FitBox
        style={abs({
          left: p,
          right: p,
          top: imgH + bandH + u * 3.5,
          bottom: p,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 3 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: W > H ? "repeat(3, minmax(0, 1fr))" : "1fr",
            gap: u * 2.4,
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                ...t.cardCss,
                padding: `${u * 2.2}px ${u * 3}px`,
                display: "flex",
                gap: u * 2.4,
                alignItems: "center",
                boxShadow: t.shadow === "hard" ? t.cardCss.boxShadow : "none",
                border:
                  t.shadow === "hard"
                    ? t.cardCss.border
                    : `1px solid ${t.colors.border}`,
              }}
            >
              <span
                style={{
                  ...t.displayCss,
                  fontSize: u * 6,
                  color:
                    t.colors.accent2 === t.colors.bg
                      ? t.colors.text
                      : t.colors.accent2,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{ ...t.bodyCss, fontSize: u * 2.9, fontWeight: 600 }}
              >
                {it}
              </span>
            </div>
          ))}
        </div>
        {spec.showStats && <Stats ctx={ctx} size={0.9} />}
        {spec.showOffer !== false && ctx.c.offer && (
          <Coupon ctx={ctx} offer={ctx.c.offer} compact />
        )}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 3,
            borderTop: `1px solid ${t.colors.border}`,
            paddingTop: u * 3,
          }}
        >
          <BusinessLockup ctx={ctx} size={2.9} showTagline={false} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: u * 1.2,
            }}
          >
            <ContactStrip
              ctx={ctx}
              items={["phone", "website"]}
              size={2.5}
              direction="column"
              style={{ alignItems: "flex-end" }}
            />
          </div>
        </div>
      </FitBox>
      <div style={abs({ right: p, top: p })}>
        <Badge ctx={ctx} spec={spec} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function Front({ ctx, spec }: { ctx: Ctx; spec: FrontSpec }): ReactNode {
  switch (spec.layout) {
    case "full-photo":
      return <FullPhoto ctx={ctx} spec={spec} />;
    case "split-h":
      return <SplitH ctx={ctx} spec={spec} />;
    case "split-v":
      return <SplitV ctx={ctx} spec={spec} />;
    case "color-frame":
      return <ColorFrame ctx={ctx} spec={spec} />;
    case "pattern-panel":
      return <PatternPanel ctx={ctx} spec={spec} />;
    case "shapes":
      return <Shapes ctx={ctx} spec={spec} />;
    case "overlap-card":
      return <OverlapCard ctx={ctx} spec={spec} />;
    case "editorial":
      return <Editorial ctx={ctx} spec={spec} />;
    case "offer-hero":
      return <OfferHero ctx={ctx} spec={spec} />;
    case "before-after":
      return <BeforeAfter ctx={ctx} spec={spec} />;
    case "coupon-grid":
      return <CouponGrid ctx={ctx} spec={spec} />;
    case "typographic":
      return <Typographic ctx={ctx} spec={spec} />;
    case "polaroid":
      return <Polaroid ctx={ctx} spec={spec} />;
    case "diagonal":
      return <Diagonal ctx={ctx} spec={spec} />;
    case "botanical":
      return <Botanical ctx={ctx} spec={spec} />;
    case "band-top":
      return <BandTop ctx={ctx} spec={spec} />;
    case "event-poster":
      return <EventPoster ctx={ctx} spec={spec} />;
    case "list":
      return <List ctx={ctx} spec={spec} />;
    case "stack":
      return <Stack ctx={ctx} spec={spec} />;
    case "panels":
      return <Panels ctx={ctx} spec={spec} />;
    default:
      return <FullPhoto ctx={ctx} spec={spec} />;
  }
}

export { Body };

import type { CSSProperties, ReactNode } from "react";
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
  QrBlock,
  Rule,
  Stats,
  Sub,
  Testimonial,
  Website,
} from "./blocks";
import { MapPlaceholder, Pattern } from "./placeholders";
import { onAccent } from "./theme";
import type { BackSpec } from "./types";

const abs = (extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute",
  ...extra,
});

function geometry(ctx: Ctx, spec: BackSpec, topOffset = 0) {
  const { W, u, inset, bleedPx, fmt } = ctx;
  const p = inset + u * 2;
  const clear = (fmt.clearZone ?? 0.625) * 96 + bleedPx;
  const bottom = Math.max(p, clear);
  const gap = u * 5;
  let addrW = Math.min(W * 0.47, 4.5 * 96);
  let msgW = W - 2 * p - addrW - gap;
  // The studio's address zone: the message column stays left of it and the
  // address side is never flipped onto it.
  const flip = spec.flip && !ctx.keepOut;
  if (ctx.keepOut) {
    msgW = Math.min(msgW, ctx.keepOut.x - u * 2 - p);
    addrW = W - 2 * p - msgW - gap;
  }
  const left = flip ? p + addrW + gap : p;
  const addrLeft = flip ? p : p + msgW + gap;
  return {
    p,
    bottom,
    msgW,
    addrW,
    left,
    addrLeft,
    top: p + topOffset,
    ruleLeft: flip ? p + addrW + gap / 2 : p + msgW + gap / 2,
    gap,
  };
}

function Message({
  ctx,
  spec,
  compact,
}: { ctx: Ctx; spec: BackSpec; compact?: boolean }) {
  const { c, u } = ctx;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: u * 2.4,
        height: "100%",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: u * 2.2 }}>
        <BusinessLockup
          ctx={ctx}
          size={compact ? 2.6 : 3}
          showTagline={false}
        />
        <Headline
          ctx={ctx}
          text={c.backHeadline ?? c.headline}
          size={compact ? 6.5 : 7.5}
          lines={3}
        />
        <Body ctx={ctx} text={c.backBody ?? c.body} size={2.8} />
        {spec.showBullets && (
          <Bullets
            ctx={ctx}
            items={c.bullets?.slice(0, spec.showTestimonial ? 2 : 3)}
            size={2.7}
          />
        )}
        {spec.showTestimonial && <Testimonial ctx={ctx} size={0.85} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: u * 3,
            flexWrap: "wrap",
          }}
        >
          {c.cta && <Cta ctx={ctx} label={c.cta.label} size={2.6} />}
          {spec.showQr !== false && <QrBlock ctx={ctx} size={13} />}
        </div>
        <ContactStrip ctx={ctx} items={["phone", "website"]} size={2.4} />
      </div>
    </div>
  );
}

function Classic({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const g = geometry(ctx, spec);
  return (
    <>
      <FitBox
        style={abs({
          left: g.left,
          width: g.msgW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <Message ctx={ctx} spec={spec} />
      </FitBox>
      <Rule
        t={ctx.t}
        vertical
        style={abs({ left: g.ruleLeft, top: g.top, bottom: g.bottom })}
      />
      <div
        style={abs({
          left: g.addrLeft,
          width: g.addrW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <AddressPanel ctx={ctx} />
      </div>
    </>
  );
}

function Banner({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, W, H, u } = ctx;
  const bandH = Math.max(u * 14, H * 0.14) + ctx.inset * 0.5;
  const band = onAccent(t);
  const g = geometry(ctx, spec, bandH + u * 2);
  return (
    <>
      <div
        style={abs({
          left: 0,
          right: 0,
          top: 0,
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
            left: g.p,
            right: g.p,
            top: ctx.inset,
            bottom: u * 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: u * 3,
          })}
        >
          <BusinessLockup ctx={ctx} t={band} size={3.2} invert />
          <ContactStrip
            ctx={ctx}
            t={band}
            items={["phone", "website"]}
            size={2.5}
          />
        </div>
      </div>
      <FitBox
        style={abs({
          left: g.left,
          width: g.msgW,
          top: g.top,
          bottom: g.bottom,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          gap: u * 2.2,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
          <Eyebrow ctx={ctx} text={ctx.c.eyebrow} size={2.5} />
          <Headline
            ctx={ctx}
            text={ctx.c.backHeadline ?? ctx.c.headline}
            size={7}
            lines={3}
          />
          <Body ctx={ctx} text={ctx.c.backBody ?? ctx.c.body} size={2.8} />
          {spec.showBullets && (
            <Bullets ctx={ctx} items={ctx.c.bullets?.slice(0, 3)} size={2.7} />
          )}
          {spec.showTestimonial && <Testimonial ctx={ctx} size={0.85} />}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: u * 3,
            flexWrap: "wrap",
          }}
        >
          {ctx.c.offer ? (
            <Coupon
              ctx={ctx}
              offer={ctx.c.offer}
              compact
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            ctx.c.cta && <Cta ctx={ctx} label={ctx.c.cta.label} size={2.6} />
          )}
          {spec.showQr !== false && (
            <QrBlock ctx={ctx} size={12} direction="column" />
          )}
        </div>
      </FitBox>
      <div
        style={abs({
          left: g.addrLeft,
          width: g.addrW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <AddressPanel ctx={ctx} />
      </div>
    </>
  );
}

function CouponBack({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { c, u } = ctx;
  const g = geometry(ctx, spec);
  const list = (c.coupons?.length ? c.coupons : c.offer ? [c.offer] : []).slice(
    0,
    spec.coupons ?? 2,
  );
  // two coupons on a 4×6 leave no room for body copy
  const showBody = !(list.length > 1 && ctx.H < 500);
  return (
    <>
      <FitBox
        style={abs({
          left: g.left,
          width: g.msgW,
          top: g.top,
          bottom: g.bottom,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          gap: u * 2.6,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
          <BusinessLockup ctx={ctx} size={2.8} showTagline={false} />
          <Headline
            ctx={ctx}
            text={c.backHeadline ?? c.headline}
            size={6.5}
            lines={2}
          />
          {showBody && (
            <Body ctx={ctx} text={c.backBody ?? c.body} size={2.7} />
          )}
          {spec.showTestimonial && <Testimonial ctx={ctx} size={0.85} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: u * 3.6 }}>
          {list.map((cp, i) => (
            <Coupon
              key={i}
              ctx={ctx}
              offer={cp}
              title={
                "title" in cp && cp.title
                  ? (cp.title as string)
                  : `Coupon ${list.length > 1 ? i + 1 : ""}`.trim()
              }
              compact
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: `${u * 2}px ${u * 3}px`,
            flexWrap: "wrap",
          }}
        >
          <ContactStrip
            ctx={ctx}
            items={["phone", "website"]}
            size={2.4}
            direction="column"
            style={{ flexShrink: 0 }}
          />
          {spec.showQr !== false && (
            <QrBlock ctx={ctx} size={12} style={{ flex: "0 0 auto" }} />
          )}
        </div>
      </FitBox>
      <Rule
        t={ctx.t}
        vertical
        style={abs({ left: g.ruleLeft, top: g.top, bottom: g.bottom })}
      />
      <div
        style={abs({
          left: g.addrLeft,
          width: g.addrW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <AddressPanel ctx={ctx} />
      </div>
    </>
  );
}

function MapBack({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, c, u } = ctx;
  const g = geometry(ctx, spec);
  return (
    <>
      <FitBox
        style={abs({
          left: g.left,
          width: g.msgW,
          top: g.top,
          bottom: g.bottom,
        })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 2.4 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: u * 2,
          }}
        >
          <BusinessLockup ctx={ctx} size={2.8} showTagline={false} />
          {spec.showQr !== false && (
            <QrBlock
              ctx={ctx}
              size={10}
              caption={c.qr?.caption ?? "Directions"}
            />
          )}
        </div>
        <div
          style={{
            ...t.cardCss,
            overflow: "hidden",
            height: "34%",
            border: `1px solid ${t.colors.border}`,
          }}
        >
          <MapPlaceholder t={t} />
        </div>
        <Headline
          ctx={ctx}
          text={c.backHeadline ?? c.headline}
          size={6}
          lines={2}
        />
        <div style={{ display: "flex", gap: u * 4, alignItems: "flex-start" }}>
          {spec.showHours !== false && c.hours && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow
                ctx={ctx}
                text="Hours"
                size={2.3}
                style={{ marginBottom: u * 1.2 }}
              />
              <HoursList ctx={ctx} size={0.9} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow
              ctx={ctx}
              text="Find us"
              size={2.3}
              style={{ marginBottom: u * 1.2 }}
            />
            <ContactStrip ctx={ctx} direction="column" size={2.5} />
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {c.cta && (
          <Cta
            ctx={ctx}
            label={c.cta.label}
            size={2.5}
            style={{ alignSelf: "flex-start" }}
          />
        )}
      </FitBox>
      <Rule
        t={t}
        vertical
        style={abs({ left: g.ruleLeft, top: g.top, bottom: g.bottom })}
      />
      <div
        style={abs({
          left: g.addrLeft,
          width: g.addrW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <AddressPanel ctx={ctx} />
      </div>
    </>
  );
}

function Minimal({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { c, u } = ctx;
  const g = geometry(ctx, spec);
  return (
    <>
      <FitBox
        style={abs({
          left: g.left,
          width: g.msgW,
          top: g.top,
          bottom: g.bottom,
        })}
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <BusinessLockup ctx={ctx} size={3.6} logoShape="rounded" />
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2.2 }}>
          <Headline
            ctx={ctx}
            text={c.backHeadline ?? c.headline}
            size={8}
            lines={3}
          />
          <Sub ctx={ctx} text={c.subhead} size={3} />
          {c.cta && (
            <Cta
              ctx={ctx}
              label={c.cta.label}
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
            gap: `${u * 3}px ${u * 3}px`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: u * 1 }}>
            <Website ctx={ctx} size={2.6} />
            <ContactStrip ctx={ctx} items={["phone"]} size={2.5} />
          </div>
          {spec.showQr && (
            <QrBlock
              ctx={ctx}
              size={11}
              direction="column"
              style={{ flexShrink: 0 }}
            />
          )}
        </div>
      </FitBox>
      <div
        style={abs({
          left: g.addrLeft,
          width: g.addrW,
          top: g.top,
          bottom: g.bottom,
        })}
      >
        <AddressPanel ctx={ctx} />
      </div>
    </>
  );
}

/** Details page for single-sided pieces printed two-up (flyer backs, rack card backs). */
function Details({ ctx, spec }: { ctx: Ctx; spec: BackSpec }) {
  const { t, c, W, H, u, inset } = ctx;
  const p = inset + u * 2;
  const band = onAccent(t);
  const bandH = Math.max(u * 16, H * 0.14);
  return (
    <>
      <div style={abs({ inset: 0, background: t.colors.bg })}>
        <Pattern t={t} w={W} h={H} opacity={Math.min(t.pattern.opacity, 0.3)} />
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
          <BusinessLockup ctx={ctx} t={band} size={3.4} invert />
          <ContactStrip
            ctx={ctx}
            t={band}
            items={["phone", "website"]}
            size={2.6}
            direction={W > H ? "row" : "column"}
          />
        </div>
      </div>
      <FitBox
        style={abs({ left: p, right: p, top: bandH + u * 5, bottom: p })}
        innerStyle={{ display: "flex", flexDirection: "column", gap: u * 4 }}
      >
        <Headline
          ctx={ctx}
          text={c.backHeadline ?? c.headline}
          size={8.5}
          lines={3}
        />
        <Body ctx={ctx} text={c.backBody ?? c.body} size={3} />
        <Bullets
          ctx={ctx}
          items={c.bullets}
          size={2.9}
          columns={W > 500 ? 2 : 1}
        />
        {spec.showTestimonial !== false && <Testimonial ctx={ctx} />}
        {c.stats && <Stats ctx={ctx} />}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            flexDirection: W > 500 ? "row" : "column",
            gap: u * 4,
            alignItems: "stretch",
          }}
        >
          {c.offer && <Coupon ctx={ctx} offer={c.offer} style={{ flex: 1 }} />}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: u * 2.4,
              flex: 1,
            }}
          >
            {c.cta && (
              <Cta
                ctx={ctx}
                label={c.cta.label}
                style={{ alignSelf: "flex-start" }}
              />
            )}
            {spec.showQr !== false && <QrBlock ctx={ctx} size={14} />}
            <ContactStrip ctx={ctx} items={["address"]} size={2.5} />
          </div>
        </div>
      </FitBox>
    </>
  );
}

export function Back({ ctx, spec }: { ctx: Ctx; spec: BackSpec }): ReactNode {
  switch (spec.layout) {
    case "banner":
      return <Banner ctx={ctx} spec={spec} />;
    case "coupon":
      return <CouponBack ctx={ctx} spec={spec} />;
    case "map":
      return <MapBack ctx={ctx} spec={spec} />;
    case "minimal":
      return <Minimal ctx={ctx} spec={spec} />;
    case "details":
      return <Details ctx={ctx} spec={spec} />;
    case "classic":
    default:
      return <Classic ctx={ctx} spec={spec} />;
  }
}

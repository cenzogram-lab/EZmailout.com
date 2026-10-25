import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Back } from "./backs";
import type { Ctx } from "./blocks";
import { fitRuntime } from "./fit";
import {
  BookletInside,
  FOLD_BACK_LAYOUTS,
  FOLD_FRONT_LAYOUTS,
  FoldBack,
  FoldFront,
} from "./folds";
import { useTemplateFonts } from "./fonts";
import { SIDES_OF, getFormat, inToPx, pageCss, pieceSize } from "./formats";
import { Front } from "./fronts";
import { LETTER_LAYOUTS, LetterFront } from "./letters";
import { resolveTheme } from "./theme";
import type {
  BackSpec,
  FrontSpec,
  MailContent,
  MailTemplateSpec,
  MailThemeOverrides,
  Side,
} from "./types";

export interface MailPieceProps {
  template: MailTemplateSpec;
  content: MailContent;
  /** which printed surface; booklets also have 'inside-left' / 'inside-right' */
  side?: Side;
  overrides?: MailThemeOverrides;
  /** include 1/8 in bleed on every edge (for print files) */
  bleed?: boolean;
  /** draw trim line, safe area, USPS clear zone and die-cut hole */
  guides?: boolean;
  /** CSS scale for on-screen previews; the piece still lays out at true size */
  scale?: number;
  style?: CSSProperties;
  className?: string;
  /** Area to leave empty, in piece px (see `Ctx.keepOut`). */
  keepOut?: { x: number; y: number; w: number; h: number };
}

const BASE_CSS = `
.dm-piece{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.dm-piece *{box-sizing:border-box}
.dm-piece img{max-width:none}
`;

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 7;
}

/** The outer pixel size of a piece (for layout containers / previews). */
export function pieceDimensions(template: MailTemplateSpec, bleed = false) {
  const fmt = getFormat(template.format);
  const { w, h } = pieceSize(fmt, bleed);
  return { width: w, height: h };
}

/** The printed surfaces a template has, in print order. */
export function templateSides(template: MailTemplateSpec): Side[] {
  const all = SIDES_OF[template.sides] ?? ["front"];
  return all.filter((s) => s !== "back" || template.back);
}

/** Routes a front spec to the renderer family that owns its layout. */
export function renderFront(ctx: Ctx, spec: FrontSpec): ReactNode {
  if (LETTER_LAYOUTS.has(spec.layout))
    return <LetterFront ctx={ctx} spec={spec} />;
  if (ctx.fmt.category === "booklet" || FOLD_FRONT_LAYOUTS.has(spec.layout))
    return <FoldFront ctx={ctx} spec={spec} />;
  return <Front ctx={ctx} spec={spec} />;
}

export function renderBack(ctx: Ctx, spec: BackSpec): ReactNode {
  if (FOLD_BACK_LAYOUTS.has(spec.layout))
    return <FoldBack ctx={ctx} spec={spec} />;
  return <Back ctx={ctx} spec={spec} />;
}

export function MailPiece({
  template,
  content,
  side = "front",
  overrides,
  bleed = false,
  guides = false,
  scale = 1,
  style,
  className,
  keepOut,
}: MailPieceProps) {
  const t = useMemo(
    () => resolveTheme(template.theme, overrides),
    [template, overrides],
  );
  useTemplateFonts(t.fontIds);
  const fmt = getFormat(template.format);
  const { w: W, h: H, bleedPx, safePx } = pieceSize(fmt, bleed);
  const u = Math.min(inToPx(fmt.width), inToPx(fmt.height)) / 100;
  const ctx: Ctx = {
    t,
    c: content,
    u,
    W,
    H,
    inset: bleedPx + safePx,
    bleedPx,
    fmt,
    seed: hashSeed(template.id),
    spec: template,
    side,
    keepOut,
  };
  const isBack = side === "back" && Boolean(template.back);
  const isInside = side === "inside-left" || side === "inside-right";
  const addressSide = fmt.addressSide ?? (template.back ? "back" : undefined);
  const hole = fmt.hole;

  // Client-side overflow fitting (headline shrink + column zoom). Re-runs when
  // the piece changes and again once web fonts have loaded.
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) fitRuntime(el);
    };
    run();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(run).catch(() => undefined);
    // web fonts that arrive later (e.g. a template switch adds a new family) reflow the piece
    fonts?.addEventListener?.("loadingdone", run);
    return () => {
      cancelled = true;
      fonts?.removeEventListener?.("loadingdone", run);
    };
  }, [template, content, overrides, side, bleed, keepOut]);

  return (
    <div
      ref={ref}
      className={["dm-piece", className].filter(Boolean).join(" ")}
      data-template={template.id}
      data-side={side}
      style={{
        position: "relative",
        width: W,
        height: H,
        overflow: "hidden",
        background: t.colors.bg,
        color: t.colors.text,
        fontFamily: t.font.body,
        flexShrink: 0,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        ...style,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
      {isInside ? (
        <BookletInside
          ctx={ctx}
          page={side === "inside-left" ? "left" : "right"}
        />
      ) : isBack ? (
        renderBack(ctx, template.back!)
      ) : (
        renderFront(ctx, template.front)
      )}

      {hole && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: bleedPx + inToPx(hole.top),
            width: inToPx(hole.diameter),
            height: inToPx(hole.diameter),
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: guides ? "rgba(255,255,255,.85)" : "#FFFFFF",
            border: guides ? "1px dashed #E11D48" : "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {guides && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: bleedPx,
              border: "1px dashed #E11D48",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: bleedPx + safePx,
              border: "1px dashed #2563EB",
              pointerEvents: "none",
            }}
          />
          {fmt.printMargin && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: bleedPx + inToPx(fmt.printMargin),
                border: "1px dashed #F59E0B",
                pointerEvents: "none",
              }}
            />
          )}
          {addressSide === side && fmt.clearZone && !fmt.fold && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: bleedPx,
                right: bleedPx,
                bottom: bleedPx,
                height: inToPx(fmt.clearZone),
                background: "rgba(225,29,72,.08)",
                borderTop: "1px dashed #E11D48",
                pointerEvents: "none",
              }}
            />
          )}
          {fmt.fold &&
            Array.from({ length: fmt.fold.kind === "half" ? 1 : 2 }).map(
              (_, i) => {
                const n = fmt.fold!.kind === "half" ? 2 : 3;
                const pos =
                  bleedPx +
                  ((fmt.fold!.axis === "vertical" ? W : H) - 2 * bleedPx) *
                    ((i + 1) / n);
                return fmt.fold!.axis === "vertical" ? (
                  <div
                    key={i}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: pos,
                      borderLeft: "1px dashed #7C3AED",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <div
                    key={i}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: pos,
                      borderTop: "1px dashed #7C3AED",
                      pointerEvents: "none",
                    }}
                  />
                );
              },
            )}
          {fmt.tearStrip && (
            <>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: bleedPx,
                  width: inToPx(fmt.tearStrip),
                  borderRight: "1px dashed #E11D48",
                  pointerEvents: "none",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: bleedPx,
                  width: inToPx(fmt.tearStrip),
                  borderLeft: "1px dashed #E11D48",
                  pointerEvents: "none",
                }}
              />
            </>
          )}
          <span
            style={{
              position: "absolute",
              left: bleedPx + 4,
              bottom: bleedPx + 2,
              fontFamily: "system-ui",
              fontSize: 9,
              color: "#E11D48",
              background: "rgba(255,255,255,.7)",
              padding: "1px 4px",
            }}
          >
            {fmt.label} · {side}
            {bleed ? " + bleed" : ""} · red = trim · blue = safe
            {fmt.fold ? " · purple = fold" : ""}
            {fmt.printMargin ? " · orange = printable" : ""}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Print sheet: one page per side at exact size. Open in a new window and call
 * window.print(), or render through headless Chromium for a PDF.
 */
export function MailPrintSheet({
  template,
  content,
  overrides,
  bleed = true,
  sides,
}: {
  template: MailTemplateSpec;
  content: MailContent;
  overrides?: MailThemeOverrides;
  bleed?: boolean;
  sides?: Side[];
}) {
  const fmt = getFormat(template.format);
  const list = sides ?? templateSides(template);
  return (
    <div className="dm-print-sheet">
      <style
        dangerouslySetInnerHTML={{
          __html: `${pageCss(fmt, bleed)} body{margin:0} .dm-page{page-break-after:always;break-after:page} .dm-page:last-child{page-break-after:auto;break-after:auto}`,
        }}
      />
      {list.map((s) => (
        <div key={s} className="dm-page">
          <MailPiece
            template={template}
            content={content}
            overrides={overrides}
            side={s}
            bleed={bleed}
          />
        </div>
      ))}
    </div>
  );
}

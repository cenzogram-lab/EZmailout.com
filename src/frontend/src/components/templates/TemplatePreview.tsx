import type { CanvasSide, CanvasState } from "@/backend";
import {
  QrImage,
  sortedElements,
  textBlockStyle,
} from "@/components/canvas/CanvasEditor";
import { canvasFromTemplate } from "@/lib/canvas";
import {
  type AddressZone,
  type Orientation,
  getLayoutDims,
} from "@/lib/printSpec";
import { isShapeUrl } from "@/lib/shapes";
import { loadTemplateFonts, templateFontsLoaded } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { CanvasSideKey, DesignTemplate } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";

/** True once every template typeface has loaded (layouts are measured with them). */
export function useTemplateFonts(): boolean {
  const [ready, setReady] = useState(templateFontsLoaded);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadTemplateFonts().then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}

const cache = new Map<string, CanvasState>();

/** The canvas a template builds for a format and orientation (memoised). */
export function templateCanvas(
  template: DesignTemplate,
  layoutVariant = template.layoutVariant,
  orientation: Orientation = template.orientation,
): CanvasState {
  const key = `${template.id}|${layoutVariant}|${orientation}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = canvasFromTemplate(template, layoutVariant, orientation);
    if (cache.size > 400) cache.clear();
    cache.set(key, canvas);
  }
  return canvas;
}

/** Read-only render of one side, scaled to the width of its container. */
export function SidePreview({
  canvas,
  side,
  addressZone,
  className,
}: {
  canvas: CanvasState;
  side: CanvasSideKey;
  /** USPS zone on this side: drawn as a sample address so the gap reads. */
  addressZone?: AddressZone;
  className?: string;
}) {
  const ppi = Number(canvas.designPpi) || 100;
  const w = Math.round(canvas.widthInches * ppi);
  const h = Math.round(canvas.heightInches * ppi);
  const face: CanvasSide = canvas[side];
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  const elements = useMemo(() => sortedElements(face), [face]);
  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        aspectRatio: `${w} / ${h}`,
        backgroundColor: face.backgroundColor,
      }}
    >
      {scale > 0 && (
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: w,
            height: h,
            transform: `scale(${scale})`,
            backgroundColor: face.backgroundColor,
          }}
        >
          {face.backgroundImageUrl && (
            <img
              src={face.backgroundImageUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {elements.map((el) => {
            if (el.kind === "text") {
              return (
                <div
                  key={el.id}
                  className="absolute overflow-visible"
                  style={{
                    left: el.data.x,
                    top: el.data.y,
                    width: el.data.width,
                    height: el.data.height,
                    zIndex: el.z,
                    ...textBlockStyle(el.data),
                  }}
                >
                  {el.data.text}
                </div>
              );
            }
            if (el.kind === "logo") {
              return (
                <img
                  key={el.id}
                  src={el.data.url}
                  alt=""
                  draggable={false}
                  className={cn(
                    "absolute",
                    isShapeUrl(el.data.url) ? "object-fill" : "object-contain",
                  )}
                  style={{
                    left: el.data.x,
                    top: el.data.y,
                    width: el.data.width,
                    height: el.data.height,
                    zIndex: el.z,
                  }}
                />
              );
            }
            return (
              <div
                key={el.id}
                className="absolute"
                style={{
                  left: el.data.x,
                  top: el.data.y,
                  width: el.data.size,
                  height: el.data.size,
                  zIndex: el.z,
                }}
              >
                <QrImage qr={el.data} />
              </div>
            );
          })}
          {addressZone && <SampleAddress zone={addressZone} />}
        </div>
      )}
    </div>
  );
}

/**
 * Where the print partner prints the address, postage and barcode, shown as
 * a sample so a back with an empty corner reads as a postcard back. Preview
 * only: it is never part of the design.
 */
function SampleAddress({ zone }: { zone: AddressZone }) {
  const pad = Math.min(zone.w, zone.h) * 0.12;
  const line = Math.max(10, Math.min(zone.w, zone.h) * 0.075);
  return (
    <div
      className="absolute"
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.w,
        height: zone.h,
        zIndex: 9000,
      }}
    >
      <div
        className="absolute rounded-sm border-2 border-dashed border-slate-400/70 bg-white/55"
        style={{
          right: pad * 0.6,
          top: pad * 0.6,
          width: line * 4.2,
          height: line * 4.8,
        }}
      />
      <div
        className="absolute flex flex-col justify-center"
        style={{
          left: pad,
          right: pad,
          top: pad + line * 4,
          bottom: pad,
          gap: line * 0.55,
        }}
      >
        {[0.62, 0.8, 0.7].map((w) => (
          <span
            key={w}
            className="block rounded-full bg-slate-500/35"
            style={{ width: `${w * 100}%`, height: line * 0.62 }}
          />
        ))}
        <span
          className="mt-1 block bg-[repeating-linear-gradient(90deg,rgba(71,85,105,0.45)_0_2px,transparent_2px_5px)]"
          style={{ width: "70%", height: line * 0.7 }}
        />
      </div>
    </div>
  );
}

/**
 * A template side that is laid out only once it scrolls near the viewport
 * (and the typefaces have loaded); until then a tinted box of the same shape
 * holds its place, so the grid never jumps.
 */
export function LazyTemplateSide({
  template,
  layoutVariant = template.layoutVariant,
  orientation = template.orientation,
  side,
  aspect,
  className,
}: {
  template: DesignTemplate;
  layoutVariant?: string;
  orientation?: Orientation;
  side: CanvasSideKey;
  /** Width / height of the artboard, for the placeholder. */
  aspect: number;
  className?: string;
}) {
  const fonts = useTemplateFonts();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  const canvas = useMemo(
    () =>
      fonts && visible
        ? templateCanvas(template, layoutVariant, orientation)
        : null,
    [fonts, visible, template, layoutVariant, orientation],
  );
  return (
    <div ref={ref} className={className}>
      {canvas ? (
        <SidePreview
          canvas={canvas}
          side={side}
          addressZone={
            side === "back"
              ? getLayoutDims(layoutVariant, orientation).addressZone
              : undefined
          }
        />
      ) : (
        <div
          className="w-full motion-safe:animate-pulse"
          style={{
            aspectRatio: String(aspect),
            backgroundColor: template.palette.bg,
          }}
        />
      )}
    </div>
  );
}

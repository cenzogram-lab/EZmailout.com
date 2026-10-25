import type { CanvasState } from "@/backend";
import { SidePreview } from "@/components/templates/TemplatePreview";
import type { MailGalleryEntry } from "@/directmail/gallery";
import { getLayoutDims } from "@/lib/printSpec";
import type { CanvasSideKey } from "@/types";
import { useEffect, useRef, useState } from "react";

export type MailLibrary = typeof import("@/directmail/gallery");

let libraryPromise: Promise<MailLibrary> | null = null;

/** Loads the mail-type template library (its own chunk) once. */
export function loadMailLibrary(): Promise<MailLibrary> {
  libraryPromise ??= import("@/directmail/gallery").catch((e) => {
    libraryPromise = null;
    throw e;
  });
  return libraryPromise;
}

/** The mail-type template library once its chunk has loaded, else null. */
export function useMailLibrary(): MailLibrary | null {
  const [lib, setLib] = useState<MailLibrary | null>(null);
  useEffect(() => {
    let live = true;
    loadMailLibrary()
      .then((m) => live && setLib(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return lib;
}

/** The converted canvas of a mail-type template, once converted. */
export function useMailCanvas(
  lib: MailLibrary | null,
  id: string | null,
  enabled = true,
): CanvasState | null {
  const [canvas, setCanvas] = useState<CanvasState | null>(null);
  useEffect(() => {
    if (!lib || !id || !enabled) return;
    let live = true;
    lib
      .mailCanvas(id)
      .then((c) => live && setCanvas(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lib, id, enabled]);
  return canvas;
}

/**
 * A mail-type template side, converted only once it scrolls near the
 * viewport; until then a box of the same shape holds its place.
 */
export function LazyMailSide({
  lib,
  entry,
  side,
  className,
}: {
  lib: MailLibrary;
  entry: MailGalleryEntry;
  side: CanvasSideKey;
  className?: string;
}) {
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
  const canvas = useMailCanvas(lib, entry.id, visible);
  return (
    <div ref={ref} className={className}>
      {canvas ? (
        <SidePreview
          canvas={canvas}
          side={side}
          addressZone={
            side === "back"
              ? getLayoutDims(entry.layoutVariant, entry.orientation)
                  .addressZone
              : undefined
          }
        />
      ) : (
        <div
          className="w-full bg-muted motion-safe:animate-pulse"
          style={{ aspectRatio: String(entry.aspect) }}
        />
      )}
    </div>
  );
}

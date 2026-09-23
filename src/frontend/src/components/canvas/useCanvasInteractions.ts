import { clampToCanvas } from "@/lib/canvas";
import type { LayoutDims } from "@/lib/printSpec";
import type { CanvasSideKey } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export type InteractionKind = "drag" | "resize";

/** Geometry of the element being dragged or resized, in design pixels. */
export interface ElementBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Logos and QR codes keep their aspect ratio while resizing. */
  keepAspect?: boolean;
  /** Smallest allowed width/height in design pixels. */
  minSize?: number;
}

export interface ResizeResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasInteractionOptions {
  /** Screen px per design px of the rendered canvas. */
  scale: number;
  side: CanvasSideKey;
  dims: LayoutDims;
  onMove: (side: CanvasSideKey, id: string, x: number, y: number) => void;
  onResize: (side: CanvasSideKey, id: string, box: ResizeResult) => void;
  onInteractionStart?: (id: string, kind: InteractionKind) => void;
  onInteractionEnd?: (
    id: string,
    kind: InteractionKind,
    moved: boolean,
  ) => void;
}

export interface CanvasInteractions {
  startDrag: (event: React.PointerEvent, box: ElementBox) => void;
  startResize: (
    event: React.PointerEvent,
    box: ElementBox,
    corner: ResizeCorner,
  ) => void;
  activeId: string | null;
  isDragging: boolean;
  isResizing: boolean;
}

interface Session {
  kind: InteractionKind;
  pointerId: number;
  id: string;
  corner: ResizeCorner;
  startClientX: number;
  startClientY: number;
  initial: ElementBox;
  moved: boolean;
}

type PointerListener = (event: PointerEvent) => void;

const DEFAULT_MIN_SIZE = 16;
const DRAG_THRESHOLD_PX = 2;

/** Resizes `initial` from one corner, keeping the opposite corner anchored. */
export function computeResize(
  initial: ElementBox,
  corner: ResizeCorner,
  dx: number,
  dy: number,
  dims: LayoutDims,
): ResizeResult {
  const min = initial.minSize ?? DEFAULT_MIN_SIZE;
  const right = initial.x + initial.width;
  const bottom = initial.y + initial.height;
  const signX = corner === "ne" || corner === "se" ? 1 : -1;
  const signY = corner === "sw" || corner === "se" ? 1 : -1;
  const maxW = Math.max(
    min,
    signX === 1 ? dims.designWidth - initial.x : right,
  );
  const maxH = Math.max(
    min,
    signY === 1 ? dims.designHeight - initial.y : bottom,
  );

  let width = Math.max(min, initial.width + signX * dx);
  let height = Math.max(min, initial.height + signY * dy);

  if (initial.keepAspect && initial.width > 0 && initial.height > 0) {
    const byWidth = width / initial.width;
    const byHeight = height / initial.height;
    let factor =
      Math.abs(byWidth - 1) >= Math.abs(byHeight - 1) ? byWidth : byHeight;
    const factorMin = min / Math.min(initial.width, initial.height);
    const factorMax = Math.min(maxW / initial.width, maxH / initial.height);
    factor = Math.min(Math.max(factor, factorMin), factorMax);
    width = initial.width * factor;
    height = initial.height * factor;
  } else {
    width = Math.min(width, maxW);
    height = Math.min(height, maxH);
  }

  const x = signX === 1 ? initial.x : right - width;
  const y = signY === 1 ? initial.y : bottom - height;
  return {
    x: Math.round(Math.max(0, x)),
    y: Math.round(Math.max(0, y)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Pointer-event based drag / resize for canvas elements. Works with mouse,
 * pen and touch (elements should carry `touch-action: none`). Listeners are
 * attached to `window` only for the lifetime of a gesture and are always
 * removed on pointer up / cancel and on unmount.
 */
export function useCanvasInteractions(
  options: CanvasInteractionOptions,
): CanvasInteractions {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const sessionRef = useRef<Session | null>(null);
  const [active, setActive] = useState<{
    id: string;
    kind: InteractionKind;
  } | null>(null);

  // Stable listener identities (so add/remove always match) that delegate to
  // the latest implementation via refs.
  const moveImplRef = useRef<PointerListener>(() => {});
  const upImplRef = useRef<PointerListener>(() => {});
  const listenersRef = useRef<{ move: PointerListener; up: PointerListener }>({
    move: (event) => moveImplRef.current(event),
    up: (event) => upImplRef.current(event),
  });

  const detach = useCallback(() => {
    const { move, up } = listenersRef.current;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  }, []);

  moveImplRef.current = (event: PointerEvent) => {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    const { scale, dims, side, onMove, onResize } = optionsRef.current;
    const safeScale = scale > 0 ? scale : 1;
    const screenDx = event.clientX - session.startClientX;
    const screenDy = event.clientY - session.startClientY;
    if (!session.moved && Math.hypot(screenDx, screenDy) < DRAG_THRESHOLD_PX) {
      return;
    }
    session.moved = true;
    if (event.cancelable) event.preventDefault();
    const dx = screenDx / safeScale;
    const dy = screenDy / safeScale;

    if (session.kind === "drag") {
      const { x, y } = clampToCanvas(
        session.initial.x + dx,
        session.initial.y + dy,
        session.initial.width,
        session.initial.height,
        dims.designWidth,
        dims.designHeight,
      );
      onMove(side, session.id, Math.round(x), Math.round(y));
      return;
    }

    onResize(
      side,
      session.id,
      computeResize(session.initial, session.corner, dx, dy, dims),
    );
  };

  upImplRef.current = (event: PointerEvent) => {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    sessionRef.current = null;
    detach();
    setActive(null);
    optionsRef.current.onInteractionEnd?.(
      session.id,
      session.kind,
      session.moved,
    );
  };

  const begin = useCallback(
    (
      event: React.PointerEvent,
      box: ElementBox,
      kind: InteractionKind,
      corner: ResizeCorner,
    ) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      // A stray session (e.g. pointerup lost off-window) is replaced cleanly.
      if (sessionRef.current) detach();
      sessionRef.current = {
        kind,
        pointerId: event.pointerId,
        id: box.id,
        corner,
        startClientX: event.clientX,
        startClientY: event.clientY,
        initial: { ...box },
        moved: false,
      };
      try {
        (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture is a nicety; dragging still works via window listeners.
      }
      const { move, up } = listenersRef.current;
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      setActive({ id: box.id, kind });
      optionsRef.current.onInteractionStart?.(box.id, kind);
    },
    [detach],
  );

  const startDrag = useCallback(
    (event: React.PointerEvent, box: ElementBox) => {
      begin(event, box, "drag", "se");
    },
    [begin],
  );

  const startResize = useCallback(
    (event: React.PointerEvent, box: ElementBox, corner: ResizeCorner) => {
      begin(event, box, "resize", corner);
    },
    [begin],
  );

  useEffect(() => {
    return () => {
      sessionRef.current = null;
      detach();
    };
  }, [detach]);

  return {
    startDrag,
    startResize,
    activeId: active?.id ?? null,
    isDragging: active?.kind === "drag",
    isResizing: active?.kind === "resize",
  };
}

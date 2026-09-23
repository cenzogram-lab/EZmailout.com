import type { PhysicalTraits, SheetEdge } from "@/lib/physical";
import { DESIGN_PPI, type LayoutDims } from "@/lib/printSpec";
import { cn } from "@/lib/utils";

/** Distance a pressure-seal tear strip sits in from the trim edge. */
export const PERFORATION_INSET_INCHES = 0.375;

/** Width of the saddle-stitch spine / score band at the bound edge. */
export const SPINE_BAND_INCHES = 0.1875;

const CREASE_COLOR = "rgba(1, 8, 10, 0.34)";
const PERF_COLOR = "rgba(1, 8, 10, 0.46)";
const SPINE_COLOR = "rgba(1, 8, 10, 0.38)";
const WINDOW_COLOR = "#6366f1";

/** Stage layer above the artwork but under the print guides. */
const LAYER_Z = 7900;
const WINDOW_Z = 7950;

function Chip({
  children,
  scale,
  className,
  color,
}: {
  children: string;
  scale: number;
  className: string;
  color: string;
}) {
  return (
    <span
      className={cn(
        "absolute px-1 font-mono uppercase tracking-wide text-white",
        className,
      )}
      style={{
        fontSize: 9 / scale,
        lineHeight: 1.4,
        backgroundColor: color,
        opacity: 0.8,
      }}
    >
      {children}
    </span>
  );
}

function edgeStyle(
  edge: SheetEdge,
  dims: LayoutDims,
  band: number,
): { left: number; top: number; width: number; height: number } {
  const { designWidth: w, designHeight: h } = dims;
  switch (edge) {
    case "left":
      return { left: 0, top: 0, width: band, height: h };
    case "right":
      return { left: w - band, top: 0, width: band, height: h };
    case "top":
      return { left: 0, top: 0, width: w, height: band };
    default:
      return { left: 0, top: h - band, width: w, height: band };
  }
}

/**
 * Draws how the finished piece folds, tears and binds, on top of the artwork.
 *
 * Coordinates are design pixels inside the scaled artboard, so strokes are
 * divided by `scale` to stay hairline-thin on screen at any zoom. `subtle`
 * drops the labels and softens the strokes for the 3D proof, where the card is
 * small and the markings should read as creases rather than annotations.
 */
export function PhysicalOverlay({
  dims,
  traits,
  scale,
  subtle = false,
}: {
  dims: LayoutDims;
  traits: PhysicalTraits;
  scale: number;
  subtle?: boolean;
}) {
  const stroke = 1 / scale;
  const opacity = subtle ? 0.55 : 1;
  const perfInset = PERFORATION_INSET_INCHES * DESIGN_PPI;
  const spineBand = SPINE_BAND_INCHES * DESIGN_PPI;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: LAYER_Z, opacity }}
      data-ocid="canvas.physical.overlay"
      data-stock={traits.stock}
    >
      {traits.creases.map((crease) => {
        const vertical = crease.axis === "vertical";
        const pos = vertical
          ? crease.at * dims.designWidth
          : crease.at * dims.designHeight;
        return (
          <div
            key={`${crease.axis}-${crease.at}`}
            className="absolute"
            style={
              vertical
                ? {
                    left: pos,
                    top: 0,
                    height: dims.designHeight,
                    borderLeft: `${stroke}px dashed ${CREASE_COLOR}`,
                  }
                : {
                    top: pos,
                    left: 0,
                    width: dims.designWidth,
                    borderTop: `${stroke}px dashed ${CREASE_COLOR}`,
                  }
            }
            data-ocid={`canvas.physical.crease.${crease.axis}`}
          >
            {!subtle && (
              <Chip
                scale={scale}
                color="#01080a"
                className={
                  vertical
                    ? "left-0 top-0 rounded-br"
                    : "left-0 top-0 rounded-b"
                }
              >
                {crease.label}
              </Chip>
            )}
          </div>
        );
      })}

      {traits.perforations.map((edge) => {
        // A tear line runs parallel to its edge, inset by the strip width.
        const vertical = edge === "left" || edge === "right";
        const offset =
          edge === "left" || edge === "top"
            ? perfInset
            : (vertical ? dims.designWidth : dims.designHeight) - perfInset;
        return (
          <div
            key={`perf-${edge}`}
            className="absolute"
            style={{
              left: vertical ? offset : 0,
              top: vertical ? 0 : offset,
              width: vertical ? 0 : dims.designWidth,
              height: vertical ? dims.designHeight : 0,
              borderLeft: vertical
                ? `${stroke * 1.5}px dotted ${PERF_COLOR}`
                : undefined,
              borderTop: vertical
                ? undefined
                : `${stroke * 1.5}px dotted ${PERF_COLOR}`,
            }}
            data-ocid={`canvas.physical.perforation.${edge}`}
          >
            {!subtle && edge === "bottom" && (
              <Chip
                scale={scale}
                color="#01080a"
                className="left-0 top-0 rounded-b"
              >
                Tear strip
              </Chip>
            )}
          </div>
        );
      })}

      {traits.spine && (
        <div
          className="absolute"
          style={{
            ...edgeStyle(traits.spine, dims, spineBand),
            backgroundImage: `repeating-linear-gradient(135deg, ${SPINE_COLOR} 0, ${SPINE_COLOR} ${stroke}px, transparent ${stroke}px, transparent ${stroke * 5}px)`,
            borderRight:
              traits.spine === "left"
                ? `${stroke}px dashed ${CREASE_COLOR}`
                : undefined,
            borderLeft:
              traits.spine === "right"
                ? `${stroke}px dashed ${CREASE_COLOR}`
                : undefined,
          }}
          data-ocid={`canvas.physical.spine.${traits.spine}`}
        >
          {!subtle && (
            <Chip
              scale={scale}
              color="#01080a"
              className="left-0 top-0 rounded-br"
            >
              Score
            </Chip>
          )}
        </div>
      )}

      {traits.windows.map((win) => (
        <div
          key={win.label}
          className="absolute"
          style={{
            left: win.xInches * DESIGN_PPI,
            top: win.yInches * DESIGN_PPI,
            width: win.widthInches * DESIGN_PPI,
            height: win.heightInches * DESIGN_PPI,
            boxSizing: "border-box",
            border: `${stroke}px dashed ${WINDOW_COLOR}`,
            backgroundColor: "rgba(99, 102, 241, 0.07)",
            zIndex: WINDOW_Z,
          }}
          data-ocid={`canvas.physical.window.${win.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`}
        >
          {!subtle && (
            <Chip
              scale={scale}
              color={WINDOW_COLOR}
              className="left-0 top-0 rounded-br"
            >
              {win.label}
            </Chip>
          )}
        </div>
      ))}
    </div>
  );
}

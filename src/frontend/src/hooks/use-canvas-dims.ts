import { type LayoutDims, getLayoutDims, orientationOf } from "@/lib/printSpec";
import { useWizardStore } from "@/store/wizard";
import { useMemo } from "react";

/**
 * Dimensions and print guides of the studio's canvas as laid out: the chosen
 * format in its current orientation (see `rotateCanvas`).
 */
export function useCanvasDims(): LayoutDims {
  const layoutVariant = useWizardStore((s) => s.selectedLayout ?? "6x9");
  const widthInches = useWizardStore((s) => s.canvas.widthInches);
  const heightInches = useWizardStore((s) => s.canvas.heightInches);
  return useMemo(
    () =>
      getLayoutDims(
        layoutVariant,
        orientationOf({ widthInches, heightInches }, layoutVariant),
      ),
    [layoutVariant, widthInches, heightInches],
  );
}

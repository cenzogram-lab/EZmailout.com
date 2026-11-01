import designRender from "@/assets/stampy/stampy-design.webp";
import { StampyImage } from "./StampyImage";
import type { StampyProps } from "./stampy";

/**
 * Stampy in a beret with a brush in his mouth and a palette: Step 3 (design
 * studio) and the `design` stage pose.
 *
 * A 3D render (`scripts/stampy3d`, pose `design`).
 */
export function StampyStep3Studio(props: StampyProps) {
  return (
    <StampyImage src={designRender} data-stampy="stampy-design" {...props} />
  );
}

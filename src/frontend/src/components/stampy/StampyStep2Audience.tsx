import audienceRender from "@/assets/stampy/stampy-audience.webp";
import { StampyImage } from "./StampyImage";
import type { StampyProps } from "./stampy";

/**
 * Stampy with a folded map and a magnifying glass on a pin: Step 2 (pick
 * your audience) and the `audience` stage pose.
 *
 * A 3D render (`scripts/stampy3d`, pose `audience`).
 */
export function StampyStep2Audience(props: StampyProps) {
  return (
    <StampyImage
      src={audienceRender}
      data-stampy="stampy-audience"
      {...props}
    />
  );
}

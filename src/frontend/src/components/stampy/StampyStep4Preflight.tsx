import checklistRender from "@/assets/stampy/stampy-checklist.webp";
import { StampyImage } from "./StampyImage";
import type { StampyProps } from "./stampy";

/**
 * Stampy holding a ticked clipboard: Step 4 (preflight, review and pay) and
 * the `checklist` stage pose.
 *
 * A 3D render (`scripts/stampy3d`, pose `checklist`).
 */
export function StampyStep4Preflight(props: StampyProps) {
  return (
    <StampyImage
      src={checklistRender}
      data-stampy="stampy-checklist"
      {...props}
    />
  );
}

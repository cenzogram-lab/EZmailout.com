import { StampyStep4Preflight } from "./StampyStep4Preflight";
import type { StampyProps } from "./stampy";

/**
 * Stampy's head (cap, ears and face) cropped from the Step 4 pose: the brand
 * mark in the header and the peeking mascot. The crop stops at the chin, above
 * the clipboard the full pose holds.
 */
export const STAMPY_HEAD_VIEWBOX = "40 24 102 90";

export function StampyMark(props: StampyProps) {
  return (
    <StampyStep4Preflight
      viewBox={STAMPY_HEAD_VIEWBOX}
      width={102}
      height={90}
      {...props}
    />
  );
}

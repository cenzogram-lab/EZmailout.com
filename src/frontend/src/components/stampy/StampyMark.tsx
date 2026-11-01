import headRender from "@/assets/stampy/stampy-head.webp";
import { StampyImage } from "./StampyImage";
import type { StampyProps } from "./stampy";

/**
 * Stampy's head (cap, ears and face): the brand mark in the header and the
 * peeking mascot. A 3D render (`scripts/stampy3d`, pose `head`), square,
 * with his chin at the bottom edge.
 */
export function StampyMark(props: StampyProps) {
  return <StampyImage src={headRender} data-stampy="stampy-head" {...props} />;
}

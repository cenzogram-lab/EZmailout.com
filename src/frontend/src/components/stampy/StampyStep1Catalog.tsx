import mailRender from "@/assets/stampy/stampy-mail.webp";
import { StampyImage } from "./StampyImage";
import type { StampyProps } from "./stampy";

/**
 * Stampy waving a postcard, satchel on: Step 1 (choose your mail piece) and
 * the `mail` stage pose.
 *
 * A 3D render (`scripts/stampy3d`, pose `mail`).
 */
export function StampyStep1Catalog(props: StampyProps) {
  return <StampyImage src={mailRender} data-stampy="stampy-mail" {...props} />;
}

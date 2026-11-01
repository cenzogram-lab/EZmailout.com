import tipRender from "@/assets/stampy/stampy-avatar-tip.webp";
import { StampyAvatar } from "./StampyAvatar";
import type { StampyProps } from "./stampy";

/**
 * Stampy chat avatar for tips: a letter in his paw and a bright idea beside
 * his cap. A 3D render (`scripts/stampy3d`, pose `avatar-tip`).
 */
export function StampyChatAvatarTip(props: StampyProps) {
  return <StampyAvatar src={tipRender} stampy="stampy-avatar-tip" {...props} />;
}

import idleRender from "@/assets/stampy/stampy-avatar-idle.webp";
import { StampyAvatar } from "./StampyAvatar";
import type { StampyProps } from "./stampy";

/**
 * Stampy chat avatar at rest: headset on, with a red unread dot
 * (`.stampy-notify-dot`, hidden inside the launcher and panel by index.css).
 * A 3D render (`scripts/stampy3d`, pose `avatar-idle`).
 */
export function StampyChatAvatarIdle(props: StampyProps) {
  return (
    <StampyAvatar
      src={idleRender}
      stampy="stampy-avatar-idle"
      badge={
        <span className="stampy-notify-dot absolute left-[74%] top-[6%] size-[20%] rounded-full bg-[#e5402a] shadow-[0_0_0_max(1.5px,3.5%)_#ffffff]" />
      }
      {...props}
    />
  );
}

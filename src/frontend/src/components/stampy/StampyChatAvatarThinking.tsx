import thinkingRender from "@/assets/stampy/stampy-avatar-thinking.webp";
import { StampyAvatar } from "./StampyAvatar";
import type { StampyProps } from "./stampy";

/**
 * Stampy chat avatar while a reply is being written: paw at his chin and a
 * typing bubble whose three dots pulse (`.stampy-dot`, see index.css; they sit
 * alone in `.stampy-dots`, so `:nth-of-type` counts them 1–3). A 3D render
 * (`scripts/stampy3d`, pose `avatar-thinking`).
 */
export function StampyChatAvatarThinking(props: StampyProps) {
  return (
    <StampyAvatar
      src={thinkingRender}
      stampy="stampy-avatar-thinking"
      badge={
        <span className="absolute right-0 top-[6%] flex h-[21%] w-[40%] items-center justify-center rounded-full bg-white shadow-[0_0_0_max(1px,2%)_#6366f1]">
          <span className="stampy-dots flex h-full w-full items-center justify-center gap-[10%]">
            <span className="stampy-dot size-[18%] rounded-full bg-[#6366f1]" />
            <span className="stampy-dot size-[18%] rounded-full bg-[#6366f1]" />
            <span className="stampy-dot size-[18%] rounded-full bg-[#6366f1]" />
          </span>
        </span>
      }
      {...props}
    />
  );
}

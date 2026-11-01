import type { HTMLAttributes } from "react";

export interface StampyProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  /**
   * Accessible name. Omit it where Stampy is decoration next to text that
   * already says the same thing; the image is then hidden from assistive tech.
   */
  title?: string;
}

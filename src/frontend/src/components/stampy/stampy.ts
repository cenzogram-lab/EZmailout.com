import { type SVGProps, useId } from "react";

export interface StampyProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /**
   * Accessible name. Omit it where Stampy is decoration next to text that
   * already says the same thing; the SVG is then hidden from assistive tech.
   */
  title?: string;
}

/**
 * Id prefix unique to one rendered Stampy. SVG ids are document-global, so two
 * mascots sharing a `clipPath` id would clip each other; React's `useId` keeps
 * them apart and the sanitising keeps the prefix valid inside `url(#…)`.
 */
export function useStampyId(): string {
  return `stampy-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

import { create } from "zustand";

/** Persisted opt-out for every Stampy tip in the wizard. */
export const HIDE_STAMPY_TIPS_KEY = "ezmailout_hide_stampy_tips";

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDE_STAMPY_TIPS_KEY) === "true";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(HIDE_STAMPY_TIPS_KEY, "true");
    else window.localStorage.removeItem(HIDE_STAMPY_TIPS_KEY);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

interface StampyTipsStore {
  /** "Don't show tips" — hides every tip, remembered across visits. */
  hidden: boolean;
  /** Tips closed with their × this visit, by id. */
  dismissed: Record<string, true>;
  setHidden: (hidden: boolean) => void;
  dismiss: (id: string) => void;
}

export const useStampyTips = create<StampyTipsStore>()((set) => ({
  hidden: readHidden(),
  dismissed: {},
  setHidden: (hidden) => {
    writeHidden(hidden);
    set(hidden ? { hidden } : { hidden, dismissed: {} });
  },
  dismiss: (id) => set((s) => ({ dismissed: { ...s.dismissed, [id]: true } })),
}));

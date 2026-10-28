/**
 * Keeps `<html data-input-modality>` at "keyboard" or "pointer" after the
 * last input, for the `kbd-focus:` Tailwind variant: Radix menus and selects
 * focus their items by script as the mouse moves over them, so a
 * `:focus-visible` ring there also showed on hover. Called once from main.tsx.
 */
export function initInputModality(): void {
  const root = document.documentElement;
  const set = (modality: "keyboard" | "pointer") => {
    if (root.dataset.inputModality !== modality) {
      root.dataset.inputModality = modality;
    }
  };
  const options = { capture: true, passive: true };
  window.addEventListener(
    "keydown",
    (event) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) set("keyboard");
    },
    options,
  );
  window.addEventListener("pointerdown", () => set("pointer"), options);
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "mouse") set("pointer");
    },
    options,
  );
}

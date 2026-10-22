import { useEffect, useState } from "react";

/** Input types that never raise an on-screen keyboard. */
const NO_KEYBOARD = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function typingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  return (
    el.tagName === "INPUT" && !NO_KEYBOARD.has((el as HTMLInputElement).type)
  );
}

/**
 * True while a phone's on-screen keyboard is up: a text field has focus and
 * the visual viewport is clearly shorter than the layout viewport (with
 * `interactive-widget=resizes-visual` in index.html the keyboard shrinks only
 * the visual viewport). Bottom-anchored bars step aside then: on iOS a fixed
 * bar no longer stays on the screen edge while the keyboard is open and drifts
 * over the page as it scrolls. Also mirrored as `data-soft-keyboard` on
 * `<html>` for CSS (`.hide-with-keyboard`).
 */
export function useSoftKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      const shrunk = vv ? vv.height < window.innerHeight * 0.8 : false;
      const next = typingTarget(document.activeElement) && shrunk;
      setOpen(next);
      if (next) document.documentElement.dataset.softKeyboard = "";
      else delete document.documentElement.dataset.softKeyboard;
    };
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    vv?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      vv?.removeEventListener("resize", update);
      delete document.documentElement.dataset.softKeyboard;
    };
  }, []);
  return open;
}

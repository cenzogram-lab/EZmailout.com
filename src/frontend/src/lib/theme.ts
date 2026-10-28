import { useSyncExternalStore } from "react";

/**
 * Light / dark theme. Light (the original white EZmailout look) is the
 * default; dark is the obsidian look, chosen with the theme switch
 * (`components/ui/theme-toggle.tsx`). The choice is kept in localStorage
 * under `ezmailout_theme` ("light" | "dark"; anything else means light) and
 * applied as the `dark` class on <html>. `main.tsx` calls `initTheme()`
 * before React's first render, so the first frame is already in the right
 * theme (never an inline script: the CSP forbids it).
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "ezmailout_theme";

/** Browser chrome colour per theme (<meta name="theme-color">). */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#5c5ee8",
  dark: "#0a0b10",
};

function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

/** The saved choice; light when nothing (or nothing readable) is saved. */
export function readStoredTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "light";
  }
}

let current: Theme = "light";
const listeners = new Set<() => void>();

/** Puts `theme` on the document: the `dark` class (which also sets
 * `color-scheme` for native controls and scrollbars, see index.css) and the
 * browser chrome colour. */
export function applyTheme(theme: Theme): void {
  current = theme;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[theme];
  for (const listener of listeners) listener();
}

/** Applies and saves `theme`; every `useTheme()` re-renders. */
export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the switch still works for this page.
  }
  applyTheme(theme);
}

export function toggleTheme(): void {
  setTheme(current === "dark" ? "light" : "dark");
}

export function getTheme(): Theme {
  return current;
}

let initialised = false;

/** Applies the saved theme and follows changes made in other tabs. Call once,
 * before the first render (main.tsx). */
export function initTheme(): void {
  applyTheme(readStoredTheme());
  if (initialised) return;
  initialised = true;
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(readStoredTheme());
    }
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current theme, re-rendering when it changes. */
export function useTheme(): {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "light");
  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

/**
 * The light / dark switch (lib/theme.ts). Callers pass their own `data-ocid`
 * (the header's is `nav.theme.toggle`).
 *
 * - `icon` (default): a round tactile 40 px button for the header. Its
 *   accessible name says what a press does: "Switch to dark mode" in the light
 *   theme, "Switch to light mode" in the dark one.
 * - `row`: a full-width 48 px "Dark mode" switch (icon tile, label, on/off
 *   pill; `role="switch"`, on in the dark theme) for the phone menu.
 * - `menu-item`: the same "Dark mode" switch as a `DropdownMenuItem`
 *   (`menuitemcheckbox`) for the account dropdown; the menu stays open so the
 *   change is visible.
 */
export function ThemeToggle({
  variant = "icon",
  className,
  "data-ocid": ocid,
}: {
  variant?: "icon" | "row" | "menu-item";
  className?: string;
  "data-ocid"?: string;
}) {
  const { isDark, toggleTheme } = useTheme();
  const name = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "menu-item") {
    return (
      <DropdownMenuItem
        role="menuitemcheckbox"
        aria-checked={isDark}
        data-ocid={ocid}
        className={cn("gap-2", className)}
        onSelect={(event) => {
          event.preventDefault();
          toggleTheme();
        }}
      >
        <Moon aria-hidden />
        <span className="flex-1">Dark mode</span>
        <ThemePill on={isDark} />
      </DropdownMenuItem>
    );
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        data-ocid={ocid}
        onClick={toggleTheme}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-2xl border border-transparent px-3 text-left text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
          className,
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Moon className="size-5" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="flex-1">Dark mode</span>
        <ThemePill on={isDark} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      data-ocid={ocid}
      onClick={toggleTheme}
      className={cn(
        "btn-3d-neutral relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
        className,
      )}
    >
      <Sun
        aria-hidden
        className={cn(
          "absolute size-[18px] text-amber-brand motion-safe:transition-all motion-safe:duration-300",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "absolute size-[18px] text-primary motion-safe:transition-all motion-safe:duration-300",
          isDark
            ? "rotate-90 scale-50 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
      />
    </button>
  );
}

/** A small decorative on/off pill (the state is the control's `aria-checked`). */
function ThemePill({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        on ? "border-primary bg-primary" : "border-input bg-well",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 size-3.5 rounded-full shadow-sm motion-safe:transition-transform",
          on ? "translate-x-4 bg-white" : "translate-x-0 bg-foreground/70",
        )}
      />
    </span>
  );
}

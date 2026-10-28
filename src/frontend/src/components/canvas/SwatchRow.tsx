import { ColorPicker } from "@/components/canvas/ColorPicker";
import { STUDIO_SWATCHES } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Whether a `#rrggbb` swatch needs a dark tick (Cloud and Sky got a white one). */
function isLightSwatch(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const luma = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 160;
}

/** Round brand-colour swatches (Canva "colour palette" style), then the full colour picker. */
export function SwatchRow({
  value,
  onChange,
  ocid,
  label,
  size = "md",
}: {
  value: string;
  onChange: (hex: string) => void;
  ocid: string;
  label: string;
  size?: "sm" | "md";
}) {
  const current = value.toLowerCase();
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={label}>
      {STUDIO_SWATCHES.map((swatch) => {
        const active = swatch.hex.toLowerCase() === current;
        const light = isLightSwatch(swatch.hex);
        return (
          <button
            key={swatch.hex}
            type="button"
            title={`${swatch.name} ${swatch.hex}`}
            aria-label={`${label}: ${swatch.name}`}
            aria-pressed={active}
            onClick={() => onChange(swatch.hex)}
            className={cn(
              "flex items-center justify-center rounded-full border shadow-[inset_0_1px_1px_rgb(255_255_255/0.25)] transition-smooth focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
              size === "sm" ? "size-6" : "size-7",
              active
                ? "border-ring ring-2 ring-ring/50 ring-offset-1 ring-offset-card"
                : "border-hairline-strong hover:scale-110",
            )}
            style={{ backgroundColor: swatch.hex }}
            data-ocid={`${ocid}.${swatch.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`}
          >
            {active && (
              <Check
                className={cn(
                  "size-3",
                  // Fixed inks: the swatch colours are the same in both
                  // themes, so the tick must not follow the theme.
                  light ? "text-neutral-900" : "text-white",
                )}
              />
            )}
          </button>
        );
      })}
      <ColorPicker
        variant="swatch"
        value={value}
        onChange={onChange}
        label={label}
        ocid={ocid}
        size={size}
      />
    </div>
  );
}

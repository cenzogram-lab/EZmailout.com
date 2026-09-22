import { STUDIO_SWATCHES } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Round brand-colour swatches (Canva "colour palette" style) plus a free picker. */
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
        const light = swatch.hex === "#ffffff" || swatch.hex === "#f4f4f4";
        return (
          <button
            key={swatch.hex}
            type="button"
            title={`${swatch.name} ${swatch.hex}`}
            aria-label={`${label}: ${swatch.name}`}
            aria-pressed={active}
            onClick={() => onChange(swatch.hex)}
            className={cn(
              "flex items-center justify-center rounded-full border transition-smooth",
              size === "sm" ? "size-6" : "size-7",
              active
                ? "border-primary ring-2 ring-primary/30"
                : "border-black/10 hover:scale-110",
            )}
            style={{ backgroundColor: swatch.hex }}
            data-ocid={`${ocid}.${swatch.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`}
          >
            {active && (
              <Check
                className={cn(
                  "size-3",
                  light || swatch.hex === "#cff3fd" || swatch.hex === "#dbefad"
                    ? "text-foreground"
                    : "text-white",
                )}
              />
            )}
          </button>
        );
      })}
      <label
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-muted-foreground/50 bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#84cc16,#06b6d4,#6366f1,#f43f5e)]",
          size === "sm" ? "size-6" : "size-7",
        )}
        title="Custom colour"
      >
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={`${label}: custom colour`}
          data-ocid={`${ocid}.custom`}
        />
      </label>
    </div>
  );
}

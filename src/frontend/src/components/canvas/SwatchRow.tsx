import { ColorPicker } from "@/components/canvas/ColorPicker";
import { STUDIO_SWATCHES } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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

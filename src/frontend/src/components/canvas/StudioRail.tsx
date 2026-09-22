import { cn } from "@/lib/utils";
import type { StudioTool } from "@/types";
import type { LucideIcon } from "lucide-react";
import { Layers, Palette, QrCode, Sparkles, Type, Upload } from "lucide-react";

export const STUDIO_TOOLS: {
  id: StudioTool;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "ai", label: "AI Studio", icon: Sparkles },
  { id: "qr", label: "QR", icon: QrCode },
  { id: "layers", label: "Layers", icon: Layers },
];

/** Canva-style vertical tool rail (horizontal strip below `lg`). */
export function StudioRail({
  active,
  onSelect,
}: {
  active: StudioTool;
  onSelect: (tool: StudioTool) => void;
}) {
  return (
    <nav
      aria-label="Studio tools"
      className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl border bg-secondary p-1.5 scrollbar-hide lg:w-[72px] lg:flex-col lg:overflow-visible lg:py-3"
      data-ocid="canvas.rail"
    >
      {STUDIO_TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.id === active;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(tool.id)}
            aria-pressed={isActive}
            className={cn(
              "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-smooth",
              isActive
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
            )}
            data-ocid={`canvas.rail.${tool.id}`}
          >
            <Icon className="size-5" />
            {tool.label}
          </button>
        );
      })}
    </nav>
  );
}

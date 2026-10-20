import { cn } from "@/lib/utils";
import type { StudioTool } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  Layers,
  LayoutTemplate,
  Palette,
  QrCode,
  Shapes,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

export const STUDIO_TOOLS: {
  id: StudioTool;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "qr", label: "QR code", icon: QrCode },
  { id: "ai", label: "AI Studio", icon: Sparkles },
];

/**
 * Canva-style vertical tool rail; a horizontal strip from `sm` to `lg` and a
 * 4 × 2 grid on phones, so no tool is cut off at the edge. Clicking the active
 * tool collapses its drawer.
 */
export function StudioRail({
  active,
  drawerOpen,
  onSelect,
}: {
  active: StudioTool;
  drawerOpen: boolean;
  onSelect: (tool: StudioTool) => void;
}) {
  const item = (tool: (typeof STUDIO_TOOLS)[number]) => {
    const Icon = tool.icon;
    const isActive = tool.id === active && drawerOpen;
    return (
      <button
        key={tool.id}
        type="button"
        onClick={() => onSelect(tool.id)}
        aria-pressed={isActive}
        className={cn(
          "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-smooth sm:min-w-[64px] sm:flex-1 sm:px-2 lg:flex-none",
          isActive
            ? "bg-card text-primary shadow-sm"
            : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
        )}
        data-ocid={`canvas.rail.${tool.id}`}
      >
        <Icon className="size-5" strokeWidth={1.75} />
        {tool.label}
      </button>
    );
  };
  return (
    <nav
      aria-label="Studio tools"
      className="grid shrink-0 grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1.5 sm:flex lg:w-[76px] lg:flex-col lg:py-3"
      data-ocid="canvas.rail"
    >
      {STUDIO_TOOLS.map(item)}
      <div className="my-1 hidden border-t border-border/60 lg:block" />
      {item({ id: "layers", label: "Layers", icon: Layers })}
    </nav>
  );
}

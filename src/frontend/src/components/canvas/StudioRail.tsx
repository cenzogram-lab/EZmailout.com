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
 * Canva-style vertical tool rail (#f6f7f9, monochrome #575859 icons); a
 * horizontal strip below `lg`. Clicking the active tool collapses its drawer.
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
          "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-smooth",
          isActive
            ? "bg-card text-primary shadow-sm"
            : "text-[#575859] hover:bg-card/70 hover:text-foreground",
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
      className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-[#f6f7f9] p-1.5 scrollbar-hide lg:w-[76px] lg:flex-col lg:overflow-visible lg:py-3"
      data-ocid="canvas.rail"
    >
      {STUDIO_TOOLS.map(item)}
      <div className="my-1 hidden border-t border-[#e5e7eb] lg:block" />
      {item({ id: "layers", label: "Layers", icon: Layers })}
    </nav>
  );
}

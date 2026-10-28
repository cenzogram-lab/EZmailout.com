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
        // `segmented-item` raises the active tool into a pill (aria-pressed);
        // the overrides turn the capsule into a stacked icon tile.
        className={cn(
          "segmented-item min-h-0 min-w-0 flex-col gap-1 whitespace-normal rounded-2xl px-1 py-2 text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:min-w-[64px] sm:flex-1 sm:px-2 lg:flex-none lg:px-0.5",
          !isActive && "hover:bg-card/70",
        )}
        data-ocid={`canvas.rail.${tool.id}`}
      >
        <Icon
          className={cn("size-5", isActive && "text-primary")}
          strokeWidth={isActive ? 2 : 1.75}
          aria-hidden
        />
        {tool.label}
      </button>
    );
  };
  return (
    <nav
      aria-label="Studio tools"
      className="grid shrink-0 grid-cols-4 gap-1 rounded-3xl border border-[color:var(--segmented-border)] bg-well p-1.5 shadow-[var(--segmented-inset)] sm:flex lg:w-[76px] lg:flex-col lg:py-2"
      data-ocid="canvas.rail"
    >
      {STUDIO_TOOLS.map(item)}
      <div className="mx-2 my-1 hidden border-t border-hairline-strong lg:block" />
      {item({ id: "layers", label: "Layers", icon: Layers })}
    </nav>
  );
}

import {
  EDGE_PADDING,
  FadingScroll,
  barCollisionPadding,
} from "@/components/canvas/popoverBounds";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STUDIO_SWATCHES } from "@/lib/brand";
import {
  hexToHsv,
  hsvToHex,
  paletteGrid,
  parseColor,
  searchColors,
} from "@/lib/color";
import { isShapeUrl, shapeFillOf } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { Check, Pipette, Plus, Search } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const GRID = paletteGrid();

/** Readable check mark on a swatch of `hex`. */
function checkInk(hex: string): string {
  const { s, v } = hexToHsv(hex);
  return v > 0.75 && s < 0.45 ? "#111111" : "#ffffff";
}

function Swatch({
  hex,
  active,
  label,
  onPick,
  className,
  ocid,
}: {
  hex: string;
  active: boolean;
  label: string;
  onPick: (hex: string) => void;
  className?: string;
  ocid?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={() => onPick(hex)}
      className={cn(
        "flex items-center justify-center border border-hairline-strong transition-transform hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-ring ring-offset-1 ring-offset-popover",
        className,
      )}
      style={{ backgroundColor: hex }}
      data-ocid={ocid}
    >
      {active && <Check className="size-3" style={{ color: checkInk(hex) }} />}
    </button>
  );
}

/** Every colour already on the design, both sides, most used first. */
function useDocumentColors(): string[] {
  const canvas = useWizardStore((s) => s.canvas);
  return useMemo(() => {
    const counts = new Map<string, number>();
    const add = (c: string | undefined) => {
      const hex = c ? parseColor(c) : null;
      if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
    };
    for (const side of [canvas.front, canvas.back]) {
      add(side.backgroundColor);
      for (const t of side.textBlocks) add(t.color);
      for (const l of side.logos)
        if (isShapeUrl(l.url)) add(shapeFillOf(l.url));
      for (const q of side.qrCodes) {
        add(q.foreground);
        add(q.background);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex)
      .slice(0, 16);
  }, [canvas]);
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/**
 * The full colour picker: type or search any colour, drag on the spectrum,
 * or pick from the design's colours, the brand palette and the colour chart.
 * Changes apply live, so the canvas previews every move.
 */
export function ColorPanel({
  value,
  onChange,
  label,
  ocid,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  ocid: string;
}) {
  const current = parseColor(value) ?? "#000000";
  const [hsv, setHsv] = useState(() => hexToHsv(current));
  const [query, setQuery] = useState("");
  const [hexDraft, setHexDraft] = useState(current);
  const last = useRef(current);
  const docColors = useDocumentColors();

  // Follow outside changes (another control, undo) without losing the hue
  // of a grey we produced ourselves.
  useEffect(() => {
    if (current !== last.current) {
      last.current = current;
      setHsv(hexToHsv(current));
      setHexDraft(current);
    }
  }, [current]);

  const emit = (hex: string, next = hexToHsv(hex)) => {
    last.current = hex;
    setHsv(next);
    setHexDraft(hex);
    onChange(hex);
  };
  const emitHsv = (next: { h: number; s: number; v: number }) =>
    emit(hsvToHex(next.h, next.s, next.v), next);

  const parsed = parseColor(query);
  const matches = useMemo(() => searchColors(query, 24), [query]);

  // Saturation / brightness field
  const field = useRef<HTMLDivElement>(null);
  const fromField = (e: PointerEvent<HTMLDivElement>) => {
    const r = field.current?.getBoundingClientRect();
    if (!r) return;
    const s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    emitHsv({ h: hsv.h, s, v });
  };
  const fieldKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    emitHsv({
      h: hsv.h,
      s: Math.min(1, Math.max(0, hsv.s + d[0])),
      v: Math.min(1, Math.max(0, hsv.v + d[1])),
    });
  };

  // Hue spectrum
  const hueBar = useRef<HTMLDivElement>(null);
  const fromHue = (e: PointerEvent<HTMLDivElement>) => {
    const r = hueBar.current?.getBoundingClientRect();
    if (!r) return;
    const h = Math.min(
      359.9,
      Math.max(0, ((e.clientX - r.left) / r.width) * 360),
    );
    emitHsv({ ...hsv, h, s: hsv.s || 1, v: hsv.v || 1 });
  };
  const hueKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30 : 5;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const h = (hsv.h + (e.key === "ArrowRight" ? step : -step) + 360) % 360;
    emitHsv({ ...hsv, h });
  };

  const drag = (move: (e: PointerEvent<HTMLDivElement>) => void) => ({
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      move(e);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
    },
  });

  const EyeDropper =
    typeof window !== "undefined"
      ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
      : undefined;

  const section = (title: string) => (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
  );

  return (
    <div className="space-y-3" data-ocid={`${ocid}.panel`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const pick = parsed ?? matches[0]?.hex;
            if (pick) emit(pick);
          }}
          placeholder="Search or type a colour"
          className="h-9 rounded-full pl-8 text-sm"
          aria-label={`${label}: search or type a colour`}
          data-ocid={`${ocid}.search`}
        />
      </div>

      {query.trim() ? (
        <div className="space-y-2" data-ocid={`${ocid}.results`}>
          {parsed && (
            <button
              type="button"
              onClick={() => emit(parsed)}
              className="flex w-full items-center gap-2 rounded-xl border border-hairline-strong bg-card-raised px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
              data-ocid={`${ocid}.use_typed`}
            >
              <span
                className="size-6 shrink-0 rounded-md border border-hairline-strong"
                style={{ backgroundColor: parsed }}
              />
              Use <span className="font-mono">{parsed}</span>
            </button>
          )}
          {matches.length > 0 ? (
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto">
              {matches.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => emit(m.hex)}
                  className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
                  title={`${m.name} ${m.hex}`}
                >
                  <span
                    className="size-5 shrink-0 rounded-md border border-hairline-strong"
                    style={{ backgroundColor: m.hex }}
                  />
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          ) : (
            !parsed && (
              <p className="px-1 text-xs text-muted-foreground">
                No colour called “{query.trim()}”. Try a name like “navy”, a hex
                code like #1d4ed8, or rgb(29, 78, 216).
              </p>
            )
          )}
        </div>
      ) : (
        <>
          <div
            ref={field}
            role="slider"
            tabIndex={0}
            aria-label={`${label}: saturation and brightness`}
            aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.s * 100)}
            className="relative h-32 cursor-crosshair touch-none rounded-xl border border-hairline-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
            style={{
              backgroundColor: hsvToHex(hsv.h, 1, 1),
              backgroundImage:
                "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
            onKeyDown={fieldKeys}
            {...drag(fromField)}
            data-ocid={`${ocid}.spectrum`}
          >
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: current,
              }}
            />
          </div>
          <div
            ref={hueBar}
            role="slider"
            tabIndex={0}
            aria-label={`${label}: hue`}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            className="relative h-3.5 cursor-pointer touch-none rounded-full border border-hairline-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
            style={{
              background:
                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
            }}
            onKeyDown={hueKeys}
            {...drag(fromHue)}
            data-ocid={`${ocid}.hue`}
          >
            <span
              className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: hsvToHex(hsv.h, 1, 1),
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="size-8 shrink-0 rounded-xl border border-hairline-strong shadow-[inset_0_1px_1px_rgb(255_255_255/0.25)]"
              style={{ backgroundColor: current }}
            />
            <Input
              value={hexDraft}
              onChange={(e) => {
                setHexDraft(e.target.value);
                const hex = parseColor(e.target.value);
                if (hex) emit(hex);
              }}
              onBlur={() => setHexDraft(current)}
              className="h-8 font-mono text-sm"
              aria-label={`${label}: hex code`}
              spellCheck={false}
              data-ocid={`${ocid}.hex`}
            />
            {EyeDropper && (
              <button
                type="button"
                title="Pick a colour from the screen"
                aria-label="Pick a colour from the screen"
                className="btn-3d-neutral flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                onClick={async () => {
                  try {
                    const r = await new EyeDropper().open();
                    const hex = parseColor(r.sRGBHex);
                    if (hex) emit(hex);
                  } catch {
                    // Cancelled.
                  }
                }}
              >
                <Pipette className="size-4" />
              </button>
            )}
          </div>
          {docColors.length > 0 && (
            <div>
              {section("Document colours")}
              <div className="flex flex-wrap gap-1.5">
                {docColors.map((hex) => (
                  <Swatch
                    key={hex}
                    hex={hex}
                    active={hex === current}
                    label={`${label}: ${hex}`}
                    onPick={emit}
                    className="size-6 rounded-full"
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            {section("Brand colours")}
            <div className="flex flex-wrap gap-1.5">
              {STUDIO_SWATCHES.map((s) => (
                <Swatch
                  key={s.hex}
                  hex={s.hex}
                  active={s.hex.toLowerCase() === current}
                  label={`${label}: ${s.name} ${s.hex}`}
                  onPick={emit}
                  className="size-6 rounded-full"
                />
              ))}
            </div>
          </div>
          <div>
            {section("All colours")}
            <div
              className="grid grid-cols-12 overflow-hidden rounded-xl border border-hairline-strong"
              data-ocid={`${ocid}.grid`}
            >
              {GRID.flat().map((hex, i) => (
                <Swatch
                  // biome-ignore lint/suspicious/noArrayIndexKey: the grid is fixed; greys can repeat a hex.
                  key={i}
                  hex={hex}
                  active={hex === current}
                  label={`${label}: ${hex}`}
                  onPick={emit}
                  className="aspect-square w-full rounded-none border-0"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A colour control that opens `ColorPanel` in a popover. `variant="swatch"`
 * is the round rainbow "more colours" button at the end of a swatch row;
 * `variant="field"` shows the current colour and its hex code.
 */
export function ColorPicker({
  value,
  onChange,
  label,
  ocid,
  variant = "field",
  size = "md",
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  ocid: string;
  variant?: "swatch" | "field";
  size?: "sm" | "md";
  className?: string;
}) {
  const hex = parseColor(value);
  // Kept between the header pill and the phone dock (measured on open), so a
  // popover that flips upward never covers the nav or Launch campaign.
  const [padding, setPadding] = useState(EDGE_PADDING);
  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setPadding(barCollisionPadding());
      }}
    >
      <PopoverTrigger asChild>
        {variant === "swatch" ? (
          <button
            type="button"
            title="More colours"
            aria-label={`${label}: more colours`}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] shadow-[inset_0_1px_1px_rgb(255_255_255/0.4)] transition-smooth hover:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
              size === "sm" ? "size-6" : "size-7",
              className,
            )}
            data-ocid={`${ocid}.custom`}
          >
            <span className="flex size-3.5 items-center justify-center rounded-full bg-white/90">
              {/* Fixed dark ink: the disc is white in both themes. */}
              <Plus className="size-2.5 text-neutral-900" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={`${label}: ${hex ?? value}`}
            className={cn(
              "flex h-8 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-2 text-left text-xs shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-well",
              className,
            )}
            data-ocid={ocid}
          >
            <span
              className="size-5 shrink-0 rounded-md border border-hairline-strong"
              style={{ backgroundColor: hex ?? "#ffffff" }}
            />
            <span className="truncate font-mono tracking-wider">
              {hex ?? value}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={padding}
        className="flex max-h-[min(34rem,var(--radix-popover-content-available-height))] w-[min(19rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-ocid={`${ocid}.popover`}
      >
        {/* Fades its bottom edge while more of the panel is below, so a
            popover cut short by the screen shows that it scrolls. */}
        <FadingScroll className="min-h-0 flex-1 p-3">
          <ColorPanel
            value={value}
            onChange={onChange}
            label={label}
            ocid={ocid}
          />
        </FadingScroll>
      </PopoverContent>
    </Popover>
  );
}

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FONT_CATALOG,
  FONT_CATEGORIES,
  type FontCategory,
  fontStack,
} from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * A font name set in its own face once the row is near the visible part of
 * the list, so opening the picker does not download every typeface.
 */
function FontName({
  family,
  root,
}: { family: string; root: HTMLElement | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { root, rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root, seen]);
  return (
    <span
      ref={ref}
      className="truncate text-[15px]"
      style={seen ? { fontFamily: fontStack(family) } : undefined}
    >
      {family}
    </span>
  );
}

/** Searchable typeface picker, grouped by category, each name in its face. */
export function FontPicker({
  value,
  onChange,
  ocid,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (family: string) => void;
  ocid: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return FONT_CATALOG.filter(
      (f) =>
        (category === "All" || f.category === category) &&
        words.every((w) =>
          `${f.family} ${f.category}`.toLowerCase().includes(w),
        ),
    );
  }, [query, category]);

  const pick = (family: string) => {
    onChange(family);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-label={`Font: ${value}`}
          data-ocid={ocid}
        >
          <span className="truncate" style={{ fontFamily: fontStack(value) }}>
            {value}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="flex max-h-[min(30rem,var(--radix-popover-content-available-height))] w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-2xl p-2"
        data-ocid={`${ocid}.popover`}
      >
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) =>
                  Math.min(
                    results.length - 1,
                    Math.max(0, c + (e.key === "ArrowDown" ? 1 : -1)),
                  ),
                );
              } else if (e.key === "Enter" && results[cursor]) {
                e.preventDefault();
                pick(results[cursor].family);
              }
            }}
            placeholder={`Search ${FONT_CATALOG.length} fonts`}
            className="h-9 w-full rounded-full border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Search fonts"
            data-ocid={`${ocid}.search`}
          />
        </div>
        <div className="-mx-0.5 flex shrink-0 gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {(["All", ...FONT_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setCursor(0);
              }}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium",
                c === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-pressed={c === category}
              data-ocid={`${ocid}.category.${c.toLowerCase().replace(/\s+/g, "_")}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div
          ref={setList}
          aria-label="Fonts"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {results.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No font matches “{query}”.
            </p>
          )}
          {results.map((f, i) => {
            const active = f.family === value;
            const header = i === 0 || results[i - 1].category !== f.category;
            return (
              <div key={f.family}>
                {header && category === "All" && (
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {f.category}
                    {f.category === "System" && " · depends on the device"}
                  </p>
                )}
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(f.family)}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left",
                    i === cursor ? "bg-muted" : "hover:bg-muted",
                  )}
                  data-ocid={`${ocid}.option.${f.family.toLowerCase().replace(/\s+/g, "_")}`}
                >
                  <FontName family={f.family} root={list} />
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          // Sunken well outlined in the 3:1 field-border colour, so the
          // whole range stays visible on any surface in both themes.
          "bg-well shadow-[inset_0_0_0_1px_oklch(var(--input)),inset_0_1px_2px_rgb(0_0_0/0.18)] relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary bg-gradient-to-b from-[#7577f5] to-[#4338ca] dark:from-[#8b8dfa] dark:to-[#5c5ee8] absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (value, _) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={`${value}`}
          className="border-primary bg-white ring-ring/50 relative block size-5 shrink-0 rounded-full border-2 shadow-[0_2px_6px_rgb(0_0_0/0.3),inset_0_-2px_0_rgb(0_0_0/0.06)] after:absolute after:-inset-3 after:rounded-full after:content-[''] transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:ring-ring/80 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };

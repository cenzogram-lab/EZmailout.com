"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-well relative h-2 w-full overflow-hidden rounded-full shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)]",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-primary bg-gradient-to-b from-[#7577f5] via-[#4f46e5] to-[#4338ca] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_0_10px_rgb(99_102_241/0.45)] transition-all motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

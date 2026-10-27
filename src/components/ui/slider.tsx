import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** Accessible name for the thumb (the element with role="slider"). */
  thumbLabel?: string;
  /** Human-readable value, e.g. "1:05 of 3:20". */
  valueText?: string;
};

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabel, valueText, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "group/slider relative flex w-full touch-none select-none items-center py-1.5 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-foreground/15">
        <SliderPrimitive.Range className="absolute h-full bg-foreground transition-colors group-hover/slider:bg-primary group-focus-within/slider:bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        aria-valuetext={valueText}
        className="block size-3 rounded-full bg-foreground opacity-0 shadow-glow-sm transition-opacity group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none"
      />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

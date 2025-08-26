// components/ui/slider.tsx
"use client";

import * as React from "react";
import * as RSlider from "@radix-ui/react-slider";
import { cn } from "./utils";

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof RSlider.Root> {}

export function Slider({ className, ...props }: SliderProps) {
  return (
    <RSlider.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <RSlider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-accent">
        <RSlider.Range className="absolute h-full bg-primary" />
      </RSlider.Track>
      <RSlider.Thumb className="block size-4 rounded-full border border-border bg-card shadow" />
      <RSlider.Thumb className="block size-4 rounded-full border border-border bg-card shadow" />
    </RSlider.Root>
  );
}

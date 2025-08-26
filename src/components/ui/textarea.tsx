// components/ui/textarea.tsx
import * as React from "react";
import { cn } from "./utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
      "focus-visible:outline-none focus-visible:ring-2",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// File: components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[110px] w-full rounded-xl border border-input bg-white/90 px-3.5 py-2.5 text-sm shadow-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export default Textarea;

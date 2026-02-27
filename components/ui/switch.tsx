// File: components/ui/switch.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Minimal shadcn-compatible Switch
 * Usage:
 *  <Switch checked={on} onCheckedChange={setOn} id="twofa" />
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = typeof checked === "boolean";
    const [internal, setInternal] = React.useState<boolean>(
      defaultChecked ?? false
    );

    const on = isControlled ? (checked as boolean) : internal;

    const toggle = () => {
      if (disabled) return;
      const next = !on;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={disabled || undefined}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors",
          on
            ? "bg-emerald-500/90 border-emerald-600"
            : "bg-slate-200 border-slate-300",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-105",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 translate-x-0.5 transform rounded-full bg-white shadow transition",
            on ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

"use client";

import { forwardRef } from "react";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";

export interface SlugInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}

export const SlugInput = forwardRef<HTMLInputElement, SlugInputProps>(
  function SlugInput(
    { value, onChange, onBlur, className, mono = true, ...props },
    ref,
  ) {
    return (
      <input
        ref={ref}
        type="text"
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text outline-none focus:border-[var(--accent)]",
          mono && "font-mono",
          className,
        )}
        value={value}
        onChange={(e) => {
          onChange(formatSlugInput(e.target.value));
        }}
        onBlur={(e) => {
          const finalVal = finalizeSlug(e.target.value);
          if (finalVal !== value) {
            onChange(finalVal);
          }
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

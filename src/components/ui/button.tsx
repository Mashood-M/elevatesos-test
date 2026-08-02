import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "magenta" | "green" | "orange" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--charcoal-900)] text-white hover:bg-[var(--charcoal-800)] shadow-[var(--shadow-sm)]",
  magenta: "bg-[var(--secondary)] text-white hover:opacity-90",
  green: "bg-[var(--success)] text-white hover:opacity-90",
  orange:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[var(--shadow-sm)]",
  ghost: "bg-bg text-text hover:bg-bg-hover",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

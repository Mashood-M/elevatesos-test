import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "magenta" | "green" | "orange" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--charcoal-900)] text-white hover:bg-[var(--charcoal-800)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-bg-panel text-text border border-border hover:bg-bg-page hover:border-border-hover shadow-[var(--shadow-sm)]",
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
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}) {
  const sizeStyles = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-[13px]",
    lg: "h-12 px-6 text-sm",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40",
        sizeStyles[size],
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

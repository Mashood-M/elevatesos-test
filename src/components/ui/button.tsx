import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "magenta" | "green" | "orange" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-[var(--charcoal-900)] text-white hover:bg-[var(--charcoal-800)]",
  magenta: "bg-[var(--secondary)] text-white hover:opacity-90",
  green: "bg-[var(--success)] text-white hover:opacity-90",
  orange: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
  ghost:
    "bg-transparent text-text border border-[var(--border-strong)] hover:bg-bg-hover",
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
        "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3.5 text-[13px] font-semibold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

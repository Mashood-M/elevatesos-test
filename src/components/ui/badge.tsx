import { cn } from "@/lib/utils";

const tones = {
  cyan: "bg-[var(--accent-soft)] text-[var(--accent-hover)]",
  magenta: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
  green: "bg-[var(--success-soft)] text-[var(--success)]",
  orange: "bg-[var(--accent-soft)] text-[var(--accent-hover)]",
  mute: "bg-bg-hover text-text-dim",
};

export function Badge({
  children,
  tone = "cyan",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-semibold capitalize",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

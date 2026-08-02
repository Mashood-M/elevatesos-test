import { cn } from "@/lib/utils";

const tones = {
  cyan: "bg-[var(--accent-soft)] text-[var(--accent-hover)]",
  magenta: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
  green: "bg-[var(--success-soft)] text-[var(--success)]",
  orange: "bg-[var(--accent-soft)] text-[var(--accent-hover)]",
  mute: "bg-bg text-text-mute",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[-0.01em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

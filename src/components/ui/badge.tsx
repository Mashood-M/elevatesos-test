import { cn } from "@/lib/utils";

const tones = {
  cyan: "bg-[var(--accent-soft)] text-[var(--accent)]",
  magenta: "bg-bg text-text-dim border border-border/70",
  green: "bg-bg text-text font-medium border border-border/70",
  orange: "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold",
  amber: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
  mute: "bg-bg text-text-dim border border-border/70",
};

export function Badge({
  children,
  tone = "mute",
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
        tones[tone] ?? tones.mute,
        className,
      )}
    >
      {children}
    </span>
  );
}

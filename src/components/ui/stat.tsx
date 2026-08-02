import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "cyan" | "magenta" | "green" | "orange";
}) {
  const highlight = accent === "orange" || accent === "cyan";

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] p-5 shadow-[var(--shadow)]",
        highlight
          ? "bg-[var(--accent)] text-white"
          : "bg-bg-panel text-text",
      )}
    >
      <p
        className={cn(
          "text-[12px] font-medium",
          highlight ? "text-white/80" : "text-text-mute",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-[family-name:var(--font-display)] text-[1.875rem] font-extrabold tracking-[-0.04em] tabular-nums",
          highlight ? "text-white" : "text-text",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-1.5 text-[12px]",
            highlight ? "text-white/70" : "text-text-mute",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "cyan" | "magenta" | "green" | "orange";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-panel p-4">
      <p className="text-[12px] font-medium text-text-mute">{label}</p>
      <p className="mt-1.5 font-[family-name:var(--font-display)] text-[1.75rem] font-bold tracking-[-0.03em] text-text tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-text-mute">{hint}</p> : null}
    </div>
  );
}

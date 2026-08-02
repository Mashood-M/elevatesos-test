export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
  accent?: "cyan" | "magenta" | "green" | "orange";
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[12px]">
        <span className="text-text-mute">{label ?? "Progress"}</span>
        <span className="font-semibold tabular-nums text-text">
          {Math.round(value)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

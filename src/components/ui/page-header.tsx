import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) {
  const cleanEyebrow = eyebrow
    ?.replace(/^\/\/\s*/, "")
    .replace(/\./g, " · ")
    .trim();

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {cleanEyebrow ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-[var(--accent)] border border-[var(--accent)]/15">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span className="uppercase">{cleanEyebrow}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-text sm:text-[2.25rem]">
            {title}
          </h1>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {description ? (
          <div className="mt-1.5 text-[13.5px] leading-relaxed text-text-dim">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="max-w-full overflow-x-auto">
          <div className="flex shrink-0 flex-nowrap items-center gap-2.5 pb-0.5">
            {actions}
          </div>
        </div>
      ) : null}
    </div>
  );
}

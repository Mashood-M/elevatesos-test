import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  // Avoid AI "eyebrow on every section" — only show if meaningful, sentence case
  const label = eyebrow
    ?.replace(/^\/\/\s*/, "")
    .replace(/\./g, " · ")
    .toLowerCase();

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {label ? (
          <p className="mb-1.5 text-[12px] font-medium text-[var(--accent)]">
            {label}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-[1.15] tracking-[-0.03em] text-text sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-[14px] leading-relaxed text-text-dim">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

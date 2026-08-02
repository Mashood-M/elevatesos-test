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
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const label = eyebrow
    ?.replace(/^\/\/\s*/, "")
    .replace(/\./g, " · ")
    .toLowerCase();

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {label ? (
          <p className="mb-2 text-[12px] font-medium text-[var(--accent)]">
            {label}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-text sm:text-[2.25rem]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-text-dim">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

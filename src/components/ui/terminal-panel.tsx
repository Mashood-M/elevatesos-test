import { cn } from "@/lib/utils";

export function TerminalPanel({
  title,
  meta,
  children,
  className,
  accent: _accent = "cyan",
  action,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "cyan" | "magenta" | "green" | "orange";
  action?: React.ReactNode;
}) {
  void _accent;
  const cleanTitle = title
    .replace(/^[./]+/, "")
    .replace(/\./g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section
      className={cn(
        "rounded-[var(--radius)] border border-border bg-bg-panel p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.02em] text-text">
            {cleanTitle}
          </h2>
          {meta ? (
            <p className="mt-0.5 text-[12px] text-text-mute">{meta}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

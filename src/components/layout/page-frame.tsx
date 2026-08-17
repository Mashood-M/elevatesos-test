import { cn } from "@/lib/utils";

export function PageFrame({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        wide ? "max-w-[var(--content-max)]" : "max-w-[1280px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4", className)}
    >
      {children}
    </div>
  );
}

export function SplitLayout({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        {side}
      </aside>
    </div>
  );
}

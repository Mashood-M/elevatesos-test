import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-only skeleton for pages already wrapped inside AppShell.
 */
export function ContentSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg max-w-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[20px] bg-surface p-5 border border-border/60 shadow-[var(--shadow)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Data List / Table Card */}
        <div className="lg:col-span-2 rounded-[22px] bg-surface p-6 border border-border/60 shadow-[var(--shadow)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>

          <div className="divide-y divide-border/40">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-44 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Column Card */}
        <div className="rounded-[22px] bg-surface p-6 border border-border/60 shadow-[var(--shadow)] space-y-4">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((card) => (
              <div key={card} className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen Workspace Skeleton matching Elevates OS Finexy-light layout:
 * - Structural sidebar rail (248px)
 * - Sticky top bar with search and profile chips
 * - Floating white cards with 18-22px border radius on soft gray canvas
 */
export function WorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-background text-text flex">
      {/* Structural Left Sidebar Rail (248px) */}
      <aside
        className="hidden md:flex w-[248px] shrink-0 border-r border-border bg-surface flex-col h-screen sticky top-0 select-none"
        aria-hidden="true"
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-border/60">
          <div className="h-9 w-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] font-bold text-base">
            E
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>

        {/* Navigation Shimmer Links */}
        <div className="p-3 flex-1 space-y-6 overflow-y-auto">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded mb-2 mx-3" />
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/[0.03]">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14 rounded mb-2 mx-3" />
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          </div>
        </div>

        {/* User Profile Footer Pill */}
        <div className="p-3 border-t border-border/60">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-background/60 border border-border/40">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1 min-w-0 flex-1">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-2.5 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Bar */}
        <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Icon Placeholder */}
            <Skeleton className="h-8 w-8 rounded-lg md:hidden" />
            {/* Search Pill */}
            <div className="hidden sm:flex items-center gap-2 h-9 w-64 lg:w-80 rounded-full border border-border/60 bg-background/60 px-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-28 rounded-full hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto">
          <ContentSkeleton />
        </main>
      </div>
    </div>
  );
}

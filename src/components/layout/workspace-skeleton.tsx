"use client";

import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Folder,
  Calendar,
  QrCode,
  FileText,
  Trophy,
  Users,
} from "lucide-react";

export type SkeletonPageType =
  | "projects"
  | "events"
  | "attendance"
  | "reports"
  | "forms"
  | "leaderboard"
  | "dashboard"
  | "generic";

/**
 * 1. PROJECTS PAGE SKELETON
 * Minimalist, refined light ERP skeleton matching the newly redesigned Projects Directory.
 * Pure light surfaces, no dark/black colors or heavy backgrounds.
 */
export function ProjectsSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Folder size={20} className="opacity-40" />
            </div>
            <Skeleton className="h-7 w-60 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-80 rounded-lg max-w-full" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-9 w-28 rounded-xl hidden sm:block" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Metric Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-2.5 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Minimalist Toolbar: Search and View Switcher on Right */}
      <div className="flex items-center justify-end gap-2.5">
        <Skeleton className="h-9.5 w-64 sm:w-72 rounded-full" />
        <Skeleton className="h-8.5 w-24 rounded-xl shrink-0" />
      </div>

      {/* 6 Minimalist Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4.5 w-20 rounded-md" />
              <Skeleton className="h-4.5 w-14 rounded-md" />
            </div>

            <Skeleton className="h-5 w-44 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-2.5 w-8 rounded" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>

            <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex -space-x-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. EVENTS PAGE SKELETON
 * Minimalist, refined light ERP skeleton matching the Events catalog and workshops.
 * Pure light surfaces, clean airy banner, absolutely no dark/black boxes.
 */
export function EventsSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Calendar size={20} className="opacity-40" />
            </div>
            <Skeleton className="h-7 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-72 rounded-lg max-w-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-8 w-20 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      {/* 6 Minimalist Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[22px] border border-neutral-200/80 bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3 pb-4"
          >
            {/* Event Poster / Banner Shimmer - Soft light neutral, NO dark/black color! */}
            <div className="relative h-40 w-full bg-neutral-100/80 flex items-center justify-center">
              <Calendar size={26} className="text-neutral-300 opacity-40 animate-pulse" />
              <div className="absolute top-3 left-3">
                <Skeleton className="h-5 w-20 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4.5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-4/5 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </div>

              <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-7 w-20 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. ATTENDANCE & CHECK-IN SKELETON
 * Minimalist dual-pane QR scanner + live check-in attendee stream.
 */
export function AttendanceSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <QrCode size={20} className="opacity-40" />
            </div>
            <Skeleton className="h-7 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-2.5 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Dual Pane Layout: Scanner on Left, Roster on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QR Box */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-neutral-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>
          <div className="h-72 w-full rounded-2xl bg-neutral-50/80 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-3">
            <QrCode size={34} className="text-neutral-300 opacity-40 animate-pulse" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-1/2 rounded-xl" />
            <Skeleton className="h-9 w-1/2 rounded-xl" />
          </div>
        </div>

        {/* Live Attendee Stream */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-neutral-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-8 w-44 rounded-xl" />
          </div>
          <div className="divide-y divide-neutral-100">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. REPORTS PAGE SKELETON
 * Minimalist document-editor and chapter reporting views.
 */
export function ReportsSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <FileText size={20} className="opacity-40" />
            </div>
            <Skeleton className="h-7 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Reports Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4.5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-5 w-5 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-14 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Report Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white border border-neutral-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center">
                  <FileText size={20} className="opacity-40" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4.5 w-40 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-5 w-18 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-18 rounded-lg" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 5. LEADERBOARD & DIRECTORY SKELETON
 * Minimalist rankings and student directory skeleton.
 */
export function LeaderboardSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Trophy size={20} className="opacity-40" />
            </div>
            <Skeleton className="h-7 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[2, 1, 3].map((rank) => (
          <div
            key={rank}
            className="rounded-2xl border border-neutral-200/80 p-5 bg-white shadow-xs space-y-3 text-center flex flex-col items-center"
          >
            <div className="relative">
              <Skeleton className="h-14 w-14 rounded-full mx-auto" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold font-mono">
                #{rank}
              </div>
            </div>
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl bg-white border border-neutral-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-8 w-44 rounded-xl" />
        </div>
        <div className="divide-y divide-neutral-100">
          {[4, 5, 6, 7, 8, 9].map((rank) => (
            <div key={rank} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="font-mono text-xs text-neutral-400 w-6">#{rank}</span>
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="h-4 w-14 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full font-mono" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 6. DASHBOARD & CHAPTER OVERVIEW SKELETON
 * Minimalist chapter portal landing and executive desks.
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Hero Welcome Banner */}
      <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <Skeleton className="h-7 w-64 rounded-xl" />
          <Skeleton className="h-3.5 w-80 rounded-lg max-w-full" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 border border-neutral-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-xl" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-2.5 w-28 rounded-md" />
          </div>
        ))}
      </div>

      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 border border-neutral-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="divide-y divide-neutral-100">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-2.5 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-neutral-200/70 shadow-xs space-y-4">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((card) => (
              <div key={card} className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-2">
                <Skeleton className="h-3.5 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SMART ADAPTIVE SKELETON
 * Detects the target route pathname and automatically renders the appropriate
 * layout skeleton (Projects, Events, Attendance, Reports, Leaderboards, etc.).
 */
export function AdaptiveSkeleton({ type }: { type?: SkeletonPageType }) {
  const pathname = usePathname() || "";

  if (type) {
    switch (type) {
      case "projects":
        return <ProjectsSkeleton />;
      case "events":
        return <EventsSkeleton />;
      case "attendance":
        return <AttendanceSkeleton />;
      case "reports":
        return <ReportsSkeleton />;
      case "leaderboard":
        return <LeaderboardSkeleton />;
      case "dashboard":
        return <DashboardSkeleton />;
      default:
        return <DashboardSkeleton />;
    }
  }

  // Automatic pathname-based adaptation
  if (pathname.includes("/projects")) {
    return <ProjectsSkeleton />;
  }
  if (pathname.includes("/attendance")) {
    return <AttendanceSkeleton />;
  }
  if (pathname.includes("/events")) {
    return <EventsSkeleton />;
  }
  if (pathname.includes("/reports")) {
    return <ReportsSkeleton />;
  }
  if (
    pathname.includes("/leaderboards") ||
    pathname.includes("/students") ||
    pathname.includes("/classes") ||
    pathname.includes("/users")
  ) {
    return <LeaderboardSkeleton />;
  }
  if (pathname.includes("/hq") || pathname.includes("/executive") || pathname.includes("/faculty")) {
    return <DashboardSkeleton />;
  }

  return <DashboardSkeleton />;
}

/**
 * Content-only skeleton for pages already wrapped inside AppShell.
 * Automatically adapts to the active route or type override.
 */
export function ContentSkeleton({ type }: { type?: SkeletonPageType }) {
  return <AdaptiveSkeleton type={type} />;
}

/**
 * Full-screen Workspace Skeleton with Sidebar Rail.
 * Used during cold authentication boots or outer route gates.
 */
export function WorkspaceSkeleton({ type }: { type?: SkeletonPageType }) {
  return (
    <div
      className="h-dvh bg-bg lg:grid overflow-hidden"
      style={{ gridTemplateColumns: "var(--rail-width) minmax(0, 1fr)" }}
    >
      {/* Structural Left Sidebar Rail (248px) */}
      <aside
        className="hidden lg:flex w-[var(--rail-width)] shrink-0 border-r border-[var(--rail-border)] bg-[var(--rail)] flex-col h-dvh select-none"
        aria-hidden="true"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--rail-border)] pb-4 pt-5"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent)] font-[family-name:var(--font-display)] text-[15px] font-extrabold text-white shadow-[var(--shadow-sm)]">
              E
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>

        <div
          className="p-3 flex-1 space-y-6 overflow-y-auto"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded mb-2 mx-3" />
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-100/70">
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
          </div>
        </div>

        <div
          className="shrink-0 space-y-3 border-t border-[var(--rail-border)] py-4"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          <div className="flex items-center gap-3 p-2 rounded-xl bg-bg border border-border">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1 min-w-0 flex-1">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-2.5 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
        <header
          className="border-b border-[var(--rail-border)] bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-10"
          style={{ height: "var(--header-height)" }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg lg:hidden" />
            <div className="hidden sm:flex items-center gap-2 h-10 w-64 lg:w-80 rounded-full bg-bg px-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-28 rounded-full hidden sm:block" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <AdaptiveSkeleton type={type} />
        </main>
      </div>
    </div>
  );
}

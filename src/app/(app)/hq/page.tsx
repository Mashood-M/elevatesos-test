"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Users,
  Calendar,
  FileText,
  Activity,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useStore, useCurrentUser } from "@/context/store-context";
import { calculateChapterActivityScore, chapterMetricsFromStore } from "@/lib/analytics";
import { formatDateTime, initials } from "@/lib/utils";

export default function HqDashboardPage() {
  const { store } = useStore();
  const { profile, session } = useCurrentUser();
  const firstName = profile?.fullName?.split(" ")[0] ?? "Founder";

  const members = store.profiles.filter((p) => p.chapterId).length;
  const activeChapters = store.chapters.filter((c) => c.status === "active");
  const onboardingChapters = store.chapters.filter(
    (c) => c.status === "onboarding",
  );
  const activeEvents = store.events.filter((e) =>
    ["registration_open", "approved"].includes(e.status),
  ).length;
  const pendingReports = store.reports.filter((r) => r.status === "submitted");
  const unreadAlerts = store.notifications.filter(
    (n) => n.userId === session.userId && !n.read,
  ).length;

  const chapterMetrics = useMemo(
    () => chapterMetricsFromStore(store),
    [store],
  );
  const metricsById = useMemo(() => {
    const map = new Map(chapterMetrics.map((m) => [m.id, m]));
    return map;
  }, [chapterMetrics]);

  const chaptersByHealth = useMemo(
    () =>
      [...store.chapters].sort(
        (a, b) =>
          calculateChapterActivityScore(store, b.id) -
          calculateChapterActivityScore(store, a.id),
      ),
    [store],
  );

  const campusLeads = useMemo(() => {
    const activeTerms = store.leadershipTerms.filter(
      (t) => t.status === "active",
    );
    const rows: {
      id: string;
      chapterName: string;
      userName: string;
      title: string;
      userId: string;
    }[] = [];
    for (const term of activeTerms) {
      const chapter = store.chapters.find((c) => c.id === term.chapterId);
      const lead = store.leadershipAssignments.find(
        (a) => a.termId === term.id && a.roleKey === "chairman",
      );
      if (!chapter || !lead) continue;
      const user = store.profiles.find((p) => p.id === lead.userId);
      rows.push({
        id: lead.id,
        chapterName: chapter.name,
        userName: user?.fullName ?? lead.userId,
        title: lead.title || "Campus Lead",
        userId: lead.userId,
      });
    }
    return rows.slice(0, 5);
  }, [store.leadershipTerms, store.leadershipAssignments, store.chapters, store.profiles]);

  const recentActivity = useMemo(
    () =>
      [...store.activityLogs]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [store.activityLogs],
  );

  const onboardingCount = onboardingChapters.length;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. ARCHITECTURAL HERO BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                HQ EXECUTIVE COMMAND // SYSTEM
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                Cross-Campus Network Operating System
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Executive Console, {firstName}.
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              High-level network health, chapter operational metrics, leader appointments, and formal audit reviews across all regional campus chapters.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Link href="/hq/chapters">
              <button
                type="button"
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Manage Chapters</span>
              </button>
            </Link>
            <Link href="/hq/analytics">
              <button
                type="button"
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-[#414066]" />
                <span>Analytics</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Chapters */}
        <Link
          href="/hq/chapters"
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // ACTIVE CAMPUSES
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {activeChapters.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{store.chapters.length} total · {onboardingCount} onboarding</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 02: Members */}
        <Link
          href="/hq/users"
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // ENROLLED MEMBERS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {members}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Verified student innovators</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 03: Live Events */}
        <Link
          href="/hq/calendar"
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // NETWORK SESSIONS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {activeEvents}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Active network calendar</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 04: Pending Reports */}
        <Link
          href="/hq/reports"
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // PENDING AUDITS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#f59e0b] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {pendingReports.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Submitted for HQ sign-off</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      {/* ── 3. CHAPTER HEALTH MATRIX & SIDEBAR ───────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Chapters by Health */}
        <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#f26430]" />
              CHAPTER HEALTH MATRIX (BY ACTIVITY VELOCITY)
            </span>
            <Link
              href="/hq/chapters"
              className="font-mono text-xs font-bold text-[#f26430] hover:underline uppercase tracking-wider"
            >
              View all
            </Link>
          </div>

          {!chaptersByHealth.length ? (
            <p className="py-8 text-center font-mono text-xs text-[#71717a]">
              No chapters provisioned yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#2d2d34]/10 mt-2">
              {chaptersByHealth.map((c) => {
                const metrics = metricsById.get(c.id);
                const chapterScore = calculateChapterActivityScore(store, c.id);
                return (
                  <li key={c.id} className="py-3.5">
                    <Link
                      href={`/chapter/${c.slug}`}
                      className="group flex items-center gap-3 transition hover:opacity-95"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#2d2d34] font-mono text-xs font-bold text-white shadow-[1px_1px_0px_#f26430]">
                        {c.slug.slice(0, 3).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#2d2d34] group-hover:text-[#f26430] transition">
                            {c.name}
                          </span>
                          <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                            chapterScore >= 90
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : chapterScore >= 75
                                ? "bg-cyan-50 text-cyan-800 border-cyan-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}>
                            {chapterScore}%
                          </span>
                          {c.status === "onboarding" && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase border border-zinc-200">
                              onboarding
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 font-mono text-[11px] text-[#71717a] truncate">
                          {c.college} · {metrics?.members ?? 0} members · {metrics?.events ?? 0} sessions
                        </p>

                        <div className="mt-2 max-w-sm">
                          <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden border border-[#2d2d34]/10">
                            <div
                              className="h-full bg-[#f26430] transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, chapterScore))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <ArrowUpRight
                        size={16}
                        className="text-[#71717a] group-hover:text-[#f26430] transition shrink-0"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right Stack: Action Queue, Campus Leads, Telemetry */}
        <div className="space-y-5">
          {/* Action Items */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
              <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#f26430]" />
                ITEMS REQUIRING HQ ACTION
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <Link
                href="/hq/reports"
                className="block rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3 shadow-[1px_1px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition"
              >
                <p className="font-bold text-sm text-[#2d2d34]">Reports</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
                  {pendingReports.length} submitted for HQ review →
                </p>
              </Link>
              <Link
                href="/hq/chapters"
                className="block rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3 shadow-[1px_1px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition"
              >
                <p className="font-bold text-sm text-[#2d2d34]">Onboarding</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
                  {onboardingCount} chapter{onboardingCount === 1 ? "" : "s"} in provisioning →
                </p>
              </Link>
              <Link
                href="/notifications"
                className="block rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3 shadow-[1px_1px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition"
              >
                <p className="font-bold text-sm text-[#2d2d34]">Security Alerts</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
                  {unreadAlerts} unread notification{unreadAlerts === 1 ? "" : "s"} →
                </p>
              </Link>
            </div>
          </div>

          {/* Campus Leads */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
              <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#414066]" />
                CAMPUS LEADS (ACTIVE TERMS)
              </span>
              <Link
                href="/hq/leadership"
                className="font-mono text-xs font-bold text-[#f26430] hover:underline uppercase tracking-wider"
              >
                Leadership
              </Link>
            </div>

            {!campusLeads.length ? (
              <p className="py-4 text-center font-mono text-xs text-[#71717a]">
                No active campus leads.
              </p>
            ) : (
              <ul className="divide-y divide-[#2d2d34]/10 mt-2 text-xs">
                {campusLeads.map((lead) => (
                  <li key={lead.id} className="py-2.5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#fef0eb] text-xs font-bold font-mono text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
                      {initials(lead.userName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#2d2d34]">
                        {lead.userName}
                      </p>
                      <p className="truncate font-mono text-[10.5px] text-[#71717a]">
                        {lead.title} · {lead.chapterName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Audit Activity */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
              <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#5f7560]" />
                SYSTEM TELEMETRY
              </span>
              <Link
                href="/hq/audit"
                className="font-mono text-xs font-bold text-[#2d2d34] hover:text-[#f26430] uppercase tracking-wider"
              >
                Audit Log
              </Link>
            </div>

            {!recentActivity.length ? (
              <p className="py-4 text-center font-mono text-xs text-[#71717a]">
                No activity logged yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#2d2d34]/10 mt-2 text-xs">
                {recentActivity.map((log) => {
                  const actor = store.profiles.find((p) => p.id === log.actorId);
                  return (
                    <li key={log.id} className="py-2.5">
                      <p className="text-xs text-[#2d2d34]">
                        <span className="font-bold">
                          {actor?.fullName?.split(" ")[0] ?? "System"}
                        </span>{" "}
                        <span className="text-[#71717a]">{log.action.replaceAll("_", " ")}</span>
                      </p>
                      <p className="font-mono text-[10px] text-[#71717a] mt-0.5">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

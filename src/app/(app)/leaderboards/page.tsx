"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  Award,
  Sparkles,
  Building2,
  Layers,
  FolderGit2,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import {
  buildChapterLeaders,
  buildClusterLeaders,
  buildCoordinatorLeaders,
  buildExecutiveLeaders,
  buildLeaderboardHqStats,
  buildProjectLeaders,
  buildRepLeaders,
  buildStudentLeaders,
  type LeaderEntry,
} from "@/lib/leaderboards";
import { isHqRole } from "@/lib/permissions";

function LeaderboardCard({
  title,
  number,
  entries,
  icon: Icon,
}: {
  title: string;
  number: string;
  entries: LeaderEntry[];
  icon: typeof Trophy;
}) {
  return (
    <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-[#f26430]" />
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
              {number} {"//"} {title}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
            {entries.length}
          </span>
        </div>

        {!entries.length ? (
          <p className="py-8 text-center font-mono text-xs text-[#71717a]">No entries recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {entries.slice(0, 7).map((e) => {
              const isFirst = e.rank === 1;
              const isSecond = e.rank === 2;
              const isThird = e.rank === 3;

              return (
                <li
                  key={`${e.id}-${e.rank}`}
                  className="flex items-center gap-3 rounded-[8px] border border-[#2d2d34]/10 bg-[#faf9f6] px-3 py-2 text-xs transition hover:border-[#2d2d34]/30"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] font-mono text-[10px] font-black border border-[#2d2d34] ${
                      isFirst
                        ? "bg-[#f26430] text-white shadow-[1px_1px_0px_#2d2d34]"
                        : isSecond
                          ? "bg-[#414066] text-white shadow-[1px_1px_0px_#2d2d34]"
                          : isThird
                            ? "bg-[#f59e0b] text-white shadow-[1px_1px_0px_#2d2d34]"
                            : "bg-white text-[#2d2d34]"
                    }`}
                  >
                    #{e.rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    {e.href ? (
                      <Link
                        href={e.href}
                        className="font-bold text-[#2d2d34] hover:text-[#f26430] transition truncate block"
                      >
                        {e.name}
                      </Link>
                    ) : (
                      <span className="font-bold text-[#2d2d34] truncate block">{e.name}</span>
                    )}
                    {e.meta && (
                      <span className="font-mono text-[10px] text-[#71717a] truncate block">
                        {e.meta}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs font-black text-[#f26430] shrink-0">
                    {e.value}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardsPage() {
  const { store } = useStore();
  const roleKey = store.session.roleKey;
  const hq = isHqRole(roleKey);
  const boardEyebrow =
    hq || isExecutiveRole(roleKey) || isFacultyRole(roleKey)
      ? "SYSTEM STANDINGS"
      : "NETWORK RANKINGS";

  const [activeTab, setActiveTab] = useState<"all" | "students" | "chapters" | "projects">("all");

  const students = buildStudentLeaders(store);
  const reps = buildRepLeaders(store);
  const coordinators = buildCoordinatorLeaders(store);
  const executives = buildExecutiveLeaders(store);
  const chapters = buildChapterLeaders(store);
  const projects = buildProjectLeaders(store);
  const clusters = buildClusterLeaders(store);
  const hqStats = hq ? buildLeaderboardHqStats(store) : null;

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
                {boardEyebrow} {"//"} XP & ACTIVITY
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                Cross-Campus Rankings
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Network Leaderboards
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Celebrating top builders, active representatives, high-velocity campus chapters, open source sprint projects, and domain track leads.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`h-8 px-3 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                  : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-[#faf9f6]"
              }`}
            >
              All Boards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`h-8 px-3 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                activeTab === "students"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                  : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-[#faf9f6]"
              }`}
            >
              Members & Reps
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chapters")}
              className={`h-8 px-3 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                activeTab === "chapters"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                  : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-[#faf9f6]"
              }`}
            >
              Chapters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`h-8 px-3 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                  : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-[#faf9f6]"
              }`}
            >
              Projects & Tracks
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Top Member */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // TOP BUILDER XP
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {students[0]?.value || (hqStats ? hqStats.topMemberPoints : "0 XP")}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a] truncate">
            {students[0]?.name || (hqStats ? hqStats.topMemberName : "Rank 1 Builder")}
          </p>
        </div>

        {/* Metric 02: Top Chapter */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // TOP CHAPTER
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {chapters[0]?.value || (hqStats ? `${hqStats.topChapterHealth}%` : "—")}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a] truncate">
            {chapters[0]?.name || (hqStats ? hqStats.topChapterName : "Active Campus")}
          </p>
        </div>

        {/* Metric 03: Top Project */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // TOP REPO / PROJECT
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34] truncate">
            {projects[0]?.name || "Active Sprint"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            {projects[0]?.value || "Stage: Prototype"}
          </p>
        </div>

        {/* Metric 04: Top Track */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // TOP GUILD TRACK
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#f59e0b] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34] truncate">
            {clusters[0]?.name || "Web & AI"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            {clusters[0]?.value || "Highest enrollment"}
          </p>
        </div>
      </section>

      {/* ── 3. LEADERBOARD CARDS GRID ───────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(activeTab === "all" || activeTab === "students") && (
          <>
            <LeaderboardCard
              title="STUDENT BUILDERS"
              number="01"
              entries={students}
              icon={Users}
            />
            <LeaderboardCard
              title="CLASS REPRESENTATIVES"
              number="02"
              entries={reps}
              icon={Award}
            />
            <LeaderboardCard
              title="COORDINATORS"
              number="03"
              entries={coordinators}
              icon={Sparkles}
            />
            <LeaderboardCard
              title="EXECUTIVE OFFICERS"
              number="04"
              entries={executives}
              icon={TrendingUp}
            />
          </>
        )}

        {(activeTab === "all" || activeTab === "chapters") && (
          <LeaderboardCard
            title="CAMPUS CHAPTERS"
            number="05"
            entries={chapters}
            icon={Building2}
          />
        )}

        {(activeTab === "all" || activeTab === "projects") && (
          <>
            <LeaderboardCard
              title="PROJECT REPOSITORIES"
              number="06"
              entries={projects}
              icon={FolderGit2}
            />
            <LeaderboardCard
              title="DOMAIN CLUSTERS"
              number="07"
              entries={clusters}
              icon={Layers}
            />
          </>
        )}
      </section>
    </div>
  );
}

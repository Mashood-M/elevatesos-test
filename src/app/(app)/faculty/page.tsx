"use client";

import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  FileText,
  Users,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Award,
  ChevronRight,
} from "lucide-react";
import { useStore, useCurrentUser } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

export default function FacultyPage() {
  const { store } = useStore();
  const { session, profile } = useCurrentUser();
  const chapterId = session.chapterId ?? store.chapters?.[0]?.id;
  const chapter = store.chapters.find((c) => c.id === chapterId);
  const firstName = profile?.fullName?.split(" ")[0] ?? "Coordinator";

  const openEvents = store.events.filter(
    (e) =>
      e.chapterId === chapterId &&
      ["registration_open", "approved", "draft"].includes(e.status),
  );
  const submittedReports = store.reports.filter(
    (r) => r.chapterId === chapterId && r.status === "submitted",
  );
  const studentRoleId = store.roles.find((r) => r.key === "student")?.id;
  const students = store.profiles.filter(
    (p) =>
      p.chapterId === chapterId &&
      store.userRoles.some(
        (ur) => ur.userId === p.id && (!studentRoleId || ur.roleId === studentRoleId),
      ),
  );

  const chapterCode = (chapter?.shortCode || chapter?.slug || "CAMPUS").toUpperCase();

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
                FACULTY LIAISON // {chapterCode}
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter ? chapter.college || chapter.name : "Institution Oversight"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Good day, Professor {firstName}.
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Faculty advisory desk & institutional compliance. Elevates student chapters operate autonomously with executive governance while providing academic oversight and verified audit records.
            </p>
          </div>

          {/* Quick Header Actions */}
          {chapter && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
              <Link href={`/chapter/${chapter.slug}/analytics`}>
                <button
                  type="button"
                  className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-[#f26430]" />
                  <span>Campus Analytics</span>
                </button>
              </Link>
              <Link href={`/chapter/${chapter.slug}/reports`}>
                <button
                  type="button"
                  className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit Reports</span>
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. DOCTRINE PRINCIPLE CARD ──────────────────────────────────── */}
      <section className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[1.5px_1.5px_0px_#2d2d34] flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/20 shadow-[1px_1px_0px_#2d2d34] mt-0.5">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-[#71717a]">
          <strong className="text-[#2d2d34] font-semibold">Institutional Operating Model: </strong>
          Elevates student chapters launch and host peer learning sessions with direct student leadership. Faculty coordinators provide strategic mentorship, venue endorsement, and administrative certification without acting as a bottleneck.
        </div>
      </section>

      {/* ── 3. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Events */}
        <Link
          href={chapter ? `/chapter/${chapter.slug}/events` : "#"}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // CHAPTER SESSIONS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {openEvents.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Active & upcoming</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 02: Pending Reports */}
        <Link
          href={chapter ? `/chapter/${chapter.slug}/reports` : "#"}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // PENDING AUDITS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {submittedReports.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{submittedReports.length > 0 ? "Awaiting review" : "All reports cleared"}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 03: Students */}
        <Link
          href={chapter ? `/chapter/${chapter.slug}/students` : "#"}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // ENROLLED STUDENTS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {students.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Verified campus roster</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 04: Attendance Velocity */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // ACADEMIC STANDING
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#f59e0b] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {chapter ? "Good" : "—"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Active institutional tier
          </p>
        </div>
      </section>

      {/* ── 4. EVENTS MONITOR & REPORT REVIEWS ───────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Events Monitor */}
        <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
              SESSION MONITORING (NON-BLOCKING)
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {openEvents.length}
            </span>
          </div>

          {openEvents.length === 0 ? (
            <p className="py-6 text-center font-mono text-xs text-[#71717a]">
              No active campus sessions currently scheduled.
            </p>
          ) : (
            <ul className="divide-y divide-[#2d2d34]/10 text-xs mt-2">
              {openEvents.map((ev) => (
                <li key={ev.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={chapter ? `/chapter/${chapter.slug}/events/${ev.id}` : "#"}
                      className="font-bold text-sm text-[#2d2d34] hover:text-[#f26430] transition truncate block"
                    >
                      {ev.title}
                    </Link>
                    <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
                      {formatDateTime(ev.startsAt)} · {ev.venue || "Campus Venue"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 uppercase border border-zinc-200">
                      {ev.status.replaceAll("_", " ")}
                    </span>
                    {chapter && (
                      <Link href={`/chapter/${chapter.slug}/events/${ev.id}`}>
                        <button
                          type="button"
                          className="h-7 px-2 rounded-[5px] bg-white hover:bg-neutral-50 text-[#2d2d34] border border-[#2d2d34]/20 shadow-[1px_1px_0px_#2d2d34] transition flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Report Review Desk */}
        <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#414066]" />
              REPORT AUDITS & DISPATCHES
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f26430] text-white">
              {submittedReports.length} Pending
            </span>
          </div>

          <ul className="divide-y divide-[#2d2d34]/10 text-xs mt-2">
            {submittedReports.map((r) => {
              const submitter = store.profiles.find((p) => p.id === r.submittedBy);
              return (
                <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={chapter ? `/chapter/${chapter.slug}/reports/${r.id}` : "#"}
                      className="font-bold text-sm text-[#2d2d34] hover:text-[#f26430] transition block truncate"
                    >
                      {r.title}
                    </Link>
                    <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
                      Submitted by {submitter?.fullName ?? "Author"} ·{" "}
                      {r.submittedAt ? formatDateTime(r.submittedAt) : "—"}
                    </p>
                  </div>
                  {chapter && (
                    <Link href={`/chapter/${chapter.slug}/reports/${r.id}`}>
                      <button
                        type="button"
                        className="h-7 px-3 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer"
                      >
                        Review
                      </button>
                    </Link>
                  )}
                </li>
              );
            })}
            {submittedReports.length === 0 && (
              <li className="py-6 text-center font-mono text-xs text-[#71717a]">
                All chapter reports have been reviewed and audited.
              </li>
            )}
          </ul>

          {chapter && (
            <div className="mt-4 pt-3 border-t border-[#2d2d34]/15">
              <Link
                href={`/chapter/${chapter.slug}/reports`}
                className="font-mono text-xs font-bold text-[#f26430] hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                <span>View all filed reports</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. STUDENT ROSTER SAMPLER ───────────────────────────────────── */}
      <section className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
        <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
          <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#5f7560]" />
            STUDENT ENGAGEMENT SAMPLER
          </span>
          {chapter && (
            <Link
              href={`/chapter/${chapter.slug}/students`}
              className="font-mono text-xs font-bold text-[#2d2d34] hover:text-[#f26430] uppercase tracking-wider"
            >
              Full Roster →
            </Link>
          )}
        </div>

        <ul className="divide-y divide-[#2d2d34]/10 text-xs mt-2">
          {students.slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <Link
                  href={`/profile/${s.elevatesId || s.id}`}
                  className="font-bold text-sm text-[#2d2d34] hover:text-[#f26430] transition"
                >
                  {s.fullName}
                </Link>
                <p className="font-mono text-[10.5px] text-[#71717a]">
                  {s.department || "Member"} · {s.academicYear || s.year || "Student"}
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#f26430]">
                {s.points || 0} XP
              </span>
            </li>
          ))}
          {students.length === 0 && (
            <li className="py-4 text-center font-mono text-xs text-[#71717a]">
              No students currently registered in this chapter.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, useSyncExternalStore } from "react";
import { useCurrentUser, useStore, showToast } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole, resolveChapter } from "@/lib/access";
import { isEventVisibleToUser, isEventOngoing, isEventEnded, getEventRegistrationState } from "@/lib/events";
import { calculateChapterActivityScore } from "@/lib/analytics";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import { getChapterElevatesId } from "@/lib/chapters";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import { ArchitecturalEventCard } from "@/components/domain/bauhaus-event-card";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { StudentChapterView } from "@/components/chapter/student-chapter-view";
import type { EventItem } from "@/types";
import {
  Users,
  Calendar,
  Layers,
  Activity,
  QrCode,
  Plus,
  ArrowRight,
  MapPin,
  Building2,
  GraduationCap,
  CheckCircle2,
  Clock,
  Shield,
  CheckSquare,
  ChevronRight,
  Eye,
} from "lucide-react";

const emptySubscribe = () => () => {};

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem | null>(null);

  const { slug } = use(params);

  useEffect(() => {
    if (slug === "events") {
      router.replace("/events");
    }
  }, [slug, router]);

  const { store } = useStore();
  const { session, profile } = useCurrentUser();
  const [viewMode, setViewMode] = useState<"ops" | "student">("ops");
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  if (!mounted) {
    return <ContentSkeleton />;
  }

  if (!chapter) {
    return <ChapterNotFound />;
  }

  const activityScore = calculateChapterActivityScore(store, chapter.id);

  const showOps =
    isExecutiveRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    Boolean(session.authRoleKey && (session.authRoleKey === "founder" || session.authRoleKey === "hq_admin"));
  const isStudent = session.roleKey === "student";

  const members = store.profiles.filter((p) => p.chapterId === chapter.id);
  const events = store.events
    .filter((e) => e.chapterId === chapter.id)
    .filter((e) =>
      isEventVisibleToUser(
        e,
        chapter.id,
        session.roleKey,
        session.userId,
        store.chapters,
      ),
    );
  const clusters = store.clusters.filter((c) => c.chapterId === chapter.id);
  const tasks = store.tasks.filter((t) => t.chapterId === chapter.id);
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const ongoingEvents = events.filter((e) => isEventOngoing(e));
  const upcoming = events
    .filter((e) => isEventOngoing(e) || (!isEventEnded(e) && new Date(e.startsAt) >= new Date()))
    .sort((a, b) => {
      const aOngoing = isEventOngoing(a);
      const bOngoing = isEventOngoing(b);
      if (aOngoing && !bOngoing) return -1;
      if (!aOngoing && bOngoing) return 1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });

  const chapterLogs = (store.activityLogs ?? [])
    .filter((l) => {
      if (l.entity === "chapter" && l.entityId === chapter.id) return true;
      if (
        l.meta &&
        (l.meta.includes(chapter.id) ||
          l.meta.includes(chapter.slug) ||
          l.meta.includes(chapter.name))
      )
        return true;
      if (
        l.entity === "leadership_term" &&
        store.leadershipTerms.some(
          (t) => t.id === l.entityId && t.chapterId === chapter.id,
        )
      )
        return true;
      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const chapterElevatesId = getChapterElevatesId(chapter);

  // Appointed Leadership
  const campusLead = store.profiles.find(
    (p) =>
      p.id === chapter.campusLeadId ||
      p.id === chapter.customSettings?.campus_lead_id ||
      p.id === chapter.customSettings?.campusLeadId,
  );
  const faculty = store.profiles.find((p) => p.id === chapter.facultyId);

  const isViewingAsStudent = !showOps || viewMode === "student";

  if (isViewingAsStudent) {
    return (
      <div className="space-y-4">
        {showOps && (
          <div className="flex items-center justify-between rounded-[10px] bg-[#fffbeb] border border-[#2d2d34]/20 px-4 py-2 text-xs text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#f59e0b] text-[#2d2d34] border border-[#2d2d34]">
                PREVIEW MODE
              </span>
              <span className="font-medium text-xs">Viewing campus portal through student lens.</span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("ops")}
              className="h-7 px-3 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] active:translate-x-0 active:translate-y-0 transition cursor-pointer flex items-center gap-1.5"
            >
              <Eye size={12} />
              Return to Executive Desk
            </button>
          </div>
        )}
        <StudentChapterView
          chapter={chapter}
          chapterElevatesId={chapterElevatesId}
          slug={slug}
          session={session}
          profile={profile ?? null}
          store={store}
          campusLead={campusLead}
          faculty={faculty}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. CHAPTER ARCHITECTURAL HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-12 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {chapterElevatesId} {"//"} EXECUTIVE DESK
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter.status.replaceAll("_", " ")} · EST. {chapter.createdAt ? formatDate(chapter.createdAt) : formatDate(chapter.foundedAt)}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-snug">
              {chapter.name}
              <span className="block text-[#f26430] text-xl sm:text-2xl font-bold mt-0.5">
                {chapter.college}
              </span>
            </h1>

            {/* Subtitle & Location */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-[13px] font-medium text-[#52525b]">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#414066]" />
                {chapter.college}
              </span>
              {chapter.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f26430]" />
                  {chapter.city} Campus
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#71717a]">
                <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                {members.length} Registered Students
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {showOps && (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode("student")}
                  className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-[#414066]" />
                  <span>Student View</span>
                </button>
                <Link href={`/chapter/${slug}/attendance`}>
                  <button
                    type="button"
                    className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan Attendance</span>
                  </button>
                </Link>
                <Link href={`/chapter/${slug}/events`}>
                  <button
                    type="button"
                    className="h-9 px-3.5 rounded-[8px] bg-[#2d2d34] hover:bg-[#1f1f24] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-[#f26430]" strokeWidth={2.5} />
                    <span>New Event</span>
                  </button>
                </Link>
                <Link href={`/chapter/${slug}/classes`}>
                  <button
                    type="button"
                    className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#414066]" />
                    <span>Cohorts</span>
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. METRICS OVERVIEW STRIP ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Metric 01: Members */}
        <Link
          href={`/chapter/${slug}/students`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // MEMBERS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black tracking-tight text-[#2d2d34]">
            {members.length}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Student directory</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 02: Events */}
        <Link
          href={`/chapter/${slug}/events`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // SESSIONS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black tracking-tight text-[#2d2d34]">
            {events.length}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{upcoming.length} upcoming or ongoing</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 03: Clusters */}
        <Link
          href={`/chapter/${slug}/clusters`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // CLUSTERS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black tracking-tight text-[#2d2d34]">
            {clusters.length}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Domain tracks</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 04: Health / Activity Score */}
        <Link
          href={showOps ? `/chapter/${slug}/analytics` : `#`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // HEALTH
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black tracking-tight text-[#2d2d34]">
              {activityScore}%
            </span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {activityScore >= 75 ? "Optimal" : activityScore >= 40 ? "Active" : "Building"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{showOps ? "View analytics →" : "Operational index"}</span>
          </div>
        </Link>
      </section>

      {/* ── 3. ONGOING EVENT ALERT BANNER (If Active) ───────────────────────── */}
      {ongoingEvents.length > 0 && (
        <section className="relative overflow-hidden rounded-[14px] border border-[#f26430] bg-[#fffaf8] p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f26430] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#f26430]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f26430] text-white">
                    LIVE NOW
                  </span>
                  <p className="text-[13px] font-bold text-[#2d2d34]">
                    {ongoingEvents[0].title}
                  </p>
                </div>
                <p className="text-xs text-[#52525b] mt-0.5">
                  Venue: {ongoingEvents[0].venue || "Campus Venue"} · Live attendance check-in active.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/chapter/${slug}/events/${ongoingEvents[0].id}`}>
                <button
                  type="button"
                  className="h-8 px-3.5 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] cursor-pointer"
                >
                  View Event
                </button>
              </Link>
              {showOps && (
                <Link href={`/chapter/${slug}/attendance`}>
                  <button
                    type="button"
                    className="h-8 px-3.5 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] cursor-pointer"
                  >
                    Scan Passes
                  </button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. TWO-COLUMN WORKSPACE GRID ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT COLUMN: Events & Core Activities */}
        <div className="space-y-6">
          {/* Upcoming & Scheduled Events Card */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white shadow-[2px_2px_0px_#2d2d34] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 px-5 py-3.5 bg-[#faf9f6]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
                  CALENDAR // UPCOMING SESSIONS
                </span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                  {upcoming.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/events`}
                className="font-mono text-[11px] font-bold text-[#f26430] hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {upcoming.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#2d2d34]/20 rounded-[12px] bg-[#faf9f6]">
                  <Calendar className="w-7 h-7 mx-auto text-[#71717a] mb-2 opacity-60" />
                  <p className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                    NO UPCOMING SESSIONS SCHEDULED
                  </p>
                  <p className="text-xs text-[#71717a] mt-1">
                    Stay tuned for hackathons, workshops, and symposiums.
                  </p>
                  {showOps && (
                    <Link href={`/chapter/${slug}/events`} className="mt-3 inline-block">
                      <button
                        type="button"
                        className="h-8 px-3 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] cursor-pointer"
                      >
                        Schedule First Event
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {upcoming.slice(0, 3).map((event) => {
                    const regState = getEventRegistrationState(
                      store,
                      event,
                      session.userId,
                    );
                    const myReg = store.registrations.find(
                      (r) => r.eventId === event.id && r.userId === session.userId,
                    );

                    return (
                      <ArchitecturalEventCard
                        key={event.id}
                        event={event}
                        chapter={chapter}
                        roleKey={session.roleKey}
                        regState={regState}
                        myReg={myReg}
                        onRegister={(ev) => setSelectedEventForReg(ev)}
                        canManage={showOps}
                      />
                    );
                  })}
                  {upcoming.length > 3 && (
                    <Link
                      href={`/chapter/${slug}/events`}
                      className="block text-center font-mono text-xs font-bold text-[#f26430] hover:underline pt-2 uppercase tracking-wider"
                    >
                      + {upcoming.length - 3} more upcoming sessions →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Operational Tasks (For Leads & Executive Team) */}
          {showOps && (
            <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white shadow-[2px_2px_0px_#2d2d34] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2d2d34]/15 px-5 py-3.5 bg-[#faf9f6]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#414066]" />
                    OPERATIONS // SPRINT TASKS
                  </span>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                    {openTasks.length} active
                  </span>
                </div>
                <Link
                  href={`/chapter/${slug}/tasks`}
                  className="font-mono text-[11px] font-bold text-[#414066] hover:underline flex items-center gap-1 uppercase tracking-wider"
                >
                  <span>Task board</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 sm:p-5">
                {openTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs font-medium text-[#71717a]">
                    <CheckCircle2 className="w-5 h-5 text-[#5f7560] mx-auto mb-1.5" />
                    All operational sprints completed. Inbox zero!
                  </div>
                ) : (
                  <ul className="divide-y divide-[#2d2d34]/10">
                    {openTasks.slice(0, 5).map((task) => (
                      <li key={task.id}>
                        <Link
                          href={`/chapter/${slug}/tasks`}
                          className="flex items-center justify-between gap-3 py-3 hover:text-[#f26430] transition group"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#2d2d34] group-hover:text-[#f26430] transition-colors">
                              {task.title}
                            </p>
                            <p className="text-[11px] font-mono text-[#71717a] mt-0.5">
                              Due {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                            {task.category.replaceAll("_", " ")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Student Journey Pathway (If Student) */}
          {isStudent && (
            <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                  PATHWAY // CAMPUS JOURNEY
                </span>
              </div>
              <p className="text-xs text-[#52525b] mb-4">
                Elevates connects you with domain workshops, peer builders, and portfolio-worthy tech projects.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href={`/chapter/${slug}/events`}
                  className="rounded-[10px] border border-[#2d2d34]/15 p-3 hover:border-[#f26430] hover:bg-[#fffaf8] transition-all group shadow-[1px_1px_0px_#2d2d34]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#fef0eb] text-[#f26430] font-mono font-bold text-[11px] mb-2 border border-[#f26430]/30">
                    01
                  </div>
                  <p className="font-bold text-xs text-[#2d2d34] group-hover:text-[#f26430]">
                    Workshops & Labs
                  </p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Attend hands-on developer events and earn verified certificates.
                  </p>
                </Link>

                <Link
                  href={`/chapter/${slug}/clusters`}
                  className="rounded-[10px] border border-[#2d2d34]/15 p-3 hover:border-[#f26430] hover:bg-[#fffaf8] transition-all group shadow-[1px_1px_0px_#2d2d34]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-zinc-100 text-zinc-700 font-mono font-bold text-[11px] mb-2 border border-zinc-200">
                    02
                  </div>
                  <p className="font-bold text-xs text-[#2d2d34] group-hover:text-[#f26430]">
                    Interest Clusters
                  </p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Collaborate with peers in AI, Web3, UI/UX, or Open Source.
                  </p>
                </Link>

                <Link
                  href={`/chapter/${slug}/projects`}
                  className="rounded-[10px] border border-[#2d2d34]/15 p-3 hover:border-[#f26430] hover:bg-[#fffaf8] transition-all group shadow-[1px_1px_0px_#2d2d34]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-zinc-100 text-zinc-700 font-mono font-bold text-[11px] mb-2 border border-zinc-200">
                    03
                  </div>
                  <p className="font-bold text-xs text-[#2d2d34] group-hover:text-[#f26430]">
                    Build & Ship
                  </p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Contribute to student-led projects and launch to the public.
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Leadership, Clusters & Members */}
        <div className="space-y-6">
          {/* Chapter Leadership Card */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-3.5 h-3.5 text-[#f26430]" />
              <h3 className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                LEADERSHIP // APPOINTED OFFICERS
              </h3>
            </div>

            <div className="space-y-3">
              {/* Campus Lead */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#2d2d34] text-white font-mono text-xs font-bold shadow-[1px_1px_0px_#f26430]">
                    {campusLead ? initials(campusLead.fullName) : "CL"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2d2d34] truncate">
                      {campusLead?.fullName || "Unappointed"}
                    </p>
                    <p className="text-[11px] font-mono text-[#71717a] truncate">
                      {campusLead?.email || "Campus Lead"}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f26430] text-white shrink-0">
                  Campus Lead
                </span>
              </div>

              {/* Faculty Coordinator */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#414066] text-white font-mono text-xs font-bold shadow-[1px_1px_0px_#2d2d34]">
                    {faculty ? initials(faculty.fullName) : "FC"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2d2d34] truncate">
                      {faculty?.fullName || "Faculty Advisor"}
                    </p>
                    <p className="text-[11px] font-mono text-[#71717a] truncate">
                      {faculty?.department || "Institutional Coordinator"}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#414066] text-white shrink-0">
                  Faculty
                </span>
              </div>
            </div>
          </div>

          {/* Active Clusters Card */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white shadow-[2px_2px_0px_#2d2d34] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 px-5 py-3.5 bg-[#faf9f6]">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#414066]" />
                <h3 className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                  CLUSTERS // DOMAINS
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                  {clusters.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/clusters`}
                className="font-mono text-[11px] font-bold text-[#414066] hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {clusters.length === 0 ? (
                <p className="py-4 text-center font-mono text-xs text-[#71717a]">
                  No domain clusters created yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {clusters.slice(0, 5).map((cl) => (
                    <Link
                      key={cl.id}
                      href={`/chapter/${slug}/clusters`}
                      className="flex items-center justify-between p-2.5 rounded-[8px] border border-[#2d2d34]/15 hover:border-[#f26430] hover:bg-[#fffaf8] transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2d2d34] group-hover:text-[#f26430] truncate">
                          {cl.name}
                        </p>
                        <p className="text-[10.5px] text-[#71717a] line-clamp-1">
                          {cl.description || "Domain community"}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[#2d2d34] bg-white px-2 py-0.5 rounded border border-[#2d2d34]/20 shrink-0">
                        {cl.memberIds.length} builders
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members Preview Card */}
          <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white shadow-[2px_2px_0px_#2d2d34] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/15 px-5 py-3.5 bg-[#faf9f6]">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[#f26430]" />
                <h3 className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                  MEMBERS // DIRECTORY
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                  {members.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/students`}
                className="font-mono text-[11px] font-bold text-[#f26430] hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                <span>Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {members.length === 0 ? (
                <p className="py-4 text-center font-mono text-xs text-[#71717a]">
                  No members registered yet.
                </p>
              ) : (
                <div className="space-y-3">
                  <ul className="divide-y divide-[#2d2d34]/10">
                    {members.slice(0, 5).map((m) => {
                      const uId = m.elevatesId || generateElevatesId(m.id);
                      return (
                        <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#2d2d34] text-white font-mono text-[10px] font-bold shadow-[1px_1px_0px_#f26430]">
                              {initials(m.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#2d2d34] truncate">
                                {m.fullName}
                              </p>
                              <p className="text-[10px] font-mono text-[#71717a] truncate">
                                {m.department ? `${m.department} · ` : ""}{m.year || "Student"}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#faf9f6] text-[#2d2d34] border border-[#2d2d34]/20 shrink-0">
                            {uId}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {members.length > 5 && (
                    <Link
                      href={`/chapter/${slug}/students`}
                      className="block text-center font-mono text-xs font-bold text-[#f26430] hover:underline pt-1 uppercase tracking-wider"
                    >
                      View all {members.length} members →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          {chapterLogs.length > 0 && (
            <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                <h3 className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                  CHRONICLE // ACTIVITY LOG
                </h3>
              </div>
              <ul className="divide-y divide-[#2d2d34]/10 text-xs">
                {chapterLogs.map((log) => {
                  const actor = store.profiles.find((p) => p.id === log.actorId);
                  return (
                    <li key={log.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2d2d34] truncate">
                          {actor?.fullName ?? "System"}
                        </span>
                        <span className="font-mono text-[10px] text-[#71717a] shrink-0">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#52525b] truncate">
                        {log.action.replaceAll("_", " ")}
                        {log.meta ? ` · ${log.meta}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Event Registration Dialog (for instant modal registration) */}
      <EventRegistrationDialog
        open={Boolean(selectedEventForReg)}
        onClose={() => setSelectedEventForReg(null)}
        event={selectedEventForReg}
        onSuccess={() => {
          showToast("Registration saved successfully", "success");
          setSelectedEventForReg(null);
        }}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "@/components/ui/ticket-card";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole, isFacultyRole, resolveChapter } from "@/lib/access";
import { isEventVisibleToUser, isEventOngoing, isEventEnded } from "@/lib/events";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { calculateChapterActivityScore } from "@/lib/analytics";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import { getChapterElevatesId } from "@/lib/chapters";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
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
  Sparkles,
  Shield,
  CheckSquare,
  ChevronRight,
  UserCheck,
  Compass,
  FileText,
} from "lucide-react";

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);

  useEffect(() => {
    if (slug === "events") {
      router.replace("/events");
    }
  }, [slug, router]);

  const { store } = useStore();
  const { session } = useCurrentUser();
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
    isHqRole(session.roleKey);
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

  return (
    <div className="space-y-6">
      {/* ── 1. CHAPTER HERO & IDENTITY CARD ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-md border border-[var(--accent)]/20 shadow-2xs">
                {chapterElevatesId}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-bg text-text-dim border border-border/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {chapter.status.replaceAll("_", " ")}
              </span>
              <span className="text-xs text-text-mute flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Est. {chapter.createdAt ? formatDate(chapter.createdAt) : formatDate(chapter.foundedAt)}
              </span>
            </div>

            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {chapter.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-dim">
                <span className="flex items-center gap-1 font-medium text-text">
                  <Building2 className="w-4 h-4 text-text-mute" />
                  {chapter.college}
                </span>
                {chapter.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-text-mute" />
                    {chapter.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {showOps ? (
              <>
                <Link href={`/chapter/${slug}/attendance`}>
                  <Button variant="orange" size="sm" className="shadow-xs flex items-center gap-1.5 font-semibold">
                    <QrCode className="w-4 h-4" />
                    Scan Attendance
                  </Button>
                </Link>
                <Link href={`/chapter/${slug}/events`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5 font-semibold">
                    <Plus className="w-4 h-4" />
                    New Event
                  </Button>
                </Link>
                <Link href={`/chapter/${slug}/classes`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    Cohorts
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/my-qr">
                  <Button variant="orange" size="sm" className="shadow-xs flex items-center gap-1.5 font-semibold">
                    <QrCode className="w-4 h-4" />
                    My QR Pass
                  </Button>
                </Link>
                <Link href={`/chapter/${slug}/events`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-4 h-4" />
                    Browse Events
                  </Button>
                </Link>
                <Link href={`/chapter/${slug}/clusters`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Clusters
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. METRICS OVERVIEW CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Members */}
        <Link
          href={`/chapter/${slug}/students`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Registered Members</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {members.length}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>Student directory</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Events */}
        <Link
          href={`/chapter/${slug}/events`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Events & Sessions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {events.length}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>{upcoming.length} upcoming or ongoing</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Clusters */}
        <Link
          href={`/chapter/${slug}/clusters`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Active Clusters</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {clusters.length}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>Domain tracks</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Activity Score */}
        <Link
          href={showOps ? `/chapter/${slug}/analytics` : `#`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Chapter Health</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              {activityScore}%
            </span>
            <Badge tone={activityScore >= 75 ? "orange" : "mute"} className="text-[10px]">
              {activityScore >= 75 ? "Excellent" : activityScore >= 40 ? "Good" : "Building"}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>{showOps ? "View analytics →" : "Operational index"}</span>
          </div>
        </Link>
      </div>

      {/* ── 3. ONGOING EVENT ALERT BANNER (If Active) ───────────────────────── */}
      {ongoingEvents.length > 0 && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-text">
                  {ongoingEvents[0].title} is live right now
                </p>
                <p className="text-[12px] text-text-dim">
                  Venue: {ongoingEvents[0].venue || "Campus Venue"} · Check-in and attendance verification is active.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/chapter/${slug}/events/${ongoingEvents[0].id}`}>
                <Button size="sm" variant="orange" className="font-semibold text-xs h-8">
                  View Live Event
                </Button>
              </Link>
              {showOps && (
                <Link href={`/chapter/${slug}/attendance`}>
                  <Button size="sm" variant="secondary" className="font-semibold text-xs h-8">
                    Scan Passes
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. TWO-COLUMN WORKSPACE GRID ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT COLUMN: Events & Core Activities */}
        <div className="space-y-6">
          {/* Upcoming & Scheduled Events Card */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="font-bold text-[14px] text-text">Upcoming Events</h2>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {upcoming.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/events`}
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {upcoming.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-bg text-text-mute mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-[13px] font-medium text-text">No upcoming events scheduled</p>
                  <p className="text-[12px] text-text-dim mt-0.5">Stay tuned for hackathons, workshops, and meetups.</p>
                  {showOps && (
                    <Link href={`/chapter/${slug}/events`} className="mt-3 inline-block">
                      <Button size="sm" variant="orange" className="text-xs h-8">
                        Schedule First Event
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 3).map((event) => (
                    <TicketCard
                      key={event.id}
                      event={event}
                      href={`/chapter/${slug}/events/${event.id}`}
                      hideStatus={isStudent}
                    />
                  ))}
                  {upcoming.length > 3 && (
                    <Link
                      href={`/chapter/${slug}/events`}
                      className="block text-center text-[12px] font-semibold text-[var(--accent)] hover:underline pt-2"
                    >
                      + {upcoming.length - 3} more upcoming events →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Student Journey Pathway (Clean & User-Friendly, replaces outdated text) */}
          {isStudent && (
            <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-bold text-[14px] text-text">Explore Your Campus Chapter</h3>
              </div>
              <p className="text-[12px] text-text-dim mb-4">
                Elevates connects you with domain workshops, peer builders, and portfolio-worthy tech projects.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href={`/chapter/${slug}/events`}
                  className="rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-bold text-xs mb-2">
                    01
                  </div>
                  <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                    Workshops & Labs
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Attend hands-on developer events and earn verified certificates.
                  </p>
                </Link>

                <Link
                  href={`/chapter/${slug}/clusters`}
                  className="rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition font-bold text-xs mb-2">
                    02
                  </div>
                  <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                    Interest Clusters
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Collaborate with peers in AI, Web3, UI/UX, or Open Source.
                  </p>
                </Link>

                <Link
                  href={`/chapter/${slug}/projects`}
                  className="rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition font-bold text-xs mb-2">
                    03
                  </div>
                  <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                    Build & Ship
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Contribute to student-led projects and launch to the public.
                  </p>
                </Link>
              </div>
            </div>
          )}

          {/* Operational Tasks (For Leads & Executive Team) */}
          {showOps && (
            <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="font-bold text-[14px] text-text">Operational Tasks</h2>
                  <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                    {openTasks.length} active
                  </span>
                </div>
                <Link
                  href={`/chapter/${slug}/tasks`}
                  className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <span>Task board</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5">
                {openTasks.length === 0 ? (
                  <div className="py-6 text-center text-text-dim text-[13px]">
                    <CheckCircle2 className="w-5 h-5 text-text-mute mx-auto mb-1.5 opacity-80" />
                    All operational tasks completed. Inbox zero!
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {openTasks.slice(0, 5).map((task) => (
                      <li key={task.id}>
                        <Link
                          href={`/chapter/${slug}/tasks`}
                          className="flex items-center justify-between gap-3 py-3 hover:text-[var(--accent)] transition"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-text">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-text-dim">
                              Due {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <Badge tone="mute" className="text-[10px] shrink-0">
                            {task.category.replaceAll("_", " ")}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Leadership, Clusters & Members */}
        <div className="space-y-6">
          {/* Chapter Leadership Card */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-bold text-[14px] text-text">Chapter Leadership</h3>
            </div>

            <div className="space-y-3.5">
              {/* Campus Lead */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg/60 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[12px] font-bold text-[var(--accent)]">
                    {campusLead ? initials(campusLead.fullName) : "CL"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">
                      {campusLead?.fullName || "Unappointed"}
                    </p>
                    <p className="text-[11px] text-text-dim truncate">
                      {campusLead?.email || "Campus Lead"}
                    </p>
                  </div>
                </div>
                <Badge tone={campusLead ? "orange" : "mute"} className="text-[10px] shrink-0">
                  Campus Lead
                </Badge>
              </div>

              {/* Faculty Coordinator */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg/60 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg border border-border text-[12px] font-bold text-text-dim">
                    {faculty ? initials(faculty.fullName) : "FC"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">
                      {faculty?.fullName || "Faculty Advisor"}
                    </p>
                    <p className="text-[11px] text-text-dim truncate">
                      {faculty?.department || "Institutional Coordinator"}
                    </p>
                  </div>
                </div>
                <Badge tone="mute" className="text-[10px] shrink-0">
                  Faculty
                </Badge>
              </div>
            </div>
          </div>

          {/* Active Clusters Card */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-text-mute" />
                <h3 className="font-bold text-[14px] text-text">Clusters</h3>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {clusters.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/clusters`}
                className="text-[12px] font-semibold text-text-dim hover:text-[var(--accent)] hover:underline flex items-center gap-1 transition"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {clusters.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-text-dim">
                  No clusters created yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {clusters.slice(0, 5).map((cl) => (
                    <Link
                      key={cl.id}
                      href={`/chapter/${slug}/clusters`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition group"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text group-hover:text-[var(--accent)] truncate">
                          {cl.name}
                        </p>
                        <p className="text-[11px] text-text-dim line-clamp-1">
                          {cl.description || "Domain community"}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-text-dim bg-bg px-2 py-0.5 rounded border border-border/70 shrink-0">
                        {cl.memberIds.length} builders
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members Preview Card */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-bold text-[14px] text-text">Members</h3>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {members.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/students`}
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {members.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-text-dim">
                  No members registered yet.
                </p>
              ) : (
                <div className="space-y-3">
                  <ul className="divide-y divide-border/60">
                    {members.slice(0, 5).map((m) => {
                      const uId = m.elevatesId || generateElevatesId(m.id);
                      return (
                        <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[var(--accent)]">
                              {initials(m.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-text truncate">
                                {m.fullName}
                              </p>
                              <p className="text-[10px] text-text-dim truncate">
                                {m.department ? `${m.department} · ` : ""}{m.year || "Student"}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">
                            {uId}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {members.length > 5 && (
                    <Link
                      href={`/chapter/${slug}/students`}
                      className="block text-center text-[12px] font-semibold text-[var(--accent)] hover:underline pt-1"
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
            <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-text-mute" />
                <h3 className="font-bold text-[14px] text-text">Recent Activity</h3>
              </div>
              <ul className="divide-y divide-border/60 text-[12px]">
                {chapterLogs.map((log) => {
                  const actor = store.profiles.find((p) => p.id === log.actorId);
                  return (
                    <li key={log.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text truncate">
                          {actor?.fullName ?? "System"}
                        </span>
                        <span className="font-mono text-[10px] text-text-mute shrink-0">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-dim truncate">
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
    </div>
  );
}

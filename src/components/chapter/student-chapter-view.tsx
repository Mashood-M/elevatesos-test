"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { useStore, showToast } from "@/context/store-context";
import { formatDate, formatDateTime, initials, cn } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import { isEventOngoing, isEventEnded } from "@/lib/events";
import type {
  Chapter,
  Cluster,
  EventItem,
  Profile,
  DemoUserSession,
  ElevatesStore,
  EventRegistration,
  AttendanceRecord,
  Announcement,
} from "@/types";
import {
  QrCode,
  Calendar,
  Layers,
  Trophy,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  UserPlus,
  ArrowRight,
  Shield,
  Copy,
  Check,
  Ticket,
  Compass,
  Megaphone,
  Radio,
  X,
  Sparkles,
} from "lucide-react";

interface StudentChapterViewProps {
  chapter: Chapter;
  chapterElevatesId: string;
  slug: string;
  session: DemoUserSession;
  profile: Profile | null;
  store: ElevatesStore;
  campusLead?: Profile;
  faculty?: Profile;
}

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// Track badges and category helpers
function getClusterTheme(name: string, slug: string) {
  const text = `${name} ${slug}`.toLowerCase();
  if (text.includes("ai") || text.includes("machine") || text.includes("ml") || text.includes("deep") || text.includes("data")) {
    return {
      category: "Artificial Intelligence",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      accentBg: "bg-purple-600",
    };
  }
  if (text.includes("web") || text.includes("frontend") || text.includes("fullstack") || text.includes("dev") || text.includes("software")) {
    return {
      category: "Web & Software",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      accentBg: "bg-blue-600",
    };
  }
  if (text.includes("cloud") || text.includes("devops") || text.includes("linux") || text.includes("security") || text.includes("cyber")) {
    return {
      category: "Cloud & Security",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentBg: "bg-emerald-600",
    };
  }
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("product") || text.includes("creative")) {
    return {
      category: "Product & UI/UX",
      badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
      accentBg: "bg-pink-600",
    };
  }
  return {
    category: "Specialized Track",
    badgeColor: "bg-orange-50 text-[var(--accent)] border-orange-200",
    accentBg: "bg-[var(--accent)]",
  };
}

export function StudentChapterView({
  chapter,
  chapterElevatesId,
  slug,
  session,
  profile,
  store,
  campusLead,
  faculty,
}: StudentChapterViewProps) {
  const { joinCluster } = useStore();

  // Modal & state management
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<EventItem | null>(null);
  const router = useRouter();
  const [eventsFilter, setEventsFilter] = useState<"all" | "registered">("all");
  const [copiedId, setCopiedId] = useState(false);
  const [joiningClusterId, setJoiningClusterId] = useState<string | null>(null);

  const currentUserProfile = store.profiles.find((p) => p.id === session.userId) || profile;
  const isDiscordConnected = Boolean(
    currentUserProfile?.discordConnected ||
    (currentUserProfile as unknown as Record<string, unknown> | undefined)?.discord_connected ||
    currentUserProfile?.discordUserId ||
    (currentUserProfile as unknown as Record<string, unknown> | undefined)?.discord_user_id
  );

  // Student identity
  const studentElevatesId = profile?.elevatesId || generateElevatesId(session.userId);
  const studentName = profile?.fullName || "Student Member";
  const firstName = studentName.split(" ")[0] || "Member";
  const studentDept = profile?.department ? `${profile.department}` : "";
  const studentYear = profile?.academicYear || profile?.year || "";
  const studentTagline = [studentDept, studentYear].filter(Boolean).join(" · ") || "Active Student Member";
  const points = profile?.points ?? 0;
  const badges = profile?.badges ?? [];

  // Filter chapter events
  const chapterEvents = useMemo(() => {
    return store.events.filter((e: EventItem) => e.chapterId === chapter.id);
  }, [store.events, chapter.id]);

  const ongoingEvents = useMemo(() => {
    return chapterEvents.filter((e: EventItem) => isEventOngoing(e));
  }, [chapterEvents]);

  const upcomingEvents = useMemo(() => {
    return chapterEvents
      .filter((e: EventItem) => isEventOngoing(e) || (!isEventEnded(e) && new Date(e.startsAt) >= new Date()))
      .sort((a: EventItem, b: EventItem) => {
        const aOngoing = isEventOngoing(a);
        const bOngoing = isEventOngoing(b);
        if (aOngoing && !bOngoing) return -1;
        if (!aOngoing && bOngoing) return 1;
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      });
  }, [chapterEvents]);

  // Student registrations & attendance
  const myRegistrations = useMemo(() => {
    return store.registrations.filter(
      (r: EventRegistration) => r.userId === session.userId && r.status !== "rejected",
    );
  }, [store.registrations, session.userId]);

  const myRegisteredEventIds = useMemo(() => {
    return new Set(myRegistrations.map((r: EventRegistration) => r.eventId));
  }, [myRegistrations]);

  const myAttendance = useMemo(() => {
    return store.attendance.filter(
      (a: AttendanceRecord) => a.userId === session.userId && a.status === "present",
    );
  }, [store.attendance, session.userId]);

  // Upcoming passes that student holds
  const myUpcomingPasses = useMemo(() => {
    return upcomingEvents.filter((e: EventItem) => myRegisteredEventIds.has(e.id));
  }, [upcomingEvents, myRegisteredEventIds]);

  // Filtered events display
  const displayedEvents = useMemo(() => {
    if (eventsFilter === "registered") {
      return upcomingEvents.filter((e: EventItem) => myRegisteredEventIds.has(e.id));
    }
    return upcomingEvents;
  }, [upcomingEvents, eventsFilter, myRegisteredEventIds]);

  // Clusters
  const chapterClusters = useMemo(() => {
    return store.clusters.filter((c: Cluster) => c.chapterId === chapter.id);
  }, [store.clusters, chapter.id]);

  const myClusters = useMemo(() => {
    return chapterClusters.filter(
      (c: Cluster) => c.memberIds.includes(session.userId) || c.leaderId === session.userId,
    );
  }, [chapterClusters, session.userId]);

  // Announcements
  const chapterAnnouncements = useMemo(() => {
    return store.announcements
      .filter(
        (a: Announcement) =>
          a.chapterId === chapter.id ||
          a.audience === "global" ||
          a.audience === "chapter",
      )
      .sort((a: Announcement, b: Announcement) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [store.announcements, chapter.id]);

  // Handle copy student ID
  function handleCopyId() {
    navigator.clipboard.writeText(studentElevatesId);
    setCopiedId(true);
    showToast("Elevates ID copied to clipboard", "success");
    setTimeout(() => setCopiedId(false), 2000);
  }

  // Handle joining cluster
  function handleJoinCluster(cluster: Cluster) {
    if (cluster.memberIds.includes(session.userId)) {
      showToast("You are already part of this cluster!", "info");
      return;
    }
    if (!isDiscordConnected) {
      showToast("Discord connection required to join clusters. See instructions in the Clusters tab.", "info");
      router.push(`/chapter/${slug}/clusters`);
      return;
    }
    setJoiningClusterId(cluster.id);
    try {
      joinCluster(cluster.id, session.userId);
      showToast(`You have joined ${cluster.name}! Welcome aboard.`, "success");
    } catch {
      showToast("Could not join cluster right now", "error");
    } finally {
      setJoiningClusterId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. STUDENT IDENTITY HERO ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-6 sm:p-8 shadow-xs">
        {/* Subtle decorative brand glow in the background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-56 w-56 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            {/* Badges / Eyebrow */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-md border border-[var(--accent)]/20 shadow-2xs">
                {chapterElevatesId}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-bg text-text-dim border border-border/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {chapter.status.replaceAll("_", " ")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[var(--accent-soft)]/50 text-[var(--accent)] border border-[var(--accent)]/15">
                <Shield className="w-3 h-3" />
                Student Portal
              </span>
            </div>

            {/* Title & Personalized Greeting */}
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                Welcome back, {firstName}! 👋
              </h1>
              <p className="mt-1 text-[13px] text-text-dim leading-relaxed">
                Your campus gateway to tech events, domain tracks, and peer builder communities at{" "}
                <span className="font-semibold text-text">{chapter.name}</span>.
              </p>
            </div>

            {/* Campus details chip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-dim">
              <span className="flex items-center gap-1.5 font-medium text-text">
                <Building2 className="w-3.5 h-3.5 text-text-mute" />
                {chapter.college}
              </span>
              {chapter.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-mute" />
                  {chapter.city}
                </span>
              )}
              <span className="flex items-center gap-1 text-text-mute">
                <Clock className="w-3.5 h-3.5" />
                Est. {chapter.createdAt ? formatDate(chapter.createdAt) : formatDate(chapter.foundedAt)}
              </span>
            </div>
          </div>

          {/* Student Pass Capsule & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 lg:pt-0 shrink-0">
            {/* Digital Pass Quick Launch Card */}
            <div
              onClick={() => setShowPassModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowPassModal(true); }}
              className="group flex items-center gap-3.5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/30 p-3 px-4 shadow-2xs hover:bg-[var(--accent-soft)]/60 hover:border-[var(--accent)]/50 transition cursor-pointer"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--accent)]/20 shadow-2xs text-[var(--accent)] group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-text">
                    {studentElevatesId}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] font-medium text-[var(--accent)] group-hover:underline flex items-center gap-0.5">
                  Show My Digital Pass
                  <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <Link href="/events" className="flex-1 sm:flex-none">
                <Button variant="secondary" size="sm" className="w-full font-semibold flex items-center gap-1.5 h-10">
                  <Calendar className="w-4 h-4" />
                  <span>Browse Events</span>
                </Button>
              </Link>
              <Link href={`/chapter/${slug}/clusters`} className="flex-1 sm:flex-none">
                <Button variant="secondary" size="sm" className="w-full font-semibold flex items-center gap-1.5 h-10">
                  <Layers className="w-4 h-4" />
                  <span>Clusters</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. STUDENT STATS BAR (4 FOCUSED STUDENT CARDS) ──────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Card 1: My Elevates ID */}
        <div
          onClick={() => setShowPassModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowPassModal(true); }}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Campus ID & Pass</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] group-hover:scale-110 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-xl sm:text-2xl font-extrabold tracking-tight text-text truncate">
            {studentElevatesId}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>Tap to open QR pass</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Card 2: My Event Passes */}
        <Link
          href="/my-qr"
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">My Passes & RSVPs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {myRegistrations.length}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>{myUpcomingPasses.length} upcoming · {myAttendance.length} attended</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Card 3: Joined Clusters */}
        <Link
          href={`/chapter/${slug}/clusters`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Domain Tracks</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              {myClusters.length}
            </span>
            <span className="text-xs text-text-mute font-medium">
              of {chapterClusters.length} active
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>Explore cohorts</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Card 4: Builder Points & XP */}
        <Link
          href={`/profile/${session.userId}`}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs transition hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Campus Standing</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              {points}
            </span>
            <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">
              XP
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-dim group-hover:text-[var(--accent)] transition">
            <span>{badges.length} badges · View portfolio</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      {/* ── 3. ONGOING EVENT LIVE ALERT (If any) ────────────────────────────── */}
      {ongoingEvents.length > 0 && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="orange" className="text-[10px] font-bold">
                    HAPPENING NOW
                  </Badge>
                  <p className="text-[13px] font-bold text-text">
                    {ongoingEvents[0].title}
                  </p>
                </div>
                <p className="text-[12px] text-text-dim mt-0.5">
                  Venue: {ongoingEvents[0].venue || "Campus Venue"} · Door check-in and attendance verification is active.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="orange"
                className="font-semibold text-xs h-8 shadow-xs flex items-center gap-1.5"
                onClick={() => setSelectedEventForModal(ongoingEvents[0])}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show Entry Pass</span>
              </Button>
              <Link href={`/chapter/${slug}/events/${ongoingEvents[0].id}`}>
                <Button size="sm" variant="secondary" className="font-semibold text-xs h-8">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. TWO-COLUMN WORKSPACE ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT COLUMN: Campus Events & My Passes */}
        <div className="space-y-6">
          {/* Active Passes Banner (if registered for upcoming) */}
          {myUpcomingPasses.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-[14px] text-text">Your Confirmed Event Passes</h2>
                  <Badge tone="green" className="text-[10px]">
                    {myUpcomingPasses.length} Active
                  </Badge>
                </div>
                <Link
                  href="/my-qr"
                  className="text-[12px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>All Passes</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-[12px] text-text-dim mb-3">
                You are registered for the following upcoming sessions. Tap to open your scan ticket at the venue.
              </p>
              <div className="space-y-2.5">
                {myUpcomingPasses.map((ev: EventItem) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-text truncate">
                        {ev.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-dim mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-text-mute" />
                          {formatDateTime(ev.startsAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-text-mute" />
                          {ev.venue || "Campus Venue"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="orange"
                        className="text-xs h-8 font-semibold flex items-center gap-1.5"
                        onClick={() => setSelectedEventForModal(ev)}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Ticket Pass</span>
                      </Button>
                      <Link href={`/chapter/${slug}/events/${ev.id}`}>
                        <Button size="sm" variant="secondary" className="text-xs h-8">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campus Events Section */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="font-bold text-[14px] text-text">Campus Events & Workshops</h2>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {upcomingEvents.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 rounded-lg bg-bg p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setEventsFilter("all")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                    eventsFilter === "all"
                      ? "bg-white text-text shadow-2xs"
                      : "text-text-dim hover:text-text",
                  )}
                >
                  All ({upcomingEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEventsFilter("registered")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                    eventsFilter === "registered"
                      ? "bg-white text-text shadow-2xs"
                      : "text-text-dim hover:text-text",
                  )}
                >
                  My Passes ({myUpcomingPasses.length})
                </button>
              </div>
            </div>

            <div className="p-5">
              {displayedEvents.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-mute mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-[14px] font-semibold text-text">
                    {eventsFilter === "registered"
                      ? "No active registrations yet"
                      : "No upcoming events scheduled right now"}
                  </p>
                  <p className="text-[12px] text-text-dim max-w-sm mx-auto mt-1">
                    {eventsFilter === "registered"
                      ? "Browse upcoming workshops and hackathons below to get your confirmed QR ticket."
                      : "Your chapter leads are preparing upcoming workshops, hackathons, and guest sessions. Stay tuned!"}
                  </p>
                  {eventsFilter === "registered" && upcomingEvents.length > 0 && (
                    <Button
                      size="sm"
                      variant="orange"
                      className="mt-3 text-xs"
                      onClick={() => setEventsFilter("all")}
                    >
                      Browse Upcoming Events
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {displayedEvents.map((ev: EventItem) => {
                    const isRegistered = myRegisteredEventIds.has(ev.id);
                    const isLive = isEventOngoing(ev);
                    const eventDate = new Date(ev.startsAt);
                    const month = eventDate.toLocaleDateString("en-US", { month: "short" });
                    const day = eventDate.getDate();

                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border transition",
                          isRegistered
                            ? "bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-300"
                            : "bg-white border-border/70 hover:border-[var(--accent)]/40 hover:shadow-2xs",
                        )}
                      >
                        {/* Date badge & Event Info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Compact Date Box */}
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-bg border border-border/80 text-center font-mono">
                            <span className="text-[10px] font-bold uppercase text-[var(--accent)] leading-none">
                              {month}
                            </span>
                            <span className="text-base font-extrabold text-text leading-none mt-0.5">
                              {day}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isLive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 text-[9px] font-extrabold">
                                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                                  LIVE
                                </span>
                              )}
                              {isRegistered ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                  <Check className="w-3 h-3" />
                                  Registered
                                </span>
                              ) : (
                                <Badge tone="mute" className="text-[10px]">
                                  {ev.category?.replaceAll("_", " ") || "Workshop"}
                                </Badge>
                              )}
                            </div>

                            <Link
                              href={`/chapter/${slug}/events/${ev.id}`}
                              className="block mt-1 text-[14px] font-bold text-text hover:text-[var(--accent)] transition truncate"
                            >
                              {ev.title}
                            </Link>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-dim">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-text-mute" />
                                {formatDateTime(ev.startsAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-text-mute" />
                                {ev.venue || "Campus Venue"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          {isRegistered ? (
                            <Button
                              size="sm"
                              variant="orange"
                              className="text-xs h-8 font-semibold flex items-center gap-1.5 shadow-2xs"
                              onClick={() => setSelectedEventForModal(ev)}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>View Ticket</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="orange"
                              className="text-xs h-8 font-semibold flex items-center gap-1.5 shadow-2xs"
                              onClick={() => setSelectedEventForModal(ev)}
                            >
                              <span>Register</span>
                            </Button>
                          )}
                          <Link href={`/chapter/${slug}/events/${ev.id}`}>
                            <Button size="sm" variant="secondary" className="text-xs h-8 font-medium">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {upcomingEvents.length > 0 && (
              <div className="border-t border-border/70 px-5 py-3 text-center bg-bg/30">
                <Link
                  href={`/chapter/${slug}/events`}
                  className="text-[12px] font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Browse full chapter event calendar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Student Journey / Experience Highlights */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-bold text-[14px] text-text">Your Campus Journey</h2>
            </div>
            <p className="text-[12px] text-text-dim mb-4">
              Get the most out of Elevates by building skills, collaborating in tracks, and earning verified certificates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href={`/chapter/${slug}/events`}
                className="group rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-bold text-xs mb-2">
                  01
                </div>
                <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                  Hands-on Sessions
                </p>
                <p className="text-[11px] text-text-dim mt-0.5">
                  Attend expert-led workshops and scan your QR pass to verify attendance.
                </p>
              </Link>

              <Link
                href={`/chapter/${slug}/clusters`}
                className="group rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition font-bold text-xs mb-2">
                  02
                </div>
                <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                  Interest Clusters
                </p>
                <p className="text-[11px] text-text-dim mt-0.5">
                  Join focused builder tracks in AI, Fullstack, Cloud, or UI/UX Design.
                </p>
              </Link>

              <Link
                href={`/profile/${session.userId}`}
                className="group rounded-xl border border-border/70 p-3.5 hover:border-[var(--accent)]/40 hover:bg-bg/40 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-text-dim group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition font-bold text-xs mb-2">
                  03
                </div>
                <p className="font-semibold text-[13px] text-text group-hover:text-[var(--accent)]">
                  Earn Verified Proof
                </p>
                <p className="text-[11px] text-text-dim mt-0.5">
                  Build your verified portfolio, level up XP, and gain shareable certificates.
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Domain Clusters, Campus Updates & Leadership */}
        <div className="space-y-6">
          {/* Active Clusters Card */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-bold text-[14px] text-text">Campus Clusters</h3>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {chapterClusters.length}
                </span>
              </div>
              <Link
                href={`/chapter/${slug}/clusters`}
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {!isDiscordConnected && (
                <div className="mb-3.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#5865F2] text-white shrink-0">
                      <DiscordIcon className="w-3 h-3" />
                    </span>
                    <p className="text-[11px] font-medium text-text">
                      <span className="font-bold">Discord Required:</span> Link Discord to join tracks.
                    </p>
                  </div>
                  <Link
                    href={`/chapter/${slug}/clusters`}
                    className="text-[11px] font-bold text-[#5865F2] hover:underline shrink-0"
                  >
                    View Guide →
                  </Link>
                </div>
              )}

              {chapterClusters.length === 0 ? (
                <div className="py-6 text-center text-text-dim text-[13px]">
                  <Layers className="w-6 h-6 text-text-mute mx-auto mb-2 opacity-60" />
                  No clusters created yet. Check back soon for new domain tracks!
                </div>
              ) : (
                <div className="space-y-3">
                  {chapterClusters.slice(0, 4).map((cluster: Cluster) => {
                    const isMember = cluster.memberIds.includes(session.userId);
                    const theme = getClusterTheme(cluster.name, cluster.slug);

                    return (
                      <div
                        key={cluster.id}
                        className={cn(
                          "p-3.5 rounded-xl border transition",
                          isMember
                            ? "bg-bg/50 border-[var(--accent)]/30"
                            : "border-border/60 hover:border-border hover:bg-bg/20",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                                  theme.badgeColor,
                                )}
                              >
                                {theme.category}
                              </span>
                              {isMember && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  <Check className="w-2.5 h-2.5" /> Joined
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/chapter/${slug}/clusters`}
                              className="text-[13px] font-bold text-text hover:text-[var(--accent)] transition truncate block"
                            >
                              {cluster.name}
                            </Link>
                            <p className="text-[11px] text-text-dim line-clamp-2 mt-0.5 leading-relaxed">
                              {cluster.description || "Domain community track for hands-on campus building."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium text-text-dim">
                            {cluster.memberIds.length} {cluster.memberIds.length === 1 ? "builder" : "builders"}
                          </span>

                          {isMember ? (
                            <Link
                              href={`/chapter/${slug}/clusters`}
                              className="text-[11px] font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>Open Track</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className={cn(
                                "h-7 text-[11px] px-2.5 font-semibold",
                                !isDiscordConnected
                                  ? "text-[#5865F2] hover:bg-[#5865F2]/10"
                                  : "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                              )}
                              disabled={joiningClusterId === cluster.id}
                              onClick={() => handleJoinCluster(cluster)}
                            >
                              {!isDiscordConnected ? (
                                <>
                                  <DiscordIcon className="w-3 h-3 mr-1" />
                                  Link to Join
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  Join Track
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chapter Announcements Card */}
          {chapterAnnouncements.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="font-bold text-[14px] text-text">Campus Updates</h3>
                </div>
                <Link
                  href="/announcements"
                  className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <span>All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  {chapterAnnouncements.map((ann: Announcement) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-xl bg-bg/50 border border-border/60"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[12px] font-bold text-text truncate">
                          {ann.title}
                        </span>
                        <span className="font-mono text-[10px] text-text-mute shrink-0">
                          {formatDate(ann.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-dim line-clamp-2 leading-relaxed">
                        {ann.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chapter Leadership & Campus Advisors */}
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-bold text-[14px] text-text">Chapter Leadership</h3>
            </div>
            <p className="text-[11px] text-text-dim mb-3">
              Have questions, need event support, or want to launch a project? Reach out to your appointed chapter team.
            </p>

            <div className="space-y-3">
              {/* Campus Lead */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg/60 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[12px] font-bold text-[var(--accent)]">
                    {campusLead ? initials(campusLead.fullName) : "CL"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">
                      {campusLead?.fullName || "Campus Lead"}
                    </p>
                    <p className="text-[11px] text-text-dim truncate">
                      {campusLead?.email || "Campus Lead"}
                    </p>
                  </div>
                </div>
                <Badge tone={campusLead ? "orange" : "mute"} className="text-[10px] shrink-0 font-semibold">
                  Campus Lead
                </Badge>
              </div>

              {/* Faculty Coordinator */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg/60 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg border border-border text-[12px] font-bold text-text-dim">
                    {faculty ? initials(faculty.fullName) : "FA"}
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
                <Badge tone="mute" className="text-[10px] shrink-0 font-medium">
                  Faculty Advisor
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. STUDENT DIGITAL PASS MODAL ───────────────────────────────────── */}
      <Dialog
        open={showPassModal}
        onClose={() => setShowPassModal(false)}
        title="Elevates Campus Digital Pass"
        className="max-w-md p-0 overflow-hidden"
      >
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 text-white p-6 rounded-t-xl text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-12 h-32 w-32 rounded-full bg-[var(--accent)]/30 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowPassModal(false)}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative">
            <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase bg-[var(--accent)]/15 px-2.5 py-0.5 rounded-full border border-[var(--accent)]/30">
              {chapterElevatesId} · CAMPUS MEMBER
            </span>

            <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold mt-3 tracking-tight">
              {studentName}
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              {studentTagline}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {chapter.college}
            </p>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="p-6 bg-white text-center space-y-4">
          <div className="inline-block p-4 rounded-2xl bg-white border border-border shadow-xs">
            <QRCode
              value={studentElevatesId}
              size={180}
              bgColor="#ffffff"
              fgColor="#2d2d34"
              level="H"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-base font-extrabold text-text">
                {studentElevatesId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-text-mute hover:text-text transition p-1"
                title="Copy ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-text-dim mt-1.5 max-w-xs mx-auto leading-relaxed">
              Show this QR code to chapter volunteers or coordinators at event entrances for instant attendance verification.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href="/my-qr" onClick={() => setShowPassModal(false)}>
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                Event Passes & Tickets
              </Button>
            </Link>
            <Button
              variant="orange"
              size="sm"
              className="text-xs font-semibold"
              onClick={() => setShowPassModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── 6. EVENT REGISTRATION / TICKET DIALOG ───────────────────────────── */}
      {selectedEventForModal && (
        <EventRegistrationDialog
          open={!!selectedEventForModal}
          onClose={() => setSelectedEventForModal(null)}
          event={selectedEventForModal}
        />
      )}
    </div>
  );
}

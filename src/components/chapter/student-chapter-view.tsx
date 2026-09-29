"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { useStore, showToast } from "@/context/store-context";
import { formatDateTime, cn } from "@/lib/utils";
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
  Project,
} from "@/types";
import {
  QrCode,
  Calendar,
  Layers,
  Clock,
  MapPin,
  Building2,
  UserPlus,
  ArrowRight,
  Copy,
  Check,
  Ticket,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react";

const DEFAULT_CHAPTER_IMAGES: Record<string, string> = {
  ekc: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80",
  mes: "https://images.unsplash.com/photo-1562774053-701939374585?w=600&auto=format&fit=crop&q=80",
  cusat: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&auto=format&fit=crop&q=80",
  calicut: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80",
};

function getChapterCover(ch: {
  name: string;
  slug: string;
  college?: string;
  imageUrl?: string;
  logoUrl?: string;
  customSettings?: Record<string, unknown>;
}) {
  if (ch.imageUrl?.trim()) return ch.imageUrl.trim();
  if (ch.logoUrl?.trim()) return ch.logoUrl.trim();
  const cs = ch.customSettings;
  if (cs?.imageUrl && typeof cs.imageUrl === "string" && cs.imageUrl.trim()) return cs.imageUrl.trim();
  if (cs?.image_url && typeof cs.image_url === "string" && cs.image_url.trim()) return cs.image_url.trim();

  const text = `${ch.name} ${ch.slug} ${ch.college || ""}`.toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_CHAPTER_IMAGES)) {
    if (text.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80";
}

function getEventCover(ev: EventItem) {
  if (ev.posterUrl) return ev.posterUrl;
  if (ev.bannerUrl) return ev.bannerUrl;
  if (ev.thumbnailUrl) return ev.thumbnailUrl;
  const lower = `${ev.title} ${ev.category || ""}`.toLowerCase();
  if (lower.includes("hack") || lower.includes("build")) {
    return "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80";
  }
  if (lower.includes("summit") || lower.includes("talk") || lower.includes("tech")) {
    return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";
  }
  if (lower.includes("design") || lower.includes("ui") || lower.includes("ux")) {
    return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80";
  }
  if (lower.includes("cyber") || lower.includes("security") || lower.includes("code")) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80";
}

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
}: StudentChapterViewProps) {
  const { joinCluster } = useStore();

  // Modal & state management
  const router = useRouter();
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<EventItem | null>(null);
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

  const deptStr = profile?.department || "";
  const matchParen = deptStr.match(/\(([^)]+)\)/);
  const shortDept = matchParen && matchParen[1]
    ? matchParen[1]
    : deptStr.length > 20
    ? deptStr.split(" ").filter((w) => w.length > 2).map((w) => w[0]).join("").toUpperCase()
    : deptStr;
  const yearStr = profile?.academicYear || profile?.year || "";
  const shortYear = yearStr.replace(/Year/i, "Yr").trim();
  const compactStudentTag = [shortDept, shortYear].filter(Boolean).join(" · ") || "Student Member";

  // Filter chapter events
  const chapterEvents = useMemo(() => {
    return store.events.filter((e: EventItem) => e.chapterId === chapter.id);
  }, [store.events, chapter.id]);

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

  // Student registrations
  const myRegistrations = useMemo(() => {
    return store.registrations.filter(
      (r: EventRegistration) => r.userId === session.userId && r.status !== "rejected",
    );
  }, [store.registrations, session.userId]);

  const myRegisteredEventIds = useMemo(() => {
    return new Set(myRegistrations.map((r: EventRegistration) => r.eventId));
  }, [myRegistrations]);

  // Clusters
  const chapterClusters = useMemo(() => {
    return store.clusters.filter((c: Cluster) => c.chapterId === chapter.id);
  }, [store.clusters, chapter.id]);

  const myClusters = useMemo(() => {
    return chapterClusters.filter(
      (c: Cluster) => c.memberIds.includes(session.userId) || c.leaderId === session.userId,
    );
  }, [chapterClusters, session.userId]);

  // Student active projects
  const myProjects = useMemo(() => {
    return store.projects.filter(
      (p: Project) =>
        (p.chapterId === chapter.id || !p.chapterId) &&
        (p.teamIds?.includes(session.userId) || p.mentorId === session.userId)
    );
  }, [store.projects, chapter.id, session.userId]);

  const activeProject = myProjects[0] || null;

  // Next registered event pass
  const nextRegisteredEvent = useMemo(() => {
    if (myRegistrations.length === 0) return null;
    const regEventIds = new Set(myRegistrations.map((r) => r.eventId));
    return (
      upcomingEvents.find((e) => regEventIds.has(e.id)) ||
      chapterEvents.find((e) => regEventIds.has(e.id)) ||
      null
    );
  }, [myRegistrations, upcomingEvents, chapterEvents]);

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

  // Dynamic greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
  }, []);

  const networkChapters = useMemo(() => {
    const active = store.chapters.filter((c) => c.status === "active" || c.status === "onboarding");
    if (active.length >= 4) return active;

    const standardCampuses = [
      { id: "ekc-preview", name: "EKC", slug: "ekc", college: "EKC College of Engineering", memberCount: 248 },
      { id: "mes-preview", name: "MES College", slug: "mes", college: "MES College", memberCount: 180 },
      { id: "cusat-preview", name: "CUSAT", slug: "cusat", college: "Cochin University of Science and Technology", memberCount: 312 },
      { id: "calicut-preview", name: "University of Calicut", slug: "calicut", college: "University of Calicut Campus", memberCount: 430 },
    ];

    const existingSlugs = new Set(store.chapters.map((c) => c.slug));
    const fallbackCampuses = standardCampuses.filter((sc) => !existingSlugs.has(sc.slug));

    return [...store.chapters, ...fallbackCampuses];
  }, [store.chapters]);

  const eventsToDisplay = useMemo(() => {
    if (upcomingEvents.length > 0) return upcomingEvents;
    const openEvents = store.events
      .filter((e) => !isEventEnded(e))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return openEvents.slice(0, 8);
  }, [upcomingEvents, store.events]);

  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const clustersScrollRef = useRef<HTMLDivElement>(null);
  const chaptersScrollRef = useRef<HTMLDivElement>(null);

  const [eventsScrollState, setEventsScrollState] = useState({ canLeft: false, canRight: false });
  const [clustersScrollState, setClustersScrollState] = useState({ canLeft: false, canRight: false });
  const [chaptersScrollState, setChaptersScrollState] = useState({ canLeft: false, canRight: false });

  const scrollSection = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = 350;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const bindTrack = (
      el: HTMLDivElement | null,
      setter: React.Dispatch<React.SetStateAction<{ canLeft: boolean; canRight: boolean }>>
    ) => {
      if (!el) return () => {};

      const updateState = () => {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const canLeft = el.scrollLeft > 8;
        const canRight = maxScroll > 8 && el.scrollLeft < maxScroll - 8;
        setter((prev) => {
          if (prev.canLeft === canLeft && prev.canRight === canRight) return prev;
          return { canLeft, canRight };
        });
      };

      const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.altKey) return;

        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta === 0) return;

        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 1) return;

        // Allow natural page scroll if already at the boundary
        if (delta < 0 && el.scrollLeft <= 2) return;
        if (delta > 0 && el.scrollLeft >= maxScroll - 2) return;

        e.preventDefault();

        // Normalize delta across mice drivers & line modes
        const step = e.deltaMode === 1 ? delta * 35 : delta;
        el.scrollLeft += step;
        updateState();
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("scroll", updateState, { passive: true });
      window.addEventListener("resize", updateState);

      updateState();
      const timer = setTimeout(updateState, 150);

      return () => {
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("scroll", updateState);
        window.removeEventListener("resize", updateState);
        clearTimeout(timer);
      };
    };

    const cleanupEvents = bindTrack(eventsScrollRef.current, setEventsScrollState);
    const cleanupClusters = bindTrack(clustersScrollRef.current, setClustersScrollState);
    const cleanupChapters = bindTrack(chaptersScrollRef.current, setChaptersScrollState);

    return () => {
      cleanupEvents();
      cleanupClusters();
      cleanupChapters();
    };
  }, [eventsToDisplay.length, chapterClusters.length, networkChapters.length]);

  return (
    <div className="space-y-7">
      {/* ── 1. STUDENT IDENTITY HERO ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-gradient-to-br from-white via-[#faf9f6] to-[#f4f1ea] p-6 sm:p-8 md:p-10 shadow-xs">
        {/* Background Campus Photo with seamless blend from right to left */}
        <div
          className="absolute top-0 right-0 bottom-0 w-full sm:w-3/5 lg:w-[55%] pointer-events-none overflow-hidden select-none z-0"
          style={{
            maskImage: "linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0) 100%)",
          }}
        >
          <img
            src={getChapterCover(chapter)}
            alt={chapter.name}
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle gradient overlays to match hero card canvas */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#faf9f6] via-transparent to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent hidden sm:block" />
          <div className="absolute bottom-4 right-6 text-right hidden sm:block">
            <p className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wide">{chapter.college || chapter.name}</p>
            <p className="text-[10px] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] font-medium">{chapter.city ? `${chapter.city} Campus` : "Innovation Hub"}</p>
          </div>
        </div>



        {/* Left Column Content: Greeting, Headline, Subtitle, Actions */}
        <div className="relative z-10 space-y-4 max-w-xl">
          <div>
            <p className="text-sm font-medium text-text-dim">{greeting}</p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              {firstName} 👋
            </h2>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text leading-[1.08]">
            Same campus. <br />
            Bigger <span className="italic font-serif text-[var(--accent)]">possibilities.</span>
          </h1>

          <p className="text-sm sm:text-base text-text-dim font-medium">
             Learning.  Building.  Growing.
          </p>

          {/* Quick Identity Pills */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs hover:bg-[var(--accent-soft)]/50 hover:border-[var(--accent)] transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Digital Pass</span>
              <span className="font-mono text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded">
                {studentElevatesId}
              </span>
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white border border-border/80 text-text-dim shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-text-mute" />
              <span>{chapter.college || chapter.name}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. STUDENT STATUS & SHORTCUTS ───────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-white shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {/* Segment 1: Digital Pass */}
          <button
            type="button"
            onClick={() => setShowPassModal(true)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-colors">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim flex items-center gap-1.5 leading-none mb-1">
                <span>Digital Pass</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active pass" />
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-[var(--accent)] transition-colors font-mono">
                {studentElevatesId} <span className="font-sans font-normal text-text-mute text-[11px]">· View pass</span>
              </p>
            </div>
          </button>

          {/* Segment 2: Active Project */}
          <Link
            href={`/chapter/${slug}/projects`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200/80 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                {activeProject ? "Active Project" : "Campus Projects"}
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-text-dim transition-colors">
                {activeProject ? (
                  <span>
                    {activeProject.title}{" "}
                    <span className="text-[11px] font-normal text-text-mute capitalize">({activeProject.stage})</span>
                  </span>
                ) : (
                  <span>{chapter.projectCount || 4} projects · Browse</span>
                )}
              </p>
            </div>
          </Link>

          {/* Segment 3: Events & Passes */}
          <button
            type="button"
            onClick={() => {
              if (myRegistrations.length > 0) {
                setShowPassModal(true);
              } else {
                eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200/80 transition-colors">
              <Ticket className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                {myRegistrations.length > 0 ? "My Passes" : "Events"}
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-text-dim transition-colors">
                {nextRegisteredEvent ? (
                  <span>{nextRegisteredEvent.title} · Registered</span>
                ) : myRegistrations.length > 0 ? (
                  <span>{myRegistrations.length} pass{myRegistrations.length > 1 ? "es" : ""} ready</span>
                ) : (
                  <span>{upcomingEvents.length} upcoming events</span>
                )}
              </p>
            </div>
          </button>

          {/* Segment 4: Campus Standing */}
          <Link
            href={`/chapter/${slug}/clusters`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200/80 transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1 flex items-center gap-1">
                <span>Verified Student</span>
                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-text-dim transition-colors">
                {myClusters.length > 0 ? `${myClusters[0].name} · ${compactStudentTag}` : compactStudentTag}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. UPCOMING EVENTS (HORIZONTAL SIDE-SCROLL) ──────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
            Upcoming Events
          </h2>
        </div>

        {eventsToDisplay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-white">
            <Calendar className="w-8 h-8 mx-auto text-text-mute mb-2" />
            <p className="text-sm font-semibold text-text">No upcoming events scheduled right now</p>
            <p className="text-xs text-text-dim mt-1">Check back soon for workshops, hackathons, and tech talks!</p>
          </div>
        ) : (
          <div className="relative group/carousel">
            {eventsScrollState.canLeft && (
              <button
                type="button"
                onClick={() => scrollSection(eventsScrollRef, "left")}
                className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
                aria-label="Previous events"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
              </button>
            )}
            {eventsScrollState.canRight && (
              <button
                type="button"
                onClick={() => scrollSection(eventsScrollRef, "right")}
                className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
                aria-label="Next events"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
              </button>
            )}

            <div
              ref={eventsScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pt-2 pb-6 px-1 sm:px-2 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
            {eventsToDisplay.map((ev) => {
              const isRegistered = myRegisteredEventIds.has(ev.id);
              const ongoing = isEventOngoing(ev);
              const coverImg = getEventCover(ev);

              return (
                <div
                  key={ev.id}
                  className="w-[295px] sm:w-[325px] shrink-0 rounded-[22px] border border-black/[0.08] bg-white overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.16),0_10px_20px_-8px_rgba(242,100,48,0.18)] hover:-translate-y-2 hover:border-[var(--accent)]/35 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between group"
                >
                  <div>
                    {/* Event Cover / Visual Banner */}
                    <div className="relative aspect-[16/9] w-full bg-neutral-900 overflow-hidden">
                      <img
                        src={coverImg}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                      {/* Overlaid Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/95 text-text backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-white/60">
                          {ev.category || "Workshop"}
                        </span>
                        {ongoing ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-white animate-pulse shadow-[0_4px_12px_rgba(242,100,48,0.4)]">
                            Happening Now
                          </span>
                        ) : isRegistered ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]">
                            Registered
                          </span>
                        ) : null}
                      </div>

                      {/* Overlaid Title on bottom of cover */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="font-[family-name:var(--font-display)] text-base font-bold text-white line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {ev.title}
                        </p>
                      </div>
                    </div>

                    {/* Event Meta Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-text-dim">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate">{formatDateTime(ev.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-dim">
                        <MapPin className="w-3.5 h-3.5 text-text-mute shrink-0" />
                        <span className="truncate">{ev.venue || chapter.college || chapter.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-border/60 bg-gradient-to-b from-white to-neutral-50/50">
                    {isRegistered ? (
                      <Button
                        size="sm"
                        variant="orange"
                        className="h-8.5 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(242,100,48,0.3)] hover:shadow-[0_6px_18px_rgba(242,100,48,0.45)] active:translate-y-0.5 transition-all cursor-pointer"
                        onClick={() => setSelectedEventForModal(ev)}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Show Pass</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="orange"
                        className="h-8.5 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(242,100,48,0.3)] hover:shadow-[0_6px_18px_rgba(242,100,48,0.45)] active:translate-y-0.5 transition-all cursor-pointer"
                        onClick={() => setSelectedEventForModal(ev)}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </Button>
                    )}
                    <Link href={`/chapter/${slug}/events/${ev.id}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8.5 text-xs font-semibold px-3.5 bg-white border border-border/80 hover:bg-neutral-50 hover:border-neutral-300 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </section>

      {/* ── 4. YOUR LEARNING / CLUSTERS (HORIZONTAL SIDE-SCROLL, HIDDEN IF NO CLUSTERS) ─ */}
      {chapterClusters.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
              Your Learning
            </h2>
          </div>

          <div className="relative group/carousel">
            {clustersScrollState.canLeft && (
              <button
                type="button"
                onClick={() => scrollSection(clustersScrollRef, "left")}
                className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
                aria-label="Previous clusters"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
              </button>
            )}
            {clustersScrollState.canRight && (
              <button
                type="button"
                onClick={() => scrollSection(clustersScrollRef, "right")}
                className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
                aria-label="Next clusters"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
              </button>
            )}

            <div
              ref={clustersScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pt-2 pb-6 px-1 sm:px-2 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
            {chapterClusters.map((cluster) => {
              const theme = getClusterTheme(cluster.name, cluster.slug);
              const isJoined = cluster.memberIds.includes(session.userId) || cluster.leaderId === session.userId;

              return (
                <div
                  key={cluster.id}
                  className="w-[270px] sm:w-[300px] shrink-0 rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.16),0_10px_20px_-8px_rgba(242,100,48,0.18)] hover:-translate-y-2 hover:border-[var(--accent)]/35 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-wide",
                          theme.badgeColor,
                        )}
                      >
                        {theme.category}
                      </span>
                      {isJoined && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3" />
                          Enrolled
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text group-hover:text-[var(--accent)] transition-colors">
                        {cluster.name}
                      </h3>
                      <p className="text-xs text-text-dim mt-1 line-clamp-2 leading-relaxed">
                        {cluster.description || `${cluster.memberIds.length} campus builders collaborating on open source & domain projects.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-text-mute">
                      <Users className="w-3.5 h-3.5" />
                      <span>{cluster.memberIds.length} builders enrolled</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    {isJoined ? (
                      <Link
                        href={`/chapter/${slug}/clusters`}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 w-full justify-between"
                      >
                        <span>Open Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className={cn(
                          "h-8 text-xs font-semibold w-full",
                          !isDiscordConnected
                            ? "text-[#5865F2] hover:bg-[#5865F2]/10"
                            : "text-[var(--accent)] hover:bg-[var(--accent-soft)]",
                        )}
                        disabled={joiningClusterId === cluster.id}
                        onClick={() => handleJoinCluster(cluster)}
                      >
                        {!isDiscordConnected ? (
                          <>
                            <DiscordIcon className="w-3.5 h-3.5 mr-1" />
                            Link to Join
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
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
        </div>
        </section>
      )}

      {/* ── 5. EXPLORE CHAPTERS (CURRENT CHAPTERS NETWORK) ────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
            Explore Chapters
          </h2>
        </div>

        <div className="relative group/carousel">
          {chaptersScrollState.canLeft && (
            <button
              type="button"
              onClick={() => scrollSection(chaptersScrollRef, "left")}
              className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
              aria-label="Previous chapters"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
            </button>
          )}
          {chaptersScrollState.canRight && (
            <button
              type="button"
              onClick={() => scrollSection(chaptersScrollRef, "right")}
              className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/10 bg-white/95 backdrop-blur-md hover:bg-white text-text shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:border-[var(--accent)] cursor-pointer"
              aria-label="Next chapters"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text" />
            </button>
          )}

          <div
            ref={chaptersScrollRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pt-2 pb-6 px-1 sm:px-2 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
          {networkChapters.map((ch) => {
            const cover = getChapterCover(ch);
            const isCurrentChapter = ch.slug === slug || ch.id === chapter.id;
            const memCount = store.profiles.filter((p) => p.chapterId === ch.id).length || ch.memberCount || 240;

            return (
              <Link
                key={ch.id}
                href={`/chapter/${ch.slug}`}
                className="w-[250px] sm:w-[280px] shrink-0 rounded-[22px] border border-black/[0.08] bg-white overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.16),0_10px_20px_-8px_rgba(242,100,48,0.18)] hover:-translate-y-2 hover:border-[var(--accent)]/35 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between group cursor-pointer"
              >
                {/* Top Campus Photo */}
                <div className="relative h-32 w-full bg-neutral-900 overflow-hidden">
                  <img
                    src={cover}
                    alt={ch.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  {isCurrentChapter && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-white shadow-[0_4px_12px_rgba(242,100,48,0.4)]">
                      Your Campus
                    </span>
                  )}
                </div>

                {/* Chapter Details & Arrow */}
                <div className="p-4 flex items-center justify-between gap-2 border-t border-border/50 bg-gradient-to-b from-white to-neutral-50/40">
                  <div className="min-w-0">
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text truncate group-hover:text-[var(--accent)] transition-colors">
                      {ch.name}
                    </h3>
                    <p className="text-[11px] text-text-dim mt-0.5">
                      {memCount} members
                    </p>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-border/80 shadow-xs text-text-mute group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] group-hover:shadow-[0_4px_12px_rgba(242,100,48,0.35)] transition-all">
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      </section>

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

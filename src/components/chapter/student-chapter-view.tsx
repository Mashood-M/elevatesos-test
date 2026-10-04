"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { Dialog } from "@/components/ui/dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { useStore, showToast } from "@/context/store-context";
import { formatDateTime, cn } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import { isEventOngoing, isEventEnded, isOpenToAllEvent } from "@/lib/events";
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
  ArrowUpRight,
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
      badgeColor: "bg-[#2d2d34] text-white border-[#2d2d34]",
      accentBg: "bg-[#414066]",
    };
  }
  if (text.includes("web") || text.includes("frontend") || text.includes("fullstack") || text.includes("dev") || text.includes("software")) {
    return {
      category: "Web & Software",
      badgeColor: "bg-[#414066] text-white border-[#414066]",
      accentBg: "bg-[#414066]",
    };
  }
  if (text.includes("cloud") || text.includes("devops") || text.includes("linux") || text.includes("security") || text.includes("cyber")) {
    return {
      category: "Cloud & Security",
      badgeColor: "bg-[#5f7560] text-white border-[#5f7560]",
      accentBg: "bg-[#5f7560]",
    };
  }
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("product") || text.includes("creative")) {
    return {
      category: "Product & UI/UX",
      badgeColor: "bg-[#f26430] text-white border-[#f26430]",
      accentBg: "bg-[#f26430]",
    };
  }
  return {
    category: "Specialized Track",
    badgeColor: "bg-[#2d2d34] text-white border-[#2d2d34]",
    accentBg: "bg-[#f26430]",
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
      .filter((e) => {
        if (isEventEnded(e)) return false;
        if (e.chapterId === chapter.id) return true;
        if (isOpenToAllEvent(e)) return true;
        return false;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return openEvents.slice(0, 8);
  }, [upcomingEvents, store.events, chapter.id]);

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

  const handleChapterClick = (ch: {
    id: string;
    name: string;
    slug: string;
    college?: string;
  }) => {
    const realCh = store.chapters.find((c) => c.slug === ch.slug || c.id === ch.id);
    const targetChapterId = realCh?.id || ch.id;

    const chOpenEvents = store.events.filter((e: EventItem) => {
      const isMatch = e.chapterId === targetChapterId || e.chapterId === ch.id;
      if (!isMatch) return false;
      const isNotEnded = !isEventEnded(e);
      const isOngoingOrUpcoming = isEventOngoing(e) || new Date(e.startsAt).getTime() >= Date.now();
      const isPublished = e.status !== "draft" && e.status !== "cancelled";
      return isNotEnded && isOngoingOrUpcoming && isPublished;
    });

    if (chOpenEvents.length > 0) {
      if (ch.slug === slug || ch.id === chapter.id) {
        eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        showToast(`Showing ${chOpenEvents.length} open event${chOpenEvents.length > 1 ? "s" : ""} at ${ch.name}`, "info");
      } else {
        router.push(`/chapter/${ch.slug}`);
      }
    } else {
      showToast(`No open events currently at ${ch.name}`, "info");
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

        if (delta < 0 && el.scrollLeft <= 2) return;
        if (delta > 0 && el.scrollLeft >= maxScroll - 2) return;

        e.preventDefault();

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
    <div className="space-y-6 pb-12">
      {/* ── 1. STUDENT IDENTITY ARCHITECTURAL HERO ───────────────────────── */}
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
        <div
          className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-12 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                STUDENT PASS // {studentElevatesId}
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapterElevatesId} · {chapter.college || chapter.name}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              {greeting} {firstName}.
              <span className="block text-[#f26430] text-xl sm:text-2xl md:text-3xl font-bold mt-0.5">
                LEARN, BUILD, GROW
              </span>
            </h1>

          

            {/* Identity Tags */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="group inline-flex items-center gap-1.5 rounded-[6px] border border-[#2d2d34] bg-white px-2.5 py-1 text-xs font-mono font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#faf9f6] transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-[#f26430]" />
                <span>Pass:</span>
                <span className="text-[#f26430]">{studentElevatesId}</span>
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-mono text-[#52525b] bg-[#faf9f6] border border-[#2d2d34]/15">
                <Building2 className="w-3.5 h-3.5 text-[#414066]" />
                <span>{chapter.college || chapter.name}</span>
              </span>

              {compactStudentTag && (
                <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-mono text-[#52525b] bg-[#faf9f6] border border-[#2d2d34]/15">
                  <Award className="w-3.5 h-3.5 text-[#5f7560]" />
                  <span>{compactStudentTag}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Pass</span>
            </button>
            <button
              type="button"
              onClick={() => {
                eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="h-9 px-3.5 rounded-[8px] bg-[#2d2d34] hover:bg-[#1f1f24] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
              <span>Events</span>
            </button>
            <Link href={`/chapter/${slug}/clusters`}>
              <button
                type="button"
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#414066]" />
                <span>Clusters</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. STUDENT STATUS & SHORTCUTS (4 TACTILE BLOCKS) ───────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Shortcut 01: Digital Pass */}
        <button
          type="button"
          onClick={() => setShowPassModal(true)}
          className="group text-left relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider flex items-center gap-1">
              01 // DIGITAL PASS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <QrCode className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-mono text-sm font-bold text-[#2d2d34] truncate">
            {studentElevatesId}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Active pass · View QR</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Shortcut 02: Active Project */}
        <Link
          href={`/chapter/${slug}/projects`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // PROJECTS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            {activeProject ? activeProject.title : `${chapter.projectCount || 4} Active Labs`}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{activeProject ? `Stage: ${activeProject.stage}` : "Browse campus repos"}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Shortcut 03: Events & Passes */}
        <button
          type="button"
          onClick={() => {
            if (myRegistrations.length > 0) {
              setShowPassModal(true);
            } else {
              eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }}
          className="group text-left relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // MY PASSES
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Ticket className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            {nextRegisteredEvent ? nextRegisteredEvent.title : `${myRegistrations.length} Passes Ready`}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{nextRegisteredEvent ? "Registered pass ready" : `${upcomingEvents.length} events open`}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Shortcut 04: Verified Student Standing */}
        <Link
          href={`/chapter/${slug}/clusters`}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // VERIFIED STATUS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            {myClusters.length > 0 ? myClusters[0].name : "Student Member"}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <Check className="w-3 h-3 text-[#5f7560] stroke-[2.5]" />
            <span className="truncate">{compactStudentTag}</span>
          </div>
        </Link>
      </section>

      {/* ── 3. UPCOMING SESSIONS & LABS (SIDE-SCROLL) ────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
              01 // UPCOMING SESSIONS & LABS
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {eventsToDisplay.length}
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

        {eventsToDisplay.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#2d2d34]/20 p-8 text-center bg-white shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Calendar className="w-8 h-8 mx-auto text-[#71717a] mb-2 opacity-60" />
            <p className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
              NO UPCOMING SESSIONS SCHEDULED
            </p>
            <p className="text-xs text-[#71717a] mt-1">
              Check back soon for workshops, hackathons, and symposiums!
            </p>
          </div>
        ) : (
          <div className="relative group/carousel">
            {eventsScrollState.canLeft && (
              <button
                type="button"
                onClick={() => scrollSection(eventsScrollRef, "left")}
                className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Previous events"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {eventsScrollState.canRight && (
              <button
                type="button"
                onClick={() => scrollSection(eventsScrollRef, "right")}
                className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Next events"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div
              ref={eventsScrollRef}
              className="flex gap-4 overflow-x-auto pt-1 pb-4 px-0.5 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {eventsToDisplay.map((ev) => {
                const isRegistered = myRegisteredEventIds.has(ev.id);
                const ongoing = isEventOngoing(ev);
                const coverImg = getEventCover(ev);
                const eventDate = new Date(ev.startsAt);
                const month = !isNaN(eventDate.getTime())
                  ? eventDate.toLocaleString("en-US", { month: "short" }).toUpperCase()
                  : "DATE";
                const day = !isNaN(eventDate.getTime()) ? eventDate.getDate() : "--";
                const time = !isNaN(eventDate.getTime())
                  ? eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                  : "";

                return (
                  <div
                    key={ev.id}
                    className="w-[305px] sm:w-[330px] shrink-0 rounded-[12px] border border-[#2d2d34]/20 bg-white overflow-hidden shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Left-Right Split Event Card */}
                      <div className="flex h-[135px]">
                        {/* Poster Column */}
                        <div className="w-[105px] sm:w-[115px] shrink-0 relative overflow-hidden bg-[#faf9f6] border-r border-[#2d2d34]/15">
                          <img
                            src={coverImg}
                            alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                          {/* Date stamp in poster */}
                          <div className="absolute top-2 left-2 bg-[#2d2d34] text-white px-1.5 py-0.5 rounded-[4px] font-mono text-[9px] font-bold text-center border border-[#2d2d34] shadow-[1px_1px_0px_#f26430]">
                            <div>{month}</div>
                            <div className="text-xs font-black leading-none">{day}</div>
                          </div>

                          {ongoing ? (
                            <span className="absolute bottom-2 left-2 right-2 text-center text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-[#f26430] text-white">
                              LIVE NOW
                            </span>
                          ) : isRegistered ? (
                            <span className="absolute bottom-2 left-2 right-2 text-center text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-[#5f7560] text-white">
                              REGISTERED
                            </span>
                          ) : null}
                        </div>

                        {/* Content Column */}
                        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 inline-block">
                              {ev.category || "Workshop"}
                            </span>

                            <Link href={`/chapter/${slug}/events/${ev.id}`} className="block mt-1 group/title">
                              <h3 className="font-[family-name:var(--font-display)] text-xs sm:text-[13px] font-bold text-[#2d2d34] tracking-tight leading-snug line-clamp-2 group-hover/title:text-[#f26430] transition-colors">
                                {ev.title}
                              </h3>
                            </Link>
                          </div>

                          <div className="space-y-1 text-[10px] font-mono text-[#71717a] pt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#f26430] shrink-0" />
                              <span className="truncate">{time || formatDateTime(ev.startsAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#414066] shrink-0" />
                              <span className="truncate max-w-[130px]">{ev.venue || chapter.college || chapter.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-2 border-t border-[#2d2d34]/15 bg-[#faf9f6] flex items-center justify-between gap-2">
                      {isRegistered ? (
                        <button
                          type="button"
                          onClick={() => setSelectedEventForModal(ev)}
                          className="h-7 px-2.5 rounded-[6px] bg-[#5f7560] hover:bg-[#4d604e] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex-1 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Show Pass</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedEventForModal(ev)}
                          className="h-7 px-2.5 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex-1 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Ticket className="w-3 h-3" />
                          <span>Register</span>
                        </button>
                      )}
                      <Link href={`/chapter/${slug}/events/${ev.id}`}>
                        <button
                          type="button"
                          className="h-7 px-2.5 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Details</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── 4. INTEREST CLUSTERS / DOMAIN TRACKS (SIDE-SCROLL) ─────────────── */}
      {chapterClusters.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#414066]" />
                02 // DOMAIN INTEREST CLUSTERS
              </span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                {chapterClusters.length}
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

          <div className="relative group/carousel">
            {clustersScrollState.canLeft && (
              <button
                type="button"
                onClick={() => scrollSection(clustersScrollRef, "left")}
                className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Previous clusters"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {clustersScrollState.canRight && (
              <button
                type="button"
                onClick={() => scrollSection(clustersScrollRef, "right")}
                className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Next clusters"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div
              ref={clustersScrollRef}
              className="flex gap-4 overflow-x-auto pt-1 pb-4 px-0.5 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {chapterClusters.map((cluster) => {
                const theme = getClusterTheme(cluster.name, cluster.slug);
                const isJoined = cluster.memberIds.includes(session.userId) || cluster.leaderId === session.userId;

                return (
                  <div
                    key={cluster.id}
                    className="w-[270px] sm:w-[295px] shrink-0 rounded-[12px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            theme.badgeColor,
                          )}
                        >
                          {theme.category}
                        </span>
                        {isJoined && (
                          <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#5f7560] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                            <Check className="w-2.5 h-2.5" />
                            Enrolled
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] group-hover:text-[#f26430] transition-colors">
                          {cluster.name}
                        </h3>
                        <p className="text-xs text-[#71717a] mt-1 line-clamp-2 leading-relaxed">
                          {cluster.description || `${cluster.memberIds.length} campus builders collaborating on open source & domain projects.`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#71717a]">
                        <Users className="w-3.5 h-3.5 text-[#414066]" />
                        <span>{cluster.memberIds.length} builders enrolled</span>
                      </div>
                    </div>

                    <div className="pt-3.5 mt-3 border-t border-[#2d2d34]/15 flex items-center justify-between">
                      {isJoined ? (
                        <Link
                          href={`/chapter/${slug}/clusters`}
                          className="font-mono text-xs font-bold text-[#f26430] hover:underline inline-flex items-center justify-between w-full uppercase tracking-wider"
                        >
                          <span>Open Track</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={joiningClusterId === cluster.id}
                          onClick={() => handleJoinCluster(cluster)}
                          className="w-full h-8 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          {!isDiscordConnected ? (
                            <>
                              <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
                              <span>Link Discord to Join</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5 text-[#f26430]" />
                              <span>Join Track</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. CAMPUS NETWORK (OTHER CHAPTERS) ─────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2d2d34]" />
              03 // CAMPUS NETWORK
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {networkChapters.length}
            </span>
          </div>
        </div>

        <div className="relative group/carousel">
          {chaptersScrollState.canLeft && (
            <button
              type="button"
              onClick={() => scrollSection(chaptersScrollRef, "left")}
              className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
              aria-label="Previous chapters"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {chaptersScrollState.canRight && (
            <button
              type="button"
              onClick={() => scrollSection(chaptersScrollRef, "right")}
              className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-[#2d2d34] bg-white text-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:translate-x-0.5 flex items-center justify-center transition-all cursor-pointer"
              aria-label="Next chapters"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div
            ref={chaptersScrollRef}
            className="flex gap-4 overflow-x-auto pt-1 pb-4 px-0.5 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {networkChapters.map((ch) => {
              const cover = getChapterCover(ch);
              const isCurrentChapter = ch.slug === slug || ch.id === chapter.id;
              const memCount = store.profiles.filter((p) => p.chapterId === ch.id).length || ch.memberCount || 240;

              const realCh = store.chapters.find((c) => c.slug === ch.slug || c.id === ch.id);
              const targetChapterId = realCh?.id || ch.id;

              const chOpenEvents = store.events.filter((e: EventItem) => {
                const isMatch = e.chapterId === targetChapterId || e.chapterId === ch.id;
                if (!isMatch) return false;
                const isNotEnded = !isEventEnded(e);
                const isOngoingOrUpcoming = isEventOngoing(e) || new Date(e.startsAt).getTime() >= Date.now();
                const isPublished = e.status !== "draft" && e.status !== "cancelled";
                return isNotEnded && isOngoingOrUpcoming && isPublished;
              });

              return (
                <div
                  key={ch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleChapterClick(ch)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleChapterClick(ch);
                    }
                  }}
                  className="w-[250px] sm:w-[275px] shrink-0 rounded-[12px] border border-[#2d2d34]/20 bg-white overflow-hidden shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between group cursor-pointer text-left select-none"
                >
                  {/* Campus Cover Photo */}
                  <div className="relative h-28 w-full bg-neutral-900 overflow-hidden">
                    <img
                      src={cover}
                      alt={ch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {isCurrentChapter && (
                      <span className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#f26430] text-white border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                        YOUR CAMPUS
                      </span>
                    )}
                    {chOpenEvents.length > 0 && !isCurrentChapter && (
                      <span className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#5f7560] text-white border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                        {chOpenEvents.length} OPEN SESSIONS
                      </span>
                    )}
                  </div>

                  {/* Campus Details */}
                  <div className="p-3 border-t border-[#2d2d34]/15 bg-[#faf9f6] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-[family-name:var(--font-display)] text-xs font-bold text-[#2d2d34] truncate group-hover:text-[#f26430] transition-colors">
                        {ch.name}
                      </h3>
                      <p className="font-mono text-[10px] text-[#71717a] mt-0.5 truncate">
                        {memCount} members {chOpenEvents.length === 0 ? "· No open sessions" : ""}
                      </p>
                    </div>

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-white border border-[#2d2d34]/20 shadow-[1px_1px_0px_#2d2d34] text-[#2d2d34] group-hover:bg-[#f26430] group-hover:text-white transition-all">
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. STUDENT DIGITAL PASS MODAL ───────────────────────────────────── */}
      <Dialog
        open={showPassModal}
        onClose={() => setShowPassModal(false)}
        title="Elevates Campus Digital Pass"
        className="max-w-md p-0 overflow-hidden rounded-[16px] border border-[#2d2d34] shadow-[4px_4px_0px_#2d2d34]"
      >
        <div className="bg-[#2d2d34] text-white p-5 text-center relative overflow-hidden border-b border-[#2d2d34]">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#f26430]/15 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowPassModal(false)}
            className="absolute top-3.5 right-3.5 text-white/60 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative">
            <span className="font-mono text-[9px] font-bold tracking-widest text-white uppercase bg-[#f26430] px-2.5 py-0.5 rounded border border-[#2d2d34] shadow-[1px_1px_0px_#f26430]">
              {chapterElevatesId} · CAMPUS MEMBER
            </span>

            <h3 className="font-[family-name:var(--font-display)] text-lg font-black mt-2.5 tracking-tight">
              {studentName}
            </h3>
            <p className="font-mono text-[11px] text-white/70 mt-0.5">
              {studentTagline}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {chapter.college}
            </p>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="p-6 bg-white text-center space-y-4">
          <div className="inline-block p-4 rounded-[12px] bg-white border border-[#2d2d34]/20 shadow-[2px_2px_0px_#2d2d34]">
            <QRCode
              value={studentElevatesId}
              size={170}
              bgColor="#ffffff"
              fgColor="#2d2d34"
              level="H"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-base font-black text-[#2d2d34]">
                {studentElevatesId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[#71717a] hover:text-[#2d2d34] transition p-1 cursor-pointer"
                title="Copy ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[#71717a] mt-1 max-w-xs mx-auto leading-relaxed">
              Show this QR code at campus check-in desks for instant attendance verification.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2.5">
            <Link href="/my-qr" onClick={() => setShowPassModal(false)}>
              <button
                type="button"
                className="h-8 px-3.5 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] cursor-pointer"
              >
                Passes & Tickets
              </button>
            </Link>
            <button
              type="button"
              className="h-8 px-4 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] cursor-pointer"
              onClick={() => setShowPassModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      </Dialog>

      {/* ── 7. EVENT REGISTRATION / TICKET DIALOG ───────────────────────────── */}
      {selectedEventForModal && (
        <EventRegistrationDialog
          open={Boolean(selectedEventForModal)}
          onClose={() => setSelectedEventForModal(null)}
          event={selectedEventForModal}
        />
      )}
    </div>
  );
}

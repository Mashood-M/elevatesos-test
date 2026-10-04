"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore, showToast } from "@/context/store-context";
import { isOpenToAllEvent, isEventVisibleToUser, isEventOngoing, isEventEnded } from "@/lib/events";
import { isHqRole } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import type { EventItem } from "@/types";
import {
  Calendar,
  Clock,
  MapPin,
  Layers,
  Compass,
  ArrowRight,
  Building2,
  Ticket,
  Key,
  ChevronLeft,
  ChevronRight,
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
  return "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=600&auto=format&fit=crop&q=80";
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

const emptySubscribe = () => () => {};

export default function ChapterIndexPage() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem | null>(null);
  const router = useRouter();
  const { store, hydrated } = useStore();
  const { session, profile } = useCurrentUser();

  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const chaptersScrollRef = useRef<HTMLDivElement>(null);

  const [eventsScrollState, setEventsScrollState] = useState({ canLeft: false, canRight: false });
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
      router.push(`/chapter/${ch.slug}`);
    } else {
      showToast(`No open events currently at ${ch.name}`, "info");
    }
  };

  useEffect(() => {
    if (!hydrated) return;

    // HQ roles redirect to HQ dashboard
    if (isHqRole(session.roleKey)) {
      router.replace("/hq");
      return;
    }

    // If student has an assigned chapter, redirect to their specific chapter dashboard
    if (session.chapterId) {
      const assignedChapter = store.chapters.find((c) => c.id === session.chapterId || c.slug === session.chapterId);
      if (assignedChapter?.slug) {
        router.replace(`/chapter/${assignedChapter.slug}`);
      }
    }
  }, [router, session, store.chapters, hydrated]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
  }, []);

  const studentName = profile?.fullName || "Student Member";
  const firstName = studentName.split(" ")[0] || "Member";

  // Independent Student Hub (no chapter assigned) — privacy preserving, open-to-all events only
  const openEvents = useMemo(() => {
    return store.events
      .filter((e) => isOpenToAllEvent(e) && isEventVisibleToUser(e, session.chapterId, session.roleKey))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [store.events, session.chapterId, session.roleKey]);

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
    const cleanupChapters = bindTrack(chaptersScrollRef.current, setChaptersScrollState);

    return () => {
      cleanupEvents();
      cleanupChapters();
    };
  }, [openEvents.length, networkChapters.length]);

  if (!mounted || !hydrated) {
    return <ContentSkeleton />;
  }

  const assignedChapter = session.chapterId
    ? store.chapters.find((c) => c.id === session.chapterId || c.slug === session.chapterId)
    : null;

  if (session.chapterId && assignedChapter?.slug) {
    return <ContentSkeleton />;
  }

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
                CAMPUS NETWORK // INDEPENDENT HUB
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {networkChapters.length} University Chapters
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              {greeting} {firstName}.
              <span className="block text-[#f26430] text-xl sm:text-2xl md:text-3xl font-bold mt-0.5">
                Same Campus. Exponential Reach.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2 text-xs sm:text-[13px] font-medium text-[#52525b] leading-relaxed max-w-xl">
              Connect to your university innovation chapter, join peer tracks, or register for open-to-all cross-campus hackathons and symposiums.
            </p>

            {/* Status Pills */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="group inline-flex items-center gap-1.5 rounded-[6px] border border-[#2d2d34] bg-white px-2.5 py-1 text-xs font-mono font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#faf9f6] transition cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-[#f26430]" />
                <span>Join with Code</span>
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-mono text-[#52525b] bg-[#faf9f6] border border-[#2d2d34]/15">
                <Building2 className="w-3.5 h-3.5 text-[#414066]" />
                <span>Independent Explorer</span>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-4 h-4" />
              <span>Join Chapter</span>
            </button>
            <button
              type="button"
              onClick={() => {
                eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="h-9 px-3.5 rounded-[8px] bg-[#2d2d34] hover:bg-[#1f1f24] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
              <span>Browse Events</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. STUDENT STATUS & SHORTCUTS (4 TACTILE BLOCKS) ───────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Shortcut 01: Join Chapter */}
        <button
          type="button"
          onClick={() => setIsJoinModalOpen(true)}
          className="group text-left relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // CHAPTER ACCESS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            Join Campus Chapter
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Enter invite code</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Shortcut 02: Projects */}
        <Link
          href="/events"
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
            {store.projects.length || 12} Projects Active
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Explore open source repos</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Shortcut 03: Open Events */}
        <button
          type="button"
          onClick={() => {
            eventsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
          className="group text-left relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // OPEN SESSIONS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            {openEvents.length} Sessions Open
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Open-to-all registrations</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Shortcut 04: Campus Network */}
        <button
          type="button"
          onClick={() => {
            chaptersScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
          className="group text-left relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // CAMPUS NETWORK
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Compass className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] truncate">
            {networkChapters.length} Chapters
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Explore ecosystem</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </section>

      {/* ── 3. UPCOMING OPEN EVENTS (SIDE-SCROLL) ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
              01 // UPCOMING OPEN SESSIONS
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {openEvents.length}
            </span>
          </div>
          <Link
            href="/events"
            className="font-mono text-[11px] font-bold text-[#f26430] hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {openEvents.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#2d2d34]/20 p-8 text-center bg-white shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Calendar className="w-8 h-8 mx-auto text-[#71717a] mb-2 opacity-60" />
            <p className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
              NO OPEN SESSIONS SCHEDULED RIGHT NOW
            </p>
            <p className="text-xs text-[#71717a] mt-1">
              Check back soon for cross-campus hackathons, workshops, and tech talks!
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
              {openEvents.map((ev) => {
                const ongoing = isEventOngoing(ev);
                const coverImg = getEventCover(ev);
                const evChapter = store.chapters.find((c) => c.id === ev.chapterId);
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

                          {/* Date stamp */}
                          <div className="absolute top-2 left-2 bg-[#2d2d34] text-white px-1.5 py-0.5 rounded-[4px] font-mono text-[9px] font-bold text-center border border-[#2d2d34] shadow-[1px_1px_0px_#f26430]">
                            <div>{month}</div>
                            <div className="text-xs font-black leading-none">{day}</div>
                          </div>

                          {ongoing && (
                            <span className="absolute bottom-2 left-2 right-2 text-center text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-[#f26430] text-white">
                              LIVE NOW
                            </span>
                          )}
                        </div>

                        {/* Content Column */}
                        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 inline-block">
                              {ev.category || "Open Session"}
                            </span>

                            <Link
                              href={evChapter ? `/chapter/${evChapter.slug}/events/${ev.id}` : `/events`}
                              className="block mt-1 group/title"
                            >
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
                              <span className="truncate max-w-[130px]">{ev.venue || evChapter?.name || "Campus Venue"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-2 border-t border-[#2d2d34]/15 bg-[#faf9f6] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEventForReg(ev)}
                        className="h-7 px-2.5 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex-1 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Ticket className="w-3 h-3" />
                        <span>Register</span>
                      </button>
                      <Link href={evChapter ? `/chapter/${evChapter.slug}/events/${ev.id}` : `/events`}>
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

      {/* ── 4. EXPLORE CHAPTERS (CURRENT CHAPTERS NETWORK) ────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2d2d34]" />
              02 // CAMPUS NETWORK
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {networkChapters.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="font-mono text-[11px] font-bold text-[#f26430] hover:underline inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer"
          >
            <span>Join with Code</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
                  {/* Campus Photo */}
                  <div className="relative h-28 w-full bg-neutral-900 overflow-hidden">
                    <img
                      src={cover}
                      alt={ch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {chOpenEvents.length > 0 && (
                      <span className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#5f7560] text-white border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                        {chOpenEvents.length} OPEN SESSIONS
                      </span>
                    )}
                  </div>

                  {/* Chapter Details */}
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

      {/* ── 5. MODALS ──────────────────────────────────────────────────────── */}
      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <EventRegistrationDialog
        open={Boolean(selectedEventForReg)}
        onClose={() => setSelectedEventForReg(null)}
        event={selectedEventForReg}
      />
    </div>
  );
}

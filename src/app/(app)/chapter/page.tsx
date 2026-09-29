"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80"
            alt="Campus Architecture"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle gradient overlays to match hero card canvas */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#faf9f6] via-transparent to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent hidden sm:block" />
          <div className="absolute bottom-4 right-6 text-right hidden sm:block">
            <p className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wide">Elevates Network</p>
            <p className="text-[10px] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] font-medium">Campus Innovation Ecosystem</p>
          </div>
        </div>

        {/* Top Floating Quote Pill */}
        <div className="relative z-10 flex justify-end mb-2 sm:mb-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/90 backdrop-blur-md px-3.5 py-1.5 shadow-2xs text-xs text-text-dim max-w-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-bold text-[10px]">
              💡
            </span>
            <span className="truncate">Ideas turn into impact when you find the right people.</span>
            <ArrowRight className="w-3 h-3 text-text-mute shrink-0" />
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
            Keep learning. Keep building. Keep growing.
          </p>

          {/* Quick Actions & Independent Badge */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Button
              variant="orange"
              size="sm"
              className="rounded-full px-4 h-9 text-xs font-semibold shadow-2xs flex items-center gap-2 cursor-pointer"
              onClick={() => setIsJoinModalOpen(true)}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Join Chapter with Code</span>
            </Button>

            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white border border-border/80 text-text-dim shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-text-mute" />
              <span>Independent Student</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. STUDENT STATUS & SHORTCUTS ───────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-white shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {/* Segment 1: Join Chapter / Access */}
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-colors">
              <Key className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                Campus Chapter
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-[var(--accent)] transition-colors">
                Join with invite code <span className="text-[11px] font-normal text-text-mute">· Enter</span>
              </p>
            </div>
          </button>

          {/* Segment 2: Active Projects */}
          <Link
            href="/events"
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 transition text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200/80 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                Active Projects
              </p>
              <p className="text-xs font-semibold text-text truncate group-hover:text-text-dim transition-colors">
                {store.projects.length || 12} projects active <span className="text-[11px] font-normal text-text-mute">· Browse</span>
              </p>
            </div>
          </Link>

          {/* Segment 3: Open Events */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                Upcoming Events
              </p>
              <p className="text-xs font-semibold text-text truncate">
                {openEvents.length} open for registration
              </p>
            </div>
          </div>

          {/* Segment 4: Campus Network */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-dim leading-none mb-1">
                Campus Network
              </p>
              <p className="text-xs font-semibold text-text truncate">
                {networkChapters.length} college chapters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. UPCOMING OPEN EVENTS (HORIZONTAL SIDE-SCROLL) ─────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
            Upcoming Events
          </h2>
        </div>

        {openEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-white">
            <Calendar className="w-8 h-8 mx-auto text-text-mute mb-2" />
            <p className="text-sm font-semibold text-text">No open-to-all events scheduled right now</p>
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
              {openEvents.map((ev) => {
                const ongoing = isEventOngoing(ev);
                const coverImg = getEventCover(ev);
                const evChapter = store.chapters.find((c) => c.id === ev.chapterId);

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
                            {ev.category || "Open Session"}
                          </span>
                          {ongoing && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-white animate-pulse shadow-[0_4px_12px_rgba(242,100,48,0.4)]">
                              Happening Now
                            </span>
                          )}
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
                          <span className="truncate">{ev.venue || evChapter?.name || "Campus Venue"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-border/60 bg-gradient-to-b from-white to-neutral-50/50">
                      <Button
                        size="sm"
                        variant="orange"
                        className="h-8.5 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(242,100,48,0.3)] hover:shadow-[0_6px_18px_rgba(242,100,48,0.45)] active:translate-y-0.5 transition-all cursor-pointer"
                        onClick={() => setSelectedEventForReg(ev)}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </Button>
                      <Link href={evChapter ? `/chapter/${evChapter.slug}/events/${ev.id}` : `/events`}>
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

      {/* ── 4. EXPLORE CHAPTERS (CURRENT CHAPTERS NETWORK) ────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
            Explore Chapters
          </h2>
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 group"
          >
            <span>Join with Code</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
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
                className="w-[250px] sm:w-[280px] shrink-0 rounded-[22px] border border-black/[0.08] bg-white overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.16),0_10px_20px_-8px_rgba(242,100,48,0.18)] hover:-translate-y-2 hover:border-[var(--accent)]/35 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between group cursor-pointer text-left select-none"
              >
                {/* Top Campus Photo */}
                <div className="relative h-32 w-full bg-neutral-900 overflow-hidden">
                  <img
                    src={cover}
                    alt={ch.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  {chOpenEvents.length > 0 && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                      {chOpenEvents.length} open
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
                      {memCount} members {chOpenEvents.length === 0 ? "· No open events" : ""}
                    </p>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-border/80 shadow-xs text-text-mute group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] group-hover:shadow-[0_4px_12px_rgba(242,100,48,0.35)] transition-all">
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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

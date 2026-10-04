"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  List,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  CalendarViewMode,
  EventMonthCalendar,
  eventStatusTone,
} from "@/components/domain/event-month-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { findChapterBySlugOrId } from "@/lib/chapters";
import {
  dateKeyInTz,
  eventSpansDate,
  formatDateKey,
  formatTimeOnly,
  nowYearMonth,
  weekDaysForDateKey,
  type YearMonth,
} from "@/lib/datetime";
import { isEventVisibleToUser } from "@/lib/events";
import type { EventItem, EventStatus } from "@/types";

type StatusFilter =
  | "all"
  | "registration_open"
  | "approved"
  | "draft"
  | "completed";

export default function ChapterCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  const [month, setMonth] = useState<YearMonth>(() => nowYearMonth());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  const todayKey = useMemo(() => dateKeyInTz(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Raw visible events for this chapter
  const rawChapterEvents = useMemo(() => {
    if (!chapter) return [];
    return store.events
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
  }, [store.events, chapter, session.roleKey, session.userId, store.chapters]);

  // Filtered by status and search
  const filteredEvents = useMemo(() => {
    return rawChapterEvents.filter((ev) => {
      if (status !== "all" && ev.status !== status) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesVenue = (ev.venue || "").toLowerCase().includes(q);
        const matchesDesc = (ev.description || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue && !matchesDesc) return false;
      }
      return true;
    });
  }, [rawChapterEvents, status, searchQuery]);

  // Chapter KPI stats
  const stats = useMemo(() => {
    const totalEvents = rawChapterEvents.length;
    const registrationOpen = rawChapterEvents.filter(
      (e) => e.status === "registration_open",
    ).length;

    const thisWeekKeys = new Set(weekDaysForDateKey(todayKey));
    const thisWeekCount = rawChapterEvents.filter(
      (ev) =>
        thisWeekKeys.has(dateKeyInTz(ev.startsAt)) ||
        eventSpansDate(ev.startsAt, ev.endsAt, todayKey),
    ).length;

    const completedCount = rawChapterEvents.filter(
      (e) => e.status === "completed",
    ).length;

    return { totalEvents, registrationOpen, thisWeekCount, completedCount };
  }, [rawChapterEvents, todayKey]);

  // Inspected Date Events
  const inspectedDateKey = selectedDateKey || todayKey;
  const inspectedEvents = useMemo(() => {
    return filteredEvents
      .filter((ev) => eventSpansDate(ev.startsAt, ev.endsAt, inspectedDateKey))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [filteredEvents, inspectedDateKey]);

  // Upcoming sessions for this chapter
  const upcomingPrograms = useMemo(() => {
    return rawChapterEvents
      .filter((ev) => ev.endsAt >= new Date().toISOString())
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 4);
  }, [rawChapterEvents]);

  if (!chapter) {
    return (
      <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-8 text-center shadow-[2px_2px_0px_#2d2d34]">
        <p className="font-mono text-sm text-[#f26430] uppercase font-bold">{"// CHAPTER NOT FOUND"}</p>
      </div>
    );
  }

  const chapterCode = (chapter.shortCode || chapter.slug).toUpperCase();

  const calMetrics = [
    { num: "01", label: "EVENTS", value: stats.totalEvents, sub: "All-time scheduled", color: "#2d2d34" },
    { num: "02", label: "OPEN", value: stats.registrationOpen, sub: "Active signups", color: "#f26430" },
    { num: "03", label: "THIS WEEK", value: stats.thisWeekCount, sub: "Next 7 days", color: "#414066" },
    { num: "04", label: "COMPLETED", value: stats.completedCount, sub: "Delivered sessions", color: "#5f7560" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── ARCHITECTURAL HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[3px_3px_0px_#2d2d34] bauhaus-grid-bg">
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none" aria-hidden="true" />
        <div className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-10 rotate-45 pointer-events-none select-none" aria-hidden="true" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {chapterCode} {"//"} CALENDAR
              </span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter.name}
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Event Calendar &
              <span className="block text-[#f26430] text-xl sm:text-2xl font-bold mt-0.5">
                MILESTONES
              </span>
            </h1>
            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Upcoming events, workshops, and milestones for <span className="font-semibold text-[#2d2d34]">{chapter.name}</span>.
            </p>
          </div>

          <Link href={`/chapter/${slug}/events`}>
            <button
              type="button"
              className="h-9 px-3.5 rounded-[8px] bg-white text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#2d2d34] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <List size={13} />
              Events List
            </button>
          </Link>
        </div>
      </section>

      {/* ─── METRIC STRIP ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {calMetrics.map((m) => (
          <div key={m.num} className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between font-mono text-[9.5px] uppercase font-bold" style={{ color: m.color }}>
              <span>{m.num} {"//"} {m.label}</span>
              <span className="h-1.5 w-1.5" style={{ backgroundColor: m.color }} />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
              {m.value}
            </p>
            <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">{m.sub}</p>
          </div>
        ))}
      </section>

      {/* 2. Unified Search & Filter Toolbar */}
      <div className="rounded-[var(--radius)] bg-bg-panel p-3.5 sm:p-4 shadow-[var(--shadow)] border border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapter events, venues, topics..."
            className="pl-9 pr-8 h-9 text-[13px] bg-bg"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-text-mute shrink-0 hidden sm:inline">
            Status:
          </span>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-9 min-w-[140px] text-[12px] bg-bg py-1"
          >
            <option value="all">All Statuses</option>
            <option value="registration_open">Registration Open</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </Select>

          {(status !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[11px] text-text-mute hover:text-[var(--accent)]"
              onClick={() => {
                setStatus("all");
                setSearchQuery("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* 3. Main Workspace: Calendar (8-cols) + Day Inspector (4-cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 space-y-4">
          <EventMonthCalendar
            events={filteredEvents}
            chapters={store.chapters}
            month={month}
            onMonthChange={setMonth}
            selectedDateKey={selectedDateKey}
            onSelectDate={(key) => setSelectedDateKey(key)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Sidebar: Day Inspector & Upcoming chapter highlights */}
        <div className="xl:col-span-4 space-y-5">
          {/* Day Inspector Card */}
          <div className="rounded-[var(--radius)] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/80">
            <div className="border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase font-bold tracking-wider text-text-mute">
                  Day Inspector
                </span>
                {inspectedDateKey === todayKey && (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                    Today
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-[16px] font-bold text-text">
                {formatDateKey(inspectedDateKey)}
              </h3>
            </div>

            {inspectedEvents.length === 0 ? (
              <div className="py-6 text-center">
                <CalendarIcon
                  size={28}
                  className="mx-auto mb-2 text-text-mute opacity-40"
                />
                <p className="text-[13px] font-medium text-text">
                  No events on this date
                </p>
                <p className="mt-1 text-[11px] text-text-mute">
                  No {chapter.name} sessions scheduled for {formatDateKey(inspectedDateKey)}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {inspectedEvents.map((ev) => {
                  const href = `/chapter/${slug}/events/${ev.id}`;
                  const timeStr = formatTimeOnly(ev.startsAt);
                  const endTimeStr = formatTimeOnly(ev.endsAt);

                  return (
                    <div
                      key={ev.id}
                      className="group rounded-xl border border-border/80 bg-bg/50 p-3 transition hover:bg-bg hover:border-border hover:shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Badge
                          tone={
                            eventStatusTone[ev.status as EventStatus] ?? "mute"
                          }
                        >
                          {ev.status.replaceAll("_", " ")}
                        </Badge>
                      </div>

                      <h4 className="text-[13px] font-bold text-text group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {ev.title}
                      </h4>

                      <div className="mt-2 space-y-1 text-[11px] text-text-mute font-medium">
                        <div className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px]">
                          <Clock size={11} />
                          <span>
                            {timeStr || "All day"}
                            {endTimeStr && endTimeStr !== timeStr
                              ? ` – ${endTimeStr}`
                              : ""}
                          </span>
                        </div>
                        {ev.venue && (
                          <div className="flex items-center gap-1 text-[11px] truncate">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{ev.venue}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border/60 flex justify-end">
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-dim hover:text-[var(--accent)]"
                        >
                          <span>Manage Event</span>
                          <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Chapter Programs */}
          {upcomingPrograms.length > 0 && (
            <div className="rounded-[var(--radius)] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/80">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                <Sparkles size={15} className="text-[var(--accent)]" />
                <h3 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text">
                  Upcoming on Campus
                </h3>
              </div>

              <ul className="divide-y divide-border/60">
                {upcomingPrograms.map((ev) => (
                  <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      href={`/chapter/${slug}/events/${ev.id}`}
                      className="group flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-text group-hover:text-[var(--accent)] truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-text-mute mt-0.5">
                          {formatDateKey(dateKeyInTz(ev.startsAt))} · {ev.venue}
                        </p>
                      </div>
                      <Badge
                        tone={
                          eventStatusTone[ev.status as EventStatus] ?? "mute"
                        }
                      >
                        {ev.status.replaceAll("_", " ")}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

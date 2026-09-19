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
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
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
  const chapter = store.chapters.find((c) => c.slug === slug);

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
      <div className="py-12 text-center">
        <p className="text-[var(--accent)] font-semibold">Chapter not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title={`${chapter.name} Calendar`}
        description={`Upcoming events, workshops, and milestones for ${chapter.name}.`}
        actions={
          <Link href={`/chapter/${slug}/events`}>
            <Button variant="secondary" className="gap-1.5 text-[13px]">
              <List size={14} />
              <span>Events List</span>
            </Button>
          </Link>
        }
      />

      {/* 1. Chapter Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label="Chapter Events"
          value={stats.totalEvents}
          hint="All-time scheduled"
        />
        <Stat
          label="Open Registrations"
          value={stats.registrationOpen}
          accent="orange"
          hint="Active student signups"
        />
        <Stat
          label="Happening This Week"
          value={stats.thisWeekCount}
          hint="Next 7 days on campus"
        />
        <Stat
          label="Completed"
          value={stats.completedCount}
          hint="Delivered sessions"
        />
      </div>

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

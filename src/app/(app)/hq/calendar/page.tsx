"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
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
import {
  dateKeyInTz,
  eventSpansDate,
  formatDateKey,
  formatTimeOnly,
  nowYearMonth,
  weekDaysForDateKey,
  type YearMonth,
} from "@/lib/datetime";
import type { EventItem, EventStatus } from "@/types";

type StatusFilter =
  | "all"
  | "registration_open"
  | "approved"
  | "draft"
  | "completed";

export default function HqCalendarPage() {
  const { store } = useStore();
  const [month, setMonth] = useState<YearMonth>(() => nowYearMonth());
  const [chapterId, setChapterId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  // Selection state for inspection
  const todayKey = useMemo(() => dateKeyInTz(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Filtered Events
  const filtered = useMemo(() => {
    return store.events.filter((ev) => {
      if (chapterId !== "all" && ev.chapterId !== chapterId) return false;
      if (status !== "all" && ev.status !== status) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesVenue = (ev.venue || "").toLowerCase().includes(q);
        const matchesDesc = (ev.description || "").toLowerCase().includes(q);
        const ch = store.chapters.find((c) => c.id === ev.chapterId);
        const matchesChapter = ch?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue && !matchesDesc && !matchesChapter)
          return false;
      }
      return true;
    });
  }, [store.events, store.chapters, chapterId, status, searchQuery]);

  // Executive KPI Metrics
  const stats = useMemo(() => {
    const totalEvents = store.events.length;
    const registrationOpen = store.events.filter(
      (e) => e.status === "registration_open",
    ).length;

    const thisWeekKeys = new Set(weekDaysForDateKey(todayKey));
    const thisWeekCount = store.events.filter(
      (ev) =>
        thisWeekKeys.has(dateKeyInTz(ev.startsAt)) ||
        eventSpansDate(ev.startsAt, ev.endsAt, todayKey),
    ).length;

    const activeChapters = new Set(store.events.map((e) => e.chapterId)).size;

    return { totalEvents, registrationOpen, thisWeekCount, activeChapters };
  }, [store.events, todayKey]);

  // Events on currently inspected date
  const inspectedDateKey = selectedDateKey || todayKey;
  const inspectedEvents = useMemo(() => {
    return filtered
      .filter((ev) => eventSpansDate(ev.startsAt, ev.endsAt, inspectedDateKey))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [filtered, inspectedDateKey]);

  // Network Highlights (Major ongoing / upcoming registrations)
  const networkHighlights = useMemo(() => {
    return store.events
      .filter((ev) => ev.status === "registration_open")
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 5);
  }, [store.events]);

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        eyebrow="Operations & Programs"
        title="Global Calendar"
        description="Network-wide event schedule, hackathons, and multi-campus workshops across chapters."
      />

      {/* 1. Executive Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label="Total Scheduled"
          value={stats.totalEvents}
          hint="Across all chapters"
        />
        <Stat
          label="Registrations Open"
          value={stats.registrationOpen}
          accent="orange"
          hint="Active enrollment"
        />
        <Stat
          label="This Week"
          value={stats.thisWeekCount}
          hint="Happening next 7 days"
        />
        <Stat
          label="Active Chapters"
          value={stats.activeChapters}
          hint={`${store.chapters.length} campus branches`}
        />
      </div>

      {/* 2. Unified Search & Filter Toolbar */}
      <div className="rounded-[var(--radius)] bg-bg-panel p-3.5 sm:p-4 shadow-[var(--shadow)] border border-border/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, venues, topics..."
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-text-mute shrink-0 hidden sm:inline">
              Chapter:
            </span>
            <Select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="h-9 min-w-[140px] text-[12px] bg-bg py-1"
            >
              <option value="all">All Chapters</option>
              {store.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-text-mute shrink-0 hidden sm:inline">
              Status:
            </span>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-9 min-w-[130px] text-[12px] bg-bg py-1"
            >
              <option value="all">All Statuses</option>
              <option value="registration_open">Registration Open</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </Select>
          </div>

          {(chapterId !== "all" || status !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[11px] text-text-mute hover:text-[var(--accent)]"
              onClick={() => {
                setChapterId("all");
                setStatus("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* 3. Main Workspace: Calendar (8-cols) + Day Inspector & Highlights (4-cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Calendar Surface (8-cols) */}
        <div className="xl:col-span-8 space-y-4">
          <EventMonthCalendar
            events={filtered}
            chapters={store.chapters}
            month={month}
            onMonthChange={setMonth}
            selectedDateKey={selectedDateKey}
            onSelectDate={(key) => setSelectedDateKey(key)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Sidebar Surface (4-cols): Interactive Day Inspector & Network Highlights */}
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

            {/* List of events on inspected date */}
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
                  Nothing scheduled for {formatDateKey(inspectedDateKey)}. Select any date on the calendar to see its schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {inspectedEvents.map((ev) => {
                  const chapter = store.chapters.find(
                    (c) => c.id === ev.chapterId,
                  );
                  const href = chapter
                    ? `/chapter/${chapter.slug}/events/${ev.id}`
                    : null;
                  const timeStr = formatTimeOnly(ev.startsAt);
                  const endTimeStr = formatTimeOnly(ev.endsAt);

                  return (
                    <div
                      key={ev.id}
                      className="group rounded-xl border border-border/80 bg-bg/50 p-3 transition hover:bg-bg hover:border-border hover:shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        {chapter && (
                          <span className="rounded-md bg-bg-panel border border-border px-1.5 py-0.5 text-[9px] font-semibold text-text-dim">
                            {chapter.name}
                          </span>
                        )}
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

                      {href && (
                        <div className="mt-2.5 pt-2 border-t border-border/60 flex justify-end">
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-dim hover:text-[var(--accent)]"
                          >
                            <span>Open Details</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Network Highlights / Open for Registration */}
          {networkHighlights.length > 0 && (
            <div className="rounded-[var(--radius)] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/80">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                <Sparkles size={15} className="text-[var(--accent)]" />
                <h3 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text">
                  Registration Highlights
                </h3>
              </div>

              <ul className="divide-y divide-border/60">
                {networkHighlights.map((ev) => {
                  const chapter = store.chapters.find(
                    (c) => c.id === ev.chapterId,
                  );
                  if (!chapter) return null;
                  return (
                    <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={`/chapter/${chapter.slug}/events/${ev.id}`}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-text group-hover:text-[var(--accent)] truncate">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-text-mute mt-0.5">
                            {chapter.name} · {formatDateKey(dateKeyInTz(ev.startsAt))}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] px-2 py-0.5 text-[9px] font-bold uppercase">
                          Open
                        </span>
                      </Link>
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

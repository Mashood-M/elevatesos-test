"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CalendarDays,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  addDays,
  addMonths,
  dateKeyInTz,
  eventSpansDate,
  formatDateKey,
  formatDateShort,
  formatTimeOnly,
  monthLabel,
  monthMatrix,
  nowYearMonth,
  weekDaysForDateKey,
  WEEKDAYS_MON,
  type YearMonth,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Chapter, EventItem, EventStatus } from "@/types";

const CHIP_MAX = 3;

export type CalendarViewMode = "month" | "week";

export const eventStatusTone: Record<
  EventStatus,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  draft: "mute",
  pending_approval: "orange",
  approved: "cyan",
  registration_open: "green",
  registration_closed: "magenta",
  ongoing: "green",
  completed: "mute",
  cancelled: "mute",
};

export type EventMonthCalendarProps = {
  events: EventItem[];
  chapters: Chapter[];
  month: YearMonth;
  onMonthChange: (ym: YearMonth) => void;
  /** Selected civil date YYYY-MM-DD for inspection */
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
  /** View mode: month, week, or agenda */
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  /** Additional custom class names */
  className?: string;
  /** Hide built-in header controls if parent provides a custom toolbar */
  showControls?: boolean;
};

export function EventMonthCalendar({
  events,
  chapters,
  month,
  onMonthChange,
  selectedDateKey = null,
  onSelectDate,
  viewMode: controlledViewMode,
  onViewModeChange,
  className,
  showControls = true,
}: EventMonthCalendarProps) {
  const [internalViewMode, setInternalViewMode] =
    useState<CalendarViewMode>("month");
  const activeView = controlledViewMode ?? internalViewMode;

  const handleSetView = (mode: CalendarViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const todayKey = dateKeyInTz(new Date());
  const activeDateKey = selectedDateKey || todayKey;

  const weeks = useMemo(() => monthMatrix(month), [month]);
  const monthPrefix = `${month.year}-${String(month.month).padStart(2, "0")}`;

  // Week days for current week view
  const currentWeekDays = useMemo(
    () => weekDaysForDateKey(activeDateKey),
    [activeDateKey],
  );

  function chapterFor(chapterId: string) {
    return chapters.find((c) => c.id === chapterId);
  }

  function hrefFor(ev: EventItem) {
    const ch = chapterFor(ev.chapterId);
    if (!ch) return null;
    return `/chapter/${ch.slug}/events/${ev.id}`;
  }

  // Navigation handlers
  const handlePrev = () => {
    if (activeView === "week") {
      const prevWeekDate = addDays(activeDateKey, -7);
      onSelectDate?.(prevWeekDate);
      const [y, m] = prevWeekDate.split("-").map(Number);
      if (y !== month.year || m !== month.month) {
        onMonthChange({ year: y, month: m });
      }
    } else {
      onMonthChange(addMonths(month, -1));
    }
  };

  const handleNext = () => {
    if (activeView === "week") {
      const nextWeekDate = addDays(activeDateKey, 7);
      onSelectDate?.(nextWeekDate);
      const [y, m] = nextWeekDate.split("-").map(Number);
      if (y !== month.year || m !== month.month) {
        onMonthChange({ year: y, month: m });
      }
    } else {
      onMonthChange(addMonths(month, 1));
    }
  };

  const handleToday = () => {
    onMonthChange(nowYearMonth());
    onSelectDate?.(todayKey);
  };

  // Header Title
  const headerTitle = useMemo(() => {
    if (activeView === "week" && currentWeekDays.length === 7) {
      const first = currentWeekDays[0];
      const last = currentWeekDays[6];
      return `${formatDateShort(first)} – ${formatDateShort(last)}`;
    }
    return monthLabel(month);
  }, [activeView, currentWeekDays, month]);

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] bg-bg-panel p-4 sm:p-5 md:p-6 shadow-[var(--shadow)] border border-border/70",
        className,
      )}
    >
      {/* Calendar Header Controls */}
      {showControls && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            {/* Prominent High-Contrast Navigation Controls */}
            <div className="flex items-center gap-1 rounded-xl bg-bg p-1 border border-border/80 shadow-2xs">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text hover:bg-bg-panel hover:text-[var(--accent)] transition cursor-pointer"
                aria-label="Previous"
                title="Previous"
                onClick={handlePrev}
              >
                <ChevronLeft size={16} className="text-text stroke-[2.5]" />
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[12px] font-bold text-text hover:bg-bg-panel hover:text-[var(--accent)] transition cursor-pointer"
                onClick={handleToday}
              >
                Today
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text hover:bg-bg-panel hover:text-[var(--accent)] transition cursor-pointer"
                aria-label="Next"
                title="Next"
                onClick={handleNext}
              >
                <ChevronRight size={16} className="text-text stroke-[2.5]" />
              </button>
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-[16px] sm:text-[18px] font-bold tracking-tight text-text">
              {headerTitle}
            </h2>
          </div>

          {/* View Switcher Tabs */}
          <div className="inline-flex rounded-xl bg-bg p-1 border border-border/80 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => handleSetView("month")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                activeView === "month"
                  ? "bg-bg-panel text-text font-semibold shadow-xs"
                  : "text-text-mute hover:text-text",
              )}
            >
              <LayoutGrid size={13} />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetView("week")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                activeView === "week"
                  ? "bg-bg-panel text-text font-semibold shadow-xs"
                  : "text-text-mute hover:text-text",
              )}
            >
              <CalendarDays size={13} />
              <span>Week</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: MONTH VIEW */}
      {activeView === "month" && (
        <div className="space-y-1.5">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-semibold tracking-wider text-text-mute uppercase pb-1">
            {WEEKDAYS_MON.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Month Matrix Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weeks.flatMap((week) =>
              week.map((key) => {
                const inMonth = key.startsWith(monthPrefix);
                const dayNum = Number(key.slice(-2));
                const dayEvents = events.filter((ev) =>
                  eventSpansDate(ev.startsAt, ev.endsAt, key),
                );
                const visible = dayEvents.slice(0, CHIP_MAX);
                const overflow = dayEvents.length - visible.length;
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;

                return (
                  <div
                    key={key}
                    role={onSelectDate ? "button" : undefined}
                    tabIndex={onSelectDate ? 0 : undefined}
                    onClick={() => onSelectDate?.(key)}
                    onKeyDown={(e) => {
                      if (!onSelectDate) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectDate(key);
                      }
                    }}
                    className={cn(
                      "group relative min-h-[92px] sm:min-h-[110px] rounded-xl p-1.5 sm:p-2 text-left transition-all border",
                      inMonth
                        ? "bg-bg/60 border-border/70 hover:border-[var(--accent)]/50 hover:bg-bg"
                        : "bg-bg/20 border-border/30 opacity-40 hover:opacity-70",
                      onSelectDate && "cursor-pointer",
                      isSelected &&
                        "ring-2 ring-inset ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] border-[var(--accent)]",
                    )}
                    aria-label={
                      onSelectDate
                        ? `Select ${formatDateKey(key)} (${dayEvents.length} events)`
                        : formatDateKey(key)
                    }
                    aria-pressed={onSelectDate ? isSelected : undefined}
                  >
                    {/* Top Row: Date Pill */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold transition-transform",
                          isToday
                            ? "bg-[var(--accent)] text-white shadow-xs"
                            : isSelected
                              ? "bg-text text-bg-panel font-bold"
                              : "text-text-dim group-hover:text-text",
                        )}
                      >
                        {dayNum}
                      </span>
                    </div>

                    {/* Event Chips List */}
                    <ul className="space-y-1">
                      {visible.map((ev) => {
                        const href = hrefFor(ev);
                        const ch = chapterFor(ev.chapterId);
                        const timeStr = formatTimeOnly(ev.startsAt);
                        const chip = (
                          <div
                            className={cn(
                              "group/chip flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate transition-all shadow-2xs",
                              toneChip(ev.status),
                            )}
                            title={`${ev.title} (${timeStr || "All day"}${ch ? ` • ${ch.name}` : ""})`}
                          >
                            {timeStr && (
                              <span className="font-[family-name:var(--font-mono)] opacity-75 shrink-0 text-[9px]">
                                {timeStr.replace(":00", "")}
                              </span>
                            )}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );

                        return (
                          <li key={`${key}-${ev.id}`}>
                            {href ? (
                              <Link
                                href={href}
                                className="block hover:opacity-90"
                                aria-label={`${ev.title} on ${key}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {chip}
                              </Link>
                            ) : (
                              chip
                            )}
                          </li>
                        );
                      })}

                      {overflow > 0 && (
                        <li className="px-1 text-[10px] font-medium text-[var(--accent)]">
                          +{overflow} more
                        </li>
                      )}
                    </ul>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 7-DAY WEEK VIEW (Visual Day Rows — delegates full inspection to Day Inspector) */}
      {activeView === "week" && (
        <div className="space-y-2">
          {currentWeekDays.map((dayKey) => {
            const dayEvents = events.filter((ev) =>
              eventSpansDate(ev.startsAt, ev.endsAt, dayKey),
            );
            const isToday = dayKey === todayKey;
            const isSelected = dayKey === selectedDateKey;

            const [y, m, d] = dayKey.split("-").map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d, 12));
            const weekdayShort = dateObj.toLocaleDateString("en-US", {
              weekday: "short",
            });
            const monthShort = dateObj.toLocaleDateString("en-US", {
              month: "short",
            });

            return (
              <div
                key={dayKey}
                onClick={() => onSelectDate?.(dayKey)}
                className={cn(
                  "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition cursor-pointer",
                  isSelected
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] ring-2 ring-[var(--accent)]"
                    : isToday
                      ? "border-[var(--accent)]/40 bg-bg-panel hover:border-[var(--accent)]"
                      : "border-border/70 bg-bg/40 hover:bg-bg/80 hover:border-border",
                )}
              >
                {/* Day Label Column */}
                <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold shrink-0 transition-colors",
                      isToday
                        ? "bg-[var(--accent)] text-white shadow-xs"
                        : isSelected
                          ? "bg-text text-bg-panel"
                          : "bg-bg border border-border text-text",
                    )}
                  >
                    {d}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-text">
                        {weekdayShort}
                      </span>
                      <span className="text-[11px] text-text-mute">
                        {monthShort}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-mute">
                      {dayEvents.length === 0
                        ? "Free day"
                        : `${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                {/* Event Chips Row */}
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                  {dayEvents.length === 0 ? (
                    <span className="text-[11px] text-text-mute/70 italic">
                      No events scheduled
                    </span>
                  ) : (
                    dayEvents.map((ev) => {
                      const timeStr = formatTimeOnly(ev.startsAt);
                      const ch = chapterFor(ev.chapterId);
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium leading-none border transition shadow-2xs",
                            toneChip(ev.status),
                          )}
                          title={`${ev.title} (${timeStr || "All day"}${ch ? ` • ${ch.name}` : ""})`}
                        >
                          {timeStr && (
                            <span className="font-[family-name:var(--font-mono)] opacity-75 text-[10px] shrink-0">
                              {timeStr.replace(":00", "")}
                            </span>
                          )}
                          <span className="truncate max-w-[180px] font-semibold">
                            {ev.title}
                          </span>
                          {ch && (
                            <span className="text-[9px] opacity-70 shrink-0">
                              • {ch.name.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right helper indicator */}
                <div className="hidden sm:flex items-center text-text-mute group-hover:text-[var(--accent)] text-[11px] font-semibold shrink-0">
                  <span>Inspect</span>
                  <ChevronRight size={14} className="ml-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

function toneChip(status: EventStatus) {
  switch (status) {
    case "registration_open":
      return "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[var(--accent)]/30";
    case "approved":
    case "pending_approval":
      return "bg-[var(--secondary-soft)] text-[var(--secondary)] border border-[var(--secondary)]/30";
    case "registration_closed":
      return "bg-bg-hover text-text border border-border";
    case "cancelled":
      return "bg-bg-hover text-text-mute line-through border border-border";
    default:
      return "bg-bg-hover text-text-dim border border-border";
  }
}

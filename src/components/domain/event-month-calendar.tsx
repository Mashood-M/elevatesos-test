"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import {
  addMonths,
  dateKeyInTz,
  eventSpansDate,
  formatDateKey,
  monthLabel,
  monthMatrix,
  nowYearMonth,
  WEEKDAYS_MON,
  type YearMonth,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Chapter, EventItem, EventStatus } from "@/types";

const CHIP_MAX = 3;

export const eventStatusTone: Record<
  EventStatus,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  draft: "mute",
  pending_approval: "orange",
  approved: "cyan",
  registration_open: "green",
  registration_closed: "magenta",
  completed: "mute",
  cancelled: "mute",
};

type Props = {
  events: EventItem[];
  chapters: Chapter[];
  month: YearMonth;
  onMonthChange: (ym: YearMonth) => void;
  /** Selected civil date YYYY-MM-DD for scheduling */
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
  /** Show “click a day to schedule” hint */
  canCreate?: boolean;
};

export function EventMonthCalendar({
  events,
  chapters,
  month,
  onMonthChange,
  selectedDateKey = null,
  onSelectDate,
  canCreate = false,
}: Props) {
  const weeks = monthMatrix(month);
  const todayKey = dateKeyInTz(new Date());
  const monthPrefix = `${month.year}-${String(month.month).padStart(2, "0")}`;

  const eventsInView = events.filter((ev) => {
    const start = dateKeyInTz(ev.startsAt);
    const end = dateKeyInTz(ev.endsAt);
    const monthStart = `${monthPrefix}-01`;
    const monthEnd = `${monthPrefix}-31`;
    return end >= monthStart && start <= monthEnd;
  });

  function chapterSlug(chapterId: string) {
    return chapters.find((c) => c.id === chapterId)?.slug;
  }

  function hrefFor(ev: EventItem) {
    const slug = chapterSlug(ev.chapterId);
    if (!slug) return null;
    return `/chapter/${slug}/events/${ev.id}`;
  }

  return (
    <TerminalPanel
      title={monthLabel(month)}
      meta={
        canCreate
          ? selectedDateKey
            ? `Selected ${formatDateKey(selectedDateKey)} — schedule below`
            : "Click a day to schedule an event"
          : eventsInView.length
            ? `${eventsInView.length} event${eventsInView.length === 1 ? "" : "s"} this month`
            : "No events this month"
      }
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 px-0"
            aria-label="Previous month"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => onMonthChange(nowYearMonth())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 px-0"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-px rounded-[12px] bg-border overflow-hidden">
        {WEEKDAYS_MON.map((d) => (
          <div
            key={d}
            className="bg-bg-panel px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-text-mute"
          >
            {d}
          </div>
        ))}
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
                  "min-h-[88px] bg-bg-panel p-1.5 text-left sm:min-h-[104px]",
                  !inMonth && "opacity-40",
                  onSelectDate && "cursor-pointer transition hover:bg-bg-hover",
                  isSelected &&
                    "ring-2 ring-inset ring-[var(--accent)] bg-[var(--accent-soft)]",
                )}
                aria-label={
                  onSelectDate
                    ? `Select ${formatDateKey(key)}`
                    : formatDateKey(key)
                }
                aria-pressed={onSelectDate ? isSelected : undefined}
              >
                <p
                  className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
                    isToday
                      ? "bg-[var(--accent)] text-white"
                      : "text-text-dim",
                  )}
                >
                  {dayNum}
                </p>
                <ul className="space-y-0.5">
                  {visible.map((ev) => {
                    const href = hrefFor(ev);
                    const chip = (
                      <span
                        className={cn(
                          "block truncate rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                          toneChip(ev.status),
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
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
                  {overflow > 0 ? (
                    <li className="px-1 text-[10px] text-text-mute">
                      +{overflow}
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          }),
        )}
      </div>

      {eventsInView.length === 0 && !canCreate ? (
        <p className="mt-4 text-center text-[13px] text-text-mute">
          No events in this month. Try another month or clear filters.
        </p>
      ) : null}
      {canCreate && !selectedDateKey ? (
        <p className="mt-4 text-center text-[13px] text-text-mute">
          Select a date on the grid to add an event or meeting.
        </p>
      ) : null}
    </TerminalPanel>
  );
}

function toneChip(status: EventStatus) {
  switch (status) {
    case "registration_open":
      return "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]";
    case "approved":
    case "pending_approval":
      return "bg-[var(--secondary-soft)] text-[var(--secondary)]";
    case "registration_closed":
      return "bg-bg-hover text-text";
    case "cancelled":
      return "bg-bg-hover text-text-mute line-through";
    default:
      return "bg-bg-hover text-text-dim";
  }
}

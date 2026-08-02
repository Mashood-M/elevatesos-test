"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarQuickCreate } from "@/components/domain/calendar-quick-create";
import {
  EventMonthCalendar,
  eventStatusTone,
} from "@/components/domain/event-month-calendar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Select } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  dateKeyInTz,
  formatDateTime,
  nowYearMonth,
  type YearMonth,
} from "@/lib/datetime";
import { hasPermission } from "@/lib/permissions";
import type { EventStatus } from "@/types";

type StatusFilter =
  | "all"
  | "registration_open"
  | "draft"
  | "completed"
  | "approved";

export default function HqCalendarPage() {
  const { store } = useStore();
  const { session } = useCurrentUser();
  const [month, setMonth] = useState<YearMonth>(() => nowYearMonth());
  const [chapterId, setChapterId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const canCreate = hasPermission(store, session.roleKey, "event.create");

  const filtered = useMemo(() => {
    return store.events.filter((ev) => {
      if (chapterId !== "all" && ev.chapterId !== chapterId) return false;
      if (status !== "all" && ev.status !== status) return false;
      return true;
    });
  }, [store.events, chapterId, status]);

  const monthPrefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const monthList = useMemo(() => {
    return [...filtered]
      .filter((ev) => {
        const start = dateKeyInTz(ev.startsAt);
        const end = dateKeyInTz(ev.endsAt);
        return end >= `${monthPrefix}-01` && start <= `${monthPrefix}-31`;
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [filtered, monthPrefix]);

  const createChapterId =
    chapterId !== "all" ? chapterId : (store.chapters[0]?.id ?? "");

  const networkOpen = useMemo(() => {
    return store.events
      .filter((ev) => ev.status === "registration_open")
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 4);
  }, [store.events]);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Global Calendar"
        description="Pick a date to schedule across chapters, or open an existing event. Campus calendars live on each chapter."
      />

      {networkOpen.length > 0 ? (
        <TerminalPanel
          title="Network events"
          meta="Registration open"
          className="mb-5"
        >
          <ul className="flex flex-wrap gap-3">
            {networkOpen.map((ev) => {
              const chapter = store.chapters.find((c) => c.id === ev.chapterId);
              if (!chapter) return null;
              return (
                <li key={ev.id}>
                  <Link
                    href={`/chapter/${chapter.slug}/events/${ev.id}`}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-bg px-3 py-2 text-[13px] font-medium hover:bg-bg-hover hover:text-[var(--accent)]"
                  >
                    <span>{ev.title}</span>
                    <span className="text-[11px] font-normal text-text-mute">
                      {chapter.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-text-mute">Chapter</span>
          <Select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            <option value="all">All chapters</option>
            {store.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-text-mute">Status</span>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="registration_open">Registration open</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </Select>
        </label>
      </div>

      <EventMonthCalendar
        events={filtered}
        chapters={store.chapters}
        month={month}
        onMonthChange={setMonth}
        selectedDateKey={selectedDateKey}
        onSelectDate={canCreate ? setSelectedDateKey : undefined}
        canCreate={canCreate}
      />

      {canCreate && selectedDateKey ? (
        <CalendarQuickCreate
          dateKey={selectedDateKey}
          chapterId={createChapterId}
          allowChapterPick={chapterId === "all"}
          onClose={() => setSelectedDateKey(null)}
        />
      ) : null}

      <TerminalPanel
        title="This month"
        meta={`${monthList.length} event${monthList.length === 1 ? "" : "s"}`}
        className="mt-6"
      >
        {monthList.length === 0 ? (
          <p className="text-[13px] text-text-mute">
            Nothing scheduled for this month with the current filters.
            {canCreate ? " Click a day above to add one." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {monthList.map((ev) => {
              const chapter = store.chapters.find((c) => c.id === ev.chapterId);
              const href = chapter
                ? `/chapter/${chapter.slug}/events/${ev.id}`
                : null;
              const row = (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-text">
                      {ev.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-dim">
                      {chapter?.name ?? "Unknown chapter"} · {ev.venue} ·{" "}
                      {formatDateTime(ev.startsAt)}
                      {dateKeyInTz(ev.startsAt) !== dateKeyInTz(ev.endsAt)
                        ? ` → ${formatDateTime(ev.endsAt)}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    tone={eventStatusTone[ev.status as EventStatus] ?? "mute"}
                  >
                    {ev.status.replaceAll("_", " ")}
                  </Badge>
                </>
              );
              return (
                <li key={ev.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:text-[var(--accent)]"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarQuickCreate } from "@/components/domain/calendar-quick-create";
import {
  EventMonthCalendar,
  eventStatusTone,
} from "@/components/domain/event-month-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import {
  dateKeyInTz,
  formatDateTime,
  nowYearMonth,
  type YearMonth,
} from "@/lib/datetime";
import { hasPermission } from "@/lib/permissions";
import type { EventStatus } from "@/types";

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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const canCreate = hasPermission(store, session.roleKey, "event.create");

  const events = useMemo(() => {
    if (!chapter) return [];
    return store.events.filter((e) => e.chapterId === chapter.id);
  }, [store.events, chapter]);

  const monthPrefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const monthList = useMemo(() => {
    return [...events]
      .filter((ev) => {
        const start = dateKeyInTz(ev.startsAt);
        const end = dateKeyInTz(ev.endsAt);
        return end >= `${monthPrefix}-01` && start <= `${monthPrefix}-31`;
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [events, monthPrefix]);

  if (!chapter) {
    return <p className="text-[var(--accent)]">Chapter not found</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Chapter calendar"
        description={`Schedule and review ${chapter.name} events — pick a day to add a workshop, meetup, or meeting.`}
        actions={
          <Link href={`/chapter/${slug}/events`}>
            <Button variant="ghost">Events list</Button>
          </Link>
        }
      />

      <EventMonthCalendar
        events={events}
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
          chapterId={chapter.id}
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
            No chapter events this month.
            {canCreate ? " Click a day on the calendar to schedule one." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {monthList.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/chapter/${slug}/events/${ev.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:text-[var(--accent)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">
                      {ev.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-dim">
                      {ev.venue} · {formatDateTime(ev.startsAt)}
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

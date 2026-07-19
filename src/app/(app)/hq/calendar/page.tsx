"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import { formatDate, formatDateTime } from "@/lib/utils";

const statusTone: Record<string, "cyan" | "magenta" | "green" | "orange" | "mute"> = {
  registration_open: "green",
  pending_approval: "orange",
  approved: "cyan",
  completed: "mute",
  draft: "mute",
};

export default function HqCalendarPage() {
  const { store } = useStore();
  const events = [...store.events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const byMonth = events.reduce<Record<string, typeof events>>((acc, ev) => {
    const key = new Date(ev.startsAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Global Calendar"
        description="All events across chapters — workshops, hackathons, and challenges on one timeline."
      />

      <div className="space-y-6">
        {Object.entries(byMonth).map(([month, monthEvents]) => (
          <TerminalPanel key={month} title={month.toLowerCase().replace(/\s/g, ".")} meta={`${monthEvents.length} events`}>
            <div className="space-y-3">
              {monthEvents.map((ev) => {
                const chapter = store.chapters.find((c) => c.id === ev.chapterId);
                const organizer = store.profiles.find((p) => p.id === ev.organizerId);
                return (
                  <div
                    key={ev.id}
                    className="grid gap-3 border border-border bg-bg p-4 md:grid-cols-[120px_1fr_auto]"
                  >
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-cyan">
                        {new Date(ev.startsAt).getDate()}
                      </p>
                      <p className="text-[10px] uppercase text-text-mute">
                        {formatDate(ev.startsAt)}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold">{ev.title}</h3>
                      <p className="mt-1 text-[11px] text-text-dim">
                        {chapter?.name} · {ev.venue} · {ev.category}
                      </p>
                      <p className="mt-1 text-[10px] text-text-mute">
                        {formatDateTime(ev.startsAt)} → {formatDateTime(ev.endsAt)} · org: {organizer?.fullName}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Badge tone={statusTone[ev.status] ?? "mute"}>{ev.status.replaceAll("_", " ")}</Badge>
                      <Link
                        href={`/chapter/${chapter?.slug}/events`}
                        className="text-[10px] uppercase tracking-[0.14em] text-magenta hover:text-cyan"
                      >
                        View Chapter →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </TerminalPanel>
        ))}
      </div>
    </div>
  );
}

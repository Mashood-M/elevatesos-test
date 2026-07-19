"use client";

import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "@/components/ui/ticket-card";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionGrid } from "@/components/layout/page-frame";
import { useStore } from "@/context/store-context";
import { formatDate } from "@/lib/utils";

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold">
          Chapter not found
        </p>
        <Link href="/hq/chapters" className="mt-3 inline-block text-accent">
          Back to chapters
        </Link>
      </div>
    );
  }

  const members = store.profiles.filter((p) => p.chapterId === chapter.id);
  const events = store.events.filter((e) => e.chapterId === chapter.id);
  const clusters = store.clusters.filter((c) => c.chapterId === chapter.id);
  const tasks = store.tasks.filter((t) => t.chapterId === chapter.id);
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const upcoming = events
    .filter((e) => new Date(e.startsAt) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  return (
    <div>
      <PageHeader
        title={chapter.name}
        description={`${chapter.college} · ${chapter.city}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/settings`}>
              <Button variant="orange">Manage chapter</Button>
            </Link>
            <Link href={`/chapter/${slug}/events`}>
              <Button variant="ghost">Events</Button>
            </Link>
            <Link href={`/chapter/${slug}/students`}>
              <Button variant="ghost">Members</Button>
            </Link>
          </div>
        }
      />

      <SectionGrid>
        <Stat label="Members" value={members.length} />
        <Stat label="Events" value={events.length} />
        <Stat label="Clusters" value={clusters.length} />
        <Stat
          label="Health"
          value={`${chapter.healthScore}%`}
          hint={chapter.status.replaceAll("_", " ")}
        />
      </SectionGrid>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <TerminalPanel
            title="Upcoming events"
            meta={`${upcoming.length} scheduled`}
            action={
              <Link
                href={`/chapter/${slug}/events`}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                View all
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-text-dim">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 3).map((event) => (
                  <TicketCard
                    key={event.id}
                    event={event}
                    href={`/chapter/${slug}/events/${event.id}`}
                  />
                ))}
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel title="Open tasks" meta={`${openTasks.length} active`}>
            {openTasks.length === 0 ? (
              <p className="text-[13px] text-text-dim">Inbox zero.</p>
            ) : (
              <ul className="divide-y divide-border">
                {openTasks.slice(0, 5).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-text-mute">
                        Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <Badge tone="mute">{task.category.replaceAll("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title="Chapter health">
            <ProgressBar
              value={chapter.healthScore}
              label="Overall score"
            />
            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-text-dim">Status</dt>
                <dd className="font-medium capitalize">
                  {chapter.status.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">Established</dt>
                <dd className="font-medium">
                  {new Date(chapter.foundedAt).getFullYear()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">Events YTD</dt>
                <dd className="font-medium">{chapter.eventCount}</dd>
              </div>
            </dl>
          </TerminalPanel>

          <TerminalPanel title="Clusters">
            <ul className="space-y-2">
              {clusters.map((cluster) => (
                <li key={cluster.id}>
                  <Link
                    href={`/chapter/${slug}/clusters`}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 hover:bg-bg-hover"
                  >
                    <span className="text-[13px] font-semibold">
                      {cluster.name}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      {cluster.memberIds.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}

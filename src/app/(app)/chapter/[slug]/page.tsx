"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "@/components/ui/ticket-card";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionGrid } from "@/components/layout/page-frame";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole, isFacultyRole, resolveChapter } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

const STUDENT_START = [
  {
    step: "01",
    title: "Open the community",
    detail: "See who belongs and how progression works",
    href: "community",
  },
  {
    step: "02",
    title: "Browse events",
    detail: "Register for workshops and challenges",
    href: "events",
  },
  {
    step: "03",
    title: "Explore clusters",
    detail: "Invite-first tracks for builders",
    href: "clusters",
  },
] as const;

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey);

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading chapter...</p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
          Chapter not found
        </p>
        <p className="mt-2 text-xs text-text-dim max-w-md mx-auto">
          This campus chapter is not yet registered or opened. HQ and HQ Admins only can manage un-opened chapters.
        </p>
        <Link href="/hq/chapters" className="mt-4 inline-block text-xs font-semibold text-[var(--accent)] hover:underline">
          Back to network →
        </Link>
      </div>
    );
  }

  const showOps =
    isExecutiveRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    isHqRole(session.roleKey);
  const isStudent = session.roleKey === "student";
  const canCreateEvent = hasPermission(store, session.roleKey, "event.create");

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
        eyebrow={
          isStudent ? "Explore" : chapterEyebrow(session.roleKey, "home")
        }
        title={chapter.name}
        description={
          isStudent
            ? `${chapter.college} · explore events, clusters, and the community`
            : `${chapter.college} · ${chapter.city} · lead the chapter from here`
        }
        actions={
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5">
            {showOps ? (
              <>
                <Link href={`/chapter/${slug}/calendar`}>
                  <Button variant="orange">Calendar</Button>
                </Link>
                <Link
                  href={
                    canCreateEvent
                      ? `/chapter/${slug}/events?create=1`
                      : `/chapter/${slug}/events`
                  }
                >
                  <Button variant="ghost">
                    {canCreateEvent ? "Create event" : "Events"}
                  </Button>
                </Link>
                <Link href={`/chapter/${slug}/community`}>
                  <Button variant="ghost">Community</Button>
                </Link>
                <Link href={`/chapter/${slug}/settings`}>
                  <Button variant="ghost">Settings</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/eos">
                  <Button variant="orange">Playbook</Button>
                </Link>
                <Link href={`/chapter/${slug}/community`}>
                  <Button variant="ghost">Community</Button>
                </Link>
                <Link href={`/chapter/${slug}/events`}>
                  <Button variant="ghost">Events</Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      {showOps ? (
        <SectionGrid className="mb-6">
          <Stat
            label="Health"
            value={`${chapter.healthScore}%`}
            hint={chapter.status.replaceAll("_", " ")}
            accent="orange"
          />
          <Stat label="Members" value={members.length} />
          <Stat label="Events" value={events.length} />
          <Stat label="Clusters" value={clusters.length} />
        </SectionGrid>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {isStudent ? (
            <TerminalPanel title="Start here" meta="Explore">
              <ol className="divide-y divide-border/80">
                {STUDENT_START.map((item) => (
                  <li key={item.step}>
                    <Link
                      href={`/chapter/${slug}/${item.href}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3.5 hover:text-[var(--accent)]"
                    >
                      <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                        {item.step}
                      </span>
                      <span className="font-semibold">{item.title}</span>
                      <span className="text-[12px] text-text-dim">
                        {item.detail}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </TerminalPanel>
          ) : (
            <TerminalPanel title="Playbook" meta="Community path">
              <p className="mb-3 max-w-[56ch] text-[13px] leading-relaxed text-text-dim">
                Progression is earned; clusters are invite-first after workshops.
              </p>
              <Link href="/eos#foundations">
                <Button variant="ghost">Read the playbook</Button>
              </Link>
            </TerminalPanel>
          )}

          <TerminalPanel
            title="Upcoming events"
            meta={`${upcoming.length} scheduled`}
            action={
              <Link
                href={`/chapter/${slug}/events`}
                className="text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-text-dim">
                No upcoming events.
                {showOps ? (
                  <>
                    {" "}
                    <Link
                      href={`/chapter/${slug}/calendar`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      Schedule one
                    </Link>
                  </>
                ) : null}
              </p>
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

          {showOps ? (
            <TerminalPanel
              title="Open tasks"
              meta={`${openTasks.length} active`}
              action={
                <Link
                  href={`/chapter/${slug}/tasks`}
                  className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                >
                  Task board
                </Link>
              }
            >
              {openTasks.length === 0 ? (
                <p className="text-[13px] text-text-dim">Inbox zero.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {openTasks.slice(0, 5).map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/chapter/${slug}/tasks`}
                        className="flex items-center justify-between gap-3 py-3 hover:text-[var(--accent)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-text-mute">
                            Due {formatDate(task.dueDate)}
                          </p>
                        </div>
                        <Badge tone="mute">
                          {task.category.replaceAll("_", " ")}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TerminalPanel>
          ) : null}
        </div>

        <div className="space-y-5">
          {showOps ? (
            <TerminalPanel title="Chapter health">
              <ProgressBar value={chapter.healthScore} label="Overall score" />
              <dl className="mt-5 space-y-3 text-[13px]">
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
          ) : null}

          <TerminalPanel title="Clusters">
            {clusters.length === 0 ? (
              <p className="text-[13px] text-text-dim">No clusters yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {clusters.map((cluster) => (
                  <li key={cluster.id}>
                    <Link
                      href={`/chapter/${slug}/clusters`}
                      className="flex items-center justify-between py-2.5 hover:text-[var(--accent)]"
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
            )}
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}

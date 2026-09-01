"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionGrid } from "@/components/layout/page-frame";
import { useStore, useCurrentUser } from "@/context/store-context";
import { calculateChapterActivityScore, chapterMetricsFromStore } from "@/lib/analytics";
import { healthLabel } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";

export default function HqDashboardPage() {
  const { store } = useStore();
  const { profile, session } = useCurrentUser();
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";

  const members = store.profiles.filter((p) => p.chapterId).length;
  const activeChapters = store.chapters.filter((c) => c.status === "active");
  const onboardingChapters = store.chapters.filter(
    (c) => c.status === "onboarding",
  );
  const activeEvents = store.events.filter((e) =>
    ["registration_open", "approved"].includes(e.status),
  ).length;
  const pendingReports = store.reports.filter((r) => r.status === "submitted");
  const unreadAlerts = store.notifications.filter(
    (n) => n.userId === session.userId && !n.read,
  ).length;

  const chapterMetrics = useMemo(
    () => chapterMetricsFromStore(store),
    [store],
  );
  const metricsById = useMemo(() => {
    const map = new Map(chapterMetrics.map((m) => [m.id, m]));
    return map;
  }, [chapterMetrics]);

  const chaptersByHealth = useMemo(
    () =>
      [...store.chapters].sort(
        (a, b) =>
          calculateChapterActivityScore(store, b.id) -
          calculateChapterActivityScore(store, a.id),
      ),
    [store],
  );

  const campusLeads = useMemo(() => {
    const activeTerms = store.leadershipTerms.filter(
      (t) => t.status === "active",
    );
    const rows: {
      id: string;
      chapterName: string;
      userName: string;
      title: string;
      userId: string;
    }[] = [];
    for (const term of activeTerms) {
      const chapter = store.chapters.find((c) => c.id === term.chapterId);
      const lead = store.leadershipAssignments.find(
        (a) => a.termId === term.id && a.roleKey === "chairman",
      );
      if (!chapter || !lead) continue;
      const user = store.profiles.find((p) => p.id === lead.userId);
      rows.push({
        id: lead.id,
        chapterName: chapter.name,
        userName: user?.fullName ?? lead.userId,
        title: lead.title || "Campus Lead",
        userId: lead.userId,
      });
    }
    return rows.slice(0, 5);
  }, [store.leadershipTerms, store.leadershipAssignments, store.chapters, store.profiles]);

  const recentActivity = useMemo(
    () =>
      [...store.activityLogs]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [store.activityLogs],
  );

  const onboardingCount = onboardingChapters.length;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Good day, ${firstName}`}
        description="Network overview — chapter health, campus leads, and items waiting on HQ."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/hq/analytics">
              <Button type="button" variant="ghost">
                Analytics
              </Button>
            </Link>
            <Link href="/hq/chapters">
              <Button type="button" variant="orange">
                Manage chapters
              </Button>
            </Link>
          </div>
        }
      />

      <SectionGrid>
        <Stat
          label="Chapters"
          value={activeChapters.length}
          hint={`${store.chapters.length} total · ${onboardingCount} onboarding`}
          accent="orange"
        />
        <Stat label="Members" value={members} hint="With a chapter" />
        <Link href="/hq/calendar" className="block transition hover:opacity-90">
          <Stat
            label="Live events"
            value={activeEvents}
            hint="Open network calendar →"
          />
        </Link>
        <Stat
          label="Pending reports"
          value={pendingReports.length}
          hint="Submitted for HQ"
        />
      </SectionGrid>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <TerminalPanel
          title="Chapters"
          meta="By health"
          action={
            <Link
              href="/hq/chapters"
              className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
            >
              View all
            </Link>
          }
        >
          {!chaptersByHealth.length ? (
            <p className="py-6 text-center text-[13px] text-text-mute">
              No chapters yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/80">
              {chaptersByHealth.map((c) => {
                const metrics = metricsById.get(c.id);
                const chapterScore = calculateChapterActivityScore(store, c.id);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/chapter/${c.slug}`}
                      className="flex items-center gap-3 py-4 transition hover:opacity-90"
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--charcoal-900)] font-[family-name:var(--font-mono)] text-[11px] font-semibold text-white">
                          {c.slug.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tracking-[-0.01em]">
                              {c.name}
                            </span>
                            <Badge
                              tone={
                                chapterScore >= 90
                                  ? "green"
                                  : chapterScore >= 75
                                    ? "cyan"
                                    : "orange"
                              }
                            >
                              {chapterScore}%
                            </Badge>
                            {c.status === "onboarding" ? (
                              <Badge tone="mute">onboarding</Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-text-mute">
                            {c.college} · {metrics?.members ?? 0} members ·{" "}
                            {metrics?.events ?? 0} events
                          </p>
                          <div className="mt-2.5 max-w-sm">
                            <ProgressBar
                              value={chapterScore}
                              label={healthLabel(chapterScore)}
                            />
                          </div>
                        </div>
                        <ArrowUpRight
                          size={16}
                          className="mt-1 shrink-0 text-text-mute"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </TerminalPanel>

        <div className="space-y-5">
          <TerminalPanel title="Needs review">
            <Link
              href="/hq/reports"
              className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
            >
              <p className="text-[13px] font-semibold">Reports</p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                {pendingReports.length} submitted for HQ
              </p>
            </Link>
            <Link
              href="/hq/chapters"
              className="mt-3 block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
            >
              <p className="text-[13px] font-semibold">Onboarding</p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                {onboardingCount}{" "}
                {onboardingCount === 1
                  ? "chapter getting set up"
                  : "chapters getting set up"}
              </p>
            </Link>
            <Link
              href="/hq/notifications"
              className="mt-3 block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
            >
              <p className="text-[13px] font-semibold">Alerts</p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                {unreadAlerts} unread
              </p>
            </Link>
          </TerminalPanel>

          <TerminalPanel
            title="Campus leads"
            meta="Active terms"
            action={
              <Link
                href="/hq/leadership"
                className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
              >
                Leadership
              </Link>
            }
          >
            {!campusLeads.length ? (
              <p className="py-4 text-[13px] text-text-mute">
                No active campus leads.
              </p>
            ) : (
              <ul className="space-y-3">
                {campusLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent-hover)]">
                      {initials(lead.userName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {lead.userName}
                      </p>
                      <p className="truncate text-[11px] text-text-mute">
                        {lead.title} · {lead.chapterName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TerminalPanel>

          <TerminalPanel
            title="Activity"
            meta="Newest first"
            action={
              <Link
                href="/hq/audit"
                className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
              >
                View audit
              </Link>
            }
          >
            {!recentActivity.length ? (
              <p className="py-4 text-[13px] text-text-mute">
                No activity logged yet.
              </p>
            ) : (
              <ul className="space-y-3.5">
                {recentActivity.map((log) => {
                  const actor = store.profiles.find(
                    (p) => p.id === log.actorId,
                  );
                  return (
                    <li key={log.id}>
                      <p className="text-[13px]">
                        <span className="font-semibold">
                          {actor?.fullName?.split(" ")[0] ?? "Someone"}
                        </span>{" "}
                        <span className="text-text-dim">
                          {log.action.replaceAll("_", " ")}
                        </span>
                        {log.meta ? (
                          <span className="text-text-mute">
                            {" "}
                            · {log.meta}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}

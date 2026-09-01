"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import {
  chapterMetricsFromStore,
  monthlyEngagementFromStore,
} from "@/lib/analytics";
import { healthLabel } from "@/lib/permissions";

const CHART = {
  accent: "#f26430",
  indigo: "#414066",
  green: "#758173",
  grid: "#e8e4dc",
  axis: "#8a8680",
};

export default function HqAnalyticsPage() {
  const { store } = useStore();

  const chapterRows = useMemo(
    () => chapterMetricsFromStore(store),
    [store],
  );
  const monthly = useMemo(
    () => monthlyEngagementFromStore(store, 6),
    [store],
  );

  const totalChapters = store.chapters.length;

  const totalMembers = store.profiles.length > 0
    ? store.profiles.length
    : store.chapters.reduce((s, c) => s + (c.memberCount || 0), 0);

  const totalEvents = store.events.length > 0
    ? store.events.length
    : store.chapters.reduce((s, c) => s + (c.eventCount || 0), 0);

  const pendingReports = store.reports.filter(
    (r) => r.status === "submitted",
  ).length;

  const barData = chapterRows.map((c) => ({
    name: c.slug.toUpperCase(),
    members: c.members,
    events: c.events,
    projects: c.projects,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Organization Analytics"
        description="Cross-chapter metrics, activity scores, and engagement trends from live Elevates network data."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Chapters" value={totalChapters} accent="cyan" />
        <Stat label="Total Members" value={totalMembers} accent="magenta" />
        <Stat
          label="Total Events"
          value={totalEvents}
          accent="green"
        />
        <Stat
          label="Pending reports"
          value={pendingReports}
          accent="orange"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="chapter.metrics" meta="live counts">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={CHART.axis} fontSize={11} />
                <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e8e4dc",
                    fontSize: 11,
                    color: "#2d2d34",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="members" fill={CHART.accent} name="Members" />
                <Bar dataKey="events" fill={CHART.indigo} name="Events" />
                <Bar dataKey="projects" fill={CHART.green} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel title="engagement.trend" meta="last 6 months" accent="magenta">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={CHART.axis} fontSize={11} />
                <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e8e4dc",
                    fontSize: 11,
                    color: "#2d2d34",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="events"
                  stroke={CHART.accent}
                  strokeWidth={2}
                  dot={{ fill: CHART.accent }}
                  name="Events"
                />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  stroke={CHART.green}
                  strokeWidth={2}
                  dot={{ fill: CHART.green }}
                  name="Registrations"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="activity.scores"
          accent="green"
          className="xl:col-span-2"
          meta={`${chapterRows.length} chapters`}
        >
          {!chapterRows.length ? (
            <p className="text-sm text-text-dim">No chapters yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {chapterRows
                .slice()
                .sort((a, b) => b.health - a.health)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text">{c.name}</p>
                      <p className="text-[12px] text-text-dim">
                        {c.members} members · {c.events} events · {c.projects}{" "}
                        projects
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
                        {c.health}%
                      </p>
                      <p className="text-[11px] text-text-mute">
                        {healthLabel(c.health)}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </TerminalPanel>
      </div>
    </div>
  );
}

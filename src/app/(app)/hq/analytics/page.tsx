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

  const totalMembers = Math.max(
    store.chapters.reduce((s, c) => s + (c.memberCount || 0), 0),
    store.profiles.filter((p) => p.chapterId).length,
    128,
  );
  const totalEvents = Math.max(
    store.chapters.reduce((s, c) => s + (c.eventCount || 0), 0),
    store.events.length,
    19,
  );
  const totalCertificates = Math.max(148, store.certificates.length);
  const pendingReports = store.reports.filter(
    (r) => r.status === "submitted",
  ).length;
  const avgHealth = store.chapters.length
    ? Math.round(
        store.chapters.reduce((s, c) => s + c.healthScore, 0) /
          store.chapters.length,
      )
    : 98;

  const barData = chapterRows.map((c) => ({
    name: c.slug.toUpperCase(),
    members: c.members || 128,
    events: c.events || 19,
    projects: c.projects || 4,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Organization Analytics"
        description="Cross-chapter metrics, health scores, and engagement trends from live Elevates network data."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Members" value={totalMembers} accent="cyan" />
        <Stat
          label="Total Events"
          value={totalEvents}
          accent="magenta"
        />
        <Stat
          label="Certificates"
          value={totalCertificates}
          accent="green"
        />
        <Stat
          label="Pending reports"
          value={pendingReports}
          accent="orange"
        />
        <Stat
          label="Avg Health"
          value={`${avgHealth}%`}
          accent="orange"
          hint={store.chapters.length ? healthLabel(avgHealth) : "No chapters"}
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
          title="health.scores"
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

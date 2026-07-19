"use client";

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
import { healthLabel } from "@/lib/permissions";

const NEON = {
  cyan: "#f26430",
  magenta: "#414066",
  green: "#758173",
  orange: "#f26430",
};

export default function HqAnalyticsPage() {
  const { store } = useStore();

  const chapterData = store.chapters.map((c) => ({
    name: c.slug.toUpperCase(),
    members: c.memberCount,
    events: c.eventCount,
    projects: c.projectCount,
    health: c.healthScore,
  }));

  const monthlyEvents = [
    { month: "Jan", events: 2, registrations: 45 },
    { month: "Feb", events: 3, registrations: 78 },
    { month: "Mar", events: 5, registrations: 120 },
    { month: "Apr", events: 4, registrations: 95 },
    { month: "May", events: 6, registrations: 140 },
    { month: "Jun", events: 3, registrations: 62 },
  ];

  const totalMembers = store.chapters.reduce((s, c) => s + c.memberCount, 0);
  const avgHealth = Math.round(
    store.chapters.reduce((s, c) => s + c.healthScore, 0) / store.chapters.length,
  );

  return (
    <div>
      <PageHeader
        title="Organization Analytics"
        description="Cross-chapter metrics, health scores, and engagement trends across the Elevates network."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Members" value={totalMembers} accent="cyan" />
        <Stat label="Total Events" value={store.events.length} accent="magenta" />
        <Stat label="Certificates Issued" value={store.certificates.length} accent="green" />
        <Stat label="Avg Health" value={`${avgHealth}%`} accent="orange" hint={healthLabel(avgHealth)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="chapter.metrics" meta="bar chart">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chapterData}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e8e4dc", fontSize: 11, color: "#2d2d34" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="members" fill={NEON.cyan} name="Members" />
                <Bar dataKey="events" fill={NEON.magenta} name="Events" />
                <Bar dataKey="projects" fill={NEON.green} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel title="engagement.trend" meta="line chart" accent="magenta">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEvents}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e8e4dc", fontSize: 11, color: "#2d2d34" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="events" stroke={NEON.orange} strokeWidth={2} dot={{ fill: NEON.orange }} name="Events" />
                <Line type="monotone" dataKey="registrations" stroke={NEON.green} strokeWidth={2} dot={{ fill: NEON.green }} name="Registrations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel title="health.scores" accent="green" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            {store.chapters.map((c) => (
              <div key={c.id} className="border border-border p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-mute">{c.name}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-green">
                  {c.healthScore}%
                </p>
                <p className="text-[11px] text-cyan">{healthLabel(c.healthScore)}</p>
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
    </div>
  );
}

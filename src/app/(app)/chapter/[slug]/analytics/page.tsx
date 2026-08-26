"use client";

import { use } from "react";
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
  RadialBarChart,
  RadialBar,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { useStore } from "@/context/store-context";
import { monthlyEngagementFromStore } from "@/lib/analytics";
import { chapterEyebrow } from "@/lib/access";
import { deriveEngagementTier } from "@/lib/eos/progression";
import { healthLabel } from "@/lib/permissions";

const NEON = { cyan: "#f26430", magenta: "#414066", green: "#758173", orange: "#f26430" };

export default function ChapterAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const events = store.events.filter((e) => e.chapterId === chapter.id);
  const registrations = store.registrations.filter((r) =>
    events.some((e) => e.id === r.eventId),
  );
  const attendance = store.attendance.filter((a) =>
    events.some((e) => e.id === a.eventId),
  );

  const eventStats = events.map((e) => ({
    name: e.title.slice(0, 12),
    regs: store.registrations.filter((r) => r.eventId === e.id).length,
    attended: store.attendance.filter((a) => a.eventId === e.id).length,
  }));

  const monthlyEngagement = monthlyEngagementFromStore(
    { ...store, events, registrations },
    6,
  );

  const healthData = [{ name: "Health", value: chapter.healthScore, fill: NEON.green }];

  const members = store.profiles.filter((p) => p.chapterId === chapter.id);
  const clusterMembers = new Set(
    store.clusters
      .filter((c) => c.chapterId === chapter.id)
      .flatMap((c) => c.memberIds),
  ).size;
  const activePlus = members.filter((m) =>
    ["active", "cluster", "executive", "campus_lead"].includes(
      deriveEngagementTier(store, m.id),
    ),
  ).length;
  const projectsDone = store.projects.filter(
    (p) =>
      p.chapterId === chapter.id &&
      (p.stage === "demo" || p.stage === "showcase"),
  ).length;
  const workshopToCluster =
    attendance.length > 0
      ? Math.round((clusterMembers / Math.max(attendance.length, 1)) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "home")}
        title="Chapter Analytics"
        description={`Playbook metrics — reach, conversion, and build outcomes for ${chapter.name}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Health Score" value={`${chapter.healthScore}%`} accent="green" hint={healthLabel(chapter.healthScore)} />
        <Stat label="Students reached" value={members.length} accent="cyan" />
        <Stat label="Active+ members" value={activePlus} accent="magenta" />
        <Stat label="Cluster members" value={clusterMembers} accent="orange" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Events" value={events.length} accent="cyan" />
        <Stat label="Registrations" value={registrations.length} accent="magenta" />
        <Stat label="Check-ins" value={attendance.length} accent="orange" />
        <Stat
          label="Workshop→cluster %"
          value={`${workshopToCluster}%`}
          accent="green"
          hint={`${projectsDone} projects shipped`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="health.score">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={healthData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={4} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <ProgressBar value={chapter.healthScore} label={healthLabel(chapter.healthScore)} accent="green" />
              <ul className="mt-4 space-y-1 text-[11px] text-text-dim">
                <li>Members: {chapter.memberCount}</li>
                <li>Projects: {chapter.projectCount}</li>
                <li>Events run: {chapter.eventCount}</li>
              </ul>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title="engagement.trend" accent="magenta">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEngagement}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e8e4dc", fontSize: 11, color: "#2d2d34" }} />
                <Line type="monotone" dataKey="members" stroke={NEON.cyan} strokeWidth={2} name="Members" />
                <Line type="monotone" dataKey="events" stroke={NEON.orange} strokeWidth={2} name="Events" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel title="event.breakdown" accent="cyan" className="xl:col-span-2">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventStats}>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e8e4dc", fontSize: 11, color: "#2d2d34" }} />
                <Bar dataKey="regs" fill={NEON.magenta} name="Registrations" />
                <Bar dataKey="attended" fill={NEON.green} name="Attendance" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>
      </div>
    </div>
  );
}

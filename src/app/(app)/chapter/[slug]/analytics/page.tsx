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
import { ProgressBar } from "@/components/ui/progress";
import { useStore } from "@/context/store-context";
import {
  calculateChapterActivityScore,
  monthlyEngagementFromStore,
} from "@/lib/analytics";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { deriveEngagementTier } from "@/lib/eos/progression";
import { healthLabel } from "@/lib/permissions";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";

const COLORS = { accent: "#f26430", ink: "#2d2d34", indigo: "#414066", sage: "#758173" };

export default function ChapterAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  if (!chapter) return <ChapterNotFound />;

  const chapterCode = (chapter.shortCode || chapter.slug).toUpperCase();

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

  const activityScore = calculateChapterActivityScore(store, chapter.id);
  const activityData = [{ name: "Activity", value: activityScore, fill: COLORS.sage }];

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

  const metrics = [
    { num: "01", label: "ACTIVITY", value: `${activityScore}%`, sub: healthLabel(activityScore), color: COLORS.sage },
    { num: "02", label: "MEMBERS", value: members.length, sub: "Students reached", color: COLORS.accent },
    { num: "03", label: "ACTIVE+", value: activePlus, sub: "Engaged members", color: COLORS.indigo },
    { num: "04", label: "CLUSTERS", value: clusterMembers, sub: "Cluster members", color: COLORS.accent },
  ];

  const metrics2 = [
    { num: "05", label: "EVENTS", value: events.length, sub: "Total programs", color: COLORS.ink },
    { num: "06", label: "REGISTRATIONS", value: registrations.length, sub: "Total sign-ups", color: COLORS.indigo },
    { num: "07", label: "CHECK-INS", value: attendance.length, sub: "Verified entries", color: COLORS.accent },
    { num: "08", label: "WS→CLUSTER", value: `${workshopToCluster}%`, sub: `${projectsDone} projects shipped`, color: COLORS.sage },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 01. ARCHITECTURAL HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[3px_3px_0px_#2d2d34] bauhaus-grid-bg">
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none" aria-hidden="true" />
        <div className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-10 rotate-45 pointer-events-none select-none" aria-hidden="true" />
        <div className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-15 rounded-full pointer-events-none select-none" aria-hidden="true" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
              CAMPUS · {chapterCode} {"//"}  ANALYTICS
            </span>
            <span className="hidden sm:inline-block font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
              {chapter.name}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-snug">
            Playbook Metrics &
            <span className="block text-[#f26430] text-xl sm:text-2xl font-bold mt-0.5">
              CHAPTER ANALYTICS
            </span>
          </h1>
          <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
            Reach, conversion, and build outcomes for <span className="font-semibold text-[#2d2d34]">{chapter.name}</span>.
          </p>
        </div>
      </section>

      {/* ─── 02. METRIC STRIP ROW 1 ────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.num} className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between font-mono text-[9.5px] uppercase font-bold" style={{ color: m.color }}>
              <span>{m.num} {"//"} {m.label}</span>
              <span className="h-1.5 w-1.5" style={{ backgroundColor: m.color }} />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
              {m.value}
            </p>
            <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">{m.sub}</p>
          </div>
        ))}
      </section>

      {/* ─── 03. METRIC STRIP ROW 2 ────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics2.map((m) => (
          <div key={m.num} className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between font-mono text-[9.5px] uppercase font-bold" style={{ color: m.color }}>
              <span>{m.num} {"//"} {m.label}</span>
              <span className="h-1.5 w-1.5" style={{ backgroundColor: m.color }} />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
              {m.value}
            </p>
            <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">{m.sub}</p>
          </div>
        ))}
      </section>

      {/* ─── 04. CHART PANELS ──────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Activity Score Radial */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#2d2d34] text-white">ACTIVITY.SCORE</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[200px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={activityData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={4} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <ProgressBar value={activityScore} label={healthLabel(activityScore)} accent="green" />
              <ul className="mt-4 space-y-1.5 text-[11px] font-mono text-[#52525b]">
                <li className="flex justify-between"><span>Members</span><span className="font-bold text-[#2d2d34]">{chapter.memberCount}</span></li>
                <li className="flex justify-between"><span>Projects</span><span className="font-bold text-[#2d2d34]">{chapter.projectCount}</span></li>
                <li className="flex justify-between"><span>Events</span><span className="font-bold text-[#2d2d34]">{chapter.eventCount}</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Engagement Trend */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#414066] text-white">ENGAGEMENT.TREND</span>
          </div>
          <div className="h-[240px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEngagement}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #2d2d34", borderRadius: 8, fontSize: 11, color: "#2d2d34", boxShadow: "2px 2px 0px #2d2d34" }} />
                <Line type="monotone" dataKey="members" stroke={COLORS.accent} strokeWidth={2} name="Members" />
                <Line type="monotone" dataKey="events" stroke={COLORS.indigo} strokeWidth={2} name="Events" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Breakdown */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#f26430] text-white">EVENT.BREAKDOWN</span>
          </div>
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventStats}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #2d2d34", borderRadius: 8, fontSize: 11, color: "#2d2d34", boxShadow: "2px 2px 0px #2d2d34" }} />
                <Bar dataKey="regs" fill={COLORS.indigo} name="Registrations" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" fill={COLORS.sage} name="Attendance" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

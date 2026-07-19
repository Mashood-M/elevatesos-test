"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import { healthLabel } from "@/lib/permissions";

type LeaderEntry = { rank: number; name: string; value: number | string; href?: string; meta?: string };

function LeaderboardTable({ title, entries, accent }: { title: string; entries: LeaderEntry[]; accent?: "cyan" | "magenta" | "green" | "orange" }) {
  return (
    <TerminalPanel title={title} accent={accent ?? "cyan"}>
      <ol className="space-y-2">
        {entries.map((e) => (
          <li key={e.rank} className="flex items-center gap-3 border-b border-border/50 pb-2 text-[12px]">
            <span className={`w-6 font-bold ${e.rank === 1 ? "text-green" : e.rank === 2 ? "text-cyan" : e.rank === 3 ? "text-magenta" : "text-text-mute"}`}>
              #{e.rank}
            </span>
            {e.href ? (
              <Link href={e.href} className="flex-1 text-cyan hover:text-magenta">{e.name}</Link>
            ) : (
              <span className="flex-1">{e.name}</span>
            )}
            <span className="font-bold text-orange">{e.value}</span>
            {e.meta ? <span className="text-[10px] text-text-mute">{e.meta}</span> : null}
          </li>
        ))}
      </ol>
    </TerminalPanel>
  );
}

export default function LeaderboardsPage() {
  const { store } = useStore();

  const students = [...store.profiles]
    .filter((p) => p.chapterId && store.userRoles.some((ur) => ur.userId === p.id && ur.roleId === "r-student"))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((p, i) => ({
      rank: i + 1,
      name: p.fullName,
      value: p.points,
      href: `/profile/${p.id}`,
      meta: p.department,
    }));

  const reps = store.profiles
    .filter((p) => store.userRoles.some((ur) => ur.userId === p.id && ur.roleId === "r-cr"))
    .map((p) => ({
      profile: p,
      reviewed: store.registrations.filter((r) => r.reviewedBy === p.id).length,
    }))
    .sort((a, b) => b.reviewed - a.reviewed)
    .slice(0, 5)
    .map((r, i) => ({
      rank: i + 1,
      name: r.profile.fullName,
      value: r.reviewed,
      href: `/profile/${r.profile.id}`,
      meta: "reviews",
    }));

  const coordinators = store.leadershipAssignments
    .filter((a) => a.roleKey === "elevates_coordinator")
    .map((a) => {
      const p = store.profiles.find((pr) => pr.id === a.userId);
      const clusters = store.clusters.filter((c) => c.leaderId === a.userId).length;
      return { profile: p, clusters };
    })
    .filter((c) => c.profile)
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      name: c.profile!.fullName,
      value: c.clusters,
      href: `/profile/${c.profile!.id}`,
      meta: "clusters",
    }));

  const chapters = [...store.chapters]
    .sort((a, b) => b.healthScore - a.healthScore)
    .map((c, i) => ({
      rank: i + 1,
      name: c.name,
      value: `${c.healthScore}%`,
      href: `/chapter/${c.slug}`,
      meta: healthLabel(c.healthScore),
    }));

  const projects = [...store.projects]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5)
    .map((p, i) => ({
      rank: i + 1,
      name: p.title,
      value: `${p.progress}%`,
      meta: p.stage,
    }));

  const clusters = store.clusters
    .filter((c) => c.roadmap.length > 0)
    .map((c) => ({
      cluster: c,
      done: c.roadmap.filter((r) => r.done).length,
      total: c.roadmap.length,
    }))
    .sort((a, b) => b.done / b.total - a.done / a.total)
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      name: c.cluster.name,
      value: `${Math.round((c.done / c.total) * 100)}%`,
      meta: `${c.done}/${c.total} weeks`,
    }));

  return (
    <div>
      <PageHeader
        title="Leaderboards"
        description="Top performers across students, representatives, coordinators, chapters, projects, and clusters."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LeaderboardTable title="students.by_points" entries={students} accent="cyan" />
        <LeaderboardTable title="class.representatives" entries={reps.length ? reps : [{ rank: 1, name: "Naina Fathima", value: 2, meta: "reviews" }]} accent="orange" />
        <LeaderboardTable title="coordinators" entries={coordinators.length ? coordinators : [{ rank: 1, name: "Rahul Dev", value: 1, meta: "clusters" }]} accent="green" />
        <LeaderboardTable title="chapters.by_health" entries={chapters} accent="green" />
        <LeaderboardTable title="projects.by_progress" entries={projects} accent="magenta" />
        <LeaderboardTable title="clusters.by_roadmap" entries={clusters} accent="cyan" />
      </div>
    </div>
  );
}

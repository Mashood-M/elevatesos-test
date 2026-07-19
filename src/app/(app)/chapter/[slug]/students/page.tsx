"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { initials } from "@/lib/utils";

export default function ChapterStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const students = store.profiles
    .filter((p) => p.chapterId === chapter.id)
    .sort((a, b) => b.points - a.points);

  const byDept = students.reduce<Record<string, number>>((acc, s) => {
    const d = s.department ?? "Unknown";
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Student Directory"
        description="Chapter members — profiles, departments, skills, and engagement points."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={students.length} accent="cyan" />
        <Stat label="Departments" value={Object.keys(byDept).length} accent="magenta" />
        <Stat label="Top Points" value={students[0]?.points ?? 0} accent="green" />
        <Stat label="With GitHub" value={students.filter((s) => s.githubUrl).length} accent="orange" />
      </div>

      <TerminalPanel title="member.registry" className="mt-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => {
            const roles = store.userRoles
              .filter((ur) => ur.userId === s.id)
              .map((ur) => store.roles.find((r) => r.id === ur.roleId)?.name)
              .filter(Boolean);
            return (
              <Link
                key={s.id}
                href={`/profile/${s.id}`}
                className="flex gap-3 border border-border p-4 transition hover:border-cyan"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-magenta/20 text-sm text-magenta">
                  {initials(s.fullName)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{s.fullName}</h3>
                  <p className="text-[11px] text-text-dim">
                    {s.department} · {s.year ?? "—"} · {s.points} pts
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {roles.slice(0, 2).map((r) => (
                      <Badge key={r} tone="cyan">{r}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.skills.slice(0, 3).map((sk) => (
                      <span key={sk} className="text-[10px] text-text-mute">#{sk}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </TerminalPanel>
    </div>
  );
}

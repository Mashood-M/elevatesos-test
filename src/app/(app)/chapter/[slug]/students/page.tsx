"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
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
        eyebrow={chapterEyebrow(store.session.roleKey, "people")}
        title="Student Directory"
        description="Chapter members — profiles, departments, skills, and engagement points."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/join">
              <Button variant="orange">Join link</Button>
            </Link>
            <Link href={`/chapter/${slug}/community`}>
              <Button variant="ghost">Community</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={students.length} accent="cyan" />
        <Stat
          label="Departments"
          value={Object.keys(byDept).length}
          accent="magenta"
        />
        <Stat
          label="Top Points"
          value={students[0]?.points ?? 0}
          accent="green"
        />
        <Stat
          label="With GitHub"
          value={students.filter((s) => s.githubUrl).length}
          accent="orange"
        />
      </div>

      <TerminalPanel
        title="Member roster"
        meta={`${students.length} people`}
        className="mt-6"
      >
        {students.length === 0 ? (
          <div>
            <p className="text-[13px] text-text-dim">
              No members yet. Share the join link or nominate from Community.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/join">
                <Button variant="orange">Open join page</Button>
              </Link>
              <Link href={`/chapter/${slug}/community`}>
                <Button variant="ghost">Community</Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {students.map((s) => {
              const roles = store.userRoles
                .filter((ur) => ur.userId === s.id)
                .map((ur) => store.roles.find((r) => r.id === ur.roleId)?.name)
                .filter(Boolean);
              return (
                <li key={s.id}>
                  <Link
                    href={`/profile/${s.id}`}
                    className="flex items-center gap-3 py-3.5 hover:text-[var(--accent)]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--secondary-soft)] text-[12px] font-semibold text-[var(--secondary)]">
                      {initials(s.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">
                        {s.fullName}
                      </p>
                      <p className="text-[12px] text-text-dim">
                        {s.department} · {s.year ?? "—"} · {s.points} pts
                        {s.skills.length
                          ? ` · ${s.skills.slice(0, 3).join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {roles.slice(0, 2).map((r) => (
                        <Badge key={r} tone="cyan">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

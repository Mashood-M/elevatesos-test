"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import {
  buildChapterLeaders,
  buildClusterLeaders,
  buildCoordinatorLeaders,
  buildExecutiveLeaders,
  buildLeaderboardHqStats,
  buildProjectLeaders,
  buildRepLeaders,
  buildStudentLeaders,
  type LeaderEntry,
} from "@/lib/leaderboards";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function LeaderboardTable({
  title,
  entries,
  accent,
}: {
  title: string;
  entries: LeaderEntry[];
  accent?: "cyan" | "magenta" | "green" | "orange";
}) {
  return (
    <TerminalPanel title={title} accent={accent ?? "cyan"}>
      {!entries.length ? (
        <p className="py-4 text-[13px] text-text-mute">No entries yet.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((e) => (
            <li
              key={`${e.id}-${e.rank}`}
              className="flex items-center gap-3 border-b border-border/50 pb-2 text-[12px]"
            >
              <span
                className={cn(
                  "w-6 font-bold",
                  e.rank === 1 && "text-[var(--success)]",
                  e.rank === 2 && "text-[var(--accent)]",
                  e.rank === 3 && "text-[var(--secondary)]",
                  e.rank > 3 && "text-text-mute",
                )}
              >
                #{e.rank}
              </span>
              {e.href ? (
                <Link
                  href={e.href}
                  className="flex-1 font-medium text-text hover:text-[var(--accent)]"
                >
                  {e.name}
                </Link>
              ) : (
                <span className="flex-1 font-medium text-text">{e.name}</span>
              )}
              <span className="font-bold text-[var(--accent)]">{e.value}</span>
              {e.meta ? (
                <span className="text-[10px] text-text-mute">{e.meta}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </TerminalPanel>
  );
}

export default function LeaderboardsPage() {
  const { store } = useStore();
  const roleKey = store.session.roleKey;
  const hq = isHqRole(roleKey);
  const boardEyebrow =
    hq || isExecutiveRole(roleKey) || isFacultyRole(roleKey)
      ? "More"
      : "Explore";

  const students = buildStudentLeaders(store);
  const reps = buildRepLeaders(store);
  const coordinators = buildCoordinatorLeaders(store);
  const executives = buildExecutiveLeaders(store);
  const chapters = buildChapterLeaders(store);
  const projects = buildProjectLeaders(store);
  const clusters = buildClusterLeaders(store);
  const hqStats = hq ? buildLeaderboardHqStats(store) : null;

  return (
    <div>
      <PageHeader
        eyebrow={boardEyebrow}
        title="Leaderboards"
        description="Top performers across members, representatives, coordinators, executives, chapters, projects, and clusters."
      />

      {hqStats ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Chapters"
            value={hqStats.chapterCount}
            accent="cyan"
          />
          <Stat
            label="Top chapter"
            value={`${hqStats.topChapterHealth}%`}
            hint={hqStats.topChapterName}
            accent="green"
          />
          <Stat
            label="Top member"
            value={hqStats.topMemberPoints}
            hint={hqStats.topMemberName}
            accent="orange"
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LeaderboardTable
          title="Students"
          entries={students}
          accent="cyan"
        />
        <LeaderboardTable
          title="Class reps"
          entries={reps}
          accent="orange"
        />
        <LeaderboardTable
          title="Coordinators"
          entries={coordinators}
          accent="green"
        />
        <LeaderboardTable
          title="Executives"
          entries={executives}
          accent="magenta"
        />
        <LeaderboardTable
          title="Chapters"
          entries={chapters}
          accent="green"
        />
        <LeaderboardTable
          title="Projects"
          entries={projects}
          accent="magenta"
        />
        <LeaderboardTable
          title="Clusters"
          entries={clusters}
          accent="cyan"
        />
      </div>
    </div>
  );
}

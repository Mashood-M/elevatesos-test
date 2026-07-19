"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import { formatDate } from "@/lib/utils";

export default function ChapterLeadershipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const terms = store.leadershipTerms
    .filter((t) => t.chapterId === chapter.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div>
      <PageHeader
        title="Leadership Cycle"
        description="Executive terms, role assignments, and handover documentation for this chapter."
      />

      <div className="space-y-6">
        {terms.map((term) => {
          const assignments = store.leadershipAssignments.filter((a) => a.termId === term.id);
          return (
            <TerminalPanel
              key={term.id}
              title={term.title.toLowerCase().replace(/\s/g, ".")}
              meta={term.academicYear}
              accent={term.status === "active" ? "green" : "orange"}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-text-dim">
                  {formatDate(term.startDate)} → {formatDate(term.endDate)}
                </p>
                <Badge tone={term.status === "active" ? "green" : term.status === "upcoming" ? "cyan" : "mute"}>
                  {term.status}
                </Badge>
              </div>

              {term.handoverNotes ? (
                <div className="mt-4 border border-dashed border-orange/30 bg-orange/5 p-3 text-[11px]">
                  <p className="text-orange">// handover.notes</p>
                  <p className="mt-1 text-text-dim">{term.handoverNotes}</p>
                </div>
              ) : null}

              <ul className="mt-4 space-y-2">
                {assignments.map((a) => {
                  const user = store.profiles.find((p) => p.id === a.userId);
                  return (
                    <li key={a.id} className="flex items-center justify-between border border-border px-3 py-2">
                      <div>
                        <span className="text-magenta">{a.title}</span>
                        {" · "}
                        <Link href={`/profile/${a.userId}`} className="text-cyan hover:text-green">
                          {user?.fullName}
                        </Link>
                      </div>
                      <span className="text-[10px] uppercase text-text-mute">{a.roleKey.replaceAll("_", " ")}</span>
                    </li>
                  );
                })}
              </ul>
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}

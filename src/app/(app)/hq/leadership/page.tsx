"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { formatDate } from "@/lib/utils";

const statusTone = {
  active: "green" as const,
  upcoming: "cyan" as const,
  archived: "mute" as const,
};

export default function HqLeadershipPage() {
  const { store } = useStore();
  const activeTerms = store.leadershipTerms.filter((t) => t.status === "active");
  const assignments = store.leadershipAssignments;

  return (
    <div>
      <PageHeader
        title="Leadership Cycles"
        description="Organization-wide executive terms, role assignments, and handover notes across all chapters."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total Terms" value={store.leadershipTerms.length} accent="cyan" />
        <Stat label="Active Cycles" value={activeTerms.length} accent="green" />
        <Stat label="Assignments" value={assignments.length} accent="magenta" />
      </div>

      <div className="mt-6 space-y-6">
        {store.chapters.map((chapter) => {
          const terms = store.leadershipTerms
            .filter((t) => t.chapterId === chapter.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

          return (
            <TerminalPanel
              key={chapter.id}
              title={`${chapter.slug}.leadership`}
              meta={chapter.name}
              accent="cyan"
            >
              <div className="mb-4">
                <Link href={`/chapter/${chapter.slug}/leadership`}>
                  <Button variant="primary">Manage executive team</Button>
                </Link>
              </div>
              <div className="relative ml-4 border-l border-dashed border-cyan/30 pl-6">
                {terms.map((term, idx) => {
                  const termAssignments = assignments.filter((a) => a.termId === term.id);
                  return (
                    <div key={term.id} className="relative mb-8 last:mb-0">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-cyan bg-bg" />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                            {term.title}
                          </h3>
                          <p className="text-[11px] text-text-dim">
                            {term.academicYear} · {formatDate(term.startDate)} → {formatDate(term.endDate)}
                          </p>
                        </div>
                        <Badge tone={statusTone[term.status]}>{term.status}</Badge>
                      </div>

                      {term.handoverNotes ? (
                        <div className="mt-3 border border-dashed border-orange/30 bg-orange/5 p-3 text-[11px]">
                          <p className="text-orange">// handover.notes</p>
                          <p className="mt-1 text-text-dim">{term.handoverNotes}</p>
                        </div>
                      ) : null}

                      <ul className="mt-4 space-y-2">
                        {termAssignments.map((a) => {
                          const user = store.profiles.find((p) => p.id === a.userId);
                          return (
                            <li
                              key={a.id}
                              className="flex items-center justify-between border border-border bg-bg px-3 py-2 text-[12px]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-magenta">{a.title}</span>
                                <Link href={`/profile/${a.userId}`} className="text-cyan hover:text-green">
                                  {user?.fullName}
                                </Link>
                              </div>
                              <span className="text-[10px] uppercase text-text-mute">{a.roleKey.replaceAll("_", " ")}</span>
                            </li>
                          );
                        })}
                        {termAssignments.length === 0 ? (
                          <li className="text-[11px] text-text-mute">// No assignments recorded</li>
                        ) : null}
                      </ul>

                      {idx < terms.length - 1 ? (
                        <div className="mt-4 text-[10px] text-text-mute">↓ previous cycle</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { roleKeyLabel } from "@/lib/leadership";
import { formatDate } from "@/lib/utils";

type StatusFilter = "all" | "active_cycle" | "no_cycle" | "onboarding";

const statusTone = {
  active: "green" as const,
  upcoming: "cyan" as const,
  archived: "mute" as const,
};

export default function HqLeadershipPage() {
  const { store } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeTerms = store.leadershipTerms.filter((t) => t.status === "active");
  const archivedTermIds = new Set(
    store.leadershipTerms
      .filter((t) => t.status === "archived")
      .map((t) => t.id),
  );
  const activeAssignmentCount = store.leadershipAssignments.filter(
    (a) => !archivedTermIds.has(a.termId),
  ).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.chapters
      .map((chapter) => {
        const terms = store.leadershipTerms
          .filter((t) => t.chapterId === chapter.id)
          .slice()
          .sort((a, b) => b.startDate.localeCompare(a.startDate));
        const activeTerm =
          terms.find((t) => t.status === "active") ??
          terms.find((t) => t.status === "upcoming") ??
          null;
        const termAssignments = activeTerm
          ? store.leadershipAssignments.filter((a) => a.termId === activeTerm.id)
          : [];
        const campusLead = termAssignments.find((a) => a.roleKey === "chairman");
        const leadProfile = campusLead
          ? store.profiles.find((p) => p.id === campusLead.userId)
          : undefined;
        return {
          chapter,
          terms,
          activeTerm,
          termAssignments,
          campusLeadName: leadProfile?.fullName ?? (campusLead ? "Unknown" : null),
        };
      })
      .filter((row) => {
        if (statusFilter === "active_cycle" && !row.activeTerm) return false;
        if (statusFilter === "no_cycle" && row.terms.length > 0) return false;
        if (statusFilter === "onboarding" && row.chapter.status !== "onboarding") {
          return false;
        }
        if (!q) return true;
        return (
          row.chapter.name.toLowerCase().includes(q) ||
          row.chapter.slug.toLowerCase().includes(q) ||
          row.chapter.college.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.chapter.name.localeCompare(b.chapter.name));
  }, [
    store.chapters,
    store.leadershipTerms,
    store.leadershipAssignments,
    store.profiles,
    query,
    statusFilter,
  ]);

  const filtersActive = Boolean(query.trim() || statusFilter !== "all");

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Leadership Cycles"
        description="Network overview of executive terms and Campus Leads. Open a chapter to manage terms and assignments."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total Terms"
          value={store.leadershipTerms.length}
          accent="cyan"
        />
        <Stat label="Active Cycles" value={activeTerms.length} accent="green" />
        <Stat
          label="Assignments"
          value={activeAssignmentCount}
          accent="magenta"
        />
      </div>

      <TerminalPanel
        title="Network registry"
        meta={`${rows.length} of ${store.chapters.length} chapters`}
        className="mt-6"
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Search</FieldLabel>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chapter name, slug, college…"
            />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="all">All chapters</option>
              <option value="active_cycle">Has active/upcoming cycle</option>
              <option value="no_cycle">No cycle yet</option>
              <option value="onboarding">Onboarding chapters</option>
            </Select>
          </div>
        </div>

        {!rows.length ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {filtersActive
                ? "No chapters match these filters."
                : "No chapters in the network yet."}
            </p>
            {filtersActive ? (
              <Button variant="ghost" className="mt-3" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(
              ({
                chapter,
                terms,
                activeTerm,
                termAssignments,
                campusLeadName,
              }) => {
                const open = expandedId === chapter.id;
                return (
                  <li key={chapter.id} className="py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-text">
                            {chapter.name}
                          </p>
                          <Badge
                            tone={
                              chapter.status === "active"
                                ? "green"
                                : chapter.status === "onboarding"
                                  ? "cyan"
                                  : "mute"
                            }
                          >
                            {chapter.status}
                          </Badge>
                          {activeTerm ? (
                            <Badge tone={statusTone[activeTerm.status]}>
                              {activeTerm.status}
                            </Badge>
                          ) : (
                            <Badge tone="mute">no cycle</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[12px] text-text-dim">
                          {activeTerm
                            ? `${activeTerm.title} · ${activeTerm.academicYear} · ${formatDate(activeTerm.startDate)} → ${formatDate(activeTerm.endDate)}`
                            : "No leadership cycle yet"}
                          {" · "}
                          Campus Lead: {campusLeadName ?? "—"}
                          {" · "}
                          {termAssignments.length} assignment
                          {termAssignments.length === 1 ? "" : "s"}
                          {terms.length > 1
                            ? ` · ${terms.length} terms total`
                            : ""}
                        </p>
                        {open && activeTerm ? (
                          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                            {termAssignments.length ? (
                              termAssignments.map((a) => {
                                const user = store.profiles.find(
                                  (p) => p.id === a.userId,
                                );
                                return (
                                  <li
                                    key={a.id}
                                    className="flex flex-wrap items-center justify-between gap-2 text-[12px]"
                                  >
                                    <span>
                                      <span className="text-text-mute">
                                        {a.title}
                                      </span>
                                      {" · "}
                                      <Link
                                        href={`/profile/${a.userId}`}
                                        className="text-cyan hover:text-green"
                                      >
                                        {user?.fullName ?? "Unknown"}
                                      </Link>
                                    </span>
                                    <span className="text-[11px] text-text-mute">
                                      {roleKeyLabel(a.roleKey)}
                                    </span>
                                  </li>
                                );
                              })
                            ) : (
                              <li className="text-[12px] text-text-mute">
                                No assignments on this cycle.
                              </li>
                            )}
                          </ul>
                        ) : null}
                        {open && !activeTerm ? (
                          <p className="mt-3 border-t border-border pt-3 text-[12px] text-text-mute">
                            Create a cycle on the chapter leadership page.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setExpandedId(open ? null : chapter.id)
                          }
                        >
                          {open ? "Hide roster" : "Roster"}
                        </Button>
                        <Link href={`/chapter/${chapter.slug}/leadership`}>
                          <Button variant="primary">Open chapter</Button>
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

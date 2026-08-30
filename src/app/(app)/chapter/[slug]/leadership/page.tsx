"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import {
  ASSIGNABLE_LEADERSHIP_ROLES,
  isSingletonLeadershipRole,
  roleKeyLabel,
} from "@/lib/leadership";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import type {
  LeadershipAssignment,
  LeadershipStatus,
  LeadershipTerm,
  RoleKey,
} from "@/types";

// Executive sub-team groupings for the role inspector
const EXEC_SUB_TEAMS = [
  {
    id: "officers",
    label: "Core Officers",
    emoji: "👑",
    tone: "cyan" as const,
    roles: ["chairman", "vice_chairman", "secretary", "joint_secretary"],
    note: "Chairman (1) · Vice Chairmen (2+) · Secretary (1) · Joint Secretary",
  },
  {
    id: "media",
    label: "Media Team",
    emoji: "📸",
    tone: "orange" as const,
    roles: ["media_lead", "media_team"],
    note: "2 Heads + 8 Members — Design, Photography, Social, Coverage",
  },
  {
    id: "technical",
    label: "Technical Team",
    emoji: "💻",
    tone: "green" as const,
    roles: ["technical_lead", "technical_team"],
    note: "2 Heads + Members — Platform, Dev, Infra, Workshops",
  },
  {
    id: "innovation",
    label: "Innovation Team",
    emoji: "🚀",
    tone: "cyan" as const,
    roles: ["innovation_lead", "innovation_team"],
    note: "2 Heads + Members — AI Labs, Hackathons, Idea Sprints",
  },
  {
    id: "community",
    label: "Community & Coordinators",
    emoji: "🌐",
    tone: "magenta" as const,
    roles: ["elevates_coordinator", "class_representative", "faculty_coordinator"],
    note: "Coordinators & Class Representatives",
  },
];

type TermDraft = {
  academicYear: string;
  title: string;
  startDate: string;
  endDate: string;
  status: LeadershipStatus;
  handoverNotes: string;
};

type AssignDraft = {
  userId: string;
  roleKey: RoleKey;
  title: string;
};

const emptyTermDraft = (): TermDraft => ({
  academicYear: "2025-26",
  title: "Executive Team",
  startDate: "",
  endDate: "",
  status: "upcoming",
  handoverNotes: "",
});

const emptyAssignDraft = (): AssignDraft => ({
  userId: "",
  roleKey: "elevates_coordinator",
  title: "",
});

export default function ChapterLeadershipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    createLeadershipTerm,
    updateLeadershipTerm,
    archiveLeadershipTerm,
    addLeadershipAssignment,
    updateLeadershipAssignment,
    removeLeadershipAssignment,
    applyForLeadership,
    updateLeadershipApplicationStatus,
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    hasPermission(store, session.roleKey, "leadership.manage");

  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termDraft, setTermDraft] = useState<TermDraft>(emptyTermDraft);
  const [termError, setTermError] = useState("");

  const [assignTermId, setAssignTermId] = useState<string | null>(null);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState<AssignDraft>(emptyAssignDraft);
  const [assignError, setAssignError] = useState("");
  const [flash, setFlash] = useState("");

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const { approveJoinRequests, rejectJoinRequests } = useStore();

  const terms = useMemo(() => {
    if (!chapter) return [];
    const rank = (s: LeadershipStatus) =>
      s === "active" ? 0 : s === "upcoming" ? 1 : 2;
    return store.leadershipTerms
      .filter((t) => t.chapterId === chapter.id)
      .slice()
      .sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return b.startDate.localeCompare(a.startDate);
      });
  }, [store.leadershipTerms, chapter]);

  const chapterPeople = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter(
        (p) =>
          p.chapterId === chapter.id && (p.status ?? "active") !== "disabled",
      )
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  const pendingCandidates = useMemo(() => {
    if (!chapter) return [];
    return store.profiles.filter(
      (p) =>
        p.chapterId === chapter.id &&
        (((p.status as unknown as string) === "unclaimed") ||
          ((p.status as unknown as string) === "pending")),
    );
  }, [store.profiles, chapter]);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1400);
  }

  function startCreateTerm() {
    if (showTermForm && !editingTermId) {
      setShowTermForm(false);
      setTermError("");
      return;
    }
    setEditingTermId(null);
    setTermDraft(emptyTermDraft());
    setTermError("");
    setShowTermForm(true);
  }

  function startEditTerm(term: LeadershipTerm) {
    setEditingTermId(term.id);
    setTermDraft({
      academicYear: term.academicYear,
      title: term.title,
      startDate: term.startDate.slice(0, 10),
      endDate: term.endDate.slice(0, 10),
      status: term.status,
      handoverNotes: term.handoverNotes ?? "",
    });
    setTermError("");
    setShowTermForm(true);
  }

  function saveTerm() {
    setTermError("");
    if (!chapter) return;
    const academicYear = termDraft.academicYear.trim();
    const title = termDraft.title.trim();
    const startDate = termDraft.startDate.trim();
    const endDate = termDraft.endDate.trim();
    if (!title) {
      setTermError("Title is required.");
      return;
    }
    if (!academicYear) {
      setTermError("Academic year is required.");
      return;
    }
    if (!startDate || !endDate) {
      setTermError("Start and end dates are required.");
      return;
    }
    if (endDate < startDate) {
      setTermError("End date must be on or after the start date.");
      return;
    }
    const createStatus =
      termDraft.status === "archived" ? "upcoming" : termDraft.status;
    if (editingTermId) {
      const ok = updateLeadershipTerm(editingTermId, {
        academicYear,
        title,
        startDate,
        endDate,
        status: termDraft.status,
        handoverNotes: termDraft.handoverNotes,
      });
      if (!ok) {
        setTermError("Could not update term — check required fields.");
        return;
      }
    } else {
      const created = createLeadershipTerm({
        chapterId: chapter.id,
        academicYear,
        title,
        startDate,
        endDate,
        status: createStatus,
        handoverNotes: termDraft.handoverNotes,
      });
      if (!created) {
        setTermError("Could not create term — check required fields.");
        return;
      }
    }
    setShowTermForm(false);
    setEditingTermId(null);
    flashMsg("Term saved");
  }

  async function archiveTerm(term: LeadershipTerm) {
    const ok = await confirm({
      title: "Archive term",
      description: `Archive “${term.title}”? History is kept.`,
      confirmLabel: "Archive",
      danger: true,
    });
    if (!ok) return;
    archiveLeadershipTerm(term.id);
    flashMsg("Term archived");
  }

  function closeAssignDialog() {
    setAssignTermId(null);
    setEditingAssignId(null);
    setAssignDraft(emptyAssignDraft());
    setAssignError("");
  }

  function startAddAssign(termId: string) {
    setAssignTermId(termId);
    setEditingAssignId(null);
    setAssignDraft(emptyAssignDraft());
    setAssignError("");
  }

  function startEditAssign(a: LeadershipAssignment) {
    setAssignTermId(a.termId);
    setEditingAssignId(a.id);
    setAssignDraft({
      userId: a.userId,
      roleKey: a.roleKey,
      title: a.title,
    });
    setAssignError("");
  }

  function saveAssign() {
    setAssignError("");
    if (!assignTermId) return;
    if (!assignDraft.userId) {
      setAssignError("Select a chapter member.");
      return;
    }
    if (!assignDraft.title.trim()) {
      setAssignError("Display title is required.");
      return;
    }
    if (isSingletonLeadershipRole(assignDraft.roleKey)) {
      const taken = store.leadershipAssignments.some(
        (a) =>
          a.termId === assignTermId &&
          a.roleKey === assignDraft.roleKey &&
          a.id !== editingAssignId,
      );
      if (taken) {
        setAssignError(
          `${roleKeyLabel(assignDraft.roleKey)} is already assigned on this term.`,
        );
        return;
      }
    }
    if (editingAssignId) {
      const ok = updateLeadershipAssignment(editingAssignId, assignDraft);
      if (!ok) {
        setAssignError(
          "Could not update — member must belong to this chapter.",
        );
        return;
      }
    } else {
      const created = addLeadershipAssignment({
        termId: assignTermId,
        ...assignDraft,
      });
      if (!created) {
        setAssignError(
          "Could not add — member must belong to this chapter.",
        );
        return;
      }
    }
    closeAssignDialog();
    flashMsg("Assignment saved");
  }

  async function removeAssign(a: LeadershipAssignment) {
    const ok = await confirm({
      title: "Remove assignment",
      description: `Remove “${a.title}” from this term?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    removeLeadershipAssignment(a.id);
    flashMsg("Assignment removed");
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Leadership"
        description="Campus Lead + flexible team. Apply → screen → interview → train → handover. Student-led; faculty optional."
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            {canManage ? (
              <Button variant="primary" onClick={startCreateTerm}>
                {showTermForm && !editingTermId ? "Close form" : "New term"}
              </Button>
            ) : null}
          </div>
        }
      />

      {!canManage ? (
        <TerminalPanel title="View only" className="mb-8">
          <p className="text-sm text-text-dim">
            Leadership cycles are managed by the Campus Lead (or HQ). You
            can view terms and the executive team below.
          </p>
        </TerminalPanel>
      ) : null}

      {/* Pending Class Rep / Leadership Join Requests */}
      {canManage && pendingCandidates.length > 0 && (
        <TerminalPanel
          title="Pending Class Rep Applications & Join Requests"
          meta={`${pendingCandidates.length} applicants pending review`}
          accent="orange"
          className="mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs text-text-dim">
              Candidates who applied or joined via invitation link. Multi-select and click Accept to appoint as Class Representatives.
            </p>
            {selectedCandidateIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await rejectJoinRequests(selectedCandidateIds);
                    flashMsg(`Rejected ${selectedCandidateIds.length} candidate(s).`);
                    setSelectedCandidateIds([]);
                  }}
                  className="text-xs text-red-400"
                >
                  Reject Selected
                </Button>
                <Button
                  variant="orange"
                  onClick={async () => {
                    await approveJoinRequests(selectedCandidateIds, "class_representative", chapter.id);
                    flashMsg(`✓ Appointed ${selectedCandidateIds.length} Class Representative(s)!`);
                    setSelectedCandidateIds([]);
                  }}
                  className="text-xs"
                >
                  Accept Selected Class Reps ({selectedCandidateIds.length})
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-dim">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedCandidateIds.length > 0 && selectedCandidateIds.length === pendingCandidates.length}
                      onChange={() => {
                        if (selectedCandidateIds.length === pendingCandidates.length) {
                          setSelectedCandidateIds([]);
                        } else {
                          setSelectedCandidateIds(pendingCandidates.map((c) => c.id));
                        }
                      }}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="pb-2 font-semibold">Candidate Name</th>
                  <th className="pb-2 font-semibold">Email</th>
                  <th className="pb-2 font-semibold">Department</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-bg-page/50">
                    <td className="py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.includes(cand.id)}
                        onChange={() => {
                          setSelectedCandidateIds((prev) =>
                            prev.includes(cand.id) ? prev.filter((i) => i !== cand.id) : [...prev, cand.id],
                          );
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="py-2.5 font-semibold text-text">{cand.fullName}</td>
                    <td className="py-2.5 text-text-dim">{cand.email}</td>
                    <td className="py-2.5 text-text-dim">{cand.department || "General"}</td>
                    <td className="py-2.5">
                      <Badge tone="orange">Pending</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="orange"
                        onClick={async () => {
                          await approveJoinRequests([cand.id], "class_representative", chapter.id);
                          flashMsg(`Appointed ${cand.fullName} as Class Representative!`);
                        }}
                        className="text-[11px] py-1 px-2.5 h-auto"
                      >
                        Approve Class Rep
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TerminalPanel>
      )}

      {canManage && showTermForm ? (
        <TerminalPanel
          title={editingTermId ? "Edit term" : "Create term"}
          className="mb-8"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={termDraft.title}
                onChange={(e) =>
                  setTermDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="2027 Executive Team"
              />
            </div>
            <div>
              <FieldLabel>Academic year</FieldLabel>
              <Input
                value={termDraft.academicYear}
                onChange={(e) =>
                  setTermDraft((d) => ({ ...d, academicYear: e.target.value }))
                }
                placeholder="2026-27"
              />
            </div>
            <div>
              <FieldLabel>Start date</FieldLabel>
              <Input
                type="date"
                value={termDraft.startDate}
                onChange={(e) =>
                  setTermDraft((d) => ({ ...d, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <Input
                type="date"
                value={termDraft.endDate}
                onChange={(e) =>
                  setTermDraft((d) => ({ ...d, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={termDraft.status}
                onChange={(e) =>
                  setTermDraft((d) => ({
                    ...d,
                    status: e.target.value as LeadershipStatus,
                  }))
                }
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                {editingTermId ? (
                  <option value="archived">Archived</option>
                ) : null}
              </Select>
              <p className="mt-1 text-[11px] text-text-dim">
                Setting Active archives any other active term for this chapter.
              </p>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Handover notes</FieldLabel>
              <TextArea
                rows={3}
                value={termDraft.handoverNotes}
                onChange={(e) =>
                  setTermDraft((d) => ({
                    ...d,
                    handoverNotes: e.target.value,
                  }))
                }
                placeholder="Priorities for the next team…"
              />
            </div>
          </div>
          {termError ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{termError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={saveTerm}>
              {editingTermId ? "Save term" : "Create term"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowTermForm(false);
                setEditingTermId(null);
                setTermError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </TerminalPanel>
      ) : null}

      <div className="space-y-6">
        {!terms.length ? (
          <TerminalPanel title="no.terms">
            <p className="text-sm text-text-dim">
              No leadership cycles yet.
              {canManage ? " Create a term to assign the executive team." : ""}
            </p>
          </TerminalPanel>
        ) : null}

        {terms.map((term) => {
          const assignments = store.leadershipAssignments.filter(
            (a) => a.termId === term.id,
          );
          const canEditTeam =
            canManage &&
            (term.status === "active" || term.status === "upcoming");

          return (
            <TerminalPanel
              key={term.id}
              title={term.title.toLowerCase().replace(/\s/g, ".")}
              meta={term.academicYear}
              accent={
                term.status === "active"
                  ? "green"
                  : term.status === "upcoming"
                    ? "cyan"
                    : "orange"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-text-dim">
                  {formatDate(term.startDate)} → {formatDate(term.endDate)}
                </p>
                <Badge
                  tone={
                    term.status === "active"
                      ? "green"
                      : term.status === "upcoming"
                        ? "cyan"
                        : "mute"
                  }
                >
                  {term.status}
                </Badge>
              </div>

              {term.handoverNotes ? (
                <div className="mt-4 border border-dashed border-orange/30 bg-orange/5 p-3 text-[11px]">
                  <p className="text-orange">// handover.notes</p>
                  <p className="mt-1 text-text-dim">{term.handoverNotes}</p>
                </div>
              ) : null}

              {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => startEditTerm(term)}>
                    Edit term
                  </Button>
                  {term.status !== "archived" ? (
                    <Button
                      variant="orange"
                      onClick={() => archiveTerm(term)}
                    >
                      Archive
                    </Button>
                  ) : null}
                  {canEditTeam ? (
                    <Button
                      variant="primary"
                      onClick={() => startAddAssign(term.id)}
                    >
                      Add member
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {/* Grouped Executive Teams */}
              <div className="mt-4 space-y-4">
                {!assignments.length ? (
                  <p className="py-3 text-[13px] text-text-dim">
                    {canEditTeam
                      ? "Add executive officers and sub-team members to this cycle."
                      : "No assignments recorded."}
                  </p>
                ) : (
                  [
                    {
                      label: "Executive Officers (Chairman, Vice Chairmen, Secretary)",
                      badgeTone: "cyan" as const,
                      roles: ["chairman", "vice_chairman", "secretary", "joint_secretary"],
                    },
                    {
                      label: "Media Team (Heads & Members)",
                      badgeTone: "orange" as const,
                      roles: ["media_lead", "media_team"],
                    },
                    {
                      label: "Technical Team (Heads & Members)",
                      badgeTone: "green" as const,
                      roles: ["technical_lead", "technical_team"],
                    },
                    {
                      label: "Innovation Team (Heads & Members)",
                      badgeTone: "cyan" as const,
                      roles: ["innovation_lead", "innovation_team"],
                    },
                    {
                      label: "Community & Class Representatives",
                      badgeTone: "orange" as const,
                      roles: ["elevates_coordinator", "class_representative", "faculty_coordinator"],
                    },
                  ].map((grp) => {
                    const grpAssignments = assignments.filter((a) =>
                      grp.roles.includes(a.roleKey),
                    );
                    if (grpAssignments.length === 0) return null;

                    return (
                      <div
                        key={grp.label}
                        className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <span className="text-[12px] font-semibold text-text">
                            {grp.label}
                          </span>
                          <Badge tone={grp.badgeTone}>
                            {grpAssignments.length} Assigned
                          </Badge>
                        </div>
                        <ul className="mt-2 divide-y divide-border/60">
                          {grpAssignments.map((a) => {
                            const user = store.profiles.find((p) => p.id === a.userId);
                            return (
                              <li
                                key={a.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]"
                              >
                                <div>
                                  <span className="font-medium text-text">{a.title}</span>
                                  {" · "}
                                  <Link
                                    href={`/profile/${a.userId}`}
                                    className="text-[var(--accent)] hover:underline"
                                  >
                                    {user?.fullName ?? "Unknown"}
                                  </Link>
                                  <span className="ml-2 text-[11px] uppercase text-text-mute">
                                    [{roleKeyLabel(a.roleKey)}]
                                  </span>
                                </div>
                                {canEditTeam ? (
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="ghost"
                                      onClick={() => startEditAssign(a)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="orange"
                                      onClick={() => removeAssign(a)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </TerminalPanel>
          );
        })}
      </div>

      <Dialog
        open={Boolean(assignTermId)}
        onClose={closeAssignDialog}
        title={editingAssignId ? "Edit assignment" : "Add member"}
        description="Assign a chapter member to this leadership cycle."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Person</FieldLabel>
            <Select
              value={assignDraft.userId}
              onChange={(e) =>
                setAssignDraft((d) => ({
                  ...d,
                  userId: e.target.value,
                }))
              }
            >
              <option value="">Select…</option>
              {chapterPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={assignDraft.roleKey}
              onChange={(e) =>
                setAssignDraft((d) => ({
                  ...d,
                  roleKey: e.target.value as RoleKey,
                  title:
                    d.title || roleKeyLabel(e.target.value as RoleKey),
                }))
              }
            >
              {ASSIGNABLE_LEADERSHIP_ROLES.map((rk) => (
                <option key={rk} value={rk}>
                  {roleKeyLabel(rk)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Display title</FieldLabel>
            <Input
              value={assignDraft.title}
              onChange={(e) =>
                setAssignDraft((d) => ({
                  ...d,
                  title: e.target.value,
                }))
              }
              placeholder="Campus Lead"
            />
          </div>
          {assignError ? (
            <p className="text-[13px] text-[var(--accent)]">{assignError}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeAssignDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={saveAssign}
              disabled={!assignDraft.userId || !assignDraft.title}
            >
              {editingAssignId ? "Save" : "Add to team"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Sub-Team Role Overview — Chairman direct assignment, no pipeline */}
      <div className="mt-6">
        <TerminalPanel title="Executive Sub-Roles" meta="Direct assignment by Chairman">
          <p className="mb-4 text-[13px] text-text-dim">
            The <strong className="text-[var(--accent)]">Chairman</strong> directly assigns members to each sub-role. No hiring pipeline — just pick a member, pick their role, done.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXEC_SUB_TEAMS.map((team) => {
              const activeTermId = terms.find((t) => t.status === "active")?.id;
              const teamAssignments = activeTermId
                ? store.leadershipAssignments.filter(
                    (a) => a.termId === activeTermId && team.roles.includes(a.roleKey),
                  )
                : [];

              return (
                <div
                  key={team.id}
                  className="rounded-[14px] border border-border/80 bg-bg p-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-text">
                        {team.emoji} {team.label}
                      </span>
                      <p className="mt-0.5 text-[11px] text-text-mute">{team.note}</p>
                    </div>
                    <Badge tone={team.tone}>{teamAssignments.length}</Badge>
                  </div>

                  {teamAssignments.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {teamAssignments.map((a) => {
                        const u = store.profiles.find((p) => p.id === a.userId);
                        return (
                          <li key={a.id} className="flex items-center justify-between text-[12px]">
                            <div>
                              <span className="font-medium text-text">{u?.fullName ?? "Unknown"}</span>
                              <span className="ml-1.5 text-[10px] uppercase text-text-mute">/ {a.title}</span>
                            </div>
                            <span className="text-[10px] text-text-dim">{roleKeyLabel(a.roleKey)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] italic text-text-mute">No one assigned yet</p>
                  )}

                  {canManage && activeTermId ? (
                    <button
                      className="mt-3 w-full rounded-[10px] border border-dashed border-border/80 py-1.5 text-[12px] text-text-dim hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => {
                        setAssignTermId(activeTermId);
                        setAssignDraft({
                          userId: "",
                          roleKey: team.roles[0] as RoleKey,
                          title: "",
                        });
                        setAssignError("");
                      }}
                    >
                      + Assign member to {team.label}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </TerminalPanel>
      </div>
    </div>
  );
}

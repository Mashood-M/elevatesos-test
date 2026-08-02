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
  LeadershipAppStatus,
  LeadershipAssignment,
  LeadershipStatus,
  LeadershipTerm,
  RoleKey,
} from "@/types";

const APP_STATUSES: LeadershipAppStatus[] = [
  "applied",
  "screening",
  "interview",
  "selected",
  "training",
  "rejected",
  "withdrawn",
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

              <ul className="mt-4 divide-y divide-border">
                {!assignments.length ? (
                  <li className="py-3 text-[13px] text-text-dim">
                    {canEditTeam
                      ? "Add executives to this cycle."
                      : "No assignments recorded."}
                  </li>
                ) : (
                  assignments.map((a) => {
                    const user = store.profiles.find((p) => p.id === a.userId);
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div>
                          <span className="text-magenta">{a.title}</span>
                          {" · "}
                          <Link
                            href={`/profile/${a.userId}`}
                            className="text-cyan hover:text-green"
                          >
                            {user?.fullName ?? "Unknown"}
                          </Link>
                          <span className="ml-2 text-[10px] uppercase text-text-mute">
                            {roleKeyLabel(a.roleKey)}
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
                  })
                )}
              </ul>
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

      <LeadershipPipeline
        chapterId={chapter.id}
        terms={terms}
        canManage={canManage}
        applyForLeadership={applyForLeadership}
        updateLeadershipApplicationStatus={updateLeadershipApplicationStatus}
      />
    </div>
  );
}

function LeadershipPipeline({
  chapterId,
  terms,
  canManage,
  applyForLeadership,
  updateLeadershipApplicationStatus,
}: {
  chapterId: string;
  terms: LeadershipTerm[];
  canManage: boolean;
  applyForLeadership: (input: {
    termId: string;
    roleKey: RoleKey;
    title: string;
    statement?: string;
  }) => boolean;
  updateLeadershipApplicationStatus: (
    id: string,
    status: LeadershipAppStatus,
  ) => boolean;
}) {
  const { store } = useStore();
  const active =
    terms.find((t) => t.status === "active") ??
    terms.find((t) => t.status === "upcoming");
  const [roleKey, setRoleKey] = useState<RoleKey>("elevates_coordinator");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [msg, setMsg] = useState("");

  const apps = (store.leadershipApplications ?? []).filter(
    (a) => a.chapterId === chapterId,
  );

  if (!active) return null;

  return (
    <div className="mt-6 space-y-6">
      <TerminalPanel title="hiring.pipeline" meta="EOS leadership cycle">
        <p className="mb-3 text-[13px] text-text-dim">
          Applications → Screening → Interviews → Executive team → Training →
          Execution → Handover. No automatic promotions — every batch earns
          leadership.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value as RoleKey)}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operations Lead"
            />
          </div>
          <div className="md:col-span-3">
            <FieldLabel>Statement</FieldLabel>
            <TextArea
              rows={2}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Why you — what you have built…"
            />
          </div>
        </div>
        <Button
          variant="primary"
          className="mt-3"
          onClick={() => {
            const ok = applyForLeadership({
              termId: active.id,
              roleKey,
              title: title || roleKeyLabel(roleKey),
              statement,
            });
            setMsg(ok ? "Application submitted" : "Could not apply (duplicate?)");
          }}
        >
          Apply for {active.title}
        </Button>
        {msg ? (
          <p className="mt-2 text-[12px] text-[var(--accent)]">{msg}</p>
        ) : null}
      </TerminalPanel>

      <TerminalPanel title="applications" meta={`${apps.length}`}>
        {!apps.length ? (
          <p className="text-sm text-text-dim">No applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {apps.map((a) => {
              const user = store.profiles.find((p) => p.id === a.userId);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg shadow-[var(--shadow-sm)] px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{a.title}</span>
                    {" · "}
                    {user?.fullName}
                    <p className="text-[11px] text-text-dim">{a.statement}</p>
                  </div>
                  {canManage ? (
                    <Select
                      value={a.status}
                      onChange={(e) =>
                        updateLeadershipApplicationStatus(
                          a.id,
                          e.target.value as LeadershipAppStatus,
                        )
                      }
                    >
                      {APP_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge tone="cyan">{a.status}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

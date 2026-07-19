"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  ASSIGNABLE_LEADERSHIP_ROLES,
  roleKeyLabel,
} from "@/lib/leadership";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import type { LeadershipAssignment, LeadershipStatus, LeadershipTerm, RoleKey } from "@/types";

type TermDraft = {
  academicYear: string;
  title: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active";
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
  } = useStore();
  const { session } = useCurrentUser();
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
      status: term.status === "archived" ? "upcoming" : term.status,
      handoverNotes: term.handoverNotes ?? "",
    });
    setTermError("");
    setShowTermForm(true);
  }

  function saveTerm() {
    setTermError("");
    if (!chapter) return;
    if (editingTermId) {
      const ok = updateLeadershipTerm(editingTermId, {
        academicYear: termDraft.academicYear,
        title: termDraft.title,
        startDate: termDraft.startDate,
        endDate: termDraft.endDate,
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
        academicYear: termDraft.academicYear,
        title: termDraft.title,
        startDate: termDraft.startDate,
        endDate: termDraft.endDate,
        status: termDraft.status,
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

  function archiveTerm(term: LeadershipTerm) {
    if (!window.confirm(`Archive “${term.title}”? History is kept.`)) return;
    archiveLeadershipTerm(term.id);
    flashMsg("Term archived");
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
    if (editingAssignId) {
      const ok = updateLeadershipAssignment(editingAssignId, assignDraft);
      if (!ok) {
        setAssignError(
          "Could not update — member must be in chapter; singleton roles (chairman/secretary/…) only once per term.",
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
          "Could not add — check member, title, and singleton role uniqueness.",
        );
        return;
      }
    }
    setAssignTermId(null);
    setEditingAssignId(null);
    flashMsg("Assignment saved");
  }

  function removeAssign(a: LeadershipAssignment) {
    if (!window.confirm(`Remove “${a.title}” from this term?`)) return;
    removeLeadershipAssignment(a.id);
    flashMsg("Assignment removed");
  }

  return (
    <div>
      <PageHeader
        title="Leadership Cycle"
        description="Create executive terms, assign the team, and keep handover history. Student-led — managed by chapter executives."
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
        <TerminalPanel title="read.only" className="mb-6">
          <p className="text-sm text-text-dim">
            Leadership cycles are managed by the chapter Chairman (or HQ). You
            can view terms and the executive team below.
          </p>
        </TerminalPanel>
      ) : null}

      {canManage && showTermForm ? (
        <TerminalPanel
          title={editingTermId ? "edit.term" : "create.term"}
          accent="cyan"
          className="mb-6"
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
                    status: e.target.value as "upcoming" | "active",
                  }))
                }
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
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
          const showAssignForm = assignTermId === term.id;

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
                      onClick={() =>
                        showAssignForm
                          ? setAssignTermId(null)
                          : startAddAssign(term.id)
                      }
                    >
                      {showAssignForm && !editingAssignId
                        ? "Close"
                        : "Add member"}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {showAssignForm && canEditTeam ? (
                <div className="mt-4 border border-border p-3">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-text-dim">
                    {editingAssignId ? "Edit assignment" : "Add assignment"}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
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
                              d.title ||
                              roleKeyLabel(e.target.value as RoleKey).replace(
                                /\b\w/g,
                                (c) => c.toUpperCase(),
                              ),
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
                        placeholder="Chairman"
                      />
                    </div>
                  </div>
                  {assignError ? (
                    <p className="mt-2 text-sm text-[var(--accent)]">
                      {assignError}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={saveAssign}
                      disabled={!assignDraft.userId || !assignDraft.title}
                    >
                      {editingAssignId ? "Save" : "Add to team"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAssignTermId(null);
                        setEditingAssignId(null);
                        setAssignError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <ul className="mt-4 space-y-2">
                {!assignments.length ? (
                  <li className="text-[13px] text-text-dim">
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
                        className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2"
                      >
                        <div>
                          <span className="text-magenta">{a.title}</span>
                          {" · "}
                          <Link
                            href={`/profile/${a.userId}`}
                            className="text-cyan hover:text-green"
                          >
                            {user?.fullName}
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
    </div>
  );
}

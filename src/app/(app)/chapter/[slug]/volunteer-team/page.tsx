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
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Plus,
  QrCode,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type {
  LeadershipAssignment,
  LeadershipStatus,
  LeadershipTerm,
  Profile,
  RoleKey,
} from "@/types";

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
  title: "Volunteer & Executive Team",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  status: "active",
  handoverNotes: "",
});

const emptyAssignDraft = (): AssignDraft => ({
  userId: "",
  roleKey: "volunteer",
  title: roleKeyLabel("volunteer"),
});

export default function ChapterVolunteerTeamPage({
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
    approveJoinRequests,
    rejectJoinRequests,
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    hasPermission(store, session.roleKey, "leadership.manage");

  // Term management state
  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termDraft, setTermDraft] = useState<TermDraft>(emptyTermDraft);
  const [termError, setTermError] = useState("");

  // Assign dialog state
  const [assignTermId, setAssignTermId] = useState<string | null>(null);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState<AssignDraft>(emptyAssignDraft);
  const [assignError, setAssignError] = useState("");
  const [flash, setFlash] = useState("");

  // Directory search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2400);
  }

  // Terms for this chapter
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

  const activeTerm = terms.find((t) => t.status === "active") ?? terms[0];

  // All assignments for this chapter's active term (or across chapter terms)
  const chapterAssignments = useMemo(() => {
    if (!chapter) return [];
    const termIds = new Set(terms.map((t) => t.id));
    return store.leadershipAssignments.filter((a) => termIds.has(a.termId));
  }, [store.leadershipAssignments, terms, chapter]);

  // Volunteers currently assigned (from both leadership assignments and confirmed user_roles)
  const volunteerAssignments = useMemo(() => {
    const list = chapterAssignments.filter((a) => a.roleKey === "volunteer").slice();
    const seenUserIds = new Set(list.map((a) => a.userId));

    // Also include any users who have the volunteer role assigned in this chapter
    if (chapter) {
      const chapterVolRoles = store.userRoles.filter(
        (ur) =>
          ur.roleKey === "volunteer" &&
          (ur.chapterId === chapter.id || !ur.chapterId) &&
          !seenUserIds.has(ur.userId),
      );
      for (const ur of chapterVolRoles) {
        list.push({
          id: `role-vol-${ur.id}`,
          termId: ur.leadershipTermId || activeTerm?.id || "term-default",
          userId: ur.userId,
          roleKey: "volunteer",
          title: "Volunteer",
          createdAt: ur.createdAt,
        });
        seenUserIds.add(ur.userId);
      }
    }

    return list;
  }, [chapterAssignments, store.userRoles, chapter, activeTerm]);

  const volunteerUserIds = useMemo(() => {
    return new Set(volunteerAssignments.map((v) => v.userId));
  }, [volunteerAssignments]);

  // Chapter students directory
  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter(
        (p) =>
          p.chapterId === chapter.id &&
          (p.status ?? "active") !== "disabled" &&
          p.id !== chapter.campusLeadId &&
          p.id !== chapter.facultyId,
      )
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  // Filtered students for directory list
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return chapterStudents.filter((s) => {
      return (
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q))
      );
    });
  }, [chapterStudents, searchQuery]);

  // Pending candidate join requests
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

  // Ensure active term exists (auto-created if missing so Campus Lead never gets blocked)
  function ensureActiveTermId(): string {
    if (!chapter) return "term-default";
    if (activeTerm?.id) return activeTerm.id;
    const existing = store.leadershipTerms.find((t) => t.chapterId === chapter.id);
    if (existing?.id) return existing.id;
    const created = createLeadershipTerm({
      chapterId: chapter.id,
      academicYear: "2025-26",
      title: "Permanent Volunteer Team",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: "active",
      handoverNotes: "Auto-initialized chapter volunteer & leadership team",
    });
    return created?.id ?? "term-default";
  }

  // Quick 1-click appoint as volunteer
  function handleMakeVolunteer(student: Profile) {
    const termId = ensureActiveTermId();
    const created = addLeadershipAssignment({
      termId,
      userId: student.id,
      roleKey: "volunteer",
      title: "Volunteer",
    });
    if (created) {
      flashMsg(`✓ Appointed ${student.fullName} as Volunteer!`);
    } else {
      flashMsg(`Could not appoint ${student.fullName}.`);
    }
  }

  // Quick remove from volunteers
  async function handleRemoveVolunteer(assignmentId: string, studentName: string, studentId?: string) {
    const ok = await confirm({
      title: "Remove Volunteer",
      description: `Remove “${studentName}” from the chapter Volunteer Team?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    const matchedAssignment = store.leadershipAssignments.find(
      (a) => a.id === assignmentId || (studentId && a.userId === studentId && a.roleKey === "volunteer"),
    );

    if (matchedAssignment) {
      removeLeadershipAssignment(matchedAssignment.id);
    } else if (assignmentId && !assignmentId.startsWith("role-vol-")) {
      removeLeadershipAssignment(assignmentId);
    } else if (studentId) {
      void fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delete_leadership_assignment",
          data: { id: assignmentId, userId: studentId, chapterId: chapter?.id, roleKey: "volunteer" },
        }),
      });
    }
    flashMsg(`Removed ${studentName} from Volunteer Team.`);
  }

  // Batch appoint selected students
  function handleBatchAppointVolunteers() {
    if (selectedStudentIds.length === 0) return;
    const termId = ensureActiveTermId();
    let count = 0;
    for (const sId of selectedStudentIds) {
      if (!volunteerUserIds.has(sId)) {
        addLeadershipAssignment({
          termId,
          userId: sId,
          roleKey: "volunteer",
          title: "Volunteer",
        });
        count++;
      }
    }
    setSelectedStudentIds([]);
    flashMsg(`✓ Appointed ${count} student(s) as Permanent Volunteers!`);
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

  if (session.roleKey === "class_representative") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "people")}
          title="Volunteer Team"
          description="Chapter volunteer team & leadership is managed by Campus Leads and Faculty."
        />
        <TerminalPanel title="access.restricted" accent="orange">
          <p className="text-sm text-text-dim">
            Class Representatives do not have permission to view or manage the chapter volunteer team.
          </p>
          <Link
            href={`/chapter/${slug}`}
            className="mt-3 inline-block text-[var(--accent)] font-semibold text-xs"
          >
            ← Back to chapter
          </Link>
        </TerminalPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Volunteer Team"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="self-center text-[12px] font-semibold text-[var(--accent)] animate-pulse">
                {flash}
              </span>
            ) : null}
            <Link href={`/chapter/${slug}/attendance`}>
              <Button variant="orange" className="flex items-center gap-2 font-bold shadow-sm">
                <QrCode size={14} />
                Attendance Desk
              </Button>
            </Link>
            {canManage && (
              <Button variant="ghost" onClick={startCreateTerm}>
                {showTermForm && !editingTermId ? "Close Form" : "Cycle Settings"}
              </Button>
            )}
          </div>
        }
      />

      {/* Term creation / edit form */}
      {canManage && showTermForm ? (
        <TerminalPanel
          title={editingTermId ? "Edit term" : "Create cycle term"}
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
                placeholder="2026-27 Volunteer & Leadership Cycle"
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
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Handover notes</FieldLabel>
              <TextArea
                rows={2}
                value={termDraft.handoverNotes}
                onChange={(e) =>
                  setTermDraft((d) => ({
                    ...d,
                    handoverNotes: e.target.value,
                  }))
                }
                placeholder="Notes for volunteer team operations..."
              />
            </div>
          </div>
          {termError ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{termError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={saveTerm}>
              {editingTermId ? "Save Term" : "Create Term"}
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

      {/* Pending Class Rep / Join Requests */}
      {canManage && pendingCandidates.length > 0 && (
        <TerminalPanel
          title="Pending Join Requests"
          meta={`${pendingCandidates.length} applicants pending review`}
          accent="orange"
          className="mb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs text-text-dim">
              Candidates who applied or joined via invitation link. Multi-select and click Accept to appoint.
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
                  className="text-xs font-bold"
                >
                  Accept Selected ({selectedCandidateIds.length})
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
                    <td className="py-2.5 text-right">
                      <Button
                        variant="orange"
                        onClick={async () => {
                          await approveJoinRequests([cand.id], "class_representative", chapter.id);
                          flashMsg(`Appointed ${cand.fullName}!`);
                        }}
                        className="text-[11px] py-1 px-2.5 h-auto font-bold"
                      >
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TerminalPanel>
      )}

      {/* Main Split Interface: Student Directory (Left) vs Volunteers Roster (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Chapter Student Directory (5 cols) */}
        <div className="md:col-span-6 lg:col-span-5 space-y-4">
          <TerminalPanel
            title="Student Directory"
            meta={`${filteredStudents.length} Students`}
            accent="orange"
          >
            <div className="space-y-3 mb-4">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name or ID..."
                  className="pl-9 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-mute hover:text-text"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Batch Action Bar */}
              {selectedStudentIds.length > 0 && (
                <div className="rounded-[10px] bg-orange-500/10 border border-orange-500/30 p-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text">
                    {selectedStudentIds.length} Selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-[11px] py-1 px-2 h-auto text-text-dim"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="orange"
                      onClick={handleBatchAppointVolunteers}
                      className="text-[11px] py-1 px-2.5 h-auto font-bold flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Add ({selectedStudentIds.length})
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Students List */}
            <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-dim">
                  No chapter students match your search.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isVol = volunteerUserIds.has(student.id);
                  const isChecked = selectedStudentIds.includes(student.id);
                  const assignment = volunteerAssignments.find((a) => a.userId === student.id);

                  return (
                    <div
                      key={student.id}
                      className={`rounded-[10px] border p-2.5 transition flex items-center justify-between gap-2.5 ${
                        isVol
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : isChecked
                            ? "bg-orange-500/5 border-orange-500/30"
                            : "bg-bg border-border/80 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {canManage && !isVol && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedStudentIds((prev) =>
                                prev.includes(student.id)
                                  ? prev.filter((id) => id !== student.id)
                                  : [...prev, student.id],
                              );
                            }}
                            className="rounded border-border shrink-0 cursor-pointer"
                          />
                        )}

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-page border border-border text-[11px] font-bold text-text">
                          {initials(student.fullName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/profile/${student.elevatesId || student.id}`}
                              className="font-semibold text-xs text-text truncate hover:text-[var(--accent)] hover:underline"
                            >
                              {student.fullName}
                            </Link>
                            {student.elevatesId && (
                              <span className="font-mono text-[9px] text-text-mute shrink-0">
                                {student.elevatesId}
                              </span>
                            )}
                          </div>
                          {(student.year || student.section || student.email) && (
                            <p className="text-[11px] text-text-dim truncate">
                              {[
                                student.year ? `Yr ${student.year}` : null,
                                student.section ? `Sec ${student.section}` : null,
                                !student.year && !student.section ? student.email : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action / Badge: Only '+' icon on button */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isVol ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                              <Check size={10} /> Volunteer
                            </span>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVolunteer(assignment?.id ?? "", student.fullName, student.id)}
                                title="Remove volunteer"
                                className="text-text-mute hover:text-red-400 p-1 text-[11px]"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </>
                        ) : canManage ? (
                          <button
                            type="button"
                            onClick={() => handleMakeVolunteer(student)}
                            className="h-7 px-3 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center font-bold shadow-sm transition active:scale-95 shrink-0"
                            title="Add volunteer"
                            aria-label="Add volunteer"
                          >
                            <Plus size={15} strokeWidth={3} className="text-white" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TerminalPanel>
        </div>

        {/* RIGHT PANEL: Permanent Volunteer Team ("The List" moved to right side) */}
        <div className="md:col-span-6 lg:col-span-7 space-y-6">
          <TerminalPanel
            title="Permanent Volunteer Team"
            meta={`${volunteerAssignments.length} Appointed`}
            accent="green"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
              <span className="text-xs font-semibold text-text">
                Appointed Members
              </span>
              <Badge tone="green" className="font-bold text-[11px] px-2.5 py-0.5">
                {volunteerAssignments.length} Active Volunteers
              </Badge>
            </div>

            {volunteerAssignments.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-border/80 bg-bg/50 p-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">No Volunteers Appointed Yet</h4>
                  <p className="text-xs text-text-dim max-w-sm mx-auto mt-1">
                    Click <strong>+</strong> next to students in the directory on the left to appoint them.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {volunteerAssignments.map((a) => {
                  const student = store.profiles.find((p) => p.id === a.userId);
                  const studentMeta = [
                    student?.year ? `Yr ${student.year}` : null,
                    student?.section ? `Sec ${student.section}` : null,
                    student?.email || "Chapter Member",
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div
                      key={a.id}
                      className="rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-sm">
                          {initials(student?.fullName ?? "Volunteer")}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/profile/${student?.elevatesId || a.userId}`}
                              className="font-bold text-sm text-text hover:text-[var(--accent)] hover:underline"
                            >
                              {student?.fullName ?? "Unknown Student"}
                            </Link>
                            {student?.elevatesId && (
                              <span className="font-mono text-[10px] bg-bg-page border border-border px-1.5 py-0.2 rounded font-semibold text-text-dim">
                                {student.elevatesId}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
                              Volunteer
                            </span>
                          </div>
                          <p className="text-xs text-text-dim mt-0.5">
                            {studentMeta}
                            {a.createdAt && (
                              <span className="ml-1 text-[11px] text-text-mute font-mono">
                                · Appointed {formatDate(a.createdAt)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Link href={`/chapter/${slug}/attendance`}>
                            <Button variant="ghost" className="text-xs py-1 px-2.5 h-auto text-text-dim hover:text-text">
                              <QrCode size={13} className="mr-1" />
                              Scanner
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            onClick={() => handleRemoveVolunteer(a.id, student?.fullName ?? "Volunteer", a.userId)}
                            className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 text-red-500"
                          >
                            <Trash2 size={12} />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TerminalPanel>
        </div>
      </div>

      {/* Add / Edit General Officer Dialog */}
      <Dialog
        open={Boolean(assignTermId)}
        onClose={closeAssignDialog}
        title={editingAssignId ? "Edit Assignment" : "Add Officer"}
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
              <option value="">Select student…</option>
              {chapterStudents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.email || p.elevatesId || "Member"})
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
            <FieldLabel>Display Title</FieldLabel>
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
              {editingAssignId ? "Save" : "Add to Team"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

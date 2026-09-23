"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { formatDate, initials } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Crown,
  Plus,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";

type NextMemberDraft = {
  userId: string;
  designation: string;
};

export default function ChapterLeadershipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, executeTermHandover, assignExecutiveMember } = useStore();
  const { session } = useCurrentUser();

  const chapter = store.chapters.find((c) => c.slug === slug || c.id === slug);

  // Chapter terms
  const chapterTerms = useMemo(() => {
    if (!chapter) return [];
    return store.terms
      .filter((t) => t.chapterId === chapter.id)
      .slice()
      .sort((a, b) => Number(b.termYear) - Number(a.termYear));
  }, [store.terms, chapter]);

  const activeTerm = useMemo(() => {
    return chapterTerms.find((t) => t.status === "active") ?? null;
  }, [chapterTerms]);

  const pastTerms = useMemo(() => {
    return chapterTerms.filter((t) => t.status === "closed");
  }, [chapterTerms]);

  // Active term members
  const activeTermMembers = useMemo(() => {
    if (!activeTerm) return [];
    return store.termMembers.filter((tm) => tm.termId === activeTerm.id);
  }, [store.termMembers, activeTerm]);

  // Current campus lead profile
  const campusLeadProfile = useMemo(() => {
    if (!activeTerm) return null;
    return store.profiles.find((p) => p.id === activeTerm.campusLeadId) ?? null;
  }, [store.profiles, activeTerm]);

  // Chapter students
  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter((p) => p.chapterId === chapter.id)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  // Handover window for chapter
  const latestWindow = useMemo(() => {
    if (!chapter) return null;
    return (
      store.handoverWindows
        .filter((w) => w.chapterId === chapter.id)
        .slice()
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0] ?? null
    );
  }, [store.handoverWindows, chapter]);

  const isWindowOpen = latestWindow?.status === "open";

  // Permission checks
  // 1. Only current active term's campus_lead_id can execute handover
  const isCurrentCampusLead = Boolean(
    activeTerm &&
      (session.userId === activeTerm.campusLeadId || session.roleKey === "founder") &&
      (session.roleKey === "campus_lead" || session.roleKey === "founder"),
  );

  // 2. Campus lead for this chapter can assign executive members
  const canAssignExecutive = Boolean(
    activeTerm &&
      (session.roleKey === "founder" ||
        (session.roleKey === "campus_lead" &&
          (session.chapterId === chapter?.id || session.chapterId === chapter?.slug))),
  );

  // UI Modals State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [nextCampusLeadId, setNextCampusLeadId] = useState("");
  const [nextTermYear, setNextTermYear] = useState<number>(
    Number(activeTerm?.termYear ?? new Date().getFullYear()) + 1,
  );
  const [nextMembers, setNextMembers] = useState<NextMemberDraft[]>([]);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [handoverError, setHandoverError] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignDesignation, setAssignDesignation] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  const [flashMsg, setFlashMsg] = useState("");

  function showFlash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 3500);
  }

  function handleOpenHandoverModal() {
    setNextCampusLeadId("");
    setNextTermYear(Number(activeTerm?.termYear ?? new Date().getFullYear()) + 1);
    setNextMembers([{ userId: "", designation: "" }]);
    setHandoverError("");
    setHandoverModalOpen(true);
  }

  function addNextMemberRow() {
    setNextMembers((prev) => [...prev, { userId: "", designation: "" }]);
  }

  function updateNextMemberRow(
    index: number,
    field: "userId" | "designation",
    value: string,
  ) {
    setNextMembers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function removeNextMemberRow(index: number) {
    setNextMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmHandover() {
    if (!chapter) return;
    if (!nextCampusLeadId) {
      setHandoverError("Please select the next Campus Lead.");
      return;
    }
    if (!nextTermYear) {
      setHandoverError("Please specify the next term year.");
      return;
    }

    const filteredMembers = nextMembers
      .filter((m) => Boolean(m.userId.trim()))
      .map((m) => ({
        userId: m.userId.trim(),
        designation: m.designation.trim() || undefined,
      }));

    setIsSubmittingHandover(true);
    setHandoverError("");

    try {
      const res = await executeTermHandover({
        chapterId: chapter.id,
        nextCampusLeadId,
        nextTermYear: String(nextTermYear),
        nextExecutiveMembers: filteredMembers,
      });

      if (!res.ok) {
        setHandoverError(res.error || "Failed to execute handover.");
      } else {
        setHandoverModalOpen(false);
        showFlash("🎉 Leadership handover completed successfully! New term is now active.");
      }
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Error executing handover.");
    } finally {
      setIsSubmittingHandover(false);
    }
  }

  async function handleConfirmAssignExecutive() {
    if (!chapter) return;
    if (!assignStudentId) {
      setAssignError("Please choose a student to assign.");
      return;
    }

    setIsSubmittingAssign(true);
    setAssignError("");

    try {
      const res = await assignExecutiveMember({
        chapterId: chapter.id,
        userId: assignStudentId,
        designation: assignDesignation.trim() || undefined,
      });

      if (!res.ok) {
        setAssignError(res.error || "Failed to assign executive member.");
      } else {
        setAssignModalOpen(false);
        setAssignStudentId("");
        setAssignDesignation("");
        showFlash("✓ Successfully assigned executive member!");
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Error assigning executive member.");
    } finally {
      setIsSubmittingAssign(false);
    }
  }

  if (!chapter) {
    return (
      <div className="py-12 text-center text-text-dim">
        Chapter not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter Leadership"
        description={`Executive leadership hierarchy, current term appointments, and past tenures for ${chapter.name}.`}
      />

      {/* Flash toast message */}
      {flashMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
          {flashMsg}
        </div>
      )}

      {/* High-Level Overview Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Current Term"
          value={activeTerm ? `Year ${activeTerm.termYear}` : "No Active Term"}
          accent="cyan"
        />
        <Stat
          label="Executive Members"
          value={activeTermMembers.length}
          accent="magenta"
        />
        <Stat
          label="Past Terms"
          value={pastTerms.length}
          accent="green"
        />
        <Stat
          label="Handover Window"
          value={isWindowOpen ? "OPEN" : "CLOSED"}
          accent={isWindowOpen ? "orange" : "cyan"}
        />
      </div>

      {/* Handover Window Notification Banner */}
      {isWindowOpen && (
        <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] shrink-0 mt-0.5">
                <Clock size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text">
                    Leadership Handover Window is Open
                  </h3>
                  <Badge tone="green">
                    {latestWindow?.closedAt
                      ? `Open until ${formatDate(latestWindow.closedAt)}`
                      : "Open"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-text-dim max-w-xl">
                  Elevates HQ has opened the transition window for {chapter.name}.
                  {isCurrentCampusLead
                    ? " As current Campus Lead, you can now appoint the incoming Campus Lead and Executive Members to start the new term."
                    : " The active Campus Lead is authorized to execute the transition."}
                </p>
              </div>
            </div>

            {isCurrentCampusLead && (
              <Button
                variant="orange"
                onClick={handleOpenHandoverModal}
                className="shrink-0 font-semibold"
              >
                <ArrowRight size={14} className="mr-1.5" /> Start New Term
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Current Term Section */}
      <TerminalPanel
        title={`Current Term · Year ${activeTerm?.termYear ?? "—"}`}
        meta={activeTerm ? `Started ${formatDate(activeTerm.startedAt)}` : "Inactive"}
        accent="orange"
      >
        {!activeTerm ? (
          <div className="py-8 text-center text-xs text-text-dim">
            No active leadership term found for this chapter.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campus Lead Spotlight Card */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wide">
                  <Crown size={15} className="text-amber-500" />
                  <span>Campus Lead</span>
                </div>
                {canAssignExecutive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAssignStudentId("");
                      setAssignDesignation("");
                      setAssignError("");
                      setAssignModalOpen(true);
                    }}
                  >
                    <UserPlus size={13} className="mr-1.5" />
                    Assign Executive Member
                  </Button>
                )}
              </div>

              {campusLeadProfile ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-base font-bold text-amber-500 shrink-0">
                      {initials(campusLeadProfile.fullName)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${campusLeadProfile.elevatesId || campusLeadProfile.id}`}
                          className="font-bold text-text hover:text-[var(--accent)] text-sm"
                        >
                          {campusLeadProfile.fullName}
                        </Link>
                        <Badge tone="cyan">Campus Lead</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-text-dim">
                        {campusLeadProfile.email}
                        {campusLeadProfile.department ? ` · ${campusLeadProfile.department}` : ""}
                        {campusLeadProfile.year ? ` · Year ${campusLeadProfile.year}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-text-mute sm:text-right">
                    <span>Elevates ID:</span>
                    <span className="font-semibold text-text">
                      {campusLeadProfile.elevatesId || "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-bg p-4 text-xs text-text-dim">
                  Campus Lead profile unavailable (ID: {activeTerm.campusLeadId})
                </div>
              )}
            </div>

            {/* Executive Members Directory */}
            <div>
              <div className="flex items-center justify-between mb-3 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wide">
                  <Shield size={14} className="text-cyan" />
                  <span>Executive Members ({activeTermMembers.length})</span>
                </div>
                <span className="text-[11px] text-text-dim">
                  Operational authority &amp; event management
                </span>
              </div>

              {!activeTermMembers.length ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-text-dim">
                  No executive members appointed to this term yet.
                  {canAssignExecutive && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssignStudentId("");
                          setAssignDesignation("");
                          setAssignError("");
                          setAssignModalOpen(true);
                        }}
                      >
                        Appoint First Executive Member
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-bg/60 text-text-dim">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Member</th>
                        <th className="px-3.5 py-2.5 font-semibold">Designation</th>
                        <th className="px-3.5 py-2.5 font-semibold">Department &amp; Year</th>
                        <th className="px-3.5 py-2.5 font-semibold">Appointed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeTermMembers.map((tm) => {
                        const profile = store.profiles.find((p) => p.id === tm.userId);
                        return (
                          <tr key={tm.id} className="hover:bg-bg/40 transition">
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)] shrink-0">
                                  {initials(profile?.fullName ?? "EM")}
                                </span>
                                <div>
                                  <Link
                                    href={`/profile/${profile?.elevatesId || tm.userId}`}
                                    className="font-semibold text-text hover:text-[var(--accent)]"
                                  >
                                    {profile?.fullName ?? "Unknown Member"}
                                  </Link>
                                  <p className="text-[11px] text-text-dim">
                                    {profile?.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-600">
                                {tm.designation || "Executive Member"}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-text-dim text-[11px]">
                              {profile?.department || "—"}
                              {profile?.year ? ` · Year ${profile.year}` : ""}
                            </td>
                            <td className="px-3.5 py-3 text-text-mute text-[11px]">
                              {formatDate(tm.addedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </TerminalPanel>

      {/* Past Terms Section (Read-Only for all chapter members) */}
      <TerminalPanel
        title="Past Terms &amp; Historical Tenures"
        meta={`${pastTerms.length} archived terms`}
        className="mt-6"
      >
        <p className="text-[12px] text-text-dim mb-4">
          Archived record of previous leadership tenures for {chapter.name}. Accessible to all chapter members.
        </p>

        {!pastTerms.length ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-text-dim">
            No past leadership terms recorded for this chapter.
          </div>
        ) : (
          <div className="space-y-4">
            {pastTerms.map((term) => {
              const leadProfile = store.profiles.find(
                (p) => p.id === term.campusLeadId,
              );
              const members = store.termMembers.filter(
                (tm) => tm.termId === term.id,
              );

              return (
                <div
                  key={term.id}
                  className="rounded-xl border border-border bg-bg/50 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-sm">
                        Term {term.termYear}
                      </span>
                      <Badge tone="mute">Closed</Badge>
                    </div>
                    <span className="text-[11px] text-text-mute">
                      {formatDate(term.startedAt)} → {term.endedAt ? formatDate(term.endedAt) : "Archived"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-mute">
                        Campus Lead
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-medium text-text text-xs">
                          {leadProfile ? (
                            <Link
                              href={`/profile/${leadProfile.elevatesId || leadProfile.id}`}
                              className="hover:text-[var(--accent)]"
                            >
                              {leadProfile.fullName}
                            </Link>
                          ) : (
                            "Unknown Lead"
                          )}
                        </span>
                        {leadProfile?.elevatesId && (
                          <span className="font-mono text-[10px] text-text-dim">
                            ({leadProfile.elevatesId})
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-mute">
                        Executive Members ({members.length})
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {members.length > 0 ? (
                          members.map((m) => {
                            const p = store.profiles.find((u) => u.id === m.userId);
                            return (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 rounded bg-bg border border-border px-2 py-0.5 text-[10px] text-text"
                              >
                                {p?.fullName || "Member"}
                                {m.designation && (
                                  <span className="text-text-mute">
                                    · {m.designation}
                                  </span>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-text-dim">None listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TerminalPanel>

      {/* MODAL 1: START NEW TERM (HANDOVER) */}
      {handoverModalOpen && (
        <Dialog
          open={handoverModalOpen}
          onClose={() => setHandoverModalOpen(false)}
          title="Start New Term · Leadership Handover"
          description="Transition chapter leadership to the incoming executive team. This action immediately closes the current term and appoints the new leadership."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHandoverModalOpen(false)}
                disabled={isSubmittingHandover}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={handleConfirmHandover}
                disabled={isSubmittingHandover || !nextCampusLeadId}
              >
                {isSubmittingHandover ? "Executing Handover..." : "Confirm & Execute Handover"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {handoverError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                {handoverError}
              </div>
            )}

            {/* Warning Callout */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-text-dim leading-relaxed">
                <strong className="text-text font-semibold">Irreversible Action:</strong>{" "}
                Executing this transition will close the active term, set your role and outgoing executive members to <strong>Student</strong>, and activate the incoming Campus Lead and Executive Members.
              </div>
            </div>

            {/* Term Year Input */}
            <div>
              <FieldLabel>Next Term Year *</FieldLabel>
              <Input
                type="number"
                value={nextTermYear}
                onChange={(e) => setNextTermYear(parseInt(e.target.value, 10) || 2026)}
                placeholder="e.g. 2026"
              />
            </div>

            {/* Incoming Campus Lead Selection */}
            <div>
              <FieldLabel>Select Next Campus Lead *</FieldLabel>
              <Select
                value={nextCampusLeadId}
                onChange={(e) => setNextCampusLeadId(e.target.value)}
              >
                <option value="">-- Choose student in chapter --</option>
                {chapterStudents.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.fullName} ({stu.department || "No Dept"} · Year {stu.year || "—"}) — {stu.email}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-text-dim">
                The chosen student will receive the &apos;campus_lead&apos; role for {chapter.name}.
              </p>
            </div>

            {/* Incoming Executive Members List */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Next Executive Members</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addNextMemberRow}
                  className="text-xs text-[var(--accent)]"
                >
                  <Plus size={12} className="mr-1" /> Add Member
                </Button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {nextMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 p-2"
                  >
                    <div className="flex-1">
                      <Select
                        value={member.userId}
                        onChange={(e) =>
                          updateNextMemberRow(idx, "userId", e.target.value)
                        }
                      >
                        <option value="">-- Pick student --</option>
                        {chapterStudents
                          .filter((s) => s.id !== nextCampusLeadId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName} ({s.department || "—"})
                            </option>
                          ))}
                      </Select>
                    </div>

                    <div className="w-36 sm:w-44">
                      <Input
                        placeholder="Designation (optional)"
                        value={member.designation}
                        onChange={(e) =>
                          updateNextMemberRow(idx, "designation", e.target.value)
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeNextMemberRow(idx)}
                      className="p-1.5 text-text-mute hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL 2: ASSIGN EXECUTIVE MEMBER (ACTIVE TERM) */}
      {assignModalOpen && (
        <Dialog
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Executive Member"
          description={`Appoint a student to the active ${activeTerm ? `Year ${activeTerm.termYear}` : ""} leadership term.`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignModalOpen(false)}
                disabled={isSubmittingAssign}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={handleConfirmAssignExecutive}
                disabled={isSubmittingAssign || !assignStudentId}
              >
                {isSubmittingAssign ? "Assigning..." : "Confirm & Appoint"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 py-2 text-xs">
            {assignError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                {assignError}
              </div>
            )}

            <div>
              <FieldLabel>Select Student to Appoint *</FieldLabel>
              <Select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
              >
                <option value="">-- Choose student in chapter --</option>
                {chapterStudents
                  .filter((s) => s.id !== activeTerm?.campusLeadId)
                  .map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName} ({stu.department || "No Dept"} · Year {stu.year || "—"}) — {stu.email}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <FieldLabel>Designation (Optional free-text label)</FieldLabel>
              <Input
                value={assignDesignation}
                onChange={(e) => setAssignDesignation(e.target.value)}
                placeholder="e.g. Vice Chairman, Secretary, Technical Lead"
              />
              <p className="mt-1 text-[11px] text-text-dim">
                Executive members receive the same event &amp; attendance permissions as Campus Leads without handover access.
              </p>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { getChapterHandoverStatus } from "@/lib/leadership";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  History,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
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
  const { store, executeTermHandover, assignExecutiveMember, removeExecutiveMember } = useStore();
  const { session } = useCurrentUser();

  const chapter = store.chapters.find((c) => c.slug === slug || c.id === slug);

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

  const activeTermMembers = useMemo(() => {
    if (!activeTerm) return [];
    return store.termMembers.filter((tm) => tm.termId === activeTerm.id);
  }, [store.termMembers, activeTerm]);

  const campusLeadProfile = useMemo(() => {
    if (!activeTerm) return null;
    return store.profiles.find((p) => p.id === activeTerm.campusLeadId) ?? null;
  }, [store.profiles, activeTerm]);

  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter((p) => p.chapterId === chapter.id)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  const windowStatus = useMemo(() => {
    if (!chapter) {
      return { isOpen: false, reason: "no_active_term" as const, label: "No Active Term" };
    }
    return getChapterHandoverStatus(chapter.id, store.handoverWindows, Boolean(activeTerm));
  }, [chapter, store.handoverWindows, activeTerm]);

  const isWindowOpen = windowStatus.isOpen;

  const isCurrentCampusLead = Boolean(
    activeTerm &&
      (session.userId === activeTerm.campusLeadId || session.roleKey === "founder") &&
      (session.roleKey === "campus_lead" || session.roleKey === "founder"),
  );

  const canAssignExecutive = Boolean(
    activeTerm &&
      (session.roleKey === "founder" ||
        (session.roleKey === "campus_lead" &&
          (session.chapterId === chapter?.id || session.chapterId === chapter?.slug))),
  );

  // Modals
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
  const [expandedPastTerm, setExpandedPastTerm] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null); // termMemberId being confirmed
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  async function handleRemoveExecutive(termMemberId: string, userId: string) {
    if (!chapter) return;
    setIsRemovingMember(true);
    try {
      const res = await removeExecutiveMember({
        termMemberId,
        userId,
        chapterId: chapter.id,
      });
      if (!res.ok) {
        showFlash(`❌ ${res.error ?? "Failed to remove member"}`);
      } else {
        showFlash("✓ Executive member removed and role reverted to Student.");
      }
    } catch (err) {
      showFlash(`❌ ${err instanceof Error ? err.message : "Error removing member"}`);
    } finally {
      setIsRemovingMember(false);
      setConfirmRemoveId(null);
    }
  }

  function showFlash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 4000);
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

  function updateNextMemberRow(index: number, field: "userId" | "designation", value: string) {
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
        showFlash("🎉 Leadership handover completed! New term is now active.");
      }
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Error executing handover.");
    } finally {
      setIsSubmittingHandover(false);
    }
  }

  async function handleConfirmAssignExecutive() {
    if (!chapter) return;
    if (!activeTerm) {
      setAssignError("Cannot appoint executive member: no active term exists.");
      return;
    }
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
        showFlash("✓ Executive member successfully appointed!");
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Error assigning executive member.");
    } finally {
      setIsSubmittingAssign(false);
    }
  }

  if (!chapter) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-text-dim text-sm">
        Chapter not found.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter Leadership"
        description={`Governance structure, executive appointments, and term history for ${chapter.name}.`}
      />

      {/* Flash toast */}
      {flashMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 animate-in slide-in-from-top-2 fade-in duration-300">
          <CheckCircle2 size={16} className="shrink-0" />
          {flashMsg}
        </div>
      )}

      {/* Handover Window Banner */}
      {isWindowOpen && (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-5",
            windowStatus.reason === "february_auto"
              ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent"
              : "border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 to-transparent",
          )}
        >
          {/* Decorative glow */}
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[var(--accent)]/20 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] shrink-0">
                <Zap size={20} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-text">Leadership Handover Window is Open</h3>
                  <Badge tone={windowStatus.reason === "february_auto" ? "green" : "orange"}>
                    {windowStatus.label}
                  </Badge>
                </div>
                <p className="text-xs text-text-dim max-w-lg leading-relaxed">
                  {windowStatus.reason === "february_auto"
                    ? `Annual February transition window is active for ${chapter.name}.`
                    : `Elevates HQ has opened the transition window for ${chapter.name}.`}
                  {isCurrentCampusLead
                    ? " As Campus Lead, you may now appoint the incoming leadership team."
                    : " The active Campus Lead is authorized to execute the transition."}
                </p>
              </div>
            </div>

            {isCurrentCampusLead && (
              <Button
                variant="orange"
                onClick={handleOpenHandoverModal}
                className="shrink-0 font-semibold gap-1.5"
              >
                <ArrowRight size={14} />
                Start New Term
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Metric Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: <CalendarDays size={16} />,
            label: "Current Term",
            value: activeTerm ? `${activeTerm.termYear}` : "—",
            sub: activeTerm ? `Since ${formatDate(activeTerm.startedAt)}` : "No active term",
            accent: false,
          },
          {
            icon: <Users size={16} />,
            label: "Executive Members",
            value: String(activeTermMembers.length),
            sub: "Active appointments",
            accent: false,
          },
          {
            icon: <History size={16} />,
            label: "Past Terms",
            value: String(pastTerms.length),
            sub: "Archived tenures",
            accent: false,
          },
          {
            icon: <Clock size={16} />,
            label: "Handover Window",
            value: isWindowOpen ? "Open" : "Closed",
            sub: isWindowOpen ? windowStatus.label : "Annual — February",
            accent: isWindowOpen,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "rounded-2xl p-4 shadow-[var(--shadow)] space-y-2",
              metric.accent
                ? "bg-[var(--accent)] text-white"
                : "bg-bg-panel text-text",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                metric.accent ? "bg-white/20 text-white" : "bg-[var(--accent-soft)] text-[var(--accent)]",
              )}
            >
              {metric.icon}
            </div>
            <div>
              <p
                className={cn(
                  "text-[11px] font-medium",
                  metric.accent ? "text-white/70" : "text-text-mute",
                )}
              >
                {metric.label}
              </p>
              <p
                className={cn(
                  "text-xl font-extrabold tracking-tight font-[family-name:var(--font-display)]",
                  metric.accent ? "text-white" : "text-text",
                )}
              >
                {metric.value}
              </p>
              <p
                className={cn(
                  "text-[11px]",
                  metric.accent ? "text-white/60" : "text-text-dim",
                )}
              >
                {metric.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Current Term Panel ── */}
      <div className="rounded-2xl bg-bg-panel shadow-[var(--shadow)] overflow-hidden">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Crown size={18} />
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                Active Term{activeTerm ? ` · ${activeTerm.termYear}` : ""}
              </h2>
              <p className="text-[12px] text-text-mute">
                {activeTerm
                  ? `Started ${formatDate(activeTerm.startedAt)}`
                  : "No leadership term has been initialized"}
              </p>
            </div>
          </div>

          {canAssignExecutive && activeTerm && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAssignStudentId("");
                setAssignDesignation("");
                setAssignError("");
                setAssignModalOpen(true);
              }}
              className="gap-1.5"
            >
              <UserPlus size={13} />
              Appoint Executive
            </Button>
          )}
        </div>

        {!activeTerm ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg border border-dashed border-border text-text-mute">
              <Crown size={24} />
            </span>
            <div>
              <p className="font-semibold text-text text-sm">No Active Term</p>
              <p className="text-xs text-text-dim mt-1 max-w-sm">
                This chapter has no active leadership term. An HQ Founder or Admin must appoint the first Campus Lead.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Campus Lead Hero */}
            <div className="p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-mute flex items-center gap-1.5">
                <Crown size={12} className="text-amber-500" /> Campus Lead
              </p>

              {campusLeadProfile ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-transparent p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-lg font-extrabold text-amber-600 border border-amber-500/30">
                        {initials(campusLeadProfile.fullName)}
                      </span>
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                        <Crown size={10} />
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/profile/${campusLeadProfile.elevatesId || campusLeadProfile.id}`}
                          className="font-bold text-text hover:text-[var(--accent)] text-[15px] transition-colors"
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
                      {campusLeadProfile.elevatesId && (
                        <p className="mt-1 font-mono text-[11px] text-text-mute">
                          {campusLeadProfile.elevatesId}
                        </p>
                      )}
                    </div>
                  </div>

                  {isWindowOpen && isCurrentCampusLead && (
                    <div className="flex items-center gap-2 text-[11px] text-[var(--accent)] font-semibold bg-[var(--accent-soft)] rounded-xl px-3 py-2 sm:self-center whitespace-nowrap">
                      <Sparkles size={13} />
                      Ready to hand over
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-bg/40 p-4 text-xs text-text-dim">
                  Campus Lead profile unavailable (ID: {activeTerm.campusLeadId})
                </div>
              )}
            </div>

            {/* Executive Members */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute flex items-center gap-1.5">
                  <Shield size={12} className="text-cyan-500" /> Executive Members · {activeTermMembers.length}
                </p>
                <span className="text-[11px] text-text-dim">Operational authority & event management</span>
              </div>

              {!activeTermMembers.length ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg text-text-mute">
                    <Users size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text">No executive members appointed</p>
                    <p className="text-[11px] text-text-dim mt-0.5">
                      The Campus Lead can appoint executive members for this term.
                    </p>
                  </div>
                  {canAssignExecutive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--accent)] text-xs mt-1"
                      onClick={() => {
                        setAssignStudentId("");
                        setAssignDesignation("");
                        setAssignError("");
                        setAssignModalOpen(true);
                      }}
                    >
                      <Plus size={13} className="mr-1" />
                      Appoint First Executive Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeTermMembers.map((tm) => {
                    const profile = store.profiles.find((p) => p.id === tm.userId);
                    return (
                      <div
                        key={tm.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-3 hover:bg-bg/70 transition-colors group"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent)] shrink-0">
                          {initials(profile?.fullName ?? "EM")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/profile/${profile?.elevatesId || tm.userId}`}
                            className="block truncate font-semibold text-text hover:text-[var(--accent)] text-sm transition-colors"
                          >
                            {profile?.fullName ?? "Unknown Member"}
                          </Link>
                          <p className="truncate text-[11px] text-text-dim">
                            {tm.designation || "Executive Member"}
                            {profile?.department ? ` · ${profile.department}` : ""}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-600 shrink-0">
                          Exec
                        </span>
                        {/* Remove button — only visible to campus lead / founder */}
                        {canAssignExecutive && (
                          confirmRemoveId === tm.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                disabled={isRemovingMember}
                                onClick={() => handleRemoveExecutive(tm.id, tm.userId)}
                                className="rounded-lg bg-red-500/15 border border-red-500/30 px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                              >
                                {isRemovingMember ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="rounded-lg px-2 py-1 text-[10px] text-text-mute hover:text-text transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(tm.id)}
                              title="Remove executive member"
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-text-mute hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Past Terms ── */}
      <div className="rounded-2xl bg-bg-panel shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg border border-border text-text-mute">
            <History size={16} />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
              Past Terms & Historical Tenures
            </h2>
            <p className="text-[12px] text-text-mute">
              {pastTerms.length} archived {pastTerms.length === 1 ? "term" : "terms"} · Read-only for all members
            </p>
          </div>
        </div>

        {!pastTerms.length ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg border border-dashed border-border text-text-mute">
              <History size={20} />
            </span>
            <div>
              <p className="font-semibold text-text text-sm">No past terms</p>
              <p className="text-xs text-text-dim mt-1">
                Archived leadership terms will appear here after the first handover.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pastTerms.map((term) => {
              const leadProfile = store.profiles.find((p) => p.id === term.campusLeadId);
              const members = store.termMembers.filter((tm) => tm.termId === term.id);
              const isExpanded = expandedPastTerm === term.id;

              return (
                <div key={term.id}>
                  {/* Collapsed Row */}
                  <button
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-bg/40 transition-colors text-left"
                    onClick={() => setExpandedPastTerm(isExpanded ? null : term.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg border border-border text-[11px] font-bold text-text-mute shrink-0">
                        {term.termYear}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-text text-sm">
                            {leadProfile?.fullName ?? "Unknown Lead"}
                          </span>
                          <Badge tone="mute">Closed</Badge>
                        </div>
                        <p className="text-[11px] text-text-dim truncate">
                          {formatDate(term.startedAt)}
                          {term.endedAt ? ` → ${formatDate(term.endedAt)}` : " → Archived"}
                          {members.length > 0 ? ` · ${members.length} executive${members.length !== 1 ? "s" : ""}` : ""}
                        </p>
                      </div>
                    </div>

                    <span className="text-text-mute shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <ChevronDown size={16} />
                    </span>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/60 bg-bg/20">
                      <div className="grid gap-4 sm:grid-cols-2 mt-3">
                        {/* Lead */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute mb-2">
                            Campus Lead
                          </p>
                          {leadProfile ? (
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-[11px] font-bold text-amber-600 shrink-0">
                                {initials(leadProfile.fullName)}
                              </span>
                              <div>
                                <Link
                                  href={`/profile/${leadProfile.elevatesId || leadProfile.id}`}
                                  className="font-semibold text-text hover:text-[var(--accent)] text-xs transition-colors"
                                >
                                  {leadProfile.fullName}
                                </Link>
                                {leadProfile.elevatesId && (
                                  <p className="font-mono text-[10px] text-text-dim">{leadProfile.elevatesId}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-text-dim">Unknown lead</p>
                          )}
                        </div>

                        {/* Executives */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute mb-2">
                            Executive Members ({members.length})
                          </p>
                          {members.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {members.map((m) => {
                                const p = store.profiles.find((u) => u.id === m.userId);
                                return (
                                  <span
                                    key={m.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2 py-1 text-[11px] text-text"
                                  >
                                    {p?.fullName || "Member"}
                                    {m.designation && (
                                      <span className="text-text-mute"> · {m.designation}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-text-dim">None listed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: START NEW TERM (HANDOVER) — Premium Wizard ── */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--charcoal-900)_50%,transparent)] backdrop-blur-[3px]"
            onClick={() => !isSubmittingHandover && setHandoverModalOpen(false)}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Leadership Handover Wizard"
            className="relative z-10 flex flex-col w-full max-w-2xl max-h-[92dvh] rounded-2xl border border-border bg-bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="relative shrink-0 border-b border-border bg-bg-panel px-6 pt-5 pb-4">
              <button
                type="button"
                onClick={() => !isSubmittingHandover && setHandoverModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-text-mute hover:bg-bg-hover hover:text-text transition"
              >
                <X size={16} />
              </button>

              {/* Title row */}
              <div className="flex items-center gap-3 pr-8">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                  <ArrowRight size={16} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text tracking-tight">
                    Start New Term
                  </h2>
                  <p className="text-[11px] text-text-mute">
                    {chapter.name} · Leadership Handover
                  </p>
                </div>
              </div>

              {/* Step indicators */}
              <div className="mt-4 flex items-center gap-0">
                {[
                  { n: 1, label: "Term Details" },
                  { n: 2, label: "Incoming Lead" },
                  { n: 3, label: "Executive Team" },
                ].map((step, i) => {
                  const currentStep =
                    !nextCampusLeadId && nextTermYear ? 1 :
                    nextCampusLeadId && nextMembers.length === 0 ? 2 :
                    nextCampusLeadId ? 3 : 1;
                  const done = step.n < currentStep;
                  const active = step.n === currentStep;
                  return (
                    <React.Fragment key={step.n}>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-all",
                          done
                            ? "bg-[var(--accent)] text-white"
                            : active
                            ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                            : "bg-bg border border-border text-text-mute",
                        )}>
                          {done ? <CheckCircle2 size={11} /> : step.n}
                        </span>
                        <span className={cn(
                          "text-[11px] font-medium hidden sm:block",
                          active ? "text-text" : done ? "text-text-dim" : "text-text-mute",
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {i < 2 && <div className={cn("flex-1 h-px mx-2", done ? "bg-[var(--accent)]/30" : "bg-border")} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {/* Error */}
              {handoverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5">
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-500">{handoverError}</p>
                </div>
              )}

              {/* Warning banner */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                  <AlertTriangle size={15} />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-text">Irreversible action</p>
                  <p className="mt-0.5 text-[11px] text-text-dim leading-relaxed">
                    This will close the current term, reset all outgoing executive members to <strong>Student</strong>, and immediately activate the new Campus Lead.
                  </p>
                </div>
              </div>

              {/* ── Section 1: Term Year ── */}
              <div className="rounded-xl border border-border bg-bg/40 p-4 space-y-3">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-mute">
                  <CalendarDays size={13} className="text-[var(--accent)]" /> Step 1 · Term Year
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <FieldLabel>Academic Year *</FieldLabel>
                    <Input
                      type="number"
                      value={nextTermYear}
                      onChange={(e) => setNextTermYear(parseInt(e.target.value, 10) || 2026)}
                      placeholder="e.g. 2026"
                    />
                  </div>
                  <div className="shrink-0 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 text-center">
                    <p className="text-[10px] text-text-mute font-medium">New Term</p>
                    <p className="text-xl font-extrabold text-[var(--accent)] font-[family-name:var(--font-display)]">{nextTermYear}</p>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Incoming Campus Lead ── */}
              <div className="rounded-xl border border-border bg-bg/40 p-4 space-y-3">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-mute">
                  <Crown size={13} className="text-amber-500" /> Step 2 · Incoming Campus Lead
                </p>

                <Select value={nextCampusLeadId} onChange={(e) => setNextCampusLeadId(e.target.value)}>
                  <option value="">— Choose a student from {chapter.name} —</option>
                  {chapterStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName}{stu.department ? ` (${stu.department})` : ""}{stu.year ? ` · Y${stu.year}` : ""}
                    </option>
                  ))}
                </Select>

                {/* Selected Lead Preview */}
                {nextCampusLeadId && (() => {
                  const p = chapterStudents.find(s => s.id === nextCampusLeadId);
                  return p ? (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent p-3 mt-1">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-sm font-bold text-amber-600 shrink-0">
                        {initials(p.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text text-sm truncate">{p.fullName}</p>
                        <p className="text-[11px] text-text-dim truncate">
                          {p.email}{p.department ? ` · ${p.department}` : ""}{p.year ? ` · Year ${p.year}` : ""}
                        </p>
                      </div>
                      <Crown size={14} className="text-amber-500 shrink-0" />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* ── Section 3: Executive Team ── */}
              <div className="rounded-xl border border-border bg-bg/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-mute">
                    <Shield size={13} className="text-cyan-500" /> Step 3 · Incoming Executive Team
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addNextMemberRow}
                    className="text-xs text-[var(--accent)] h-7 px-2.5"
                  >
                    <Plus size={12} className="mr-1" /> Add Member
                  </Button>
                </div>

                {nextMembers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border py-6 text-center">
                    <Users size={20} className="mx-auto text-text-mute mb-2" />
                    <p className="text-[11px] text-text-dim">
                      No executive members added yet — you can also do this after handover.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {nextMembers.map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl border border-border bg-bg p-2"
                      >
                        {/* Avatar preview */}
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)] shrink-0">
                          {member.userId
                            ? initials(chapterStudents.find(s => s.id === member.userId)?.fullName ?? "")
                            : "?"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Select
                            value={member.userId}
                            onChange={(e) => updateNextMemberRow(idx, "userId", e.target.value)}
                          >
                            <option value="">— Pick student —</option>
                            {chapterStudents
                              .filter((s) => s.id !== nextCampusLeadId && !nextMembers.some((m, i) => i !== idx && m.userId === s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.fullName}{s.department ? ` (${s.department})` : ""}
                                </option>
                              ))}
                          </Select>
                        </div>
                        <div className="w-32 sm:w-40 shrink-0">
                          <Input
                            placeholder="Role / Title"
                            value={member.designation}
                            onChange={(e) => updateNextMemberRow(idx, "designation", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNextMemberRow(idx)}
                          className="p-1.5 text-text-mute hover:text-red-400 transition-colors rounded-lg shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {nextMembers.length > 0 && (
                  <p className="text-[10px] text-text-dim">
                    {nextMembers.filter(m => m.userId).length} of {nextMembers.length} member{nextMembers.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 border-t border-border bg-bg-panel px-5 py-3.5 flex items-center justify-between gap-3">
              <p className="text-[11px] text-text-dim">
                Current lead and executives will revert to <strong>Student</strong>.
              </p>
              <div className="flex items-center gap-2 shrink-0">
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
                  className="gap-1.5"
                >
                  {isSubmittingHandover ? (
                    <><span className="animate-spin">⟳</span> Executing…</>
                  ) : (
                    <><ArrowRight size={13} /> Execute Handover</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN EXECUTIVE MEMBER ── Premium ── */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--charcoal-900)_50%,transparent)] backdrop-blur-[3px]"
            onClick={() => !isSubmittingAssign && setAssignModalOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Appoint Executive Member"
            className="relative z-10 flex flex-col w-full max-w-md max-h-[92dvh] rounded-2xl border border-border bg-bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 px-6 pt-5 pb-5">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
              <button
                type="button"
                onClick={() => !isSubmittingAssign && setAssignModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/15 hover:text-white transition"
              >
                <X size={17} />
              </button>

              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-[1.1rem] font-bold text-white">
                    Appoint Executive Member
                  </h2>
                  <p className="text-[11px] text-white/60">
                    {activeTerm ? `Active Term · ${activeTerm.termYear}` : ""} · {chapter.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {assignError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-500">{assignError}</p>
                </div>
              )}

              {/* Student Picker */}
              <div>
                <FieldLabel>Select Student *</FieldLabel>
                <Select value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)}>
                  <option value="">— Choose a student from {chapter.name} —</option>
                  {chapterStudents
                    .filter((s) => s.id !== activeTerm?.campusLeadId)
                    .map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.fullName} ({stu.department || "No Dept"} · Year {stu.year || "—"})
                      </option>
                    ))}
                </Select>
              </div>

              {/* Live preview of selected student */}
              {assignStudentId && (() => {
                const p = chapterStudents.find(s => s.id === assignStudentId);
                return p ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-bg/60 p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)] shrink-0">
                      {initials(p.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text text-sm truncate">{p.fullName}</p>
                      <p className="text-[11px] text-text-dim truncate">{p.email}</p>
                    </div>
                    <Badge tone="cyan">Selected</Badge>
                  </div>
                ) : null;
              })()}

              {/* Designation */}
              <div>
                <FieldLabel>Designation / Role Title (Optional)</FieldLabel>
                <Input
                  value={assignDesignation}
                  onChange={(e) => setAssignDesignation(e.target.value)}
                  placeholder="e.g. Vice Chairman, Secretary, Technical Lead"
                />
              </div>

              {/* Info note */}
              <div className="rounded-xl border border-border bg-bg/40 p-3.5 flex items-start gap-2.5">
                <Shield size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-dim leading-relaxed">
                  Executive members receive <strong className="text-text">event & attendance</strong> management permissions but cannot execute leadership handovers.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-bg-panel px-5 py-3.5 flex items-center justify-end gap-2">
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
                className="gap-1.5"
              >
                {isSubmittingAssign ? (
                  "Appointing…"
                ) : (
                  <><UserPlus size={13} /> Confirm & Appoint</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

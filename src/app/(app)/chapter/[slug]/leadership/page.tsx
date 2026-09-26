"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { findChapterBySlugOrId } from "@/lib/chapters";
import {
  CAMPUS_LEAD_DELEGATION_OPTIONS,
  CampusLeadOptionKey,
  cleanDisplayDesignation,
  getChapterHandoverStatus,
  hasExecutiveDelegation,
  parseDelegations,
} from "@/lib/leadership";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  History,
  Lock,
  Plus,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";

const INITIAL_TAB_PERMS = [
  { key: "manage_events", label: "Events" },
  { key: "manage_peer_labs", label: "Peer Labs" },
  { key: "manage_volunteers", label: "Volunteers" },
  { key: "manage_clusters", label: "Clusters" },
  { key: "manage_certificates", label: "Certificates" },
  { key: "manage_projects", label: "Projects" },
];

type NextMemberDraft = {
  userId: string;
  designation: string;
};

type Tab = "overview" | "delegations" | "history";

export default function ChapterLeadershipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    executeTermHandover,
    assignExecutiveMember,
    removeExecutiveMember,
    updateExecutiveMemberPermissions,
  } = useStore();
  const { session } = useCurrentUser();

  const chapter = findChapterBySlugOrId(store.chapters, slug);

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

  const eligibleStudents = useMemo(() => {
    return chapterStudents.filter(
      (s) =>
        s.id !== activeTerm?.campusLeadId &&
        !activeTermMembers.some((tm) => tm.userId === s.id),
    );
  }, [chapterStudents, activeTerm, activeTermMembers]);

  const windowStatus = useMemo(() => {
    if (!chapter) {
      return { isOpen: false, reason: "no_active_term" as const, label: "No Active Term" };
    }
    return getChapterHandoverStatus(
      chapter.id,
      store.handoverWindows,
      Boolean(activeTerm || chapter.campusLeadId),
    );
  }, [chapter, store.handoverWindows, activeTerm]);

  const isWindowOpen = windowStatus.isOpen;

  const canManageDelegations = Boolean(
    (session.roleKey === "campus_lead" &&
      (session.chapterId === chapter?.id ||
        session.chapterId === chapter?.slug ||
        session.userId === chapter?.campusLeadId ||
        (activeTerm && session.userId === activeTerm.campusLeadId))) ||
      session.roleKey === "founder" ||
      session.roleKey === "hq_admin",
  );

  const isCurrentCampusLead = Boolean(
    canManageDelegations ||
      (chapter ? hasExecutiveDelegation(store, session.userId, chapter.id, "manage_terms") : false),
  );

  const canAssignExecutive = Boolean(
    activeTerm &&
      (session.roleKey === "founder" ||
        session.roleKey === "hq_admin" ||
        (session.roleKey === "campus_lead" &&
          (session.chapterId === chapter?.id ||
            session.chapterId === chapter?.slug ||
            session.userId === chapter?.campusLeadId ||
            session.userId === activeTerm.campusLeadId))),
  );

  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Delegations State & Handlers
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [updatingPermKey, setUpdatingPermKey] = useState<string | null>(null);

  async function handleTogglePermission(
    termMemberId: string,
    memberName: string,
    optionKey: CampusLeadOptionKey,
  ) {
    if (!chapter) return;
    const target = store.termMembers.find((m) => m.id === termMemberId);
    if (!target) return;

    const current = parseDelegations(target.permissions, target.designation);
    const isGranted = current.includes(optionKey);
    const nextPermissions = isGranted
      ? current.filter((k) => k !== optionKey)
      : [...current, optionKey];

    const optDef = CAMPUS_LEAD_DELEGATION_OPTIONS.find((o) => o.key === optionKey);
    const optLabel = optDef?.label || optionKey;
    const opKey = `${termMemberId}:${optionKey}`;
    setUpdatingPermKey(opKey);

    try {
      const ok = await updateExecutiveMemberPermissions({
        termMemberId,
        permissions: nextPermissions,
        chapterId: chapter.id,
      });
      if (ok) {
        showFlash(
          isGranted
            ? `✓ Revoked "${optLabel}" from ${memberName}.`
            : `✓ Granted "${optLabel}" to ${memberName}.`,
        );
      } else {
        showFlash(`❌ Failed to update delegations for ${memberName}.`);
      }
    } catch (err) {
      showFlash(`❌ ${err instanceof Error ? err.message : "Error updating delegation"}`);
    } finally {
      setUpdatingPermKey(null);
    }
  }

  async function handleBulkPermissions(
    termMemberId: string,
    memberName: string,
    grantAll: boolean,
  ) {
    if (!chapter) return;
    const nextPermissions = grantAll
      ? CAMPUS_LEAD_DELEGATION_OPTIONS.map((o) => o.key)
      : [];

    const opKey = `${termMemberId}:bulk`;
    setUpdatingPermKey(opKey);

    try {
      const ok = await updateExecutiveMemberPermissions({
        termMemberId,
        permissions: nextPermissions,
        chapterId: chapter.id,
      });
      if (ok) {
        showFlash(
          grantAll
            ? `✓ Granted all Campus Lead powers to ${memberName}.`
            : `✓ Revoked all delegated powers from ${memberName}.`,
        );
      } else {
        showFlash(`❌ Failed to update delegations for ${memberName}.`);
      }
    } catch (err) {
      showFlash(`❌ ${err instanceof Error ? err.message : "Error updating delegation"}`);
    } finally {
      setUpdatingPermKey(null);
    }
  }

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
  const [assignStudentIds, setAssignStudentIds] = useState<string[]>([]);
  const [assignStudentSearch, setAssignStudentSearch] = useState("");
  const [assignInitialPermissions, setAssignInitialPermissions] = useState<string[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  const filteredCandidates = useMemo(() => {
    const q = assignStudentSearch.trim().toLowerCase();
    if (!q) return eligibleStudents;
    return eligibleStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [eligibleStudents, assignStudentSearch]);

  const [flashMsg, setFlashMsg] = useState("");
  const [expandedPastTerm, setExpandedPastTerm] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
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

  function handleOpenAssignModal() {
    setAssignStudentIds([]);
    setAssignStudentSearch("");
    setAssignInitialPermissions([]);
    setAssignError("");
    setAssignModalOpen(true);
  }

  async function handleConfirmAssignExecutive() {
    if (!chapter) return;
    if (!activeTerm) {
      setAssignError("Cannot appoint executive member: no active term exists.");
      return;
    }
    if (assignStudentIds.length === 0) {
      setAssignError("Please choose at least one student to appoint.");
      return;
    }

    setIsSubmittingAssign(true);
    setAssignError("");

    try {
      const errors: string[] = [];
      for (const userId of assignStudentIds) {
        const res = await assignExecutiveMember({
          chapterId: chapter.id,
          userId,
          initialPermissions: assignInitialPermissions,
        });
        if (!res.ok) {
          errors.push(res.error || `Failed to appoint student`);
        }
      }

      if (errors.length > 0) {
        setAssignError(errors.join(" · "));
      } else {
        const count = assignStudentIds.length;
        setAssignModalOpen(false);
        setAssignStudentIds([]);
        setAssignStudentSearch("");
        setAssignInitialPermissions([]);
        showFlash(
          count === 1
            ? "✓ Executive member appointed successfully!"
            : `✓ ${count} executive members appointed successfully!`,
        );
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: "overview",
      label: "Active Term",
      icon: <Crown size={14} />,
      count: activeTerm ? activeTermMembers.length + 1 : undefined,
    },
    {
      key: "delegations",
      label: "Navbar Access & Delegations",
      icon: <Sliders size={14} />,
      count: activeTermMembers.length,
    },
    {
      key: "history",
      label: "Term History",
      icon: <History size={14} />,
      count: pastTerms.length,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter Leadership"
        description={`Governance structure, executive appointments, and term history for ${chapter.name}.`}
      />

      {/* Flash Toast */}
      {flashMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 animate-in slide-in-from-top-2 fade-in duration-300">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          {flashMsg}
        </div>
      )}

      {/* Handover Window Banner — Open */}
      {isWindowOpen && (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-5",
            windowStatus.reason === "february_auto"
              ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent"
              : "border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 to-transparent",
          )}
        >
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-[var(--accent)]/15 blur-3xl" />
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
                <Plus size={14} />
                Add New Term
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Handover Closed Banner — Campus Lead view */}
      {!isWindowOpen && isCurrentCampusLead && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-panel p-5">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg border border-border text-text-mute shrink-0">
                <Lock size={18} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-text">Handover Window is Closed</h3>
                  <Badge tone="mute">Closed</Badge>
                </div>
                <p className="text-xs text-text-dim max-w-lg leading-relaxed">
                  Leadership transition is locked. Only Elevates HQ can open the handover window for {chapter.name}.
                </p>
              </div>
            </div>

            <Button
              disabled
              variant="secondary"
              className="shrink-0 font-medium opacity-50 cursor-not-allowed gap-1.5"
              title="Handover window is closed by HQ"
            >
              <Lock size={13} />
              Window Closed
            </Button>
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

      {/* ── Tab Navigation ── */}
      <div className="rounded-2xl bg-bg-panel shadow-[var(--shadow)] overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-border px-1 gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === tab.key
                  ? "text-[var(--accent)]"
                  : "text-text-mute hover:text-text",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold transition-colors",
                    activeTab === tab.key
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-bg text-text-mute",
                  )}
                >
                  {tab.count}
                </span>
              )}
              {/* Active indicator */}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-t-full" />
              )}
            </button>
          ))}

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto px-3 py-2">
            {activeTab === "overview" && isCurrentCampusLead && (
              isWindowOpen ? (
                <Button
                  variant="orange"
                  size="sm"
                  onClick={handleOpenHandoverModal}
                  className="gap-1.5 font-semibold text-xs h-8"
                >
                  <Plus size={12} />
                  New Term
                </Button>
              ) : (
                <Button
                  disabled
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 opacity-50 cursor-not-allowed text-xs h-8"
                  title="Handover window is closed"
                >
                  <Lock size={11} />
                  Locked
                </Button>
              )
            )}
            {activeTab === "overview" && canAssignExecutive && activeTerm && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenAssignModal}
                className="gap-1.5 h-8 text-xs"
              >
                <UserPlus size={12} />
                Appoint
              </Button>
            )}
          </div>
        </div>

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            {!activeTerm ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg border-2 border-dashed border-border text-text-mute">
                  <Crown size={28} />
                </span>
                <div>
                  <p className="font-bold text-text text-base">No Active Term</p>
                  <p className="text-sm text-text-dim mt-1.5 max-w-sm">
                    This chapter has no active leadership term. An HQ Founder or Admin must appoint the first Campus Lead.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* ── Campus Lead Hero ── */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-1.5 mb-4">
                    <Crown size={13} className="text-amber-500" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute">Campus Lead</p>
                  </div>

                  {campusLeadProfile ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-amber-500/3 p-5">
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
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Link
                              href={`/profile/${campusLeadProfile.elevatesId || campusLeadProfile.id}`}
                              className="font-bold text-text hover:text-[var(--accent)] text-base transition-colors"
                            >
                              {campusLeadProfile.fullName}
                            </Link>
                            <Badge tone="cyan">Campus Lead</Badge>
                          </div>
                          <p className="text-xs text-text-dim">
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
                        <div className="flex items-center gap-2 text-[11px] text-[var(--accent)] font-semibold bg-[var(--accent-soft)] rounded-xl px-3.5 py-2 sm:self-center whitespace-nowrap">
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

                {/* ── Executive Members ── */}
                <div className="border-t border-border px-5 sm:px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} className="text-cyan-500" />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute">
                        Executive Members
                      </p>
                      <span className="inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-bg text-text-mute">
                        {activeTermMembers.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-dim hidden sm:block">Operational authority & event management</span>
                  </div>

                  {!activeTermMembers.length ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg text-text-mute">
                        <Users size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text">No executive members appointed</p>
                        <p className="text-xs text-text-dim mt-0.5 max-w-xs">
                          The Campus Lead can appoint executive members for this term.
                        </p>
                      </div>
                      {canAssignExecutive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--accent)] text-xs mt-1"
                          onClick={handleOpenAssignModal}
                        >
                          <Plus size={13} className="mr-1" />
                          Appoint First Executive Member
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-bg/40">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-mute uppercase tracking-wide">Member</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-mute uppercase tracking-wide hidden sm:table-cell">Role</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-mute uppercase tracking-wide hidden md:table-cell">Department</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-mute uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeTermMembers.map((tm) => {
                            const profile = store.profiles.find((p) => p.id === tm.userId);
                            return (
                              <tr
                                key={tm.id}
                                className="group hover:bg-bg/40 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)] shrink-0">
                                      {initials(profile?.fullName ?? "EM")}
                                    </span>
                                    <div>
                                      <Link
                                        href={`/profile/${profile?.elevatesId || tm.userId}`}
                                        className="font-semibold text-text hover:text-[var(--accent)] text-sm transition-colors"
                                      >
                                        {profile?.fullName ?? "Unknown Member"}
                                      </Link>
                                      <p className="text-[11px] text-text-dim sm:hidden">
                                        {cleanDisplayDesignation(tm.designation)}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-600">
                                      {cleanDisplayDesignation(tm.designation)}
                                    </span>
                                    {parseDelegations(tm.permissions, tm.designation).length > 0 && (
                                      <span
                                        className="inline-flex items-center rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]"
                                        title="Configured sidebar tabs"
                                      >
                                        {parseDelegations(tm.permissions, tm.designation).length} tabs
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className="text-xs text-text-dim">
                                    {profile?.department || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {canAssignExecutive && (
                                    confirmRemoveId === tm.id ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          disabled={isRemovingMember}
                                          onClick={() => handleRemoveExecutive(tm.id, tm.userId)}
                                          className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                        >
                                          {isRemovingMember ? "…" : "Confirm"}
                                        </button>
                                        <button
                                          onClick={() => setConfirmRemoveId(null)}
                                          className="rounded-lg px-2 py-1 text-[11px] text-text-mute hover:text-text transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmRemoveId(tm.id)}
                                        title="Remove executive member"
                                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-text-mute hover:text-red-500 hover:bg-red-500/10 transition-all"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )
                                  )}
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
          </div>
        )}

        {/* ── TAB: DELEGATIONS ── */}
        {activeTab === "delegations" && (
          <div>
            {/* Info notice */}
            <div className="flex items-start gap-3 bg-bg/40 border-b border-border px-5 py-3">
              <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <p className="text-xs text-text-dim leading-relaxed">
                Assign which sidebar navigation tabs and operational powers each Executive Member can access. Toggling an item immediately displays or hides that tab in their chapter sidebar.
              </p>
            </div>

            {!activeTerm ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg border border-dashed border-border text-text-mute">
                  <Sliders size={20} />
                </span>
                <p className="text-sm font-semibold text-text">No Active Term</p>
                <p className="text-xs text-text-dim max-w-sm">
                  An active term is required to appoint executive members and delegate authority.
                </p>
              </div>
            ) : activeTermMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg border border-dashed border-border text-text-mute">
                  <Users size={20} />
                </span>
                <p className="text-sm font-semibold text-text">No Executive Members</p>
                <p className="text-xs text-text-dim max-w-sm">
                  Appoint an executive member in the Active Term tab to grant delegated Campus Lead capabilities.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeTermMembers.map((tm) => {
                  const profile = store.profiles.find((p) => p.id === tm.userId);
                  const memberName = profile?.fullName ?? "Executive Member";
                  const memberPerms: string[] = parseDelegations(tm.permissions, tm.designation);
                  const grantedCount = memberPerms.length;
                  const isUpdatingMember = Boolean(updatingPermKey && updatingPermKey.startsWith(`${tm.id}:`));
                  const isExpanded = expandedMemberId === tm.id;

                  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
                    Administration: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/20" },
                    Governance: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20" },
                    Operations: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
                    Programs: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
                  };

                  return (
                    <div key={tm.id}>
                      {/* Member Row — click to expand */}
                      <div
                        role="button"
                        tabIndex={0}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-bg/30 transition-colors text-left cursor-pointer select-none"
                        onClick={() => setExpandedMemberId(isExpanded ? null : tm.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedMemberId(isExpanded ? null : tm.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent)] shrink-0">
                            {initials(memberName)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-text text-sm">{memberName}</span>
                              <Badge tone="cyan">{cleanDisplayDesignation(tm.designation)}</Badge>
                            </div>
                            <p className="text-[11px] text-text-dim mt-0.5">
                              {profile?.email}
                              {profile?.department ? ` · ${profile.department}` : ""}
                            </p>
                            {memberPerms.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {memberPerms.slice(0, 4).map((pk) => {
                                  const opt = CAMPUS_LEAD_DELEGATION_OPTIONS.find((o) => o.key === pk);
                                  return (
                                    <span
                                      key={pk}
                                      className="rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium text-text border border-border"
                                    >
                                      {opt?.label?.replace(" Tab", "") || pk}
                                    </span>
                                  );
                                })}
                                {memberPerms.length > 4 && (
                                  <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium text-text-mute border border-border">
                                    +{memberPerms.length - 4} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-text-mute italic mt-1">Default sidebar access (no additional tabs)</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Progress pill */}
                          <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                                style={{ width: `${(grantedCount / CAMPUS_LEAD_DELEGATION_OPTIONS.length) * 100}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-[11px] font-semibold",
                              grantedCount > 0 ? "text-[var(--accent)]" : "text-text-mute",
                            )}>
                              {grantedCount}/{CAMPUS_LEAD_DELEGATION_OPTIONS.length}
                            </span>
                          </div>

                          {canManageDelegations && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={isUpdatingMember || grantedCount === CAMPUS_LEAD_DELEGATION_OPTIONS.length}
                                onClick={() => handleBulkPermissions(tm.id, memberName, true)}
                                className="text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg px-2 py-1 border border-[var(--accent)]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                disabled={isUpdatingMember || grantedCount === 0}
                                onClick={() => handleBulkPermissions(tm.id, memberName, false)}
                                className="text-[11px] font-medium text-text-mute hover:text-text hover:bg-bg rounded-lg px-2 py-1 border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                None
                              </button>
                            </div>
                          )}

                          <span className="text-text-mute transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Expanded Permissions */}
                      {isExpanded && (
                        <div className="bg-bg/30 border-t border-border px-5 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {CAMPUS_LEAD_DELEGATION_OPTIONS.map((opt) => {
                              const isGranted = memberPerms.includes(opt.key);
                              const isThisSaving = updatingPermKey === `${tm.id}:${opt.key}`;
                              const colors = categoryColors[opt.category] ?? categoryColors.Administration;

                              return (
                                <div
                                  key={opt.key}
                                  className={cn(
                                    "flex items-start gap-3 rounded-xl border p-3 transition-all duration-200",
                                    isGranted
                                      ? "border-[var(--accent)]/30 bg-[var(--accent-soft)]/30"
                                      : "border-border bg-bg/50",
                                  )}
                                >
                                  {/* Left: text content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={cn(
                                        "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border",
                                        colors.bg, colors.text, colors.border,
                                      )}>
                                        {opt.category}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-xs text-text leading-snug">{opt.label}</p>
                                    <p className="text-[11px] text-text-dim leading-relaxed mt-0.5">{opt.description}</p>
                                  </div>

                                  {/* Right: Toggle */}
                                  <div className="flex flex-col items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isGranted}
                                      disabled={!canManageDelegations || isThisSaving}
                                      onClick={() => handleTogglePermission(tm.id, memberName, opt.key)}
                                      title={
                                        !canManageDelegations
                                          ? "Only the Campus Lead or Elevates HQ can configure delegations"
                                          : isGranted
                                          ? `Revoke ${opt.label}`
                                          : `Grant ${opt.label}`
                                      }
                                      className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50",
                                        isGranted ? "bg-[var(--accent)]" : "bg-border-strong",
                                      )}
                                    >
                                      <span
                                        aria-hidden="true"
                                        className={cn(
                                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                          isGranted ? "translate-x-4" : "translate-x-0",
                                        )}
                                      />
                                    </button>
                                    {isThisSaving ? (
                                      <span className="text-[9px] text-[var(--accent)] animate-pulse font-medium">…</span>
                                    ) : (
                                      <span className={cn(
                                        "text-[9px] font-semibold",
                                        isGranted ? "text-[var(--accent)]" : "text-text-mute",
                                      )}>
                                        {isGranted ? "ON" : "OFF"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: HISTORY ── */}
        {activeTab === "history" && (
          <div>
            {!pastTerms.length ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg border-2 border-dashed border-border text-text-mute">
                  <History size={24} />
                </span>
                <div>
                  <p className="font-bold text-text text-base">No Past Terms</p>
                  <p className="text-sm text-text-dim mt-1.5">
                    Archived leadership terms will appear here after the first handover.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pastTerms.map((term, idx) => {
                  const leadProfile = store.profiles.find((p) => p.id === term.campusLeadId);
                  const members = store.termMembers.filter((tm) => tm.termId === term.id);
                  const isExpanded = expandedPastTerm === term.id;

                  return (
                    <div key={term.id}>
                      <button
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-bg/40 transition-colors text-left"
                        onClick={() => setExpandedPastTerm(isExpanded ? null : term.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Year badge */}
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg border border-border text-[11px] font-bold text-text-mute shrink-0 font-mono">
                            {String(term.termYear).slice(-2)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-text text-sm">
                                {term.termYear} Term
                              </span>
                              {idx === 0 && <Badge tone="mute">Most Recent</Badge>}
                              <Badge tone="mute">Closed</Badge>
                            </div>
                            <p className="text-[11px] text-text-dim truncate mt-0.5">
                              Lead: {leadProfile?.fullName ?? "Unknown"}
                              {" · "}
                              {formatDate(term.startedAt)}
                              {term.endedAt ? ` → ${formatDate(term.endedAt)}` : " → Archived"}
                              {members.length > 0 ? ` · ${members.length} exec${members.length !== 1 ? "s" : ""}` : ""}
                            </p>
                          </div>
                        </div>

                        <span
                          className="text-text-mute shrink-0 transition-transform duration-200"
                          style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                        >
                          <ChevronRight size={16} />
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-border/60 bg-bg/20">
                          <div className="grid gap-5 sm:grid-cols-2 mt-4">
                            {/* Lead */}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute mb-3 flex items-center gap-1.5">
                                <Crown size={10} className="text-amber-500" />
                                Campus Lead
                              </p>
                              {leadProfile ? (
                                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-[11px] font-bold text-amber-600 shrink-0">
                                    {initials(leadProfile.fullName)}
                                  </span>
                                  <div>
                                    <Link
                                      href={`/profile/${leadProfile.elevatesId || leadProfile.id}`}
                                      className="font-semibold text-text hover:text-[var(--accent)] text-sm transition-colors"
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

                            {/* Executive Members */}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute mb-3 flex items-center gap-1.5">
                                <Shield size={10} className="text-cyan-500" />
                                Executive Members ({members.length})
                              </p>
                              {members.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {members.map((m) => {
                                    const p = store.profiles.find((u) => u.id === m.userId);
                                    return (
                                      <div
                                        key={m.id}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5"
                                      >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[9px] font-bold text-[var(--accent)] shrink-0">
                                          {initials(p?.fullName ?? "?")}
                                        </span>
                                        <span className="text-xs font-medium text-text">{p?.fullName || "Member"}</span>
                                        {m.designation && (
                                          <span className="text-[10px] text-text-mute ml-auto">{m.designation}</span>
                                        )}
                                      </div>
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
        )}
      </div>

      {/* ── MODAL: LEADERSHIP HANDOVER WIZARD ── */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--charcoal-900)_50%,transparent)] backdrop-blur-[3px]"
            onClick={() => !isSubmittingHandover && setHandoverModalOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Leadership Handover Wizard"
            className="relative z-10 flex flex-col w-full max-w-2xl max-h-[92dvh] rounded-2xl border border-border bg-bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
          >
            {/* Header */}
            <div className="relative shrink-0 border-b border-border bg-bg-panel px-6 pt-5 pb-4">
              <button
                type="button"
                onClick={() => !isSubmittingHandover && setHandoverModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-text-mute hover:bg-bg-hover hover:text-text transition"
              >
                <X size={16} />
              </button>

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

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {handoverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5">
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-500">{handoverError}</p>
                </div>
              )}

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

              {/* Step 1: Term Year */}
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

              {/* Step 2: Incoming Campus Lead */}
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

              {/* Step 3: Executive Team */}
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

            {/* Footer */}
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

      {/* ── MODAL: ASSIGN EXECUTIVE MEMBER ── */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal-900/40 backdrop-blur-[3px] transition-opacity"
            onClick={() => !isSubmittingAssign && setAssignModalOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Appoint Executive Members"
            className="relative z-10 flex flex-col w-full max-w-md rounded-[22px] border border-border bg-bg-panel shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-border/80 bg-bg-panel px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shrink-0 border border-[var(--accent)]/15">
                  <UserPlus size={17} />
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-sm font-bold text-text">
                    Appoint Executive Members
                  </h2>
                  <p className="text-[11px] text-text-dim">
                    {activeTerm ? `Term ${activeTerm.termYear}` : ""} · {chapter.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingAssign && setAssignModalOpen(false)}
                className="rounded-lg p-1.5 text-text-mute hover:bg-bg hover:text-text transition-colors"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Compact Body */}
            <div className="p-5 space-y-3.5">
              {assignError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500 leading-tight">{assignError}</p>
                </div>
              )}

              {/* Student Candidate Selection (Single or Bulk) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>Select Eligible Students *</FieldLabel>
                  {filteredCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = filteredCandidates.map((c) => c.id);
                        const isAllSelected = allIds.every((id) => assignStudentIds.includes(id));
                        setAssignStudentIds((prev) =>
                          isAllSelected
                            ? prev.filter((id) => !allIds.includes(id))
                            : Array.from(new Set([...prev, ...allIds])),
                        );
                      }}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      {filteredCandidates.every((c) => assignStudentIds.includes(c.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
                  />
                  <Input
                    value={assignStudentSearch}
                    onChange={(e) => setAssignStudentSearch(e.target.value)}
                    placeholder="Search by name, Elevates ID, or department…"
                    className="pl-8.5 h-8.5 text-xs rounded-xl"
                  />
                  {assignStudentSearch && (
                    <button
                      type="button"
                      onClick={() => setAssignStudentSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Selected Students Tags (if any) */}
                {assignStudentIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto py-0.5">
                    {assignStudentIds.map((id) => {
                      const stu = chapterStudents.find((s) => s.id === id);
                      if (!stu) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] border border-[var(--accent)]/20"
                        >
                          {stu.fullName}
                          <button
                            type="button"
                            onClick={() => setAssignStudentIds((prev) => prev.filter((x) => x !== id))}
                            className="hover:opacity-70 ml-0.5"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                    {assignStudentIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAssignStudentIds([])}
                        className="text-[10px] text-text-mute hover:text-red-500 underline ml-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* Candidate List with Checkboxes */}
                <div className="max-h-36 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-bg/25">
                  {filteredCandidates.length === 0 ? (
                    <p className="p-3 text-center text-xs text-text-dim">
                      {assignStudentSearch
                        ? "No matching students found."
                        : "No eligible students available."}
                    </p>
                  ) : (
                    filteredCandidates.map((stu) => {
                      const isSelected = assignStudentIds.includes(stu.id);
                      return (
                        <button
                          key={stu.id}
                          type="button"
                          onClick={() => {
                            setAssignStudentIds((prev) =>
                              isSelected
                                ? prev.filter((x) => x !== stu.id)
                                : [...prev, stu.id],
                            );
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-left transition-colors",
                            isSelected ? "bg-[var(--accent-soft)]/25" : "hover:bg-bg/50",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "flex h-4 w-4 rounded border items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                  : "border-border bg-bg-panel",
                              )}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)] shrink-0">
                              {initials(stu.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-text truncate leading-tight">
                                {stu.fullName}
                              </p>
                              <p className="text-[10px] text-text-dim truncate leading-tight mt-0.5">
                                {stu.elevatesId ? `${stu.elevatesId} · ` : ""}
                                {stu.department || "General"}
                                {stu.year ? ` · Yr ${stu.year}` : ""}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[var(--accent)] shrink-0">
                              Added
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Workspace Tab Permissions (Compact Pills, No Designation) */}
              <div className="space-y-1.5 pt-0.5">
                <FieldLabel>Workspace Permissions (Optional)</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {INITIAL_TAB_PERMS.map((tab) => {
                    const isChecked = assignInitialPermissions.includes(tab.key);
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setAssignInitialPermissions((prev) =>
                            isChecked ? prev.filter((k) => k !== tab.key) : [...prev, tab.key],
                          );
                        }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium transition-all border inline-flex items-center gap-1",
                          isChecked
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-xs"
                            : "bg-bg border-border text-text-dim hover:border-border-strong hover:text-text",
                        )}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="shrink-0 border-t border-border bg-bg-panel px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-text-dim">
                {assignStudentIds.length === 0
                  ? "Select students"
                  : `${assignStudentIds.length} student${assignStudentIds.length === 1 ? "" : "s"} selected`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={isSubmittingAssign}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="orange"
                  size="sm"
                  onClick={handleConfirmAssignExecutive}
                  disabled={isSubmittingAssign || assignStudentIds.length === 0}
                  className="gap-1.5 h-8 text-xs"
                >
                  {isSubmittingAssign ? (
                    <>
                      <span className="animate-spin">⟳</span> Appointing…
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      {assignStudentIds.length > 1
                        ? `Appoint (${assignStudentIds.length})`
                        : "Confirm & Appoint"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

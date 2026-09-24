"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { getChapterHandoverStatus } from "@/lib/leadership";
import { isSuperAdmin } from "@/lib/permissions";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

type FilterStatus = "all" | "active" | "vacant" | "window_open";

export default function HqLeadershipPage() {
  const { store, openHandoverWindow, closeHandoverWindow, createFirstTerm } = useStore();
  const { session } = useCurrentUser();
  const canManage = isSuperAdmin(session.roleKey);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [flashMsg, setFlashMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  // 1. Assign Initial Campus Lead / Create First Term
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignChapterId, setAssignChapterId] = useState("");
  const [assignLeadId, setAssignLeadId] = useState("");
  const [assignYear, setAssignYear] = useState<number>(new Date().getFullYear());
  const [assignExecMembers, setAssignExecMembers] = useState<Array<{ userId: string; designation: string }>>([]);
  const [assignError, setAssignError] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // 2. Open Handover Window modal
  const [openWindowModalChapter, setOpenWindowModalChapter] = useState<{
    id: string;
    name: string;
    currentYear: string;
  } | null>(null);
  const [openTargetYear, setOpenTargetYear] = useState<number>(new Date().getFullYear() + 1);
  const [openClosedAt, setOpenClosedAt] = useState<string>("");

  // 3. Close Handover Window modal
  const [closeWindowModalChapter, setCloseWindowModalChapter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function showFlash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 3500);
  }

  // Pre-calculate chapter data with new terms system
  const chapterData = useMemo(() => {
    return store.chapters.map((chapter) => {
      const activeTerm =
        store.terms.find((t) => t.chapterId === chapter.id && t.status === "active") ?? null;
      const pastTerms = store.terms.filter(
        (t) => t.chapterId === chapter.id && t.status === "closed",
      );
      const leadProfile = activeTerm?.campusLeadId
        ? store.profiles.find((p) => p.id === activeTerm.campusLeadId) ?? null
        : chapter.campusLeadId
        ? store.profiles.find((p) => p.id === chapter.campusLeadId) ?? null
        : null;

      const execMembers = activeTerm
        ? store.termMembers.filter((m) => m.termId === activeTerm.id)
        : [];

      const windowStatus = getChapterHandoverStatus(
        chapter.id,
        store.handoverWindows,
        Boolean(activeTerm),
      );

      return {
        chapter,
        activeTerm,
        pastTerms,
        leadProfile,
        execMembers,
        windowStatus,
        hasLead: Boolean(leadProfile),
      };
    });
  }, [store.chapters, store.terms, store.termMembers, store.handoverWindows, store.profiles]);

  // Overall metric counts
  const totalChapters = chapterData.length;
  const activeLeadCount = chapterData.filter((c) => c.hasLead).length;
  const vacantCount = totalChapters - activeLeadCount;
  const openWindowCount = chapterData.filter((c) => c.windowStatus.isOpen).length;

  // Filtered rows for the table
  const filteredChapters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapterData.filter(({ chapter, leadProfile, activeTerm, windowStatus, hasLead }) => {
      if (filterStatus === "active" && !hasLead) return false;
      if (filterStatus === "vacant" && hasLead) return false;
      if (filterStatus === "window_open" && !windowStatus.isOpen) return false;

      if (!q) return true;
      return (
        chapter.name.toLowerCase().includes(q) ||
        chapter.college.toLowerCase().includes(q) ||
        (leadProfile?.fullName ?? "").toLowerCase().includes(q) ||
        (leadProfile?.email ?? "").toLowerCase().includes(q) ||
        (leadProfile?.elevatesId ?? "").toLowerCase().includes(q)
      );
    });
  }, [chapterData, search, filterStatus]);

  // Handlers for Window Open/Close
  async function handleConfirmOpenWindow() {
    if (!openWindowModalChapter) return;
    setActionLoading(openWindowModalChapter.id);
    try {
      const ok = await openHandoverWindow({
        chapterId: openWindowModalChapter.id,
        year: String(openTargetYear),
        closedAt: openClosedAt ? new Date(openClosedAt).toISOString() : undefined,
      });
      if (ok) {
        showFlash(`✓ Opened handover window for ${openWindowModalChapter.name} (Term ${openTargetYear})`);
        setOpenWindowModalChapter(null);
      } else {
        alert("Could not open handover window. Check permissions.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error opening window");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmCloseWindow() {
    if (!closeWindowModalChapter) return;
    setActionLoading(closeWindowModalChapter.id);
    try {
      const ok = await closeHandoverWindow({
        chapterId: closeWindowModalChapter.id,
      });
      if (ok) {
        showFlash(`✓ Closed handover window for ${closeWindowModalChapter.name}`);
        setCloseWindowModalChapter(null);
      } else {
        alert("Could not close handover window.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error closing window");
    } finally {
      setActionLoading(null);
    }
  }

  // Handlers for First Term / Campus Lead Assignment
  function openAssignModalForChapter(chapterId?: string) {
    setAssignChapterId(chapterId || store.chapters[0]?.id || "");
    setAssignLeadId("");
    setAssignYear(new Date().getFullYear());
    setAssignExecMembers([]);
    setAssignError("");
    setAssignModalOpen(true);
  }

  function addAssignExecMemberRow() {
    setAssignExecMembers((prev) => [...prev, { userId: "", designation: "" }]);
  }

  function updateAssignExecMemberRow(index: number, field: "userId" | "designation", val: string) {
    setAssignExecMembers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)),
    );
  }

  function removeAssignExecMemberRow(index: number) {
    setAssignExecMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmAssignSubmit() {
    if (!assignChapterId) {
      setAssignError("Please choose a chapter.");
      return;
    }
    if (!assignLeadId) {
      setAssignError("Please select the initial Campus Lead.");
      return;
    }
    setIsSubmittingAssign(true);
    setAssignError("");

    try {
      const filteredExecs = assignExecMembers
        .filter((m) => Boolean(m.userId.trim()))
        .map((m) => ({
          userId: m.userId.trim(),
          designation: m.designation.trim() || undefined,
        }));

      const res = await createFirstTerm({
        chapterId: assignChapterId,
        campusLeadId: assignLeadId,
        termYear: String(assignYear),
        executiveMembers: filteredExecs,
      });

      if (!res.ok) {
        setAssignError(res.error || "Failed to initialize chapter term.");
      } else {
        const chapObj = store.chapters.find((c) => c.id === assignChapterId);
        showFlash(`🎉 Appointed Campus Lead & started Term ${assignYear} for ${chapObj?.name ?? "chapter"}!`);
        setAssignModalOpen(false);
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Error assigning lead");
    } finally {
      setIsSubmittingAssign(false);
    }
  }

  // Candidates for Campus Lead in Assign Modal
  // If chapter selected, prioritize users belonging to that chapter, but allow selecting any user in network
  const assignModalCandidateProfiles = useMemo(() => {
    if (!assignChapterId) return store.profiles;
    const inChapter = store.profiles.filter((p) => p.chapterId === assignChapterId);
    const others = store.profiles.filter((p) => p.chapterId !== assignChapterId);
    return { inChapter, others };
  }, [store.profiles, assignChapterId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network Governance"
        title="Chapter Leadership & Terms"
        description="Network-wide governance of Campus Leads, active terms, and transition handover windows. Manage initial campus appointments and annual February cycles."
        actions={
          canManage ? (
            <Button
              variant="orange"
              onClick={() => openAssignModalForChapter()}
              className="gap-1.5 font-semibold text-xs sm:text-sm"
            >
              <UserPlus size={15} />
              Assign Campus Lead
            </Button>
          ) : null
        }
      />

      {/* Flash message */}
      {flashMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
          {flashMsg}
        </div>
      )}

      {/* 4-Stat Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Chapters"
          value={totalChapters}
          accent="cyan"
        />
        <Stat
          label="Active Campus Leads"
          value={activeLeadCount}
          accent="green"
        />
        <Stat
          label="Vacant Chapters"
          value={vacantCount}
          accent={vacantCount > 0 ? "orange" : "cyan"}
        />
        <Stat
          label="Handover Windows Open"
          value={openWindowCount}
          accent={openWindowCount > 0 ? "orange" : "magenta"}
        />
      </div>

      {/* Main Governance Panel */}
      <TerminalPanel
        title="Chapter Leadership Registry"
        meta={`${filteredChapters.length} of ${totalChapters} chapters`}
        accent="orange"
      >
        {/* Search & Filter Bar */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chapter name, college, Campus Lead name, or email..."
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Status Filter</FieldLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Chapters ({totalChapters})</option>
              <option value="active">Has Campus Lead ({activeLeadCount})</option>
              <option value="vacant">Vacant Chapters ({vacantCount})</option>
              <option value="window_open">Handover Window Open ({openWindowCount})</option>
            </Select>
          </div>
        </div>

        {/* Directory Table */}
        {!filteredChapters.length ? (
          <div className="py-10 text-center">
            <p className="text-xs text-text-dim">No chapters match your search or filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearch("");
                setFilterStatus("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/60 text-text-dim">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">Chapter</th>
                  <th className="px-3.5 py-3 font-semibold">Current Term</th>
                  <th className="px-3.5 py-3 font-semibold">Campus Lead</th>
                  <th className="px-3.5 py-3 font-semibold">Executive Team</th>
                  <th className="px-3.5 py-3 font-semibold">Handover Window</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredChapters.map(
                  ({ chapter, activeTerm, leadProfile, execMembers, windowStatus, hasLead }) => {
                    const isBusy = actionLoading === chapter.id;

                    return (
                      <tr key={chapter.id} className="hover:bg-bg/40 transition">
                        {/* 1. Chapter Name */}
                        <td className="px-3.5 py-3">
                          <Link
                            href={`/chapter/${chapter.slug}/leadership`}
                            className="font-bold text-text hover:text-[var(--accent)] text-sm"
                          >
                            {chapter.name}
                          </Link>
                          <p className="text-[11px] text-text-dim truncate max-w-xs">
                            {chapter.college}
                          </p>
                          <span className="font-mono text-[10px] text-text-mute">
                            /{chapter.slug}
                          </span>
                        </td>

                        {/* 2. Current Term */}
                        <td className="px-3.5 py-3">
                          {activeTerm ? (
                            <div>
                              <span className="font-semibold text-text">
                                Term {activeTerm.termYear}
                              </span>
                              <p className="font-mono text-[10px] text-text-mute">
                                Started {formatDate(activeTerm.startedAt)}
                              </p>
                            </div>
                          ) : (
                            <Badge tone="amber">No Active Term</Badge>
                          )}
                        </td>

                        {/* 3. Campus Lead */}
                        <td className="px-3.5 py-3">
                          {leadProfile ? (
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-500 shrink-0">
                                {initials(leadProfile.fullName)}
                              </span>
                              <div className="min-w-0">
                                <Link
                                  href={`/profile/${leadProfile.elevatesId || leadProfile.id}`}
                                  className="font-semibold text-text hover:text-[var(--accent)] block truncate"
                                >
                                  {leadProfile.fullName}
                                </Link>
                                <p className="text-[10px] text-text-dim truncate">
                                  {leadProfile.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                              <AlertTriangle size={13} />
                              <span>Vacant</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Executive Team */}
                        <td className="px-3.5 py-3">
                          {activeTerm ? (
                            <div className="flex items-center gap-1.5">
                              <Shield size={13} className="text-cyan shrink-0" />
                              <span className="font-medium text-text">
                                {execMembers.length} Exec{execMembers.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-mute">—</span>
                          )}
                        </td>

                        {/* 5. Handover Window Status */}
                        <td className="px-3.5 py-3">
                          {windowStatus.isOpen ? (
                            <Badge
                              tone={windowStatus.reason === "february_auto" ? "green" : "orange"}
                              className="font-semibold"
                            >
                              <Clock size={11} className="mr-1 inline" />
                              {windowStatus.label}
                            </Badge>
                          ) : (
                            <Badge tone="mute">
                              <Lock size={11} className="mr-1 inline" />
                              {windowStatus.label}
                            </Badge>
                          )}
                        </td>

                        {/* 6. Actions */}
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!hasLead ? (
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={() => openAssignModalForChapter(chapter.id)}
                              >
                                <UserPlus size={13} className="mr-1" />
                                Assign Lead
                              </Button>
                            ) : windowStatus.isOpen ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setCloseWindowModalChapter({
                                    id: chapter.id,
                                    name: chapter.name,
                                  })
                                }
                                disabled={isBusy}
                                className="text-red-500 hover:text-red-600 border border-red-500/20"
                              >
                                {isBusy ? "Closing..." : "Close Window"}
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const curYear = Number(
                                    activeTerm?.termYear ?? new Date().getFullYear(),
                                  );
                                  setOpenWindowModalChapter({
                                    id: chapter.id,
                                    name: chapter.name,
                                    currentYear: String(curYear),
                                  });
                                  setOpenTargetYear(curYear + 1);
                                  setOpenClosedAt("");
                                }}
                                disabled={isBusy}
                              >
                                <Unlock size={12} className="mr-1" />
                                Open Window
                              </Button>
                            )}

                            <Link
                              href={`/chapter/${chapter.slug}/leadership`}
                              className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-text-dim hover:text-text hover:bg-bg transition"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </TerminalPanel>

      {/* MODAL 1: ASSIGN INITIAL CAMPUS LEAD (CREATE FIRST TERM) */}
      {assignModalOpen && (
        <Dialog
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Initial Campus Lead"
          description="Appoint the initial Campus Lead for a chapter and activate its first leadership term. For brand new chapters, any student across Elevates can be appointed."
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
                onClick={handleConfirmAssignSubmit}
                disabled={isSubmittingAssign || !assignChapterId || !assignLeadId}
              >
                {isSubmittingAssign ? "Activating Term..." : "Confirm & Appoint"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {assignError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                {assignError}
              </div>
            )}

            {/* Chapter Selection */}
            <div>
              <FieldLabel>Select Chapter *</FieldLabel>
              <Select
                value={assignChapterId}
                onChange={(e) => {
                  setAssignChapterId(e.target.value);
                  setAssignLeadId("");
                }}
              >
                <option value="">-- Choose Chapter --</option>
                {store.chapters.map((c) => {
                  const hasTerm = store.terms.some(
                    (t) => t.chapterId === c.id && t.status === "active",
                  );
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {hasTerm ? "(Has Active Term)" : "★ (Vacant / Needs Lead)"}
                    </option>
                  );
                })}
              </Select>
            </div>

            {/* Term Year Input */}
            <div>
              <FieldLabel>Term Year *</FieldLabel>
              <Input
                type="number"
                value={assignYear}
                onChange={(e) => setAssignYear(parseInt(e.target.value, 10) || 2025)}
                placeholder="e.g. 2025"
              />
            </div>

            {/* Campus Lead Selection */}
            <div>
              <FieldLabel>Select Campus Lead *</FieldLabel>
              <Select
                value={assignLeadId}
                onChange={(e) => setAssignLeadId(e.target.value)}
              >
                <option value="">-- Select student / user to appoint --</option>
                {Array.isArray(assignModalCandidateProfiles) ? (
                  assignModalCandidateProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.email})
                    </option>
                  ))
                ) : (
                  <>
                    {assignModalCandidateProfiles.inChapter.length > 0 && (
                      <optgroup label="Members in this chapter">
                        {assignModalCandidateProfiles.inChapter.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.department || "No Dept"} · {p.email})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="All Elevates members (network-wide)">
                      {assignModalCandidateProfiles.others.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.email})
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </Select>
              <p className="mt-1 text-[11px] text-text-dim">
                The selected user will be promoted to Campus Lead and the chapter leadership term will become active.
              </p>
            </div>

            {/* Optional Initial Executive Members */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Initial Executive Members (Optional)</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addAssignExecMemberRow}
                  className="text-xs text-[var(--accent)]"
                >
                  <Plus size={12} className="mr-1" /> Add Member
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {assignExecMembers.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 p-2"
                  >
                    <div className="flex-1">
                      <Select
                        value={row.userId}
                        onChange={(e) => updateAssignExecMemberRow(idx, "userId", e.target.value)}
                      >
                        <option value="">-- Pick student --</option>
                        {store.profiles
                          .filter((p) => p.id !== assignLeadId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.email})
                            </option>
                          ))}
                      </Select>
                    </div>

                    <div className="w-36 sm:w-44">
                      <Input
                        placeholder="Designation (optional)"
                        value={row.designation}
                        onChange={(e) =>
                          updateAssignExecMemberRow(idx, "designation", e.target.value)
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAssignExecMemberRow(idx)}
                      className="p-1.5 text-text-mute hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL 2: CONFIRM OPEN HANDOVER WINDOW */}
      {openWindowModalChapter && (
        <Dialog
          open={Boolean(openWindowModalChapter)}
          onClose={() => setOpenWindowModalChapter(null)}
          title={`Open Handover Window · ${openWindowModalChapter.name}`}
          description="Opening the handover window allows the active Campus Lead to select the incoming Campus Lead and Executive Members to transition to the next term."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenWindowModalChapter(null)}
                disabled={Boolean(actionLoading)}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={handleConfirmOpenWindow}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading ? "Opening..." : "Confirm & Open Window"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <FieldLabel>Target Next Term Year *</FieldLabel>
              <Input
                type="number"
                value={openTargetYear}
                onChange={(e) => setOpenTargetYear(parseInt(e.target.value, 10) || 2026)}
                placeholder="e.g. 2026"
              />
            </div>

            <div>
              <FieldLabel>Window Closes At (Optional)</FieldLabel>
              <Input
                type="date"
                value={openClosedAt}
                onChange={(e) => setOpenClosedAt(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-text-dim">
                Leave blank to keep window open until manually closed by HQ or until term handover completes.
              </p>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL 3: CONFIRM CLOSE HANDOVER WINDOW */}
      {closeWindowModalChapter && (
        <Dialog
          open={Boolean(closeWindowModalChapter)}
          onClose={() => setCloseWindowModalChapter(null)}
          title={`Close Handover Window · ${closeWindowModalChapter.name}`}
          description={`Are you sure you want to close the transition window for ${closeWindowModalChapter.name}? Campus Leads will not be able to execute handovers while the window is closed.`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCloseWindowModalChapter(null)}
                disabled={Boolean(actionLoading)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCloseWindow}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading ? "Closing..." : "Close Window"}
              </Button>
            </div>
          }
        >
          <div className="py-2 text-xs text-text-dim">
            This closes the window immediately. You can reopen it at any time.
          </div>
        </Dialog>
      )}
    </div>
  );
}

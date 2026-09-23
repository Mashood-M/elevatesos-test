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
import { useStore } from "@/context/store-context";
import { roleKeyLabel } from "@/lib/leadership";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type StatusFilter = "all" | "active_cycle" | "no_cycle" | "onboarding";

const statusTone = {
  active: "green" as const,
  upcoming: "cyan" as const,
  archived: "mute" as const,
};

export default function HqLeadershipPage() {
  const { store, openHandoverWindow, closeHandoverWindow, createFirstTerm } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-chapter handover & term actions state
  const [confirmTermChangeChapter, setConfirmTermChangeChapter] = useState<{
    id: string;
    name: string;
    currentTermYear: string;
  } | null>(null);
  const [confirmCloseWindowChapter, setConfirmCloseWindowChapter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Add First Term modal state
  const [addTermModalChapter, setAddTermModalChapter] = useState<{ id: string; name: string } | null>(null);
  const [addTermYear, setAddTermYear] = useState<number>(new Date().getFullYear());
  const [addCampusLeadId, setAddCampusLeadId] = useState<string>("");
  const [addExecMembers, setAddExecMembers] = useState<Array<{ userId: string; designation: string }>>([
    { userId: "", designation: "" },
  ]);
  const [addTermLoading, setAddTermLoading] = useState<boolean>(false);
  const [addTermError, setAddTermError] = useState<string>("");

  const [windowActionLoading, setWindowActionLoading] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string>("");

  function showFlash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 3500);
  }

  const activeTerms = store.leadershipTerms.filter((t) => t.status === "active");
  const archivedTermIds = new Set(
    store.leadershipTerms
      .filter((t) => t.status === "archived")
      .map((t) => t.id),
  );
  const activeAssignmentCount = store.leadershipAssignments.filter(
    (a) => !archivedTermIds.has(a.termId),
  ).length;

  const openWindowsCount = store.chapters.filter((ch) => {
    const activeTerm = store.terms.find((t) => t.chapterId === ch.id && t.status === "active");
    const w = store.handoverWindows
      .filter((hw) => hw.chapterId === ch.id)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
    return Boolean(activeTerm && w?.status === "open");
  }).length;

  async function handleConfirmTermChange() {
    if (!confirmTermChangeChapter) return;
    setWindowActionLoading(confirmTermChangeChapter.id);
    try {
      const targetNextYear = String(
        Number(confirmTermChangeChapter.currentTermYear || new Date().getFullYear()) + 1,
      );
      const ok = await openHandoverWindow({
        chapterId: confirmTermChangeChapter.id,
        year: targetNextYear,
      });
      if (!ok) {
        alert("Failed to open handover window");
      } else {
        showFlash(`✓ Opened term-change window for ${confirmTermChangeChapter.name}`);
        setConfirmTermChangeChapter(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error opening window");
    } finally {
      setWindowActionLoading(null);
    }
  }

  async function handleConfirmCloseWindow() {
    if (!confirmCloseWindowChapter) return;
    setWindowActionLoading(confirmCloseWindowChapter.id);
    try {
      const ok = await closeHandoverWindow({ chapterId: confirmCloseWindowChapter.id });
      if (!ok) {
        alert("Failed to close handover window");
      } else {
        showFlash(`✓ Closed handover window for ${confirmCloseWindowChapter.name}`);
        setConfirmCloseWindowChapter(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error closing window");
    } finally {
      setWindowActionLoading(null);
    }
  }

  async function handleCreateFirstTermSubmit() {
    if (!addTermModalChapter) return;
    if (!addCampusLeadId) {
      setAddTermError("Please select the chapter's first Campus Lead.");
      return;
    }
    setAddTermLoading(true);
    setAddTermError("");
    try {
      const filteredMembers = addExecMembers
        .filter((m) => Boolean(m.userId.trim()))
        .map((m) => ({
          userId: m.userId.trim(),
          designation: m.designation.trim() || undefined,
        }));

      const res = await createFirstTerm({
        chapterId: addTermModalChapter.id,
        campusLeadId: addCampusLeadId,
        termYear: String(addTermYear),
        executiveMembers: filteredMembers,
      });

      if (!res.ok) {
        setAddTermError(res.error || "Failed to create first term.");
      } else {
        showFlash(`🎉 First leadership term activated for ${addTermModalChapter.name}!`);
        setAddTermModalChapter(null);
      }
    } catch (err) {
      setAddTermError(err instanceof Error ? err.message : "Error creating first term.");
    } finally {
      setAddTermLoading(false);
    }
  }

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

      {flashMsg && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 animate-in fade-in">
          {flashMsg}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <Stat
          label="Open Handover Windows"
          value={openWindowsCount}
          accent="orange"
        />
      </div>

      <TerminalPanel
        title="Chapter Handover Windows"
        meta={`${openWindowsCount} of ${store.chapters.length} open`}
        className="mt-6"
      >
        <div className="space-y-3">
          <p className="text-[12px] text-text-dim">
            Per-chapter leadership transition control. When a chapter&apos;s handover window is open, the current Campus Lead can execute the term handover to appoint the incoming Campus Lead and Executive Members.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/60 text-text-dim">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Chapter</th>
                  <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold">Details</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Handover Window Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {store.chapters.map((chapter) => {
                  const activeTerm = store.terms.find(
                    (t) => t.chapterId === chapter.id && t.status === "active",
                  );
                  const latestWindow = store.handoverWindows
                    .filter((w) => w.chapterId === chapter.id)
                    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
                  const isOpen = Boolean(activeTerm && latestWindow?.status === "open");
                  const isLoading = windowActionLoading === chapter.id;

                  const leadProfile = activeTerm
                    ? store.profiles.find((p) => p.id === activeTerm.campusLeadId)
                    : null;
                  const execMembersCount = activeTerm
                    ? store.termMembers.filter((m) => m.termId === activeTerm.id).length
                    : 0;

                  return (
                    <tr key={chapter.id} className="hover:bg-bg/40 transition">
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-text">{chapter.name}</p>
                        <p className="text-[11px] text-text-dim">{chapter.college}</p>
                      </td>
                      <td className="px-3.5 py-3">
                        {isOpen ? (
                          <Badge tone="green">
                            Open since {formatDate(latestWindow.openedAt)}
                          </Badge>
                        ) : (
                          <Badge tone="mute">Closed</Badge>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-[11px] text-text-dim">
                        {!activeTerm ? (
                          <span className="text-amber-500 font-medium">No active term</span>
                        ) : (
                          <span>
                            Term {activeTerm.termYear} · Lead:{" "}
                            <strong className="text-text font-semibold">
                              {leadProfile?.fullName ?? "Unknown"}
                            </strong>{" "}
                            ({execMembersCount} Exec{execMembersCount === 1 ? "" : "s"})
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        {!activeTerm ? (
                          <Button
                            variant="orange"
                            size="sm"
                            onClick={() => {
                              setAddTermModalChapter({ id: chapter.id, name: chapter.name });
                              setAddTermYear(new Date().getFullYear());
                              setAddCampusLeadId("");
                              setAddExecMembers([{ userId: "", designation: "" }]);
                              setAddTermError("");
                            }}
                          >
                            Add Term
                          </Button>
                        ) : isOpen ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setConfirmCloseWindowChapter({
                                id: chapter.id,
                                name: chapter.name,
                              })
                            }
                            disabled={isLoading}
                          >
                            {isLoading ? "Closing..." : "Close Window"}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setConfirmTermChangeChapter({
                                id: chapter.id,
                                name: chapter.name,
                                currentTermYear: activeTerm.termYear,
                              })
                            }
                            disabled={isLoading}
                          >
                            Term Change
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TerminalPanel>

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
                                        href={`/profile/${user?.elevatesId || a.userId}`}
                                        className="text-cyan hover:text-green"
                                      >
                                        {user?.fullName ?? "Unknown"}
                                      </Link>
                                    </span>
                                    <span className="text-[11px] text-text-mute flex items-center gap-1.5 font-mono">
                                      <span>{roleKeyLabel(a.roleKey)}</span>
                                      {a.createdAt && (
                                        <span className="text-[10px] text-text-dim">
                                          · Appointed {formatDateTime(a.createdAt)}
                                        </span>
                                      )}
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
                          {open ? "Hide directory" : "Directory"}
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

      {/* DIALOG 1: CONFIRM TERM CHANGE (OPEN WINDOW) */}
      {confirmTermChangeChapter && (
        <Dialog
          open={Boolean(confirmTermChangeChapter)}
          onClose={() => setConfirmTermChangeChapter(null)}
          title={`Open Term-Change Window — ${confirmTermChangeChapter.name}`}
          description={`This opens the term-change window for ${confirmTermChangeChapter.name}. The current Campus Lead will then be able to hand the team over to a new term. Continue?`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmTermChangeChapter(null)}
                disabled={Boolean(windowActionLoading)}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={handleConfirmTermChange}
                disabled={Boolean(windowActionLoading)}
              >
                {windowActionLoading ? "Opening..." : "Confirm & Open Window"}
              </Button>
            </div>
          }
        >
          <div className="py-2 text-xs text-text-dim">
            Once open, the active Campus Lead can choose the incoming leadership team from their chapter leadership dashboard.
          </div>
        </Dialog>
      )}

      {/* DIALOG 2: CONFIRM CLOSE WINDOW */}
      {confirmCloseWindowChapter && (
        <Dialog
          open={Boolean(confirmCloseWindowChapter)}
          onClose={() => setConfirmCloseWindowChapter(null)}
          title={`Close Handover Window — ${confirmCloseWindowChapter.name}`}
          description={`Close the leadership handover window for ${confirmCloseWindowChapter.name}?`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCloseWindowChapter(null)}
                disabled={Boolean(windowActionLoading)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCloseWindow}
                disabled={Boolean(windowActionLoading)}
              >
                {windowActionLoading ? "Closing..." : "Close Window"}
              </Button>
            </div>
          }
        >
          <div className="py-2 text-xs text-text-dim">
            Closing the window will prevent further term handovers until reopened by HQ.
          </div>
        </Dialog>
      )}

      {/* DIALOG 3: ADD FIRST TERM */}
      {addTermModalChapter && (
        <Dialog
          open={Boolean(addTermModalChapter)}
          onClose={() => setAddTermModalChapter(null)}
          title={`Add First Term — ${addTermModalChapter.name}`}
          description={`Initialize the first leadership term for ${addTermModalChapter.name}. Pick the first Campus Lead and Executive Members.`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddTermModalChapter(null)}
                disabled={addTermLoading}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={handleCreateFirstTermSubmit}
                disabled={addTermLoading || !addCampusLeadId}
              >
                {addTermLoading ? "Activating Term..." : "Activate First Term"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {addTermError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                {addTermError}
              </div>
            )}

            <div>
              <FieldLabel>Term Year *</FieldLabel>
              <Input
                type="number"
                value={addTermYear}
                onChange={(e) => setAddTermYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                placeholder="e.g. 2026"
              />
              <p className="mt-1 text-[11px] text-text-dim">
                The academic/calendar year for this initial term.
              </p>
            </div>

            <div>
              <FieldLabel>Select First Campus Lead *</FieldLabel>
              <Select
                value={addCampusLeadId}
                onChange={(e) => setAddCampusLeadId(e.target.value)}
              >
                <option value="">-- Choose student in chapter --</option>
                {store.profiles
                  .filter((p) => p.chapterId === addTermModalChapter.id)
                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                  .map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName} ({stu.department || "No Dept"} · Year {stu.year || "—"}) — {stu.email}
                    </option>
                  ))}
              </Select>
              <p className="mt-1 text-[11px] text-text-dim">
                The selected student will be appointed with the &apos;campus_lead&apos; role.
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>First Executive Members (Optional)</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAddExecMembers((prev) => [...prev, { userId: "", designation: "" }])
                  }
                  className="text-xs text-[var(--accent)]"
                >
                  <Plus size={12} className="mr-1" /> Add Member
                </Button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {addExecMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 p-2"
                  >
                    <div className="flex-1">
                      <Select
                        value={member.userId}
                        onChange={(e) =>
                          setAddExecMembers((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, userId: e.target.value } : row,
                            ),
                          )
                        }
                      >
                        <option value="">-- Pick student --</option>
                        {store.profiles
                          .filter(
                            (p) =>
                              p.chapterId === addTermModalChapter.id &&
                              p.id !== addCampusLeadId,
                          )
                          .sort((a, b) => a.fullName.localeCompare(b.fullName))
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
                          setAddExecMembers((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, designation: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAddExecMembers((prev) => prev.filter((_, i) => i !== idx))
                      }
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
    </div>
  );
}


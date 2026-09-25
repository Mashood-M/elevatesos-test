"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { getChapterHandoverStatus } from "@/lib/leadership";
import { isSuperAdmin } from "@/lib/permissions";
import { formatDate, initials } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Lock,
  Search,
  Shield,
  Unlock,
} from "lucide-react";

type FilterStatus = "all" | "window_open" | "window_closed";

export default function HqLeadershipPage() {
  const {
    store,
    openHandoverWindow,
    closeHandoverWindow,
    batchOpenHandoverWindows,
    batchCloseHandoverWindows,
  } = useStore();
  const { session } = useCurrentUser();
  const canManage = isSuperAdmin(session.roleKey);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [flashMsg, setFlashMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function showFlash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 4000);
  }

  // Pre-calculate chapter data with terms system & handover window status
  const chapterData = useMemo(() => {
    return store.chapters.map((chapter) => {
      const activeTerm =
        store.terms.find((t) => t.chapterId === chapter.id && t.status === "active") ?? null;
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
        Boolean(activeTerm || chapter.campusLeadId),
      );

      return {
        chapter,
        activeTerm,
        leadProfile,
        execMembers,
        windowStatus,
        hasLead: Boolean(leadProfile),
        isOpen: windowStatus.isOpen,
      };
    });
  }, [store.chapters, store.terms, store.termMembers, store.handoverWindows, store.profiles]);

  // Overall metric counts
  const totalChapters = chapterData.length;
  const openWindowCount = chapterData.filter((c) => c.isOpen).length;
  const closedWindowCount = totalChapters - openWindowCount;
  const activeLeadCount = chapterData.filter((c) => c.hasLead).length;

  // Filtered rows for the table
  const filteredChapters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapterData.filter(({ chapter, leadProfile, isOpen }) => {
      if (filterStatus === "window_open" && !isOpen) return false;
      if (filterStatus === "window_closed" && isOpen) return false;

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

  // Selection state helpers
  const allFilteredSelected =
    filteredChapters.length > 0 &&
    filteredChapters.every(({ chapter }) => selectedIds.has(chapter.id));
  const someFilteredSelected =
    filteredChapters.some(({ chapter }) => selectedIds.has(chapter.id)) &&
    !allFilteredSelected;

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      // Unselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const { chapter } of filteredChapters) {
          next.delete(chapter.id);
        }
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const { chapter } of filteredChapters) {
          next.add(chapter.id);
        }
        return next;
      });
    }
  }

  function toggleChapterSelection(chapterId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  function selectByStatus(status: "all" | "open" | "closed") {
    if (status === "all") {
      setSelectedIds(new Set(store.chapters.map((c) => c.id)));
    } else if (status === "open") {
      const openChaps = chapterData.filter((c) => c.isOpen).map((c) => c.chapter.id);
      setSelectedIds(new Set(openChaps));
    } else if (status === "closed") {
      const closedChaps = chapterData.filter((c) => !c.isOpen).map((c) => c.chapter.id);
      setSelectedIds(new Set(closedChaps));
    }
  }

  // Single Chapter Open / Close Handler
  async function handleToggleSingle(chapterId: string, action: "open" | "close") {
    const chap = store.chapters.find((c) => c.id === chapterId);
    const chapName = chap?.name || "chapter";
    const chapInfo = chapterData.find((c) => c.chapter.id === chapterId);
    setActionLoading(chapterId);

    try {
      if (action === "open") {
        const nextYear = chapInfo?.activeTerm
          ? String(Number(chapInfo.activeTerm.termYear) + 1)
          : String(new Date().getFullYear() + 1);

        const ok = await openHandoverWindow({
          chapterId,
          year: nextYear,
        });
        if (ok) {
          showFlash(`✓ Opened handover window for ${chapName} (Term ${nextYear})`);
        } else {
          alert(`Failed to open handover window for ${chapName}`);
        }
      } else {
        const ok = await closeHandoverWindow({ chapterId });
        if (ok) {
          showFlash(`✓ Closed handover window for ${chapName}`);
        } else {
          alert(`Failed to close handover window for ${chapName}`);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating handover window");
    } finally {
      setActionLoading(null);
    }
  }

  // Bulk Open / Close Handler
  async function handleBulkAction(action: "open" | "close") {
    const targetIds = Array.from(selectedIds);
    if (!targetIds.length) return;

    setActionLoading("bulk");
    try {
      if (action === "open") {
        const ok = await batchOpenHandoverWindows({
          chapterIds: targetIds,
        });
        if (ok) {
          showFlash(`✓ Opened handover windows for ${targetIds.length} chapter${targetIds.length === 1 ? "" : "s"}`);
          setSelectedIds(new Set());
        } else {
          alert("Failed to batch open handover windows.");
        }
      } else {
        const ok = await batchCloseHandoverWindows({
          chapterIds: targetIds,
        });
        if (ok) {
          showFlash(`✓ Closed handover windows for ${targetIds.length} chapter${targetIds.length === 1 ? "" : "s"}`);
          setSelectedIds(new Set());
        } else {
          alert("Failed to batch close handover windows.");
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error executing batch action");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network Governance"
        title="Leadership Handover Windows"
        description="Control leadership transition windows across all chapters in the network. Opening a window authorizes the Campus Lead to add a new term, appoint incoming leadership, and configure executive members."
      />

      {/* Flash message */}
      {flashMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-500 animate-in fade-in">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{flashMsg}</span>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Chapters"
          value={totalChapters}
          accent="cyan"
        />
        <Stat
          label="Handover Windows Open"
          value={openWindowCount}
          accent={openWindowCount > 0 ? "orange" : "cyan"}
        />
        <Stat
          label="Handover Windows Closed"
          value={closedWindowCount}
          accent="magenta"
        />
        <Stat
          label="Active Campus Leads"
          value={activeLeadCount}
          accent="green"
        />
      </div>

      {/* Main Governance Panel */}
      <TerminalPanel
        title="Chapter Handover Window Control"
        meta={`${filteredChapters.length} of ${totalChapters} chapters`}
        accent="orange"
      >
        {/* Search & Status Filter Bar */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FieldLabel>Search Chapters</FieldLabel>
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
            <FieldLabel>Window Status Filter</FieldLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Chapters ({totalChapters})</option>
              <option value="window_open">Window Open ({openWindowCount})</option>
              <option value="window_closed">Window Closed ({closedWindowCount})</option>
            </Select>
          </div>
        </div>

        {/* Multi-Select & Bulk Operations Toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-bg/50 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex h-6 min-w-6 px-1.5 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-[11px] font-bold">
              {selectedIds.size}
            </span>
            <span className="font-semibold text-text">
              {selectedIds.size === 0
                ? "No chapters selected"
                : `${selectedIds.size} chapter${selectedIds.size === 1 ? "" : "s"} selected`}
            </span>
            <span className="text-text-mute">·</span>
            <button
              type="button"
              onClick={() => selectByStatus("all")}
              className="text-xs text-[var(--accent)] hover:underline font-medium"
            >
              Select All
            </button>
            <span className="text-text-mute">·</span>
            <button
              type="button"
              onClick={() => selectByStatus("open")}
              className="text-xs text-text-dim hover:text-text font-medium"
            >
              Select Open ({openWindowCount})
            </button>
            <span className="text-text-mute">·</span>
            <button
              type="button"
              onClick={() => selectByStatus("closed")}
              className="text-xs text-text-dim hover:text-text font-medium"
            >
              Select Closed ({closedWindowCount})
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-text-mute">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="orange"
                size="sm"
                onClick={() => handleBulkAction("open")}
                disabled={selectedIds.size === 0 || actionLoading !== null}
                className="gap-1.5 font-semibold text-xs whitespace-nowrap"
              >
                <Unlock size={13} />
                Open Windows ({selectedIds.size})
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction("close")}
                disabled={selectedIds.size === 0 || actionLoading !== null}
                className="gap-1.5 font-semibold text-xs whitespace-nowrap"
              >
                <Lock size={13} />
                Close Windows ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>

        {/* Directory Table */}
        {!filteredChapters.length ? (
          <div className="py-12 text-center">
            <p className="text-xs text-text-dim">No chapters match your search or filter.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
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
                  <th className="w-10 px-3.5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      aria-label="Select all visible chapters"
                      className="h-4 w-4 rounded border-border text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-3 font-semibold">Chapter</th>
                  <th className="px-3.5 py-3 font-semibold">Current Term</th>
                  <th className="px-3.5 py-3 font-semibold">Campus Lead</th>
                  <th className="px-3.5 py-3 font-semibold">Handover Window</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Window Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredChapters.map(
                  ({ chapter, activeTerm, leadProfile, windowStatus, isOpen }) => {
                    const isBusy = actionLoading === chapter.id || actionLoading === "bulk";
                    const isSelected = selectedIds.has(chapter.id);

                    return (
                      <tr
                        key={chapter.id}
                        className={`transition hover:bg-bg/40 ${
                          isSelected ? "bg-[var(--accent-soft)]/20" : ""
                        }`}
                      >
                        {/* 1. Selection Checkbox */}
                        <td className="w-10 px-3.5 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleChapterSelection(chapter.id)}
                            aria-label={`Select ${chapter.name}`}
                            className="h-4 w-4 rounded border-border text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                          />
                        </td>

                        {/* 2. Chapter Details */}
                        <td className="px-3.5 py-3">
                          <Link
                            href={`/chapter/${chapter.slug}/leadership`}
                            className="font-bold text-text hover:text-[var(--accent)] text-sm block"
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

                        {/* 3. Current Term */}
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

                        {/* 4. Campus Lead */}
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

                        {/* 5. Window Status */}
                        <td className="px-3.5 py-3">
                          {isOpen ? (
                            <Badge
                              tone={windowStatus.reason === "february_auto" ? "green" : "orange"}
                              className="font-semibold gap-1"
                            >
                              <Clock size={11} className="inline" />
                              {windowStatus.label}
                            </Badge>
                          ) : (
                            <Badge tone="mute" className="gap-1">
                              <Lock size={11} className="inline" />
                              {windowStatus.label}
                            </Badge>
                          )}
                        </td>

                        {/* 6. Open / Close Button & View */}
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canManage && (
                              isOpen ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleSingle(chapter.id, "close")}
                                  disabled={isBusy}
                                  className="text-red-500 hover:text-red-600 border border-red-500/20 font-semibold text-xs"
                                >
                                  <Lock size={12} className="mr-1" />
                                  {isBusy && actionLoading === chapter.id ? "Closing..." : "Close Window"}
                                </Button>
                              ) : (
                                <Button
                                  variant="orange"
                                  size="sm"
                                  onClick={() => handleToggleSingle(chapter.id, "open")}
                                  disabled={isBusy}
                                  className="font-semibold text-xs"
                                >
                                  <Unlock size={12} className="mr-1" />
                                  {isBusy && actionLoading === chapter.id ? "Opening..." : "Open Window"}
                                </Button>
                              )
                            )}

                            <Link
                              href={`/chapter/${chapter.slug}/leadership`}
                              title={`View ${chapter.name} Leadership`}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-text-dim hover:text-text hover:bg-bg transition inline-flex items-center gap-1"
                            >
                              View
                              <ExternalLink size={11} />
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
    </div>
  );
}

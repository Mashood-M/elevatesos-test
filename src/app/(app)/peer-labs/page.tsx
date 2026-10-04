"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import { PeerLabCard } from "@/components/domain/peer-lab-card";
import {
  PeerLabDetailDialog,
} from "@/components/domain/peer-lab-detail-dialog";
import {
  PeerLabManagerDialog,
  type PeerLabSeriesItem,
} from "@/components/domain/peer-lab-manager-dialog";
import { useCurrentUser, useStore, showToast } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { BookOpen, Globe, Layers, Plus, Search, Shield } from "lucide-react";

export default function PeerLabsDirectoryPage() {
  const { store } = useStore();
  const { session } = useCurrentUser();
  const isHq = isHqRole(session.roleKey);
  const canManage = isHq || isExecutiveRole(session.roleKey) || isFacultyRole(session.roleKey);

  const [labs, setLabs] = useState<PeerLabSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "open" | "chapter" | "enrolled">("all");
  const [selectedLab, setSelectedLab] = useState<PeerLabSeriesItem | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<PeerLabSeriesItem | null>(null);

  const userChapter = store.chapters.find((c) => c.id === session.chapterId);

  const loadLabs = useCallback(async () => {
    try {
      const res = await fetch("/api/mutations?type=peer_labs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load peer labs");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: PeerLabSeriesItem[] = (json.peerLabs ?? []).map((l: any) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        subtitle: l.subtitle || "",
        track: l.track || "Learning Program",
        description: l.description || "",
        chapterId: l.chapterId ?? null,
        status: (l.status === "draft"
          ? "Draft"
          : l.status === "active"
            ? "Active"
            : l.status === "completed"
              ? "Completed"
              : "Upcoming") as "Draft" | "Active" | "Completed" | "Upcoming",
        applicationsOpen: l.applicationsOpen ?? true,
        joinedCount: l.enrolledCount ?? 0,
        featured: Boolean(l.featured),
        posterUrl: l.posterUrl || "",
        thumbnailUrl: l.thumbnailUrl || "",
        facilitators: l.facilitators || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resources: (l.resources || []).map((r: any) => ({
          title: r.title || "Resource",
          url: r.url || "",
          type: r.type || "Notes",
          isGated: r.isGated ?? true,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lessons: (l.phases || []).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          date: p.date,
          time: p.time,
          location: p.location,
          eventSlug: p.slug,
          eventId: p.eventId,
        })),
        enrolled: Boolean(l.enrolled),
        enrollmentStatus: l.enrollmentStatus || null,
      }));

      setLabs(mapped);
      // Sync with currently open dialog if open
      setSelectedLab((prev) => (prev ? (mapped.find((x) => x.id === prev.id) ?? null) : null));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error loading peer labs", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLabs();
  }, [loadLabs]);

  const filteredLabs = (() => {
    let list = labs;

    if (activeTab === "open") {
      list = list.filter((l) => !l.chapterId);
    } else if (activeTab === "chapter") {
      if (session.chapterId) {
        list = list.filter((l) => l.chapterId === session.chapterId);
      }
    } else if (activeTab === "enrolled") {
      list = list.filter((l) => l.enrolled);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.subtitle.toLowerCase().includes(q) ||
          (l.track && l.track.toLowerCase().includes(q)) ||
          l.facilitators.some((f) => f.name.toLowerCase().includes(q)),
      );
    }

    return list;
  })();

  const handleDelete = async (lab: PeerLabSeriesItem) => {
    if (!confirm(`Delete peer lab "${lab.title}"?`)) return;
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "delete_peer_lab", data: { id: lab.id } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to delete");
      showToast("Peer lab deleted", "info");
      loadLabs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error deleting peer lab", "error");
    }
  };

  const handlePublish = async (lab: PeerLabSeriesItem) => {
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "publish_peer_lab",
          data: { labId: lab.id, status: "upcoming", applicationsOpen: true },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to publish peer lab");
      showToast(`Peer Lab "${lab.title}" published! Students can now register.`, "success");
      loadLabs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error publishing peer lab", "error");
    }
  };

  const getChapterName = (chapterId: string | null) => {
    if (!chapterId) return undefined;
    const c = store.chapters.find((x) => x.id === chapterId);
    return c?.name || "Campus Chapter";
  };

  const totalEnrolled = labs.reduce((acc, l) => acc + (l.joinedCount || 0), 0);
  const totalSessions = labs.reduce((acc, l) => acc + (l.lessons?.length || 0), 0);

  return (
    <div className="space-y-5 pb-12">
      {/* ─── 01. ARCHITECTURAL HERO & MANIFESTO ──────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-10 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Exhibition Eyebrow */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                PEER LEARNING {"//"} TRACKS
              </span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                COHORT-DRIVEN · MULTI-SESSION · SYLLABUS
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-[1.2]">
              Hands-on Peer Labs.
              <span className="block text-[#f26430]">
                Intensive Engineering Tracks &amp; Bootcamps.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-2 text-xs sm:text-[13px] font-medium text-[#52525b] leading-relaxed max-w-xl">
              Multi-session study jams, engineering bootcamps, and cohort workshops across university chapters. Learn together, complete project phases, and earn verifiable certificates.
            </p>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLab(null);
                    setManagerOpen(true);
                  }}
                  className="h-8.5 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  New Peer Lab
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("open")}
                className="h-8.5 px-3.5 rounded-[8px] bg-white hover:bg-zinc-100 text-[#2d2d34] font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] hover:border-[#2d2d34]/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Globe size={13} />
                Global Open Tracks
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("enrolled")}
                className="h-8.5 px-3.5 rounded-[8px] bg-[#414066] hover:bg-[#343353] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen size={13} />
                My Enrolled Pass
              </button>
            </div>
          </div>

          {/* Right Graphic: Geometric Module */}
          <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[12px] shadow-[2px_2px_0px_rgba(45,45,52,0.1)] select-none shrink-0 w-60 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-2.5">
              <div className="h-8.5 w-8.5 rounded-full bg-[#f26430] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[11px]">
                P
              </div>
              <div className="h-8.5 w-8.5 rounded-[3px] bg-[#414066] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[11px]">
                L
              </div>
              <div className="relative h-8.5 w-8.5 flex items-center justify-center">
                <div className="h-8.5 w-8.5 bg-[#f59e0b] border border-[#2d2d34]/30 rotate-45 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-[#2d2d34] font-mono font-bold text-[11px]">
                  <span className="-rotate-45">B</span>
                </div>
              </div>
            </div>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
              KUNST &amp; TECHNIK
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] mt-0.5 uppercase tracking-widest">
              PEER LEARNING · ELEVATES OS
            </p>
            <div className="mt-2.5 w-full border-t border-[#2d2d34]/15 pt-2 flex items-center justify-between font-mono text-[9.5px] text-[#52525b]">
              <span>ACTIVE TRACKS</span>
              <span className="font-bold text-[#2d2d34]">{labs.length} SCHEDULED</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02. METRIC BLOCKS ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // TOTAL TRACKS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {labs.length}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-[#52525b] uppercase tracking-wider">
            All Learning Programs
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // OPEN COHORTS
            </span>
            <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-black text-[#414066]">
            {labs.filter((l) => !l.chapterId).length}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-[#52525b] uppercase tracking-wider">
            Network-Wide Admissions
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // ENROLLED SEATS
            </span>
            <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-black text-[#5f7560]">
            {totalEnrolled}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-[#52525b] uppercase tracking-wider">
            Active Student Passes
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // SESSIONS &amp; LABS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {totalSessions}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-[#52525b] uppercase tracking-wider">
            Hands-on Modules
          </p>
        </div>
      </section>

      {/* ─── 03. FILTER & SEARCH STRIP ───────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Monospace Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            All Tracks ({labs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("open")}
            className={`h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "open"
                ? "bg-[#f26430] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <Globe size={12} />
            Open To All ({labs.filter((l) => !l.chapterId).length})
          </button>

          {session.chapterId && (
            <button
              type="button"
              onClick={() => setActiveTab("chapter")}
              className={`h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "chapter"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                  : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <Shield size={12} />
              {userChapter?.shortCode || "My Campus"} ({labs.filter((l) => l.chapterId === session.chapterId).length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("enrolled")}
            className={`h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "enrolled"
                ? "bg-[#5f7560] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <BookOpen size={12} />
            My Enrolled ({labs.filter((l) => l.enrolled).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks, mentors, topics..."
            className="w-full h-8 pl-8 pr-3 bg-white border border-[#2d2d34]/20 rounded-[8px] font-mono text-[11px] text-[#2d2d34] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] transition-colors"
          />
        </div>
      </section>

      {/* ─── 04. PEER LABS GRID ──────────────────────────────────────── */}
      {loading ? (
        <ContentSkeleton />
      ) : filteredLabs.length === 0 ? (
        <div className="py-16 text-center rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white/70 p-8 space-y-3 bauhaus-grid-bg">
          <div className="h-12 w-12 rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/20 flex items-center justify-center mx-auto text-[#71717a] shadow-[1px_1px_0px_#2d2d34]">
            <Layers size={22} />
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-black text-base text-[#2d2d34]">
            No Peer Labs Found
          </h3>
          <p className="font-mono text-xs text-[#71717a] max-w-sm mx-auto">
            {search
              ? `No peer labs match "${search}". Try adjusting your keywords.`
              : activeTab === "enrolled"
                ? "You haven't enrolled in any Peer Labs yet. Explore open programs above to register and unlock materials!"
                : "No peer labs currently scheduled in this category."}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingLab(null);
                setManagerOpen(true);
              }}
              className="mt-2 h-7.5 px-3.5 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={12} strokeWidth={2.5} />
              Launch A Track
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredLabs.map((lab) => {
            const canManageLab = isHq || (canManage && Boolean(lab.chapterId && lab.chapterId === session.chapterId));
            return (
              <PeerLabCard
                key={lab.id}
                lab={lab}
                chapterName={getChapterName(lab.chapterId)}
                onSelect={(l) => setSelectedLab(l)}
                onEdit={canManageLab ? (l) => { setEditingLab(l); setManagerOpen(true); } : undefined}
                onDelete={canManageLab ? handleDelete : undefined}
                onPublish={canManageLab ? handlePublish : undefined}
                canManage={canManageLab}
              />
            );
          })}
        </div>
      )}

      {/* ─── 05. DETAIL & MANAGER MODALS ─────────────────────────────── */}
      <PeerLabDetailDialog
        lab={selectedLab}
        open={Boolean(selectedLab)}
        onClose={() => setSelectedLab(null)}
        onEnrollmentChange={() => {
          loadLabs();
        }}
        chapterName={selectedLab ? getChapterName(selectedLab.chapterId) : undefined}
        canManage={isHq || (canManage && Boolean(selectedLab?.chapterId && selectedLab.chapterId === session.chapterId))}
        onPublish={handlePublish}
        onEdit={(l) => { setEditingLab(l); setManagerOpen(true); }}
      />

      {canManage && (
        <PeerLabManagerDialog
          open={managerOpen}
          onClose={() => {
            setManagerOpen(false);
            setEditingLab(null);
          }}
          onSuccess={(saved) => {
            loadLabs();
            if (saved?.chapterId && session.chapterId === saved.chapterId) {
              setActiveTab("chapter");
            } else if (!saved?.chapterId) {
              setActiveTab("open");
            } else {
              setActiveTab("all");
            }
          }}
          initialLab={editingLab}
          isHqUser={isHq}
          defaultChapterId={session.chapterId || undefined}
          defaultChapterName={userChapter?.name}
        />
      )}
    </div>
  );
}

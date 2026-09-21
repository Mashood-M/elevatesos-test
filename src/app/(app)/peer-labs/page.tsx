"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { BookOpen, Globe, Layers, Plus, Search, Shield, Sparkles } from "lucide-react";

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
      setLoading(true);
      const res = await fetch("/api/mutations?type=peer_labs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load peer labs");

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
        resources: (l.resources || []).map((r: any) => ({
          title: r.title || "Resource",
          url: r.url || "",
          type: r.type || "Notes",
          isGated: r.isGated ?? true,
        })),
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
      if (selectedLab) {
        const updated = mapped.find((x) => x.id === selectedLab.id);
        if (updated) setSelectedLab(updated);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error loading peer labs", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedLab]);

  useEffect(() => {
    loadLabs();
  }, []);

  const filteredLabs = useMemo(() => {
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
  }, [labs, activeTab, search, session.chapterId]);

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

  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <Sparkles size={13} /> Hands-on Programs
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-text tracking-tight mt-1">
            Peer Labs & Bootcamps
          </h1>
          <p className="text-xs sm:text-sm text-text-mute mt-1">
            Multi-day intensive study jams, engineering bootcamps, and workshops across chapters.
          </p>
        </div>

        {canManage && (
          <Button
            variant="orange"
            onClick={() => {
              setEditingLab(null);
              setManagerOpen(true);
            }}
            className="gap-1.5 rounded-full px-5 text-xs font-bold shadow-sm self-start sm:self-auto"
          >
            <Plus size={14} /> New Peer Lab
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/80 text-xs shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-text text-bg shadow-xs"
                : "text-text-mute hover:text-text"
            }`}
          >
            All Programs ({labs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("open")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
              activeTab === "open"
                ? "bg-[var(--accent)] text-white shadow-xs"
                : "text-text-mute hover:text-text"
            }`}
          >
            <Globe size={13} /> Open to All ({labs.filter((l) => !l.chapterId).length})
          </button>
          {session.chapterId && (
            <button
              type="button"
              onClick={() => setActiveTab("chapter")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
                activeTab === "chapter"
                  ? "bg-text text-bg shadow-xs"
                  : "text-text-mute hover:text-text"
              }`}
            >
              <Shield size={13} /> {userChapter?.shortCode || "My Campus"} ({labs.filter((l) => l.chapterId === session.chapterId).length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("enrolled")}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
              activeTab === "enrolled"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-text-mute hover:text-text"
            }`}
          >
            My Enrolled ({labs.filter((l) => l.enrolled).length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bootcamps, topics..."
            className="pl-9 rounded-full h-9 text-xs"
          />
        </div>
      </div>

      {/* Peer Labs Grid */}
      {loading ? (
        <ContentSkeleton />
      ) : filteredLabs.length === 0 ? (
        <div className="py-16 text-center rounded-[24px] border border-dashed border-border/80 bg-surface/50 p-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-black/[0.04] flex items-center justify-center mx-auto text-text-mute">
            <Layers size={22} />
          </div>
          <h3 className="font-bold text-base text-text">No Peer Labs found</h3>
          <p className="text-xs text-text-mute max-w-sm mx-auto">
            {search
              ? `No peer labs match "${search}". Try adjusting your keywords.`
              : activeTab === "enrolled"
                ? "You haven't enrolled in any Peer Labs yet. Explore open programs above to register and unlock materials!"
                : "No peer labs currently scheduled in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Student Details & Enrollment Dialog */}
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

      {/* Manager Dialog for HQ & Leads */}
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

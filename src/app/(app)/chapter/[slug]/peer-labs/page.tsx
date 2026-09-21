"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser, useStore, showToast } from "@/context/store-context";
import { resolveChapter, isExecutiveRole, isFacultyRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import { PeerLabCard } from "@/components/domain/peer-lab-card";
import { PeerLabDetailDialog } from "@/components/domain/peer-lab-detail-dialog";
import {
  PeerLabManagerDialog,
  type PeerLabSeriesItem,
} from "@/components/domain/peer-lab-manager-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Layers, Plus, Search, Shield, Sparkles } from "lucide-react";

export default function ChapterPeerLabsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();

  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);
  const isHq = isHqRole(session.roleKey);
  const isLead =
    isHq ||
    ((isExecutiveRole(session.roleKey) || isFacultyRole(session.roleKey)) &&
      (!session.chapterId || session.chapterId === chapter?.id));

  const [labs, setLabs] = useState<PeerLabSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chapter" | "open" | "enrolled">("chapter");
  const [selectedLab, setSelectedLab] = useState<PeerLabSeriesItem | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<PeerLabSeriesItem | null>(null);

  const loadLabs = useCallback(async () => {
    try {
      setLoading(true);
      const chapParam = chapter?.id ? `&chapterId=${chapter.id}` : "";
      const res = await fetch(`/api/mutations?type=peer_labs${chapParam}`, { cache: "no-store" });
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

  if (!chapter) {
    return <ChapterNotFound />;
  }

  const filteredLabs = useMemo(() => {
    let list = labs;

    if (activeTab === "chapter") {
      list = list.filter((l) => l.chapterId === chapter.id);
    } else if (activeTab === "open") {
      list = list.filter((l) => !l.chapterId);
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
  }, [labs, activeTab, search, chapter.id]);

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

  const getChapterName = (cId: string | null) => {
    if (!cId) return undefined;
    if (cId === chapter.id) return chapter.name;
    const c = store.chapters.find((x) => x.id === cId);
    return c?.name || "Campus Chapter";
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <Shield size={13} /> {chapter.name} Programs
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-text tracking-tight mt-1">
            Peer Labs & Hands-on Learning
          </h1>
          <p className="text-xs sm:text-sm text-text-mute mt-1">
            Workshops, bootcamps, and multi-day sessions hosted by {chapter.name} and network-wide.
          </p>
        </div>

        {isLead && (
          <Button
            variant="orange"
            onClick={() => {
              setEditingLab(null);
              setManagerOpen(true);
            }}
            className="gap-1.5 rounded-full px-5 text-xs font-bold shadow-sm self-start sm:self-auto"
          >
            <Plus size={14} /> Create Peer Lab
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/80 text-xs shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("chapter")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
              activeTab === "chapter"
                ? "bg-text text-bg shadow-xs"
                : "text-text-mute hover:text-text"
            }`}
          >
            <Shield size={13} /> {chapter.shortCode || "Chapter"} Labs ({labs.filter((l) => l.chapterId === chapter.id).length})
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
            <Globe size={13} /> Open to All (Global) ({labs.filter((l) => !l.chapterId).length})
          </button>
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

        {/* Search Input */}
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
              ? `No peer labs match "${search}".`
              : activeTab === "chapter" && isLead
                ? `No Peer Labs have been created for ${chapter.name} yet. Click "Create Peer Lab" above to launch one!`
                : "No peer labs currently scheduled in this category."}
          </p>
          {activeTab === "chapter" && isLead && (
            <Button
              variant="orange"
              size="sm"
              onClick={() => {
                setEditingLab(null);
                setManagerOpen(true);
              }}
              className="mt-2 rounded-full gap-1.5 text-xs font-bold"
            >
              <Plus size={13} /> Create Chapter Peer Lab
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabs.map((lab) => {
            const canManageLab = isHq || (isLead && lab.chapterId === chapter.id);
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

      {/* Student Details & Registration Dialog */}
      <PeerLabDetailDialog
        lab={selectedLab}
        open={Boolean(selectedLab)}
        onClose={() => setSelectedLab(null)}
        onEnrollmentChange={() => {
          loadLabs();
        }}
        chapterName={selectedLab ? getChapterName(selectedLab.chapterId) : undefined}
        canManage={isHq || (isLead && selectedLab?.chapterId === chapter.id)}
        onPublish={handlePublish}
        onEdit={(l) => { setEditingLab(l); setManagerOpen(true); }}
      />

      {/* Peer Lab Manager Dialog for Campus Lead & HQ */}
      {isLead && (
        <PeerLabManagerDialog
          open={managerOpen}
          onClose={() => {
            setManagerOpen(false);
            setEditingLab(null);
          }}
          onSuccess={(saved) => {
            loadLabs();
            if (saved?.chapterId === chapter.id) {
              setActiveTab("chapter");
            } else if (!saved?.chapterId) {
              setActiveTab("open");
            }
          }}
          initialLab={editingLab}
          isHqUser={isHq}
          defaultChapterId={chapter.id}
          defaultChapterName={chapter.name}
        />
      )}
    </div>
  );
}

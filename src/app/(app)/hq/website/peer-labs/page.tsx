"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast, useStore } from "@/context/store-context";
import {
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { genUuid } from "@/lib/uuid";

export interface LessonPhase {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  eventSlug: string;
  /** Optional link to a real event (events.id) so registrations/attendance work */
  eventId: string | null;
}

export interface Facilitator {
  name: string;
  role: string;
}

export interface LabResource {
  title: string;
  url: string;
  type: string;
  isGated?: boolean;
}

export interface PeerLabSeriesItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** Host campus: chapters.id, or null for a network-wide lab */
  chapterId: string | null;
  status: "Draft" | "Completed" | "Active" | "Upcoming";
  joinedCount: number;
  featured: boolean;
  posterUrl?: string;
  thumbnailUrl?: string;
  facilitators: Facilitator[];
  resources: LabResource[];
  lessons: LessonPhase[];
}

export default function PeerLabsCMSPage() {
  const { store } = useStore();
  const [labs, setLabs] = useState<PeerLabSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingLab, setEditingLab] = useState<PeerLabSeriesItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const campusLabel = (chapterId: string | null) => {
    if (!chapterId) return "Network-wide (all campuses)";
    const c = store.chapters.find((x) => x.id === chapterId);
    return c?.college || c?.name || "Unknown campus";
  };

  const loadLabs = useCallback(async () => {
    try {
      const res = await fetch("/api/mutations?type=peer_labs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load peer labs");
      interface LabResponsePhase {
        id?: string;
        slug?: string;
        title: string;
        date?: string;
        time?: string;
        location?: string;
        eventId?: string | null;
      }
      interface LabResponseFacilitator {
        name: string;
        role?: string;
      }
      interface LabResponseItem {
        id: string;
        slug: string;
        title: string;
        subtitle?: string | null;
        description?: string | null;
        chapterId?: string | null;
        status?: string;
        enrolledCount?: number;
        featured?: boolean;
        facilitators?: LabResponseFacilitator[];
        resources?: PeerLabSeriesItem["resources"];
        phases?: LabResponsePhase[];
      }

      setLabs(
        ((json.peerLabs as LabResponseItem[]) || []).map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          subtitle: l.subtitle || "",
          description: l.description || "",
          chapterId: l.chapterId ?? null,
          status: (l.status === "draft" ? "Draft" : l.status === "active" ? "Active" : l.status === "completed" ? "Completed" : "Upcoming") as PeerLabSeriesItem["status"],
          joinedCount: l.enrolledCount || 0,
          featured: Boolean(l.featured),
          posterUrl: (l as any).poster_url || (l as any).posterUrl || "",
          thumbnailUrl: (l as any).thumbnail_url || (l as any).thumbnailUrl || "",
          facilitators: (l.facilitators || []).map((f) => ({ name: f.name, role: f.role || "Facilitator" })),
          resources: l.resources || [],
          lessons: (l.phases || []).map((p) => ({
            id: p.id || genUuid(),
            slug: p.slug || "",
            title: p.title,
            date: p.date || "TBA",
            time: p.time || "",
            location: p.location || "",
            eventSlug: "",
            eventId: p.eventId ?? null,
          })),
        })),
      );
    } catch (err) {
      console.error("Failed to load peer labs:", err);
      showToast(err instanceof Error ? err.message : "Failed to load peer labs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLabs();
  }, [loadLabs]);

  const filtered = labs.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.subtitle.toLowerCase().includes(search.toLowerCase()),
  );

  const blankLab = (): PeerLabSeriesItem => ({
    id: `lab-${Date.now()}`,
    slug: "",
    title: "",
    subtitle: "",
    description: "",
    chapterId: null,
    status: "Upcoming",
    joinedCount: 0,
    featured: false,
    posterUrl: "",
    thumbnailUrl: "",
    facilitators: [{ name: "", role: "" }],
    resources: [{ title: "", url: "", type: "Doc", isGated: true }],
    lessons: [
      {
        id: `phase-${Date.now()}`,
        slug: "phase-1",
        title: "Phase 1: Getting Started",
        date: "TBA",
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
        eventId: null,
      },
    ],
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="Peer Labs & Hands-on Cohorts"
        description="Manage multi-session peer learning tracks on elevates.live/peer-labs — syllabus phases, facilitators, cheatsheets, and enrolled student counts"
        actions={
          <Button
            size="sm"
            variant="orange"
            onClick={() => {
              setEditingLab(blankLab());
              setIsNew(true);
            }}
          >
            <Plus size={14} /> New Peer Lab Track
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
        />
        <Input
          placeholder="Search peer labs..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Peer Labs List */}
      {loading && <p className="text-xs text-text-dim">Loading peer labs…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-xs text-text-dim">No peer labs yet. Create the first track with “New Peer Lab Track”.</p>
      )}
      <div className="space-y-4">
        {filtered.map((lab) => (
          <div
            key={lab.id}
            className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-6 shadow-sm hover:border-border-hover transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={lab.status === "Active" ? "green" : "mute"}>
                    {lab.status}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-[var(--accent)] border border-[var(--accent)]/40 px-2.5 py-0.5 rounded-sm">
                    👥 {lab.joinedCount} Builders Enrolled
                  </span>
                  <span className="font-mono text-xs text-text-dim">/{lab.slug}</span>
                </div>

                <h3 className="font-[family-name:var(--font-display)] text-xl font-black uppercase text-text">
                  {lab.title}
                </h3>
                <p className="text-sm font-semibold text-[var(--accent)]">{lab.subtitle}</p>
                <p className="text-xs text-text-dim leading-relaxed">{lab.description}</p>
                <p className="text-xs font-mono text-text-dim">📍 {campusLabel(lab.chapterId)}</p>

                {/* Facilitators */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs font-semibold text-text">Facilitators:</span>
                  {lab.facilitators.map((f) => (
                    <span
                      key={f.name}
                      className="rounded bg-bg-page border border-border px-2 py-0.5 text-xs text-text"
                    >
                      {f.name} <span className="text-text-dim">({f.role})</span>
                    </span>
                  ))}
                </div>

                {/* Lessons / Phases list */}
                <div className="pt-3 border-t border-border space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text block">
                    Curriculum Phases ({lab.lessons.length} Sessions):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {lab.lessons.map((ls, idx) => (
                      <div
                        key={ls.id}
                        className="rounded-[var(--radius-md)] border border-border bg-bg-page p-2.5 text-xs space-y-0.5"
                      >
                        <span className="font-mono text-[10px] text-[var(--accent)] font-bold block">
                          Phase 0{idx + 1} · {ls.date} ({ls.time})
                        </span>
                        <p className="font-semibold text-text">{ls.title}</p>
                        <span className="text-[10px] text-text-dim block">📍 {ls.location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 self-start">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingLab(lab);
                    setIsNew(false);
                  }}
                >
                  <Edit size={13} /> Edit Track
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  onClick={async () => {
                    if (!confirm(`Delete Peer Lab Track "${lab.title}"?`)) return;
                    try {
                      const res = await fetch("/api/mutations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "delete_peer_lab", data: { id: lab.id, slug: lab.slug } }),
                      });
                      const json = await res.json();
                      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
                      setLabs((prev) => prev.filter((l) => l.id !== lab.id));
                      showToast("Peer lab deleted", "success");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingLab && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-3xl rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl border border-border space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  {isNew ? "Create Peer Lab Series" : "Edit Peer Lab Series"}
                </h3>
                <p className="text-xs text-text-dim">Matches elevates.live/peer-labs</p>
              </div>
              <button
                onClick={() => setEditingLab(null)}
                className="text-text-dim hover:text-text p-1.5 rounded-full hover:bg-bg-page"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="font-semibold text-text-dim block mb-1">Track Title</label>
                <Input
                  value={editingLab.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    const currentAuto = finalizeSlug(editingLab.title);
                    const isAuto = !editingLab.slug || editingLab.slug === currentAuto;
                    const autoSlug = isAuto ? finalizeSlug(val) : editingLab.slug;
                    setEditingLab({ ...editingLab, title: val, slug: autoSlug });
                  }}
                  placeholder="e.g. Cybersecurity Lab"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Slug</label>
                  <Input
                    value={editingLab.slug}
                    onChange={(e) =>
                      setEditingLab({
                        ...editingLab,
                        slug: formatSlugInput(e.target.value),
                      })
                    }
                    onBlur={() =>
                      setEditingLab({
                        ...editingLab,
                        slug: finalizeSlug(editingLab.slug),
                      })
                    }
                    placeholder="cybersec-defense-lab"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Status</label>
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                    value={editingLab.status}
                    onChange={(e) =>
                      setEditingLab({
                        ...editingLab,
                        status: e.target.value as "Completed" | "Active" | "Upcoming",
                      })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-text-dim block mb-1">Subtitle</label>
                <Input
                  value={editingLab.subtitle}
                  onChange={(e) => setEditingLab({ ...editingLab, subtitle: e.target.value })}
                  placeholder="3-Phase Hands-on Kali Linux & Network Defense"
                />
              </div>

              <div>
                <label className="font-semibold text-text-dim block mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
                  value={editingLab.description}
                  onChange={(e) =>
                    setEditingLab({ ...editingLab, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Poster / Banner URL</label>
                  <Input
                    placeholder="https://.../poster.png"
                    value={editingLab.posterUrl || ""}
                    onChange={(e) =>
                      setEditingLab({ ...editingLab, posterUrl: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Custom Thumbnail URL</label>
                  <Input
                    placeholder="https://.../thumb.png"
                    value={editingLab.thumbnailUrl || ""}
                    onChange={(e) =>
                      setEditingLab({ ...editingLab, thumbnailUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              {(editingLab.posterUrl || editingLab.thumbnailUrl) ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-page p-2">
                  <img
                    src={editingLab.posterUrl || editingLab.thumbnailUrl}
                    alt="Peer lab artwork"
                    className="h-12 w-20 object-cover rounded border border-border"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="text-[11px] text-text-dim">
                    Poster artwork preview
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Campus Host</label>
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                    value={editingLab.chapterId ?? ""}
                    onChange={(e) =>
                      setEditingLab({ ...editingLab, chapterId: e.target.value || null })
                    }
                  >
                    <option value="">Network-wide (all campuses)</option>
                    {store.chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.college || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Enrolled</label>
                  <div className="h-9 flex items-center rounded-[var(--radius-md)] border border-border bg-bg-page px-3 text-xs text-text-dim">
                    {editingLab.joinedCount} (counted automatically from enrollments)
                  </div>
                </div>
              </div>

              {/* Phases / Lessons Editor */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text uppercase tracking-wider block">
                    Curriculum Lesson Phases
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setEditingLab({
                        ...editingLab,
                        lessons: [
                          ...editingLab.lessons,
                          {
                            id: `phase-${Date.now()}`,
                            slug: `phase-${editingLab.lessons.length + 1}`,
                            title: `Phase ${editingLab.lessons.length + 1}: Topic`,
                            date: "TBA",
                            time: "10:00 AM",
                            location: "Campus Computer Lab",
                            eventSlug: "",
                            eventId: null,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={12} /> Add Phase
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingLab.lessons.map((ls, idx) => (
                    <div
                      key={ls.id}
                      className="rounded-[var(--radius-md)] border border-border bg-bg-page p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          className="h-8 flex-1 font-bold text-xs bg-transparent border-b border-border text-text px-1 outline-none focus:border-[var(--accent)]"
                          value={ls.title}
                          placeholder="Phase Title"
                          onChange={(e) => {
                            const next = [...editingLab.lessons];
                            next[idx].title = e.target.value;
                            setEditingLab({ ...editingLab, lessons: next });
                          }}
                        />
                        <button
                          onClick={() =>
                            setEditingLab({
                              ...editingLab,
                              lessons: editingLab.lessons.filter((_, j) => j !== idx),
                            })
                          }
                          className="text-text-dim hover:text-red-500 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          className="h-8 rounded border border-border bg-bg px-2 text-xs text-text"
                          placeholder="Date (e.g. 17 Sep 2025)"
                          value={ls.date}
                          onChange={(e) => {
                            const next = [...editingLab.lessons];
                            next[idx].date = e.target.value;
                            setEditingLab({ ...editingLab, lessons: next });
                          }}
                        />
                        <input
                          className="h-8 rounded border border-border bg-bg px-2 text-xs text-text"
                          placeholder="Time (e.g. 10:00 AM)"
                          value={ls.time}
                          onChange={(e) => {
                            const next = [...editingLab.lessons];
                            next[idx].time = e.target.value;
                            setEditingLab({ ...editingLab, lessons: next });
                          }}
                        />
                        <input
                          className="h-8 rounded border border-border bg-bg px-2 text-xs text-text"
                          placeholder="Location"
                          value={ls.location}
                          onChange={(e) => {
                            const next = [...editingLab.lessons];
                            next[idx].location = e.target.value;
                            setEditingLab({ ...editingLab, lessons: next });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facilitators Editor */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text uppercase tracking-wider block">
                    Facilitators
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setEditingLab({
                        ...editingLab,
                        facilitators: [...editingLab.facilitators, { name: "", role: "Facilitator" }],
                      })
                    }
                  >
                    <Plus size={12} /> Add Facilitator
                  </Button>
                </div>
                {editingLab.facilitators.map((f, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      className="h-8 rounded border border-border bg-bg px-2 text-xs text-text"
                      placeholder="Name"
                      value={f.name}
                      onChange={(e) => {
                        const next = editingLab.facilitators.map((x, j) => (j === idx ? { ...x, name: e.target.value } : x));
                        setEditingLab({ ...editingLab, facilitators: next });
                      }}
                    />
                    <input
                      className="h-8 rounded border border-border bg-bg px-2 text-xs text-text"
                      placeholder="Role (e.g. Lead Mentor)"
                      value={f.role}
                      onChange={(e) => {
                        const next = editingLab.facilitators.map((x, j) => (j === idx ? { ...x, role: e.target.value } : x));
                        setEditingLab({ ...editingLab, facilitators: next });
                      }}
                    />
                    <button
                      onClick={() =>
                        setEditingLab({
                          ...editingLab,
                          facilitators: editingLab.facilitators.filter((_, j) => j !== idx),
                        })
                      }
                      className="text-text-dim hover:text-red-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Exclusive Gated Resources */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-text uppercase tracking-wider block">
                      🎁 Track Resources (Exclusive / Gated)
                    </label>
                    <p className="text-[11px] text-text-dim">
                      Slide decks, GitHub repos, and cheatsheets for registered members.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setEditingLab({
                        ...editingLab,
                        resources: [
                          ...editingLab.resources,
                          { title: "", url: "", type: "Slides", isGated: true },
                        ],
                      })
                    }
                  >
                    <Plus size={12} /> Add Resource
                  </Button>
                </div>

                <div className="space-y-2">
                  {editingLab.resources.map((res, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 flex-wrap sm:flex-nowrap rounded-[var(--radius-md)] border border-border bg-bg-page p-2"
                    >
                      <input
                        className="h-8 flex-1 min-w-[140px] rounded border border-border bg-bg px-2 text-xs text-text"
                        placeholder="Title (e.g. Lab Handbook)"
                        value={res.title}
                        onChange={(e) => {
                          const next = [...editingLab.resources];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setEditingLab({ ...editingLab, resources: next });
                        }}
                      />
                      <input
                        className="h-8 flex-1 min-w-[150px] rounded border border-border bg-bg px-2 text-xs text-text font-mono"
                        placeholder="URL (https://...)"
                        value={res.url}
                        onChange={(e) => {
                          const next = [...editingLab.resources];
                          next[idx] = { ...next[idx], url: e.target.value };
                          setEditingLab({ ...editingLab, resources: next });
                        }}
                      />
                      <select
                        className="h-8 rounded border border-border bg-bg px-2 text-xs text-text shrink-0"
                        value={res.type || "Doc"}
                        onChange={(e) => {
                          const next = [...editingLab.resources];
                          next[idx] = { ...next[idx], type: e.target.value };
                          setEditingLab({ ...editingLab, resources: next });
                        }}
                      >
                        <option value="Slides">Slides</option>
                        <option value="Code">Code</option>
                        <option value="Doc">Doc</option>
                        <option value="Video">Video</option>
                        <option value="Cheatsheet">Cheatsheet</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-text-dim cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={res.isGated !== false}
                          onChange={(e) => {
                            const next = [...editingLab.resources];
                            next[idx] = { ...next[idx], isGated: e.target.checked };
                            setEditingLab({ ...editingLab, resources: next });
                          }}
                          className="accent-[var(--accent)]"
                        />
                        <span>Gated</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingLab({
                            ...editingLab,
                            resources: editingLab.resources.filter((_, j) => j !== idx),
                          })
                        }
                        className="text-text-dim hover:text-red-500 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setEditingLab(null)}>
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  if (!editingLab.title.trim()) {
                    showToast("Give the peer lab a title first");
                    return;
                  }
                  const cleanSlug = finalizeSlug(editingLab.slug || editingLab.title || "peer-lab");
                  const lab = { ...editingLab, slug: cleanSlug };
                  setSaving(true);
                  try {
                    const res = await fetch("/api/mutations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "peer_lab",
                        data: {
                          id: isNew ? undefined : lab.id,
                          slug: lab.slug,
                          title: lab.title,
                          subtitle: lab.subtitle,
                          description: lab.description,
                          chapterId: lab.chapterId,
                          status: lab.status.toLowerCase(),
                          featured: lab.featured,
                          poster_url: lab.posterUrl,
                          thumbnail_url: lab.thumbnailUrl,
                          resources: lab.resources.filter((r) => r.title || r.url),
                          facilitators: lab.facilitators,
                          phases: lab.lessons,
                          actorId: store.session.userId,
                        },
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
                    setEditingLab(null);
                    showToast("Peer lab saved", "success");
                    await loadLabs();
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Save failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save Track
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

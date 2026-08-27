"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/context/store-context";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Edit,
  ExternalLink,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LessonPhase {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  eventSlug: string;
}

export interface Facilitator {
  name: string;
  role: string;
}

export interface LabResource {
  title: string;
  url: string;
  type: string;
}

export interface PeerLabSeriesItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  campusName: string;
  status: "Completed" | "Active" | "Upcoming";
  joinedCount: number;
  featured: boolean;
  facilitators: Facilitator[];
  resources: LabResource[];
  lessons: LessonPhase[];
}

const DEFAULT_PEER_LABS: PeerLabSeriesItem[] = [];

export default function PeerLabsCMSPage() {
  const { store } = useStore();
  const [labs, setLabs] = useState<PeerLabSeriesItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingLab, setEditingLab] = useState<PeerLabSeriesItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (store.peerLabs && store.peerLabs.length > 0) {
      const dynamicLabs: PeerLabSeriesItem[] = store.peerLabs.map((l) => ({
        id: l.id,
        slug: l.slug || l.id,
        title: l.title,
        subtitle: l.subtitle || "",
        description: l.description || "",
        campusName: store.chapters.find((c) => c.id === l.chapterId)?.college || store.chapters[0]?.college || store.chapters[0]?.name || "Campus Chapter",
        status: (l.status === "active" ? "Active" : l.status === "completed" ? "Completed" : "Upcoming") as any,
        joinedCount: l.enrolledCount || 0,
        featured: true,
        facilitators: l.facilitators ? l.facilitators.map((f: any) => ({ name: f.name || f, role: f.role || "Facilitator" })) : [],
        resources: [],
        lessons: l.phases ? l.phases.map((p: any, idx: number) => ({
          id: p.id || `phase-${idx}`,
          slug: p.slug || `phase-${idx}`,
          title: p.title || `Phase ${idx + 1}`,
          date: p.date || "TBA",
          time: p.time || "10:00 AM",
          location: p.location || "Campus Computer Lab",
          eventSlug: "",
        })) : [],
      }));
      setLabs(dynamicLabs);
    }
  }, [store.peerLabs, store.chapters]);

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
    campusName: store.chapters[0]?.college || store.chapters[0]?.name || "Campus Chapter",
    status: "Upcoming",
    joinedCount: 0,
    featured: false,
    facilitators: [{ name: "", role: "" }],
    resources: [{ title: "", url: "", type: "Doc" }],
    lessons: [
      {
        id: `phase-${Date.now()}`,
        slug: "phase-1",
        title: "Phase 1: Getting Started",
        date: "TBA",
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
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
                <p className="text-xs font-mono text-text-dim">📍 {lab.campusName}</p>

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
                  onClick={() => setLabs((prev) => prev.filter((l) => l.id !== lab.id))}
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
                  onChange={(e) => setEditingLab({ ...editingLab, title: e.target.value })}
                  placeholder="e.g. Cybersecurity Lab"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Slug</label>
                  <Input
                    value={editingLab.slug}
                    onChange={(e) => setEditingLab({ ...editingLab, slug: e.target.value })}
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
                  <label className="font-semibold text-text-dim block mb-1">Campus Host</label>
                  <Input
                    value={editingLab.campusName}
                    onChange={(e) =>
                      setEditingLab({ ...editingLab, campusName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-dim block mb-1">Enrolled Count</label>
                  <input
                    type="number"
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                    value={editingLab.joinedCount}
                    onChange={(e) =>
                      setEditingLab({
                        ...editingLab,
                        joinedCount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
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
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setEditingLab(null)}>
                Cancel
              </Button>
              <Button
                variant="orange"
                size="sm"
                onClick={() => {
                  if (isNew) setLabs((prev) => [...prev, editingLab]);
                  else
                    setLabs((prev) =>
                      prev.map((l) => (l.id === editingLab.id ? editingLab : l)),
                    );
                  setEditingLab(null);
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

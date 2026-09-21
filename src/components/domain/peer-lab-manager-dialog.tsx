"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { showToast, useStore } from "@/context/store-context";
import { finalizeSlug, formatSlugInput } from "@/lib/slug";
import { genUuid } from "@/lib/uuid";
import { Plus, Trash2, Globe, Shield, Sparkles, BookOpen, Layers } from "lucide-react";

export interface LessonPhase {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  eventSlug: string;
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
  track?: string;
  description: string;
  chapterId: string | null;
  status: "Draft" | "Completed" | "Active" | "Upcoming";
  joinedCount: number;
  featured: boolean;
  applicationsOpen?: boolean;
  maxParticipants?: number | null;
  posterUrl?: string;
  thumbnailUrl?: string;
  facilitators: Facilitator[];
  resources: LabResource[];
  lessons: LessonPhase[];
  enrolled?: boolean;
  enrollmentStatus?: string | null;
}

interface PeerLabManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (savedLab?: { id: string; chapterId: string | null }) => void;
  initialLab?: PeerLabSeriesItem | null;
  isHqUser: boolean;
  defaultChapterId?: string | null;
  defaultChapterName?: string;
}

export function PeerLabManagerDialog({
  open,
  onClose,
  onSuccess,
  initialLab,
  isHqUser,
  defaultChapterId = null,
  defaultChapterName,
}: PeerLabManagerDialogProps) {
  const { store } = useStore();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [track, setTrack] = useState("Learning Program");
  const [status, setStatus] = useState<"Draft" | "Active" | "Completed" | "Upcoming">("Upcoming");
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [description, setDescription] = useState("");
  const [chapterId, setChapterId] = useState<string | null>(defaultChapterId ?? null);
  const [posterUrl, setPosterUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [facilitators, setFacilitators] = useState<Facilitator[]>([
    { name: "", role: "Lead Facilitator" },
  ]);
  const [lessons, setLessons] = useState<LessonPhase[]>([]);
  const [resources, setResources] = useState<LabResource[]>([]);

  useEffect(() => {
    if (initialLab) {
      setTitle(initialLab.title);
      setSlug(initialLab.slug);
      setSubtitle(initialLab.subtitle || "");
      setTrack(initialLab.track || "Learning Program");
      setStatus(initialLab.status || "Upcoming");
      setApplicationsOpen(initialLab.applicationsOpen !== false);
      setDescription(initialLab.description || "");
      setChapterId(isHqUser ? (initialLab.chapterId ?? null) : (defaultChapterId ?? null));
      setPosterUrl(initialLab.posterUrl || "");
      setThumbnailUrl(initialLab.thumbnailUrl || "");
      setFacilitators(
        initialLab.facilitators?.length
          ? initialLab.facilitators
          : [{ name: "", role: "Lead Facilitator" }]
      );
      setLessons(initialLab.lessons || []);
      setResources(initialLab.resources || []);
    } else {
      setTitle("");
      setSlug("");
      setSubtitle("");
      setTrack("Learning Program");
      setStatus("Upcoming");
      setApplicationsOpen(true);
      setDescription("");
      setChapterId(defaultChapterId ? defaultChapterId : (isHqUser ? null : (defaultChapterId ?? null)));
      setPosterUrl("");
      setThumbnailUrl("");
      setFacilitators([{ name: "", role: "Lead Facilitator" }]);
      setLessons([]);
      setResources([]);
    }
  }, [initialLab, open, isHqUser, defaultChapterId]);

  const addFacilitator = () => {
    setFacilitators((prev) => [...prev, { name: "", role: "Mentor" }]);
  };

  const removeFacilitator = (idx: number) => {
    setFacilitators((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLesson = () => {
    setLessons((prev) => [
      ...prev,
      {
        id: genUuid(),
        slug: `session-${prev.length + 1}`,
        title: `Session ${prev.length + 1}`,
        date: "",
        time: "",
        location: "Online",
        eventSlug: "",
        eventId: null,
      },
    ]);
  };

  const removeLesson = (idx: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  const addResource = () => {
    setResources((prev) => [
      ...prev,
      { title: "", url: "", type: "Slides", isGated: true },
    ]);
  };

  const removeResource = (idx: number) => {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast("Title is required", "error");
      return;
    }
    const cleanSlug = finalizeSlug(slug || cleanTitle);
    if (!cleanSlug) {
      showToast("Please provide a valid slug", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: initialLab?.id || genUuid(),
        title: cleanTitle,
        slug: cleanSlug,
        subtitle: subtitle.trim(),
        track: track.trim(),
        description: description.trim(),
        chapterId: isHqUser ? chapterId : (defaultChapterId ?? null),
        status,
        applicationsOpen,
        posterUrl: posterUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        facilitators: facilitators.filter((f) => f.name.trim()),
        phases: lessons.filter((l) => l.title.trim()),
        resources: resources.filter((r) => r.title.trim() && r.url.trim()),
      };

      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "peer_lab", data: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save Peer Lab");
      }

      showToast(initialLab ? "Peer Lab updated!" : "Peer Lab created successfully!", "success");
      onSuccess({ id: json.id || payload.id, chapterId: payload.chapterId });
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving peer lab", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initialLab ? "Edit Peer Lab" : "Create Peer Lab"}
      className="max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      <div className="space-y-6 text-xs text-text pt-2">
        {/* Scope Notice */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-background flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isHqUser && !chapterId ? (
              <div className="h-7 w-7 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <Globe size={15} />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield size={15} />
              </div>
            )}
            <div>
              <p className="font-semibold text-text">
                {isHqUser && !chapterId
                  ? "Network-Wide (Open to All)"
                  : `Chapter Lab: ${defaultChapterName || store.chapters.find((c) => c.id === chapterId)?.name || "Campus Chapter"}`}
              </p>
              <p className="text-[11px] text-text-mute">
                {isHqUser && !chapterId
                  ? "Visible to students across all campus chapters"
                  : "Assigned strictly to your university campus"}
              </p>
            </div>
          </div>

          {isHqUser && (
            <select
              className="h-8 rounded-xl border border-border bg-surface px-2.5 text-[11px] text-text font-medium"
              value={chapterId || ""}
              onChange={(e) => setChapterId(e.target.value ? e.target.value : null)}
            >
              <option value="">🌐 Open to All (Global)</option>
              {store.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Basic Information */}
        <div className="space-y-3">
          <h4 className="font-bold text-text flex items-center gap-2">
            <BookOpen size={14} className="text-[var(--accent)]" />
            General Information
          </h4>

          <div>
            <label className="font-semibold text-text-dim block mb-1">Title *</label>
            <Input
              value={title}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                if (!initialLab) {
                  setSlug(finalizeSlug(val));
                }
              }}
              placeholder="e.g. Distributed Systems & Rust Bootcamp"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-dim block mb-1">Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(formatSlugInput(e.target.value))}
                onBlur={() => setSlug(finalizeSlug(slug))}
                placeholder="rust-bootcamp"
              />
            </div>
            <div>
              <label className="font-semibold text-text-dim block mb-1">Track / Category</label>
              <Input
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="e.g. Systems Engineering"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-dim block mb-1">Subtitle</label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. 4-Day Hands-on Workshop with Final Project"
              />
            </div>
            <div>
              <label className="font-semibold text-text-dim block mb-1">Status</label>
              <select
                className="h-9 w-full rounded-xl border border-border bg-bg px-3 text-xs text-text"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Draft" | "Active" | "Completed" | "Upcoming")}
              >
                <option value="Upcoming">Upcoming (Published — Ready for students)</option>
                <option value="Draft">Draft (Work in progress — hidden from students)</option>
                <option value="Active">Active (Ongoing sessions)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border/70 bg-bg/50 space-y-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applicationsOpen}
                onChange={(e) => setApplicationsOpen(e.target.checked)}
                className="rounded text-[var(--accent)] focus:ring-[var(--accent)] h-4 w-4"
              />
              <span className="font-semibold text-text text-xs">
                Accept Student Registrations / Applications
              </span>
            </label>
            <p className="text-[11px] text-text-mute ml-6">
              When checked, students can register and immediately claim their pass and unlock materials.
            </p>
          </div>

          <div>
            <label className="font-semibold text-text-dim block mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text resize-none focus:outline-none focus:border-[var(--accent)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the objectives, prerequisite knowledge, and takeaways..."
            />
          </div>
        </div>

        {/* Media & Artwork */}
        <div className="space-y-3">
          <h4 className="font-bold text-text flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent)]" />
            Media & Artwork
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-dim block mb-1">Poster / Banner Image URL</label>
              <Input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div>
              <label className="font-semibold text-text-dim block mb-1">Custom Thumbnail URL</label>
              <Input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Square image preview..."
              />
            </div>
          </div>

          {(posterUrl || thumbnailUrl) && (
            <div className="flex gap-4 p-2 rounded-xl bg-black/[0.02] border border-border/40 items-center">
              {posterUrl && (
                <div className="h-16 w-28 rounded-lg overflow-hidden border border-border/60 bg-black/10 shrink-0">
                  <img src={posterUrl} alt="Poster" className="h-full w-full object-cover" />
                </div>
              )}
              {thumbnailUrl && (
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-border/60 bg-black/10 shrink-0">
                  <img src={thumbnailUrl} alt="Thumbnail" className="h-full w-full object-cover" />
                </div>
              )}
              <span className="text-[11px] text-text-mute">Live preview of workshop artwork</span>
            </div>
          )}
        </div>

        {/* Multi-Day Lessons / Curriculum */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-text flex items-center gap-2">
              <Layers size={14} className="text-[var(--accent)]" />
              Multi-Day Lessons ({lessons.length})
            </h4>
            <Button size="sm" variant="secondary" type="button" onClick={addLesson} className="gap-1.5 text-xs">
              <Plus size={13} /> Add Lesson
            </Button>
          </div>

          <div className="space-y-2.5">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id || idx}
                className="p-3 rounded-xl border border-border/60 bg-surface space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-text-mute uppercase">
                    Session {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLesson(idx)}
                    className="text-text-mute hover:text-red-500 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      placeholder="Lesson title..."
                      value={lesson.title}
                      onChange={(e) => {
                        const copy = [...lessons];
                        copy[idx].title = e.target.value;
                        setLessons(copy);
                      }}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Date (e.g. 14 Oct)"
                      value={lesson.date}
                      onChange={(e) => {
                        const copy = [...lessons];
                        copy[idx].date = e.target.value;
                        setLessons(copy);
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Time (e.g. 7:00 PM)"
                    value={lesson.time}
                    onChange={(e) => {
                      const copy = [...lessons];
                      copy[idx].time = e.target.value;
                      setLessons(copy);
                    }}
                  />
                  <Input
                    placeholder="Location / Platform (e.g. Lab 3 / Meet)"
                    value={lesson.location}
                    onChange={(e) => {
                      const copy = [...lessons];
                      copy[idx].location = e.target.value;
                      setLessons(copy);
                    }}
                  />
                </div>
              </div>
            ))}
            {lessons.length === 0 && (
              <div className="text-center py-4 border border-dashed border-border rounded-xl text-text-mute text-xs">
                No lessons added yet. Click &quot;Add Lesson&quot; to outline curriculum.
              </div>
            )}
          </div>
        </div>

        {/* Facilitators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-text">Facilitators & Instructors</h4>
            <Button size="sm" variant="secondary" type="button" onClick={addFacilitator} className="gap-1.5 text-xs">
              <Plus size={13} /> Add Facilitator
            </Button>
          </div>

          <div className="space-y-2">
            {facilitators.map((fac, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Full name..."
                  value={fac.name}
                  onChange={(e) => {
                    const copy = [...facilitators];
                    copy[idx].name = e.target.value;
                    setFacilitators(copy);
                  }}
                />
                <Input
                  className="w-40"
                  placeholder="Role (e.g. Lead Mentor)"
                  value={fac.role}
                  onChange={(e) => {
                    const copy = [...facilitators];
                    copy[idx].role = e.target.value;
                    setFacilitators(copy);
                  }}
                />
                {facilitators.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFacilitator(idx)}
                    className="p-2 text-text-mute hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gated Resources */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-text">Exclusive Gated Resources</h4>
              <p className="text-[11px] text-text-mute">
                Locked materials visible only after students register
              </p>
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={addResource} className="gap-1.5 text-xs">
              <Plus size={13} /> Add Resource
            </Button>
          </div>

          <div className="space-y-2">
            {resources.map((res, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Title (e.g. Slide Deck / Starter Code)"
                  value={res.title}
                  onChange={(e) => {
                    const copy = [...resources];
                    copy[idx].title = e.target.value;
                    setResources(copy);
                  }}
                />
                <Input
                  className="flex-1"
                  placeholder="URL (https://...)"
                  value={res.url}
                  onChange={(e) => {
                    const copy = [...resources];
                    copy[idx].url = e.target.value;
                    setResources(copy);
                  }}
                />
                <select
                  className="h-9 rounded-xl border border-border bg-bg px-2.5 text-xs text-text"
                  value={res.type}
                  onChange={(e) => {
                    const copy = [...resources];
                    copy[idx].type = e.target.value;
                    setResources(copy);
                  }}
                >
                  <option value="Slides">Slides</option>
                  <option value="Code">GitHub / Code</option>
                  <option value="Notes">Notes / Doc</option>
                  <option value="Recording">Recording</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeResource(idx)}
                  className="p-2 text-text-mute hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {resources.length === 0 && (
              <div className="text-center py-4 border border-dashed border-border rounded-xl text-text-mute text-xs">
                No resources added yet. Click &quot;Add Resource&quot; to include slides or GitHub links.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="orange" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : initialLab ? "Save Changes" : "Create Peer Lab"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

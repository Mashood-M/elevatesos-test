"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast, useStore } from "@/context/store-context";
import { finalizeSlug, formatSlugInput } from "@/lib/slug";
import { genUuid } from "@/lib/uuid";
import {
  DatePickerInput,
  TimePickerInput,
  getTodayDateKey,
  formatDisplayDate,
  parseToDateKey,
  addDaysToDateKey,
} from "@/components/domain/date-time-pickers";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";

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

type DialogTab = "overview" | "sessions" | "mentors";

export function PeerLabManagerDialog({
  open,
  onClose,
  onSuccess,
  initialLab,
  isHqUser,
  defaultChapterId = null,
}: PeerLabManagerDialogProps) {
  const { store } = useStore();
  const [activeTab, setActiveTab] = useState<DialogTab>("overview");
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [track, setTrack] = useState("Web Development");
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
      setTrack(initialLab.track || "Web Development");
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
      const today = getTodayDateKey();
      const defaultDate = formatDisplayDate(addDaysToDateKey(today, 3));
      setTitle("");
      setSlug("");
      setTrack("Web Development");
      setStatus("Upcoming");
      setApplicationsOpen(true);
      setDescription("");
      setChapterId(defaultChapterId ? defaultChapterId : (isHqUser ? null : (defaultChapterId ?? null)));
      setPosterUrl("");
      setThumbnailUrl("");
      setFacilitators([{ name: "", role: "Lead Facilitator" }]);
      setLessons([
        {
          id: genUuid(),
          slug: "session-1",
          title: "Session 1: Getting Started",
          date: defaultDate,
          time: "10:00 AM",
          location: "Campus Computer Lab",
          eventSlug: "",
          eventId: null,
        },
      ]);
      setResources([]);
    }
    setActiveTab("overview");
  }, [initialLab, open, isHqUser, defaultChapterId]);

  // Facilitator helpers
  const addFacilitator = () => {
    setFacilitators((prev) => [...prev, { name: "", role: "Mentor" }]);
  };

  const updateFacilitator = (idx: number, patch: Partial<Facilitator>) => {
    setFacilitators((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  };

  const removeFacilitator = (idx: number) => {
    setFacilitators((prev) => prev.filter((_, i) => i !== idx));
  };

  // Lesson helpers
  const addLesson = () => {
    const today = getTodayDateKey();
    let nextDate = formatDisplayDate(today);
    let nextTime = "10:00 AM";
    let nextLocation = "Campus Computer Lab";

    if (lessons.length > 0) {
      const last = lessons[lessons.length - 1];
      const parsedLastDate = parseToDateKey(last.date) || today;
      nextDate = formatDisplayDate(addDaysToDateKey(parsedLastDate, 7));
      nextTime = last.time || "10:00 AM";
      nextLocation = last.location || "Campus Computer Lab";
    }

    setLessons((prev) => [
      ...prev,
      {
        id: genUuid(),
        slug: `session-${prev.length + 1}`,
        title: `Session ${prev.length + 1}: Topic`,
        date: nextDate,
        time: nextTime,
        location: nextLocation,
        eventSlug: "",
        eventId: null,
      },
    ]);
  };

  const updateLesson = (idx: number, patch: Partial<LessonPhase>) => {
    setLessons((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  };

  const removeLesson = (idx: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  // Resource helpers
  const addResource = () => {
    setResources((prev) => [
      ...prev,
      { title: "", url: "", type: "Doc", isGated: true },
    ]);
  };

  const updateResource = (idx: number, patch: Partial<LabResource>) => {
    setResources((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const removeResource = (idx: number) => {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setActiveTab("overview");
      showToast("Please enter a Peer Lab title", "error");
      return;
    }
    const cleanSlug = finalizeSlug(slug || cleanTitle);
    if (!cleanSlug) {
      setActiveTab("overview");
      showToast("Please enter a valid URL slug", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: initialLab?.id || genUuid(),
        title: cleanTitle,
        slug: cleanSlug,
        subtitle: initialLab?.subtitle || "",
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
      title={initialLab ? "Edit Peer Lab" : "New Peer Lab"}
      description="Create or manage multi-session peer learning tracks with dates, venues, and mentors."
      className="max-w-2xl h-[640px] max-h-[90vh] overflow-hidden flex flex-col"
      contentClassName="p-0 flex flex-col flex-1 min-h-0 overflow-hidden"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-text-mute font-medium hidden sm:block">
            {lessons.length} session{lessons.length !== 1 ? "s" : ""} · {facilitators.filter((f) => f.name.trim()).length} mentor{facilitators.filter((f) => f.name.trim()).length !== 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="orange"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-bold gap-1.5 px-4 shadow-sm"
            >
              {saving ? "Saving..." : initialLab ? "Save Changes" : "Create Peer Lab"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {/* Tab Navigation - Positioned directly under dialog header */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-border/70 bg-bg/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <FileText size={13} />
            <span>1. Overview &amp; Poster</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "sessions"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <Calendar size={13} />
            <span>2. Sessions</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] font-bold">
              {lessons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "mentors"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <Users size={13} />
            <span>3. Mentors &amp; Links</span>
            {facilitators.filter((f) => f.name.trim()).length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 font-bold">
                {facilitators.filter((f) => f.name.trim()).length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body - Single Smooth Scroll Container */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin space-y-4">
          {/* TAB 1: OVERVIEW & POSTER */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-xs text-text block mb-1">
                  Workshop Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(val);
                    if (!initialLab) {
                      setSlug(finalizeSlug(val));
                    }
                  }}
                  placeholder="e.g. Fullstack React & Node Bootcamp"
                  className="font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Slug (URL Key) *
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(formatSlugInput(e.target.value))}
                    onBlur={() => setSlug(finalizeSlug(slug))}
                    placeholder="fullstack-react-bootcamp"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Status
                  </label>
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text font-medium outline-none focus:border-[var(--accent)]"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "Draft" | "Active" | "Completed" | "Upcoming")
                    }
                  >
                    <option value="Upcoming">Upcoming (Scheduled)</option>
                    <option value="Active">Active (Live Cohort)</option>
                    <option value="Completed">Completed</option>
                    <option value="Draft">Draft (Hidden from students)</option>
                  </select>
                </div>
              </div>

              {/* Domain / Track */}
              <div>
                <label className="font-semibold text-xs text-text block mb-1">
                  Domain / Track
                </label>
                <Input
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder="e.g. Web Development, AI & Machine Learning, Robotics"
                />
              </div>

              {/* Campus Host Dropdown (Only for HQ users) */}
              {isHqUser && (
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Campus Host
                  </label>
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text font-medium outline-none focus:border-[var(--accent)]"
                    value={chapterId || ""}
                    onChange={(e) => setChapterId(e.target.value ? e.target.value : null)}
                  >
                    <option value="">🌐 Open to All Chapters (Network-Wide)</option>
                    {store.chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-xs text-text block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none outline-none focus:border-[var(--accent)] placeholder:text-text-mute"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of what students will learn and build during this track..."
                />
              </div>

              {/* Poster Image Section */}
              <div className="pt-2 border-t border-border/60">
                <label className="font-semibold text-xs text-text flex items-center gap-1.5 mb-1">
                  <ImageIcon size={14} className="text-[var(--accent)]" />
                  Poster Image URL (Optional)
                </label>
                <Input
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://... image link or leave blank"
                />

                {posterUrl && (
                  <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border border-border bg-bg-panel">
                    <img
                      src={posterUrl}
                      alt="Poster Preview"
                      className="h-16 w-28 rounded-lg object-cover border border-border shadow-xs shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-text truncate">{title || "Peer Lab Poster"}</p>
                      <button
                        type="button"
                        onClick={() => setPosterUrl("")}
                        className="text-[11px] text-red-500 hover:underline mt-0.5 cursor-pointer"
                      >
                        Remove poster
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applicationsOpen}
                    onChange={(e) => setApplicationsOpen(e.target.checked)}
                    className="rounded border-border text-[var(--accent)] focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text">
                    Accept student registrations for this track
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: SESSIONS & SCHEDULE */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                    <Calendar size={14} className="text-[var(--accent)]" />
                    Curriculum Sessions ({lessons.length})
                  </h4>
                  <p className="text-[11px] text-text-mute">
                    Schedule session dates, times, and venues
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addLesson}
                  className="gap-1 text-xs h-8"
                >
                  <Plus size={13} />
                  <span>Add Session</span>
                </Button>
              </div>

              {lessons.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border text-text-mute space-y-2">
                  <Calendar size={24} className="mx-auto text-text-dim" />
                  <p className="text-xs font-medium">No sessions scheduled yet</p>
                  <Button
                    type="button"
                    variant="orange"
                    size="sm"
                    onClick={addLesson}
                    className="gap-1 text-xs"
                  >
                    <Plus size={13} />
                    <span>Add First Session</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, idx) => {
                    const isOnline =
                      lesson.location?.toLowerCase().includes("online") ||
                      lesson.location?.toLowerCase().includes("meet") ||
                      lesson.location?.toLowerCase().includes("zoom") ||
                      lesson.location?.toLowerCase().includes("discord");

                    return (
                      <div
                        key={lesson.id}
                        className="p-3.5 rounded-2xl border border-border bg-bg-panel space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <span className="font-bold text-xs text-text flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            Session {idx + 1}
                          </span>

                          {lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLesson(idx)}
                              className="text-text-dim hover:text-red-500 p-1 rounded-md transition cursor-pointer"
                              title="Remove session"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Title */}
                        <div>
                          <label className="text-[11px] font-semibold text-text-dim block mb-1">
                            Session Title
                          </label>
                          <Input
                            value={lesson.title}
                            onChange={(e) => updateLesson(idx, { title: e.target.value })}
                            placeholder={`e.g. Phase ${idx + 1}: Hands-on Setup`}
                          />
                        </div>

                        {/* Redesigned Date & Time Area */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-bg/50 border border-border/60">
                          <div>
                            <label className="text-[11px] font-semibold text-text flex items-center gap-1.5 mb-1.5">
                              <Calendar size={13} className="text-[var(--accent)]" />
                              <span>Date</span>
                            </label>
                            <DatePickerInput
                              value={lesson.date}
                              onChange={(d) => updateLesson(idx, { date: d })}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-text flex items-center gap-1.5 mb-1.5">
                              <Clock size={13} className="text-[var(--accent)]" />
                              <span>Time</span>
                            </label>
                            <TimePickerInput
                              value={lesson.time}
                              onChange={(t) => updateLesson(idx, { time: t })}
                            />
                          </div>
                        </div>

                        {/* Venue & Mode Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-semibold text-text flex items-center gap-1.5">
                              <MapPin size={13} className="text-[var(--accent)]" />
                              <span>Venue / Location</span>
                            </label>

                            {/* Offline / Online selector right near it */}
                            <div className="inline-flex rounded-lg border border-border p-0.5 bg-bg text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOnline) {
                                    updateLesson(idx, { location: "Campus Computer Lab" });
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                                  !isOnline
                                    ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                                    : "text-text-dim hover:text-text"
                                }`}
                              >
                                Offline
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isOnline) {
                                    updateLesson(idx, { location: "Online (Google Meet)" });
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                                  isOnline
                                    ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                                    : "text-text-dim hover:text-text"
                                }`}
                              >
                                Online
                              </button>
                            </div>
                          </div>

                          <Input
                            value={lesson.location}
                            onChange={(e) => updateLesson(idx, { location: e.target.value })}
                            placeholder={
                              isOnline
                                ? "Enter Google Meet, Zoom, or Discord link"
                                : "Campus Computer Lab, Auditorium, or Hall 3"
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {lessons.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addLesson}
                  className="w-full gap-1.5 text-xs h-9 border-dashed"
                >
                  <Plus size={13} />
                  <span>Add Another Session</span>
                </Button>
              )}
            </div>
          )}

          {/* TAB 3: MENTORS & LINKS */}
          {activeTab === "mentors" && (
            <div className="space-y-5">
              {/* Mentors Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                      <Users size={14} className="text-[var(--accent)]" />
                      Mentors &amp; Facilitators
                    </h4>
                    <p className="text-[11px] text-text-mute">
                      Student leads or mentors guiding this workshop
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addFacilitator}
                    className="gap-1 text-xs h-8"
                  >
                    <Plus size={13} />
                    <span>Add Mentor</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {facilitators.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-bg-panel"
                    >
                      <Input
                        value={f.name}
                        onChange={(e) => updateFacilitator(idx, { name: e.target.value })}
                        placeholder="Mentor Name"
                        className="flex-1"
                      />
                      <Input
                        value={f.role}
                        onChange={(e) => updateFacilitator(idx, { role: e.target.value })}
                        placeholder="Role (e.g. Lead Facilitator)"
                        className="w-40 sm:w-48"
                      />
                      {facilitators.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFacilitator(idx)}
                          className="text-text-dim hover:text-red-500 p-1.5 rounded-md transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Materials & Links */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                      <LinkIcon size={14} className="text-[var(--accent)]" />
                      Study Materials &amp; Links (Optional)
                    </h4>
                    <p className="text-[11px] text-text-mute">
                      GitHub repos, slide decks, or documentation for enrolled students
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addResource}
                    className="gap-1 text-xs h-8"
                  >
                    <Plus size={13} />
                    <span>Add Link</span>
                  </Button>
                </div>

                {resources.length === 0 ? (
                  <p className="text-[11px] text-text-dim italic">
                    No learning materials attached yet. You can add slides or repos later anytime.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {resources.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-bg-panel"
                      >
                        <Input
                          value={r.title}
                          onChange={(e) => updateResource(idx, { title: e.target.value })}
                          placeholder="e.g. GitHub Repository"
                          className="w-44"
                        />
                        <Input
                          value={r.url}
                          onChange={(e) => updateResource(idx, { url: e.target.value })}
                          placeholder="https://github.com/..."
                          className="flex-1 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => removeResource(idx)}
                          className="text-text-dim hover:text-red-500 p-1.5 rounded-md transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

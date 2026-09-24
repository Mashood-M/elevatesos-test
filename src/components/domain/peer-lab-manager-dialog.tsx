"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { showToast, useStore } from "@/context/store-context";
import { finalizeSlug, formatSlugInput } from "@/lib/slug";
import { genUuid } from "@/lib/uuid";
import {
  DatePickerInput,
  TimePickerInput,
  getTodayDateKey,
  formatDisplayDate,
  formatDisplayTime,
  parseToDateKey,
  parseToTimeKey,
  addDaysToDateKey,
} from "@/components/domain/date-time-pickers";
import {
  Plus,
  Trash2,
  Globe,
  Shield,
  Sparkles,
  BookOpen,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Copy,
  Zap,
  Image as ImageIcon,
  Check,
  Video,
  Building,
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

const COMMON_TIME_PRESETS = [
  { label: "10:00 AM", key: "10:00", tag: "Morning" },
  { label: "02:00 PM", key: "14:00", tag: "Afternoon" },
  { label: "04:30 PM", key: "16:30", tag: "Post-Class" },
  { label: "06:00 PM", key: "18:00", tag: "Evening" },
  { label: "07:30 PM", key: "19:30", tag: "Night Lab" },
];

const COMMON_LOCATIONS = [
  { label: "Campus Lab", value: "Campus Computer Lab", icon: Building },
  { label: "Google Meet", value: "Online (Google Meet)", icon: Video },
  { label: "Discord Stage", value: "Discord Community Stage", icon: Video },
  { label: "Auditorium", value: "Campus Auditorium", icon: Building },
  { label: "Zoom", value: "Online (Zoom)", icon: Video },
];

const PRESET_ARTWORK = [
  {
    name: "AI & Machine Learning",
    poster: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Systems & Rust",
    poster: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Web3 & Distributed Systems",
    poster: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "UI/UX & Product Design",
    poster: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=300&q=80",
  },
];

type DialogTab = "overview" | "curriculum" | "media" | "mentors";

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
  const [activeTab, setActiveTab] = useState<DialogTab>("overview");
  const [saving, setSaving] = useState(false);

  // Form State
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
      const today = getTodayDateKey();
      const defaultDate = formatDisplayDate(addDaysToDateKey(today, 3));
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
      setLessons([
        {
          id: genUuid(),
          slug: "session-1",
          title: "Session 1: Foundations & Setup",
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

  // Facilitator Helpers
  const addFacilitator = () => {
    setFacilitators((prev) => [...prev, { name: "", role: "Mentor" }]);
  };

  const removeFacilitator = (idx: number) => {
    setFacilitators((prev) => prev.filter((_, i) => i !== idx));
  };

  // Lesson Helpers
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

  const duplicateLesson = (idx: number) => {
    const src = lessons[idx];
    const srcDateKey = parseToDateKey(src.date) || getTodayDateKey();
    const newDate = formatDisplayDate(addDaysToDateKey(srcDateKey, 7));

    const cloned: LessonPhase = {
      ...src,
      id: genUuid(),
      slug: `session-${lessons.length + 1}`,
      title: `${src.title} (Part 2)`,
      date: newDate,
    };

    const next = [...lessons];
    next.splice(idx + 1, 0, cloned);
    setLessons(next);
    showToast("Session duplicated (+7 days)", "info");
  };

  const moveLesson = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === lessons.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const next = [...lessons];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setLessons(next);
  };

  const removeLesson = (idx: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick Scaffold Templates
  const applySprintTemplate = () => {
    const today = getTodayDateKey();
    const d1 = addDaysToDateKey(today, 2);
    const d2 = addDaysToDateKey(today, 3);
    const d3 = addDaysToDateKey(today, 4);

    setLessons([
      {
        id: genUuid(),
        slug: "day-1-foundations",
        title: "Day 1: Foundations & Architecture",
        date: formatDisplayDate(d1),
        time: "07:00 PM",
        location: "Online (Google Meet)",
        eventSlug: "",
        eventId: null,
      },
      {
        id: genUuid(),
        slug: "day-2-deep-dive",
        title: "Day 2: Deep Dive & Live Implementation",
        date: formatDisplayDate(d2),
        time: "07:00 PM",
        location: "Online (Google Meet)",
        eventSlug: "",
        eventId: null,
      },
      {
        id: genUuid(),
        slug: "day-3-ship-demo",
        title: "Day 3: Building & Demo Day",
        date: formatDisplayDate(d3),
        time: "07:00 PM",
        location: "Online (Google Meet)",
        eventSlug: "",
        eventId: null,
      },
    ]);
    showToast("Generated 3-Day Evening Sprint schedule!", "success");
  };

  const applyBootcampTemplate = () => {
    const today = getTodayDateKey();
    const parts = today.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    // Find next Saturday
    const daysUntilSaturday = (6 - d.getDay() + 7) % 7 || 7;
    const sat1 = addDaysToDateKey(today, daysUntilSaturday);
    const sat2 = addDaysToDateKey(sat1, 7);
    const sat3 = addDaysToDateKey(sat2, 7);
    const sat4 = addDaysToDateKey(sat3, 7);

    setLessons([
      {
        id: genUuid(),
        slug: "week-1-setup",
        title: "Week 1: Toolchain & Core Concepts",
        date: formatDisplayDate(sat1),
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
        eventId: null,
      },
      {
        id: genUuid(),
        slug: "week-2-intermediate",
        title: "Week 2: Advanced Design Patterns",
        date: formatDisplayDate(sat2),
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
        eventId: null,
      },
      {
        id: genUuid(),
        slug: "week-3-production",
        title: "Week 3: Production Engineering & Testing",
        date: formatDisplayDate(sat3),
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
        eventId: null,
      },
      {
        id: genUuid(),
        slug: "week-4-capstone",
        title: "Week 4: Capstone Showcase & Certifications",
        date: formatDisplayDate(sat4),
        time: "10:00 AM",
        location: "Campus Computer Lab",
        eventSlug: "",
        eventId: null,
      },
    ]);
    showToast("Generated 4-Week Weekend Bootcamp schedule!", "success");
  };

  // Resource Helpers
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
      setActiveTab("overview");
      showToast("Peer Lab Title is required", "error");
      return;
    }
    const cleanSlug = finalizeSlug(slug || cleanTitle);
    if (!cleanSlug) {
      setActiveTab("overview");
      showToast("Please provide a valid URL slug", "error");
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
      title={initialLab ? "Edit Peer Lab Workshop" : "Create Peer Lab Workshop"}
      description="Design multi-day student cohort learning programs with structured syllabi, date & time selection, and gated resources."
      className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Scope Banner & Chapter Scoping */}
        <div className="px-5 pt-3 pb-2 shrink-0 border-b border-border/60 bg-bg-panel flex items-center justify-between gap-3">
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
              <p className="font-semibold text-xs text-text">
                {isHqUser && !chapterId
                  ? "🌐 Network-Wide Peer Lab (Open to All Chapters)"
                  : `🏛️ Campus Lab: ${defaultChapterName || store.chapters.find((c) => c.id === chapterId)?.name || "Campus Chapter"}`}
              </p>
              <p className="text-[10px] text-text-mute">
                {isHqUser && !chapterId
                  ? "Visible to enrolled student innovators across all campus chapters"
                  : "Assigned strictly to your college chapter campus"}
              </p>
            </div>
          </div>

          {isHqUser && (
            <select
              className="h-8 rounded-xl border border-border bg-bg px-2.5 text-[11px] text-text font-medium outline-none focus:border-[var(--accent)]"
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

        {/* Tab Navigation Rail */}
        <div className="flex items-center gap-1.5 px-5 pt-2 pb-1 border-b border-border/70 bg-bg/40 shrink-0 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <BookOpen size={13} />
            <span>Overview &amp; Scope</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("curriculum")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "curriculum"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <Layers size={13} />
            <span>Curriculum &amp; Schedule</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] font-bold">
              {lessons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "media"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <Sparkles size={13} />
            <span>Media &amp; Artwork</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "mentors"
                ? "bg-bg-panel text-[var(--accent)] shadow-xs border border-border"
                : "text-text-dim hover:text-text hover:bg-bg-panel/50"
            }`}
          >
            <Users size={13} />
            <span>Mentors &amp; Materials</span>
            {resources.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 font-bold">
                {resources.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin space-y-4">
          {/* TAB 1: OVERVIEW & SCOPE */}
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
                  placeholder="e.g. Distributed Systems & Rust Bootcamp"
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
                    placeholder="rust-bootcamp"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-text-mute mt-0.5">
                    Will resolve at /peer-labs/{slug || "slug"}
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Category / Track
                  </label>
                  <Input
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    placeholder="e.g. Systems Engineering, AI/ML, Web3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Subtitle / Catchphrase
                  </label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. 4-Week Cohort with Hands-on Capstone"
                  />
                </div>
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Cohort Publishing Status
                  </label>
                  <select
                    className="h-9 w-full rounded-xl border border-border bg-bg px-3 text-xs text-text font-medium outline-none focus:border-[var(--accent)]"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "Draft" | "Active" | "Completed" | "Upcoming")}
                  >
                    <option value="Upcoming">Upcoming (Published — Ready for students to view)</option>
                    <option value="Draft">Draft (In Progress — Hidden from students)</option>
                    <option value="Active">Active (Ongoing sessions)</option>
                    <option value="Completed">Completed (Archived)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-bg/50 space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applicationsOpen}
                    onChange={(e) => setApplicationsOpen(e.target.checked)}
                    className="rounded text-[var(--accent)] focus:ring-[var(--accent)] h-4 w-4"
                  />
                  <span className="font-semibold text-text text-xs">
                    Accept Student Applications &amp; Registrations
                  </span>
                </label>
                <p className="text-[11px] text-text-mute ml-6">
                  When checked, verified student members can enroll, receive tickets, and unlock syllabus downloads.
                </p>
              </div>

              <div>
                <label className="font-semibold text-xs text-text block mb-1">
                  Description &amp; Objectives
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text resize-none focus:outline-none focus:border-[var(--accent)]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the prerequisites, curriculum goals, practical deliverables, and what students will ship..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab("curriculum")}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <span>Next: Schedule Curriculum</span>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM & SCHEDULE */}
          {activeTab === "curriculum" && (
            <div className="space-y-4">
              {/* Header with Quick Presets */}
              <div className="p-3.5 rounded-2xl border border-border bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                    <Calendar size={14} className="text-[var(--accent)]" />
                    Interactive Schedule &amp; Lesson Sessions
                  </h4>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Pick dates from the calendar and choose times with one click instead of typing.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={applySprintTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--accent)]/30 bg-bg text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors shadow-2xs"
                    title="Auto-fill 3 consecutive days at 7:00 PM"
                  >
                    <Zap size={11} /> 3-Day Sprint
                  </button>
                  <button
                    type="button"
                    onClick={applyBootcampTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-bg text-[11px] font-semibold text-text hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-2xs"
                    title="Auto-fill 4 consecutive Saturdays at 10:00 AM"
                  >
                    <Zap size={11} /> 4-Week Track
                  </button>
                  <Button
                    size="sm"
                    variant="orange"
                    type="button"
                    onClick={addLesson}
                    className="gap-1 text-xs py-1"
                  >
                    <Plus size={13} /> Add Session
                  </Button>
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-3">
                {lessons.map((lesson, idx) => {
                  return (
                    <div
                      key={lesson.id || idx}
                      className="rounded-2xl border border-border bg-bg-panel p-4 space-y-3.5 shadow-xs transition-all hover:border-border-strong"
                    >
                      {/* Session Top Bar: Badge, Reorder, Delete */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 items-center px-2.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-mono text-[10px] font-bold uppercase tracking-wider">
                            Session {idx + 1}
                          </span>
                          <span className="text-[11px] text-text-mute font-medium hidden sm:inline">
                            {lesson.date || "Date not set"} • {lesson.time || "Time not set"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveLesson(idx, "up")}
                            disabled={idx === 0}
                            title="Move up"
                            className="p-1 rounded text-text-mute hover:text-text hover:bg-bg-hover disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(idx, "down")}
                            disabled={idx === lessons.length - 1}
                            title="Move down"
                            className="p-1 rounded text-text-mute hover:text-text hover:bg-bg-hover disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateLesson(idx)}
                            title="Duplicate session (+7 days)"
                            className="p-1 rounded text-text-mute hover:text-[var(--accent)] hover:bg-bg-hover"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLesson(idx)}
                            title="Delete session"
                            className="p-1 rounded text-text-mute hover:text-red-500 hover:bg-bg-hover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Session Title */}
                      <div>
                        <label className="font-semibold text-[11px] text-text-dim block mb-1">
                          Session Title &amp; Topic *
                        </label>
                        <Input
                          placeholder="e.g. Memory Safety & Concurrency with Rayon"
                          value={lesson.title}
                          onChange={(e) => {
                            const copy = [...lessons];
                            copy[idx].title = e.target.value;
                            setLessons(copy);
                          }}
                          className="font-medium text-xs"
                        />
                      </div>

                      {/* Date & Time Selectors Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Interactive Date Picker */}
                        <div className="space-y-1.5">
                          <label className="font-semibold text-[11px] text-text-dim flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-[var(--accent)]" />
                              Session Date *
                            </span>
                            {lesson.date && (
                              <span className="text-[10px] text-emerald-600 font-mono">
                                Selected
                              </span>
                            )}
                          </label>
                          <DatePickerInput
                            value={lesson.date}
                            min={getTodayDateKey()}
                            placeholder="Select session date..."
                            onChange={(_key, displayDate) => {
                              const copy = [...lessons];
                              copy[idx].date = displayDate;
                              setLessons(copy);
                            }}
                          />
                        </div>

                        {/* Interactive Time Picker & Quick Presets */}
                        <div className="space-y-1.5">
                          <label className="font-semibold text-[11px] text-text-dim flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} className="text-[var(--accent)]" />
                              Start Time *
                            </span>
                            <span className="text-[10px] text-text-mute">
                              Click to pick or use pills
                            </span>
                          </label>
                          <TimePickerInput
                            value={lesson.time || "10:00 AM"}
                            placeholder="Select session time..."
                            onChange={(_key, displayTime) => {
                              const copy = [...lessons];
                              copy[idx].time = displayTime;
                              setLessons(copy);
                            }}
                          />

                          {/* Quick Time Preset Buttons */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {COMMON_TIME_PRESETS.map((slot) => {
                              const isSelected = lesson.time === slot.label;
                              return (
                                <button
                                  key={slot.key}
                                  type="button"
                                  onClick={() => {
                                    const copy = [...lessons];
                                    copy[idx].time = slot.label;
                                    setLessons(copy);
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                    isSelected
                                      ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs"
                                      : "bg-bg text-text-dim border-border hover:border-[var(--accent)] hover:text-text"
                                  }`}
                                >
                                  {slot.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Location & Platform */}
                      <div className="space-y-1.5 pt-1">
                        <label className="font-semibold text-[11px] text-text-dim flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-[var(--accent)]" />
                            Location / Meeting Platform
                          </span>
                        </label>

                        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                          <Input
                            placeholder="e.g. Campus Computer Lab 3 or https://meet.google.com/xyz"
                            value={lesson.location}
                            onChange={(e) => {
                              const copy = [...lessons];
                              copy[idx].location = e.target.value;
                              setLessons(copy);
                            }}
                            className="flex-1 text-xs"
                          />
                        </div>

                        {/* Quick Location Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {COMMON_LOCATIONS.map((loc) => {
                            const isSelected = lesson.location === loc.value;
                            return (
                              <button
                                key={loc.label}
                                type="button"
                                onClick={() => {
                                  const copy = [...lessons];
                                  copy[idx].location = loc.value;
                                  setLessons(copy);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                  isSelected
                                    ? "bg-[var(--charcoal-900)] text-white border-[var(--charcoal-900)]"
                                    : "bg-bg text-text-dim border-border hover:border-text-dim hover:text-text"
                                }`}
                              >
                                <loc.icon size={10} />
                                <span>{loc.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {lessons.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl p-6 space-y-3 bg-bg/30">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-text">No curriculum sessions added yet</h4>
                      <p className="text-[11px] text-text-mute mt-0.5 max-w-sm mx-auto">
                        Add structured sessions across days with interactive date &amp; time selectors or use our quick presets.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="orange" type="button" onClick={addLesson} className="gap-1.5 text-xs">
                        <Plus size={13} /> Add First Session
                      </Button>
                      <Button size="sm" variant="secondary" type="button" onClick={applyBootcampTemplate} className="gap-1.5 text-xs">
                        <Zap size={13} /> 4-Week Preset
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLesson}
                  className="gap-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10"
                >
                  <Plus size={13} /> Add Another Session
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab("media")}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <span>Next: Artwork</span>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & ARTWORK */}
          {activeTab === "media" && (
            <div className="space-y-4">
              {/* Presets Gallery */}
              <div className="p-3.5 rounded-2xl border border-border bg-bg/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[var(--accent)]" />
                    Quick Artwork Presets (1-Click)
                  </h4>
                  <span className="text-[10px] text-text-mute">Curated high-res covers</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_ARTWORK.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setPosterUrl(item.poster);
                        setThumbnailUrl(item.thumb);
                        showToast(`Applied ${item.name} artwork!`, "info");
                      }}
                      className="group relative rounded-xl overflow-hidden border border-border aspect-video text-left hover:border-[var(--accent)] hover:shadow-sm transition-all"
                    >
                      <img
                        src={item.thumb}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white leading-tight">
                          {item.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Poster / Banner Image URL
                  </label>
                  <Input
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or cloud URL"
                  />
                  <p className="text-[10px] text-text-mute mt-0.5">
                    Recommended 16:9 banner displayed in directory &amp; detail views
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-xs text-text block mb-1">
                    Square Thumbnail URL
                  </label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... square icon preview"
                  />
                  <p className="text-[10px] text-text-mute mt-0.5">
                    Optional 1:1 image used in mobile and list cards
                  </p>
                </div>
              </div>

              {/* Live Preview Panel */}
              {(posterUrl || thumbnailUrl) && (
                <div className="p-3.5 rounded-2xl border border-border bg-bg-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-text flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-[var(--accent)]" />
                      Live Artwork Card Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => { setPosterUrl(""); setThumbnailUrl(""); }}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Clear images
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {posterUrl && (
                      <div className="w-full sm:w-64 h-36 rounded-xl overflow-hidden border border-border shadow-xs shrink-0 bg-black/5">
                        <img
                          src={posterUrl}
                          alt="Poster Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    {thumbnailUrl && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-xs shrink-0 bg-black/5">
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-text">{title || "Untitled Workshop"}</p>
                      <p className="text-text-mute text-[11px]">{subtitle || "Student Cohort Series"}</p>
                      <Badge tone="cyan">{track || "Track"}</Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab("mentors")}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <span>Next: Mentors &amp; Materials</span>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: MENTORS & MATERIALS */}
          {activeTab === "mentors" && (
            <div className="space-y-5">
              {/* Facilitators Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                      <Users size={14} className="text-[var(--accent)]" />
                      Facilitators, Mentors &amp; Instructors
                    </h4>
                    <p className="text-[11px] text-text-dim">
                      Appears on the workshop card and student syllabus.
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" type="button" onClick={addFacilitator} className="gap-1 text-xs">
                    <Plus size={12} /> Add Mentor
                  </Button>
                </div>

                <div className="space-y-2">
                  {facilitators.map((fac, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-bg-panel"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                        {fac.name ? fac.name.charAt(0).toUpperCase() : (idx + 1)}
                      </div>
                      <Input
                        className="flex-1 text-xs"
                        placeholder="Mentor Full Name (e.g. Sarah Chen)"
                        value={fac.name}
                        onChange={(e) => {
                          const copy = [...facilitators];
                          copy[idx].name = e.target.value;
                          setFacilitators(copy);
                        }}
                      />
                      <Input
                        className="w-44 text-xs"
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
                          className="p-1.5 text-text-mute hover:text-red-500 rounded hover:bg-bg-hover"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gated Resources Section */}
              <div className="space-y-3 pt-3 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-text flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-600" />
                      Exclusive Gated Resources
                    </h4>
                    <p className="text-[11px] text-text-dim">
                      Slide decks, GitHub repos, cheatsheets, and drive links unlocked only after registration.
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" type="button" onClick={addResource} className="gap-1 text-xs">
                    <Plus size={12} /> Add Resource
                  </Button>
                </div>

                <div className="space-y-2">
                  {resources.map((res, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl border border-border bg-bg-panel"
                    >
                      <Input
                        className="flex-1 text-xs"
                        placeholder="Title (e.g. Workshop Deck & Notes)"
                        value={res.title}
                        onChange={(e) => {
                          const copy = [...resources];
                          copy[idx].title = e.target.value;
                          setResources(copy);
                        }}
                      />
                      <Input
                        className="flex-1 text-xs font-mono"
                        placeholder="URL (https://github.com/...)"
                        value={res.url}
                        onChange={(e) => {
                          const copy = [...resources];
                          copy[idx].url = e.target.value;
                          setResources(copy);
                        }}
                      />
                      <select
                        className="h-9 rounded-xl border border-border bg-bg px-2.5 text-xs text-text font-medium outline-none focus:border-[var(--accent)]"
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
                        <option value="Cheatsheet">Cheatsheet</option>
                        <option value="Recording">Recording</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeResource(idx)}
                        className="p-2 text-text-mute hover:text-red-500 rounded hover:bg-bg-hover self-end sm:self-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {resources.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-border rounded-xl text-text-mute text-xs">
                      No resources attached yet. Click &quot;Add Resource&quot; to include slides or GitHub links.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Pinned Bottom Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-bg-panel shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-text-mute">
            <span className="font-semibold text-text">{lessons.length}</span> sessions
            <span>•</span>
            <span className="font-semibold text-text">{facilitators.length}</span> mentors
            <span>•</span>
            <Badge tone={status === "Upcoming" ? "cyan" : status === "Draft" ? "amber" : "green"}>
              {status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="orange"
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 font-bold"
            >
              {saving ? "Saving..." : initialLab ? "Save Changes" : "Publish Peer Lab"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

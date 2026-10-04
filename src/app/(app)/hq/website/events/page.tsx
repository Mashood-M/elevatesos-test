"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/context/store-context";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
  Star,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Laptop,
  FileText,
  Activity,
  MapPin,
  Users,
} from "lucide-react";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import {
  DatePickerInput,
  TimePickerInput,
  getTodayDateKey,
  getCurrentTimeKey,
  parseToDateKey,
  parseToTimeKey,
  formatDisplayDate,
  formatDisplayTime,
  getDefaultUpcomingEventTimes,
} from "@/components/domain/date-time-pickers";
import { DEFAULT_EVENT_CATEGORIES, getAllEventCategories } from "@/lib/events";
import { DeleteEventDialog } from "@/components/domain/delete-event-dialog";

type EventStatus = "Completed" | "Upcoming" | "Ongoing" | "Cancelled";
type EventFormat = "Campus Exclusive" | "Open" | "Online" | "Multi-Campus";
type EventCategory = string;

interface Host {
  name: string;
  role: string;
}
interface Organizer {
  name: string;
}

interface PlatformCaseStudyRef {
  enabled: boolean;
  platformName: string;
  tagline: string;
  caseStudySlug: string;
  liveUrl?: string;
  repoUrl?: string;
  highlightMetric?: string;
  architectureSummary?: string;
}

interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  fullDescription: string;
  format: EventFormat;
  category: EventCategory;
  status: EventStatus;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isoStartDate: string;
  isoEndDate: string;
  venue: string;
  locationName: string;
  organizer: Organizer[];
  hosts: Host[];
  topics: string[];
  attendeesCount: number;
  waitlistCapacity?: number;
  coverImage: string;
  featured: boolean;
  platform?: PlatformCaseStudyRef;
  peerLabSlug?: string;
  peerLabTitle?: string;
  chapterSlug: string;
  chapterName: string;
}

const STATUS_BADGE_STYLE: Record<
  EventStatus,
  { bg: string; text: string; border: string; shadow: string }
> = {
  Completed: {
    bg: "bg-[#f0f4f1]",
    text: "text-[#5f7560]",
    border: "border-[#5f7560]/30",
    shadow: "shadow-[1px_1px_0px_#5f7560]",
  },
  Upcoming: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-300",
    shadow: "shadow-[1px_1px_0px_#0284c7]",
  },
  Ongoing: {
    bg: "bg-[#fef0eb]",
    text: "text-[#f26430]",
    border: "border-[#f26430]/30",
    shadow: "shadow-[1px_1px_0px_#f26430]",
  },
  Cancelled: {
    bg: "bg-neutral-100",
    text: "text-[#71717a]",
    border: "border-neutral-300",
    shadow: "shadow-[1px_1px_0px_#71717a]",
  },
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10.5px] font-bold text-[#2d2d34] uppercase tracking-wider block">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[10px] text-[#71717a]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function TInput({
  value,
  onChange,
  onBlur,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      className={`h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none focus:shadow-[2px_2px_0px_#2d2d34] transition-all ${
        mono ? "font-mono" : ""
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

function TArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      className="w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 py-2 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none focus:shadow-[2px_2px_0px_#2d2d34] transition-all resize-none font-mono"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function StrList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="h-8 flex-1 rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 text-xs text-[#2d2d34] font-mono shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
            placeholder={placeholder}
            value={item}
            onChange={(e) => {
              const n = [...items];
              n[i] = e.target.value;
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-[#71717a] hover:text-red-600 p-1.5 rounded-[4px] border border-[#2d2d34]/20 hover:border-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#2d2d34]/30 bg-white text-[11px] font-mono font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer"
      >
        <Plus size={12} /> Add Tag
      </button>
    </div>
  );
}

function HostList({
  hosts,
  onChange,
}: {
  hosts: Host[];
  onChange: (v: Host[]) => void;
}) {
  return (
    <div className="space-y-2">
      {hosts.map((h, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <input
            className="h-8 flex-1 min-w-[140px] rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
            placeholder="Speaker / Host Name"
            value={h.name}
            onChange={(e) => {
              const n = [...hosts];
              n[i] = { ...n[i], name: e.target.value };
              onChange(n);
            }}
          />
          <input
            className="h-8 flex-1 min-w-[180px] rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
            placeholder="Role / Company / Topic Lead"
            value={h.role}
            onChange={(e) => {
              const n = [...hosts];
              n[i] = { ...n[i], role: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(hosts.filter((_, j) => j !== i))}
            className="text-[#71717a] hover:text-red-600 p-1.5 rounded-[4px] border border-[#2d2d34]/20 hover:border-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...hosts, { name: "", role: "" }])}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#2d2d34]/30 bg-white text-[11px] font-mono font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer"
      >
        <Plus size={12} /> Add Speaker / Host
      </button>
    </div>
  );
}

function OrgList({
  orgs,
  onChange,
}: {
  orgs: Organizer[];
  onChange: (v: Organizer[]) => void;
}) {
  return (
    <div className="space-y-2">
      {orgs.map((o, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="h-8 flex-1 rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
            placeholder="Organizer Name (e.g. ELEVATES HQ or Chapter Lead)"
            value={o.name}
            onChange={(e) => {
              const n = [...orgs];
              n[i] = { name: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(orgs.filter((_, j) => j !== i))}
            className="text-[#71717a] hover:text-red-600 p-1.5 rounded-[4px] border border-[#2d2d34]/20 hover:border-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...orgs, { name: "" }])}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#2d2d34]/30 bg-white text-[11px] font-mono font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer"
      >
        <Plus size={12} /> Add Organizer
      </button>
    </div>
  );
}

function EventEditor({
  event,
  onSave,
  onDelete,
  onClose,
}: {
  event: EventItem;
  onSave: (e: EventItem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const { store, addEventCategory } = useStore();
  const [d, setD] = useState<EventItem>(() => ({
    ...event,
    category: (event.category || "WORKSHOP").toUpperCase(),
  }));
  const u = (patch: Partial<EventItem>) =>
    setD((prev) => ({ ...prev, ...patch }));

  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const topicInputRef = useRef<HTMLInputElement>(null);

  const allCategories = useMemo(() => {
    const list = getAllEventCategories(store.eventCategories);
    const cur = d.category ? d.category.trim().toUpperCase() : "";
    if (cur && !list.includes(cur)) {
      return [...list, cur];
    }
    return list;
  }, [store.eventCategories, d.category]);

  const handleAddNewTopic = () => {
    const normalized = newTopicInput.trim().toUpperCase();
    if (!normalized) return;
    addEventCategory(normalized);
    u({ category: normalized });
    setNewTopicInput("");
    setIsAddingTopic(false);
  };

  const currentPlatform = d.platform ?? {
    enabled: false,
    platformName: "",
    tagline: "",
    caseStudySlug: "",
  };

  const updatePlatform = (patch: Partial<PlatformCaseStudyRef>) => {
    u({ platform: { ...currentPlatform, ...patch } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#2d2d34]/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-[16px] bg-white shadow-[6px_6px_0px_#2d2d34] border-2 border-[#2d2d34] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2d2d34] bg-[#f8f9fa] px-6 py-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#2d2d34] text-white shadow-[1px_1px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                HQ EVENT MANAGER
              </span>
              <span className="font-mono text-[11px] text-[#71717a]">
                elevates.live/events/{d.slug || "new-event"}
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-black text-[#2d2d34] uppercase tracking-tight">
              {event.id && event.title ? `Edit Event: ${event.title}` : "Create New Event"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#2d2d34] hover:bg-neutral-100 p-2 rounded-[6px] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Main Info */}
          <div className="space-y-4">
            <Field
              label="Event Title"
              hint="Rendered uppercase on /events and promotional badges"
            >
              <input
                className="h-10 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 font-[family-name:var(--font-display)] text-sm font-bold uppercase text-[#2d2d34] tracking-tight shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none focus:shadow-[2px_2px_0px_#2d2d34] transition-all"
                value={d.title}
                onChange={(e) => {
                  const val = e.target.value;
                  const currentAutoSlug = finalizeSlug(d.title);
                  const isAutoSlug = !d.slug || d.slug === currentAutoSlug;
                  const autoSlug = isAutoSlug ? finalizeSlug(val) : d.slug;
                  u({ title: val, slug: autoSlug });
                }}
                placeholder="VIBE CODING WORKSHOP"
              />
            </Field>

            {/* Chapter Linkage */}
            <Field label="Associated Campus Chapter (Links event to Chapter Portal)">
              <select
                className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs font-semibold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
                value={d.chapterSlug}
                onChange={(e) => {
                  const val = e.target.value;
                  const ch = store.chapters.find((c) => c.slug === val);
                  u({ chapterSlug: val, chapterName: ch ? ch.name : val });
                }}
              >
                <option value="hq">ELEVATES HQ / Network Wide</option>
                {store.chapters.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Slug (URL path)">
              <TInput
                value={d.slug}
                onChange={(v) => u({ slug: formatSlugInput(v) })}
                onBlur={() => u({ slug: finalizeSlug(d.slug) })}
                mono
                placeholder="vibe-coding-brototype"
              />
            </Field>
            <Field label="Tagline (appears under title on event card)">
              <TInput
                value={d.tagline}
                onChange={(v) => u({ tagline: v })}
                placeholder="Build, Create & Innovate · AI-Assisted Development"
              />
            </Field>
            <Field label="Description (card preview text — 1-2 sentences)">
              <TArea
                value={d.description}
                onChange={(v) => u({ description: v })}
                rows={2}
                placeholder="Short description for event card..."
              />
            </Field>
            <Field label="Full Description (complete writeup shown on detail page)">
              <TArea
                value={d.fullDescription}
                onChange={(v) => u({ fullDescription: v })}
                rows={5}
                placeholder="Full event description, schedule, and expectations..."
              />
            </Field>
          </div>

          {/* ── SPECIAL SECTION: SOFTWARE PLATFORM & CASE STUDY ATTACHMENT ── */}
          <div className="rounded-[12px] border-2 border-[#f26430] bg-[#fef0eb]/50 p-5 space-y-4 shadow-[2px_2px_0px_#f26430]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[6px] bg-[#f26430] text-white flex items-center justify-center shadow-[1.5px_1.5px_0px_#2d2d34]">
                  <Laptop size={16} />
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase text-[#2d2d34] tracking-wide">
                    Did ELEVATES Build a Custom Software Platform for this Event?
                  </h4>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    If enabled, this event links to a verified case study on
                    elevates.live/projects with metric &amp; architecture proof.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={currentPlatform.enabled}
                  onChange={(e) =>
                    updatePlatform({ enabled: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f26430] shadow-[1px_1px_0px_#2d2d34]"></div>
              </label>
            </div>

            {currentPlatform.enabled && (
              <div className="pt-3 border-t border-[#f26430]/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Platform Name">
                    <TInput
                      value={currentPlatform.platformName}
                      onChange={(v) => updatePlatform({ platformName: v })}
                      placeholder="e.g. Vibranium Event Platform"
                    />
                  </Field>
                  <Field label="Case Study Slug (on /projects/[slug])">
                    <TInput
                      value={currentPlatform.caseStudySlug}
                      onChange={(v) =>
                        updatePlatform({ caseStudySlug: formatSlugInput(v) })
                      }
                      onBlur={() =>
                        updatePlatform({
                          caseStudySlug: finalizeSlug(
                            currentPlatform.caseStudySlug
                          ),
                        })
                      }
                      mono
                      placeholder="vibranium-event-platform"
                    />
                  </Field>
                </div>

                <Field label="Platform Tagline / Claim">
                  <TInput
                    value={currentPlatform.tagline}
                    onChange={(v) => updatePlatform({ tagline: v })}
                    placeholder="Five days to build it. 400,000 requests in 24 hours. Zero downtime."
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Live Platform URL">
                    <TInput
                      value={currentPlatform.liveUrl ?? ""}
                      onChange={(v) =>
                        updatePlatform({ liveUrl: v || undefined })
                      }
                      mono
                      placeholder="https://vibranium.elevates.live"
                    />
                  </Field>
                  <Field label="GitHub Repo URL">
                    <TInput
                      value={currentPlatform.repoUrl ?? ""}
                      onChange={(v) =>
                        updatePlatform({ repoUrl: v || undefined })
                      }
                      mono
                      placeholder="https://github.com/..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Highlight Metric">
                    <TInput
                      value={currentPlatform.highlightMetric ?? ""}
                      onChange={(v) =>
                        updatePlatform({ highlightMetric: v || undefined })
                      }
                      placeholder="400,000 requests in 24h"
                    />
                  </Field>
                  <Field label="Architecture Summary">
                    <TInput
                      value={currentPlatform.architectureSummary ?? ""}
                      onChange={(v) =>
                        updatePlatform({ architectureSummary: v || undefined })
                      }
                      placeholder="Next.js 15, PostgreSQL, Edge QR API"
                    />
                  </Field>
                </div>

                <div className="text-[11px] text-[#f26430] font-mono font-bold flex items-center gap-1.5 pt-1">
                  <Sparkles size={12} />
                  Badge will display:{" "}
                  <code className="bg-[#f26430]/15 px-2 py-0.5 rounded border border-[#f26430]/30 text-[#2d2d34]">
                    ⚡ Platform Built: {currentPlatform.platformName || "Custom Platform"}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Meta Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Format">
              <select
                className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 font-mono text-xs font-semibold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
                value={d.format}
                onChange={(e) =>
                  u({ format: e.target.value as EventFormat })
                }
              >
                {["Campus Exclusive", "Open", "Online", "Multi-Campus"].map(
                  (f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  )
                )}
              </select>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-[10.5px] font-bold text-[#2d2d34] uppercase tracking-wider">
                  Category / Topic
                </label>
                {!isAddingTopic ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTopic(true);
                      setTimeout(() => topicInputRef.current?.focus(), 50);
                    }}
                    className="font-mono text-[10px] font-bold text-[#f26430] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} /> Add New Topic
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTopic(false);
                      setNewTopicInput("");
                    }}
                    className="font-mono text-[10px] text-[#71717a] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isAddingTopic ? (
                <div className="flex gap-1.5 items-center">
                  <input
                    ref={topicInputRef}
                    type="text"
                    className="h-9 flex-1 rounded-[6px] border border-[#f26430] bg-white px-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#2d2d34] placeholder:text-[#71717a] placeholder:normal-case outline-none shadow-[1px_1px_0px_#f26430]"
                    placeholder="e.g. CYBERSECURITY"
                    value={newTopicInput}
                    onChange={(e) =>
                      setNewTopicInput(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewTopic();
                      } else if (e.key === "Escape") {
                        setIsAddingTopic(false);
                        setNewTopicInput("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewTopic}
                    disabled={!newTopicInput.trim()}
                    className="h-9 px-3 rounded-[6px] bg-[#f26430] text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0 shadow-[1px_1px_0px_#2d2d34]"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 font-mono text-xs font-semibold uppercase text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
                  value={d.category ? d.category.toUpperCase() : "WORKSHOP"}
                  onChange={(e) => {
                    if (e.target.value === "__NEW_TOPIC__") {
                      setIsAddingTopic(true);
                      setTimeout(() => topicInputRef.current?.focus(), 50);
                    } else {
                      u({ category: e.target.value.toUpperCase() });
                    }
                  }}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option
                    value="__NEW_TOPIC__"
                    className="text-[#f26430] font-bold"
                  >
                    + Add New Topic...
                  </option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Seat Capacity">
              <input
                type="number"
                min={1}
                className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
                placeholder="60"
                value={d.attendeesCount || ""}
                onChange={(e) =>
                  u({ attendeesCount: parseInt(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Waitlist Capacity (0 = no waitlist)">
              <input
                type="number"
                min={0}
                className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none"
                placeholder="0"
                value={
                  d.waitlistCapacity === undefined ? "" : d.waitlistCapacity
                }
                onChange={(e) => {
                  const val = e.target.value;
                  u({
                    waitlistCapacity:
                      val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0),
                  });
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start Date">
              <DatePickerInput
                value={d.startDate || d.isoStartDate}
                min={getTodayDateKey()}
                onChange={(dateKey, displayDate) => {
                  const startTimeKey = parseToTimeKey(
                    d.startTime,
                    d.isoStartDate
                  );
                  const newIsoStart = `${dateKey}T${startTimeKey}:00`;
                  const currentEndKey = parseToDateKey(
                    d.endDate,
                    d.isoEndDate
                  );
                  const updates: Partial<EventItem> = {
                    startDate: displayDate,
                    isoStartDate: new Date(newIsoStart).toISOString(),
                  };
                  if (!currentEndKey || currentEndKey < dateKey) {
                    updates.endDate = displayDate;
                    const endTimeKey = parseToTimeKey(d.endTime, d.isoEndDate);
                    updates.isoEndDate = new Date(
                      `${dateKey}T${endTimeKey}:00`
                    ).toISOString();
                  }
                  u(updates);
                }}
              />
            </Field>
            <Field label="End Date">
              <DatePickerInput
                value={d.endDate || d.isoEndDate}
                align="right"
                min={
                  parseToDateKey(d.startDate, d.isoStartDate) ||
                  getTodayDateKey()
                }
                onChange={(dateKey, displayDate) => {
                  const endTimeKey = parseToTimeKey(d.endTime, d.isoEndDate);
                  u({
                    endDate: displayDate,
                    isoEndDate: new Date(
                      `${dateKey}T${endTimeKey}:00`
                    ).toISOString(),
                  });
                }}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start Time">
              <TimePickerInput
                value={d.startTime || d.isoStartDate}
                min={
                  parseToDateKey(d.startDate, d.isoStartDate) ===
                  getTodayDateKey()
                    ? getCurrentTimeKey()
                    : undefined
                }
                onChange={(timeKey, displayTime) => {
                  const startDateKey =
                    parseToDateKey(d.startDate, d.isoStartDate) ||
                    getTodayDateKey();
                  const updates: Partial<EventItem> = {
                    startTime: displayTime,
                    isoStartDate: new Date(
                      `${startDateKey}T${timeKey}:00`
                    ).toISOString(),
                  };
                  const endDateKey =
                    parseToDateKey(d.endDate, d.isoEndDate) || startDateKey;
                  const currentEndTimeKey = parseToTimeKey(
                    d.endTime,
                    d.isoEndDate
                  );
                  if (
                    startDateKey === endDateKey &&
                    currentEndTimeKey < timeKey
                  ) {
                    updates.endTime = displayTime;
                    updates.isoEndDate = new Date(
                      `${endDateKey}T${timeKey}:00`
                    ).toISOString();
                  }
                  u(updates);
                }}
              />
            </Field>
            <Field label="End Time">
              <TimePickerInput
                value={d.endTime || d.isoEndDate}
                align="right"
                isEndTime={true}
                baseStartTime={d.startTime || d.isoStartDate}
                min={
                  parseToDateKey(d.startDate, d.isoStartDate) ===
                  (parseToDateKey(d.endDate, d.isoEndDate) ||
                    parseToDateKey(d.startDate, d.isoStartDate))
                    ? parseToTimeKey(d.startTime, d.isoStartDate)
                    : undefined
                }
                onChange={(timeKey, displayTime) => {
                  const endDateKey =
                    parseToDateKey(d.endDate, d.isoEndDate) ||
                    parseToDateKey(d.startDate, d.isoStartDate) ||
                    getTodayDateKey();
                  u({
                    endTime: displayTime,
                    isoEndDate: new Date(
                      `${endDateKey}T${timeKey}:00`
                    ).toISOString(),
                  });
                }}
              />
            </Field>
          </div>

          <Field label="Venue">
            <TInput
              value={d.venue}
              onChange={(v) => u({ venue: v })}
              placeholder="Main Seminar Hall / Campus Auditorium"
            />
          </Field>
          <Field label="Cover Image Path">
            <TInput
              value={d.coverImage}
              onChange={(v) => u({ coverImage: v })}
              mono
              placeholder="/images/events/my-event.jpeg"
            />
          </Field>

          <div className="flex items-center gap-3 p-3 rounded-[8px] border border-[#2d2d34]/20 bg-[#f8f9fa]">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#f26430] cursor-pointer"
                checked={d.featured}
                onChange={(e) => u({ featured: e.target.checked })}
              />
              <span className="font-mono text-xs font-bold text-[#2d2d34] flex items-center gap-1.5">
                <Star
                  size={14}
                  className={
                    d.featured
                      ? "fill-[#f26430] text-[#f26430]"
                      : "text-[#71717a]"
                  }
                />
                Featured Event — showcases with prominent banner on /events
              </span>
            </label>
          </div>

          <Field label="Organizers">
            <OrgList orgs={d.organizer} onChange={(v) => u({ organizer: v })} />
          </Field>
          <Field label="Speakers / Hosts">
            <HostList hosts={d.hosts} onChange={(v) => u({ hosts: v })} />
          </Field>
          <Field label="Topics / Tags">
            <StrList
              items={d.topics}
              onChange={(v) => u({ topics: v })}
              placeholder="e.g. Next.js, AI Agents, Production Infra"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-[#2d2d34] bg-[#f8f9fa] px-6 py-4">
          {event.id && event.title && onDelete ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-red-500/40 bg-white font-mono text-xs font-bold text-red-600 shadow-[1.5px_1.5px_0px_#dc2626] hover:bg-red-50 transition-all cursor-pointer"
            >
              <Trash2 size={13} /> Delete Event
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-[6px] border border-[#2d2d34]/30 bg-white font-mono text-xs font-bold text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(d);
                onClose();
              }}
              className="px-4 py-2 rounded-[6px] bg-[#f26430] border border-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34] transition-all cursor-pointer"
            >
              Save Event
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteEventDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            onDelete?.(event.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          eventTitle={d.title || event.title}
        />
      )}
    </div>
  );
}

export default function EventsCMSPage() {
  const { store, createEvent, updateEvent, deleteEvent, addEventCategory } =
    useStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");
  const [filterChapter, setFilterChapter] = useState<string>("all");
  const [filterPlatformOnly, setFilterPlatformOnly] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);

  const events = useMemo<EventItem[]>(() => {
    return (store.events ?? []).map((e) => ({
      id: e.id,
      slug: e.slug || e.id,
      title: e.title,
      tagline: e.summary || e.description || "",
      description: e.description || "",
      fullDescription: e.description || "",
      format:
        e.visibility === "open_to_all" ||
        e.visibility === "public" ||
        e.visibility === "all_chapters"
          ? e.mode === "online"
            ? "Online"
            : "Open"
          : "Campus Exclusive",
      category: (e.category || "WORKSHOP").toUpperCase(),
      status: (
        (e.status as string) === "completed"
          ? "Completed"
          : (e.status as string) === "registration_open"
          ? "Ongoing"
          : "Upcoming"
      ) as EventStatus,
      startDate: e.startsAt ? new Date(e.startsAt).toLocaleDateString() : "",
      endDate: e.endsAt ? new Date(e.endsAt).toLocaleDateString() : "",
      startTime: e.startsAt
        ? new Date(e.startsAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      endTime: e.endsAt
        ? new Date(e.endsAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      isoStartDate: e.startsAt || "",
      isoEndDate: e.endsAt || "",
      venue: e.venue || "Seminar Hall",
      locationName: "",
      organizer:
        Array.isArray(e.organizers) && e.organizers.length > 0
          ? e.organizers
          : Array.isArray(e.organizer) && e.organizer.length > 0
          ? e.organizer
          : [{ name: "ELEVATES" }],
      hosts: Array.isArray(e.hosts) ? e.hosts : [],
      topics: e.topics || [],
      attendeesCount: e.capacity || 50,
      waitlistCapacity:
        typeof e.waitlistCapacity === "number" ? e.waitlistCapacity : 15,
      coverImage: e.bannerUrl || "",
      featured: true,
      platform: e.platform?.enabled
        ? {
            enabled: true,
            platformName: e.platform.platformName || e.title,
            tagline: e.platform.tagline || "",
            caseStudySlug: e.caseStudy?.caseStudySlug || e.slug || "case-study",
            liveUrl: e.platform.liveUrl,
            repoUrl: e.platform.repoUrl,
            highlightMetric: e.platform.highlightMetric,
            architectureSummary: e.platform.architectureSummary,
          }
        : undefined,
      chapterSlug:
        store.chapters.find((c) => c.id === e.chapterId)?.slug ||
        store.chapters[0]?.slug ||
        "ch-main",
      chapterName:
        store.chapters.find((c) => c.id === e.chapterId)?.name ||
        store.chapters[0]?.name ||
        "Campus Chapter",
    }));
  }, [store.events, store.chapters]);

  const q = search.toLowerCase();
  const filtered = events.filter((e) => {
    const matchQ =
      e.title.toLowerCase().includes(q) ||
      e.tagline.toLowerCase().includes(q) ||
      e.hosts.some((h) => h.name.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchChapter =
      filterChapter === "all" || e.chapterSlug === filterChapter;
    const matchPlatform = !filterPlatformOnly || e.platform?.enabled;
    return matchQ && matchStatus && matchChapter && matchPlatform;
  });

  const blank = (): EventItem => {
    const times = getDefaultUpcomingEventTimes();
    const startDate = times.displayDate;
    return {
      id: `evt-${Date.now()}`,
      slug: "",
      title: "",
      tagline: "",
      description: "",
      fullDescription: "",
      format: "Campus Exclusive",
      category: "WORKSHOP",
      status: "Upcoming",
      startDate,
      endDate: startDate,
      startTime: times.displayStartTime,
      endTime: times.displayEndTime,
      isoStartDate: times.isoStartDate,
      isoEndDate: times.isoEndDate,
      venue: "Main Seminar Hall",
      locationName: "",
      organizer: [{ name: "ELEVATES" }],
      hosts: [{ name: "", role: "" }],
      topics: [],
      attendeesCount: 50,
      waitlistCapacity: 0,
      coverImage: "",
      featured: false,
      platform: {
        enabled: false,
        platformName: "",
        tagline: "",
        caseStudySlug: "",
      },
      chapterSlug: store.chapters[0]?.slug || "ch-main",
      chapterName: store.chapters[0]?.name || "Campus Chapter",
    };
  };

  const platformEventsCount = events.filter((e) => e.platform?.enabled).length;
  const upcomingCount = events.filter((e) => e.status === "Upcoming").length;
  const completedCount = events.filter((e) => e.status === "Completed").length;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. ARCHITECTURAL HERO BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-40 h-16 w-16 bg-[#5f7560] opacity-10 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                WEBSITE CMS {"//"} EVENT MANAGEMENT
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                ELEVATES.LIVE/EVENTS · CHAPTER WORKSHOPS &amp; MEETS
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Events &amp; Workshops.
              <span className="block text-[#f26430]">
                Campuses, Hackathons &amp; Platform Launches.
              </span>
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Curate and publish authentic ELEVATES workshops, meetups, hackathons, and challenges across university chapters. Directly link events to student-built software platforms and chapter consoles.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              onClick={() => {
                setEditing(blank());
                setIsNew(true);
              }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#f26430] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_#2d2d34] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34] active:translate-x-0 active:translate-y-0 cursor-pointer"
            >
              <Plus size={14} /> New Event
            </button>
            <Link
              href="/hq/website/projects"
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#2d2d34]/30 bg-white px-3.5 py-2.5 font-mono text-xs font-bold text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#2d2d34] transition-all"
            >
              <Layers size={13} className="text-[#f26430]" /> Project Showcase ↗
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. METRICS STRIP ────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Events */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#2d2d34]" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
              01 // TOTAL EVENTS
            </span>
            <Calendar size={14} className="text-[#2d2d34]" />
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {events.length}
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
            Across All Kerala Chapters
          </p>
        </div>

        {/* Built Custom Platforms */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#f26430]" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f26430]">
              02 // BUILT PLATFORMS
            </span>
            <Laptop size={14} className="text-[#f26430]" />
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#f26430]">
            {platformEventsCount}
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
            Custom Student Systems
          </p>
        </div>

        {/* Upcoming Sessions */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#5f7560]" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5f7560]">
              03 // UPCOMING SESSIONS
            </span>
            <Activity size={14} className="text-[#5f7560]" />
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#5f7560]">
            {upcomingCount}
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
            Registration / Scheduled
          </p>
        </div>

        {/* Completed */}
        <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2d2d34]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#414066]" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#414066]">
              04 // COMPLETED SESSIONS
            </span>
            <CheckCircle2 size={14} className="text-[#414066]" />
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#414066]">
            {completedCount}
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
            Historical Delivery Proof
          </p>
        </div>
      </section>

      {/* ── 3. FILTER BAR ──────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]"
            />
            <input
              type="text"
              placeholder="Search events, topics, or speakers..."
              className="h-10 w-full pl-9 pr-3 rounded-[8px] border border-[#2d2d34]/30 bg-white font-mono text-xs text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] focus:border-[#2d2d34] focus:shadow-[2px_2px_0px_#2d2d34] focus:outline-none transition-all placeholder:text-[#71717a]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Chapter Filter */}
          <select
            className="h-10 rounded-[8px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs font-semibold text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] focus:border-[#2d2d34] focus:shadow-[2px_2px_0px_#2d2d34] focus:outline-none transition-all"
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
          >
            <option value="all">All Chapters</option>
            <option value="hq">ELEVATES HQ / Network Wide</option>
            {store.chapters.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="h-10 rounded-[8px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs font-semibold text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] focus:border-[#2d2d34] focus:shadow-[2px_2px_0px_#2d2d34] focus:outline-none transition-all"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as EventStatus | "all")
            }
          >
            <option value="all">All Statuses</option>
            {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Platform Toggle */}
          <button
            onClick={() => setFilterPlatformOnly(!filterPlatformOnly)}
            className={`h-10 px-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-[8px] border transition-all flex items-center gap-1.5 cursor-pointer ${
              filterPlatformOnly
                ? "bg-[#f26430] text-white border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34]"
                : "bg-white text-[#2d2d34] border-[#2d2d34]/30 shadow-[1.5px_1.5px_0px_#2d2d34] hover:border-[#2d2d34] hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#2d2d34]"
            }`}
          >
            <Laptop size={13} />
            Built Platforms ({platformEventsCount})
          </button>

          {search || filterStatus !== "all" || filterChapter !== "all" || filterPlatformOnly ? (
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("all");
                setFilterChapter("all");
                setFilterPlatformOnly(false);
              }}
              className="font-mono text-xs text-[#f26430] hover:underline font-bold px-2 cursor-pointer"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      </section>

      {/* ── 4. EVENTS LIST ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Calendar size={36} className="mx-auto text-[#71717a] mb-3" />
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
              No Events Found Matching Filters
            </h3>
            <p className="font-mono text-xs text-[#71717a] mt-1">
              Try adjusting your query or resetting chapter and status filters.
            </p>
          </div>
        ) : (
          filtered.map((evt) => {
            const statusStyle =
              STATUS_BADGE_STYLE[evt.status] || STATUS_BADGE_STYLE.Upcoming;

            return (
              <div
                key={evt.id}
                className={`rounded-[14px] border ${
                  evt.platform?.enabled
                    ? "border-2 border-[#f26430]/70 bg-white shadow-[3px_3px_0px_#f26430]"
                    : "border border-[#2d2d34]/20 bg-white shadow-[2px_2px_0px_#2d2d34]"
                } transition-all hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#2d2d34] p-5 relative overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      {/* Status */}
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} ${statusStyle.shadow}`}
                      >
                        {evt.status}
                      </span>

                      {/* Category */}
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#2d2d34] text-white shadow-[1px_1px_0px_#2d2d34]">
                        {evt.category}
                      </span>

                      {/* Format */}
                      <span className="font-mono text-[10px] font-semibold text-[#71717a] border border-[#2d2d34]/20 bg-white px-2 py-0.5 rounded-[4px]">
                        {evt.format}
                      </span>

                      {/* Featured */}
                      {evt.featured && (
                        <span className="font-mono text-[10px] font-bold text-[#f26430] bg-[#fef0eb] border border-[#f26430]/30 px-2 py-0.5 rounded-[4px] flex items-center gap-1 shadow-[1px_1px_0px_#f26430]">
                          <Star size={10} className="fill-[#f26430]" /> Featured
                        </span>
                      )}

                      {/* Platform Built Badge */}
                      {evt.platform?.enabled && (
                        <span className="font-mono text-[10px] font-bold text-white bg-[#f26430] px-2.5 py-0.5 rounded-[5px] flex items-center gap-1 shadow-[1.5px_1.5px_0px_#2d2d34]">
                          <Laptop size={11} /> ⚡ Platform Built:{" "}
                          {evt.platform.platformName}
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-[#71717a]">
                        /{evt.slug}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="font-[family-name:var(--font-display)] font-black text-[#2d2d34] text-lg uppercase tracking-tight">
                      {evt.title}
                    </h3>
                    {evt.tagline && (
                      <p className="text-xs text-[#71717a] mt-0.5 italic">
                        {evt.tagline}
                      </p>
                    )}

                    {/* Chapter Association Badge */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <Link
                        href={`/chapter/${
                          evt.chapterSlug ||
                          store.chapters?.[0]?.slug ||
                          "main"
                        }/events`}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#2d2d34] bg-white border border-[#2d2d34]/30 px-2.5 py-1 rounded-[6px] shadow-[1px_1px_0px_#2d2d34] hover:border-[#f26430] hover:text-[#f26430] transition-colors"
                      >
                        <Building2 size={12} className="text-[#f26430]" />
                        <span>{evt.chapterName || "Campus Chapter"}</span>
                        <span className="text-[#71717a] text-[10px]">↗</span>
                      </Link>
                    </div>

                    {/* Platform Card Callout if built */}
                    {evt.platform?.enabled && (
                      <div className="mt-3.5 p-3.5 rounded-[8px] border-2 border-[#f26430]/40 bg-[#fef0eb]/80 shadow-[1.5px_1.5px_0px_#f26430] flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#2d2d34] font-[family-name:var(--font-display)] uppercase text-sm">
                              {evt.platform.platformName}
                            </span>
                            {evt.platform.highlightMetric && (
                              <span className="font-mono text-[10px] font-bold bg-[#f26430] text-white px-2 py-0.5 rounded-[4px] shadow-[1px_1px_0px_#2d2d34]">
                                {evt.platform.highlightMetric}
                              </span>
                            )}
                          </div>
                          {evt.platform.tagline && (
                            <p className="text-[11px] text-[#71717a] mt-1 font-mono">
                              {evt.platform.tagline}
                            </p>
                          )}
                          {evt.platform.architectureSummary && (
                            <p className="text-[10px] text-[#2d2d34] mt-1 font-mono">
                              <span className="text-[#71717a]">Architecture:</span>{" "}
                              {evt.platform.architectureSummary}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/hq/website/projects"
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#f26430] hover:underline bg-white px-3 py-1.5 rounded-[6px] border border-[#f26430]/40 shadow-[1px_1px_0px_#f26430] hover:-translate-y-0.5 transition-all"
                        >
                          <FileText size={12} /> Open Case Study (
                          {evt.platform.caseStudySlug}) ↗
                        </Link>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-2.5 mt-3 text-[11px] font-mono text-[#71717a]">
                      <span className="inline-flex items-center gap-1 bg-[#f8f9fa] border border-[#2d2d34]/15 px-2 py-0.5 rounded-[4px] text-[#2d2d34]">
                        📅 {evt.startDate}{" "}
                        {evt.startTime && evt.startTime !== evt.endTime
                          ? `(${evt.startTime} – ${evt.endTime})`
                          : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#f8f9fa] border border-[#2d2d34]/15 px-2 py-0.5 rounded-[4px] text-[#2d2d34]">
                        📍 {evt.venue.split(",")[0]}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#f8f9fa] border border-[#2d2d34]/15 px-2 py-0.5 rounded-[4px] text-[#2d2d34]">
                        👥 {evt.attendeesCount} capacity
                      </span>
                      {typeof evt.waitlistCapacity === "number" &&
                        evt.waitlistCapacity > 0 && (
                          <span className="inline-flex items-center gap-1 bg-[#f8f9fa] border border-[#2d2d34]/15 px-2 py-0.5 rounded-[4px] text-[#71717a]">
                            ⏳ {evt.waitlistCapacity} waitlist
                          </span>
                        )}
                    </div>

                    {/* Hosts / Speakers */}
                    {evt.hosts.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {evt.hosts.map((h, i) => (
                          <span
                            key={i}
                            className="font-mono text-[10.5px] bg-[#f8f9fa] border border-[#2d2d34]/20 px-2 py-0.5 rounded-[4px] text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]"
                          >
                            🎙️ {h.name}{" "}
                            {h.role && (
                              <span className="text-[#71717a]">· {h.role}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditing(evt);
                        setIsNew(false);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-white border border-[#2d2d34] px-3 py-1.5 font-mono text-xs font-bold text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer"
                    >
                      <Edit size={13} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingEvent(evt)}
                      className="inline-flex items-center justify-center p-1.5 rounded-[6px] bg-white border border-red-500/40 text-red-600 shadow-[1.5px_1.5px_0px_#dc2626] hover:bg-red-50 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                      title={`Delete event "${evt.title}"`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. EVENT EDITOR MODAL ──────────────────────────────────────── */}
      {editing && (
        <EventEditor
          event={editing}
          onClose={() => {
            setEditing(null);
            setIsNew(false);
          }}
          onDelete={(id) => {
            deleteEvent(id);
            setEditing(null);
          }}
          onSave={async (saved) => {
            const finalCategory = saved.category
              ? saved.category.trim().toUpperCase()
              : "WORKSHOP";
            addEventCategory(finalCategory);

            const targetChapter =
              store.chapters.find((c) => c.slug === saved.chapterSlug) ||
              store.chapters[0];
            const targetChapterId = targetChapter?.id || "";
            const visibility =
              saved.format === "Campus Exclusive"
                ? "chapter_only"
                : "open_to_all";

            const cleanSlug = finalizeSlug(
              saved.slug || saved.title || "event"
            );
            const storeEvent: any = {
              id: saved.id,
              chapterId: targetChapterId,
              title: saved.title || "Untitled Event",
              slug: cleanSlug,
              bannerEmoji: "EVENT",
              summary: saved.tagline || saved.description,
              description:
                saved.fullDescription ||
                saved.description ||
                "Event organized by ELEVATES.",
              venue: saved.venue || "Main Seminar Hall",
              startsAt: saved.isoStartDate || new Date().toISOString(),
              endsAt:
                saved.isoEndDate ||
                new Date(Date.now() + 7200000).toISOString(),
              organizerId: store.session.userId,
              capacity: saved.attendeesCount || 60,
              waitlistCapacity:
                typeof saved.waitlistCapacity === "number"
                  ? Math.max(0, saved.waitlistCapacity)
                  : 0,
              visibility,
              mode:
                saved.format === "Online"
                  ? "online"
                  : saved.format === "Multi-Campus"
                  ? "hybrid"
                  : "in_person",
              registrationStart: new Date().toISOString(),
              registrationEnd:
                saved.isoEndDate ||
                new Date(Date.now() + 7200000).toISOString(),
              status:
                saved.status?.toLowerCase() === "upcoming"
                  ? "draft"
                  : saved.status?.toLowerCase() === "ongoing"
                  ? "registration_open"
                  : "completed",
              certificateEnabled: true,
              ticketNo: `NO. ${String(store.events.length + 10).padStart(
                2,
                "0"
              )}`,
              category: finalCategory,
              topics: saved.topics || [],
              hosts: (saved.hosts || []).filter((h) => h.name.trim() !== ""),
              organizers: (saved.organizer || []).filter(
                (o) => o.name.trim() !== ""
              ),
              organizer: (saved.organizer || []).filter(
                (o) => o.name.trim() !== ""
              ),
              bannerUrl: saved.coverImage || undefined,
              platform: saved.platform?.enabled
                ? {
                    enabled: true,
                    platformName: saved.platform.platformName || saved.title,
                    tagline: saved.platform.tagline,
                    liveUrl: saved.platform.liveUrl,
                    repoUrl: saved.platform.repoUrl,
                    highlightMetric: saved.platform.highlightMetric,
                    architectureSummary: saved.platform.architectureSummary,
                  }
                : undefined,
              caseStudy: saved.platform?.enabled
                ? {
                    enabled: true,
                    platformName: saved.platform.platformName || saved.title,
                    tagline: saved.platform.tagline,
                    caseStudySlug: finalizeSlug(
                      saved.platform.caseStudySlug ||
                        cleanSlug ||
                        "platform-case-study"
                    ),
                    liveUrl: saved.platform.liveUrl,
                    repoUrl: saved.platform.repoUrl,
                    highlightMetric: saved.platform.highlightMetric,
                    architectureSummary: saved.platform.architectureSummary,
                  }
                : undefined,
            };

            if (isNew) {
              createEvent(storeEvent);
            } else {
              updateEvent(saved.id, storeEvent);
            }
            setEditing(null);
            setIsNew(false);
          }}
        />
      )}

      {/* ── 6. DELETE CONFIRMATION DIALOG ──────────────────────────────── */}
      {deletingEvent && (
        <DeleteEventDialog
          open={Boolean(deletingEvent)}
          onClose={() => setDeletingEvent(null)}
          onConfirm={() => {
            if (deletingEvent) {
              deleteEvent(deletingEvent.id);
              setDeletingEvent(null);
            }
          }}
          eventTitle={deletingEvent.title}
        />
      )}
    </div>
  );
}

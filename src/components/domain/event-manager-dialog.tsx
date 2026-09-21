"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  Building2,
  Calendar,
  Clock,
  Laptop,
  Lock,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { isHqRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
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
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { isUuid, genUuid } from "@/lib/uuid";
import { DEFAULT_EVENT_CATEGORIES, getAllEventCategories } from "@/lib/events";
import type { EventItem as StoreEventItem, EventLesson, EventResource } from "@/types";
import { LessonGlyph } from "@/components/domain/event-lessons-card";

export type EventStatus = "Draft" | "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
export type EventFormat = "Campus Exclusive" | "Open" | "Online" | "Multi-Campus";
export type EventCategory = string;

export interface Host {
  name: string;
  role: string;
}

export interface Organizer {
  name: string;
}

export interface PlatformCaseStudyRef {
  enabled: boolean;
  platformName: string;
  tagline: string;
  caseStudySlug: string;
  liveUrl?: string;
  repoUrl?: string;
  highlightMetric?: string;
  architectureSummary?: string;
}

export interface CmsEventItem {
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
  posterUrl?: string;
  thumbnailUrl?: string;
  seriesTitle?: string;
  seriesPill?: string;
  featured: boolean;
  registrationStartDate?: string;
  registrationStartTime?: string;
  isoRegistrationStart?: string;
  registrationEndDate?: string;
  registrationEndTime?: string;
  isoRegistrationEnd?: string;
  publishImmediately?: boolean;
  platform?: PlatformCaseStudyRef;
  peerLabSlug?: string;
  peerLabTitle?: string;
  chapterSlug: string;
  chapterName: string;
  lessons?: EventLesson[];
  resources?: EventResource[];
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TInput({
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
      className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${
        mono ? "font-mono" : ""
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

export function TArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function StrList({
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
            className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
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
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...items, ""])}
      >
        <Plus size={12} /> Add
      </Button>
    </div>
  );
}

export function HostList({
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
            className="h-8 flex-1 min-w-[140px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Speaker/Host name"
            value={h.name}
            onChange={(e) => {
              const n = [...hosts];
              n[i] = { ...n[i], name: e.target.value };
              onChange(n);
            }}
          />
          <input
            className="h-8 flex-1 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Role / Company / Title"
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
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...hosts, { name: "", role: "" }])}
      >
        <Plus size={12} /> Add Speaker/Host
      </Button>
    </div>
  );
}

export function OrgList({
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
            className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Organizer name"
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
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...orgs, { name: "" }])}
      >
        <Plus size={12} /> Add Organizer
      </Button>
    </div>
  );
}



export function createBlankCmsEvent(
  initialChapterSlug?: string,
  initialDateKey?: string,
): CmsEventItem {
  const times = getDefaultUpcomingEventTimes(initialDateKey);
  const startDate = times.displayDate;
  const endDate = times.displayEndDate || startDate;
  const startTime = times.displayStartTime;
  const endTime = times.displayEndTime;
  const isoStartDate = times.isoStartDate;
  const isoEndDate = times.isoEndDate;

  return {
    id: genUuid(),
    slug: "",
    title: "",
    tagline: "",
    description: "",
    fullDescription: "",
    format: "Campus Exclusive",
    category: "WORKSHOP",
    status: "Draft",
    startDate,
    endDate,
    startTime,
    endTime,
    isoStartDate,
    isoEndDate,
    registrationStartDate: formatDisplayDate(getTodayDateKey()),
    registrationStartTime: formatDisplayTime(getCurrentTimeKey()),
    isoRegistrationStart: new Date().toISOString(),
    registrationEndDate: endDate,
    registrationEndTime: endTime,
    isoRegistrationEnd: isoEndDate,
    publishImmediately: true,
    venue: "Main Seminar Hall",
    locationName: "",
    organizer: [],
    hosts: [],
    topics: [],
    attendeesCount: 0,
    waitlistCapacity: 0,
    coverImage: "",
    posterUrl: "",
    thumbnailUrl: "",
    seriesTitle: "",
    seriesPill: "STUDY JAM",
    lessons: [],
    resources: [],
    featured: false,
    platform: {
      enabled: false,
      platformName: "",
      tagline: "",
      caseStudySlug: "",
    },
    chapterSlug: initialChapterSlug || "main",
    chapterName: "Campus Chapter",
  };
}

export function EventEditor({
  event,
  onSave,
  onClose,
  isHqUser = false,
  lockedChapterName,
}: {
  event: CmsEventItem;
  onSave: (e: CmsEventItem) => void;
  onClose: () => void;
  /** If true, show the full chapter dropdown (HQ roles). If false, lock to the user's own chapter. */
  isHqUser?: boolean;
  /** The display name of the locked chapter (for non-HQ users). */
  lockedChapterName?: string;
}) {
  const { store, addEventCategory } = useStore();
  const [d, setD] = useState<CmsEventItem>(() => ({
    ...event,
    category: (event.category || "WORKSHOP").toUpperCase(),
  }));
  const u = (patch: Partial<CmsEventItem>) =>
    setD((prev) => ({ ...prev, ...patch }));

  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
              {event.id && event.title ? "Edit Event" : "Create New Event"}
            </h3>
            <p className="text-[11px] text-text-dim font-mono mt-0.5">
              elevates.live/events/{d.slug || "slug"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text p-1.5 rounded-full hover:bg-bg-page"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Main Info */}
          <div className="space-y-4">
            <Field label="Event Title (displayed in UPPERCASE on /events)">
              <input
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-sm font-bold uppercase text-text tracking-tight"
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
            {isHqUser ? (
              <Field label="Associated Campus Chapter (Links event to Chapter Portal)">
                <select
                  className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
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
            ) : (
              <Field label="Campus Chapter">
                <div className="flex h-9 w-full items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-panel px-3 text-xs text-text-dim cursor-not-allowed select-none">
                  <Building2 size={13} className="shrink-0 text-[var(--accent)]" />
                  <span className="flex-1 truncate font-semibold text-text">
                    {lockedChapterName || d.chapterName || "Your Chapter"}
                  </span>
                  <Lock size={11} className="shrink-0 opacity-40" />
                </div>
                <p className="mt-1 text-[10px] text-text-mute">
                  Events are created under your chapter. Only HQ can assign to a different chapter.
                </p>
              </Field>
            )}

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
                rows={6}
                placeholder="Full event description..."
              />
            </Field>
          </div>

          {/* ── SPECIAL SECTION: SOFTWARE PLATFORM & CASE STUDY ATTACHMENT ── */}
          <div className="rounded-[var(--radius-xl)] border-2 border-[var(--accent)]/40 bg-[var(--accent)]/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="text-[var(--accent)]" size={18} />
                <div>
                  <h4 className="text-xs font-bold uppercase text-text tracking-wide">
                    Did ELEVATES Build a Custom Software Platform for this Event?
                  </h4>
                  <p className="text-[11px] text-text-dim">
                    If enabled, this event links to a verified case study on
                    /projects/[slug] with metrics & architecture proof.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={currentPlatform.enabled}
                  onChange={(e) => updatePlatform({ enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>

            {currentPlatform.enabled && (
              <div className="pt-3 border-t border-[var(--accent)]/20 space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                            currentPlatform.caseStudySlug,
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

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Live Platform URL">
                    <TInput
                      value={currentPlatform.liveUrl ?? ""}
                      onChange={(v) => updatePlatform({ liveUrl: v || undefined })}
                      mono
                      placeholder="https://vibranium.elevates.live"
                    />
                  </Field>
                  <Field label="GitHub Repo URL">
                    <TInput
                      value={currentPlatform.repoUrl ?? ""}
                      onChange={(v) => updatePlatform({ repoUrl: v || undefined })}
                      mono
                      placeholder="https://github.com/..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div className="text-[11px] text-[var(--accent)] font-medium flex items-center gap-1 pt-1">
                  <Sparkles size={12} />
                  Badge will display:{" "}
                  <code className="font-mono bg-[var(--accent)]/15 px-1 rounded">
                    ⚡ Platform Built ({currentPlatform.caseStudySlug || "slug"})
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Meta Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Format">
              <select
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
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
                  ),
                )}
              </select>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-text-dim">
                  Category / Topic
                </label>
                {!isAddingTopic ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTopic(true);
                      setTimeout(() => topicInputRef.current?.focus(), 50);
                    }}
                    className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
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
                    className="text-[10px] text-text-dim hover:underline cursor-pointer"
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
                    className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--accent)] bg-bg px-2.5 text-xs font-bold uppercase tracking-wider text-text placeholder:text-text-mute placeholder:normal-case outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="e.g. CYBERSECURITY"
                    value={newTopicInput}
                    onChange={(e) => setNewTopicInput(e.target.value.toUpperCase())}
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
                    className="h-9 px-3 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs font-semibold uppercase text-text"
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
                  <option value="__NEW_TOPIC__" className="text-[var(--accent)] font-bold">
                    + Add New Topic...
                  </option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Seat Capacity">
              <input
                type="number"
                min={1}
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
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
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                placeholder="0"
                value={d.waitlistCapacity === undefined ? "" : d.waitlistCapacity}
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <DatePickerInput
                value={d.startDate || d.isoStartDate}
                min={getTodayDateKey()}
                onChange={(dateKey, displayDate) => {
                  const startTimeKey = parseToTimeKey(d.startTime, d.isoStartDate);
                  const newIsoStart = `${dateKey}T${startTimeKey}:00`;
                  const currentEndKey = parseToDateKey(d.endDate, d.isoEndDate);
                  const updates: Partial<CmsEventItem> = {
                    startDate: displayDate,
                    isoStartDate: new Date(newIsoStart).toISOString(),
                  };
                  if (!currentEndKey || currentEndKey < dateKey) {
                    updates.endDate = displayDate;
                    const endTimeKey = parseToTimeKey(d.endTime, d.isoEndDate);
                    updates.isoEndDate = new Date(`${dateKey}T${endTimeKey}:00`).toISOString();
                  }
                  u(updates);
                }}
              />
            </Field>
            <Field label="End Date">
              <DatePickerInput
                value={d.endDate || d.isoEndDate}
                align="right"
                min={parseToDateKey(d.startDate, d.isoStartDate) || getTodayDateKey()}
                onChange={(dateKey, displayDate) => {
                  const endTimeKey = parseToTimeKey(d.endTime, d.isoEndDate);
                  u({
                    endDate: displayDate,
                    isoEndDate: new Date(`${dateKey}T${endTimeKey}:00`).toISOString(),
                  });
                }}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time">
              <TimePickerInput
                value={d.startTime || d.isoStartDate}
                min={
                  parseToDateKey(d.startDate, d.isoStartDate) === getTodayDateKey()
                    ? getCurrentTimeKey()
                    : undefined
                }
                onChange={(timeKey, displayTime) => {
                  const startDateKey =
                    parseToDateKey(d.startDate, d.isoStartDate) || getTodayDateKey();
                  const updates: Partial<CmsEventItem> = {
                    startTime: displayTime,
                    isoStartDate: new Date(`${startDateKey}T${timeKey}:00`).toISOString(),
                  };
                  const endDateKey =
                    parseToDateKey(d.endDate, d.isoEndDate) || startDateKey;
                  const currentEndTimeKey = parseToTimeKey(d.endTime, d.isoEndDate);
                  if (startDateKey === endDateKey && currentEndTimeKey < timeKey) {
                    updates.endTime = displayTime;
                    updates.isoEndDate = new Date(`${endDateKey}T${timeKey}:00`).toISOString();
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
                    isoEndDate: new Date(`${endDateKey}T${timeKey}:00`).toISOString(),
                  });
                }}
              />
            </Field>
          </div>

          {/* Registration Scheduling & Publishing */}
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--accent)]" />
                <div>
                  <h4 className="text-xs font-bold uppercase text-text tracking-wide">
                    Registration Window & Scheduling
                  </h4>
                  <p className="text-[11px] text-text-dim">
                    Configure when students can register. If published with a future date, registration is automatically scheduled.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text bg-bg px-2.5 py-1.5 rounded-[var(--radius-md)] border border-border">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--accent)]"
                  checked={d.publishImmediately !== false}
                  onChange={(e) => u({ publishImmediately: e.target.checked })}
                />
                <span>Publish Immediately</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration Opens Date">
                <DatePickerInput
                  value={d.registrationStartDate || d.startDate || d.isoStartDate}
                  min={getTodayDateKey()}
                  onChange={(dateKey, displayDate) => {
                    const timeKey = parseToTimeKey(d.registrationStartTime || "10:00 AM", d.isoRegistrationStart);
                    u({
                      registrationStartDate: displayDate,
                      isoRegistrationStart: new Date(`${dateKey}T${timeKey}:00`).toISOString(),
                    });
                  }}
                />
              </Field>
              <Field label="Registration Opens Time">
                <TimePickerInput
                  value={d.registrationStartTime || "10:00 AM"}
                  onChange={(timeKey, displayTime) => {
                    const dateKey = parseToDateKey(d.registrationStartDate, d.isoRegistrationStart) || getTodayDateKey();
                    u({
                      registrationStartTime: displayTime,
                      isoRegistrationStart: new Date(`${dateKey}T${timeKey}:00`).toISOString(),
                    });
                  }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration Closes Date">
                <DatePickerInput
                  value={d.registrationEndDate || d.endDate || d.isoEndDate}
                  align="right"
                  min={parseToDateKey(d.registrationStartDate, d.isoRegistrationStart) || getTodayDateKey()}
                  onChange={(dateKey, displayDate) => {
                    const timeKey = parseToTimeKey(d.registrationEndTime || d.endTime || "04:00 PM", d.isoRegistrationEnd);
                    u({
                      registrationEndDate: displayDate,
                      isoRegistrationEnd: new Date(`${dateKey}T${timeKey}:00`).toISOString(),
                    });
                  }}
                />
              </Field>
              <Field label="Registration Closes Time">
                <TimePickerInput
                  value={d.registrationEndTime || d.endTime || "04:00 PM"}
                  align="right"
                  isEndTime={true}
                  onChange={(timeKey, displayTime) => {
                    const dateKey = parseToDateKey(d.registrationEndDate, d.isoRegistrationEnd) || parseToDateKey(d.endDate, d.isoEndDate) || getTodayDateKey();
                    u({
                      registrationEndTime: displayTime,
                      isoRegistrationEnd: new Date(`${dateKey}T${timeKey}:00`).toISOString(),
                    });
                  }}
                />
              </Field>
            </div>
          </div>

          <Field label="Venue">
            <TInput
              value={d.venue}
              onChange={(v) => u({ venue: v })}
              placeholder="Main Seminar Hall / Campus Auditorium"
            />
          </Field>

          {/* ── POSTER & CUSTOM THUMBNAIL ── */}
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-text tracking-wide">
              🖼️ Poster & Custom Thumbnail
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Poster / Banner Artwork URL">
                <TInput
                  value={d.posterUrl || d.coverImage || ""}
                  onChange={(v) => u({ posterUrl: v, coverImage: v })}
                  placeholder="https://images.unsplash.com/... or /images/..."
                />
              </Field>
              <Field label="Custom Thumbnail URL (Card Preview)">
                <TInput
                  value={d.thumbnailUrl || ""}
                  onChange={(v) => u({ thumbnailUrl: v })}
                  placeholder="https://images.unsplash.com/..."
                />
              </Field>
            </div>

            {/* Poster Live Preview */}
            {(d.posterUrl || d.coverImage) && (
              <div className="pt-2">
                <span className="text-[10px] text-text-dim font-medium block mb-1.5">
                  Live Poster Preview:
                </span>
                <div className="relative aspect-[16/9] max-w-sm rounded-[12px] overflow-hidden border border-border/80 shadow-sm bg-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.posterUrl || d.coverImage}
                    alt="Poster Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Field label="Series Ribbon Text (e.g. Beyond the Blueprint Season 3)">
                <TInput
                  value={d.seriesTitle || ""}
                  onChange={(v) => u({ seriesTitle: v })}
                  placeholder="Beyond the Blueprint Season 3"
                />
              </Field>
              <Field label="Series Badge (e.g. STUDY JAM, PEER LAB)">
                <TInput
                  value={d.seriesPill || ""}
                  onChange={(v) => u({ seriesPill: v.toUpperCase() })}
                  placeholder="STUDY JAM"
                />
              </Field>
            </div>
          </div>

          {/* ── CURRICULUM LESSONS (MULTI-DAY WORKSHOPS / PEER LABS) ── */}
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase text-text tracking-wide">
                  📚 Curriculum Lessons (Multi-Day Workshop / Bootcamp)
                </h4>
                <p className="text-[11px] text-text-dim">
                  Add sessions across workshop days with colorful emblems, date &amp; time, and stream links.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/10"
                  onClick={() => {
                    const sampleLessons: EventLesson[] = [
                      {
                        id: `ls-${Date.now()}-1`,
                        date: "08 Sep",
                        time: "07:45PM",
                        title: "Shitty First Drafts",
                        location: "Online",
                        iconColor: "magenta",
                        iconShape: "clover",
                      },
                      {
                        id: `ls-${Date.now()}-2`,
                        date: "15 Sep",
                        time: "07:45PM",
                        title: "Rapid Prototyping & Layouts",
                        location: "Online",
                        iconColor: "green",
                        iconShape: "shield",
                      },
                      {
                        id: `ls-${Date.now()}-3`,
                        date: "22 Sep",
                        time: "07:45PM",
                        title: "Production Architecture",
                        location: "Online",
                        iconColor: "orange",
                        iconShape: "cross",
                      },
                      {
                        id: `ls-${Date.now()}-4`,
                        date: "29 Sep",
                        time: "07:45PM",
                        title: "Demo Day & Shipping",
                        location: "Online",
                        iconColor: "cyan",
                        iconShape: "wings",
                      },
                    ];
                    u({ lessons: sampleLessons });
                  }}
                >
                  ⚡ Preset 4-Day Series
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const next: EventLesson[] = [
                      ...(d.lessons || []),
                      {
                        id: `ls-${Date.now()}`,
                        title: `Lesson ${(d.lessons?.length || 0) + 1}`,
                        date: "08 Sep",
                        time: "07:45PM",
                        location: "Online",
                        iconColor: (["magenta", "green", "orange", "cyan"] as const)[
                          (d.lessons?.length || 0) % 4
                        ],
                        iconShape: (["clover", "shield", "cross", "wings"] as const)[
                          (d.lessons?.length || 0) % 4
                        ],
                      },
                    ];
                    u({ lessons: next });
                  }}
                >
                  <Plus size={12} /> Add Lesson
                </Button>
              </div>
            </div>

            {/* Lesson Cards Editor */}
            <div className="space-y-2.5">
              {(d.lessons || []).map((ls, idx) => (
                <div
                  key={ls.id || idx}
                  className="rounded-[12px] border border-border/80 bg-bg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="shrink-0">
                        <LessonGlyph
                          color={ls.iconColor}
                          shape={ls.iconShape}
                          className="w-7 h-7"
                        />
                      </div>
                      <input
                        className="h-8 flex-1 font-semibold text-xs bg-transparent border-b border-border text-text px-1 outline-none focus:border-[var(--accent)]"
                        placeholder="Lesson title (e.g. Shitty First Drafts)"
                        value={ls.title}
                        onChange={(e) => {
                          const updated = [...(d.lessons || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          u({ lessons: updated });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (d.lessons || []).filter((_, j) => j !== idx);
                        u({ lessons: updated });
                      }}
                      className="text-text-dim hover:text-red-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-text-dim uppercase font-semibold block mb-0.5">
                        Date
                      </span>
                      <input
                        className="h-8 w-full rounded border border-border bg-bg-panel px-2 text-xs text-text"
                        placeholder="e.g. 08 Sep"
                        value={ls.date}
                        onChange={(e) => {
                          const updated = [...(d.lessons || [])];
                          updated[idx] = { ...updated[idx], date: e.target.value };
                          u({ lessons: updated });
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-dim uppercase font-semibold block mb-0.5">
                        Time
                      </span>
                      <input
                        className="h-8 w-full rounded border border-border bg-bg-panel px-2 text-xs text-text"
                        placeholder="e.g. 07:45PM"
                        value={ls.time}
                        onChange={(e) => {
                          const updated = [...(d.lessons || [])];
                          updated[idx] = { ...updated[idx], time: e.target.value };
                          u({ lessons: updated });
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-dim uppercase font-semibold block mb-0.5">
                        Mode / Venue
                      </span>
                      <input
                        className="h-8 w-full rounded border border-border bg-bg-panel px-2 text-xs text-text"
                        placeholder="e.g. Online"
                        value={ls.location}
                        onChange={(e) => {
                          const updated = [...(d.lessons || [])];
                          updated[idx] = { ...updated[idx], location: e.target.value };
                          u({ lessons: updated });
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-dim uppercase font-semibold block mb-0.5">
                        Color Glyph
                      </span>
                      <select
                        className="h-8 w-full rounded border border-border bg-bg-panel px-2 text-xs text-text font-medium"
                        value={ls.iconColor || "magenta"}
                        onChange={(e) => {
                          const updated = [...(d.lessons || [])];
                          const color = e.target.value as EventLesson["iconColor"];
                          const shapeMap = {
                            magenta: "clover",
                            green: "shield",
                            orange: "cross",
                            cyan: "wings",
                          } as const;
                          updated[idx] = {
                            ...updated[idx],
                            iconColor: color,
                            iconShape: shapeMap[color as keyof typeof shapeMap] || "clover",
                          };
                          u({ lessons: updated });
                        }}
                      >
                        <option value="magenta">Magenta Clover</option>
                        <option value="green">Green Shield</option>
                        <option value="orange">Orange Cross</option>
                        <option value="cyan">Cyan Wings</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── EXCLUSIVE GATED RESOURCES ── */}
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase text-text tracking-wide">
                  🎁 Exclusive Event Resources (Gated for Registered Attendees)
                </h4>
                <p className="text-[11px] text-text-dim">
                  Files, slide decks, and repos that only registered pass holders can view and download.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const next: EventResource[] = [
                    ...(d.resources || []),
                    {
                      id: `res-${Date.now()}`,
                      title: `Workshop Slide Deck`,
                      url: "",
                      type: "Slides",
                      isGated: true,
                    },
                  ];
                  u({ resources: next });
                }}
              >
                <Plus size={12} /> Add Resource
              </Button>
            </div>

            <div className="space-y-2">
              {(d.resources || []).map((res, idx) => (
                <div
                  key={res.id || idx}
                  className="rounded-[10px] border border-border/80 bg-bg p-2.5 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap"
                >
                  <input
                    className="h-8 flex-1 min-w-[140px] rounded border border-border bg-bg-panel px-2 text-xs text-text"
                    placeholder="Resource Title (e.g. Session Slides & Figma)"
                    value={res.title}
                    onChange={(e) => {
                      const updated = [...(d.resources || [])];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      u({ resources: updated });
                    }}
                  />
                  <input
                    className="h-8 flex-1 min-w-[160px] rounded border border-border bg-bg-panel px-2 text-xs text-text font-mono"
                    placeholder="URL (https://drive.google.com/...)"
                    value={res.url}
                    onChange={(e) => {
                      const updated = [...(d.resources || [])];
                      updated[idx] = { ...updated[idx], url: e.target.value };
                      u({ resources: updated });
                    }}
                  />
                  <select
                    className="h-8 rounded border border-border bg-bg-panel px-2 text-xs text-text shrink-0"
                    value={res.type || "Slides"}
                    onChange={(e) => {
                      const updated = [...(d.resources || [])];
                      updated[idx] = { ...updated[idx], type: e.target.value };
                      u({ resources: updated });
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
                        const updated = [...(d.resources || [])];
                        updated[idx] = { ...updated[idx], isGated: e.target.checked };
                        u({ resources: updated });
                      }}
                      className="accent-[var(--accent)]"
                    />
                    <span>Gated</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (d.resources || []).filter((_, j) => j !== idx);
                      u({ resources: updated });
                    }}
                    className="text-text-dim hover:text-red-500 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[var(--accent)]"
                checked={d.featured}
                onChange={(e) => u({ featured: e.target.checked })}
              />
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Star
                  size={13}
                  className={
                    d.featured
                      ? "fill-[var(--accent)] text-[var(--accent)]"
                      : "text-text-dim"
                  }
                />
                Featured Event — appears in hero banner at top of /events
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
              placeholder="e.g. LinkedIn Optimization"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
          <p className="text-[11px] text-text-dim max-w-sm">
            Saved events default to <strong className="text-text">Draft</strong> and will not be visible to students until published by the Campus Lead.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="orange"
              size="sm"
              onClick={() => {
                onSave(d);
                onClose();
              }}
            >
              Save Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Universal Event Manager Creation Modal used across all places
 */
export function EventManagerCreateDialog({
  open,
  onClose,
  chapterSlug,
  chapterId,
  initialDateKey,
  onCreated,
  redirectToEvent = true,
}: {
  open: boolean;
  onClose: () => void;
  chapterSlug?: string;
  chapterId?: string;
  initialDateKey?: string;
  onCreated?: (eventId: string, chapterSlug: string) => void;
  redirectToEvent?: boolean;
}) {
  const router = useRouter();
  const { store, createEvent, addEventCategory } = useStore();
  const { session } = useCurrentUser();

  // Determine if the current user is an HQ-level role
  const isHqUser = isHqRole(session.roleKey);

  // Find target chapter
  const resolvedChapter =
    store.chapters.find(
      (c) => c.slug === chapterSlug || c.id === chapterId,
    ) ||
    store.chapters.find((c) => c.id === session.chapterId) ||
    store.chapters[0];

  const [blank, setBlank] = useState<CmsEventItem>(() =>
    createBlankCmsEvent(resolvedChapter?.slug, initialDateKey),
  );

  useEffect(() => {
    if (open) {
      setBlank(createBlankCmsEvent(resolvedChapter?.slug, initialDateKey));
    }
  }, [open, resolvedChapter?.slug, initialDateKey]);

  if (!open) return null;

  async function handleSave(saved: CmsEventItem) {
    const finalCategory = saved.category ? saved.category.trim().toUpperCase() : "WORKSHOP";
    addEventCategory(finalCategory);

    const targetChapter =
      store.chapters.find((c) => c.slug === saved.chapterSlug) ||
      resolvedChapter ||
      store.chapters[0];

    const eventId = isUuid(saved.id) ? saved.id : genUuid();
    const slug = finalizeSlug(saved.slug || saved.title || "event");

    // Resolve ISO startsAt and endsAt
    let startsAt = saved.isoStartDate;
    if (!startsAt && saved.startDate) {
      const parsed = new Date(
        `${saved.startDate} ${saved.startTime || "10:00 AM"}`,
      );
      startsAt = isNaN(parsed.getTime())
        ? new Date().toISOString()
        : parsed.toISOString();
    }
    if (!startsAt) startsAt = new Date().toISOString();

    let endsAt = saved.isoEndDate;
    if (!endsAt && saved.endDate) {
      const parsed = new Date(
        `${saved.endDate} ${saved.endTime || "4:00 PM"}`,
      );
      endsAt = isNaN(parsed.getTime())
        ? new Date(Date.now() + 7200000).toISOString()
        : parsed.toISOString();
    }
    if (!endsAt) endsAt = new Date(Date.now() + 7200000).toISOString();

    // Guardrail: Ensure endsAt is strictly at least 1 hour after startsAt
    const startsAtMs = new Date(startsAt).getTime();
    let endsAtMs = new Date(endsAt).getTime();
    if (isNaN(endsAtMs) || endsAtMs <= startsAtMs) {
      endsAt = new Date(startsAtMs + 2 * 3600 * 1000).toISOString();
      endsAtMs = new Date(endsAt).getTime();
    }

    let registrationStart =
      saved.isoRegistrationStart ||
      (saved.registrationStartDate
        ? new Date(`${saved.registrationStartDate} ${saved.registrationStartTime || "10:00 AM"}`).toISOString()
        : new Date().toISOString());

    let registrationEnd =
      saved.isoRegistrationEnd ||
      (saved.registrationEndDate
        ? new Date(`${saved.registrationEndDate} ${saved.registrationEndTime || "04:00 PM"}`).toISOString()
        : endsAt);

    const regStartMs = new Date(registrationStart).getTime();
    let regEndMs = new Date(registrationEnd).getTime();
    if (isNaN(regEndMs) || regEndMs <= regStartMs) {
      registrationEnd = endsAt;
    }

    const visibility =
      saved.format === "Campus Exclusive" ? "chapter_only" : "open_to_all";

    const chapterEvents = store.events.filter(
      (e) => e.chapterId === targetChapter?.id,
    );

    const storeEvent: StoreEventItem = {
      id: eventId,
      chapterId: targetChapter?.id || "",
      title: saved.title || "Untitled Event",
      slug,
      bannerEmoji: "EVENT",
      summary: saved.tagline || saved.description,
      description:
        saved.fullDescription ||
        saved.description ||
        "Event organized by ELEVATES.",
      venue: saved.venue || "Main Seminar Hall",
      startsAt,
      endsAt,
      organizerId: session.userId,
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
      registrationStart,
      registrationEnd,
      status:
        saved.status === "Completed"
          ? "completed"
          : saved.status === "Cancelled"
          ? "cancelled"
          : saved.publishImmediately !== false
          ? "registration_open"
          : "draft",
      publishedAt: saved.publishImmediately !== false ? new Date().toISOString() : undefined,
      certificateEnabled: true,
      ticketNo: `NO. ${String(chapterEvents.length + 10).padStart(2, "0")}`,
      category: finalCategory,
      topics: saved.topics || [],
      hosts: (saved.hosts || []).filter((h) => h.name.trim() !== ""),
      organizers: (saved.organizer || []).filter((o) => o.name.trim() !== ""),
      organizer: (saved.organizer || []).filter((o) => o.name.trim() !== ""),
      bannerUrl: saved.posterUrl || saved.coverImage || undefined,
      posterUrl: saved.posterUrl || saved.coverImage || undefined,
      thumbnailUrl: saved.thumbnailUrl || saved.posterUrl || saved.coverImage || undefined,
      seriesTitle: saved.seriesTitle || undefined,
      seriesPill: saved.seriesPill || undefined,
      lessons: saved.lessons || [],
      resources: saved.resources || [],
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
              saved.platform.caseStudySlug || slug || "platform-case-study",
            ),
            liveUrl: saved.platform.liveUrl,
            repoUrl: saved.platform.repoUrl,
            highlightMetric: saved.platform.highlightMetric,
            architectureSummary: saved.platform.architectureSummary,
          }
        : undefined,
    };

    const createdEvent = createEvent(storeEvent);
    const finalEventId = createdEvent?.id || eventId;
    const finalSlug = targetChapter?.slug || "main";

    onCreated?.(finalEventId, finalSlug);
    onClose();

    if (redirectToEvent && finalSlug) {
      router.push(`/chapter/${finalSlug}/events/${finalEventId}`);
    }
  }

  return (
    <EventEditor
      event={blank}
      onSave={handleSave}
      onClose={onClose}
      isHqUser={isHqUser}
      lockedChapterName={resolvedChapter?.name}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
import type { EventItem as StoreEventItem } from "@/types";

export type EventStatus = "Completed" | "Upcoming" | "Ongoing" | "Cancelled";
export type EventFormat = "Campus Exclusive" | "Open" | "Online" | "Multi-Campus";
export type EventCategory =
  | "Workshop"
  | "Meetup"
  | "Hackathon"
  | "Challenge"
  | "Showcase"
  | "Lecture"
  | "Lab";

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
  coverImage: string;
  featured: boolean;
  platform?: PlatformCaseStudyRef;
  peerLabSlug?: string;
  peerLabTitle?: string;
  chapterSlug: string;
  chapterName: string;
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
  const endDate = startDate;
  const startTime = times.displayStartTime;
  const endTime = times.displayEndTime;
  const isoStartDate = times.isoStartDate;
  const isoEndDate = times.isoEndDate;

  return {
    id: `evt-${Date.now()}`,
    slug: "",
    title: "",
    tagline: "",
    description: "",
    fullDescription: "",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Upcoming",
    startDate,
    endDate,
    startTime,
    endTime,
    isoStartDate,
    isoEndDate,
    venue: "Main Seminar Hall",
    locationName: "",
    organizer: [{ name: "ELEVATES" }],
    hosts: [{ name: "", role: "" }],
    topics: [],
    attendeesCount: 0,
    coverImage: "",
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
  const { store } = useStore();
  const [d, setD] = useState<CmsEventItem>(event);
  const u = (patch: Partial<CmsEventItem>) =>
    setD((prev) => ({ ...prev, ...patch }));

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <Field label="Category">
              <select
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
                value={d.category}
                onChange={(e) =>
                  u({ category: e.target.value as EventCategory })
                }
              >
                {[
                  "Workshop",
                  "Meetup",
                  "Hackathon",
                  "Challenge",
                  "Showcase",
                  "Lecture",
                  "Lab",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
                value={d.status}
                onChange={(e) =>
                  u({ status: e.target.value as EventStatus })
                }
              >
                {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Attendees Count">
              <input
                type="number"
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                value={d.attendeesCount}
                onChange={(e) =>
                  u({ attendeesCount: parseInt(e.target.value) || 0 })
                }
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

        <div className="flex justify-end gap-3 border-t border-border p-5">
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
  const { store, createEvent } = useStore();
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
    const targetChapter =
      store.chapters.find((c) => c.slug === saved.chapterSlug) ||
      resolvedChapter ||
      store.chapters[0];

    const eventId = saved.id || `evt-${Date.now()}`;
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
      waitlistCapacity: 15,
      visibility,
      mode:
        saved.format === "Online"
          ? "online"
          : saved.format === "Multi-Campus"
          ? "hybrid"
          : "in_person",
      registrationStart: new Date().toISOString(),
      registrationEnd: endsAt,
      status:
        saved.status === "Completed"
          ? "completed"
          : saved.status === "Cancelled"
          ? "cancelled"
          : "registration_open",
      certificateEnabled: true,
      ticketNo: `NO. ${String(chapterEvents.length + 10).padStart(2, "0")}`,
      category: saved.category?.toUpperCase() || "WORKSHOP",
      topics: saved.topics || [],
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
              saved.platform.caseStudySlug || slug || "platform-case-study",
            ),
            liveUrl: saved.platform.liveUrl,
            repoUrl: saved.platform.repoUrl,
            highlightMetric: saved.platform.highlightMetric,
            architectureSummary: saved.platform.architectureSummary,
          }
        : undefined,
    };

    createEvent(storeEvent);

    onCreated?.(eventId, targetChapter?.slug || "main");
    onClose();

    if (redirectToEvent && targetChapter?.slug) {
      router.push(`/chapter/${targetChapter.slug}/events/${eventId}`);
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

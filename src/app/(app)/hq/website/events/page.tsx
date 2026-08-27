"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/context/store-context";
import Link from "next/link";
import {
  Building2,
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
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventStatus = "Completed" | "Upcoming" | "Ongoing" | "Cancelled";
type EventFormat = "Campus Exclusive" | "Open" | "Online" | "Multi-Campus";
type EventCategory = "Workshop" | "Meetup" | "Hackathon" | "Challenge" | "Showcase" | "Lecture" | "Lab";

interface Host { name: string; role: string; }
interface Organizer { name: string; }

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
  coverImage: string;
  featured: boolean;
  platform?: PlatformCaseStudyRef;
  peerLabSlug?: string;
  peerLabTitle?: string;
  chapterSlug: string;
  chapterName: string;
}

const STATUS_TONE: Record<EventStatus, "green" | "orange" | "mute" | "magenta"> = {
  Completed: "mute", Upcoming: "green", Ongoing: "orange", Cancelled: "magenta",
};

// ── DYNAMIC EVENTS STORED IN SUPABASE ────────────
const ALL_19_EVENTS: EventItem[] = [];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}
function TInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${mono ? "font-mono" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
function TArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea rows={rows} className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
function StrList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder={placeholder} value={item}
            onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, ""])}><Plus size={12} /> Add</Button>
    </div>
  );
}
function HostList({ hosts, onChange }: { hosts: Host[]; onChange: (v: Host[]) => void }) {
  return (
    <div className="space-y-2">
      {hosts.map((h, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <input className="h-8 flex-1 min-w-[140px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Speaker/Host name" value={h.name}
            onChange={(e) => { const n = [...hosts]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }} />
          <input className="h-8 flex-1 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Role / Company / Title" value={h.role}
            onChange={(e) => { const n = [...hosts]; n[i] = { ...n[i], role: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(hosts.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...hosts, { name: "", role: "" }])}><Plus size={12} /> Add Speaker/Host</Button>
    </div>
  );
}
function OrgList({ orgs, onChange }: { orgs: Organizer[]; onChange: (v: Organizer[]) => void }) {
  return (
    <div className="space-y-2">
      {orgs.map((o, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Organizer name" value={o.name}
            onChange={(e) => { const n = [...orgs]; n[i] = { name: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(orgs.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...orgs, { name: "" }])}><Plus size={12} /> Add Organizer</Button>
    </div>
  );
}

function EventEditor({ event, onSave, onClose }: { event: EventItem; onSave: (e: EventItem) => void; onClose: () => void }) {
  const { store } = useStore();
  const [d, setD] = useState<EventItem>(event);
  const u = (patch: Partial<EventItem>) => setD((prev) => ({ ...prev, ...patch }));

  const currentPlatform = d.platform ?? {
    enabled: false, platformName: "", tagline: "", caseStudySlug: "",
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
              {event.id ? "Edit Event" : "Create New Event"}
            </h3>
            <p className="text-[11px] text-text-dim font-mono mt-0.5">elevates.live/events/{d.slug}</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text p-1.5 rounded-full hover:bg-bg-page"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Main Info */}
          <div className="space-y-4">
            <Field label="Event Title (displayed in UPPERCASE on /events)">
              <input className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-sm font-bold uppercase text-text tracking-tight"
                value={d.title} onChange={(e) => u({ title: e.target.value })} placeholder="VIBE CODING WORKSHOP" />
            </Field>

            {/* Chapter Linkage */}
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

            <Field label="Slug (URL path)">
              <TInput value={d.slug} onChange={(v) => u({ slug: v })} mono placeholder="vibe-coding-brototype" />
            </Field>
            <Field label="Tagline (appears under title on event card)">
              <TInput value={d.tagline} onChange={(v) => u({ tagline: v })} placeholder="Build, Create & Innovate · AI-Assisted Development" />
            </Field>
            <Field label="Description (card preview text — 1-2 sentences)">
              <TArea value={d.description} onChange={(v) => u({ description: v })} rows={2} placeholder="Short description for event card..." />
            </Field>
            <Field label="Full Description (complete writeup shown on detail page)">
              <TArea value={d.fullDescription} onChange={(v) => u({ fullDescription: v })} rows={6} placeholder="Full event description..." />
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
                    If enabled, this event links to a verified case study on /projects/[slug] with metrics & architecture proof.
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
                      onChange={(v) => updatePlatform({ caseStudySlug: v })}
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
                      onChange={(v) => updatePlatform({ highlightMetric: v || undefined })}
                      placeholder="400,000 requests in 24h"
                    />
                  </Field>
                  <Field label="Architecture Summary">
                    <TInput
                      value={currentPlatform.architectureSummary ?? ""}
                      onChange={(v) => updatePlatform({ architectureSummary: v || undefined })}
                      placeholder="Next.js 15, PostgreSQL, Edge QR API"
                    />
                  </Field>
                </div>

                <div className="text-[11px] text-[var(--accent)] font-medium flex items-center gap-1 pt-1">
                  <Sparkles size={12} />
                  Badge will display: <code className="font-mono bg-[var(--accent)]/15 px-1 rounded">⚡ Platform Built ({currentPlatform.caseStudySlug})</code>
                </div>
              </div>
            )}
          </div>

          {/* Meta Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Format">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.format} onChange={(e) => u({ format: e.target.value as EventFormat })}>
                {["Campus Exclusive", "Open", "Online", "Multi-Campus"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.category} onChange={(e) => u({ category: e.target.value as EventCategory })}>
                {["Workshop", "Meetup", "Hackathon", "Challenge", "Showcase", "Lecture", "Lab"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.status} onChange={(e) => u({ status: e.target.value as EventStatus })}>
                {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Attendees Count">
              <input type="number" className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text" value={d.attendeesCount}
                onChange={(e) => u({ attendeesCount: parseInt(e.target.value) || 0 })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date (display)"><TInput value={d.startDate} onChange={(v) => u({ startDate: v })} placeholder="Jul 22, 2026" /></Field>
            <Field label="End Date (display)"><TInput value={d.endDate} onChange={(v) => u({ endDate: v })} placeholder="Jul 22, 2026" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time"><TInput value={d.startTime} onChange={(v) => u({ startTime: v })} placeholder="10:00 AM" /></Field>
            <Field label="End Time"><TInput value={d.endTime} onChange={(v) => u({ endTime: v })} placeholder="4:00 PM" /></Field>
          </div>

          <Field label="Venue"><TInput value={d.venue} onChange={(v) => u({ venue: v })} placeholder="Main Seminar Hall / Campus Auditorium" /></Field>
          <Field label="Cover Image Path"><TInput value={d.coverImage} onChange={(v) => u({ coverImage: v })} mono placeholder="/images/events/my-event.jpeg" /></Field>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={d.featured}
                onChange={(e) => u({ featured: e.target.checked })} />
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Star size={13} className={d.featured ? "fill-[var(--accent)] text-[var(--accent)]" : "text-text-dim"} />
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
            <StrList items={d.topics} onChange={(v) => u({ topics: v })} placeholder="e.g. LinkedIn Optimization" />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => { onSave(d); onClose(); }}>Save Event</Button>
        </div>
      </div>
    </div>
  );
}

export default function EventsCMSPage() {
  const { store } = useStore();
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    if (store.events && store.events.length > 0) {
      const dynamicEvents: EventItem[] = store.events.map((e) => ({
        id: e.id,
        slug: e.slug || e.id,
        title: e.title,
        tagline: e.summary || e.description || "",
        description: e.description || "",
        fullDescription: e.description || "",
        format: "Campus Exclusive",
        category: (e.category as EventCategory) || "Workshop",
        status: ((e.status as string) === "completed" ? "Completed" : (e.status as string) === "registration_open" ? "Ongoing" : "Upcoming") as EventStatus,
        startDate: e.startsAt ? new Date(e.startsAt).toLocaleDateString() : "",
        endDate: e.endsAt ? new Date(e.endsAt).toLocaleDateString() : "",
        startTime: e.startsAt ? new Date(e.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        endTime: e.endsAt ? new Date(e.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        isoStartDate: e.startsAt || "",
        isoEndDate: e.endsAt || "",
        venue: e.venue || "Seminar Hall",
        locationName: "",
        organizer: [{ name: "ELEVATES" }],
        hosts: [],
        topics: [],
        attendeesCount: 50,
        coverImage: e.bannerUrl || "",
        featured: true,
        chapterSlug: store.chapters.find((c) => c.id === e.chapterId)?.slug || store.chapters[0]?.slug || "ch-main",
        chapterName: store.chapters.find((c) => c.id === e.chapterId)?.name || store.chapters[0]?.name || "Campus Chapter",
      }));
      setEvents(dynamicEvents);
    }
  }, [store.events, store.chapters]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");
  const [filterChapter, setFilterChapter] = useState<string>("all");
  const [filterPlatformOnly, setFilterPlatformOnly] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const q = search.toLowerCase();
  const filtered = events.filter((e) => {
    const matchQ = e.title.toLowerCase().includes(q) || e.tagline.toLowerCase().includes(q) || e.hosts.some((h) => h.name.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchChapter = filterChapter === "all" || e.chapterSlug === filterChapter;
    const matchPlatform = !filterPlatformOnly || e.platform?.enabled;
    return matchQ && matchStatus && matchChapter && matchPlatform;
  });

  const blank = (): EventItem => ({
    id: `evt-${Date.now()}`, slug: "", title: "", tagline: "", description: "", fullDescription: "",
    format: "Campus Exclusive", category: "Workshop", status: "Upcoming",
    startDate: "", endDate: "", startTime: "", endTime: "",
    isoStartDate: "", isoEndDate: "",
    venue: "Main Seminar Hall", locationName: "",
    organizer: [{ name: "ELEVATES" }], hosts: [{ name: "", role: "" }],
    topics: [], attendeesCount: 0, coverImage: "", featured: false,
    platform: { enabled: false, platformName: "", tagline: "", caseStudySlug: "" },
    chapterSlug: store.chapters[0]?.slug || "ch-main", chapterName: store.chapters[0]?.name || "Campus Chapter",
  });

  const platformEventsCount = events.filter((e) => e.platform?.enabled).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="Events & Workshops"
        description="All authentic ELEVATES workshops, meetups, hackathons, and challenges across Kerala. Seamlessly linked to campus chapters and software case studies."
        actions={
          <Button size="sm" variant="orange" onClick={() => { setEditing(blank()); setIsNew(true); }}>
            <Plus size={14} /> New Event
          </Button>
        }
      />

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{events.length}</p>
          <p className="text-xs text-text-dim">Total Events</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-[var(--accent)] flex items-center gap-1">
            <Laptop size={20} /> {platformEventsCount}
          </p>
          <p className="text-xs text-text-dim">Built Custom Software Platform</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{events.filter((e) => e.status === "Completed").length}</p>
          <p className="text-xs text-text-dim">Completed</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">
            {events.reduce((sum, e) => sum + e.attendeesCount, 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-dim">Total Attendees</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input placeholder="Search all events or speakers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        {/* Chapter Filter */}
        <select
          className="h-9 rounded-[var(--radius-md)] border border-border bg-bg-panel px-3 text-xs text-text"
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
        >
          <option value="all">All Chapters</option>
          {store.chapters.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select className="h-9 rounded-[var(--radius-md)] border border-border bg-bg-panel px-3 text-xs text-text" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as EventStatus | "all")}>
          <option value="all">All Statuses</option>
          {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={() => setFilterPlatformOnly(!filterPlatformOnly)}
          className={`h-9 px-3 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors flex items-center gap-1.5 ${
            filterPlatformOnly
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "bg-bg-panel text-text-dim border-border hover:text-text"
          }`}
        >
          <Laptop size={13} />
          Built Platforms Only ({platformEventsCount})
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filtered.map((evt) => (
          <div key={evt.id} className={`rounded-[var(--radius-xl)] border ${evt.platform?.enabled ? "border-[var(--accent)]/40 bg-[var(--accent)]/3" : "border-border bg-bg-panel"} transition-colors p-5`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge tone={STATUS_TONE[evt.status]}>{evt.status}</Badge>
                  <Badge tone="cyan">{evt.category}</Badge>
                  <Badge tone="mute">{evt.format}</Badge>
                  {evt.featured && (
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] flex items-center gap-0.5">
                      <Star size={10} className="fill-[var(--accent)]" /> Featured
                    </span>
                  )}
                  {evt.platform?.enabled && (
                    <span className="text-[10px] font-mono font-bold text-white bg-[var(--accent)] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Laptop size={10} /> ⚡ Platform Built: {evt.platform.platformName}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-dim">/{evt.slug}</span>
                </div>

                {/* Title & Tagline */}
                <h3 className="font-[family-name:var(--font-display)] font-bold text-text text-base uppercase tracking-tight">{evt.title}</h3>
                <p className="text-xs text-text-dim mt-0.5 italic">{evt.tagline}</p>

                {/* Chapter Association Badge */}
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href={`/chapter/${evt.chapterSlug || store.chapters?.[0]?.slug || "main"}/events`}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-text bg-bg-page border border-border px-2.5 py-1 rounded-[var(--radius-md)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    <Building2 size={12} className="text-[var(--accent)]" />
                    <span>{evt.chapterName || "Campus Chapter"}</span>
                    <span className="text-text-dim text-[10px]">↗</span>
                  </Link>
                </div>

                {/* Platform Card Callout if built */}
                {evt.platform?.enabled && (
                  <div className="mt-3 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-bg-page flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs">
                      <span className="font-bold text-text">{evt.platform.platformName}</span>
                      {evt.platform.highlightMetric && (
                        <span className="ml-2 font-mono text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded">
                          {evt.platform.highlightMetric}
                        </span>
                      )}
                      <p className="text-[11px] text-text-dim mt-0.5">{evt.platform.tagline}</p>
                    </div>
                    <Link
                      href="/hq/website/projects"
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[var(--accent)] hover:underline"
                    >
                      <FileText size={12} /> Open Case Study ({evt.platform.caseStudySlug}) ↗
                    </Link>
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-mono text-text-dim">
                  <span>📅 {evt.startDate} {evt.startTime !== evt.endTime ? `${evt.startTime} – ${evt.endTime}` : ""}</span>
                  <span>📍 {evt.venue.split(",")[0]}</span>
                  <span>👥 {evt.attendeesCount} attendees</span>
                </div>

                {/* Hosts */}
                {evt.hosts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {evt.hosts.map((h, i) => (
                      <span key={i} className="text-[10px] font-mono bg-bg-page border border-border px-2 py-0.5 rounded text-text">
                        🎙️ {h.name} <span className="text-text-dim">· {h.role}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => { setEditing(evt); setIsNew(false); }}><Edit size={13} /> Edit</Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={async () => {
                  if (confirm(`Delete event "${evt.title}"?`)) {
                    setEvents((prev) => prev.filter((x) => x.id !== evt.id));
                    try {
                      await fetch("/api/mutations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "delete_event", data: { id: evt.id, slug: evt.slug } }),
                      });
                    } catch (e) {
                      console.error("Failed to delete event in DB:", e);
                    }
                  }
                }}><Trash2 size={13} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EventEditor event={editing} onClose={() => { setEditing(null); setIsNew(false); }}
          onSave={async (saved) => {
            if (isNew) setEvents((prev) => [saved, ...prev]);
            else setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
            
            // Persist to Supabase and revalidate cache
            try {
              const payload = {
                id: saved.id,
                chapterId: store.chapters.find((c) => c.slug === saved.chapterSlug)?.id || store.chapters?.[0]?.id || "",
                title: saved.title,
                slug: saved.slug,
                summary: saved.tagline || saved.description,
                description: saved.fullDescription || saved.description,
                venue: saved.venue,
                startsAt: saved.isoStartDate || new Date().toISOString(),
                endsAt: saved.isoEndDate || new Date(Date.now() + 7200000).toISOString(),
                capacity: saved.attendeesCount || 60,
                status: saved.status?.toLowerCase() === "upcoming" ? "upcoming" : "completed",
                bannerUrl: saved.coverImage || "/images/og-default.png",
                category: saved.category,
                visibility: "public",
              };
              await fetch("/api/mutations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "event", data: payload }),
              });
            } catch (err) {
              console.error("Failed to persist event:", err);
            }
          }}
        />
      )}
    </div>
  );
}

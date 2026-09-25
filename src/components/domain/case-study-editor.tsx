"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Layers,
  Sparkles,
  BookOpen,
  BarChart3,
  Wrench,
  ShieldCheck,
  History,
  Users,
  Code2,
  Image as ImageIcon,
  ExternalLink,
  Check,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import type { Project, ProjectStage, ProjectType } from "@/types";

export type ProjectStatus =
  | "live"
  | "live-incomplete"
  | "live-unmaintained"
  | "paused"
  | "archived"
  | "never-launched";

export interface Metric {
  value: string;
  label: string;
}

export interface Builder {
  name: string;
  role: string;
  founderId?: string;
  did?: string;
  userId?: string;
}

export interface Contributor {
  name: string;
  detail: string;
  did?: string;
  userId?: string;
}

export interface Faculty {
  name: string;
  detail: string;
}

export interface GalleryItem {
  src: string;
  caption: string;
}

export interface SituationSection {
  title: string;
  paragraphs: string[];
  highlight: string;
}

export interface HowItHeldUp {
  summary: string;
  metrics: Metric[];
  details: string[];
}

export interface StackAndCode {
  technologies: string[];
  repoUrl: string | null;
  repoNote: string;
}

export interface FlagshipProject {
  id: string;
  slug: string;
  title: string;
  client: string;
  date: string;
  type: "flagship" | "open-tool" | "internal";
  status: ProjectStatus;
  tagline: string;
  summary: string;
  metrics: Metric[];
  stack: string[];
  repo: string | null;
  live: string | null;
  cover: string;
  situation: SituationSection;
  numbers: Metric[];
  whatWeBuilt: string[];
  howItHeldUp: HowItHeldUp;
  whatWeWouldDoDifferently: string[];
  builders: Builder[];
  contributors: Contributor[];
  faculty: Faculty[];
  stackAndCode: StackAndCode;
  gallery: GalleryItem[];
  chapterId?: string;
  clusterId?: string;
}

export const CS_PREFIX = "<!--elevates:casestudy:";
export const CS_SUFFIX = "-->";

/**
 * Embeds full 9-tab case study metadata inside a project description.
 * This ensures full persistence across reloads and syncs without schema alterations.
 */
export function embedCaseStudyInDescription(
  notes: string | undefined | null,
  caseStudy: Partial<FlagshipProject>,
): string {
  const clean = (notes || "").replace(/<!--elevates:casestudy:[\s\S]*?-->/g, "").trim();
  const payload = JSON.stringify(caseStudy);
  return clean ? `${clean}\n\n${CS_PREFIX}${payload}${CS_SUFFIX}` : `${CS_PREFIX}${payload}${CS_SUFFIX}`;
}

/**
 * Extracts embedded 9-tab case study metadata from description if present.
 */
export function extractCaseStudyFromDescription(
  notes: string | undefined | null,
): { cleanDescription: string; caseStudyData?: Partial<FlagshipProject> } {
  if (!notes) return { cleanDescription: "" };
  const match = notes.match(/<!--elevates:casestudy:([\s\S]*?)-->/);
  const cleanDescription = notes.replace(/<!--elevates:casestudy:[\s\S]*?-->/g, "").trim();
  if (!match) return { cleanDescription };
  try {
    const caseStudyData = JSON.parse(match[1]) as Partial<FlagshipProject>;
    return { cleanDescription, caseStudyData };
  } catch {
    return { cleanDescription };
  }
}

/**
 * Generates an empty default Case Study template.
 */
export function blankCaseStudy(chapterId?: string, clientName?: string): FlagshipProject {
  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
    slug: "",
    title: "",
    client: clientName || "Campus Chapter",
    date: `${monthName} ${now.getFullYear()}`,
    type: "flagship",
    status: "live",
    tagline: "",
    summary: "",
    metrics: [
      { value: "100%", label: "Campus Adoption" },
      { value: "0ms", label: "Downtime" },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
    repo: null,
    live: null,
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Problem We Solved",
      paragraphs: ["Describe the problem faced on campus or by the community that made building this platform necessary."],
      highlight: "State the bold single-sentence core challenge your team took on.",
    },
    numbers: [
      { value: "1", label: "Production platform shipped" },
      { value: "100%", label: "Real-time accuracy" },
    ],
    whatWeBuilt: [
      "Custom architecture designed for campus-scale load",
      "Production deployment with zero downtime",
    ],
    howItHeldUp: {
      summary: "Peak load arrived during launch. The system held up under live concurrent user traffic.",
      metrics: [
        { value: "100%", label: "Uptime during event" },
      ],
      details: ["Zero database connection pool bottlenecks observed."],
    },
    whatWeWouldDoDifferently: [
      "Ship earlier user feedback collection cycles.",
    ],
    builders: [{ name: "", role: "Lead Developer" }],
    contributors: [],
    faculty: [],
    stackAndCode: {
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL"],
      repoUrl: null,
      repoNote: "Production software built for campus operations.",
    },
    gallery: [],
    chapterId,
  };
}

/**
 * Parses an existing Project into a full FlagshipProject instance,
 * restoring all 9 tabs if metadata was embedded, or creating a rich representation.
 */
export function parseProjectToCaseStudy(p: Project, defaultClient?: string): FlagshipProject {
  const { cleanDescription, caseStudyData } = extractCaseStudyFromDescription(p.description);

  const fallback: FlagshipProject = {
    id: p.id,
    slug: p.slug || finalizeSlug(p.title || "project"),
    title: p.title || "",
    client: defaultClient || "Campus Chapter",
    date: "2026",
    type: (p.projectType === "open_source" ? "open-tool" : "flagship") as "flagship" | "open-tool" | "internal",
    status: p.stage === "showcase" ? "live" : p.stage === "building" ? "paused" : "live",
    tagline: cleanDescription || p.title,
    summary: cleanDescription || p.title,
    metrics: [{ value: `${p.progress || 100}%`, label: "Progress" }],
    stack: ["TypeScript", "Next.js", "Supabase"],
    repo: p.repositoryUrl || null,
    live: p.demoUrl || null,
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: p.title,
      paragraphs: [cleanDescription || "Built by student engineers at Elevates."],
      highlight: cleanDescription || p.title,
    },
    numbers: [{ value: `${p.progress || 100}%`, label: "Progress" }],
    whatWeBuilt: p.awards && p.awards.length > 0 ? p.awards : ["Production software release"],
    howItHeldUp: {
      summary: "Operational in production environment.",
      metrics: [],
      details: ["System running reliably on campus infrastructure."],
    },
    whatWeWouldDoDifferently: [],
    builders: [],
    contributors: [],
    faculty: [],
    stackAndCode: {
      technologies: ["TypeScript", "Next.js", "Supabase"],
      repoUrl: p.repositoryUrl || null,
      repoNote: "Project repository.",
    },
    gallery: [],
    chapterId: p.chapterId,
    clusterId: p.clusterId,
  };

  if (caseStudyData) {
    return {
      ...fallback,
      ...caseStudyData,
      id: p.id,
      title: p.title || caseStudyData.title || fallback.title,
      slug: p.slug || caseStudyData.slug || fallback.slug,
      chapterId: p.chapterId || caseStudyData.chapterId,
      clusterId: p.clusterId || caseStudyData.clusterId,
      repo: p.repositoryUrl || caseStudyData.repo || null,
      live: p.demoUrl || caseStudyData.live || null,
      tagline: caseStudyData.tagline || cleanDescription || fallback.tagline,
      summary: caseStudyData.summary || cleanDescription || fallback.summary,
    };
  }

  return fallback;
}

/**
 * Serializes a FlagshipProject into a Project object ready for Supabase and Store persistence.
 */
export function serializeCaseStudyToProject(
  cs: FlagshipProject,
  chapterId: string,
  current?: Partial<Project>,
): Project {
  const cleanSummary = (cs.summary || cs.tagline || cs.title || "").trim();
  const description = embedCaseStudyInDescription(cleanSummary, cs);
  const slug = finalizeSlug(cs.slug || cs.title || "project");

  let stage: ProjectStage = "showcase";
  if (cs.status === "paused") stage = "building";
  else if (cs.status === "archived") stage = "demo";
  else if (cs.status === "never-launched") stage = "idea";

  let projectType: ProjectType = "campus";
  if (cs.type === "open-tool") projectType = "open_source";
  else if (cs.type === "internal") projectType = "internal";

  return {
    id: cs.id,
    chapterId,
    clusterId: cs.clusterId || current?.clusterId,
    title: cs.title.trim(),
    slug,
    description,
    stage,
    projectType,
    teamIds: current?.teamIds || [],
    mentorId: current?.mentorId,
    repositoryUrl: cs.repo || cs.stackAndCode?.repoUrl || undefined,
    demoUrl: cs.live || undefined,
    progress: cs.status === "live" ? 100 : 75,
    awards: cs.whatWeBuilt.filter(Boolean),
    isShowcased: true,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">{label}</label>
        {hint ? <span className="text-[10px] text-text-mute">{hint}</span> : null}
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
      className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none ${mono ? "font-mono" : ""}`}
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
      className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none transition-colors focus:border-[var(--accent)] focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function MetricRows({ items, onChange }: { items: Metric[]; onChange: (v: Metric[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((m, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="h-8 w-28 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs font-mono text-text focus:border-[var(--accent)] focus:outline-none"
            placeholder="Value (e.g. 400k)"
            value={m.value}
            onChange={(e) => {
              const n = [...items];
              n[i] = { ...n[i], value: e.target.value };
              onChange(n);
            }}
          />
          <input
            className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text focus:border-[var(--accent)] focus:outline-none"
            placeholder="Label (e.g. requests in 24h)"
            value={m.label}
            onChange={(e) => {
              const n = [...items];
              n[i] = { ...n[i], label: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-red-500 p-1.5 transition-colors"
            title="Remove metric"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-[11px] h-7 text-[var(--accent)] hover:bg-[var(--accent)]/10"
        onClick={() => onChange([...items, { value: "", label: "" }])}
      >
        <Plus size={12} className="mr-1" /> Add Metric
      </Button>
    </div>
  );
}

function StrList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <textarea
            rows={2}
            className="flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-1.5 text-xs text-text resize-none focus:border-[var(--accent)] focus:outline-none"
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
            className="text-text-dim hover:text-red-500 p-1.5 mt-1 transition-colors"
            title="Remove item"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-[11px] h-7 text-[var(--accent)] hover:bg-[var(--accent)]/10"
        onClick={() => onChange([...items, ""])}
      >
        <Plus size={12} className="mr-1" /> Add Item
      </Button>
    </div>
  );
}

function PersonList({
  items,
  onChange,
  nameLabel,
  roleLabel,
  memberOptions,
}: {
  items: Array<{ name: string; role?: string; detail?: string; did?: string; userId?: string }>;
  onChange: (v: typeof items) => void;
  nameLabel: string;
  roleLabel: string;
  memberOptions?: Array<{ id: string; fullName: string; role?: string }>;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((b, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap bg-bg-page/50 p-2 rounded-[var(--radius-md)] border border-border">
          {memberOptions && memberOptions.length > 0 ? (
            <select
              className="h-8 max-w-[130px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-[11px] text-text"
              value={b.userId || ""}
              onChange={(e) => {
                const found = memberOptions.find((m) => m.id === e.target.value);
                const n = [...items];
                if (found) {
                  n[i] = {
                    ...n[i],
                    name: found.fullName,
                    userId: found.id,
                    role: n[i].role || found.role || "Lead Developer",
                  };
                } else {
                  n[i] = { ...n[i], userId: undefined };
                }
                onChange(n);
              }}
            >
              <option value="">Quick Pick Member</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="h-8 flex-1 min-w-[130px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text focus:border-[var(--accent)] focus:outline-none"
            placeholder={nameLabel}
            value={b.name}
            onChange={(e) => {
              const n = [...items];
              n[i] = { ...n[i], name: e.target.value };
              onChange(n);
            }}
          />
          <input
            className="h-8 flex-1 min-w-[160px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text focus:border-[var(--accent)] focus:outline-none"
            placeholder={roleLabel}
            value={b.role ?? b.detail ?? ""}
            onChange={(e) => {
              const n = [...items];
              n[i] = { ...n[i], role: e.target.value, detail: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-red-500 p-1.5 transition-colors"
            title="Remove person"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-[11px] h-7 text-[var(--accent)] hover:bg-[var(--accent)]/10"
        onClick={() => onChange([...items, { name: "", role: "" }])}
      >
        <Plus size={12} className="mr-1" /> Add Person
      </Button>
    </div>
  );
}

export type CaseStudyTab =
  | "overview"
  | "situation"
  | "numbers"
  | "built"
  | "held"
  | "retro"
  | "team"
  | "stack"
  | "gallery";

export const CASE_STUDY_TABS: { key: CaseStudyTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Layers size={13} /> },
  { key: "situation", label: "Situation", icon: <BookOpen size={13} /> },
  { key: "numbers", label: "Numbers", icon: <BarChart3 size={13} /> },
  { key: "built", label: "What We Built", icon: <Wrench size={13} /> },
  { key: "held", label: "How It Held Up", icon: <ShieldCheck size={13} /> },
  { key: "retro", label: "Retro", icon: <History size={13} /> },
  { key: "team", label: "Team & Credits", icon: <Users size={13} /> },
  { key: "stack", label: "Stack & Code", icon: <Code2 size={13} /> },
  { key: "gallery", label: "Gallery", icon: <ImageIcon size={13} /> },
];

export interface CaseStudyEditorProps {
  project: FlagshipProject;
  onSave: (p: FlagshipProject) => Promise<void> | void;
  onClose: () => void;
  chapterName?: string;
  chapterMembers?: Array<{ id: string; fullName: string; role?: string }>;
  clusters?: Array<{ id: string; name: string }>;
  isSaving?: boolean;
}

export function CaseStudyEditor({
  project,
  onSave,
  onClose,
  chapterName,
  chapterMembers,
  clusters,
  isSaving = false,
}: CaseStudyEditorProps) {
  const [d, setD] = useState<FlagshipProject>(project);
  const [tab, setTab] = useState<CaseStudyTab>("overview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const u = (patch: Partial<FlagshipProject>) => setD((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!d.title.trim()) {
      setErrorMsg("Please enter a project title.");
      setTab("overview");
      return;
    }
    const cleanSlug = finalizeSlug(d.slug || d.title || "case-study");
    if (!cleanSlug) {
      setErrorMsg("A valid URL slug is required.");
      setTab("overview");
      return;
    }
    setErrorMsg(null);
    const finalProject: FlagshipProject = {
      ...d,
      title: d.title.trim(),
      slug: cleanSlug,
      client: d.client.trim() || chapterName || "Campus Chapter",
    };
    await onSave(finalProject);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="my-8 w-full max-w-4xl rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-bg-page/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 items-center rounded-full bg-[var(--accent)]/15 px-2 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                Flagship Proof
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                {d.title ? `Edit Case Study: ${d.title}` : "New Flagship Case Study"}
              </h3>
            </div>
            <p className="text-[11px] text-text-dim mt-0.5 font-mono">
              elevates.live/projects/{d.slug || finalizeSlug(d.title || "slug")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-dim hover:bg-bg-panel hover:text-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-1 px-4 pt-2 border-b border-border bg-bg-page/30">
          {CASE_STUDY_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? "border-[var(--accent)] text-text bg-bg-panel rounded-t-[var(--radius-md)]"
                  : "border-transparent text-text-dim hover:text-text"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {errorMsg ? (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-[var(--radius-md)] text-xs text-red-600 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        ) : null}

        {/* Tab Content Panels */}
        <div className="p-6 space-y-5 max-h-[62vh] overflow-y-auto">
          {tab === "overview" && (
            <>
              <Field label="Project / Case Study Title" hint="Display headline for the platform">
                <TInput
                  placeholder="e.g. Vibranium Event Platform"
                  value={d.title}
                  onChange={(v) => {
                    const currentAuto = finalizeSlug(d.title);
                    const isAuto = !d.slug || d.slug === currentAuto;
                    const autoSlug = isAuto ? finalizeSlug(v) : d.slug;
                    u({ title: v, slug: autoSlug });
                  }}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="URL Slug" hint="Unique link on elevates.live/projects/">
                  <TInput
                    value={d.slug}
                    onChange={(v) => u({ slug: formatSlugInput(v) })}
                    onBlur={() => u({ slug: finalizeSlug(d.slug) })}
                    mono
                    placeholder="vibranium-event-platform"
                  />
                </Field>
                <Field label="Production Status" hint="Live status indicator">
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none"
                    value={d.status}
                    onChange={(e) => u({ status: e.target.value as ProjectStatus })}
                  >
                    <option value="live">Live (Active Production)</option>
                    <option value="live-incomplete">Live Incomplete</option>
                    <option value="live-unmaintained">Live Unmaintained</option>
                    <option value="paused">Paused / In Development</option>
                    <option value="archived">Archived</option>
                    <option value="never-launched">Never Launched</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Client / Deployment Venue">
                  <TInput
                    value={d.client}
                    onChange={(v) => u({ client: v })}
                    placeholder={chapterName ? `${chapterName} TechFest` : "Campus TechFest"}
                  />
                </Field>
                <Field label="Launch Date">
                  <TInput
                    value={d.date}
                    onChange={(v) => u({ date: v })}
                    placeholder="October 2025"
                  />
                </Field>
                <Field label="Platform Type">
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none"
                    value={d.type}
                    onChange={(e) => u({ type: e.target.value as "flagship" | "open-tool" | "internal" })}
                  >
                    <option value="flagship">Flagship Case Study</option>
                    <option value="open-tool">Open Tool / Public Utility</option>
                    <option value="internal">Internal Operational System</option>
                  </select>
                </Field>
              </div>

              {clusters && clusters.length > 0 ? (
                <Field label="Linked Chapter Cluster (Optional)">
                  <select
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none"
                    value={d.clusterId || ""}
                    onChange={(e) => u({ clusterId: e.target.value || undefined })}
                  >
                    <option value="">No Cluster Assigned</option>
                    {clusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <Field label="Punchy Tagline (hero callout & card hook)">
                <TInput
                  placeholder="Five days to build it. 400,000 requests in the first 24 hours. It did not go down."
                  value={d.tagline}
                  onChange={(v) => u({ tagline: v })}
                />
              </Field>

              <Field label="Executive Summary (introductory paragraph on detail page)">
                <TArea
                  placeholder="A complete event management system, running the fest end to end under extreme load."
                  value={d.summary}
                  onChange={(v) => u({ summary: v })}
                  rows={3}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Cover Image URL">
                  <TInput
                    value={d.cover}
                    onChange={(v) => u({ cover: v })}
                    mono
                    placeholder="/team/elevates-founders.jpeg"
                  />
                </Field>
                <Field label="Live Demo URL (optional)">
                  <TInput
                    value={d.live ?? ""}
                    onChange={(v) => u({ live: v || null })}
                    mono
                    placeholder="https://..."
                  />
                </Field>
                <Field label="GitHub Repo URL (optional)">
                  <TInput
                    value={d.repo ?? ""}
                    onChange={(v) => u({ repo: v || null })}
                    mono
                    placeholder="https://github.com/..."
                  />
                </Field>
              </div>

              <Field label="Card Metrics (Stat chips displayed on showcase cards)">
                <MetricRows items={d.metrics} onChange={(v) => u({ metrics: v })} />
              </Field>
            </>
          )}

          {tab === "situation" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                📖 <strong>The Situation / Story Block</strong> — The narrative section explaining the backstory, the sudden challenge on campus, and why your team took ownership.
              </div>
              <Field label="Section Title">
                <TInput
                  value={d.situation.title}
                  onChange={(v) => u({ situation: { ...d.situation, title: v } })}
                  placeholder="e.g. The Application Window Was Closed"
                />
              </Field>
              <Field label="Story Paragraphs (each entry = one paragraph block)">
                <StrList
                  items={d.situation.paragraphs}
                  onChange={(v) => u({ situation: { ...d.situation, paragraphs: v } })}
                  placeholder="Describe what was happening before you built this..."
                />
              </Field>
              <Field label="Highlight Pull-Quote (prominent bold blockquote)">
                <TArea
                  value={d.situation.highlight}
                  onChange={(v) => u({ situation: { ...d.situation, highlight: v } })}
                  rows={2}
                  placeholder="Five days before registrations opened, our college had no system. So we built one."
                />
              </Field>
            </>
          )}

          {tab === "numbers" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                🔢 <strong>Numbers Block</strong> — Large quantitative facts and production metrics shown on the case study body.
              </div>
              <Field label="Numeric Facts Grid">
                <MetricRows items={d.numbers} onChange={(v) => u({ numbers: v })} />
              </Field>
            </>
          )}

          {tab === "built" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                🛠️ <strong>What We Built</strong> — Specific technical deliverables, features, and engineering systems shipped.
              </div>
              <Field label="Technical Deliverables (bullet points)">
                <StrList
                  items={d.whatWeBuilt}
                  onChange={(v) => u({ whatWeBuilt: v })}
                  placeholder="Custom ticket generation with dynamic QR code verification"
                />
              </Field>
            </>
          )}

          {tab === "held" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                📊 <strong>How It Held Up</strong> — Production reliability, latency, load test results, and peak traffic handling.
              </div>
              <Field label="Reliability Summary Paragraph">
                <TArea
                  value={d.howItHeldUp.summary}
                  onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, summary: v } })}
                  placeholder="Peak load arrived on Day 1. The server response latency stayed under 120ms throughout."
                  rows={2}
                />
              </Field>
              <Field label="Reliability & Performance Metrics">
                <MetricRows items={d.howItHeldUp.metrics} onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, metrics: v } })} />
              </Field>
              <Field label="Reliability Detail Points">
                <StrList
                  items={d.howItHeldUp.details}
                  onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, details: v } })}
                  placeholder="Zero connection pool exhaustion despite unthrottled requests..."
                />
              </Field>
            </>
          )}

          {tab === "retro" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                🔁 <strong>What We Would Do Differently (Retrospective)</strong> — Radical honesty and transparency. Sharing what didn&apos;t go perfectly is core to Elevates engineering culture.
              </div>
              <Field label="Honest Retrospective Bullet Points">
                <StrList
                  items={d.whatWeWouldDoDifferently}
                  onChange={(v) => u({ whatWeWouldDoDifferently: v })}
                  placeholder="We should have implemented client-side optimistic UI updates for the ticket scanner..."
                />
              </Field>
            </>
          )}

          {tab === "team" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                👥 <strong>Team & Credits</strong> — Credit the student builders, junior contributors, and faculty coordinators.
              </div>
              <Field label="Core Builders (Name + Role / What they built)">
                <PersonList
                  items={d.builders}
                  onChange={(v) => u({ builders: v as Builder[] })}
                  nameLabel="Builder Name"
                  roleLabel="Role / Responsibilities"
                  memberOptions={chapterMembers}
                />
              </Field>
              <Field label="Junior Contributors / Code Authors">
                <PersonList
                  items={d.contributors.map((c) => ({ name: c.name, role: c.detail, did: c.did, userId: c.userId }))}
                  onChange={(v) =>
                    u({
                      contributors: v.map((b) => ({
                        name: b.name,
                        detail: b.role ?? "",
                        did: b.did,
                        userId: b.userId,
                      })),
                    })
                  }
                  nameLabel="Contributor Name"
                  roleLabel="Year, Dept & What They Shipped"
                  memberOptions={chapterMembers}
                />
              </Field>
              <Field label="Faculty Mentors / Coordinators">
                <PersonList
                  items={d.faculty.map((f) => ({ name: f.name, role: f.detail }))}
                  onChange={(v) => u({ faculty: v.map((b) => ({ name: b.name, detail: b.role ?? "" })) })}
                  nameLabel="Faculty Name"
                  roleLabel="Department / Designation"
                />
              </Field>
            </>
          )}

          {tab === "stack" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                💻 <strong>Tech Stack & Source Code</strong> — Technical tooling tags and repository notes.
              </div>
              <Field label="Technologies Used (each item = badge)">
                <StrList
                  items={d.stackAndCode.technologies}
                  onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, technologies: v } })}
                  placeholder="e.g. Next.js 15, PostgreSQL, Tailwind CSS"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Repository URL">
                  <TInput
                    value={d.stackAndCode.repoUrl ?? ""}
                    onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, repoUrl: v || null } })}
                    mono
                    placeholder="https://github.com/..."
                  />
                </Field>
                <Field label="Repository Access Note">
                  <TInput
                    value={d.stackAndCode.repoNote}
                    onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, repoNote: v } })}
                    placeholder="e.g. Open-source or Private production software"
                  />
                </Field>
              </div>
            </>
          )}

          {tab === "gallery" && (
            <>
              <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
                🖼️ <strong>Production Screenshot Gallery</strong> — Screenshots of live dashboards, scanners, or interfaces.
              </div>
              <div className="space-y-3">
                {d.gallery.map((img, i) => (
                  <div key={i} className="border border-border rounded-[var(--radius-md)] p-3 space-y-2 bg-bg-page/40">
                    <div className="flex gap-2 items-center">
                      <input
                        className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs font-mono text-text focus:border-[var(--accent)] focus:outline-none"
                        placeholder="/projects/vibranium/screenshot.png or https://..."
                        value={img.src}
                        onChange={(e) => {
                          const n = [...d.gallery];
                          n[i] = { ...n[i], src: e.target.value };
                          u({ gallery: n });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => u({ gallery: d.gallery.filter((_, j) => j !== i) })}
                        className="text-text-dim hover:text-red-500 p-1.5 transition-colors"
                        title="Remove screenshot"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <input
                      className="h-8 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text focus:border-[var(--accent)] focus:outline-none"
                      placeholder="Caption describing this interface"
                      value={img.caption}
                      onChange={(e) => {
                        const n = [...d.gallery];
                        n[i] = { ...n[i], caption: e.target.value };
                        u({ gallery: n });
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-[11px] h-7 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  onClick={() => u({ gallery: [...d.gallery, { src: "", caption: "" }] })}
                >
                  <Plus size={12} className="mr-1" /> Add Gallery Image
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-bg-page/50 px-6 py-4">
          <div className="text-[11px] text-text-dim">
            Saved case studies sync to public proof at{" "}
            <span className="font-mono text-text font-semibold">/projects/{d.slug || "slug"}</span>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="orange"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? "Saving..." : "Save Case Study"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

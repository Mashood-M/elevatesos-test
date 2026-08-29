"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/context/store-context";
import {
  Edit,
  ExternalLink,
  Layers,
  Plus,
  Search,
  Trash2,
  X,
  Archive,
  Users,
  Star,
  Code2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectStatus =
  | "live"
  | "live-incomplete"
  | "live-unmaintained"
  | "paused"
  | "archived"
  | "never-launched";

interface Metric { value: string; label: string; }
interface Builder { name: string; role: string; founderId?: string; did?: string; }
interface Contributor { name: string; detail: string; did?: string; }
interface Faculty { name: string; detail: string; }
interface GalleryItem { src: string; caption: string; }
interface SituationSection { title: string; paragraphs: string[]; highlight: string; }
interface HowItHeldUp { summary: string; metrics: Metric[]; details: string[]; }
interface StackAndCode { technologies: string[]; repoUrl: string | null; repoNote: string; }

interface FlagshipProject {
  id: string; slug: string; title: string; client: string; date: string;
  type: "flagship" | "open-tool"; status: ProjectStatus; tagline: string; summary: string;
  metrics: Metric[]; stack: string[]; repo: string | null; live: string | null; cover: string;
  situation: SituationSection; numbers: Metric[]; whatWeBuilt: string[];
  howItHeldUp: HowItHeldUp; whatWeWouldDoDifferently: string[];
  builders: Builder[]; contributors: Contributor[]; faculty: Faculty[];
  stackAndCode: StackAndCode; gallery: GalleryItem[];
}

interface MemberShowcase {
  id: string; title: string; builder: string; builderId: string;
  cohort: string; status: ProjectStatus; description: string; repo: string | null; live: string | null;
}
interface AlsoBuiltItem {
  id: string; name: string; year: string; status: ProjectStatus; reason: string; repo?: string; slug?: string;
}

const STATUS_TONE: Record<ProjectStatus, "green" | "orange" | "cyan" | "mute" | "magenta"> = {
  live: "green", "live-incomplete": "orange", "live-unmaintained": "mute",
  paused: "orange", archived: "mute", "never-launched": "magenta",
};

// ── ALL 4 CASE STUDIES FROM ELEVATES WEB ─────────────────────────────────────
const ALL_FLAGSHIP_PROJECTS: FlagshipProject[] = [];
/*
  {
    id: "vibranium-event-platform", slug: "vibranium-event-platform",
    title: "Vibranium Event Platform",
    client: "Campus TechFest (Chapter 01)", date: "October 2025",
    type: "flagship", status: "live",
    tagline: "Five days to build it. 400,000 requests in the first 24 hours. It did not go down.",
    summary: "A complete event management system, running the fest end to end under extreme load.",
    metrics: [
      { value: "400,000", label: "requests in first 24h" },
      { value: "5", label: "days to build & launch" },
      { value: "0", label: "minutes of downtime" },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
    repo: null, live: null, cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Application Window Was Closed",
      paragraphs: [
        "Vibranium is Chapter 01's flagship annual tech fest.",
        "Five days before registrations opened, it had no system to handle them. The options were a Google Form and a spreadsheet, or something that actually worked.",
        "ELEVATES was about a month old at that point — founded in September 2025. In our final year, we stopped waiting for permission and built the software our college actually ran on.",
      ],
      highlight: "Five days before registrations opened, our college had no system. So we built one.",
    },
    numbers: [
      { value: "400,000", label: "HTTP requests served in the first 24 hours" },
      { value: "5", label: "days from first commit to live production" },
      { value: "0", label: "minutes of downtime across the 3-day fest" },
    ],
    whatWeBuilt: [
      "Custom ticket generation with dynamic QR code verification",
      "Real-time check-in scanner interface for volunteers at event gates",
      "Admin dashboard with live registration counts, revenue tally, and capacity alerts",
      "PostgreSQL database schema optimized for concurrent write traffic during rush hours",
    ],
    howItHeldUp: {
      summary: "Peak load arrived on Day 1 when 3 events opened registrations simultaneously. The server response latency stayed under 120ms throughout.",
      metrics: [{ value: "120ms", label: "average API response time under peak load" }, { value: "100%", label: "ticket scan accuracy at gate entry" }],
      details: [
        "Zero database connection pool exhaustion despite unthrottled burst requests from mobile browsers.",
        "Handled 400,000 total HTTP requests without server crashes or data corruption.",
      ],
    },
    whatWeWouldDoDifferently: [
      "Implement client-side optimistic UI updates for the ticket scanner to feel even faster on 3G connections.",
      "The admin CSV export should have been streamed directly from Postgres rather than buffered in memory.",
    ],
    builders: [
      { role: "Founder & Lead Developer", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
      { role: "Co-Founder & Backend Lead", name: "Naseem Shan", founderId: "naseem-shan" },
      { role: "Development & Full-Stack", name: "Mashood M", founderId: "mashood-m" },
      { role: "Development & UI", name: "Anil Das P", founderId: "anil-das-p" },
      { role: "Development & Operations", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek" },
      { role: "Development & Testing", name: "Muhammed Shanif P", founderId: "muhammed-shanif-p" },
    ],
    contributors: [],
    faculty: [{ name: "Faculty Lead", detail: "ELEVATES Faculty Head" }],
    stackAndCode: {
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Vercel Edge"],
      repoUrl: null,
      repoNote: "Production software built for Chapter 01 TechFest.",
    },
    gallery: [
      { src: "/projects/vibranium/digital-entry-pass.png", caption: "Digital Entry Pass — Unique QR verification pass for participants" },
      { src: "/projects/vibranium/organizer-dashboard.png", caption: "Organizer Console — Real-time overview monitoring 42 events, 901 registrations" },
      { src: "/projects/vibranium/events-catalog.png", caption: "Events & Competitions Catalog — Live department filters with seat capacity bars" },
      { src: "/projects/vibranium/staff-dashboard.png", caption: "Department Staff Dashboard — Managing Computer Science events" },
    ],
  },
  {
    id: "aaroh-arts-platform", slug: "aaroh-arts-platform",
    title: "Aaroh Arts Platform",
    client: "Campus Arts Fest (Chapter 01)", date: "January 5, 2026",
    type: "flagship", status: "live",
    tagline: "The second platform. This time we knew what we were doing.",
    summary: "Sophisticated web application streamlining the entire lifecycle of an arts festival — from student enrollment and event scheduling to real-time participation monitoring and automated PDF reporting.",
    metrics: [{ value: "2nd", label: "production platform shipped" }, { value: "50+", label: "stage competitions & events" }, { value: "100%", label: "repeat college deployment" }],
    stack: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "Supabase", "TanStack Query", "Zod", "jsPDF"],
    repo: "https://github.com/elevates-club/aaroh", live: null, cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Repeat Client",
      paragraphs: [
        "Aaroh (meaning 'Ascent') is Chapter 01's annual inter-department arts festival.",
        "After Vibranium 5.0 succeeded, the college leadership returned to ask ELEVATES to build the complete event management, scoring, and scheduling system for the arts fest.",
        "A repeat client is the strongest proof available — one platform is luck, two platforms is a pattern.",
      ],
      highlight: "After Vibranium succeeded under 400k requests, our college returned to ask ELEVATES to build the arts fest platform.",
    },
    numbers: [
      { value: "4", label: "Role dashboards (Admin, Manager, Coordinator, Student)" },
      { value: "50+", label: "Arts competitions & stage events managed" },
      { value: "Real-time", label: "Supabase live monitoring & audit logs" },
    ],
    whatWeBuilt: [
      "Role-Based Access Control: Dedicated dashboards for Admins, Event Managers, Coordinators, and Students.",
      "Dynamic Event Management: Create and manage diverse event categories with custom capacity limits and registration deadlines.",
      "Real-Time Monitoring: Live tracking of event participation levels powered by Supabase.",
      "Automated Registrations: Smart validation for on-stage and off-stage event limits per student.",
      "Operational Oversight: Comprehensive Audit Logs to monitor system-wide configuration changes and user logins.",
      "Professional Reporting: Integrated PDF generation for student registrations and event rosters using jsPDF.",
    ],
    howItHeldUp: {
      summary: "Built with lessons learned from Vibranium — cleaner architecture with Vite + Supabase, zero rush-hour bugs, and instant real-time result updates.",
      metrics: [{ value: "0", label: "critical bugs during live scoring" }, { value: "Real-time", label: "Supabase live sync for 1,000+ audience" }],
      details: ["Handled simultaneous stage updates from multiple venues without race conditions using Row Level Security (RLS) policies."],
    },
    whatWeWouldDoDifferently: [
      "Provide offline judge draft saving in local storage before pushing to Supabase.",
      "Batch PDF roster generation for 50+ events should be offloaded to a background web worker.",
    ],
    builders: [
      { role: "Main Dev Overall", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
      { role: "Development & Operations", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek" },
      { role: "Development & Operations", name: "Muhammed Shanif P", founderId: "muhammed-shanif-p" },
      { role: "Development & Full-Stack", name: "Mashood M", founderId: "mashood-m" },
    ],
    contributors: [],
    faculty: [{ name: "Faculty Lead", detail: "ELEVATES Faculty Head" }],
    stackAndCode: {
      technologies: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase (DB & Auth)", "TanStack Query", "Zod", "jsPDF", "Recharts"],
      repoUrl: "https://github.com/elevates-club/aaroh",
      repoNote: "Open-source repository specialized for the Aaroh Arts Festival under ELEVATES Club.",
    },
    gallery: [
      { src: "/projects/aaroh/dashboard-overview.png", caption: "Admin Dashboard — System Overview, Live Activity Feed, and Participation Density breakdown across First to Fourth Year batches." },
      { src: "/projects/aaroh/user-management.png", caption: "Role-Based Access Control — Managing Administrators, Year Coordinators, Event Managers, and Student roles with instant role switching." },
      { src: "/projects/aaroh/system-settings.png", caption: "System Settings Console — Dynamic On-Stage (Max 5) and Off-Stage (Max 4) event registration limit controls and Auto-Approval toggles." },
    ],
  },
  {
    id: "celestia", slug: "celestia",
    title: "Celestia — CSE Association Website",
    client: "Celestia, CSE Association — Campus Chapter", date: "March 25, 2026",
    type: "flagship", status: "live-incomplete",
    tagline: "A department website, rebuilt in one hour.",
    summary: "We were running the event. The guest we had invited was arriving at two o'clock. We had two hours, five juniors, and a specification written on the way to campus. We finished in one hour, launched live on stage via Python gesture recognition.",
    metrics: [{ value: "1 hour", label: "Build & deploy time to production" }, { value: "2 hours", label: "Deadline given before guest arrival" }, { value: "5", label: "Non-founder junior builders (3rd & 1st year)" }],
    stack: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "Lenis", "Python", "OpenCV", "MediaPipe"],
    repo: null, live: "https://celestia-web-lti6.vercel.app", cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The One-Hour Challenge",
      paragraphs: [
        "On 25 March 2026 the Computer Science department was relaunching its association as Celestia. ELEVATES coordinated the entire relaunch event, and we had invited the chief guest: Moosa Mehar MP, Co-Founder and CEO of TinkerHub Foundation. He was arriving at 2:00 PM.",
        "The association's website was three years old and needed a complete overhaul.",
        "With two hours left, two of us called the HOD from the back of a bike and asked for permission to rebuild it before the guest arrived. Then we named five students, none of whom had built anything for the department before, and three of us walked into their classrooms and pulled them out of their sessions.",
      ],
      highlight: "We invited TinkerHub's CEO, coordinated the event, and rebuilt the department website in 60 minutes.",
    },
    numbers: [
      { value: "1 hour", label: "Time taken to specify, code, and deploy to Vercel" },
      { value: "5", label: "Junior student builders (3rd year & 1st year)" },
      { value: "0", label: "Founding members who wrote code on the day" },
    ],
    whatWeBuilt: [
      "Full 4-route website (Home, Teams, Gallery, Contact) built with React 18, Vite, and Tailwind CSS.",
      "GSAP ScrollTrigger & Lenis smooth scrolling integration for pinned horizontal identity cards.",
      "Python gesture-detection launch mechanism using OpenCV and MediaPipe: Chief Guest raised his hand on stage to trigger the live website launch.",
      "Spec-driven rapid AI build pipeline executed in 60 minutes with Claude & Cursor.",
    ],
    howItHeldUp: {
      summary: "Shipped in 1 hour and deployed live on Vercel before the chief guest arrived. Launched on stage with 100% gesture recognition accuracy on the first attempt.",
      metrics: [{ value: "100%", label: "First-attempt gesture launch accuracy on stage" }, { value: "60 mins", label: "Total time from phone call to Vercel deploy" }],
      details: [
        "Five non-founder junior students executed the specification while 7 founding members managed event operations.",
        "Chief Guest Moosa Mehar MP personally tested the gesture launch and congratulated the student developer.",
      ],
    },
    whatWeWouldDoDifferently: [
      "Never deploy mock placeholder data to production without a pre-deploy read-through out loud.",
      "Restore dropped real faculty testimonials from the previous association site.",
      "Transfer Vercel deployment project ownership to an official institutional account.",
    ],
    builders: [
      { role: "Called the HOD from the bike, directed the build", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm", did: "Called the HOD from the bike, directed the build" },
      { role: "Wrote the build specification", name: "Naseem Shan", founderId: "naseem-shan", did: "Wrote the build specification" },
      { role: "On the bike when the call was made", name: "Mohammed Nafih P", founderId: "muhammed-nafih-p", did: "On the bike when the call was made" },
      { role: "Held the team together until the others arrived", name: "Adhinan K", founderId: "adhinan-k", did: "Held the team together until the others arrived" },
      { role: "Walked into the classrooms and fetched the builders", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek", did: "Walked into the classrooms and fetched the builders" },
      { role: "Walked into the classrooms and fetched the builders", name: "Mashood M", founderId: "mashood-m", did: "Walked into the classrooms and fetched the builders" },
      { role: "Walked into the classrooms and fetched the builders", name: "Arshak", founderId: "arshak", did: "Walked into the classrooms and fetched the builders" },
    ],
    contributors: [
      { name: "Faseen", detail: "3rd year, CSE — Frontend Build" },
      { name: "Shibin", detail: "3rd year, CSE — Frontend Build" },
      { name: "Zakariya", detail: "3rd year, CSE — Frontend Build" },
      { name: "Danish", detail: "1st year, T2 — Frontend Build" },
      { name: "Abhijith CJ", detail: "3rd year, AI & DS — Build & Gesture Launch Developer", did: "Built the gesture-controlled launch" },
    ],
    faculty: [
      { name: "Faculty Coordinator", detail: "ELEVATES Faculty Head" },
      { name: "HOD, Computer Science", detail: "HOD, CSE" },
    ],
    stackAndCode: {
      technologies: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "Lenis", "Python", "OpenCV", "MediaPipe"],
      repoUrl: null,
      repoNote: "Production site deployed directly to Vercel preview under CSE Association Campus Chapter.",
    },
    gallery: [],
  },
  {
    id: "roadundo", slug: "roadundo",
    title: "RoadUndo",
    client: "Open Source Utility · ELEVATES Foundation", date: "August 2026",
    type: "open-tool", status: "live-unmaintained",
    tagline: "Kerala road passability and disaster board · Free Open Public API",
    summary: "A Kerala road passability and disaster board, with a free open API for 5,057 pincodes, LSGD wards, OpenStreetMap roads, live KSEB dam levels, and IMD weather alerts.",
    metrics: [
      { value: "5,057", label: "post offices mapped to LSGD wards" },
      { value: "18", label: "reservoirs tracked live with spillway data" },
      { value: "8", label: "open API endpoints (no key, no cost)" },
    ],
    stack: ["Next.js 15", "TypeScript 5", "Neon Postgres", "Drizzle ORM", "Leaflet", "OpenStreetMap Overpass API"],
    repo: "https://github.com/Elevates-Foundation/RoadUndo", live: "https://roadundo.vercel.app", cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Monsoon Problem",
      paragraphs: [
        "Kerala floods. Every monsoon the same question moves through a hundred WhatsApp groups at once: is this road open? Do people need help?",
        "The official information exists. It is spread across the KSEB dam portal, IMD bulletins, district control rooms and PDF press notes, and none of it sits in one place, in one format, that software can read.",
        "So we put it in one place and opened it to everyone as a free, open-source public data API and real-time dashboard.",
      ],
      highlight: "Official Kerala disaster data exists in scattered PDFs and portals. We put it in one place and opened it to everyone.",
    },
    numbers: [
      { value: "5,057", label: "Kerala post offices with GPS mapped to LSGD wards" },
      { value: "18", label: "reservoirs with live water level, storage %, and spillway data" },
      { value: "14", label: "districts covered for alerts & emergency helplines" },
      { value: "8", label: "public API endpoints (CORS open, no key, no signup)" },
    ],
    whatWeBuilt: [
      "The Data Layer (Automated & Running): Pincode to LSGD ward resolver, OpenStreetMap road geometry, daily water levels for 18 reservoirs, live IMD alerts, and emergency control room numbers.",
      "The Reporting Layer (Crowdsourced): Road passability status reports (Open / Flooded / Blocked) and location-based SOS alerts.",
    ],
    howItHeldUp: {
      summary: "The automated data engine and OpenStreetMap Overpass mirror failover system run seamlessly in production.",
      metrics: [{ value: "8", label: "CORS-open public API endpoints" }, { value: "3", label: "Overpass API mirrors for automatic failover" }],
      details: [
        "Bilingual data support including native Malayalam dam names.",
        "Zero-downtime data synchronization pipeline running on automated GitHub Actions crons.",
      ],
    },
    whatWeWouldDoDifferently: [
      "Find the first fifty reporters before writing the crowdsourced reporting feature.",
      "Lead with the open data API as the primary product and treat the web dashboard as a live reference demo.",
    ],
    builders: [
      { role: "Creator & Lead Developer", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
    ],
    contributors: [],
    faculty: [],
    stackAndCode: {
      technologies: ["Next.js 15 App Router", "TypeScript 5", "Neon Serverless Postgres", "Drizzle ORM", "Leaflet", "OpenStreetMap Overpass API", "Tailwind CSS"],
      repoUrl: "https://github.com/Elevates-Foundation/RoadUndo",
      repoNote: "Open-source repository hosted under Elevates-Foundation GitHub organization.",
    },
    gallery: [],
  },
*/
const DEFAULT_SHOWCASES: MemberShowcase[] = [];
const DEFAULT_ARCHIVE: AlsoBuiltItem[] = [];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}
function TInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${mono ? "font-mono" : ""}`}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}
function TArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function MetricRows({ items, onChange }: { items: Metric[]; onChange: (v: Metric[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((m, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="h-8 w-24 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs font-mono text-text" placeholder="Value" value={m.value}
            onChange={(e) => { const n = [...items]; n[i] = { ...n[i], value: e.target.value }; onChange(n); }} />
          <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Label" value={m.label}
            onChange={(e) => { const n = [...items]; n[i] = { ...n[i], label: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, { value: "", label: "" }])}><Plus size={12} /> Add Metric</Button>
    </div>
  );
}
function StrList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <textarea rows={2} className="flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-1.5 text-xs text-text resize-none"
            placeholder={placeholder} value={item}
            onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1 mt-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, ""])}><Plus size={12} /> Add Item</Button>
    </div>
  );
}
function PersonList({ items, onChange, nameLabel, roleLabel }: { items: Array<{ name: string; role?: string; detail?: string; did?: string }>; onChange: (v: typeof items) => void; nameLabel: string; roleLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((b, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <input className="h-8 flex-1 min-w-[140px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder={nameLabel} value={b.name}
            onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }} />
          <input className="h-8 flex-1 min-w-[160px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder={roleLabel} value={b.role ?? b.detail ?? ""}
            onChange={(e) => { const n = [...items]; n[i] = { ...n[i], role: e.target.value, detail: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, { name: "", role: "" }])}><Plus size={12} /> Add Person</Button>
    </div>
  );
}

type ETab = "overview" | "situation" | "numbers" | "built" | "held" | "retro" | "team" | "stack" | "gallery";
const ETABS: { key: ETab; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "situation", label: "Situation" },
  { key: "numbers", label: "Numbers" }, { key: "built", label: "What We Built" },
  { key: "held", label: "How It Held Up" }, { key: "retro", label: "Retro" },
  { key: "team", label: "Team & Credits" }, { key: "stack", label: "Stack & Code" },
  { key: "gallery", label: "Gallery" },
];

function FlagshipEditor({ project, onSave, onClose }: { project: FlagshipProject; onSave: (p: FlagshipProject) => void; onClose: () => void; }) {
  const [d, setD] = useState<FlagshipProject>(project);
  const [tab, setTab] = useState<ETab>("overview");
  const u = (patch: Partial<FlagshipProject>) => setD((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-4xl rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">Edit Case Study</h3>
            <p className="text-[11px] text-text-dim mt-0.5 font-mono">elevates.live/projects/{d.slug}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-text-dim hover:bg-bg-page"><X size={18} /></button>
        </div>
        <div className="flex overflow-x-auto gap-0 px-4 pt-3 border-b border-border">
          {ETABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors ${tab === t.key ? "border-[var(--accent)] text-text" : "border-transparent text-text-dim hover:text-text"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {tab === "overview" && (<>
            <Field label="Title"><TInput value={d.title} onChange={(v) => u({ title: v })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug"><TInput value={d.slug} onChange={(v) => u({ slug: v })} mono placeholder="vibranium-event-platform" /></Field>
              <Field label="Status">
                <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text" value={d.status} onChange={(e) => u({ status: e.target.value as ProjectStatus })}>
                  {["live", "live-incomplete", "live-unmaintained", "paused", "archived", "never-launched"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Client / Event Name"><TInput value={d.client} onChange={(v) => u({ client: v })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date"><TInput value={d.date} onChange={(v) => u({ date: v })} placeholder="October 2025" /></Field>
              <Field label="Type">
                <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text" value={d.type} onChange={(e) => u({ type: e.target.value as "flagship" | "open-tool" })}>
                  <option value="flagship">Flagship</option><option value="open-tool">Open Tool</option>
                </select>
              </Field>
            </div>
            <Field label="Tagline (shown on /projects card & detail page hero)"><TInput value={d.tagline} onChange={(v) => u({ tagline: v })} /></Field>
            <Field label="Summary (detail page intro paragraph)"><TArea value={d.summary} onChange={(v) => u({ summary: v })} rows={3} /></Field>
            <Field label="Cover Image Path"><TInput value={d.cover} onChange={(v) => u({ cover: v })} mono placeholder="/team/elevates-founders.jpeg" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Live URL (optional)"><TInput value={d.live ?? ""} onChange={(v) => u({ live: v || null })} mono /></Field>
              <Field label="Repo URL (optional)"><TInput value={d.repo ?? ""} onChange={(v) => u({ repo: v || null })} mono /></Field>
            </div>
            <Field label="Card Metrics (⚡ stat chips shown on /projects listing card)"><MetricRows items={d.metrics} onChange={(v) => u({ metrics: v })} /></Field>
          </>)}
          {tab === "situation" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              📖 The <strong>Situation / Story Block</strong> — narrative section on detail page with title, paragraphs, and a large pull-quote highlight.
            </div>
            <Field label="Section Title"><TInput value={d.situation.title} onChange={(v) => u({ situation: { ...d.situation, title: v } })} placeholder="The Application Window Was Closed" /></Field>
            <Field label="Story Paragraphs (each entry = one paragraph block)">
              <StrList items={d.situation.paragraphs} onChange={(v) => u({ situation: { ...d.situation, paragraphs: v } })} placeholder="Write a paragraph of the story..." />
            </Field>
            <Field label="Highlight Pull-Quote (big bold callout displayed prominently)">
              <TArea value={d.situation.highlight} onChange={(v) => u({ situation: { ...d.situation, highlight: v } })} rows={2} />
            </Field>
          </>)}
          {tab === "numbers" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              🔢 <strong>Numbers Block</strong> — large numeric facts shown inside the detail page body. Different from card metrics.
            </div>
            <Field label="Numbers / Facts (bold numeric grid on detail page)"><MetricRows items={d.numbers} onChange={(v) => u({ numbers: v })} /></Field>
          </>)}
          {tab === "built" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              🛠️ <strong>What We Built</strong> — bullet list of technical deliverables shipped.
            </div>
            <Field label="What We Built (bullet points)">
              <StrList items={d.whatWeBuilt} onChange={(v) => u({ whatWeBuilt: v })} placeholder="Custom ticket generation with dynamic QR code verification" />
            </Field>
          </>)}
          {tab === "held" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              📊 <strong>How It Held Up</strong> — performance + reliability report section.
            </div>
            <Field label="Summary Paragraph"><TArea value={d.howItHeldUp.summary} onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, summary: v } })} /></Field>
            <Field label="Performance Metrics"><MetricRows items={d.howItHeldUp.metrics} onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, metrics: v } })} /></Field>
            <Field label="Detail Points (bullet list)">
              <StrList items={d.howItHeldUp.details} onChange={(v) => u({ howItHeldUp: { ...d.howItHeldUp, details: v } })} placeholder="Zero database connection pool exhaustion despite..." />
            </Field>
          </>)}
          {tab === "retro" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              🔁 <strong>What We Would Do Differently</strong> — honest retrospective. This transparency is core to ELEVATES brand identity on the projects page.
            </div>
            <Field label="Retrospective Points (honest bullet list)">
              <StrList items={d.whatWeWouldDoDifferently} onChange={(v) => u({ whatWeWouldDoDifferently: v })} placeholder="We should have implemented client-side optimistic UI..." />
            </Field>
          </>)}
          {tab === "team" && (<>
            <Field label="Founding Builders (credited on /projects listing card — name + role)">
              <PersonList items={d.builders} onChange={(v) => u({ builders: v as Builder[] })} nameLabel="Builder Name" roleLabel="Role / What They Did" />
            </Field>
            <Field label="Junior Contributors / Code Authors (if different from founders)">
              <PersonList
                items={d.contributors.map((c) => ({ name: c.name, role: c.detail, did: c.did }))}
                onChange={(v) => u({ contributors: v.map((b) => ({ name: b.name, detail: b.role ?? "", did: b.did })) })}
                nameLabel="Contributor Name" roleLabel="Year, Dept & What They Did"
              />
            </Field>
            <Field label="Faculty (credited on detail page)">
              <PersonList
                items={d.faculty.map((f) => ({ name: f.name, role: f.detail }))}
                onChange={(v) => u({ faculty: v.map((b) => ({ name: b.name, detail: b.role ?? "" })) })}
                nameLabel="Faculty Name" roleLabel="Role / Department"
              />
            </Field>
          </>)}
          {tab === "stack" && (<>
            <Field label="Technologies (each = a tag on the page)">
              <StrList items={d.stackAndCode.technologies} onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, technologies: v } })} placeholder="Next.js" />
            </Field>
            <Field label="Repo URL (leave empty if private)"><TInput value={d.stackAndCode.repoUrl ?? ""} onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, repoUrl: v || null } })} mono /></Field>
            <Field label="Repo Note (why private, or open-source credit)"><TArea value={d.stackAndCode.repoNote} onChange={(v) => u({ stackAndCode: { ...d.stackAndCode, repoNote: v } })} rows={2} /></Field>
          </>)}
          {tab === "gallery" && (<>
            <div className="text-[11px] text-text-dim bg-bg-page border border-border rounded-[var(--radius-md)] p-3">
              🖼️ <strong>Gallery</strong> — screenshot grid on the detail page. Path + caption for each screenshot.
            </div>
            <div className="space-y-3">
              {d.gallery.map((img, i) => (
                <div key={i} className="border border-border rounded-[var(--radius-md)] p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs font-mono text-text" placeholder="/projects/vibranium/screenshot.png"
                      value={img.src} onChange={(e) => { const n = [...d.gallery]; n[i] = { ...n[i], src: e.target.value }; u({ gallery: n }); }} />
                    <button onClick={() => u({ gallery: d.gallery.filter((_, j) => j !== i) })} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
                  </div>
                  <input className="h-8 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Caption describing this screenshot"
                    value={img.caption} onChange={(e) => { const n = [...d.gallery]; n[i] = { ...n[i], caption: e.target.value }; u({ gallery: n }); }} />
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => u({ gallery: [...d.gallery, { src: "", caption: "" }] })}><Plus size={12} /> Add Gallery Image</Button>
            </div>
          </>)}
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => { onSave(d); onClose(); }}>Save Case Study</Button>
        </div>
      </div>
    </div>
  );
}

type ActiveSection = "flagship" | "showcases" | "archive";

export default function ProjectsCMSPage() {
  const { store } = useStore();
  const [section, setSection] = useState<ActiveSection>("flagship");
  const [search, setSearch] = useState("");
  const [flagship, setFlagship] = useState<FlagshipProject[]>([]);
  const [showcases, setShowcases] = useState<MemberShowcase[]>(DEFAULT_SHOWCASES);
  const [archive, setArchive] = useState<AlsoBuiltItem[]>(DEFAULT_ARCHIVE);

  useEffect(() => {
    if (store.projects && store.projects.length > 0) {
      const dynamicProjects: FlagshipProject[] = store.projects.map((p) => ({
        id: p.id,
        slug: p.slug || p.id,
        title: p.title,
        client: "ELEVATES Foundation",
        date: "2026",
        type: "flagship",
        status: ((p.stage as string) === "production" || (p.stage as string) === "active" ? "live" : "live-incomplete") as ProjectStatus,
        tagline: p.description || "",
        summary: p.description || "",
        metrics: [{ value: `${p.progress}%`, label: "Complete" }],
        stack: ["TypeScript", "Next.js", "Supabase"],
        repo: p.repositoryUrl || null,
        live: p.demoUrl || null,
        cover: "/team/elevates-founders.jpeg",
        situation: { title: p.title, paragraphs: [p.description || ""], highlight: p.title },
        numbers: [{ value: `${p.progress}%`, label: "Progress" }],
        whatWeBuilt: p.awards || [],
        howItHeldUp: { summary: "Operational", metrics: [], details: [] },
        whatWeWouldDoDifferently: [],
        builders: [],
        contributors: [],
        faculty: [],
        stackAndCode: { technologies: ["TypeScript", "Next.js", "Supabase"], repoUrl: p.repositoryUrl || null, repoNote: "" },
        gallery: [],
      }));
      setFlagship(dynamicProjects);
    }
  }, [store.projects]);
  const [editing, setEditing] = useState<FlagshipProject | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editShowcase, setEditShowcase] = useState<MemberShowcase | null>(null);

  const q = search.toLowerCase();

  const blank = (): FlagshipProject => ({
    id: `proj-${Date.now()}`, slug: "", title: "", client: "", date: "", type: "flagship", status: "live",
    tagline: "", summary: "", metrics: [{ value: "", label: "" }], stack: [], repo: null, live: null, cover: "",
    situation: { title: "", paragraphs: [""], highlight: "" }, numbers: [{ value: "", label: "" }], whatWeBuilt: [""],
    howItHeldUp: { summary: "", metrics: [], details: [] }, whatWeWouldDoDifferently: [""], builders: [{ name: "", role: "" }],
    contributors: [], faculty: [], stackAndCode: { technologies: [], repoUrl: null, repoNote: "" }, gallery: [],
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="Projects & Production Proof"
        description="Manage all Flagship Case Studies (Vibranium, Aaroh, Celestia, RoadUndo), Member Showcases, and the Also Built archive on elevates.live/projects."
        actions={
          section === "flagship" ? (
            <Button size="sm" variant="orange" onClick={() => { setEditing(blank()); setIsNew(true); }}>
              <Plus size={14} /> New Case Study
            </Button>
          ) : null
        }
      />

      {/* Section Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: "flagship", label: `Flagship Case Studies (${flagship.length})`, icon: Star },
          { key: "showcases", label: `Member Showcases (${showcases.length})`, icon: Users },
          { key: "archive", label: `Also Built Archive (${archive.length})`, icon: Archive },
        ] as { key: ActiveSection; label: string; icon: typeof Star }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${section === key ? "border-[var(--accent)] text-text" : "border-transparent text-text-dim hover:text-text"}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input placeholder="Search case studies..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* ── FLAGSHIP ── */}
      {section === "flagship" && (
        <div className="space-y-4">
          {flagship.filter((p) => p.title.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)).map((p) => (
            <div key={p.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 hover:border-border-hover transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    <Badge tone={p.type === "flagship" ? "cyan" : "magenta"}>{p.type}</Badge>
                    <span className="font-mono text-[10px] text-text-dim">/{p.slug}</span>
                    {p.live && <a href={p.live} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--accent)] font-mono flex items-center gap-0.5 hover:underline"><ExternalLink size={10} /> Live ↗</a>}
                    {p.repo && <a href={p.repo} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--accent)] font-mono flex items-center gap-0.5 hover:underline"><Code2 size={10} /> Repo ↗</a>}
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">{p.title}</h3>
                  <p className="text-[11px] text-text-dim mt-0.5">📍 {p.client} · {p.date}</p>
                  <p className="text-xs text-text-dim mt-1.5 line-clamp-2 italic">&quot;{p.tagline}&quot;</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.metrics.map((m, i) => (
                      <span key={i} className="text-[10px] font-mono bg-bg-page border border-border rounded px-2 py-0.5 text-text">⚡ {m.value} {m.label}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.stack.map((s) => <span key={s} className="text-[10px] font-mono bg-[var(--neutral-100)] px-1.5 py-0.5 rounded text-text-dim">{s}</span>)}
                  </div>
                  {p.builders.length > 0 && <p className="text-[11px] text-text-dim mt-2"><span className="font-semibold">Build Team:</span> {p.builders.map((b) => b.name).join(", ")}</p>}
                  {p.contributors.length > 0 && <p className="text-[11px] text-text-dim mt-0.5"><span className="font-semibold">Code Authors:</span> {p.contributors.map((c) => c.name).join(", ")}</p>}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                    <span className="text-[10px] font-mono text-text-dim bg-bg-page border border-border rounded px-2 py-0.5">{p.whatWeBuilt.length} built items</span>
                    <span className="text-[10px] font-mono text-text-dim bg-bg-page border border-border rounded px-2 py-0.5">{p.gallery.length} gallery imgs</span>
                    <span className="text-[10px] font-mono text-text-dim bg-bg-page border border-border rounded px-2 py-0.5">{p.whatWeWouldDoDifferently.length} retro points</span>
                    <span className="text-[10px] font-mono text-text-dim bg-bg-page border border-border rounded px-2 py-0.5">{p.stackAndCode.technologies.length} tech tags</span>
                    <span className="text-[10px] font-mono text-text-dim bg-bg-page border border-border rounded px-2 py-0.5">{p.contributors.length} contributors</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(p); setIsNew(false); }}><Edit size={13} /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={async () => {
                    if (confirm(`Delete project "${p.title}"?`)) {
                      setFlagship((prev) => prev.filter((x) => x.id !== p.id));
                      try {
                        await fetch("/api/mutations", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "delete_project", data: { id: p.id, slug: p.slug } }),
                        });
                      } catch (e) {
                        console.error("Failed to delete project:", e);
                      }
                    }
                  }}><Trash2 size={13} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SHOWCASES ── */}
      {section === "showcases" && (
        <div className="space-y-3">
          {showcases.filter((s) => s.title.toLowerCase().includes(q) || s.builder.toLowerCase().includes(q)).map((s) => (
            <div key={s.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 hover:border-border-hover flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                  <span className="text-[10px] font-mono text-text-dim bg-bg-page px-2 py-0.5 rounded border border-border">Cohort {s.cohort}</span>
                </div>
                <h3 className="font-bold text-text text-sm">{s.title}</h3>
                <p className="text-[11px] text-text-dim mt-0.5">Builder: <span className="text-[var(--accent)]">{s.builder}</span></p>
                <p className="text-xs text-text-dim mt-1 line-clamp-2">{s.description}</p>
                <div className="flex gap-3 mt-1.5">
                  {s.repo && <a href={s.repo} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5"><Code2 size={10} /> Repo ↗</a>}
                  {s.live && <a href={s.live} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5"><ExternalLink size={10} /> Live ↗</a>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => setEditShowcase(s)}><Edit size={13} /></Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => setShowcases((prev) => prev.filter((x) => x.id !== s.id))}><Trash2 size={13} /></Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setShowcases((prev) => [...prev, { id: `sc-${Date.now()}`, title: "New Project", builder: "", builderId: "", cohort: "2025-26", status: "live", description: "", repo: null, live: null }])}>
            <Plus size={13} /> Add Member Showcase
          </Button>
        </div>
      )}

      {/* ── ARCHIVE ── */}
      {section === "archive" && (
        <div>
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel overflow-hidden divide-y divide-border mb-3">
            {archive.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-bg-page">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-text text-sm">{item.name}</span>
                    <span className="text-xs text-text-dim font-mono">{item.year}</span>
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  </div>
                  <p className="text-xs text-text-dim max-w-2xl">{item.reason}</p>
                  <div className="flex gap-3 mt-1.5">
                    {item.slug && <span className="text-[10px] font-mono text-text-dim">→ Post-Mortem at /projects/{item.slug}</span>}
                    {item.repo && <a href={item.repo} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-[var(--accent)] hover:underline">Repo ↗</a>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-[var(--danger)] shrink-0" onClick={() => setArchive((prev) => prev.filter((x) => x.id !== item.id))}><Trash2 size={13} /></Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setArchive((prev) => [...prev, { id: `ar-${Date.now()}`, name: "New Entry", year: "2026", status: "archived", reason: "" }])}>
            <Plus size={13} /> Add to Archive
          </Button>
        </div>
      )}

      {/* Flagship Editor Modal */}
      {editing && (
        <FlagshipEditor project={editing} onClose={() => { setEditing(null); setIsNew(false); }}
          onSave={async (saved) => {
            if (isNew) setFlagship((prev) => [...prev, saved]);
            else setFlagship((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));

            try {
              await fetch("/api/mutations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "project",
                  data: {
                    id: saved.id,
                    title: saved.title,
                    slug: saved.slug,
                    description: saved.summary || saved.tagline,
                    stage: saved.status === "live" ? "production" : "active",
                    projectType: saved.type,
                    repositoryUrl: saved.repo,
                    demoUrl: saved.live,
                    isShowcased: true,
                  },
                }),
              });
            } catch (err) {
              console.error("Failed to persist project:", err);
            }
          }}
        />
      )}

      {/* Showcase Editor Modal */}
      {editShowcase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-text">Edit Member Showcase</h3><button onClick={() => setEditShowcase(null)} className="text-text-dim"><X size={18} /></button></div>
            <Field label="Project Title"><TInput value={editShowcase.title} onChange={(v) => setEditShowcase((s) => s && { ...s, title: v })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Builder Name"><TInput value={editShowcase.builder} onChange={(v) => setEditShowcase((s) => s && { ...s, builder: v })} /></Field>
              <Field label="Builder ID"><TInput value={editShowcase.builderId} onChange={(v) => setEditShowcase((s) => s && { ...s, builderId: v })} mono /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cohort"><TInput value={editShowcase.cohort} onChange={(v) => setEditShowcase((s) => s && { ...s, cohort: v })} /></Field>
              <Field label="Status">
                <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text" value={editShowcase.status} onChange={(e) => setEditShowcase((s) => s && { ...s, status: e.target.value as ProjectStatus })}>
                  {["live", "live-incomplete", "live-unmaintained", "paused", "archived"].map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description"><TArea value={editShowcase.description} onChange={(v) => setEditShowcase((s) => s && { ...s, description: v })} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Live URL"><TInput value={editShowcase.live ?? ""} onChange={(v) => setEditShowcase((s) => s && { ...s, live: v || null })} mono /></Field>
              <Field label="Repo URL"><TInput value={editShowcase.repo ?? ""} onChange={(v) => setEditShowcase((s) => s && { ...s, repo: v || null })} mono /></Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditShowcase(null)}>Cancel</Button>
              <Button variant="orange" size="sm" onClick={() => { setShowcases((prev) => prev.map((s) => s.id === editShowcase.id ? editShowcase : s)); setEditShowcase(null); }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

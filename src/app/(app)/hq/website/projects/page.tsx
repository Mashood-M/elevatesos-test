"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Globe,
  Sparkles,
  CheckCircle2,
  Activity,
  ArrowRight,
} from "lucide-react";
import { finalizeSlug } from "@/lib/slug";
import {
  CaseStudyEditor,
  FlagshipProject,
  blankCaseStudy,
  parseProjectToCaseStudy,
  serializeCaseStudyToProject,
  ProjectStatus,
  Metric,
} from "@/components/domain/case-study-editor";

interface MemberShowcase {
  id: string;
  title: string;
  builder: string;
  builderId: string;
  cohort: string;
  status: ProjectStatus;
  description: string;
  repo: string | null;
  live: string | null;
}

interface AlsoBuiltItem {
  id: string;
  name: string;
  year: string;
  status: ProjectStatus;
  reason: string;
  repo?: string;
  slug?: string;
}

const STATUS_TONE: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  live: { bg: "bg-[#f0f4f1]", text: "text-[#5f7560]", border: "border-[#5f7560]/30" },
  "live-incomplete": { bg: "bg-[#fef0eb]", text: "text-[#f26430]", border: "border-[#f26430]/30" },
  "live-unmaintained": { bg: "bg-neutral-100", text: "text-[#71717a]", border: "border-neutral-300" },
  paused: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  archived: { bg: "bg-neutral-100", text: "text-[#71717a]", border: "border-neutral-300" },
  "never-launched": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
};

// ── CANONICAL 4 FLAGSHIP CASE STUDIES ──────────────────────────────────────
const CANONICAL_FLAGSHIP_PROJECTS: FlagshipProject[] = [
  {
    id: "vibranium-event-platform",
    slug: "vibranium-event-platform",
    title: "Vibranium Event Platform",
    client: "Campus TechFest (Chapter 01)",
    date: "October 2025",
    type: "flagship",
    status: "live",
    tagline: "Five days to build it. 400,000 requests in the first 24 hours. It did not go down.",
    summary: "A complete event management system, running the fest end to end under extreme load.",
    metrics: [
      { value: "400,000", label: "requests in first 24h" },
      { value: "5", label: "days to build & launch" },
      { value: "0", label: "minutes of downtime" },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
    repo: null,
    live: null,
    cover: "/team/elevates-founders.jpeg",
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
      summary:
        "Peak load arrived on Day 1 when 3 events opened registrations simultaneously. The server response latency stayed under 120ms throughout.",
      metrics: [
        { value: "120ms", label: "average API response time under peak load" },
        { value: "100%", label: "ticket scan accuracy at gate entry" },
      ],
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
      {
        src: "/projects/vibranium/digital-entry-pass.png",
        caption: "Digital Entry Pass — Unique QR verification pass for participants",
      },
      {
        src: "/projects/vibranium/organizer-dashboard.png",
        caption: "Organizer Console — Real-time overview monitoring 42 events, 901 registrations",
      },
      {
        src: "/projects/vibranium/events-catalog.png",
        caption: "Events & Competitions Catalog — Live department filters with seat capacity bars",
      },
      {
        src: "/projects/vibranium/staff-dashboard.png",
        caption: "Department Staff Dashboard — Managing Computer Science events",
      },
    ],
  },
  {
    id: "aaroh-arts-platform",
    slug: "aaroh-arts-platform",
    title: "Aaroh Arts Platform",
    client: "Campus Arts Fest (Chapter 01)",
    date: "January 5, 2026",
    type: "flagship",
    status: "live",
    tagline: "The second platform. This time we knew what we were doing.",
    summary:
      "Sophisticated web application streamlining the entire lifecycle of an arts festival — from student enrollment and event scheduling to real-time participation monitoring and automated PDF reporting.",
    metrics: [
      { value: "2nd", label: "production platform shipped" },
      { value: "50+", label: "stage competitions & events" },
      { value: "100%", label: "repeat college deployment" },
    ],
    stack: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "Supabase", "TanStack Query", "Zod", "jsPDF"],
    repo: "https://github.com/elevates-club/aaroh",
    live: null,
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Repeat Client",
      paragraphs: [
        "Aaroh (meaning 'Ascent') is Chapter 01's annual inter-department arts festival.",
        "After Vibranium 5.0 succeeded, the college leadership returned to ask ELEVATES to build the complete event management, scoring, and scheduling system for the arts fest.",
        "A repeat client is the strongest proof available — one platform is luck, two platforms is a pattern.",
      ],
      highlight:
        "After Vibranium succeeded under 400k requests, our college returned to ask ELEVATES to build the arts fest platform.",
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
      "Professional Reporting: Integrated PDF generation for student registrations and event directories using jsPDF.",
    ],
    howItHeldUp: {
      summary:
        "Built with lessons learned from Vibranium — cleaner architecture with Vite + Supabase, zero rush-hour bugs, and instant real-time result updates.",
      metrics: [
        { value: "0", label: "critical bugs during live scoring" },
        { value: "Real-time", label: "Supabase live sync for 1,000+ audience" },
      ],
      details: [
        "Handled simultaneous stage updates from multiple venues without race conditions using Row Level Security (RLS) policies.",
      ],
    },
    whatWeWouldDoDifferently: [
      "Provide offline judge draft saving in local storage before pushing to Supabase.",
      "Batch PDF directory generation for 50+ events should be offloaded to a background web worker.",
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
      technologies: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase", "TanStack Query", "Zod", "jsPDF", "Recharts"],
      repoUrl: "https://github.com/elevates-club/aaroh",
      repoNote: "Open-source repository specialized for the Aaroh Arts Festival under ELEVATES Club.",
    },
    gallery: [
      {
        src: "/projects/aaroh/dashboard-overview.png",
        caption: "Admin Dashboard — System Overview, Live Activity Feed, and Participation Density breakdown.",
      },
      {
        src: "/projects/aaroh/user-management.png",
        caption: "Role-Based Access Control — Managing Administrators, Coordinators, and Students.",
      },
      {
        src: "/projects/aaroh/system-settings.png",
        caption: "System Settings Console — Dynamic event limit controls and Auto-Approval toggles.",
      },
    ],
  },
  {
    id: "celestia",
    slug: "celestia",
    title: "Celestia — CSE Association Website",
    client: "Celestia, CSE Association — Campus Chapter",
    date: "March 25, 2026",
    type: "flagship",
    status: "live-incomplete",
    tagline: "A department website, rebuilt in one hour.",
    summary:
      "We were running the event. The guest we had invited was arriving at two o'clock. We had two hours, five juniors, and a specification written on the way to campus. We finished in one hour, launched live on stage via Python gesture recognition.",
    metrics: [
      { value: "1 hour", label: "Build & deploy time to production" },
      { value: "2 hours", label: "Deadline given before guest arrival" },
      { value: "5", label: "Non-founder junior builders (3rd & 1st year)" },
    ],
    stack: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "Lenis", "Python", "OpenCV", "MediaPipe"],
    repo: null,
    live: "https://celestia-web-lti6.vercel.app",
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The One-Hour Challenge",
      paragraphs: [
        "On 25 March 2026 the Computer Science department was relaunching its association as Celestia. ELEVATES coordinated the entire relaunch event, and we had invited the chief guest: Moosa Mehar MP, Co-Founder and CEO of TinkerHub Foundation. He was arriving at 2:00 PM.",
        "The association's website was three years old and needed a complete overhaul.",
        "With two hours left, two of us called the HOD from the back of a bike and asked for permission to rebuild it before the guest arrived. Then we named five students, pulled them into a lab, and built it in 60 minutes.",
      ],
      highlight:
        "We invited TinkerHub's CEO, coordinated the event, and rebuilt the department website in 60 minutes.",
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
      summary:
        "Shipped in 1 hour and deployed live on Vercel before the chief guest arrived. Launched on stage with 100% gesture recognition accuracy on the first attempt.",
      metrics: [
        { value: "100%", label: "First-attempt gesture launch accuracy on stage" },
        { value: "60 mins", label: "Total time from phone call to Vercel deploy" },
      ],
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
      { role: "Directed the build from the bike", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
      { role: "Wrote the build specification", name: "Naseem Shan", founderId: "naseem-shan" },
      { role: "Operations coordination", name: "Adhinan K", founderId: "adhinan-k" },
      { role: "Fetched student builders", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek" },
      { role: "Fetched student builders", name: "Mashood M", founderId: "mashood-m" },
    ],
    contributors: [
      { name: "Faseen", detail: "3rd year, CSE — Frontend Build" },
      { name: "Shibin", detail: "3rd year, CSE — Frontend Build" },
      { name: "Zakariya", detail: "3rd year, CSE — Frontend Build" },
      { name: "Danish", detail: "1st year, T2 — Frontend Build" },
      { name: "Abhijith CJ", detail: "3rd year, AI & DS — Gesture Launch Developer" },
    ],
    faculty: [
      { name: "Faculty Coordinator", detail: "ELEVATES Faculty Head" },
      { name: "HOD, Computer Science", detail: "HOD, CSE" },
    ],
    stackAndCode: {
      technologies: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Python", "OpenCV", "MediaPipe"],
      repoUrl: null,
      repoNote: "Production site deployed directly to Vercel preview under CSE Association.",
    },
    gallery: [],
  },
  {
    id: "roadundo",
    slug: "roadundo",
    title: "RoadUndo",
    client: "Open Source Utility · ELEVATES Foundation",
    date: "August 2026",
    type: "open-tool",
    status: "live-unmaintained",
    tagline: "Kerala road passability and disaster board · Free Open Public API",
    summary:
      "A Kerala road passability and disaster board, with a free open API for 5,057 pincodes, LSGD wards, OpenStreetMap roads, live KSEB dam levels, and IMD weather alerts.",
    metrics: [
      { value: "5,057", label: "post offices mapped to LSGD wards" },
      { value: "18", label: "reservoirs tracked live with spillway data" },
      { value: "8", label: "open API endpoints (no key, no cost)" },
    ],
    stack: ["Next.js 15", "TypeScript 5", "Neon Postgres", "Drizzle ORM", "Leaflet", "OpenStreetMap Overpass API"],
    repo: "https://github.com/Elevates-Foundation/RoadUndo",
    live: "https://roadundo.vercel.app",
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Monsoon Problem",
      paragraphs: [
        "Kerala floods. Every monsoon the same question moves through a hundred WhatsApp groups at once: is this road open? Do people need help?",
        "The official information exists spread across the KSEB dam portal, IMD bulletins, and PDF press notes, and none of it sits in one readable format.",
        "So we put it in one place and opened it to everyone as a free, open-source public data API and real-time dashboard.",
      ],
      highlight:
        "Official Kerala disaster data exists in scattered PDFs and portals. We put it in one place and opened it to everyone.",
    },
    numbers: [
      { value: "5,057", label: "Kerala post offices with GPS mapped to LSGD wards" },
      { value: "18", label: "reservoirs with live water level, storage %, and spillway data" },
      { value: "14", label: "districts covered for alerts & emergency helplines" },
      { value: "8", label: "public API endpoints (CORS open, no key, no signup)" },
    ],
    whatWeBuilt: [
      "The Data Layer: Pincode to LSGD ward resolver, OpenStreetMap road geometry, daily water levels for 18 reservoirs, live IMD alerts.",
      "The Reporting Layer: Road passability status reports (Open / Flooded / Blocked) and location-based SOS alerts.",
    ],
    howItHeldUp: {
      summary:
        "The automated data engine and OpenStreetMap Overpass mirror failover system run seamlessly in production.",
      metrics: [
        { value: "8", label: "CORS-open public API endpoints" },
        { value: "3", label: "Overpass API mirrors for automatic failover" },
      ],
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
      technologies: ["Next.js 15 App Router", "TypeScript 5", "Neon Serverless Postgres", "Drizzle ORM", "Leaflet", "OpenStreetMap API"],
      repoUrl: "https://github.com/Elevates-Foundation/RoadUndo",
      repoNote: "Open-source repository hosted under Elevates-Foundation GitHub organization.",
    },
    gallery: [],
  },
];

const DEFAULT_SHOWCASES: MemberShowcase[] = [
  {
    id: "sc-01",
    title: "Vibranium RFID Gate Scanner",
    builder: "Muhammed Shanif P",
    builderId: "shanif-p",
    cohort: "2025-26",
    status: "live",
    description: "ESP32 + RC522 RFID embedded scanner hardware communicating with Elevates OS attendance engine via WebSocket.",
    repo: "https://github.com/elevates-club/vibranium-rfid",
    live: null,
  },
  {
    id: "sc-02",
    title: "CTF Defense Sandbox",
    builder: "Adhinan K",
    builderId: "adhinan-k",
    cohort: "2025-26",
    status: "live",
    description: "Dockerized capture-the-flag sandbox environment running live reverse engineering and web exploitation challenges.",
    repo: "https://github.com/elevates-club/ctf-defense",
    live: "https://ctf.elevates.live",
  },
];

const DEFAULT_ARCHIVE: AlsoBuiltItem[] = [
  {
    id: "ar-01",
    name: "Aaroh v1 Alpha Prototype",
    year: "2025",
    status: "archived",
    reason: "Superseded by Vite + Supabase rewrite for Aaroh 2026. Handled initial 120 student registrations.",
    repo: "https://github.com/elevates-club/aaroh-alpha",
  },
  {
    id: "ar-02",
    name: "EKC Student Portal Scraper",
    year: "2024",
    status: "archived",
    reason: "Internal student script to extract timetable and attendance thresholds. Retired upon official API launch.",
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10.5px] font-bold text-[#2d2d34] uppercase tracking-wider block">
        {label}
      </label>
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

type ActiveSection = "flagship" | "showcases" | "archive";

export default function ProjectsCMSPage() {
  const { store, createProject, updateProject } = useStore();
  const [section, setSection] = useState<ActiveSection>("flagship");
  const [search, setSearch] = useState("");
  const [flagship, setFlagship] = useState<FlagshipProject[]>(CANONICAL_FLAGSHIP_PROJECTS);
  const [showcases, setShowcases] = useState<MemberShowcase[]>(DEFAULT_SHOWCASES);
  const [archive, setArchive] = useState<AlsoBuiltItem[]>(DEFAULT_ARCHIVE);

  useEffect(() => {
    if (store.projects && store.projects.length > 0) {
      const dynamicProjects: FlagshipProject[] = store.projects.map((p) =>
        parseProjectToCaseStudy(p, "ELEVATES Foundation"),
      );
      // Merge with canonical projects if not already present
      const combined = [...dynamicProjects];
      for (const canonical of CANONICAL_FLAGSHIP_PROJECTS) {
        if (!combined.some((c) => c.slug === canonical.slug || c.id === canonical.id)) {
          combined.push(canonical);
        }
      }
      setFlagship(combined);
    }
  }, [store.projects]);

  const [editing, setEditing] = useState<FlagshipProject | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editShowcase, setEditShowcase] = useState<MemberShowcase | null>(null);

  const q = search.toLowerCase().trim();

  const blank = (): FlagshipProject =>
    blankCaseStudy(store.chapters[0]?.id, "ELEVATES Foundation");

  const filteredFlagship = flagship.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.stack.some((s) => s.toLowerCase().includes(q)),
  );

  const filteredShowcases = showcases.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.builder.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );

  const filteredArchive = archive.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.year.includes(q),
  );

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
          className="absolute bottom-2 right-40 h-16 w-16 bg-[#9333ea] opacity-10 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                WEBSITE CMS {"//"} CASE STUDIES
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                ELEVATES.LIVE/PROJECTS · PRODUCTION PROOF
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Projects &amp; Production Proof.
              <span className="block text-[#f26430]">Engineered by Students. Shipped at Scale.</span>
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Manage all Flagship Case Studies, Member Showcases, and production proof published on elevates.live/projects — architectural situation reports, load tests, metric proof, and GitHub repositories.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {section === "flagship" && (
              <button
                type="button"
                onClick={() => {
                  setEditing(blank());
                  setIsNew(true);
                }}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>New Case Study</span>
              </button>
            )}

            <Link href="/hq/website">
              <button
                type="button"
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#414066]" />
                <span>CMS Hub</span>
              </button>
            </Link>

            <a
              href="https://elevates.live/projects"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Globe size={13} className="text-[#f26430]" />
              <span>Live Site ↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Flagship Builds */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // FLAGSHIP BUILDS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {flagship.length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Flagship Case Studies
          </p>
        </div>

        {/* Metric 02: Member Showcases */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // MEMBER SHOWCASES
            </span>
            <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#414066]">
            {showcases.length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Student Builds
          </p>
        </div>

        {/* Metric 03: Production Systems */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // PRODUCTION AUDITS
            </span>
            <span className="h-2 w-2 bg-[#9333ea] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#9333ea]">
            {flagship.filter((p) => p.type === "flagship").length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            High-Load Systems
          </p>
        </div>

        {/* Metric 04: GitHub Repos */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // OPEN REPOSITORIES
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {flagship.filter((p) => p.repo).length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Open Source Repos
          </p>
        </div>
      </section>

      {/* ── 3. TABS & FILTER STRIP ─────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Monospace Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSection("flagship")}
            className={`h-8.5 px-3.5 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              section === "flagship"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <Star size={13} />
            <span>Flagship Case Studies ({flagship.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSection("showcases")}
            className={`h-8.5 px-3.5 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              section === "showcases"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <Users size={13} />
            <span>Member Showcases ({showcases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSection("archive")}
            className={`h-8.5 px-3.5 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              section === "archive"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <Archive size={13} />
            <span>Also Built Archive ({archive.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, stack, or builders..."
            className="h-8.5 w-full pl-8 pr-3 rounded-[6px] border border-[#2d2d34]/30 bg-white font-mono text-xs text-[#2d2d34] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#2d2d34] focus:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </section>

      {/* ── 4. FLAGSHIP CASE STUDIES SECTION ───────────────────────────── */}
      {section === "flagship" && (
        <section className="space-y-4">
          {filteredFlagship.map((p) => {
            const tone = STATUS_TONE[p.status] || STATUS_TONE.live;
            return (
              <div
                key={p.id}
                className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3.5px_3.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all relative overflow-hidden"
              >
                {/* Architectural background accent */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#f26430]/5 via-transparent to-transparent pointer-events-none select-none" />

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${tone.bg} ${tone.text} ${tone.border}`}
                      >
                        {p.status}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-sky-300 bg-sky-50 text-sky-700">
                        {p.type}
                      </span>
                      <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] border border-[#2d2d34]/20 px-2 py-0.5 rounded-[4px]">
                        /{p.slug}
                      </span>

                      {p.live && (
                        <a
                          href={p.live}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10.5px] font-bold text-[#f26430] bg-[#fef0eb] border border-[#f26430]/30 hover:border-[#f26430] px-2 py-0.5 rounded-[4px] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={10} /> Live Demo ↗
                        </a>
                      )}
                      {p.repo && (
                        <a
                          href={p.repo}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10.5px] font-bold text-[#2d2d34] bg-[#faf9f6] border border-[#2d2d34]/30 hover:border-[#2d2d34] px-2 py-0.5 rounded-[4px] flex items-center gap-1 transition-colors"
                        >
                          <Code2 size={10} /> Repository ↗
                        </a>
                      )}
                    </div>

                    {/* Headline & Subhead */}
                    <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-black text-[#2d2d34] group-hover:text-[#f26430] transition-colors">
                      {p.title}
                    </h3>
                    <p className="font-mono text-xs text-[#71717a] mt-0.5">
                      📍 {p.client} · {p.date}
                    </p>

                    {/* Tagline */}
                    <p className="text-xs text-[#52525b] font-medium mt-2 italic border-l-2 border-[#f26430] pl-2.5 py-0.5 bg-[#faf9f6] rounded-r-[6px]">
                      &quot;{p.tagline}&quot;
                    </p>

                    {/* Metric Pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {p.metrics.map((m, i) => (
                        <span
                          key={i}
                          className="font-mono text-xs font-bold text-[#2d2d34] bg-white border border-[#2d2d34]/20 rounded-[6px] px-2.5 py-1 shadow-[1px_1px_0px_#2d2d34] flex items-center gap-1.5"
                        >
                          <span className="text-[#f26430]">⚡</span>
                          <span className="text-[#f26430]">{m.value}</span>
                          <span className="text-[#71717a] font-normal">{m.label}</span>
                        </span>
                      ))}
                    </div>

                    {/* Tech Stack Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {p.stack.map((s) => (
                        <span
                          key={s}
                          className="font-mono text-[10px] bg-[#faf9f6] border border-[#2d2d34]/15 px-2 py-0.5 rounded-[4px] text-[#52525b]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Builders */}
                    {p.builders.length > 0 && (
                      <p className="font-mono text-xs text-[#52525b] mt-3">
                        <strong className="text-[#2d2d34]">Build Team: </strong>
                        {p.builders.map((b) => b.name).join(", ")}
                      </p>
                    )}

                    {/* Metadata Counters */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#2d2d34]/10">
                      <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] border border-[#2d2d34]/15 rounded-[4px] px-2 py-0.5">
                        {p.whatWeBuilt.length} built deliverables
                      </span>
                      <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] border border-[#2d2d34]/15 rounded-[4px] px-2 py-0.5">
                        {p.gallery.length} case gallery items
                      </span>
                      <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] border border-[#2d2d34]/15 rounded-[4px] px-2 py-0.5">
                        {p.whatWeWouldDoDifferently.length} post-mortems
                      </span>
                      <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] border border-[#2d2d34]/15 rounded-[4px] px-2 py-0.5">
                        {p.stackAndCode.technologies.length} tech tags
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col gap-2 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p);
                        setIsNew(false);
                      }}
                      className="h-8.5 px-3.5 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit size={13} />
                      <span>Edit Case</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Delete project "${p.title}"?`)) {
                          setFlagship((prev) => prev.filter((x) => x.id !== p.id));
                          try {
                            await fetch("/api/mutations", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                type: "delete_project",
                                data: { id: p.id, slug: p.slug },
                              }),
                            });
                          } catch (e) {
                            console.error("Failed to delete project:", e);
                          }
                        }
                      }}
                      className="h-8.5 px-3 rounded-[6px] bg-white hover:bg-red-50 text-[#dc2626] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#dc2626] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredFlagship.length === 0 && (
            <div className="text-center py-16 bg-white border border-[#2d2d34]/20 rounded-[14px] shadow-[2px_2px_0px_#2d2d34] p-8 bauhaus-grid-bg">
              <Star className="w-8 h-8 text-[#71717a] mx-auto mb-2" />
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                No flagship case studies match "{search}"
              </p>
              <p className="font-mono text-xs text-[#71717a] mt-1">
                Click "+ New Case Study" to compose a new 9-tab flagship architecture review.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── 5. MEMBER SHOWCASES SECTION ─────────────────────────────────── */}
      {section === "showcases" && (
        <section className="space-y-3">
          {filteredShowcases.map((s) => {
            const tone = STATUS_TONE[s.status] || STATUS_TONE.live;
            return (
              <div
                key={s.id}
                className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] transition-all flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${tone.bg} ${tone.text} ${tone.border}`}
                    >
                      {s.status}
                    </span>
                    <span className="font-mono text-[10px] text-[#71717a] bg-[#faf9f6] px-2 py-0.5 rounded-[4px] border border-[#2d2d34]/20">
                      Cohort {s.cohort}
                    </span>
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                    {s.title}
                  </h3>
                  <p className="font-mono text-xs text-[#71717a] mt-0.5">
                    Lead Builder: <span className="text-[#f26430] font-bold">{s.builder}</span>
                  </p>
                  <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed">{s.description}</p>
                  <div className="flex gap-3 mt-2 font-mono text-xs">
                    {s.repo && (
                      <a
                        href={s.repo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#f26430] hover:underline flex items-center gap-1 font-bold"
                      >
                        <Code2 size={12} /> Repo ↗
                      </a>
                    )}
                    {s.live && (
                      <a
                        href={s.live}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#f26430] hover:underline flex items-center gap-1 font-bold"
                      >
                        <ExternalLink size={12} /> Live Preview ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditShowcase(s)}
                    className="h-8 px-3 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] flex items-center gap-1.5"
                  >
                    <Edit size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowcases((prev) => prev.filter((x) => x.id !== s.id))}
                    className="h-8 w-8 rounded-[6px] bg-white hover:bg-red-50 text-[#dc2626] border border-[#2d2d34]/20 hover:border-[#dc2626] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setShowcases((prev) => [
                ...prev,
                {
                  id: `sc-${Date.now()}`,
                  title: "New Student Project",
                  builder: "Student Builder",
                  builderId: "student-id",
                  cohort: "2025-26",
                  status: "live",
                  description: "Project description and campus impact.",
                  repo: null,
                  live: null,
                },
              ])
            }
            className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={13} /> Add Member Showcase
          </button>
        </section>
      )}

      {/* ── 6. ALSO BUILT ARCHIVE SECTION ───────────────────────────────── */}
      {section === "archive" && (
        <section className="space-y-3">
          <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white overflow-hidden divide-y divide-[#2d2d34]/10 shadow-[2px_2px_0px_#2d2d34]">
            {filteredArchive.map((item) => {
              const tone = STATUS_TONE[item.status] || STATUS_TONE.archived;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[#faf9f6] transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-[family-name:var(--font-display)] font-bold text-sm text-[#2d2d34]">
                        {item.name}
                      </span>
                      <span className="font-mono text-xs text-[#71717a]">{item.year}</span>
                      <span
                        className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${tone.bg} ${tone.text} ${tone.border}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#52525b] max-w-2xl">{item.reason}</p>
                    <div className="flex gap-3 mt-1.5 font-mono text-xs">
                      {item.slug && (
                        <span className="text-[#71717a]">→ Post-Mortem at /projects/{item.slug}</span>
                      )}
                      {item.repo && (
                        <a
                          href={item.repo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#f26430] hover:underline font-bold"
                        >
                          Repository ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArchive((prev) => prev.filter((x) => x.id !== item.id))}
                    className="h-8 w-8 rounded-[6px] bg-white hover:bg-red-50 text-[#dc2626] border border-[#2d2d34]/20 hover:border-[#dc2626] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] flex items-center justify-center transition-all cursor-pointer self-start sm:self-center shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setArchive((prev) => [
                ...prev,
                {
                  id: `ar-${Date.now()}`,
                  name: "New Archive Project",
                  year: "2026",
                  status: "archived",
                  reason: "Brief reason for archival or migration.",
                },
              ])
            }
            className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={13} /> Add to Archive
          </button>
        </section>
      )}

      {/* ── 7. EDIT MODALS ─────────────────────────────────────────────── */}
      {editing && (
        <CaseStudyEditor
          project={editing}
          onClose={() => {
            setEditing(null);
            setIsNew(false);
          }}
          onSave={async (saved) => {
            const cleanSaved = {
              ...saved,
              slug: finalizeSlug(saved.slug || saved.title || "project"),
            };
            if (isNew) setFlagship((prev) => [...prev, cleanSaved]);
            else setFlagship((prev) => prev.map((p) => (p.id === cleanSaved.id ? cleanSaved : p)));

            try {
              const defaultChapter = store.chapters[0];
              const chapterId =
                cleanSaved.chapterId || defaultChapter?.id || "00000000-0000-0000-0000-000000000001";
              const existingProject = store.projects.find((p) => p.id === cleanSaved.id);
              const projectPayload = serializeCaseStudyToProject(
                cleanSaved,
                chapterId,
                existingProject,
              );

              if (isNew) {
                createProject(projectPayload);
              } else {
                updateProject(cleanSaved.id, projectPayload);
              }

              await fetch("/api/mutations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "project",
                  data: {
                    id: cleanSaved.id,
                    chapterId,
                    title: cleanSaved.title,
                    slug: cleanSaved.slug,
                    description: projectPayload.description,
                    stage: projectPayload.stage,
                    projectType: projectPayload.projectType,
                    repositoryUrl: cleanSaved.repo,
                    demoUrl: cleanSaved.live,
                    progress: projectPayload.progress,
                    awards: projectPayload.awards,
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
          <div className="w-full max-w-lg rounded-[16px] bg-white shadow-[4px_4px_0px_#2d2d34] border-2 border-[#2d2d34] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2d2d34]/20 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#f26430] uppercase tracking-wider bg-[#fef0eb] px-2 py-0.5 rounded-[4px] border border-[#f26430]/30">
                  STUDENT SHOWCASE
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-black text-[#2d2d34] mt-1">
                  Edit Member Showcase
                </h3>
              </div>
              <button
                onClick={() => setEditShowcase(null)}
                className="text-[#71717a] hover:text-[#2d2d34] p-1.5 rounded-[6px] hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <Field label="Project Title">
              <TInput
                value={editShowcase.title}
                onChange={(v) => setEditShowcase((s) => s && { ...s, title: v })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Builder Name">
                <TInput
                  value={editShowcase.builder}
                  onChange={(v) => setEditShowcase((s) => s && { ...s, builder: v })}
                />
              </Field>
              <Field label="Builder ID">
                <TInput
                  value={editShowcase.builderId}
                  onChange={(v) => setEditShowcase((s) => s && { ...s, builderId: v })}
                  mono
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cohort">
                <TInput
                  value={editShowcase.cohort}
                  onChange={(v) => setEditShowcase((s) => s && { ...s, cohort: v })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 font-mono text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34]"
                  value={editShowcase.status}
                  onChange={(e) =>
                    setEditShowcase((s) => s && { ...s, status: e.target.value as ProjectStatus })
                  }
                >
                  {["live", "live-incomplete", "live-unmaintained", "paused", "archived"].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <TArea
                value={editShowcase.description}
                onChange={(v) => setEditShowcase((s) => s && { ...s, description: v })}
                rows={3}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Live URL">
                <TInput
                  value={editShowcase.live ?? ""}
                  onChange={(v) => setEditShowcase((s) => s && { ...s, live: v || null })}
                  mono
                  placeholder="https://myproject.vercel.app"
                />
              </Field>
              <Field label="Repo URL">
                <TInput
                  value={editShowcase.repo ?? ""}
                  onChange={(v) => setEditShowcase((s) => s && { ...s, repo: v || null })}
                  mono
                  placeholder="https://github.com/..."
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2d2d34]/20">
              <button
                type="button"
                onClick={() => setEditShowcase(null)}
                className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowcases((prev) =>
                    prev.map((s) => (s.id === editShowcase.id ? editShowcase : s)),
                  );
                  setEditShowcase(null);
                }}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
              >
                Save Showcase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

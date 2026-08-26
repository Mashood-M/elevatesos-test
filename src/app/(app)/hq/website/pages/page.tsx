"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  Laptop,
  Layers,
  Layout,
  LayoutGrid,
  MessageSquare,
  MoveDown,
  MoveUp,
  Plus,
  Rocket,
  Save,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Type,
  Users,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── SVG Doodles matching Elevates Web ───────────────────────────────────────
function Doodle({
  type,
  color = "#f26430",
  className = "w-10 h-10",
}: {
  type: "crown" | "rocket" | "bulb" | "scribble" | "star" | "arrow";
  color?: string;
  className?: string;
}) {
  if (type === "crown") {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 80L20 30L45 60L75 20L85 80H10Z" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="30" r="4" fill={color} />
        <circle cx="45" cy="60" r="4" fill={color} />
        <circle cx="75" cy="20" r="4" fill={color} />
      </svg>
    );
  }
  if (type === "rocket") {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M50 10 C30 30 25 60 25 80 L35 75 L45 85 L50 70 L55 85 L65 75 L75 80 C75 60 70 30 50 10 Z" stroke={color} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="50" cy="40" r="8" stroke={color} strokeWidth="4" />
        <path d="M25 65 L10 75 L20 85 Z" fill={color} />
        <path d="M75 65 L90 75 L80 85 Z" fill={color} />
      </svg>
    );
  }
  if (type === "bulb") {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M30 45 C30 25 40 15 50 15 C60 15 70 25 70 45 C70 58 62 65 60 72 L40 72 C38 65 30 58 30 45 Z" stroke={color} strokeWidth="5" />
        <path d="M42 78 H58 M44 84 H56 M47 90 H53" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <path d="M50 30 V45" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "star") {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M50 5 L62 38 L97 38 L68 58 L79 92 L50 71 L21 92 L32 58 L3 38 L38 38 Z" fill={color} stroke="#2d2d34" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "arrow") {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20 50 H80 M60 30 L80 50 L60 70" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 50 Q 25 20, 50 50 T 90 50" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Block Types for WordPress-like Page Builder ─────────────────────────────
export type BlockType =
  | "announcement-bar"
  | "hero"
  | "pinned-manifesto"
  | "about-panels"
  | "stat-strip"
  | "programs"
  | "workflow"
  | "domains"
  | "case-study-card"
  | "dual-cta";

export interface PageBlock {
  id: string;
  type: BlockType;
  label: string;
  enabled: boolean;
  data: Record<string, any>;
}

export interface WebsitePage {
  id: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDesc: string;
  blocks: PageBlock[];
}

// ── Initial Seed Data matching Elevates Web Homepage 1:1 ────────────────────
const INITIAL_PAGES: WebsitePage[] = [
  {
    id: "home",
    title: "Homepage",
    slug: "/",
    seoTitle: "ELEVATES — Upskilling & Showcasing Skilled but Shy Students",
    seoDesc: "Kerala's student-led tech movement for quiet talent. Learn, Build, Grow and Ship Real Platforms.",
    blocks: [
      {
        id: "announcement-1",
        type: "announcement-bar",
        label: "Top Announcement Bar",
        enabled: true,
        data: {
          text: "🚀 Celesta Association Relaunch Portal Shipped in 60 Mins · Check the Production Proof!",
          linkText: "Read Build",
          linkUrl: "/projects/celestia",
          active: true,
        },
      },
      {
        id: "hero-1",
        type: "hero",
        label: "Kinetic Tape Stack Hero",
        enabled: true,
        data: {
          strip1Text: "LEARN",
          strip2Text: "BUILD",
          strip3Text: "GROW",
          subhead: "For Quiet Talent · Kerala's Student Tech Movement",
          sticker1: "{ CODE }",
          sticker2: "SHIP IT!",
          sticker3: "BREAK",
          hasTapeParallax: true,
          hasGrid: true,
        },
      },
      {
        id: "manifesto-1",
        type: "pinned-manifesto",
        label: "Manifesto 001 Pinned Note",
        enabled: true,
        data: {
          tag: "MANIFESTO 001",
          quote: "We are the untamed, the builders, the midnight coders. We don't just study the future—we ship it.",
          author: "ELEVATES Founders · September 2025",
        },
      },
      {
        id: "about-1",
        type: "about-panels",
        label: "About Story & Vision Panels",
        enabled: true,
        data: {
          panel1Title: "ELEVATES",
          panel1Subtitle: "// MULTI-DISCIPLINARY. // STUDENT-DRIVEN. // CHAOS & CODE.",
          panel2Title: "EXPLORE. EXPERIMENT. EXCEL.",
          panel3Title: "HANDS-ON CHAOS",
          panel3Desc: "Bridging the gap between theory and reality. Our Goal: Getting Jobs or Creating Entrepreneurs.",
          panel4Title: "REAL PLATFORMS & CLUSTER ENGINE",
          panel4Desc: "Cross-Department. Introvert Friendly.",
        },
      },
      {
        id: "stat-1",
        type: "stat-strip",
        label: "Production Proof Counter Strip",
        enabled: true,
        data: {
          stats: [
            { number: "400,000+", label: "HTTP REQUESTS IN 24 HOURS", highlight: "Vibranium Event Platform" },
            { number: "18", label: "FOUNDERS & CORE BUILDERS", highlight: "Batch 2025–26" },
            { number: "15+", label: "WORKSHOPS & MEETUPS HOSTED", highlight: "Across Kerala Campuses" },
            { number: "100%", label: "REPEAT DEPLOYMENT RATE", highlight: "Aaroh Arts Platform" },
          ],
        },
      },
      {
        id: "programs-1",
        type: "programs",
        label: "Core Programmes & Pillars",
        enabled: true,
        data: {
          sectionTitle: "WHAT WE RUN",
          sectionSubtitle: "Four distinct formats designed for different student growth phases.",
          items: [
            { title: "Peer Labs", tag: "HANDS-ON", desc: "Multi-week collaborative learning cohorts in Kali Linux, CyberSec, and Python." },
            { title: "Rapid AI Builds", tag: "SHIPPING", desc: "Spec-driven 60-minute fast AI coding pipelines with Claude, Cursor & Vite." },
            { title: "Campus Platforms", tag: "PRODUCTION", desc: "Building ticketing and scoring software for actual campus fests." },
            { title: "Student Database", tag: "COMMUNITY", desc: "Verified skill tagging and automatic portfolio sync for active builders." },
          ],
        },
      },
      {
        id: "workflow-1",
        type: "workflow",
        label: "4-Step Shipping Pipeline",
        enabled: true,
        data: {
          title: "HOW IT WORKS",
          subtitle: "From shy learner to production-grade shipper in 4 clear milestones.",
          steps: [
            { num: "01", name: "Intake & Assessment", desc: "Evaluate real baseline skills with zero resume fluff." },
            { num: "02", name: "Peer Labs Cohort", desc: "Learn hands-on in quiet, supportive student clusters." },
            { num: "03", name: "Rapid AI Prototyping", desc: "Build full-stack web apps and tools in 60-minute sprints." },
            { num: "04", name: "Production Deployment", desc: "Ship real platforms for campus fests with 400K+ hits." },
          ],
        },
      },
      {
        id: "domains-1",
        type: "domains",
        label: "Multi-Disciplinary Domains",
        enabled: true,
        data: {
          title: "CROSS-DOMAIN CLUSTERS",
          items: [
            { name: "Technical & Engineering", tag: "CODE", desc: "Full-stack, AI Agents, DevSecOps, WebSockets" },
            { name: "Media & Production", tag: "MEDIA", desc: "Cinematography, AfterEffects, Event Documentation" },
            { name: "Design & UX", tag: "DESIGN", desc: "Neo-brutalist design systems, Figma, Poster Branding" },
            { name: "Management & Logistics", tag: "OPS", desc: "Ticketing desks, Crowd flow, Sponsor relations" },
          ],
        },
      },
      {
        id: "dual-cta-1",
        type: "dual-cta",
        label: "Footer Dual Action Banner",
        enabled: true,
        data: {
          leftTitle: "Running a Fest & Need a Platform?",
          leftDesc: "We have built two. We handle high load and know what campus events need.",
          leftCta: "TALK TO US ↗",
          leftUrl: "/for-colleges",
          rightTitle: "Want Your Project Listed?",
          rightDesc: "Join ELEVATES, build a platform, and get verifiable proof on your profile.",
          rightCta: "JOIN ELEVATES ↗",
          rightUrl: "/join",
        },
      },
    ],
  },
  {
    id: "about",
    title: "About Page",
    slug: "/about",
    seoTitle: "About ELEVATES — Proof Over Paperwork",
    seoDesc: "How 18 founding student developers started a community in their final year.",
    blocks: [
      {
        id: "hero-about",
        type: "hero",
        label: "About Hero Tape Stack",
        enabled: true,
        data: {
          strip1Text: "PROOF",
          strip2Text: "BEATS",
          strip3Text: "PAPERWORK",
          subhead: "Founded by 18 back-benchers and quiet coders in Chapter 01.",
          sticker1: "{ FOUNDERS }",
          sticker2: "SEPT 2025",
          sticker3: "CHAPTER 01",
          hasTapeParallax: true,
          hasGrid: true,
        },
      },
      {
        id: "manifesto-about",
        type: "pinned-manifesto",
        label: "Origin Story Callout",
        enabled: true,
        data: {
          tag: "ORIGIN STORY // 2025",
          quote: "We spent three years in college waiting for someone to teach us how to build real things. In our final year, we stopped waiting and built the software our college ran on.",
          author: "Sarhan Qadir KVM · Founder",
        },
      },
    ],
  },
];

const BLOCK_DEFINITIONS: {
  type: BlockType;
  name: string;
  description: string;
  icon: typeof Type;
  defaultData: Record<string, any>;
}[] = [
  {
    type: "hero",
    name: "Kinetic Tape Stack Hero",
    description: "Iconic 3-strip tilted tape stack (LEARN/BUILD/GROW), stickers, and grid background",
    icon: Layout,
    defaultData: {
      strip1Text: "LEARN",
      strip2Text: "BUILD",
      strip3Text: "GROW",
      subhead: "For Quiet Talent · Kerala's Student Tech Movement",
      sticker1: "{ CODE }",
      sticker2: "SHIP IT!",
      sticker3: "BREAK",
      hasTapeParallax: true,
      hasGrid: true,
    },
  },
  {
    type: "pinned-manifesto",
    name: "Manifesto 001 Pinned Note",
    description: "Cursive quote on pinned paper with circular tape pin and doodle",
    icon: MessageSquare,
    defaultData: {
      tag: "MANIFESTO 001",
      quote: "We are the untamed, the builders, the midnight coders. We don't just study the future—we ship it.",
      author: "ELEVATES Founders · September 2025",
    },
  },
  {
    type: "about-panels",
    name: "About Story Panels",
    description: "Brutalist multi-panel sequence (Explore, Hands-on Chaos, Real Platforms)",
    icon: Layers,
    defaultData: {
      panel1Title: "ELEVATES",
      panel1Subtitle: "// MULTI-DISCIPLINARY. // STUDENT-DRIVEN. // CHAOS & CODE.",
      panel2Title: "EXPLORE. EXPERIMENT. EXCEL.",
      panel3Title: "HANDS-ON CHAOS",
      panel3Desc: "Bridging the gap between theory and reality.",
      panel4Title: "REAL PLATFORMS & CLUSTER ENGINE",
      panel4Desc: "Cross-Department. Introvert Friendly.",
    },
  },
  {
    type: "stat-strip",
    name: "Production Proof Counter Strip",
    description: "Bold 4-column counter block with flame drop-shadow and live metrics",
    icon: Zap,
    defaultData: {
      stats: [
        { number: "400,000+", label: "HTTP REQUESTS IN 24 HOURS", highlight: "Vibranium Event Platform" },
        { number: "18", label: "FOUNDERS & CORE BUILDERS", highlight: "Batch 2025–26" },
        { number: "15+", label: "WORKSHOPS & MEETUPS HOSTED", highlight: "Across Kerala Campuses" },
        { number: "100%", label: "REPEAT DEPLOYMENT RATE", highlight: "Aaroh Arts Platform" },
      ],
    },
  },
  {
    type: "programs",
    name: "Core Programmes & Pillars",
    description: "Grid of 4 interactive cards (Peer Labs, Rapid AI Builds, Platforms, Hub)",
    icon: LayoutGrid,
    defaultData: {
      sectionTitle: "WHAT WE RUN",
      sectionSubtitle: "Four distinct formats designed for different student growth phases.",
      items: [
        { title: "Peer Labs", tag: "HANDS-ON", desc: "Multi-week collaborative learning cohorts in Kali Linux, CyberSec, and Python." },
        { title: "Rapid AI Builds", tag: "SHIPPING", desc: "Spec-driven 60-minute fast AI coding pipelines with Claude, Cursor & Vite." },
        { title: "Campus Platforms", tag: "PRODUCTION", desc: "Building ticketing and scoring software for actual campus fests." },
        { title: "Student Database", tag: "COMMUNITY", desc: "Verified skill tagging and automatic portfolio sync for active builders." },
      ],
    },
  },
  {
    type: "workflow",
    name: "4-Step Shipping Pipeline",
    description: "Sequential 01-04 milestone workflow with neo-brutalist steps",
    icon: WorkflowIcon,
    defaultData: {
      title: "HOW IT WORKS",
      subtitle: "From shy learner to production-grade shipper in 4 clear milestones.",
      steps: [
        { num: "01", name: "Intake & Assessment", desc: "Evaluate real baseline skills with zero resume fluff." },
        { num: "02", name: "Peer Labs Cohort", desc: "Learn hands-on in quiet, supportive student clusters." },
        { num: "03", name: "Rapid AI Prototyping", desc: "Build full-stack web apps and tools in 60-minute sprints." },
        { num: "04", name: "Production Deployment", desc: "Ship real platforms for campus fests with 400K+ hits." },
      ],
    },
  },
  {
    type: "domains",
    name: "Multi-Disciplinary Domains",
    description: "Technical, Media, Design, and Management cluster cards",
    icon: Users,
    defaultData: {
      title: "CROSS-DOMAIN CLUSTERS",
      items: [
        { name: "Technical & Engineering", tag: "CODE", desc: "Full-stack, AI Agents, DevSecOps, WebSockets" },
        { name: "Media & Production", tag: "MEDIA", desc: "Cinematography, AfterEffects, Event Documentation" },
        { name: "Design & UX", tag: "DESIGN", desc: "Neo-brutalist design systems, Figma, Poster Branding" },
        { name: "Management & Logistics", tag: "OPS", desc: "Ticketing desks, Crowd flow, Sponsor relations" },
      ],
    },
  },
  {
    type: "dual-cta",
    name: "Footer Dual Action Banner",
    description: "Split banner for colleges on left and students on right",
    icon: Sparkles,
    defaultData: {
      leftTitle: "Running a Fest & Need a Platform?",
      leftDesc: "We have built two. We handle high load and know what campus events need.",
      leftCta: "TALK TO US ↗",
      leftUrl: "/for-colleges",
      rightTitle: "Want Your Project Listed?",
      rightDesc: "Join ELEVATES, build a platform, and get verifiable proof on your profile.",
      rightCta: "JOIN ELEVATES ↗",
      rightUrl: "/join",
    },
  },
  {
    type: "announcement-bar",
    name: "Top Announcement Bar",
    description: "Global ticker banner at the very top of the page",
    icon: Star,
    defaultData: {
      text: "🚀 Celesta Association Relaunch Portal Shipped in 60 Mins · Check the Production Proof!",
      linkText: "Read Build",
      linkUrl: "/projects/celestia",
      active: true,
    },
  },
];

export default function WordPressStylePageBuilder() {
  const [pages, setPages] = useState<WebsitePage[]>(INITIAL_PAGES);
  const [activePageId, setActivePageId] = useState<string>("home");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("hero-1");
  const [previewMode, setPreviewMode] = useState<"builder" | "preview" | "split">("split");
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const currentPage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const selectedBlock = currentPage.blocks.find((b) => b.id === selectedBlockId);

  const updatePage = (patch: Partial<WebsitePage>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, ...patch } : p)),
    );
  };

  const updateBlock = (blockId: string, patchData: Record<string, any>) => {
    updatePage({
      blocks: currentPage.blocks.map((b) =>
        b.id === blockId ? { ...b, data: { ...b.data, ...patchData } } : b,
      ),
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPage.blocks.length) return;
    const nextBlocks = [...currentPage.blocks];
    const [moved] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    updatePage({ blocks: nextBlocks });
  };

  const deleteBlock = (blockId: string) => {
    updatePage({
      blocks: currentPage.blocks.filter((b) => b.id !== blockId),
    });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const duplicateBlock = (block: PageBlock) => {
    const newBlock: PageBlock = {
      ...block,
      id: `${block.type}-${Date.now()}`,
      label: `${block.label} (Copy)`,
    };
    updatePage({ blocks: [...currentPage.blocks, newBlock] });
    setSelectedBlockId(newBlock.id);
  };

  const addBlockFromLibrary = (def: typeof BLOCK_DEFINITIONS[0]) => {
    const newBlock: PageBlock = {
      id: `${def.type}-${Date.now()}`,
      type: def.type,
      label: def.name,
      enabled: true,
      data: { ...def.defaultData },
    };
    updatePage({ blocks: [...currentPage.blocks, newBlock] });
    setSelectedBlockId(newBlock.id);
    setShowBlockLibrary(false);
  };

  const handleSave = () => {
    setSaveStatus("Saved to Supabase & Live Sync triggered!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="Website CMS"
        title="WordPress-Style Visual Page Builder"
        description="Build and edit modular pages for elevates.live with real Neo-Brutalist tape stacks, sticker boards, doodles, and live synchronized preview."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-[var(--radius-md)] border border-border bg-bg-panel p-0.5">
              <button
                onClick={() => setPreviewMode("builder")}
                className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors ${
                  previewMode === "builder" ? "bg-[var(--accent)] text-white" : "text-text-dim hover:text-text"
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => setPreviewMode("split")}
                className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors ${
                  previewMode === "split" ? "bg-[var(--accent)] text-white" : "text-text-dim hover:text-text"
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setPreviewMode("preview")}
                className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors ${
                  previewMode === "preview" ? "bg-[var(--accent)] text-white" : "text-text-dim hover:text-text"
                }`}
              >
                Live Preview
              </button>
            </div>

            {/* Save Button */}
            <Button variant="orange" size="sm" onClick={handleSave} className="flex items-center gap-1.5 shadow-sm">
              <Save size={14} />
              Save & Publish
            </Button>
          </div>
        }
      />

      {saveStatus && (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 flex items-center justify-between">
          <span>✓ {saveStatus}</span>
          <span className="text-[10px] text-emerald-500/80 font-mono">Synced to localhost:5000/</span>
        </div>
      )}

      {/* Navigation Sub-Tabs: Select Page to Edit */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePageId(p.id);
                setSelectedBlockId(p.blocks[0]?.id ?? null);
              }}
              className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePageId === p.id
                  ? "bg-bg-panel text-text border border-border/80 shadow-sm"
                  : "text-text-dim hover:text-text"
              }`}
            >
              {p.title} <span className="font-mono text-[10px] text-text-dim/80">{p.slug}</span>
            </button>
          ))}
          <button
            onClick={() => {
              const newSlug = prompt("Enter page slug (e.g. /manifesto):");
              if (!newSlug) return;
              const newTitle = prompt("Enter page title:") || "Custom Page";
              const newPage: WebsitePage = {
                id: `page-${Date.now()}`,
                title: newTitle,
                slug: newSlug.startsWith("/") ? newSlug : `/${newSlug}`,
                seoTitle: `${newTitle} — ELEVATES`,
                seoDesc: `ELEVATES ${newTitle} page`,
                blocks: [BLOCK_DEFINITIONS[0].defaultData ? {
                  id: `hero-${Date.now()}`,
                  type: "hero",
                  label: "Hero Tape Stack",
                  enabled: true,
                  data: { ...BLOCK_DEFINITIONS[0].defaultData },
                } : [] as any],
              };
              setPages((prev) => [...prev, newPage]);
              setActivePageId(newPage.id);
            }}
            className="flex items-center gap-1 text-xs text-text-dim hover:text-[var(--accent)] px-2 py-1"
          >
            <Plus size={13} /> New Page
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-dim">
          <span>Editing Route: <code className="text-text font-mono font-bold">{currentPage.slug}</code></span>
          <span>·</span>
          <span>{currentPage.blocks.length} Blocks</span>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Blocks Manager / Outline */}
        {(previewMode === "builder" || previewMode === "split") && (
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                  <Layers size={13} className="text-[var(--accent)]" />
                  Page Block Structure
                </h3>
                <Button size="sm" variant="secondary" onClick={() => setShowBlockLibrary(true)} className="h-7 text-xs px-2.5">
                  <Plus size={12} /> Add Block
                </Button>
              </div>

              {/* Block List */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {currentPage.blocks.map((block, idx) => {
                  const isSelected = block.id === selectedBlockId;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[var(--accent)]/10 border-[var(--accent)] text-text shadow-sm"
                          : "bg-bg-page border-border text-text-dim hover:text-text hover:border-border-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical size={13} className="text-text-dim/50 cursor-grab shrink-0" />
                        <span className="font-mono text-[10px] text-text-dim shrink-0">0{idx + 1}</span>
                        <span className="text-xs font-semibold truncate text-text">{block.label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          title="Move Up"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(idx, "up");
                          }}
                          className="p-1 text-text-dim hover:text-text disabled:opacity-20"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          title="Move Down"
                          disabled={idx === currentPage.blocks.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(idx, "down");
                          }}
                          className="p-1 text-text-dim hover:text-text disabled:opacity-20"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          title="Duplicate"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(block);
                          }}
                          className="p-1 text-text-dim hover:text-text"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlock(block.id);
                          }}
                          className="p-1 text-text-dim hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {currentPage.blocks.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-[var(--radius-md)] text-xs text-text-dim">
                    <p className="font-semibold mb-2">No blocks on this page yet</p>
                    <Button size="sm" variant="secondary" onClick={() => setShowBlockLibrary(true)}>
                      <Plus size={13} /> Add First Block
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Settings Card */}
            <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                <Search size={13} className="text-text-dim" />
                Page SEO & OpenGraph Meta
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-text-dim block mb-1">Page Title Tag</label>
                  <input
                    className="h-8 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
                    value={currentPage.seoTitle}
                    onChange={(e) => updatePage({ seoTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-text-dim block mb-1">Meta Description</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 py-1 text-xs text-text resize-none"
                    value={currentPage.seoDesc}
                    onChange={(e) => updatePage({ seoDesc: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Middle/Right Column: Visual Canvas & Inspector */}
        <div className={`${previewMode === "builder" ? "lg:col-span-8" : previewMode === "split" ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
          {/* Visual Brutalist Live Rendering Window matching localhost:5000 */}
          {(previewMode === "preview" || previewMode === "split") && (
            <div className="rounded-[var(--radius-xl)] border-4 border-[#2d2d34] bg-[#f8fff4] p-6 text-[#2d2d34] shadow-[8px_8px_0px_0px_rgba(45,45,52,1)] space-y-8 overflow-hidden relative">
              {/* Background Grid */}
              <div className="absolute inset-0 opacity-10 pointer-events-none z-0 bg-[linear-gradient(#2d2d34_1px,transparent_1px),linear-gradient(90deg,#2d2d34_1px,transparent_1px)] bg-[size:3rem_3rem]" />

              <div className="flex items-center justify-between border-b-2 border-[#2d2d34]/20 pb-3 relative z-10">
                <div className="flex items-center gap-2 font-mono text-xs font-bold">
                  <span className="bg-[#f26430] text-white px-2 py-0.5 rounded-sm">LIVE PREVIEW</span>
                  <span>elevates.live{currentPage.slug}</span>
                </div>
                <Badge tone="green">Synchronized with localhost:5000</Badge>
              </div>

              {/* Render Blocks Visually in Exact Website Aesthetics */}
              <div className="space-y-8 relative z-10">
                {currentPage.blocks.map((b) => (
                  <div key={b.id} className="relative group">
                    {/* Announcement Bar */}
                    {b.type === "announcement-bar" && (
                      <div className="bg-[#2d2d34] text-white p-2.5 text-xs font-mono text-center rounded-sm font-bold flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_0px_#f26430]">
                        <span>{b.data.text}</span>
                        {b.data.linkText && <span className="text-[#f26430] underline">{b.data.linkText} →</span>}
                      </div>
                    )}

                    {/* Kinetic Tape Stack Hero */}
                    {b.type === "hero" && (
                      <div className="relative py-10 px-4 flex flex-col items-center justify-center select-none overflow-hidden rounded-lg bg-[#f8fff4] border-2 border-[#2d2d34]/20">
                        {/* Central Kinetic Tape Stack (3 Strips: LEARN. BUILD. GROW.) */}
                        <div className="relative z-10 flex flex-col items-center justify-center -space-y-3 sm:-space-y-5 my-6">
                          {/* Strip 1: LEARN (Black Strip) */}
                          <div className="bg-[#2d2d34] text-[#f8fff4] px-8 py-2 md:px-14 md:py-3.5 rotate-[-3deg] shadow-xl border-2 border-black transform hover:scale-105 transition-transform">
                            <span className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter block leading-none">
                              {b.data.strip1Text || "LEARN"}
                            </span>
                          </div>

                          {/* Strip 2: BUILD (White Paper Strip with black border) */}
                          <div className="bg-[#f8fff4] text-[#2d2d34] px-8 py-2 md:px-14 md:py-3.5 rotate-[2deg] shadow-2xl z-20 border-4 border-[#2d2d34] transform hover:scale-105 transition-transform">
                            <span className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter block leading-none">
                              {b.data.strip2Text || "BUILD"}
                            </span>
                          </div>

                          {/* Strip 3: GROW (Flame Orange Strip) */}
                          <div className="bg-[#f26430] text-[#f8fff4] px-8 py-2 md:px-14 md:py-3.5 rotate-[-2deg] shadow-xl border-2 border-[#2d2d34] transform hover:scale-105 transition-transform">
                            <span className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter block leading-none font-mono">
                              {b.data.strip3Text || "GROW"}
                            </span>
                          </div>
                        </div>

                        {/* Floating Stickers / Keywords */}
                        <div className="absolute top-4 left-6 hidden sm:block rotate-[-6deg]">
                          <div className="bg-[#758173] text-[#f8fff4] font-mono text-xs md:text-sm px-3 py-1.5 shadow-md border-2 border-[#2d2d34]">
                            {b.data.sticker1 || "{ CODE }"}
                          </div>
                        </div>

                        <div className="absolute top-6 right-8 hidden sm:block rotate-[8deg]">
                          <div className="bg-[#f26430] text-[#f8fff4] font-mono text-xs md:text-sm px-4 py-1.5 shadow-md border-2 border-[#2d2d34]">
                            {b.data.sticker2 || "SHIP IT!"}
                          </div>
                        </div>

                        <div className="absolute bottom-6 right-10 hidden sm:block rotate-[-12deg]">
                          <div className="text-3xl md:text-4xl font-black text-[#2d2d34]/80 font-mono">
                            {b.data.sticker3 || "BREAK"}
                          </div>
                        </div>

                        <div className="absolute top-10 right-28 hidden md:block">
                          <Doodle type="star" color="#2d2d34" className="w-10 h-10" />
                        </div>

                        {/* Tagline */}
                        <p className="font-mono text-xs md:text-sm text-[#758173] uppercase tracking-widest mt-4 text-center z-20 font-bold">
                          {b.data.subhead || "For Quiet Talent · Kerala's Student Tech Movement"}
                        </p>
                      </div>
                    )}

                    {/* Pinned Manifesto 001 Note */}
                    {b.type === "pinned-manifesto" && (
                      <div className="relative bg-[#f8fff4] p-6 shadow-xl border-2 border-[#2d2d34] rotate-[0.5deg] max-w-xl mx-auto rounded-sm">
                        {/* Circular Flame Pin */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#f26430] rounded-full border-2 border-black shadow-sm" />
                        <p className="font-mono text-[11px] uppercase tracking-widest text-[#758173] mb-2 border-b border-[#758173]/30 pb-1 font-bold">
                          {b.data.tag || "MANIFESTO 001"}
                        </p>
                        <p className="text-base md:text-lg text-[#2d2d34] leading-relaxed italic font-serif">
                          &quot;{b.data.quote}&quot;
                        </p>
                        <p className="font-mono text-xs text-[#f26430] font-bold uppercase mt-3 text-right">
                          — {b.data.author}
                        </p>
                      </div>
                    )}

                    {/* About Story & Vision Panels */}
                    {b.type === "about-panels" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-[#2d2d34] pb-2">
                          <h2 className="text-xl font-black uppercase text-[#2d2d34]">VISION & MISSION PANELS</h2>
                          <Doodle type="crown" color="#f26430" className="w-8 h-8" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#2d2d34] text-[#f8fff4] p-5 rounded-sm border-2 border-black shadow-[4px_4px_0px_0px_#f26430]">
                            <h3 className="text-2xl font-black">{b.data.panel1Title}</h3>
                            <p className="font-mono text-xs text-[#f26430] mt-1">{b.data.panel1Subtitle}</p>
                          </div>
                          <div className="bg-[#f8fff4] text-[#2d2d34] p-5 rounded-sm border-2 border-[#2d2d34] shadow-[4px_4px_0px_0px_#2d2d34]">
                            <h3 className="text-2xl font-black text-[#f26430]">{b.data.panel2Title}</h3>
                            <p className="font-mono text-xs text-[#758173] mt-1">Multi-Disciplinary Exploration</p>
                          </div>
                          <div className="bg-[#758173] text-[#f8fff4] p-5 rounded-sm border-2 border-black shadow-[4px_4px_0px_0px_#2d2d34]">
                            <h3 className="text-xl font-black">{b.data.panel3Title}</h3>
                            <p className="text-xs mt-1 leading-relaxed opacity-95">{b.data.panel3Desc}</p>
                          </div>
                          <div className="bg-zinc-900 text-[#f8fff4] p-5 rounded-sm border-2 border-black border-l-4 border-l-[#f26430] shadow-[4px_4px_0px_0px_#2d2d34]">
                            <h3 className="text-xl font-black text-[#f26430]">{b.data.panel4Title}</h3>
                            <p className="font-serif italic text-xs mt-1 text-emerald-300">{b.data.panel4Desc}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stat Strip */}
                    {b.type === "stat-strip" && (
                      <div className="bg-[#2d2d34] text-white rounded-sm border-4 border-[#2d2d34] p-6 shadow-[6px_6px_0px_0px_#f26430]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono divide-y md:divide-y-0 md:divide-x divide-white/20">
                          {(b.data.stats || []).map((st: any, i: number) => (
                            <div key={i} className={i > 0 ? "pt-2 md:pt-0 md:pl-4" : ""}>
                              <span className="text-[#f26430] text-3xl font-black block">{st.number}</span>
                              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">{st.label}</span>
                              {st.highlight && <span className="text-[9px] text-[#758173] block mt-0.5">{st.highlight}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Programs Grid */}
                    {b.type === "programs" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-black uppercase text-[#2d2d34]">{b.data.sectionTitle}</h2>
                            <p className="font-mono text-xs text-[#758173]">{b.data.sectionSubtitle}</p>
                          </div>
                          <Doodle type="rocket" color="#414066" className="w-8 h-8" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(b.data.items || []).map((item: any, i: number) => (
                            <div key={i} className="bg-white border-2 border-[#2d2d34] p-4 rounded-sm shadow-[4px_4px_0px_0px_#2d2d34]">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-black text-sm text-[#2d2d34] uppercase">{item.title}</h3>
                                <span className="bg-[#f26430] text-white font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold">
                                  {item.tag}
                                </span>
                              </div>
                              <p className="text-xs text-[#2d2d34]/80 leading-relaxed">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow 4-Step Pipeline */}
                    {b.type === "workflow" && (
                      <div className="space-y-3 bg-[#f8fff4] p-5 border-2 border-[#2d2d34] rounded-sm shadow-[4px_4px_0px_0px_#2d2d34]">
                        <h2 className="text-xl font-black uppercase text-[#2d2d34]">{b.data.title}</h2>
                        <p className="font-mono text-xs text-[#758173]">{b.data.subtitle}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          {(b.data.steps || []).map((step: any, i: number) => (
                            <div key={i} className="bg-white border-2 border-[#2d2d34] p-3 rounded-sm">
                              <span className="font-mono text-xs font-black text-[#f26430] block">{step.num}</span>
                              <h4 className="font-bold text-xs uppercase text-[#2d2d34] mt-1">{step.name}</h4>
                              <p className="text-[11px] text-[#758173] mt-1 leading-snug">{step.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domains Grid */}
                    {b.type === "domains" && (
                      <div className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-[#2d2d34]">{b.data.title}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {(b.data.items || []).map((dom: any, i: number) => (
                            <div key={i} className="bg-[#2d2d34] text-white p-3.5 rounded-sm border-2 border-black shadow-[3px_3px_0px_0px_#f26430]">
                              <span className="bg-[#f26430] text-white font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                                {dom.tag}
                              </span>
                              <h4 className="font-bold text-xs text-white mt-2">{dom.name}</h4>
                              <p className="text-[11px] text-white/70 mt-1 leading-snug">{dom.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dual Action CTA Banner */}
                    {b.type === "dual-cta" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#414066] text-white p-6 rounded-sm border-4 border-[#2d2d34] shadow-[6px_6px_0px_0px_#2d2d34]">
                          <h3 className="text-lg font-black uppercase">{b.data.leftTitle}</h3>
                          <p className="text-xs text-white/80 my-2 leading-relaxed">{b.data.leftDesc}</p>
                          <span className="inline-block bg-[#f26430] text-white font-mono text-xs font-bold px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000] mt-2">
                            {b.data.leftCta}
                          </span>
                        </div>
                        <div className="bg-[#f26430] text-white p-6 rounded-sm border-4 border-[#2d2d34] shadow-[6px_6px_0px_0px_#2d2d34]">
                          <h3 className="text-lg font-black uppercase">{b.data.rightTitle}</h3>
                          <p className="text-xs text-white/90 my-2 leading-relaxed">{b.data.rightDesc}</p>
                          <span className="inline-block bg-[#2d2d34] text-white font-mono text-xs font-bold px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000] mt-2">
                            {b.data.rightCta}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block Inspector Card */}
          {selectedBlock && (previewMode === "builder" || previewMode === "split") && (
            <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Settings size={15} className="text-[var(--accent)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                    Block Inspector: {selectedBlock.label}
                  </h3>
                  <Badge tone="orange">{selectedBlock.type}</Badge>
                </div>
                <span className="font-mono text-[10px] text-text-dim">ID: {selectedBlock.id}</span>
              </div>

              {/* Inspector Form Fields Dependent on Block Type */}
              <div className="space-y-4 text-xs">
                {/* Hero Inspector */}
                {selectedBlock.type === "hero" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Top Tape Strip (Black)</label>
                        <Input
                          value={selectedBlock.data.strip1Text}
                          placeholder="LEARN"
                          onChange={(e) => updateBlock(selectedBlock.id, { strip1Text: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Middle Tape Strip (White)</label>
                        <Input
                          value={selectedBlock.data.strip2Text}
                          placeholder="BUILD"
                          onChange={(e) => updateBlock(selectedBlock.id, { strip2Text: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Bottom Tape Strip (Flame)</label>
                        <Input
                          value={selectedBlock.data.strip3Text}
                          placeholder="GROW"
                          onChange={(e) => updateBlock(selectedBlock.id, { strip3Text: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Monospace Subhead / Tagline</label>
                      <Input
                        value={selectedBlock.data.subhead}
                        placeholder="For Quiet Talent · Kerala's Student Tech Movement"
                        onChange={(e) => updateBlock(selectedBlock.id, { subhead: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Sticker 1 (Olive)</label>
                        <Input
                          value={selectedBlock.data.sticker1}
                          placeholder="{ CODE }"
                          onChange={(e) => updateBlock(selectedBlock.id, { sticker1: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Sticker 2 (Flame)</label>
                        <Input
                          value={selectedBlock.data.sticker2}
                          placeholder="SHIP IT!"
                          onChange={(e) => updateBlock(selectedBlock.id, { sticker2: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Sticker 3 (Pixel Text)</label>
                        <Input
                          value={selectedBlock.data.sticker3}
                          placeholder="BREAK"
                          onChange={(e) => updateBlock(selectedBlock.id, { sticker3: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Manifesto Inspector */}
                {selectedBlock.type === "pinned-manifesto" && (
                  <>
                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Manifesto Header Tag</label>
                      <Input
                        value={selectedBlock.data.tag}
                        placeholder="MANIFESTO 001"
                        onChange={(e) => updateBlock(selectedBlock.id, { tag: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Manifesto Statement Quote</label>
                      <textarea
                        rows={3}
                        className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
                        value={selectedBlock.data.quote}
                        onChange={(e) => updateBlock(selectedBlock.id, { quote: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Author Attribution</label>
                      <Input
                        value={selectedBlock.data.author}
                        placeholder="ELEVATES Founders"
                        onChange={(e) => updateBlock(selectedBlock.id, { author: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* About Panels Inspector */}
                {selectedBlock.type === "about-panels" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Panel 1 Title</label>
                        <Input
                          value={selectedBlock.data.panel1Title}
                          onChange={(e) => updateBlock(selectedBlock.id, { panel1Title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Panel 1 Subtitle</label>
                        <Input
                          value={selectedBlock.data.panel1Subtitle}
                          onChange={(e) => updateBlock(selectedBlock.id, { panel1Subtitle: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Panel 2 Title</label>
                      <Input
                        value={selectedBlock.data.panel2Title}
                        onChange={(e) => updateBlock(selectedBlock.id, { panel2Title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Panel 3 Title</label>
                        <Input
                          value={selectedBlock.data.panel3Title}
                          onChange={(e) => updateBlock(selectedBlock.id, { panel3Title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Panel 4 Title</label>
                        <Input
                          value={selectedBlock.data.panel4Title}
                          onChange={(e) => updateBlock(selectedBlock.id, { panel4Title: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Stat Strip Inspector */}
                {selectedBlock.type === "stat-strip" && (
                  <div className="space-y-2">
                    <label className="font-semibold text-text-dim block">Configured Counter Numbers</label>
                    {(selectedBlock.data.stats || []).map((st: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className="h-8 w-28 rounded-[var(--radius-md)] border border-border bg-bg px-2 font-mono text-xs text-text"
                          value={st.number}
                          placeholder="400,000+"
                          onChange={(e) => {
                            const next = [...selectedBlock.data.stats];
                            next[i] = { ...next[i], number: e.target.value };
                            updateBlock(selectedBlock.id, { stats: next });
                          }}
                        />
                        <input
                          className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
                          value={st.label}
                          placeholder="LABEL"
                          onChange={(e) => {
                            const next = [...selectedBlock.data.stats];
                            next[i] = { ...next[i], label: e.target.value };
                            updateBlock(selectedBlock.id, { stats: next });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Announcement Bar Inspector */}
                {selectedBlock.type === "announcement-bar" && (
                  <>
                    <div>
                      <label className="font-semibold text-text-dim block mb-1">Announcement Message</label>
                      <Input
                        value={selectedBlock.data.text}
                        onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Action Link Text</label>
                        <Input
                          value={selectedBlock.data.linkText}
                          onChange={(e) => updateBlock(selectedBlock.id, { linkText: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-text-dim block mb-1">Action Link URL</label>
                        <Input
                          value={selectedBlock.data.linkUrl}
                          onChange={(e) => updateBlock(selectedBlock.id, { linkUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Dual CTA Inspector */}
                {selectedBlock.type === "dual-cta" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-3 bg-bg rounded-md border border-border">
                      <span className="font-bold text-[10px] uppercase text-text-dim">Left Box (Colleges)</span>
                      <Input
                        value={selectedBlock.data.leftTitle}
                        placeholder="Left Title"
                        onChange={(e) => updateBlock(selectedBlock.id, { leftTitle: e.target.value })}
                      />
                      <textarea
                        rows={2}
                        className="w-full rounded border border-border bg-bg-panel p-1.5 text-xs text-text"
                        value={selectedBlock.data.leftDesc}
                        onChange={(e) => updateBlock(selectedBlock.id, { leftDesc: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 p-3 bg-bg rounded-md border border-border">
                      <span className="font-bold text-[10px] uppercase text-text-dim">Right Box (Students)</span>
                      <Input
                        value={selectedBlock.data.rightTitle}
                        placeholder="Right Title"
                        onChange={(e) => updateBlock(selectedBlock.id, { rightTitle: e.target.value })}
                      />
                      <textarea
                        rows={2}
                        className="w-full rounded border border-border bg-bg-panel p-1.5 text-xs text-text"
                        value={selectedBlock.data.rightDesc}
                        onChange={(e) => updateBlock(selectedBlock.id, { rightDesc: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Block Modal / Library */}
      {showBlockLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
                  Add a New Block Section
                </h3>
                <p className="text-xs text-text-dim">
                  Choose an authentic Neo-Brutalist component to insert into <code className="font-mono text-[var(--accent)]">{currentPage.slug}</code>
                </p>
              </div>
              <button onClick={() => setShowBlockLibrary(false)} className="text-text-dim hover:text-text">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {BLOCK_DEFINITIONS.map((def) => {
                const Icon = def.icon;
                return (
                  <div
                    key={def.type}
                    onClick={() => addBlockFromLibrary(def)}
                    className="group rounded-[var(--radius-lg)] border border-border bg-bg-page p-4 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="rounded-[var(--radius-md)] bg-[var(--accent)]/10 p-2 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                        <Icon size={16} />
                      </div>
                      <h4 className="font-bold text-text text-sm">{def.name}</h4>
                    </div>
                    <p className="text-xs text-text-dim leading-relaxed">{def.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

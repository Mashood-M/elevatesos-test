"use client";

import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Globe,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
  Activity,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/context/store-context";
import { INITIAL_FOUNDERS } from "@/lib/data/founders-team";

export default function WebsiteCmsHubPage() {
  const { store } = useStore();
  const foundersCount =
    store.founders && store.founders.length > 0 ? store.founders.length : INITIAL_FOUNDERS.length;

  const totalEvents = store.events.length;
  const totalChapters = store.chapters.length;
  const totalProjects = store.projects.length;
  const totalClusters = store.clusters.length;

  const cmsModules = [
    {
      title: "Events Manager",
      slug: "events",
      href: "/hq/website/events",
      icon: Calendar,
      description: "Full event creation & editing. Speakers, dates, tickets, topics, description, and cover images.",
      badge: `${totalEvents} Events`,
      iconBg: "bg-[#fef0eb] text-[#f26430]",
      badgeStyle: "bg-[#fef0eb] text-[#f26430] border-[#f26430]/30",
    },
    {
      title: "Projects Showcase",
      slug: "projects",
      href: "/hq/website/projects",
      icon: Layers,
      description: "Flagship case studies (Celestia 1-Hour Build, Vibranium Fest), student builds, metrics, and repo links.",
      badge: `${totalProjects} Projects`,
      iconBg: "bg-[#faf5ff] text-[#9333ea]",
      badgeStyle: "bg-[#faf5ff] text-[#9333ea] border-[#9333ea]/30",
    },
    {
      title: "Founders & Team",
      slug: "team",
      href: "/hq/website/team",
      icon: Users,
      description: `All ${foundersCount} Founders, Core Team members, and Faculty Advisors. Roles, proof of work, photos, and socials.`,
      badge: `${foundersCount} Founders`,
      iconBg: "bg-[#f0f4f1] text-[#5f7560]",
      badgeStyle: "bg-[#f0f4f1] text-[#5f7560] border-[#5f7560]/30",
    },
    {
      title: "For Colleges",
      slug: "for-colleges",
      href: "/hq/website/for-colleges",
      icon: GraduationCap,
      description: "Partnership tiers, First 90 Days campus roadmap milestones, benefits, and dynamic FAQs.",
      badge: "Partnerships",
      iconBg: "bg-sky-50 text-sky-700",
      badgeStyle: "bg-sky-50 text-sky-700 border-sky-300",
    },
    {
      title: "Peer Labs",
      slug: "peer-labs",
      href: "/hq/website/peer-labs",
      icon: Sparkles,
      description: "Hands-on student labs (Cybersec Defense, Operation Java, Spark Electronics) and syllabus modules.",
      badge: `${totalClusters || 3} Labs`,
      iconBg: "bg-[#fef0eb] text-[#f26430]",
      badgeStyle: "bg-[#fef0eb] text-[#f26430] border-[#f26430]/30",
    },
  ];

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
                HQ ADMIN STUDIO {"//"} CMS HUB
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                ELEVATES.LIVE PUBLIC WEB GATEWAY
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Website CMS &amp; Content Hub.
              <span className="block text-[#f26430]">Direct Public Web Sync.</span>
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Directly author, update, and publish events, project case studies, the 18 founding member profiles, college partnerships, and peer lab curriculums on elevates.live.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <a
              href="https://elevates.live"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Globe size={14} />
              <span>Open Elevates Web ↗</span>
            </a>
            <Link href="/hq/website/team">
              <button
                type="button"
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-[#414066]" />
                <span>Founders &amp; Team</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Events */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // TOTAL EVENTS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {totalEvents}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Events Published
          </p>
        </div>

        {/* Metric 02: Founders & Team */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // FOUNDERS &amp; TEAM
            </span>
            <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#414066]">
            {foundersCount}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Founding Members
          </p>
        </div>

        {/* Metric 03: Active Chapters */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // ACTIVE CHAPTERS
            </span>
            <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#5f7560]">
            {totalChapters}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Campuses Synced
          </p>
        </div>

        {/* Metric 04: Showcased Projects */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // SHOWCASED BUILDS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {totalProjects}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Flagship Case Studies
          </p>
        </div>
      </section>

      {/* ── 3. GRID OF CMS STUDIOS ───────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cmsModules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.slug}
              href={m.href}
              className="group flex flex-col justify-between rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3.5px_3.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-[8px] border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] transition-all group-hover:bg-[#f26430] group-hover:text-white ${m.iconBg}`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`font-mono text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${m.badgeStyle}`}
                  >
                    {m.badge}
                  </span>
                </div>

                <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-black text-[#2d2d34] group-hover:text-[#f26430] transition-colors">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-xs text-[#71717a] font-medium leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-1.5 font-mono text-xs font-bold text-[#f26430] pt-3 border-t border-[#2d2d34]/10">
                <span>Launch {m.title}</span>
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* ── 4. LIVE SYNC GATEWAY STATUS ──────────────────────────────────── */}
      <section className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0f4f1] text-[#5f7560] border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#5f7560] uppercase tracking-wider bg-[#f0f4f1] px-2 py-0.5 rounded-[4px] border border-[#5f7560]/30">
                  LIVE_SYNC // PUBLIC GATEWAY
                </span>
                <span className="font-mono text-[10px] text-[#71717a]">
                  Supabase + On-Demand ISR
                </span>
              </div>
              <p className="text-xs text-[#52525b] font-medium mt-1">
                Connected to Elevates Web Public Gateway. All updates made to events, founders, and projects immediately propagate to the marketing frontend without rebuild steps.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-[#5f7560] bg-[#f0f4f1] border border-[#5f7560]/40 px-3 py-1 rounded-[6px] shadow-[1px_1px_0px_#5f7560] self-start sm:self-auto shrink-0 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#5f7560] animate-pulse" />
            Active Sync
          </span>
        </div>
      </section>
    </div>
  );
}

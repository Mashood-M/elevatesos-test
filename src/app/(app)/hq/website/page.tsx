"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Globe,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/store-context";

export default function WebsiteCmsHubPage() {
  const { store } = useStore();
  const [foundersCount, setFoundersCount] = useState(18);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("elevates_cms_founders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFoundersCount(parsed.length);
        }
      }
    } catch {}
  }, []);

  const totalEvents = store.events.length;
  const totalChapters = store.chapters.length;
  const totalProjects = store.projects.length;
  const totalClusters = store.clusters.length;

  const cmsModules = [
    {
      title: "Pages & Hero",
      slug: "pages",
      href: "/hq/website/pages",
      icon: Globe,
      description: "Hero headlines, marquee taglines, live stats counters, global announcement banner, and page text.",
      badge: "Public Site",
      tone: "cyan" as const,
    },
    {
      title: "Events Manager",
      slug: "events",
      href: "/hq/website/events",
      icon: Calendar,
      description: "Full event creation & editing. Speakers, dates, tickets, topics, description, and cover images.",
      badge: `${totalEvents} Events`,
      tone: "orange" as const,
    },
    {
      title: "Projects Showcase",
      slug: "projects",
      href: "/hq/website/projects",
      icon: Layers,
      description: "Flagship case studies (Celestia 1-Hour Build, Vibranium Fest), student builds, metrics, and repo links.",
      badge: `${totalProjects} Projects`,
      tone: "magenta" as const,
    },
    {
      title: "Founders & Team",
      slug: "team",
      href: "/hq/website/team",
      icon: Users,
      description: `All ${foundersCount} Founders, Core Team members, and Faculty Advisors. Roles, proof of work, photos, and socials.`,
      badge: `${foundersCount} Founders`,
      tone: "green" as const,
    },
    {
      title: "For Colleges",
      slug: "for-colleges",
      href: "/hq/website/for-colleges",
      icon: GraduationCap,
      description: "Partnership tiers, First 90 Days campus roadmap milestones, benefits, and dynamic FAQs.",
      badge: "Partnerships",
      tone: "cyan" as const,
    },
    {
      title: "Peer Labs",
      slug: "peer-labs",
      href: "/hq/website/peer-labs",
      icon: Sparkles,
      description: "Hands-on student labs (Cybersec Defense, Operation Java, Spark Electronics) and syllabus modules.",
      badge: `${totalClusters || 3} Labs`,
      tone: "orange" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HQ Admin Studio"
        title="Website CMS & Content Hub"
        description="Directly manage, edit, and publish every page, component, text element, event, and team profile on elevates.live."
        actions={
          <a
            href="http://localhost:5000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            <Button variant="orange" className="flex items-center gap-2">
              <Globe size={15} />
              Open Elevates Web ↗
            </Button>
          </a>
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total Events" value={`${totalEvents} Events`} accent="orange" />
        <Stat label="Founders & Team" value={`${foundersCount} Founders`} accent="cyan" />
        <Stat label="Active Chapters" value={`${totalChapters} Active`} accent="green" />
        <Stat label="Showcased Projects" value={`${totalProjects} Projects`} accent="magenta" />
      </div>

      {/* Grid of CMS Studios */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cmsModules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.slug}
              href={m.href}
              className="group flex flex-col justify-between rounded-[var(--radius-lg)] bg-bg-panel p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--neutral-100)] text-text transition group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={18} />
                  </div>
                  <Badge tone={m.tone}>{m.badge}</Badge>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-dim">
                  {m.description}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)]">
                <span>Manage {m.title}</span>
                <ChevronRight size={14} className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Live Sync Notice */}
      <TerminalPanel title="live_sync.engine" accent="green">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium text-text">
              Connected to Elevates Web Public Gateway
            </p>
            <p className="text-[12px] text-text-dim">
              Changes published in this studio immediately sync to Elevates Web via Supabase and On-Demand ISR.
            </p>
          </div>
          <Badge tone="green">Live Sync Active</Badge>
        </div>
      </TerminalPanel>
    </div>
  );
}

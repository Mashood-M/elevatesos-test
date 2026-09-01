"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";

const roadmap = [
  {
    phase: "Q3 2026",
    title: "Real-time Sync",
    status: "in_progress" as const,
    progress: 35,
    items: ["Supabase live auth", "Multi-device session", "Push notifications"],
  },
  {
    phase: "Q4 2026",
    title: "Advanced Analytics",
    status: "planned" as const,
    progress: 10,
    items: ["Predictive activity scores", "Cross-chapter benchmarks", "Export dashboards"],
  },
  {
    phase: "Q1 2027",
    title: "Mobile App",
    status: "planned" as const,
    progress: 5,
    items: ["Native QR scanner (demo)", "Offline check-in queue", "Student wallet for certs"],
  },
  {
    phase: "Q2 2027",
    title: "Industry Portal",
    status: "concept" as const,
    progress: 0,
    items: ["Mentor matching", "Sponsor pipeline", "Job board integration"],
  },
  {
    phase: "Future",
    title: "AI Operations",
    status: "concept" as const,
    progress: 0,
    items: ["Auto report drafts", "Smart task assignment", "Anomaly detection in audit logs"],
  },
];

const statusTone = {
  in_progress: "cyan" as const,
  planned: "magenta" as const,
  concept: "orange" as const,
};

export default function V2Page() {
  return (
    <div>
      <PageHeader
        title="Version 2"
        description="Future features on the Elevates OS horizon — from real-time sync to AI-powered operations."
      />

      <TerminalPanel title="vision.statement" accent="magenta">
        <p className="text-[13px] leading-relaxed text-text-dim">
          Elevates OS v2 transforms the demo store into a production platform: live Supabase backend,
          real-time notifications, mobile-first attendance, and intelligence layers that help chapters
          ship faster without losing the cyber-terminal soul.
        </p>
      </TerminalPanel>

      <div className="mt-6 space-y-4">
        {roadmap.map((item) => (
          <TerminalPanel key={item.phase} title={item.phase.toLowerCase()} meta={item.status.replace("_", " ")} accent={statusTone[item.status]}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">{item.title}</h3>
              <Badge tone={statusTone[item.status]}>{item.status.replace("_", " ")}</Badge>
            </div>
            <ProgressBar value={item.progress} label="Completion" accent={statusTone[item.status]} />
            <ul className="mt-4 space-y-1 text-[12px]">
              {item.items.map((i) => (
                <li key={i} className="text-text-dim">
                  <span className="text-green">▸</span> {i}
                </li>
              ))}
            </ul>
          </TerminalPanel>
        ))}
      </div>

      <TerminalPanel title="deprecated.in.v1" accent="orange" className="mt-6">
        <ul className="space-y-1 text-[11px] text-text-dim">
          <li>// Local-only store mutations (demo mode)</li>
          <li>// Persona switcher instead of real auth</li>
          <li>// Static seed data without persistence</li>
        </ul>
      </TerminalPanel>
    </div>
  );
}

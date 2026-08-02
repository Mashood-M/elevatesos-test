"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import type { ProjectStage } from "@/types";

const stages: ProjectStage[] = ["idea", "planning", "building", "testing", "demo", "showcase"];

const stageTone: Record<ProjectStage, "mute" | "cyan" | "magenta" | "green" | "orange"> = {
  idea: "mute",
  planning: "cyan",
  building: "magenta",
  testing: "orange",
  demo: "green",
  showcase: "green",
};

export default function ChapterProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const projects = store.projects.filter((p) => p.chapterId === chapter.id);

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "programs")}
        title="Project Pipeline"
        description="Track projects from idea to showcase — cluster assignments, team members, and progress."
      />

      <TerminalPanel title="pipeline.stages" accent="cyan" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {stages.map((s, i) => (
            <span key={s} className="flex items-center gap-2 text-[10px] uppercase">
              <Badge tone={stageTone[s]}>{s}</Badge>
              {i < stages.length - 1 ? <span className="text-text-mute">→</span> : null}
            </span>
          ))}
        </div>
      </TerminalPanel>

      <div className="space-y-4">
        {projects.map((project) => {
          const cluster = store.clusters.find((c) => c.id === project.clusterId);
          const team = project.teamIds.map((id) => store.profiles.find((p) => p.id === id)?.fullName).filter(Boolean);
          return (
            <TerminalPanel key={project.id} title={project.title.toLowerCase().replace(/\s/g, ".")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{project.title}</h3>
                  <p className="mt-1 text-[12px] text-text-dim">{project.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.projectType ? (
                    <Badge tone="cyan">{project.projectType}</Badge>
                  ) : null}
                  <Badge tone={stageTone[project.stage]}>{project.stage}</Badge>
                </div>
              </div>
              <ProgressBar value={project.progress} label="Build progress" accent="magenta" />
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-dim">
                {cluster ? <span>Cluster: <span className="text-cyan">{cluster.name}</span></span> : null}
                <span>Team: {team.join(", ")}</span>
                {project.repositoryUrl ? (
                  <a href={project.repositoryUrl} className="text-magenta hover:text-cyan">repo →</a>
                ) : null}
                {project.demoUrl ? (
                  <a href={project.demoUrl} className="text-green hover:text-cyan">demo →</a>
                ) : null}
              </div>
              {project.awards.length > 0 ? (
                <div className="mt-2 flex gap-2">
                  {project.awards.map((a) => (
                    <Badge key={a} tone="orange">{a}</Badge>
                  ))}
                </div>
              ) : null}
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}

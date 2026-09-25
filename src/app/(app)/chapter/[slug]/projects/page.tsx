"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  ExternalLink,
  Trash2,
  Search,
  Sparkles,
  Layers,
  Code2,
  CheckCircle2,
  FolderGit2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole } from "@/lib/access";
import { isCampusLead, isSuperAdmin } from "@/lib/permissions";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import {
  CaseStudyEditor,
  FlagshipProject,
  blankCaseStudy,
  parseProjectToCaseStudy,
  serializeCaseStudyToProject,
} from "@/components/domain/case-study-editor";
import type { Project, ProjectStage } from "@/types";

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
  const { store, createProject, updateProject, deleteProject } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [editingCaseStudy, setEditingCaseStudy] = useState<FlagshipProject | null>(null);
  const [isNewCaseStudy, setIsNewCaseStudy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!chapter) return <ChapterNotFound />;

  const canManage =
    isCampusLead(store.session.roleKey) ||
    isExecutiveRole(store.session.roleKey) ||
    isSuperAdmin(store.session.roleKey);

  const chapterProjects = store.projects.filter((p) => p.chapterId === chapter.id);

  const filteredProjects = useMemo(() => {
    return chapterProjects.filter((p) => {
      const matchesStage = selectedStage === "all" || p.stage === selectedStage;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q));
      return matchesStage && matchesSearch;
    });
  }, [chapterProjects, selectedStage, search]);

  const chapterMembers = useMemo(() => {
    return store.profiles
      .filter((p) => p.chapterId === chapter.id)
      .map((p) => ({ id: p.id, fullName: p.fullName, role: p.role }));
  }, [store.profiles, chapter.id]);

  const chapterClusters = useMemo(() => {
    return store.clusters
      .filter((c) => c.chapterId === chapter.id)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [store.clusters, chapter.id]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveCaseStudy = async (saved: FlagshipProject) => {
    setIsSaving(true);
    try {
      const existing = chapterProjects.find((p) => p.id === saved.id);
      const projectPayload = serializeCaseStudyToProject(saved, chapter.id, existing);

      if (isNewCaseStudy || !existing) {
        createProject(projectPayload);
      } else {
        updateProject(saved.id, projectPayload);
      }

      // Persist to backend mutation API
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          data: {
            id: projectPayload.id,
            chapterId: chapter.id,
            clusterId: projectPayload.clusterId || null,
            title: projectPayload.title,
            slug: projectPayload.slug,
            description: projectPayload.description,
            stage: projectPayload.stage,
            projectType: projectPayload.projectType,
            repositoryUrl: projectPayload.repositoryUrl || null,
            demoUrl: projectPayload.demoUrl || null,
            progress: projectPayload.progress,
            awards: projectPayload.awards,
            isShowcased: true,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.warn("Backend mutation warning:", errJson?.error);
      }

      showToast(`Case Study "${saved.title}" saved successfully!`);
      setEditingCaseStudy(null);
      setIsNewCaseStudy(false);
    } catch (err) {
      console.error("Failed to save case study:", err);
      showToast("Error saving case study. Check console for details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string, title: string) => {
    try {
      deleteProject(id);
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delete_project",
          data: { id, chapterId: chapter.id },
        }),
      }).catch((err) => console.warn("Delete mutation error:", err));

      showToast(`Project "${title}" deleted.`);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
      showToast("Failed to delete project.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-3 text-xs shadow-xl animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-bg-panel border-green-500/30 text-green-700"
              : "bg-bg-panel border-red-500/30 text-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "programs")}
        title="Project Pipeline & Case Studies"
        description="Track and showcase software platforms, open tools, and flagship case studies engineered by this chapter."
        actions={
          canManage ? (
            <Button
              size="sm"
              variant="orange"
              onClick={() => {
                setEditingCaseStudy(blankCaseStudy(chapter.id, chapter.name));
                setIsNewCaseStudy(true);
              }}
              className="gap-1.5 shadow-sm"
            >
              <Plus size={14} /> New Case Study
            </Button>
          ) : null
        }
      />

      {/* Stage Flow Bar */}
      <TerminalPanel title="pipeline.stages" accent="cyan" className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            {stages.map((s, i) => (
              <span key={s} className="flex items-center gap-2 text-[10px] uppercase font-mono">
                <Badge
                  tone={stageTone[s]}
                  className={selectedStage === s ? "ring-2 ring-[var(--accent)] ring-offset-1" : ""}
                >
                  {s}
                </Badge>
                {i < stages.length - 1 ? <span className="text-text-mute">→</span> : null}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-text-dim">
            Total Projects: <span className="font-bold text-text">{chapterProjects.length}</span>
          </div>
        </div>
      </TerminalPanel>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search projects or case studies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg pl-9 pr-3 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedStage("all")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-md)] border transition-all ${
              selectedStage === "all"
                ? "bg-bg-panel border-[var(--accent)] text-text font-bold shadow-sm"
                : "border-border bg-bg text-text-dim hover:text-text"
            }`}
          >
            All ({chapterProjects.length})
          </button>
          {stages.map((s) => {
            const count = chapterProjects.filter((p) => p.stage === s).length;
            if (count === 0 && selectedStage !== s) return null;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStage(s)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-md)] border capitalize transition-all ${
                  selectedStage === s
                    ? "bg-bg-panel border-[var(--accent)] text-text font-bold shadow-sm"
                    : "border-border bg-bg text-text-dim hover:text-text"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border-2 border-dashed border-border bg-bg-panel/50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
            <FolderGit2 size={26} />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
            {chapterProjects.length === 0 ? "No Case Studies or Projects Yet" : "No Matching Projects"}
          </h3>
          <p className="mt-1 text-xs text-text-dim max-w-md mx-auto">
            {chapterProjects.length === 0
              ? `Your chapter (${chapter.name}) hasn't documented any projects or software platforms yet. Create a Flagship Case Study to showcase your proof of execution.`
              : "Try adjusting your search query or stage filter to find what you are looking for."}
          </p>
          {canManage && chapterProjects.length === 0 && (
            <div className="mt-6">
              <Button
                variant="orange"
                size="sm"
                onClick={() => {
                  setEditingCaseStudy(blankCaseStudy(chapter.id, chapter.name));
                  setIsNewCaseStudy(true);
                }}
                className="gap-2 shadow-sm"
              >
                <Plus size={14} /> Create Chapter&apos;s First Case Study
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const cluster = store.clusters.find((c) => c.id === project.clusterId);
            const team = project.teamIds
              .map((id) => store.profiles.find((p) => p.id === id)?.fullName)
              .filter(Boolean);
            const caseStudy = parseProjectToCaseStudy(project, chapter.name);
            const isDeleting = confirmDeleteId === project.id;

            return (
              <TerminalPanel key={project.id} title={project.title.toLowerCase().replace(/\s/g, ".")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                        {project.title}
                      </h3>
                      {project.slug && (
                        <span className="font-mono text-[10px] text-text-dim bg-bg-page border border-border px-2 py-0.5 rounded-[var(--radius-md)]">
                          /projects/{project.slug}
                        </span>
                      )}
                    </div>
                    {caseStudy.tagline && (
                      <p className="text-[12px] font-medium text-text-dim italic">
                        &quot;{caseStudy.tagline}&quot;
                      </p>
                    )}
                    {caseStudy.summary && caseStudy.summary !== caseStudy.tagline && (
                      <p className="text-[12px] text-text-dim line-clamp-2">
                        {caseStudy.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {project.projectType ? (
                      <Badge tone="cyan" className="uppercase text-[10px]">
                        {project.projectType}
                      </Badge>
                    ) : null}
                    <Badge tone={stageTone[project.stage]} className="uppercase text-[10px]">
                      {project.stage}
                    </Badge>
                    {canManage && (
                      <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1"
                          onClick={() => {
                            setEditingCaseStudy(caseStudy);
                            setIsNewCaseStudy(false);
                          }}
                        >
                          <Edit3 size={12} /> Edit Case Study
                        </Button>
                        {isDeleting ? (
                          <div className="flex items-center gap-1 bg-red-500/10 p-1 rounded-[var(--radius-md)] border border-red-500/20">
                            <span className="text-[10px] text-red-600 font-semibold px-1">Confirm?</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-red-600 hover:bg-red-500/20"
                              onClick={() => handleDeleteProject(project.id, project.title)}
                            >
                              Yes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px]"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(project.id)}
                            className="p-1.5 text-text-dim hover:text-red-500 rounded-[var(--radius-md)] transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <ProgressBar value={project.progress} label="Build progress" accent="magenta" />
                </div>

                {/* Case Study Metrics Chips */}
                {caseStudy.metrics && caseStudy.metrics.filter((m) => m.value && m.label).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {caseStudy.metrics
                      .filter((m) => m.value && m.label)
                      .map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 bg-bg-page/70 border border-border px-2.5 py-1 rounded-[var(--radius-md)] text-[11px]"
                        >
                          <span className="font-bold text-[var(--accent)] font-mono">{m.value}</span>
                          <span className="text-text-dim">{m.label}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Tech Stack Badges */}
                {caseStudy.stackAndCode?.technologies && caseStudy.stackAndCode.technologies.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-text-mute font-mono flex items-center gap-1">
                      <Code2 size={11} /> Stack:
                    </span>
                    {caseStudy.stackAndCode.technologies.slice(0, 6).map((tech) => (
                      <span
                        key={tech}
                        className="bg-bg-page border border-border/80 px-2 py-0.5 rounded-[var(--radius-md)] text-text-dim font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                    {caseStudy.stackAndCode.technologies.length > 6 && (
                      <span className="text-text-mute font-mono">
                        +{caseStudy.stackAndCode.technologies.length - 6} more
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata & Links */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-text-dim border-t border-border/50 pt-2.5">
                  {cluster ? (
                    <span>
                      Cluster: <span className="text-cyan font-semibold">{cluster.name}</span>
                    </span>
                  ) : null}
                  {team.length > 0 ? (
                    <span>
                      Team: <span className="text-text">{team.join(", ")}</span>
                    </span>
                  ) : null}
                  {caseStudy.builders && caseStudy.builders.length > 0 && team.length === 0 ? (
                    <span>
                      Builders:{" "}
                      <span className="text-text">
                        {caseStudy.builders
                          .filter((b) => b.name)
                          .map((b) => (b.role ? `${b.name} (${b.role})` : b.name))
                          .join(", ")}
                      </span>
                    </span>
                  ) : null}
                  {project.repositoryUrl ? (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-magenta hover:text-cyan flex items-center gap-1 font-mono transition-colors"
                    >
                      repo <ExternalLink size={11} />
                    </a>
                  ) : null}
                  {project.demoUrl ? (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green hover:text-cyan flex items-center gap-1 font-mono transition-colors"
                    >
                      demo <ExternalLink size={11} />
                    </a>
                  ) : null}
                </div>

                {/* Awards / Deliverables */}
                {project.awards.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.awards.map((a) => (
                      <Badge key={a} tone="orange" className="text-[10px]">
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </TerminalPanel>
            );
          })}
        </div>
      )}

      {/* Case Study Editor Modal */}
      {editingCaseStudy && (
        <CaseStudyEditor
          project={editingCaseStudy}
          chapterName={chapter.name}
          chapterMembers={chapterMembers}
          clusters={chapterClusters}
          isSaving={isSaving}
          onClose={() => {
            setEditingCaseStudy(null);
            setIsNewCaseStudy(false);
          }}
          onSave={handleSaveCaseStudy}
        />
      )}
    </div>
  );
}

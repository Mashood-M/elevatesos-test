"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  ExternalLink,
  Trash2,
  Search,
  Code2,
  CheckCircle2,
  Folder,
  Kanban,
  List,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  CircleDot,
  Play,
  CheckCheck,
  GripVertical,
  Users,
  LayoutGrid,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole } from "@/lib/access";
import { isCampusLead, isSuperAdmin } from "@/lib/permissions";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import { initials, cn } from "@/lib/utils";
import { finalizeSlug } from "@/lib/slug";
import type { Project, ProjectStage } from "@/types";

type ViewMode = "grid" | "list";
type Priority = "Low" | "Medium" | "High" | "Urgent";

interface StageCol {
  stage: ProjectStage;
  label: string;
  dotColor: string;
}

const STAGES: StageCol[] = [
  { stage: "idea", label: "Backlog", dotColor: "bg-slate-400" },
  { stage: "planning", label: "To Do", dotColor: "bg-blue-500" },
  { stage: "building", label: "In Progress", dotColor: "bg-amber-500" },
  { stage: "testing", label: "Review", dotColor: "bg-purple-500" },
  { stage: "showcase", label: "Done", dotColor: "bg-emerald-500" },
];

const priorityStyles: Record<Priority, { bg: string; text: string; border: string }> = {
  Low: {
    bg: "bg-blue-50 text-blue-700",
    text: "text-blue-700",
    border: "border-blue-200/70",
  },
  Medium: {
    bg: "bg-amber-50 text-amber-700",
    text: "text-amber-700",
    border: "border-amber-200/70",
  },
  High: {
    bg: "bg-orange-50 text-orange-700",
    text: "text-orange-700",
    border: "border-orange-200/70",
  },
  Urgent: {
    bg: "bg-rose-50 text-rose-700",
    text: "text-rose-700",
    border: "border-rose-200/70",
  },
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getPriority(p: Project): Priority {
  if (p.priority) {
    const formatted = (p.priority.charAt(0).toUpperCase() + p.priority.slice(1).toLowerCase()) as Priority;
    if (formatted in priorityStyles) return formatted;
  }
  const award = p.awards?.find((a) => a.startsWith("priority:"));
  if (award) {
    const val = award.replace("priority:", "");
    const formatted = (val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()) as Priority;
    if (formatted in priorityStyles) return formatted;
  }
  if (p.stage === "showcase") return "Low";
  if (p.stage === "testing") return "Urgent";
  if (p.stage === "building") return "High";
  return "Medium";
}

function getCodeTag(p: Project): string {
  const award = p.awards?.find((a) => a.startsWith("code:"));
  if (award) return award.replace("code:", "");
  if (p.slug && p.slug.includes("-")) {
    const parts = p.slug.split("-");
    const prefix = parts[0].slice(0, 2).toUpperCase();
    const num = Math.abs(p.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 90 + 10);
    return `${prefix}-${num}`;
  }
  return `PRJ-${p.id.slice(0, 3).toUpperCase()}`;
}

export default function ChapterProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const { store, createProject, updateProject, deleteProject } = useStore();
  const { session } = useCurrentUser();
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  // Active view: null = projects overview, string = project sprint board
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Search & View Mode
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Drag and Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ProjectStage | null>(null);

  // Dialog Modals
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskStage, setNewTaskStage] = useState<ProjectStage>("planning");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingTask, setViewingTask] = useState<Project | null>(null);

  // Form states - New Project
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectClusterId, setProjectClusterId] = useState("");
  const [projectPriority, setProjectPriority] = useState<Priority>("Medium");
  const [projectRepoUrl, setProjectRepoUrl] = useState("");
  const [projectDemoUrl, setProjectDemoUrl] = useState("");

  // Form states - New Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("Medium");

  const canManage =
    isCampusLead(session.roleKey) ||
    isExecutiveRole(session.roleKey) ||
    isSuperAdmin(session.roleKey);

  // Chapter resources
  const chapterProjects = useMemo(() => {
    if (!chapter) return [];
    return (store.projects || []).filter((p) => p.chapterId === chapter.id);
  }, [store.projects, chapter?.id]);

  const chapterClusters = useMemo(() => {
    if (!chapter) return [];
    return (store.clusters || [])
      .filter(
        (c) => c.chapterId === chapter.id || !c.chapterId || c.chapterId === "default",
      )
      .filter((c) => {
        const name = (c.name || "").trim().toLowerCase();
        // Remove junk test clusters (e.g. test, testing, testing1, test2, test3, test4, test5)
        if (/^test/i.test(name) || name.includes("testing") || /^test\d+$/i.test(name)) {
          return false;
        }
        return true;
      });
  }, [store.clusters, chapter?.id]);

  // Partition into Projects and Tasks
  // A task has "project_id:..." in awards. A project is a top-level folder/project.
  const { topLevelProjects, allTasks } = useMemo(() => {
    const top: Project[] = [];
    const tasks: Project[] = [];

    chapterProjects.forEach((p) => {
      const isTask = p.awards?.some((a) => a.startsWith("project_id:"));
      if (isTask) {
        tasks.push(p);
      } else {
        top.push(p);
      }
    });

    return { topLevelProjects: top, allTasks: tasks };
  }, [chapterProjects]);

  // Active selected project
  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return chapterProjects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, chapterProjects]);

  // Tasks belonging to active project
  const activeProjectTasks = useMemo(() => {
    if (!activeProject) return [];
    return allTasks.filter((t) =>
      t.awards?.includes(`project_id:${activeProject.id}`),
    );
  }, [activeProject, allTasks]);

  // Map tasks to active project for progress calculation
  const projectTasksMap = useMemo(() => {
    const map = new Map<string, Project[]>();
    topLevelProjects.forEach((p) => map.set(p.id, []));
    allTasks.forEach((t) => {
      const parentAward = t.awards?.find((a) => a.startsWith("project_id:"));
      if (parentAward) {
        const parentId = parentAward.replace("project_id:", "");
        const arr = map.get(parentId);
        if (arr) arr.push(t);
      }
    });
    return map;
  }, [topLevelProjects, allTasks]);

  // Filtered projects for overview
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topLevelProjects.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q);

      return matchSearch;
    });
  }, [topLevelProjects, search]);

  // Column distribution for active board
  const boardColumns = useMemo(() => {
    const cols: Record<ProjectStage, Project[]> = {
      idea: [],
      planning: [],
      building: [],
      testing: [],
      demo: [],
      showcase: [],
    };
    activeProjectTasks.forEach((t) => {
      if (t.stage in cols) {
        cols[t.stage].push(t);
      } else {
        cols.planning.push(t);
      }
    });
    return cols;
  }, [activeProjectTasks]);

  if (!mounted) return <ContentSkeleton />;
  if (!chapter) return <ChapterNotFound />;

  // Metrics
  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length;
  const overallRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const contributorIds = new Set(chapterProjects.flatMap((p) => p.teamIds || []));

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: ProjectStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, targetStage: ProjectStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverStage(null);
    if (!id) return;

    const task = allTasks.find((t) => t.id === id);
    if (!task || task.stage === targetStage) return;

    updateProject(id, { stage: targetStage });
    fetch("/api/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "project",
        data: { id, chapterId: chapter.id, stage: targetStage },
      }),
    }).catch(console.warn);
  };

  const handleAdvanceTask = (task: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const order: ProjectStage[] = ["idea", "planning", "building", "testing", "showcase"];
    const currIdx = order.indexOf(task.stage);
    if (currIdx < 0 || currIdx >= order.length - 1) return;
    const nextStage = order[currIdx + 1];

    updateProject(task.id, { stage: nextStage });
    fetch("/api/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "project",
        data: { id: task.id, chapterId: chapter.id, stage: nextStage },
      }),
    }).catch(console.warn);
  };

  // Create Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = projectTitle.trim();
    if (!title) return;

    if (editingProject) {
      updateProject(editingProject.id, {
        title,
        description: projectDescription.trim(),
        clusterId: projectClusterId || undefined,
        priority: projectPriority.toLowerCase() as any,
        repositoryUrl: projectRepoUrl.trim() || undefined,
        demoUrl: projectDemoUrl.trim() || undefined,
      });
      setEditingProject(null);
    } else {
      const newProj: Project = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
        chapterId: chapter.id,
        clusterId: projectClusterId || undefined,
        title,
        slug: finalizeSlug(title),
        description: projectDescription.trim(),
        stage: "planning",
        projectType: "campus",
        teamIds: session.userId ? [session.userId] : [],
        progress: 0,
        awards: [`priority:${projectPriority}`],
        priority: projectPriority.toLowerCase() as any,
        repositoryUrl: projectRepoUrl.trim() || undefined,
        demoUrl: projectDemoUrl.trim() || undefined,
        isShowcased: true,
        createdAt: new Date().toISOString(),
      };
      createProject(newProj);
    }

    setIsNewProjectOpen(false);
    setProjectTitle("");
    setProjectDescription("");
    setProjectClusterId("");
    setProjectPriority("Medium");
    setProjectRepoUrl("");
    setProjectDemoUrl("");
  };

  // Create Task
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title || !activeProject) return;

    const prefix = newTaskStage === "building" ? "FE" : newTaskStage === "testing" ? "QA" : "DS";
    const num = Math.floor(Math.random() * 80) + 10;

    const newTask: Project = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
      chapterId: chapter.id,
      clusterId: activeProject.clusterId,
      title,
      slug: finalizeSlug(title),
      description: `Task for ${activeProject.title}`,
      stage: newTaskStage,
      projectType: "campus",
      teamIds: session.userId ? [session.userId] : [],
      progress: newTaskStage === "showcase" ? 100 : 25,
      awards: [
        `project_id:${activeProject.id}`,
        `priority:${taskPriority}`,
        `code:${prefix}-${num}`,
      ],
      priority: taskPriority.toLowerCase() as any,
      isShowcased: true,
      createdAt: new Date().toISOString(),
    };

    createProject(newTask);
    setIsNewTaskOpen(false);
    setTaskTitle("");
    setTaskPriority("Medium");
  };

  // Seed sample projects if empty
  const handleSeedSamples = () => {
    const sampleProjects = [
      { title: "Smart Campus Attendance", desc: "Automated student QR attendance platform with verification passes", cluster: chapterClusters[0]?.id },
      { title: "Campus Mentorship Portal", desc: "Peer-to-peer engineering guidance and project incubation board", cluster: chapterClusters[1]?.id || chapterClusters[0]?.id },
      { title: "Robotics Club Telemetry", desc: "Hardware sensor telemetry dashboard and autonomous bot control", cluster: chapterClusters[0]?.id },
    ];

    sampleProjects.forEach((s) => {
      const projId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}-${Math.random()}`;
      const p: Project = {
        id: projId,
        chapterId: chapter.id,
        clusterId: s.cluster,
        title: s.title,
        slug: finalizeSlug(s.title),
        description: s.desc,
        stage: "building",
        projectType: "campus",
        teamIds: session.userId ? [session.userId] : [],
        progress: 40,
        awards: ["priority:High"],
        priority: "high",
        isShowcased: true,
        createdAt: new Date().toISOString(),
      };
      createProject(p);

      // Seed 2 sample tasks for each project
      const tasks = [
        { title: `Initialize ${s.title} repo and architecture`, stage: "showcase" as ProjectStage, code: "INIT-01" },
        { title: `Design core client interface and API routes`, stage: "building" as ProjectStage, code: "CORE-02" },
        { title: `Conduct security and role-permission audit`, stage: "planning" as ProjectStage, code: "SEC-03" },
      ];

      tasks.forEach((t) => {
        createProject({
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random()}`,
          chapterId: chapter.id,
          clusterId: s.cluster,
          title: t.title,
          slug: finalizeSlug(t.title),
          description: `Task for ${s.title}`,
          stage: t.stage,
          projectType: "campus",
          teamIds: session.userId ? [session.userId] : [],
          progress: t.stage === "showcase" ? 100 : 30,
          awards: [`project_id:${projId}`, `code:${t.code}`, "priority:Medium"],
          priority: "medium",
          isShowcased: true,
          createdAt: new Date().toISOString(),
        });
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. CANONICAL PAGE HEADER */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title={activeProject ? activeProject.title : "Projects & Sprints"}
        description={
          activeProject
            ? activeProject.description
            : "Manage chapter software development, student hackathon projects, and sprint milestones."
        }
        badge={
          activeProject ? (
            <div className="flex items-center gap-2">
              <Badge tone="cyan">
                {chapterClusters.find((c) => c.id === activeProject.clusterId)?.name || "Engineering"}
              </Badge>
              <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", priorityStyles[getPriority(activeProject)].bg, priorityStyles[getPriority(activeProject)].border)}>
                {getPriority(activeProject)} Priority
              </span>
            </div>
          ) : undefined
        }
        actions={
          activeProject ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedProjectId(null)}
                className="gap-1.5 border border-border/70 hover:bg-bg-panel text-xs sm:text-sm"
              >
                <ArrowLeft size={14} /> All Projects
              </Button>
              {canManage && (
                <Button
                  variant="orange"
                  onClick={() => setIsNewTaskOpen(true)}
                  className="gap-1.5 text-xs sm:text-sm shadow-sm font-semibold"
                >
                  <Plus size={14} /> Add Task
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canManage && topLevelProjects.length === 0 && (
                <Button
                  variant="ghost"
                  onClick={handleSeedSamples}
                  className="gap-1.5 border border-border/70 hover:bg-bg-panel text-xs sm:text-sm"
                >
                  <Sparkles size={14} className="text-[var(--accent)]" /> Add Sample Projects
                </Button>
              )}
              {canManage && (
                <Button
                  variant="orange"
                  onClick={() => {
                    setEditingProject(null);
                    setProjectTitle("");
                    setProjectDescription("");
                    setProjectClusterId("");
                    setProjectPriority("Medium");
                    setProjectRepoUrl("");
                    setProjectDemoUrl("");
                    setIsNewProjectOpen(true);
                  }}
                  className="gap-1.5 text-xs sm:text-sm shadow-sm font-bold"
                >
                  <Plus size={14} /> New Project
                </Button>
              )}
            </div>
          )
        }
      />

      {/* 2. STATS SUMMARY STRIP */}
      {!activeProject ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Total Projects"
            value={topLevelProjects.length}
            hint="Active chapter initiatives"
          />
          <Stat
            label="Sprint Tasks"
            value={totalTasksCount}
            hint="Milestones being tracked"
          />
          <Stat
            label="Completion"
            value={`${overallRate}%`}
            hint={`${completedTasksCount} tasks delivered`}
          />
          <Stat
            label="Contributors"
            value={contributorIds.size}
            hint="Students & chapter leads"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Total Tasks"
            value={activeProjectTasks.length}
            hint="Milestones in sprint"
          />
          <Stat
            label="In Progress"
            value={activeProjectTasks.filter((t) => t.stage === "building").length}
            hint="Currently being built"
          />
          <Stat
            label="Delivered"
            value={activeProjectTasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length}
            hint="Shipped to campus"
          />
          <Stat
            label="Completion"
            value={`${activeProjectTasks.length > 0 ? Math.round((activeProjectTasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length / activeProjectTasks.length) * 100) : 0}%`}
            hint="Board progress rate"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. OVERVIEW MODE: CLEAN PROJECTS DIRECTORY                            */}
      {/* ===================================================================== */}
      {!activeProject ? (
        <div className="space-y-4">
          {/* Toolbar: Search and View Switcher aligned together on the Right */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full h-9.5 pl-9 pr-8 rounded-full border border-border/80 bg-white text-xs sm:text-sm text-text placeholder:text-text-mute shadow-2xs focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex items-center rounded-xl border border-border/80 bg-neutral-100/70 p-0.5 shrink-0 self-end sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-semibold",
                  viewMode === "grid"
                    ? "bg-white text-text shadow-2xs font-bold"
                    : "text-text-dim hover:text-text",
                )}
                title="Grid view"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-semibold",
                  viewMode === "list"
                    ? "bg-white text-text shadow-2xs font-bold"
                    : "text-text-dim hover:text-text",
                )}
                title="List view"
              >
                <List size={14} />
                <span className="hidden sm:inline text-[11px]">List</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="rounded-[var(--radius)] border border-dashed border-border/80 bg-bg-panel p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Folder size={24} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
                  {topLevelProjects.length === 0 ? "No Projects Created Yet" : "No Matching Projects"}
                </h3>
                <p className="mt-1 text-xs text-text-dim max-w-md mx-auto">
                  {topLevelProjects.length === 0
                    ? "Start your chapter's development journey by creating a project or loading sample initiatives."
                    : "Try adjusting your search terms or cluster filter."}
                </p>
              </div>
              {canManage && topLevelProjects.length === 0 && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button variant="orange" onClick={() => setIsNewProjectOpen(true)} className="gap-1.5 text-xs font-bold">
                    <Plus size={14} /> Create First Project
                  </Button>
                  <Button variant="ghost" onClick={handleSeedSamples} className="gap-1.5 text-xs border border-border">
                    <Sparkles size={14} /> Add Samples
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Projects Grid View */}
          {viewMode === "grid" && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredProjects.map((project) => {
                const cluster = chapterClusters.find((c) => c.id === project.clusterId);
                const tasks = projectTasksMap.get(project.id) || [];
                const completed = tasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                const priority = getPriority(project);

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className="group rounded-[var(--radius)] bg-bg-panel border border-border/80 p-5 shadow-[var(--shadow-sm)] hover:shadow-md hover:border-border transition-all duration-180 flex flex-col justify-between cursor-pointer space-y-4"
                  >
                    <div>
                      {/* Top Meta: Cluster + Priority + Edit */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge tone="cyan" className="text-[10px] truncate max-w-[120px]">
                            {cluster?.name || "Platform"}
                          </Badge>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", priorityStyles[priority].bg, priorityStyles[priority].border)}>
                            {priority}
                          </span>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProject(project);
                                setProjectTitle(project.title);
                                setProjectDescription(project.description || "");
                                setProjectClusterId(project.clusterId || "");
                                setProjectPriority(getPriority(project));
                                setProjectRepoUrl(project.repositoryUrl || "");
                                setProjectDemoUrl(project.demoUrl || "");
                                setIsNewProjectOpen(true);
                              }}
                              className="p-1 text-text-dim hover:text-text rounded hover:bg-bg transition-colors"
                              title="Edit Project"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProject(project.id)}
                              className="p-1 text-text-dim hover:text-red-500 rounded hover:bg-bg transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Project Title */}
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text group-hover:text-[var(--accent)] transition-colors line-clamp-1 leading-snug">
                        {project.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1 text-xs text-text-dim line-clamp-2 leading-relaxed">
                        {project.description || "Campus software milestone initiative."}
                      </p>

                      {/* Progress Line */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-text-dim">
                          <span>{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
                          <span className="font-mono font-semibold text-text">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-neutral-150 overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(progress, tasks.length > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center -space-x-1.5">
                        {(project.teamIds || [session.userId || "usr"]).slice(0, 3).map((id, idx) => {
                          const prof = store.profiles.find((p) => p.id === id);
                          return (
                            <div
                              key={idx}
                              title={prof?.fullName || "Contributor"}
                              className={cn(
                                "h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-neutral-800 text-white font-bold text-[8.5px] flex items-center justify-center uppercase shadow-2xs",
                                getAvatarColor(prof?.fullName || "Contributor"),
                              )}
                            >
                              {initials(prof?.fullName || "Dev")}
                            </div>
                          );
                        })}
                      </div>

                      <span className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Open Board <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Projects List View */}
          {viewMode === "list" && filteredProjects.length > 0 && (
            <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel divide-y divide-border/60 overflow-hidden shadow-[var(--shadow-sm)]">
              {filteredProjects.map((project) => {
                const cluster = chapterClusters.find((c) => c.id === project.clusterId);
                const tasks = projectTasksMap.get(project.id) || [];
                const completed = tasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-bg/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                        <Folder size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-text truncate">{project.title}</h4>
                          {cluster && <Badge tone="cyan" className="text-[10px]">{cluster.name}</Badge>}
                        </div>
                        <p className="text-xs text-text-dim truncate max-w-md mt-0.5">
                          {project.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-text">{tasks.length} tasks</div>
                        <div className="text-[11px] font-mono text-emerald-600">{progress}% done</div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        Open <ArrowRight size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* 4. SPRINT BOARD MODE: KANBAN BOARD FOR ACTIVE PROJECT                 */
        /* ===================================================================== */
        <div className="space-y-4">
          {/* Quick Project Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-text-dim shrink-0">Projects:</span>
            {topLevelProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                    isSelected
                      ? "bg-text text-bg shadow-sm"
                      : "bg-bg border border-border/70 text-text-dim hover:text-text",
                  )}
                >
                  <Folder size={12} />
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>

          {/* Kanban Board Columns */}
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[500px] scrollbar-thin">
            {STAGES.map((col) => {
              const tasks = boardColumns[col.stage] || [];
              const isOver = dragOverStage === col.stage;

              return (
                <div
                  key={col.stage}
                  onDragOver={(e) => handleDragOver(e, col.stage)}
                  onDrop={(e) => handleDrop(e, col.stage)}
                  className={cn(
                    "w-[270px] min-w-[270px] shrink-0 rounded-[var(--radius)] border transition-all duration-150 flex flex-col",
                    isOver
                      ? "border-[var(--accent)] bg-[var(--accent)]/[0.04] ring-2 ring-[var(--accent)]/15"
                      : "bg-bg/60 border-border/70",
                  )}
                >
                  {/* Column Header */}
                  <div className="p-3.5 pb-2.5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
                      <h4 className="font-semibold text-xs text-text">{col.label}</h4>
                      <span className="text-[11px] font-mono text-text-dim">
                        {tasks.length}
                      </span>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTaskStage(col.stage);
                          setIsNewTaskOpen(true);
                        }}
                        className="p-1 text-text-dim hover:text-text rounded hover:bg-bg transition-colors"
                        title={`Add task to ${col.label}`}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>

                  {/* Task Cards Stack */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
                    {tasks.map((task) => {
                      const priority = getPriority(task);
                      const isDragged = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable={canManage}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setViewingTask(task)}
                          className={cn(
                            "rounded-[var(--radius-sm)] border bg-bg-panel p-3 shadow-2xs hover:shadow-xs transition-all duration-150 select-none cursor-pointer",
                            isDragged
                              ? "opacity-30 border-dashed border-[var(--accent)]"
                              : "border-border/70 hover:border-border",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-text-dim">
                              {getCodeTag(task)}
                            </span>
                            <span className={cn("text-[9.5px] font-bold px-1.5 py-0.2 rounded border", priorityStyles[priority].bg, priorityStyles[priority].border)}>
                              {priority}
                            </span>
                          </div>

                          <h5 className="font-medium text-xs text-text leading-snug">
                            {task.title}
                          </h5>

                          <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between">
                            <div className="h-5 w-5 rounded-full bg-neutral-200 text-text-dim text-[8.5px] font-bold flex items-center justify-center">
                              {initials(task.title)}
                            </div>

                            {canManage && col.stage !== "showcase" && (
                              <button
                                type="button"
                                onClick={(e) => handleAdvanceTask(task, e)}
                                className="flex items-center gap-0.5 text-[10.5px] font-semibold text-[var(--accent)] hover:underline"
                                title="Move to next stage"
                              >
                                <span>Advance</span>
                                <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {tasks.length === 0 && (
                      <div
                        onClick={() => {
                          if (canManage) {
                            setNewTaskStage(col.stage);
                            setIsNewTaskOpen(true);
                          }
                        }}
                        className="rounded-[var(--radius-sm)] border border-dashed border-border/70 p-4 text-center text-xs text-text-dim hover:border-border hover:bg-bg-panel transition-all cursor-pointer"
                      >
                        <span className="text-[11px]">No tasks</span>
                        {canManage && (
                          <div className="text-[10px] text-[var(--accent)] font-semibold mt-1">
                            + Add task
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. DIALOG: NEW / EDIT PROJECT                                         */}
      {/* ===================================================================== */}
      <Dialog
        open={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        title={editingProject ? "Edit Project" : "New Project"}
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label htmlFor="project-title" className="mb-1.5 block text-xs font-semibold text-text">
              Project Name <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="project-title"
              required
              placeholder="e.g. Smart Campus Navigation"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              autoFocus
              className="w-full h-10 rounded-xl border border-border/80 bg-neutral-50/70 px-3.5 text-xs sm:text-sm text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label htmlFor="project-desc" className="mb-1.5 block text-xs font-semibold text-text">
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Brief overview of the project and campus goals..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-neutral-50/70 p-3 text-xs sm:text-sm text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none resize-none transition-all leading-relaxed shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-cluster" className="mb-1.5 block text-xs font-semibold text-text">
                Cluster / Domain
              </label>
              <div className="relative">
                <select
                  id="project-cluster"
                  value={projectClusterId}
                  onChange={(e) => setProjectClusterId(e.target.value)}
                  className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer truncate shadow-2xs"
                >
                  <option value="">General</option>
                  {chapterClusters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
              </div>
            </div>

            <div>
              <label htmlFor="project-priority" className="mb-1.5 block text-xs font-semibold text-text">
                Priority
              </label>
              <div className="relative">
                <select
                  id="project-priority"
                  value={projectPriority}
                  onChange={(e) => setProjectPriority(e.target.value as Priority)}
                  className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-repo" className="mb-1.5 block text-xs font-semibold text-text">
                GitHub Repository
              </label>
              <input
                id="project-repo"
                type="url"
                placeholder="https://github.com/..."
                value={projectRepoUrl}
                onChange={(e) => setProjectRepoUrl(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/80 bg-neutral-50/70 px-3.5 text-xs sm:text-sm text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all shadow-2xs"
              />
            </div>
            <div>
              <label htmlFor="project-demo" className="mb-1.5 block text-xs font-semibold text-text">
                Live Demo URL
              </label>
              <input
                id="project-demo"
                type="url"
                placeholder="https://demo.app"
                value={projectDemoUrl}
                onChange={(e) => setProjectDemoUrl(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/80 bg-neutral-50/70 px-3.5 text-xs sm:text-sm text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-3.5 flex items-center justify-end gap-2.5 border-t border-border/70">
            <button
              type="button"
              onClick={() => setIsNewProjectOpen(false)}
              className="rounded-xl border border-border/80 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-text-dim hover:text-text hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <Button type="submit" variant="orange" className="rounded-xl px-5 py-2 font-bold shadow-xs">
              {editingProject ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ===================================================================== */}
      {/* 6. DIALOG: NEW TASK                                                   */}
      {/* ===================================================================== */}
      <Dialog
        open={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Add Sprint Task"
        description={`Add milestone card to ${activeProject?.title}.`}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="mb-1.5 block text-xs font-semibold text-text">
              Task Title <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="task-title"
              required
              placeholder="e.g. Design auth token verification flow"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
              className="w-full h-10 rounded-xl border border-border/80 bg-neutral-50/70 px-3.5 text-xs sm:text-sm text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-stage" className="mb-1.5 block text-xs font-semibold text-text">
                Stage
              </label>
              <div className="relative">
                <select
                  id="task-stage"
                  value={newTaskStage}
                  onChange={(e) => setNewTaskStage(e.target.value as ProjectStage)}
                  className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                >
                  {STAGES.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
              </div>
            </div>

            <div>
              <label htmlFor="task-priority" className="mb-1.5 block text-xs font-semibold text-text">
                Priority
              </label>
              <div className="relative">
                <select
                  id="task-priority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as Priority)}
                  className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
              </div>
            </div>
          </div>

          <div className="pt-3.5 flex items-center justify-end gap-2.5 border-t border-border/70">
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(false)}
              className="rounded-xl border border-border/80 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-text-dim hover:text-text hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <Button type="submit" variant="orange" className="rounded-xl px-5 py-2 font-bold shadow-xs">
              Add Task
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ===================================================================== */}
      {/* 7. DIALOG: TASK DETAILS / EDIT                                        */}
      {/* ===================================================================== */}
      {viewingTask && (
        <Dialog
          open={Boolean(viewingTask)}
          onClose={() => setViewingTask(null)}
          title={viewingTask.title}
          description={`Task ${getCodeTag(viewingTask)} · ${activeProject?.title}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text">
                  Status Stage
                </label>
                <div className="relative">
                  <select
                    value={viewingTask.stage}
                    onChange={(e) => {
                      const next = e.target.value as ProjectStage;
                      updateProject(viewingTask.id, { stage: next });
                      setViewingTask({ ...viewingTask, stage: next });
                    }}
                    className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    {STAGES.map((s) => (
                      <option key={s.stage} value={s.stage}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={getPriority(viewingTask)}
                    onChange={(e) => {
                      const next = e.target.value as Priority;
                      updateProject(viewingTask.id, { priority: next.toLowerCase() as any });
                      setViewingTask({ ...viewingTask, priority: next.toLowerCase() as any });
                    }}
                    className="w-full h-10 appearance-none rounded-xl border border-border/80 bg-neutral-50/70 pl-3.5 pr-8 text-xs sm:text-sm text-text font-medium focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                </div>
              </div>
            </div>

            {viewingTask.description && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text">
                  Details
                </label>
                <p className="text-xs text-text-dim bg-neutral-50/80 p-3 rounded-xl border border-border/70 leading-relaxed shadow-2xs">
                  {viewingTask.description}
                </p>
              </div>
            )}

            <div className="pt-3.5 flex items-center justify-between border-t border-border/70">
              {canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteProject(viewingTask.id);
                    setViewingTask(null);
                  }}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 size={13} /> Delete Task
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="rounded-xl border border-border/80 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-text-dim hover:text-text hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

"use client";

import { use, useState, useMemo, useSyncExternalStore } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Folder,
  List,
  X,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useStore, useCurrentUser } from "@/context/store-context";
import { isExecutiveRole } from "@/lib/access";
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
  const { slug } = use(params);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
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
  }, [store.projects, chapter]);

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
  }, [store.clusters, chapter]);

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
        priority: projectPriority.toLowerCase() as Project["priority"],
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
        priority: projectPriority.toLowerCase() as Project["priority"],
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
      priority: taskPriority.toLowerCase() as Project["priority"],
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
      {/* 1. ARCHITECTURAL HERO BANNER */}
      {!activeProject ? (
        <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
          <div
            className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                  CAMPUS · {(chapter.shortCode || chapter.slug).toUpperCase()} {"//"} PROJECT PIPELINE
                </span>
                <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                  INCUBATION &amp; SPRINTS
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
                Software Projects &amp; Sprints.
              </h1>
              <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
                Campus software initiatives, hackathon prototypes, open source engineering tooling, and agile sprint milestones.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canManage && topLevelProjects.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedSamples}
                  className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={13} className="text-[#f26430]" />
                  Add Sample Projects
                </button>
              )}
              {canManage && (
                <button
                  type="button"
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
                  className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  New Project
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* SPRINT BOARD HERO */
        <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                  SPRINT BOARD {"//"} {getCodeTag(activeProject)}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-[#414066]/10 text-[#414066] border border-[#414066]/30">
                  {chapterClusters.find((c) => c.id === activeProject.clusterId)?.name || "Engineering"}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/40">
                  {getPriority(activeProject)} Priority
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
                {activeProject.title}
              </h1>
              <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
                {activeProject.description || "Active engineering sprint roadmap and task board."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                All Projects
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(true)}
                  className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Add Task
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. STATS SUMMARY STRIP */}
      {!activeProject ? (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>01 // TOTAL PROJECTS</span>
              <span className="h-2 w-2 rounded-full bg-[#f26430]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
              {topLevelProjects.length}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Active Initiatives</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>02 // SPRINT TASKS</span>
              <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#414066]">
              {totalTasksCount}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Tracked Milestones</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>03 // COMPLETION RATE</span>
              <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#5f7560]">
              {overallRate}%
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">{completedTasksCount} Delivered</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>04 // CONTRIBUTORS</span>
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
              {contributorIds.size}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Active Builders</p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>01 // SPRINT TASKS</span>
              <span className="h-2 w-2 rounded-full bg-[#2d2d34]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
              {activeProjectTasks.length}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Board Items</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>02 // IN PROGRESS</span>
              <span className="h-2 w-2 rounded-[2px] bg-[#f59e0b]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#b45309]">
              {activeProjectTasks.filter((t) => t.stage === "building").length}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Currently Building</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>03 // SHIPPED</span>
              <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#5f7560]">
              {activeProjectTasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length}
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Done &amp; Delivered</p>
          </div>

          <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
              <span>04 // VELOCITY</span>
              <span className="h-2 w-2 rounded-full bg-[#f26430]" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#f26430]">
              {activeProjectTasks.length > 0
                ? Math.round(
                    (activeProjectTasks.filter(
                      (t) => t.stage === "showcase" || t.stage === "demo",
                    ).length /
                      activeProjectTasks.length) *
                      100,
                  )
                : 0}
              %
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Completion Rate</p>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 3. OVERVIEW MODE: CLEAN PROJECTS DIRECTORY                            */}
      {/* ===================================================================== */}
      {!activeProject ? (
        <div className="space-y-4">
          {/* Toolbar: Search and View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[12px] border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                CATALOG VIEW
              </span>
              <span className="font-mono text-[10px] text-[#71717a]">
                {"//"} {filteredProjects.length} INITIATIVES
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717a]" size={13} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-8 pl-8 pr-7 rounded-[6px] bg-[#faf9f6] border border-[#2d2d34]/20 font-mono text-[11px] text-[#2d2d34] focus:outline-none focus:border-[#f26430]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1px_1px_0px_#f26430]"
                      : "bg-[#faf9f6] text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]",
                  )}
                  title="Grid view"
                >
                  <LayoutGrid size={13} />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border transition-all cursor-pointer",
                    viewMode === "list"
                      ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1px_1px_0px_#f26430]"
                      : "bg-[#faf9f6] text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]",
                  )}
                  title="List view"
                >
                  <List size={13} />
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.05)] space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 text-[#f26430] shadow-[1.5px_1.5px_0px_#2d2d34]">
                <Folder size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                  {topLevelProjects.length === 0 ? "No Projects Created Yet" : "No Matching Projects"}
                </h3>
                <p className="mt-1 text-xs text-[#71717a] max-w-md mx-auto">
                  {topLevelProjects.length === 0
                    ? "Start your chapter's development journey by creating an engineering project or loading sample initiatives."
                    : "Try adjusting your search terms or cluster filter."}
                </p>
              </div>
              {canManage && topLevelProjects.length === 0 && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button variant="orange" onClick={() => setIsNewProjectOpen(true)} className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_#2d2d34]">
                    <Plus size={14} /> Create First Project
                  </Button>
                  <Button variant="ghost" onClick={handleSeedSamples} className="gap-1.5 text-xs border border-[#2d2d34]/30">
                    <Sparkles size={14} className="text-[#f26430]" /> Add Samples
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
                    className="group rounded-[14px] bg-white border border-[#2d2d34]/20 p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3.5px_3.5px_0px_#2d2d34] transition-all flex flex-col justify-between cursor-pointer space-y-4"
                  >
                    <div>
                      {/* Top Meta: Cluster + Priority + Edit */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-[#414066]/10 text-[#414066] border border-[#414066]/30 truncate max-w-[120px]">
                            {cluster?.name || "Platform"}
                          </span>
                          <span className={cn("font-mono text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-[4px] border", priorityStyles[priority].bg, priorityStyles[priority].border)}>
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
                              className="p-1 text-[#71717a] hover:text-[#2d2d34] rounded hover:bg-[#faf9f6] transition-colors"
                              title="Edit Project"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProject(project.id)}
                              className="p-1 text-[#71717a] hover:text-red-500 rounded hover:bg-[#faf9f6] transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Project Title */}
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34] group-hover:text-[#f26430] transition-colors line-clamp-1 leading-snug">
                        {project.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1 text-xs text-[#52525b] line-clamp-2 leading-relaxed">
                        {project.description || "Campus software milestone initiative."}
                      </p>

                      {/* Progress Line */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#71717a]">
                          <span>{tasks.length} TASK{tasks.length === 1 ? "" : "S"}</span>
                          <span className="font-bold text-[#2d2d34]">{progress}% DELIVERED</span>
                        </div>
                        <div className="h-2 w-full rounded-[3px] bg-[#faf9f6] border border-[#2d2d34]/20 overflow-hidden">
                          <div
                            className="h-full bg-[#f26430] transition-all duration-300"
                            style={{ width: `${Math.max(progress, tasks.length > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-[#2d2d34]/15 flex items-center justify-between">
                      <div className="flex items-center -space-x-1.5">
                        {(project.teamIds || [session.userId || "usr"]).slice(0, 3).map((id, idx) => {
                          const prof = store.profiles.find((p) => p.id === id);
                          return (
                            <div
                              key={idx}
                              title={prof?.fullName || "Contributor"}
                              className={cn(
                                "h-6 w-6 rounded-full border border-[#2d2d34] text-white font-mono font-bold text-[8.5px] flex items-center justify-center uppercase shadow-[1px_1px_0px_#2d2d34]",
                                getAvatarColor(prof?.fullName || "Contributor"),
                              )}
                            >
                              {initials(prof?.fullName || "Dev")}
                            </div>
                          );
                        })}
                      </div>

                      <span className="font-mono text-[11px] font-bold text-[#f26430] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform uppercase tracking-wider">
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
            <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white divide-y divide-[#2d2d34]/15 overflow-hidden shadow-[2px_2px_0px_#2d2d34]">
              {filteredProjects.map((project) => {
                const cluster = chapterClusters.find((c) => c.id === project.clusterId);
                const tasks = projectTasksMap.get(project.id) || [];
                const completed = tasks.filter((t) => t.stage === "showcase" || t.stage === "demo").length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#faf9f6] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-9 w-9 rounded-[8px] bg-[#2d2d34] text-white flex items-center justify-center shrink-0 border border-[#2d2d34] shadow-[1px_1px_0px_#f26430]">
                        <Folder size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-[family-name:var(--font-display)] font-bold text-sm text-[#2d2d34] truncate">{project.title}</h4>
                          {cluster && (
                            <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#414066]/10 text-[#414066] border border-[#414066]/30">
                              {cluster.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#52525b] truncate max-w-md mt-0.5">
                          {project.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="font-mono text-xs font-bold text-[#2d2d34]">{tasks.length} tasks</div>
                        <div className="font-mono text-[10.5px] font-bold text-[#5f7560]">{progress}% done</div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#f26430] flex items-center gap-1 uppercase">
                        Open <ArrowRight size={12} />
                      </span>
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
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#71717a] shrink-0">
              SPRINT TARGET:
            </span>
            {topLevelProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 h-7.5 px-3 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                      : "bg-white border-[#2d2d34]/20 text-[#52525b] hover:border-[#2d2d34] hover:text-[#2d2d34]",
                  )}
                >
                  <Folder size={12} className={isSelected ? "text-[#f26430]" : "text-[#71717a]"} />
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
                    "w-[275px] min-w-[275px] shrink-0 rounded-[12px] border transition-all duration-150 flex flex-col shadow-[1.5px_1.5px_0px_#2d2d34]",
                    isOver
                      ? "border-[#f26430] bg-[#f26430]/[0.05] ring-2 ring-[#f26430]/20"
                      : "bg-[#faf9f6] border-[#2d2d34]/20",
                  )}
                >
                  {/* Column Header */}
                  <div className="p-3.5 pb-2.5 flex items-center justify-between select-none border-b border-[#2d2d34]/10 bg-white rounded-t-[12px]">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full border border-[#2d2d34]/20", col.dotColor)} />
                      <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2d2d34]">
                        {col.label}
                      </h4>
                      <span className="font-mono text-[10px] font-bold text-[#71717a] px-1.5 py-0.2 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[4px]">
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
                        className="p-1 text-[#71717a] hover:text-[#2d2d34] rounded hover:bg-[#faf9f6] transition-colors cursor-pointer"
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
                            "rounded-[10px] border bg-white p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all select-none cursor-pointer",
                            isDragged
                              ? "opacity-30 border-dashed border-[#f26430]"
                              : "border-[#2d2d34]/20 hover:border-[#2d2d34]",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#2d2d34] bg-[#faf9f6] px-1.5 py-0.5 rounded-[4px] border border-[#2d2d34]/20">
                              {getCodeTag(task)}
                            </span>
                            <span className={cn("font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border", priorityStyles[priority].bg, priorityStyles[priority].border)}>
                              {priority}
                            </span>
                          </div>

                          <h5 className="font-[family-name:var(--font-display)] font-bold text-[12.5px] text-[#2d2d34] leading-snug">
                            {task.title}
                          </h5>

                          <div className="mt-2.5 pt-2 border-t border-[#2d2d34]/10 flex items-center justify-between">
                            <div className="h-5.5 w-5.5 rounded-full bg-[#2d2d34] text-white font-mono text-[8.5px] font-bold flex items-center justify-center border border-[#2d2d34]">
                              {initials(task.title)}
                            </div>

                            {canManage && col.stage !== "showcase" && (
                              <button
                                type="button"
                                onClick={(e) => handleAdvanceTask(task, e)}
                                className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f26430] hover:text-[#d85322] flex items-center gap-1 cursor-pointer"
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
                        className="rounded-[10px] border border-dashed border-[#2d2d34]/25 p-4 text-center text-xs text-[#71717a] hover:border-[#2d2d34] hover:bg-white transition-all cursor-pointer"
                      >
                        <span className="font-mono text-[10.5px]">No tasks</span>
                        {canManage && (
                          <div className="font-mono text-[10px] text-[#f26430] font-bold mt-1 uppercase">
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
                      updateProject(viewingTask.id, { priority: next.toLowerCase() as Project["priority"] });
                      setViewingTask({ ...viewingTask, priority: next.toLowerCase() as Project["priority"] });
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

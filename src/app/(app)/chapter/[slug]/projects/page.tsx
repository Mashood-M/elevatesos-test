"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  ExternalLink,
  Trash2,
  Search,
  Sparkles,
  Code2,
  CheckCircle2,
  FolderGit2,
  Folder,
  AlertCircle,
  MoreHorizontal,
  Kanban,
  List,
  Check,
  X,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ArrowLeft,
  Clock,
  CircleDot,
  Play,
  Eye,
  CheckCheck,
  GripVertical,
  Users,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole } from "@/lib/access";
import { isCampusLead, isSuperAdmin } from "@/lib/permissions";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { initials } from "@/lib/utils";
import { finalizeSlug } from "@/lib/slug";
import {
  CaseStudyEditor,
  FlagshipProject,
  blankCaseStudy,
  parseProjectToCaseStudy,
  serializeCaseStudyToProject,
} from "@/components/domain/case-study-editor";
import type { Project, ProjectStage, ProjectType } from "@/types";

type ViewMode = "board" | "list";
type Priority = "Low" | "Medium" | "High" | "Urgent";

interface ColumnDef {
  stage: ProjectStage;
  label: string;
  wipLimit: number;
  defaultProgress: number;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  icon: any;
}

const COLUMNS: ColumnDef[] = [
  {
    stage: "idea",
    label: "Backlog",
    wipLimit: 8,
    defaultProgress: 10,
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-600 dark:text-slate-300",
    icon: Clock,
  },
  {
    stage: "planning",
    label: "To do",
    wipLimit: 5,
    defaultProgress: 25,
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeText: "text-blue-600 dark:text-blue-400",
    icon: CircleDot,
  },
  {
    stage: "building",
    label: "In progress",
    wipLimit: 4,
    defaultProgress: 55,
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-600 dark:text-amber-400",
    icon: Play,
  },
  {
    stage: "testing",
    label: "Review",
    wipLimit: 3,
    defaultProgress: 75,
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-50 dark:bg-purple-950/40",
    badgeText: "text-purple-600 dark:text-purple-400",
    icon: Eye,
  },
  {
    stage: "demo",
    label: "Demo",
    wipLimit: 4,
    defaultProgress: 90,
    dotColor: "bg-cyan-500",
    badgeBg: "bg-cyan-50 dark:bg-cyan-950/40",
    badgeText: "text-cyan-600 dark:text-cyan-400",
    icon: Sparkles,
  },
  {
    stage: "showcase",
    label: "Done",
    wipLimit: 6,
    defaultProgress: 100,
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
];

const STAGE_ORDER: ProjectStage[] = ["idea", "planning", "building", "testing", "demo", "showcase"];

function getNextStage(current: ProjectStage): ProjectStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx >= 0 && idx < STAGE_ORDER.length - 1) {
    return STAGE_ORDER[idx + 1];
  }
  return null;
}

function getPrevStage(current: ProjectStage): ProjectStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx > 0) {
    return STAGE_ORDER[idx - 1];
  }
  return null;
}

const priorityStyles: Record<Priority, { bg: string; text: string; border: string }> = {
  Low: {
    bg: "bg-[#eff6ff] dark:bg-blue-950/40",
    text: "text-[#2563eb] dark:text-blue-400",
    border: "border-[#bfdbfe] dark:border-blue-900/60",
  },
  Medium: {
    bg: "bg-[#fefce8] dark:bg-amber-950/40",
    text: "text-[#ca8a04] dark:text-amber-400",
    border: "border-[#fef08a] dark:border-amber-900/60",
  },
  High: {
    bg: "bg-[#fff7ed] dark:bg-orange-950/40",
    text: "text-[#ea580c] dark:text-orange-400",
    border: "border-[#fed7aa] dark:border-orange-900/60",
  },
  Urgent: {
    bg: "bg-[#fff1f2] dark:bg-rose-950/40",
    text: "text-[#e11d48] dark:text-rose-400",
    border: "border-[#fecdd3] dark:border-rose-900/60",
  },
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-cyan-600",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getProjectPriority(p: Project): Priority {
  if (p.priority) {
    const formatted = (p.priority.charAt(0).toUpperCase() + p.priority.slice(1).toLowerCase()) as Priority;
    if (formatted in priorityStyles) return formatted;
  }
  const awardPriority = p.awards?.find((a) => a.startsWith("priority:"));
  if (awardPriority) {
    const val = awardPriority.replace("priority:", "");
    const formatted = (val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()) as Priority;
    if (formatted in priorityStyles) return formatted;
  }
  if (p.stage === "showcase") return "Low";
  if (p.stage === "testing") return "Urgent";
  if (p.stage === "building") return p.progress > 60 ? "High" : "Medium";
  if (p.stage === "planning") return "High";
  return "Low";
}

function nextPriority(curr: Priority): Priority {
  if (curr === "Low") return "Medium";
  if (curr === "Medium") return "High";
  if (curr === "High") return "Urgent";
  return "Low";
}

function getCardMeta(project: Project) {
  const codeAward = project.awards?.find((a) => a.startsWith("code:"));
  let codeTag = "";
  if (codeAward) {
    codeTag = codeAward.replace("code:", "");
  } else if (project.slug && project.slug.includes("-")) {
    const parts = project.slug.split("-");
    const prefix = parts[0].slice(0, 2).toUpperCase();
    const num = Math.abs(project.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 90 + 10);
    codeTag = `${prefix}-${num}`;
  } else {
    codeTag = `PRJ-${project.id.slice(0, 3).toUpperCase()}`;
  }

  const catAward = project.awards?.find((a) => a.startsWith("cat:"));
  let category = "";
  if (catAward) {
    category = catAward.replace("cat:", "");
  } else if (project.slug) {
    category = project.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } else {
    category = "Platform";
  }

  const folderAward = project.awards?.find((a) => a.startsWith("folder:"));
  const folderName = folderAward ? folderAward.replace("folder:", "") : (project.projectType || "vibl");

  return { codeTag, category, folderName };
}

function formatProjectDate(stage: ProjectStage, dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  if (stage === "showcase" || stage === "demo") {
    return `Completed ${day} ${month}`;
  }
  return `Since ${day} ${month}`;
}

export default function ChapterProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createProject, updateProject, deleteProject } = useStore();
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  // View & Filter states
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");
  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");

  // Drag and Drop states
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStage | null>(null);

  // Quick inline add state inside columns
  const [quickAddColumn, setQuickAddColumn] = useState<ProjectStage | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddClusterId, setQuickAddClusterId] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState<Priority>("Medium");

  // Quick Task Dialog Modal state
  const [quickTaskModalOpen, setQuickTaskModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCategory, setModalCategory] = useState("");
  const [modalStage, setModalStage] = useState<ProjectStage>("idea");
  const [modalPriority, setModalPriority] = useState<Priority>("Medium");
  const [modalClusterId, setModalClusterId] = useState("");
  const [modalAssigneeIds, setModalAssigneeIds] = useState<string[]>([]);

  // Task Quick View / Edit Slide-over Dialog state
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

  // Column sort options
  const [columnSorts, setColumnSorts] = useState<Record<ProjectStage, "default" | "priority" | "progress" | "name">>({
    idea: "default",
    planning: "default",
    building: "default",
    testing: "default",
    demo: "default",
    showcase: "default",
  });
  const [openMenuColumn, setOpenMenuColumn] = useState<ProjectStage | null>(null);

  // Case Study Editor Modal state
  const [editingCaseStudy, setEditingCaseStudy] = useState<FlagshipProject | null>(null);
  const [isNewCaseStudy, setIsNewCaseStudy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canManage =
    isCampusLead(store.session.roleKey) ||
    isExecutiveRole(store.session.roleKey) ||
    isSuperAdmin(store.session.roleKey);

  // Keyboard shortcut listener (/ to search, n for new task, b for board, l for list)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "/" || (e.ctrlKey && e.key === "f")) {
        e.preventDefault();
        document.getElementById("project-search-input")?.focus();
      } else if (e.key.toLowerCase() === "n" && canManage) {
        e.preventDefault();
        setQuickTaskModalOpen(true);
      } else if (e.key.toLowerCase() === "b") {
        setViewMode("board");
      } else if (e.key.toLowerCase() === "l") {
        setViewMode("list");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canManage]);

  if (!chapter) return <ChapterNotFound />;

  const chapterProjects = store.projects.filter((p) => p.chapterId === chapter.id);

  const chapterMembers = useMemo(() => {
    return store.profiles
      .filter((p) => p.chapterId === chapter.id)
      .map((p) => ({ id: p.id, fullName: p.fullName, role: p.role, avatarUrl: p.avatarUrl }));
  }, [store.profiles, chapter.id]);

  const chapterClusters = useMemo(() => {
    return store.clusters
      .filter((c) => c.chapterId === chapter.id)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [store.clusters, chapter.id]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedProjectId(projectId);
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: ProjectStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== stage) {
      setDragOverColumn(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stage: ProjectStage) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColumn === stage) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: ProjectStage) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain") || draggedProjectId;
    setDraggedProjectId(null);
    setDragOverColumn(null);

    if (!projectId) return;

    const project = chapterProjects.find((p) => p.id === projectId);
    if (!project) return;

    if (project.stage === targetStage) return;

    const colDef = COLUMNS.find((c) => c.stage === targetStage);
    const newProgress = colDef ? colDef.defaultProgress : project.progress;

    updateProject(projectId, {
      stage: targetStage,
      progress: newProgress,
    });

    const colLabel = colDef ? colDef.label : targetStage;
    showToast(`Moved "${project.title}" to ${colLabel}`);

    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          data: {
            id: project.id,
            chapterId: chapter.id,
            clusterId: project.clusterId || null,
            title: project.title,
            slug: project.slug,
            description: project.description,
            stage: targetStage,
            projectType: project.projectType,
            repositoryUrl: project.repositoryUrl || null,
            demoUrl: project.demoUrl || null,
            progress: newProgress,
            awards: project.awards,
            isShowcased: true,
          },
        }),
      });
    } catch (err) {
      console.warn("Failed to persist stage update:", err);
    }
  };

  // Move task to next stage via 1 click
  const handleAdvanceTask = async (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = getNextStage(project.stage);
    if (!next) return;

    const colDef = COLUMNS.find((c) => c.stage === next);
    const newProgress = colDef ? colDef.defaultProgress : project.progress;

    updateProject(project.id, {
      stage: next,
      progress: newProgress,
    });

    if (viewingProject && viewingProject.id === project.id) {
      setViewingProject({ ...viewingProject, stage: next, progress: newProgress });
    }

    showToast(`Advanced "${project.title}" to ${colDef?.label || next}`);

    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          data: {
            id: project.id,
            chapterId: chapter.id,
            stage: next,
            progress: newProgress,
          },
        }),
      });
    } catch (err) {
      console.warn("Advance error:", err);
    }
  };

  // Cycle priority on card click
  const handleCyclePriority = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const curr = getProjectPriority(project);
    const next = nextPriority(curr);

    const updatedAwards = (project.awards || []).filter((a) => !a.startsWith("priority:"));
    updatedAwards.push(`priority:${next}`);

    updateProject(project.id, {
      priority: next.toLowerCase() as any,
      awards: updatedAwards,
    });

    if (viewingProject && viewingProject.id === project.id) {
      setViewingProject({ ...viewingProject, priority: next.toLowerCase() as any, awards: updatedAwards });
    }

    showToast(`Priority set to ${next} for "${project.title}"`);
  };

  // Save Case Study modal handler
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

      await fetch("/api/mutations", {
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
      }).catch((err) => console.warn("Backend mutation warning:", err));

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

  // Quick inline add card to column
  const handleQuickAddSubmit = async (stage: ProjectStage) => {
    const title = quickAddTitle.trim();
    if (!title) return;

    const colDef = COLUMNS.find((c) => c.stage === stage);
    const colProgress = colDef ? colDef.defaultProgress : 20;

    const prefix = stage === "idea" || stage === "planning" ? "DS" : stage === "building" ? "FE" : "BE";
    const num = Math.floor(Math.random() * 80) + 15;
    const codeTag = `${prefix}-${num}`;

    const newProj: Project = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
      chapterId: chapter.id,
      clusterId: quickAddClusterId || undefined,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: `Task log created for stage: ${stage}`,
      stage,
      projectType: "campus",
      teamIds: store.session.userId ? [store.session.userId] : [],
      progress: colProgress,
      awards: [`priority:${quickAddPriority}`, `code:${codeTag}`],
      priority: quickAddPriority.toLowerCase() as any,
      isShowcased: true,
      createdAt: new Date().toISOString(),
    };

    createProject(newProj);
    setQuickAddColumn(null);
    setQuickAddTitle("");
    setQuickAddClusterId("");
    setQuickAddPriority("Medium");
    showToast(`Added card to ${colDef?.label || stage}`);

    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          data: {
            id: newProj.id,
            chapterId: chapter.id,
            clusterId: newProj.clusterId || null,
            title: newProj.title,
            slug: newProj.slug,
            description: newProj.description,
            stage: newProj.stage,
            projectType: newProj.projectType,
            progress: newProj.progress,
            awards: newProj.awards,
            isShowcased: true,
          },
        }),
      });
    } catch (err) {
      console.warn("Backend quick add warning:", err);
    }
  };

  // Quick Task Dialog Modal Submit
  const handleModalTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = modalTitle.trim();
    if (!title) return;

    const colDef = COLUMNS.find((c) => c.stage === modalStage);
    const colProgress = colDef ? colDef.defaultProgress : 25;

    const prefix = modalStage === "idea" || modalStage === "planning" ? "DS" : modalStage === "building" ? "FE" : "BE";
    const num = Math.floor(Math.random() * 80) + 15;
    const codeTag = `${prefix}-${num}`;

    const newProj: Project = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
      chapterId: chapter.id,
      clusterId: modalClusterId || undefined,
      title,
      slug: modalCategory ? modalCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-") : finalizeSlug(title),
      description: `Task created for ${colDef?.label || modalStage}`,
      stage: modalStage,
      projectType: "campus",
      teamIds: modalAssigneeIds.length > 0 ? modalAssigneeIds : (store.session.userId ? [store.session.userId] : []),
      progress: colProgress,
      awards: [
        `priority:${modalPriority}`,
        `code:${codeTag}`,
        modalCategory ? `cat:${modalCategory}` : "",
      ].filter(Boolean),
      priority: modalPriority.toLowerCase() as any,
      isShowcased: true,
      createdAt: new Date().toISOString(),
    };

    createProject(newProj);
    setQuickTaskModalOpen(false);
    setModalTitle("");
    setModalCategory("");
    setModalStage("idea");
    setModalPriority("Medium");
    setModalClusterId("");
    setModalAssigneeIds([]);
    showToast(`Task "${title}" created successfully!`);

    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          data: {
            id: newProj.id,
            chapterId: chapter.id,
            clusterId: newProj.clusterId || null,
            title: newProj.title,
            slug: newProj.slug,
            description: newProj.description,
            stage: newProj.stage,
            projectType: newProj.projectType,
            progress: newProj.progress,
            awards: newProj.awards,
            isShowcased: true,
          },
        }),
      });
    } catch (err) {
      console.warn("Mutation warning:", err);
    }
  };

  // Delete project handler
  const handleDeleteProject = async (id: string, title: string) => {
    deleteProject(id);
    setConfirmDeleteId(null);
    if (viewingProject && viewingProject.id === id) {
      setViewingProject(null);
    }
    showToast(`Removed "${title}"`);
    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delete_project",
          data: { id, chapterId: chapter.id },
        }),
      });
    } catch (err) {
      console.warn("Delete mutation error:", err);
    }
  };

  // Seed sample tasks matching exact reference screenshot (media_1790533813556.png)
  const handleSeedSampleProjects = () => {
    interface SampleItem {
      code: string;
      category: string;
      folder: string;
      title: string;
      stage: ProjectStage;
      priority: Priority;
      progress: number;
    }

    const samples: SampleItem[] = [
      {
        code: "DS-38",
        category: "Agent handoff",
        folder: "vibl",
        title: "Explore approval cards for agent handoffs",
        stage: "idea",
        priority: "Low",
        progress: 10,
      },
      {
        code: "BE-23",
        category: "Activity API",
        folder: "vibl",
        title: "Record an audit trail for agent actions",
        stage: "idea",
        priority: "Medium",
        progress: 15,
      },
      {
        code: "DS-34",
        category: "Foundations",
        folder: "BoardUI",
        title: "Define semantic tokens for elevated surfaces",
        stage: "planning",
        priority: "High",
        progress: 25,
      },
      {
        code: "FE-86",
        category: "Project board",
        folder: "firstview",
        title: "Add saved views for each project team",
        stage: "planning",
        priority: "Low",
        progress: 30,
      },
      {
        code: "FE-82",
        category: "Composer",
        folder: "firstview",
        title: "Add keyboard navigation to model picker",
        stage: "planning",
        priority: "Low",
        progress: 40,
      },
      {
        code: "FE-79",
        category: "Agent progress",
        folder: "firstview",
        title: "Animate nested task groups as they stream",
        stage: "building",
        priority: "Medium",
        progress: 55,
      },
      {
        code: "DS-31",
        category: "Dark mode",
        folder: "BoardUI",
        title: "Tune chart contrast on dark dashboard cards",
        stage: "building",
        priority: "Urgent",
        progress: 65,
      },
      {
        code: "BE-19",
        category: "Usage API",
        folder: "vibl",
        title: "Return rolling limits with reset timestamps",
        stage: "building",
        priority: "Low",
        progress: 60,
      },
      {
        code: "FE-76",
        category: "Questionnaire",
        folder: "vibl",
        title: "Polish the transition between plan questions",
        stage: "testing",
        priority: "Low",
        progress: 75,
      },
      {
        code: "DS-27",
        category: "Avatars",
        folder: "BoardUI",
        title: "Ship overlapping avatars for board cards",
        stage: "showcase",
        priority: "Low",
        progress: 100,
      },
      {
        code: "FE-71",
        category: "Studio canvas",
        folder: "firstview",
        title: "Keep generated ticket code crisp while zooming",
        stage: "showcase",
        priority: "Medium",
        progress: 100,
      },
      {
        code: "BE-16",
        category: "Registry",
        folder: "BoardUI",
        title: "Validate template schema during build",
        stage: "showcase",
        priority: "Low",
        progress: 100,
      },
      {
        code: "DS-25",
        category: "Motion",
        folder: "BoardUI",
        title: "Document reduced motion behavior for blades",
        stage: "showcase",
        priority: "Low",
        progress: 100,
      },
    ];

    for (const s of samples) {
      const p: Project = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}-${Math.random()}`,
        chapterId: chapter.id,
        clusterId: chapterClusters[0]?.id,
        title: s.title,
        slug: s.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: `Reference design task for ${s.category}`,
        stage: s.stage,
        projectType: "campus",
        teamIds: store.session.userId ? [store.session.userId] : [],
        progress: s.progress,
        priority: s.priority.toLowerCase() as any,
        awards: [
          `priority:${s.priority}`,
          `code:${s.code}`,
          `cat:${s.category}`,
          `folder:${s.folder}`,
        ],
        isShowcased: true,
        createdAt: new Date().toISOString(),
      };
      createProject(p);
    }

    showToast("Populated board with 13 reference design tasks!");
  };

  // Filter projects by search and cluster
  const filteredProjects = useMemo(() => {
    return chapterProjects.filter((p) => {
      const q = search.toLowerCase().trim();
      const meta = getCardMeta(p);
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        meta.codeTag.toLowerCase().includes(q) ||
        meta.category.toLowerCase().includes(q) ||
        meta.folderName.toLowerCase().includes(q);

      const matchesCluster =
        selectedClusterId === "all" || p.clusterId === selectedClusterId;

      return matchesSearch && matchesCluster;
    });
  }, [chapterProjects, search, selectedClusterId]);

  // Group and sort projects by stage column
  const columnProjects = useMemo(() => {
    const map: Record<ProjectStage, Project[]> = {
      idea: [],
      planning: [],
      building: [],
      testing: [],
      demo: [],
      showcase: [],
    };

    filteredProjects.forEach((p) => {
      if (map[p.stage]) {
        map[p.stage].push(p);
      } else {
        map.idea.push(p);
      }
    });

    (Object.keys(map) as ProjectStage[]).forEach((stage) => {
      const sort = columnSorts[stage];
      if (sort === "priority") {
        const order: Record<Priority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        map[stage].sort((a, b) => order[getProjectPriority(a)] - order[getProjectPriority(b)]);
      } else if (sort === "progress") {
        map[stage].sort((a, b) => (b.progress || 0) - (a.progress || 0));
      } else if (sort === "name") {
        map[stage].sort((a, b) => a.title.localeCompare(b.title));
      }
    });

    return map;
  }, [filteredProjects, columnSorts]);

  // Metrics summary
  const completedCount = columnProjects.showcase.length + columnProjects.demo.length;
  const inProgressCount = columnProjects.building.length + columnProjects.testing.length;
  const completionPercentage = chapterProjects.length > 0 ? Math.round((completedCount / chapterProjects.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-[var(--radius-lg)] border px-4 py-3 text-xs shadow-xl animate-in slide-in-from-top-2 backdrop-blur-md ${
            toast.type === "success"
              ? "bg-bg-panel/95 border-green-500/40 text-green-700 dark:text-green-300"
              : "bg-bg-panel/95 border-red-500/40 text-red-600 dark:text-red-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Row 1: Page Header & Quick Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
        <div className="space-y-1 max-w-2xl">
          <div className="text-[11px] font-mono tracking-wider text-[var(--accent)] font-bold flex items-center gap-1.5 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            {chapterEyebrow(store.session.roleKey, "programs")}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text tracking-tight">
              BoardUI Design Tasks
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-text-dim">
              {chapter.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-dim leading-relaxed">
            Interactive drag-and-drop board for chapter software platforms, sprint milestones, and open-source builder tasks.
          </p>
        </div>

        {/* Compact Pipeline Health Card */}
        <div className="flex items-center gap-3 bg-white dark:bg-bg-panel/80 border border-border/80 px-3.5 py-2 rounded-2xl shadow-xs shrink-0">
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] font-medium text-text-dim">Sprint Progress</div>
            <div className="text-xs font-bold text-text flex items-center gap-1.5">
              <span>{completedCount}/{chapterProjects.length} Tasks</span>
              <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/60">
                {completionPercentage}%
              </span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold text-xs">
            <CheckCheck size={16} />
          </div>
        </div>
      </div>

      {/* Row 2: Operation & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-white dark:bg-bg-panel/80 border border-border/80 rounded-2xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        {/* Left: Search input & Cluster Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              id="project-search-input"
              type="text"
              placeholder="Search tasks, code, tags... (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-border bg-bg pl-8.5 pr-7 text-xs text-text transition-colors focus:border-[var(--accent)] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Cluster Filter Pill Picker */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin">
            <span className="text-[10px] uppercase font-mono text-text-dim flex items-center gap-1 mr-1 shrink-0">
              <Folder size={11} /> Cluster:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClusterId("all")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all shrink-0 ${
                selectedClusterId === "all"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold border-transparent shadow-xs"
                  : "border-border/70 bg-bg text-text-dim hover:text-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              All ({chapterProjects.length})
            </button>
            {chapterClusters.map((cluster) => {
              const count = chapterProjects.filter((p) => p.clusterId === cluster.id).length;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all shrink-0 ${
                    selectedClusterId === cluster.id
                      ? "bg-[var(--accent)] text-white font-bold border-transparent shadow-xs"
                      : "border-border/70 bg-bg text-text-dim hover:text-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {cluster.name} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Board/List View Mode Toggle + Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50 justify-end flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-bg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "board"
                  ? "bg-white dark:bg-bg-panel shadow-xs text-text border border-border/80"
                  : "text-text-dim hover:text-text"
              }`}
              title="Kanban Board View (B)"
            >
              <Kanban size={13} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-bg-panel shadow-xs text-text border border-border/80"
                  : "text-text-dim hover:text-text"
              }`}
              title="Table List View (L)"
            >
              <List size={13} />
              <span>List</span>
            </button>
          </div>

          {/* Seed demo tasks button */}
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSeedSampleProjects}
              className="gap-1.5 text-xs text-text-dim hover:text-text border-dashed border-border"
              title="Populate 13 reference design tasks matching blueprint"
            >
              <Sparkles size={13} className="text-[var(--accent)]" /> Add Sample Tasks
            </Button>
          )}

          {/* Quick Task Modal Trigger */}
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setQuickTaskModalOpen(true)}
              className="gap-1.5 text-xs font-semibold border-border hover:border-neutral-300"
              title="Create a new task (N)"
            >
              <Plus size={13} /> Quick Task
            </Button>
          )}

          {/* New Case Study Button */}
          {canManage && (
            <Button
              size="sm"
              variant="orange"
              onClick={() => {
                const blank = blankCaseStudy(chapter.id, chapter.name);
                setEditingCaseStudy(blank);
                setIsNewCaseStudy(true);
              }}
              className="gap-1.5 shadow-sm text-xs font-bold"
            >
              <Plus size={14} /> New Case Study
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Pill indicator if filtered */}
      {(search || selectedClusterId !== "all") && (
        <div className="flex items-center gap-2 text-xs bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl text-text-dim animate-in fade-in">
          <span>Showing <strong>{filteredProjects.length}</strong> tasks</span>
          {search && <span>matching &quot;<strong>{search}</strong>&quot;</span>}
          {selectedClusterId !== "all" && (
            <span>in cluster <strong>{chapterClusters.find((c) => c.id === selectedClusterId)?.name}</strong></span>
          )}
          <button
            onClick={() => {
              setSearch("");
              setSelectedClusterId("all");
            }}
            className="ml-auto text-[var(--accent)] hover:underline font-semibold text-[11px]"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* VIEW MODE 1: KANBAN DRAG & DROP BOARD */}
      {viewMode === "board" && (
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[580px] scrollbar-thin">
            {COLUMNS.map((col) => {
              const items = columnProjects[col.stage] || [];
              const isOver = dragOverColumn === col.stage;
              const isAddingQuick = quickAddColumn === col.stage;
              const isMenuOpen = openMenuColumn === col.stage;

              return (
                <div
                  key={col.stage}
                  onDragOver={(e) => handleDragOver(e, col.stage)}
                  onDragLeave={(e) => handleDragLeave(e, col.stage)}
                  onDrop={(e) => handleDrop(e, col.stage)}
                  className={`w-[295px] min-w-[295px] shrink-0 rounded-2xl flex flex-col transition-all duration-200 border ${
                    isOver
                      ? "border-2 border-[var(--accent)] bg-[var(--accent)]/5 ring-4 ring-[var(--accent)]/10"
                      : "bg-[#f4f5f7] dark:bg-bg-panel/30 border-border/80"
                  }`}
                  style={{ maxHeight: "calc(100vh - 220px)" }}
                >
                  {/* Column Header */}
                  <div className="p-3.5 pb-2 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.dotColor} shrink-0`} />
                      <h3 className="font-semibold text-[14px] text-neutral-800 dark:text-neutral-200 tracking-tight">
                        {col.label}
                      </h3>
                      <span className="text-[12px] font-normal text-neutral-400">
                        {items.length}/{col.wipLimit}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 relative">
                      {/* Column Sorting / Options Menu */}
                      <button
                        type="button"
                        onClick={() => setOpenMenuColumn(isMenuOpen ? null : col.stage)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                        title="Column options"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-6 top-0 z-30 w-44 rounded-xl border border-border bg-white dark:bg-bg-panel p-1.5 shadow-xl text-xs space-y-1 animate-in fade-in-50 zoom-in-95"
                          onMouseLeave={() => setOpenMenuColumn(null)}
                        >
                          <div className="text-[10px] font-mono uppercase text-text-dim px-2 py-1">Sort Cards</div>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnSorts((s) => ({ ...s, [col.stage]: "default" }));
                              setOpenMenuColumn(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                              columnSorts[col.stage] === "default" ? "bg-[var(--accent)]/10 text-[var(--accent)] font-bold" : "hover:bg-bg"
                            }`}
                          >
                            <span>Default</span>
                            {columnSorts[col.stage] === "default" && <Check size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnSorts((s) => ({ ...s, [col.stage]: "priority" }));
                              setOpenMenuColumn(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                              columnSorts[col.stage] === "priority" ? "bg-[var(--accent)]/10 text-[var(--accent)] font-bold" : "hover:bg-bg"
                            }`}
                          >
                            <span>By Priority</span>
                            {columnSorts[col.stage] === "priority" && <Check size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnSorts((s) => ({ ...s, [col.stage]: "progress" }));
                              setOpenMenuColumn(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                              columnSorts[col.stage] === "progress" ? "bg-[var(--accent)]/10 text-[var(--accent)] font-bold" : "hover:bg-bg"
                            }`}
                          >
                            <span>By Progress</span>
                            {columnSorts[col.stage] === "progress" && <Check size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnSorts((s) => ({ ...s, [col.stage]: "name" }));
                              setOpenMenuColumn(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                              columnSorts[col.stage] === "name" ? "bg-[var(--accent)]/10 text-[var(--accent)] font-bold" : "hover:bg-bg"
                            }`}
                          >
                            <span>Alphabetical</span>
                            {columnSorts[col.stage] === "name" && <Check size={12} />}
                          </button>
                        </div>
                      )}

                      {/* Quick Add Button */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddColumn(col.stage);
                            setQuickAddTitle("");
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                          title={`Add card to ${col.label}`}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5 min-h-[140px] scrollbar-thin">
                    {/* Inline Quick Add Form */}
                    {isAddingQuick && (
                      <div className="rounded-xl border border-[var(--accent)]/50 bg-white dark:bg-bg-panel p-3.5 shadow-md space-y-2.5 animate-in fade-in-50 zoom-in-95">
                        <input
                          type="text"
                          placeholder="What needs to be built?..."
                          value={quickAddTitle}
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAddSubmit(col.stage);
                            if (e.key === "Escape") setQuickAddColumn(null);
                          }}
                          autoFocus
                          className="w-full text-xs font-semibold text-text bg-transparent border-b border-border/80 pb-1.5 focus:border-[var(--accent)] focus:outline-none placeholder:text-text-dim/60"
                        />

                        {/* Priority Selector Pills */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {(["Low", "Medium", "High", "Urgent"] as Priority[]).map((p) => {
                            const isSel = quickAddPriority === p;
                            const st = priorityStyles[p];
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setQuickAddPriority(p)}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                                  isSel ? `${st.bg} ${st.text} ${st.border} ring-1 ring-offset-0.5` : "text-text-dim border-border hover:bg-bg"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        {chapterClusters.length > 0 && (
                          <select
                            value={quickAddClusterId}
                            onChange={(e) => setQuickAddClusterId(e.target.value)}
                            className="w-full text-[11px] bg-bg border border-border rounded-md px-2 py-1 text-text focus:outline-none"
                          >
                            <option value="">(Optional Cluster)</option>
                            {chapterClusters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cs = blankCaseStudy(chapter.id, chapter.name);
                              cs.title = quickAddTitle;
                              setEditingCaseStudy(cs);
                              setIsNewCaseStudy(true);
                              setQuickAddColumn(null);
                            }}
                            className="text-[10px] text-text-dim hover:text-[var(--accent)] underline"
                          >
                            Full Case Study...
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQuickAddColumn(null)}
                              className="px-2 py-1 text-[11px] text-text-dim hover:text-text rounded-md"
                            >
                              Cancel
                            </button>
                            <Button
                              variant="orange"
                              size="sm"
                              className="h-6 px-2.5 text-[11px] font-bold"
                              onClick={() => handleQuickAddSubmit(col.stage)}
                            >
                              Add Card
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Render Kanban Cards */}
                    {items.map((project) => {
                      const cluster = store.clusters.find((c) => c.id === project.clusterId);
                      const priority = getProjectPriority(project);
                      const pStyle = priorityStyles[priority];
                      const isDragged = draggedProjectId === project.id;
                      const isDeleting = confirmDeleteId === project.id;
                      const nextStage = getNextStage(project.stage);

                      const teamMembers = (project.teamIds || [])
                        .map((id) => store.profiles.find((p) => p.id === id))
                        .filter(Boolean);

                      const caseStudy = parseProjectToCaseStudy(project, chapter.name);
                      const meta = getCardMeta(project);

                      return (
                        <div
                          key={project.id}
                          draggable={canManage}
                          onDragStart={(e) => handleDragStart(e, project.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setViewingProject(project)}
                          className={`group relative rounded-xl border bg-white dark:bg-neutral-800/90 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 select-none cursor-pointer ${
                            isDragged
                              ? "opacity-30 scale-95 border-dashed border-[var(--accent)]"
                              : "border-neutral-200/80 dark:border-neutral-700/60 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md hover:-translate-y-0.5"
                          }`}
                        >
                          {/* Row 1: Code Tag + Category Breadcrumb & Circular Avatars */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                              {canManage && (
                                <GripVertical size={12} className="text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 shrink-0 cursor-grab" />
                              )}
                              <span className="font-mono text-neutral-700 dark:text-neutral-200 font-bold">
                                {meta.codeTag}
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-600 text-[10px]">›</span>
                              <span className="truncate max-w-[120px] font-medium text-neutral-500 dark:text-neutral-400">
                                {meta.category}
                              </span>
                            </div>

                            {/* Overlapping Team Member Avatars (w-5.5 h-5.5) */}
                            <div className="flex items-center -space-x-1.5 shrink-0">
                              {teamMembers.length > 0 ? (
                                teamMembers.slice(0, 3).map((m, mIdx) => (
                                  <div
                                    key={m?.id || mIdx}
                                    title={m?.fullName}
                                    className={`h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-neutral-800 ${getAvatarColor(
                                      m?.fullName || "MB",
                                    )} text-white font-bold text-[8.5px] flex items-center justify-center overflow-hidden uppercase shadow-xs`}
                                  >
                                    {m?.avatarUrl ? (
                                      <img
                                        src={m.avatarUrl}
                                        alt={m.fullName}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      initials(m?.fullName || "MB")
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div
                                  title="Unassigned"
                                  className="h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 text-[8.5px] flex items-center justify-center"
                                >
                                  ?
                                </div>
                              )}
                              {teamMembers.length > 3 && (
                                <div className="h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[8px] font-bold flex items-center justify-center">
                                  +{teamMembers.length - 3}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Priority Chip + Folder Tag Pill */}
                          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => canManage && handleCyclePriority(project, e)}
                              title={canManage ? "Click to cycle priority" : undefined}
                              className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                                pStyle.bg
                              } ${pStyle.text} ${pStyle.border} ${
                                canManage ? "hover:scale-105 active:scale-95 cursor-pointer" : ""
                              }`}
                            >
                              {priority}
                            </button>

                            <div className="flex items-center gap-1 text-[10.5px] text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-md border border-neutral-200/80 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/60 font-mono">
                              <Folder size={10} className="text-neutral-400" />
                              <span className="truncate max-w-[95px]">
                                {cluster?.name || meta.folderName}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Title */}
                          <h4 className="font-semibold text-[13.5px] text-neutral-900 dark:text-neutral-100 leading-snug tracking-tight group-hover:text-[var(--accent)] transition-colors">
                            {project.title}
                          </h4>

                          {/* Row 4: Tagline / Description (if available) */}
                          {caseStudy.tagline && (
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mt-1">
                              {caseStudy.tagline}
                            </p>
                          )}

                          {/* Progress Mini Bar (for building & testing stages) */}
                          {project.progress !== undefined && project.stage !== "showcase" && (
                            <div className="mt-2.5">
                              <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(project.progress, 5)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Row 5: Footer */}
                          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                            <span className="text-neutral-400 font-normal">
                              {formatProjectDate(project.stage, project.createdAt)}
                            </span>

                            {/* Card Hover Action Icons */}
                            <div
                              className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* 1-Click Advance Button */}
                              {canManage && nextStage && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvanceTask(project, e)}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-colors"
                                  title={`Advance to ${COLUMNS.find((c) => c.stage === nextStage)?.label}`}
                                >
                                  <span>Advance</span>
                                  <ArrowRight size={10} />
                                </button>
                              )}

                              {project.repositoryUrl && (
                                <a
                                  href={project.repositoryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                                  title="Repository"
                                >
                                  <Code2 size={12} />
                                </a>
                              )}
                              {project.demoUrl && (
                                <a
                                  href={project.demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                                  title="Live Demo"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCaseStudy(caseStudy);
                                    setIsNewCaseStudy(false);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-[var(--accent)] transition-colors"
                                  title="Edit Case Study"
                                >
                                  <Edit3 size={12} />
                                </button>
                              )}
                              {canManage && (
                                <>
                                  {isDeleting ? (
                                    <div className="flex items-center gap-1 bg-red-500/10 p-0.5 rounded border border-red-500/20">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteProject(project.id, project.title)}
                                        className="text-[10px] text-red-600 font-bold px-1 hover:underline"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-[10px] text-text-dim px-1"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(project.id)}
                                      className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty Column Drop Target */}
                    {items.length === 0 && !isAddingQuick && (
                      <div
                        onClick={() => canManage && setQuickAddColumn(col.stage)}
                        className={`rounded-xl border border-dashed p-6 text-center text-xs flex flex-col items-center justify-center gap-1.5 transition-all min-h-[130px] ${
                          isOver
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                            : "border-neutral-300/80 text-neutral-400 hover:border-neutral-400 hover:bg-white/50 cursor-pointer"
                        }`}
                      >
                        <span className="text-[11px] font-medium">
                          {isOver ? `Drop to move to ${col.label}` : "No tasks here"}
                        </span>
                        {canManage && !isOver && (
                          <span className="text-[10px] text-[var(--accent)] font-semibold flex items-center gap-1">
                            <Plus size={11} /> Add Card
                          </span>
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

      {/* VIEW MODE 2: TABLE / LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-4 animate-in fade-in-50">
          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-bg-panel/50 p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
                <FolderGit2 size={26} />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
                {chapterProjects.length === 0 ? "No Case Studies or Projects Yet" : "No Matching Projects"}
              </h3>
              <p className="mt-1 text-xs text-text-dim max-w-md mx-auto">
                {chapterProjects.length === 0
                  ? `Your chapter (${chapter.name}) hasn't documented any projects or software platforms yet.`
                  : "Try adjusting your search query or cluster filter."}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const cluster = store.clusters.find((c) => c.id === project.clusterId);
              const team = project.teamIds
                .map((id) => store.profiles.find((p) => p.id === id)?.fullName)
                .filter(Boolean);
              const caseStudy = parseProjectToCaseStudy(project, chapter.name);
              const colDef = COLUMNS.find((c) => c.stage === project.stage);

              return (
                <TerminalPanel key={project.id} title={project.title.toLowerCase().replace(/\s/g, ".")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                          {project.title}
                        </h3>
                        {project.slug && (
                          <span className="font-mono text-[10px] text-text-dim bg-bg-page border border-border px-2 py-0.5 rounded-md">
                            /projects/{project.slug}
                          </span>
                        )}
                        <Badge tone="cyan" className="uppercase text-[10px]">
                          {colDef?.label || project.stage}
                        </Badge>
                      </div>
                      {caseStudy.tagline && (
                        <p className="text-[12px] font-medium text-text-dim italic">
                          &quot;{caseStudy.tagline}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        onClick={() => setViewingProject(project)}
                      >
                        <Eye size={12} /> View Details
                      </Button>
                      {canManage && (
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
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBar value={project.progress} label="Build progress" accent="magenta" />
                  </div>

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
                </TerminalPanel>
              );
            })
          )}
        </div>
      )}

      {/* Task Quick View & Interactive Details Slide-over Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80">
                    {getCardMeta(viewingProject).codeTag}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    {getCardMeta(viewingProject).category}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 leading-snug">
                  {viewingProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingProject(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Controls: Stage & Priority */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/50">
              <div>
                <label className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Stage
                </label>
                <select
                  value={viewingProject.stage}
                  onChange={(e) => {
                    const newStage = e.target.value as ProjectStage;
                    const col = COLUMNS.find((c) => c.stage === newStage);
                    updateProject(viewingProject.id, {
                      stage: newStage,
                      progress: col ? col.defaultProgress : viewingProject.progress,
                    });
                    setViewingProject({
                      ...viewingProject,
                      stage: newStage,
                      progress: col ? col.defaultProgress : viewingProject.progress,
                    });
                    showToast(`Updated stage to ${col?.label || newStage}`);
                  }}
                  className="w-full text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-text focus:outline-none"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.stage} value={c.stage}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <button
                  type="button"
                  onClick={() => handleCyclePriority(viewingProject)}
                  className={`w-full text-xs font-bold text-left px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                    priorityStyles[getProjectPriority(viewingProject)].bg
                  } ${priorityStyles[getProjectPriority(viewingProject)].text} ${
                    priorityStyles[getProjectPriority(viewingProject)].border
                  }`}
                  title="Click to cycle priority"
                >
                  <span>{getProjectPriority(viewingProject)}</span>
                  <span className="text-[10px] opacity-70">Click to change</span>
                </button>
              </div>
            </div>

            {/* Description / Summary */}
            {viewingProject.description && (
              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Description
                </label>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50/50 dark:bg-neutral-800/30 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  {viewingProject.description}
                </p>
              </div>
            )}

            {/* Team Members */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Assigned Builders
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(viewingProject.teamIds || []).map((id) => {
                  const m = store.profiles.find((p) => p.id === id);
                  if (!m) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-700/60"
                    >
                      <div className={`h-4.5 w-4.5 rounded-full ${getAvatarColor(m.fullName)} text-white text-[8px] font-bold flex items-center justify-center`}>
                        {initials(m.fullName)}
                      </div>
                      <span className="font-medium text-text">{m.fullName}</span>
                    </div>
                  );
                })}
                {(viewingProject.teamIds || []).length === 0 && (
                  <span className="text-xs text-neutral-400 italic">No specific builder assigned</span>
                )}
              </div>
            </div>

            {/* External Links */}
            <div className="flex items-center gap-2 pt-1">
              {viewingProject.repositoryUrl && (
                <a
                  href={viewingProject.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-text-dim hover:text-text bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-border transition-colors"
                >
                  <Code2 size={13} /> Repository <ExternalLink size={11} />
                </a>
              )}
              {viewingProject.demoUrl && (
                <a
                  href={viewingProject.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition-colors"
                >
                  <Sparkles size={13} /> Live Demo <ExternalLink size={11} />
                </a>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => handleDeleteProject(viewingProject.id, viewingProject.title)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 p-1"
              >
                <Trash2 size={13} /> Delete Task
              </button>

              <div className="flex items-center gap-2">
                {getNextStage(viewingProject.stage) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAdvanceTask(viewingProject)}
                    className="gap-1 text-xs"
                  >
                    <span>Advance Stage</span>
                    <ArrowRight size={13} />
                  </Button>
                )}

                <Button
                  variant="orange"
                  size="sm"
                  onClick={() => {
                    const cs = parseProjectToCaseStudy(viewingProject, chapter.name);
                    setEditingCaseStudy(cs);
                    setIsNewCaseStudy(false);
                    setViewingProject(null);
                  }}
                  className="text-xs font-bold gap-1"
                >
                  <Edit3 size={13} /> Full Case Study
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Task Modal Dialog */}
      {quickTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Create Quick Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickTaskModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleModalTaskSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Optimize SVG icons for mobile zoom"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Stage Column
                  </label>
                  <select
                    value={modalStage}
                    onChange={(e) => setModalStage(e.target.value as ProjectStage)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.stage} value={c.stage}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as Priority)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Agent handoff"
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Cluster
                  </label>
                  <select
                    value={modalClusterId}
                    onChange={(e) => setModalClusterId(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="">(None)</option>
                    {chapterClusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {chapterMembers.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    Assign Builders
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    {chapterMembers.slice(0, 8).map((m) => {
                      const isSelected = modalAssigneeIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setModalAssigneeIds((prev) =>
                              isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                            isSelected
                              ? "bg-[var(--accent)] text-white font-bold"
                              : "bg-white dark:bg-neutral-700 text-text hover:bg-neutral-100"
                          }`}
                        >
                          <div className={`h-3.5 w-3.5 rounded-full ${getAvatarColor(m.fullName)} text-white text-[7px] flex items-center justify-center font-bold`}>
                            {initials(m.fullName)}
                          </div>
                          <span>{m.fullName.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuickTaskModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="orange" size="sm" className="font-bold">
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Study Full Editor Modal */}
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

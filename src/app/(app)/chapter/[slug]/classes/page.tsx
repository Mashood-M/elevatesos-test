"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isFacultyRole } from "@/lib/access";
import { cohortLabel, cohortRepIds } from "@/lib/forms/helpers";
import { canManageClasses, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ClassCohort, Department } from "@/types";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";

type Draft = {
  department: string;
  year: string;
  section: string;
  rep1Id: string;
  rep2Id: string;
};

const emptyDraft = (): Draft => ({
  department: "",
  year: "",
  section: "",
  rep1Id: "",
  rep2Id: "",
});

function draftToRepIds(d: Draft): string[] {
  return [...new Set([d.rep1Id, d.rep2Id].map((id) => id.trim()).filter(Boolean))];
}

const DEFAULT_STANDARD_DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "Electronics & Communication Engineering (ECE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
];

export default function ChapterClassesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createClassCohort,
    updateClassCohort,
    deleteClassCohort,
    setUserRoles,
    updateUser,
    assignExecutiveMember,
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    canManageClasses(session.roleKey) ||
    hasPermission(store, session.roleKey, "class.manage");

  // Tab State: "departments" | "classes" | "assign"
  const [activeTab, setActiveTab] = useState<"departments" | "classes" | "assign" | "students">("departments");

  const yearSuggestions = store.academicYears ?? [];
  const divisionSuggestions = store.academicDivisions ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const [selectedStandardDept, setSelectedStandardDept] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [deptError, setDeptError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");

  const standardDeptOptions = useMemo(() => {
    const fromStore = store.standardDepartments ?? [];
    return [...new Set([...fromStore, ...DEFAULT_STANDARD_DEPARTMENTS])];
  }, [store.standardDepartments]);

  const departments = useMemo(() => {
    if (!chapter) return [];
    return (store.departments ?? [])
      .filter((d) => d.chapterId === chapter.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [store.departments, chapter]);

  const unaddedStandardDepts = useMemo(() => {
    return standardDeptOptions.filter(
      (dept) => !departments.some((d) => d.name.trim().toLowerCase() === dept.trim().toLowerCase()),
    );
  }, [standardDeptOptions, departments]);

  const cohorts = useMemo(() => {
    if (!chapter) return [];
    return (store.classCohorts ?? [])
      .filter((c) => c.chapterId === chapter.id)
      .slice()
      .sort((a, b) => cohortLabel(a).localeCompare(cohortLabel(b)));
  }, [store.classCohorts, chapter]);

  const chapterPeople = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter((p) => {
        if (p.chapterId !== chapter.id) return false;
        if (p.role === "faculty_coordinator") return false;
        const hasFacultyRole = (store.userRoles ?? []).some(
          (ur) => ur.userId === p.id && ur.roleKey === "faculty_coordinator",
        );
        return !hasFacultyRole;
      })
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, store.userRoles, chapter]);

  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter((p) => {
        if (p.chapterId !== chapter.id) return false;
        if (p.role === "faculty_coordinator") return false;
        const hasFacultyRole = (store.userRoles ?? []).some(
          (ur) => ur.userId === p.id && ur.roleKey === "faculty_coordinator",
        );
        return !hasFacultyRole;
      })
      .map((p) => {
        const cohort = (store.classCohorts ?? []).find(
          (c) =>
            (c.chapterId === chapter.id || !c.chapterId) &&
            cohortRepIds(c).includes(p.id),
        );
        const userRole =
          (store.userRoles ?? []).find(
            (ur) => ur.userId === p.id && (ur.chapterId === chapter.id || !ur.chapterId),
          ) || (store.userRoles ?? []).find((ur) => ur.userId === p.id);
        return {
          ...p,
          roleKey: userRole?.roleKey || "student",
          cohortLabel: cohort ? cohortLabel(cohort) : null,
          deptNorm: (p.department || "Unassigned").trim(),
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, store.classCohorts, store.userRoles, chapter]);

  const filteredChapterStudents = useMemo(() => {
    return chapterStudents.filter((stu) => {
      const q = studentSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        stu.fullName.toLowerCase().includes(q) ||
        stu.email.toLowerCase().includes(q) ||
        (stu.phone && stu.phone.includes(q)) ||
        (stu.department && stu.department.toLowerCase().includes(q));

      const matchesDept =
        selectedDeptFilter === "all" ||
        stu.deptNorm.toLowerCase() === selectedDeptFilter.toLowerCase() ||
        (selectedDeptFilter === "Unassigned" &&
          (!stu.department || stu.department === "Unassigned"));

      return matchesSearch && matchesDept;
    });
  }, [chapterStudents, studentSearch, selectedDeptFilter]);

  const DEFAULT_ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const activeYears = useMemo(() => {
    const fromStore = store.academicYears ?? [];
    return fromStore.length > 0 ? fromStore : DEFAULT_ACADEMIC_YEARS;
  }, [store.academicYears]);

  const totalRepsCount = useMemo(() => {
    return chapterStudents.filter(
      (s) => s.roleKey === "class_representative" || Boolean(s.cohortLabel),
    ).length;
  }, [chapterStudents]);

  // Modal State for Class Rep Assignment
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalDept, setAssignModalDept] = useState("");
  const [assignModalYear, setAssignModalYear] = useState("");
  const [assignModalSection, setAssignModalSection] = useState("A");
  const [assignModalStudentId, setAssignModalStudentId] = useState("");
  const [assignModalError, setAssignModalError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Modal State for Executive Member Assignment
  const [assignExecModalOpen, setAssignExecModalOpen] = useState(false);
  const [assignExecStudentId, setAssignExecStudentId] = useState("");
  const [assignExecDesignation, setAssignExecDesignation] = useState("");
  const [assignExecError, setAssignExecError] = useState("");
  const [isAssigningExec, setIsAssigningExec] = useState(false);

  const activeTerm = useMemo(() => {
    if (!chapter) return null;
    return (
      store.terms.find((t) => t.chapterId === chapter.id && t.status === "active") ?? null
    );
  }, [store.terms, chapter]);

  const isCampusLeadForThisChapter =
    session.roleKey === "founder" ||
    (session.roleKey === "campus_lead" &&
      (session.chapterId === chapter?.id || session.chapterId === chapter?.slug));

  async function executeAssignExecutiveMember() {
    if (!chapter) return;
    if (!assignExecStudentId) {
      setAssignExecError("Please choose a student to appoint as Executive Member.");
      return;
    }
    setIsAssigningExec(true);
    setAssignExecError("");
    try {
      const res = await assignExecutiveMember({
        chapterId: chapter.id,
        userId: assignExecStudentId,
        designation: assignExecDesignation.trim() || undefined,
      });
      if (!res.ok) {
        setAssignExecError(res.error || "Failed to appoint Executive Member.");
      } else {
        setAssignExecModalOpen(false);
        setAssignExecStudentId("");
        setAssignExecDesignation("");
        setFlash("✓ Successfully appointed Executive Member!");
      }
    } catch (err) {
      setAssignExecError(err instanceof Error ? err.message : "Error appointing Executive Member.");
    } finally {
      setIsAssigningExec(false);
    }
  }

  const eligibleCandidates = useMemo(() => {
    if (!assignModalDept || !assignModalYear) return { inSlot: [], others: chapterStudents };
    const inSlot = chapterStudents.filter(
      (s) =>
        s.deptNorm.toLowerCase() === assignModalDept.trim().toLowerCase() &&
        s.year &&
        s.year.trim().toLowerCase() === assignModalYear.trim().toLowerCase(),
    );
    const others = chapterStudents.filter(
      (s) =>
        !(
          s.deptNorm.toLowerCase() === assignModalDept.trim().toLowerCase() &&
          s.year &&
          s.year.trim().toLowerCase() === assignModalYear.trim().toLowerCase()
        ),
    );
    return { inSlot, others };
  }, [chapterStudents, assignModalDept, assignModalYear]);

  function openAssignModal(deptName?: string, year?: string, studentId?: string) {
    const d = deptName || departments[0]?.name || "";
    const y = year || activeYears[0] || "1st Year";
    setAssignModalDept(d);
    setAssignModalYear(y);
    setAssignModalSection("A");
    setAssignModalStudentId(studentId || "");
    setAssignModalError("");
    setAssignModalOpen(true);
  }

  async function executeAssignClassRep() {
    if (!chapter) return;
    if (!assignModalStudentId) {
      setAssignModalError("Please select a student to appoint as Class Representative.");
      return;
    }
    if (!assignModalDept) {
      setAssignModalError("Please select a department.");
      return;
    }
    if (!assignModalYear) {
      setAssignModalError("Please select an academic year.");
      return;
    }

    const student = store.profiles.find((p) => p.id === assignModalStudentId);
    if (!student) {
      setAssignModalError("Selected student profile not found.");
      return;
    }

    const isFaculty =
      student.role === "faculty_coordinator" ||
      (store.userRoles ?? []).some(
        (ur) => ur.userId === assignModalStudentId && ur.roleKey === "faculty_coordinator",
      );
    if (isFaculty) {
      setAssignModalError("Faculty members cannot be assigned as Class Representatives.");
      return;
    }

    setIsAssigning(true);
    setAssignModalError("");

    try {
      // 1. STRICT CAMPUS LEAD CONSTRAINT: ONLY assign "class_representative"
      const okRole = setUserRoles(assignModalStudentId, [
        { roleKey: "class_representative", chapterId: chapter.id },
      ]);
      if (!okRole) {
        throw new Error("Could not assign class representative role in database.");
      }

      // 2. Class Cohort in Chapter
      const existingCohort = (store.classCohorts ?? []).find(
        (c) =>
          c.chapterId === chapter.id &&
          c.department.trim().toLowerCase() === assignModalDept.trim().toLowerCase() &&
          c.year.trim().toLowerCase() === assignModalYear.trim().toLowerCase() &&
          (!assignModalSection || c.section.trim().toLowerCase() === assignModalSection.trim().toLowerCase()),
      );

      if (existingCohort) {
        const currentReps = cohortRepIds(existingCohort);
        if (!currentReps.includes(assignModalStudentId)) {
          updateClassCohort(existingCohort.id, {
            repIds: [...currentReps, assignModalStudentId],
          });
        }
      } else {
        createClassCohort({
          chapterId: chapter.id,
          department: assignModalDept,
          year: assignModalYear,
          section: assignModalSection.trim() || "A",
          repIds: [assignModalStudentId],
        });
      }

      // 3. Update student profile department, year, and section
      updateUser(assignModalStudentId, {
        department: assignModalDept,
        year: assignModalYear,
        ...(assignModalSection.trim() ? { section: assignModalSection.trim() } : {}),
      });

      setFlash(`✓ Appointed ${student.fullName} as Class Rep for ${assignModalDept} (${assignModalYear})!`);
      window.setTimeout(() => setFlash(""), 2800);
      setAssignModalOpen(false);
    } catch (err: any) {
      setAssignModalError(err?.message || "Failed to assign Class Representative.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveClassRep(studentId: string) {
    if (!chapter) return;
    const student = store.profiles.find((p) => p.id === studentId);
    if (!student) return;

    const confirmed = await confirm({
      title: "Remove Class Representative",
      description: `Are you sure you want to remove ${student.fullName} as Class Representative? Their role will revert to Student Member.`,
      confirmLabel: "Remove Role",
      danger: true,
    });
    if (!confirmed) return;

    try {
      // 1. Revert user role back to student
      setUserRoles(studentId, [
        { roleKey: "student", chapterId: chapter.id },
      ]);

      // 2. Remove student from all matching cohorts in this chapter
      const matchingCohorts = (store.classCohorts ?? []).filter(
        (c) =>
          (c.chapterId === chapter.id || !c.chapterId) &&
          cohortRepIds(c).includes(studentId),
      );

      for (const c of matchingCohorts) {
        const updatedRepIds = cohortRepIds(c).filter((id) => id !== studentId);
        updateClassCohort(c.id, {
          repIds: updatedRepIds,
        });
      }

      setFlash(`✓ Removed ${student.fullName} from Class Representative role.`);
      window.setTimeout(() => setFlash(""), 2800);
    } catch (err: any) {
      console.error("Failed to remove class rep:", err);
      setFlash("Failed to remove Class Representative role.");
      window.setTimeout(() => setFlash(""), 3000);
    }
  }

  if (!chapter) {
    return <p className="text-[var(--accent)]">// Chapter not found</p>;
  }

  function startCreate() {
    if (!departments.length) {
      setError("Create a department first.");
      setShowForm(false);
      return;
    }
    setEditingId(null);
    setDraft({
      ...emptyDraft(),
      department: departments[0]?.name ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function startEdit(c: ClassCohort) {
    const ids = cohortRepIds(c);
    setEditingId(c.id);
    setDraft({
      department: c.department,
      year: c.year,
      section: c.section,
      rep1Id: ids[0] ?? "",
      rep2Id: ids[1] ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function save() {
    setError("");
    if (!chapter) return;
    const repIds = draftToRepIds(draft);
    if (repIds.length < 1) {
      setError("Assign at least one representative.");
      return;
    }
    const anyFaculty = repIds.some((rId) => {
      const p = store.profiles.find((pr) => pr.id === rId);
      if (p?.role === "faculty_coordinator") return true;
      return (store.userRoles ?? []).some(
        (ur) => ur.userId === rId && ur.roleKey === "faculty_coordinator",
      );
    });
    if (anyFaculty) {
      setError("Faculty members cannot be assigned as Class Representatives.");
      return;
    }
    const payload = {
      department: draft.department,
      year: draft.year,
      section: draft.section,
      repIds,
    };
    if (editingId) {
      const ok = updateClassCohort(editingId, payload);
      if (!ok) {
        setError(
          "Could not update — check unique class key, department exists, and valid reps.",
        );
        return;
      }
    } else {
      const created = createClassCohort({
        chapterId: chapter.id,
        ...payload,
      });
      if (!created) {
        setError(
          "Could not create — class may already exist, department missing, or reps are invalid.",
        );
        return;
      }
    }
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setFlash("Saved");
    window.setTimeout(() => setFlash(""), 1400);
  }

  async function remove(id: string, label: string) {
    const ok = await confirm({
      title: "Delete class",
      description: `Delete class “${label}”?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteClassCohort(id);
  }

  function handleAddStandardDept(name: string) {
    setDeptError("");
    if (!chapter) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setDeptError("Please select a standard department.");
      return;
    }
    const created = createDepartment({
      chapterId: chapter.id,
      name: trimmed,
    });
    if (!created) {
      setDeptError(`"${trimmed}" is already added to your chapter.`);
      return;
    }
    setSelectedStandardDept("");
    setFlash(`Added "${trimmed}"`);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function handleAddAllStandardDepts() {
    setDeptError("");
    if (!chapter) return;
    let added = 0;
    standardDeptOptions.forEach((name) => {
      const exists = departments.some(
        (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (!exists) {
        const ok = createDepartment({
          chapterId: chapter.id,
          name: name.trim(),
        });
        if (ok) added++;
      }
    });
    if (added > 0) {
      setFlash(`Added ${added} standard departments`);
      window.setTimeout(() => setFlash(""), 2000);
    } else {
      setDeptError("All standard departments are already added to your chapter.");
    }
  }

  function addCustomDepartment() {
    setDeptError("");
    if (!chapter) return;
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setDeptError("Please enter a department name.");
      return;
    }
    const created = createDepartment({
      chapterId: chapter.id,
      name: trimmed,
    });
    if (!created) {
      setDeptError(`Could not add "${trimmed}" — empty or duplicate name.`);
      return;
    }
    setNewDeptName("");
    setFlash(`Added custom department "${trimmed}"`);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function startRename(d: Department) {
    setRenamingId(d.id);
    setRenameValue(d.name);
    setDeptError("");
  }

  function saveRename() {
    if (!renamingId) return;
    setDeptError("");
    const ok = updateDepartment(renamingId, { name: renameValue });
    if (!ok) {
      setDeptError("Could not rename — empty or duplicate name.");
      return;
    }
    setRenamingId(null);
    setRenameValue("");
    setFlash("Department renamed");
    window.setTimeout(() => setFlash(""), 1400);
  }

  async function removeDepartment(d: Department) {
    const confirmed = await confirm({
      title: "Delete department",
      description: `Delete department “${d.name}”?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    setDeptError("");
    const ok = deleteDepartment(d.id);
    if (!ok) {
      setDeptError(
        `Cannot delete “${d.name}” — remove its class divisions first.`,
      );
      return;
    }
    if (draft.department.toUpperCase() === d.name.toUpperCase()) {
      setDraft((prev) => ({ ...prev, department: "" }));
    }
    setFlash("Department deleted");
    window.setTimeout(() => setFlash(""), 1400);
  }

  function viewStudentsForDept(deptName: string) {
    setSelectedDeptFilter(deptName);
    setActiveTab("students");
  }

  if (session.roleKey === "class_representative" || isFacultyRole(session.roleKey)) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "programs")}
          title="Classes & Departments"
          description="Class cohort and department management is restricted to Campus Leads."
        />
        <TerminalPanel title="access.restricted" accent="orange">
          <p className="text-sm text-text-dim">
            {isFacultyRole(session.roleKey)
              ? "Faculty members do not manage class sections or cohorts."
              : "Class Representatives do not have permission to view or manage classes and departments."}
          </p>
          <Link
            href={`/chapter/${slug}`}
            className="mt-3 inline-block text-[var(--accent)] font-semibold text-xs"
          >
            ← Back to chapter
          </Link>
        </TerminalPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Classes & Academic Departments"
        description="Configure campus academic faculties, class division cohorts, appointed representatives, and student directorys."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="self-center rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)]/20 animate-pulse">
                {flash}
              </span>
            ) : null}
            {canManage && activeTab === "classes" ? (
              <Button
                variant="orange"
                onClick={startCreate}
                disabled={!departments.length}
                className="gap-1.5 shadow-xs text-xs sm:text-sm font-semibold"
              >
                <Plus size={14} />
                <span>{showForm && !editingId ? "Close Form" : "New Class"}</span>
              </Button>
            ) : null}
            {canManage && activeTab === "departments" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddAllStandardDepts}
                className="text-xs gap-1.5 border border-border/80"
              >
                <Sparkles size={13} className="text-[var(--accent)]" />
                <span>Add All Standard Depts</span>
              </Button>
            ) : null}
          </div>
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Departments"
          value={departments.length}
          hint="Academic faculties"
          accent="orange"
        />
        <Stat
          label="Classes & Cohorts"
          value={cohorts.length}
          hint="Configured year/sections"
        />
        <Stat
          label="Appointed Class Reps"
          value={totalRepsCount}
          hint="Active representatives"
        />
        <Stat
          label="Enrolled Students"
          value={chapterStudents.length}
          hint="Total member directory"
        />
      </div>

      {/* Unified Segmented Tab Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("departments")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "departments"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <Building2 size={13} />
          <span>Departments</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "departments" ? "bg-bg/20 text-bg" : "bg-border/60 text-text-dim",
            )}
          >
            {departments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("classes")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "classes"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <GraduationCap size={13} />
          <span>Classes & Divisions</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "classes" ? "bg-bg/20 text-bg" : "bg-border/60 text-text-dim",
            )}
          >
            {cohorts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assign")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "assign" || activeTab === "students"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <UserCheck size={13} />
          <span>Assign Class Reps</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "assign" || activeTab === "students"
                ? "bg-bg/20 text-bg"
                : "bg-border/60 text-text-dim",
            )}
          >
            {totalRepsCount}
          </span>
        </button>
      </div>

      {!canManage ? (
        <TerminalPanel title="read.only" accent="orange" className="mb-6">
          <p className="text-sm text-text-dim">
            Class lists are managed by chapter executives (Campus Lead, Faculty Coordinator, Secretary,
            Elevates Coordinator). Ask them to add your division.
          </p>
          <Link
            href={`/chapter/${slug}`}
            className="mt-3 inline-block text-[var(--accent)] font-semibold"
          >
            Back to chapter
          </Link>
        </TerminalPanel>
      ) : null}

      {/* ========================================================= */}
      {/* TAB 1: DEPARTMENTS (Add & List) */}
      {/* ========================================================= */}
      {activeTab === "departments" && (
        <TerminalPanel
          title="departments"
          meta={`${departments.length} configured`}
          accent="orange"
          className="mb-6"
        >
          <div className="space-y-6">
            {/* Header info & Quick CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] shrink-0 shadow-2xs">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    College Academic Departments
                  </h3>
                  <p className="text-xs text-text-dim mt-0.5">
                    Add standard college branches or create custom departments for {chapter.name}.
                  </p>
                </div>
              </div>
              {unaddedStandardDepts.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold"
                  onClick={handleAddAllStandardDepts}
                >
                  <Sparkles size={13} className="text-[var(--accent)] mr-1.5" />
                  <span>Add All Standard Depts</span>
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle2 size={13} />
                  <span>All Standard Depts Added</span>
                </span>
              )}
            </div>

            {deptError ? (
              <p className="rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-2 text-xs text-red-500 font-medium animate-fade-in flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{deptError}</span>
              </p>
            ) : null}

            {/* Smart Unified Add Department Bar */}
            <div className="rounded-[var(--radius-xl)] bg-bg-page/60 border border-border/70 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute" />
                  <Input
                    className="pl-9.5 pr-4 h-10 text-xs rounded-xl bg-bg-panel border-border/80 focus:border-[var(--accent)] placeholder:text-text-mute/80"
                    placeholder="Type a custom department name (e.g. Biomedical Engineering, Architecture)..."
                    value={newDeptName}
                    onChange={(e) => {
                      setNewDeptName(e.target.value);
                      if (deptError) setDeptError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustomDepartment();
                    }}
                  />
                </div>
                <Button
                  variant="orange"
                  onClick={addCustomDepartment}
                  disabled={!newDeptName.trim()}
                  className="h-10 px-4 text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                >
                  <Plus size={14} className="mr-1.5" /> Add Department
                </Button>
              </div>

              {/* Quick-Add Chips for Unadded Standard Departments */}
              {unaddedStandardDepts.length > 0 && (
                <div className="pt-1.5 border-t border-border/40">
                  <p className="text-[11px] font-medium text-text-dim mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} className="text-[var(--accent)]" />

                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unaddedStandardDepts.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => handleAddStandardDept(dept)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-bg-panel hover:bg-[var(--accent)]/10 text-text-dim hover:text-[var(--accent)] border border-border/80 hover:border-[var(--accent)]/30 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                        title={`Click to add ${dept}`}
                      >
                        <Plus size={11} className="text-[var(--accent)]" />
                        <span>{dept}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Configured Departments List */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-dim flex items-center gap-2">
                  <span>Configured Departments</span>
                  <span className="rounded-full bg-bg-page border border-border/70 px-2 py-0.2 text-[10px] font-mono font-semibold text-text">
                    {departments.length}
                  </span>
                </h4>
              </div>

              {!departments.length ? (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-border/80 p-8 text-center bg-bg-page/40 space-y-1.5">
                  <Building2 size={24} className="mx-auto text-text-mute opacity-50" />
                  <p className="text-xs font-semibold text-text">No departments configured yet</p>
                  <p className="text-[11px] text-text-dim max-w-sm mx-auto">
                    Add standard branches from the quick-add buttons above or enter custom department names.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {departments.map((d) => {
                    const classCount = cohorts.filter(
                      (c) => c.department.trim().toLowerCase() === d.name.trim().toLowerCase(),
                    ).length;
                    const studentCount = chapterStudents.filter(
                      (s) => s.deptNorm.toLowerCase() === d.name.trim().toLowerCase(),
                    ).length;

                    return (
                      <li
                        key={d.id}
                        className="group flex flex-col justify-between gap-3 rounded-[var(--radius-xl)] bg-bg-panel border border-border/70 shadow-[var(--shadow-sm)] p-4 hover:border-[var(--accent)]/40 hover:shadow-md transition-all"
                      >
                        {renamingId === d.id ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-text-dim">Rename Department</p>
                            <Input
                              className="text-xs bg-bg-page h-9 rounded-xl"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename();
                                if (e.key === "Escape") {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }}
                                className="text-xs h-7 px-2.5"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={saveRename}
                                className="text-xs h-7 px-3 font-semibold"
                              >
                                <Check size={12} className="mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] shrink-0 font-mono text-[11px] font-bold">
                                  {d.name.includes("(") && d.name.includes(")")
                                    ? d.name.substring(d.name.lastIndexOf("(") + 1, d.name.lastIndexOf(")"))
                                    : d.name.slice(0, 3).toUpperCase()}
                                </div>
                                <p className="font-bold text-xs text-text truncate" title={d.name}>
                                  {d.name}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full bg-bg-page border border-border/70 px-2.5 py-0.5 text-text-dim font-medium">
                                  <Layers size={11} className="text-text-mute" />
                                  <span>{classCount} {classCount === 1 ? "class" : "classes"}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => viewStudentsForDept(d.name)}
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-0.5 transition-colors font-medium cursor-pointer"
                                  title="View students in this department"
                                >
                                  <Users size={11} />
                                  <span>{studentCount} {studentCount === 1 ? "student" : "students"}</span>
                                  <ChevronRight size={10} />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startRename(d)}
                                className="h-7 w-7 p-0 text-text-dim hover:text-text rounded-lg"
                                title="Rename Department"
                              >
                                <Pencil size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDepartment(d)}
                                className="h-7 w-7 p-0 text-text-mute hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                title="Delete Department"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </TerminalPanel>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CLASSES & DIVISIONS (Cohorts & Reps) */}
      {/* ========================================================= */}
      {activeTab === "classes" && (
        <>
          {canManage && showForm ? (
            <TerminalPanel
              title={editingId ? "edit.class" : "create.class"}
              accent="orange"
              className="mb-6"
            >
              {!departments.length ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--accent)]">
                    Create a department first before setting up classes.
                  </p>
                  <Button
                    variant="orange"
                    onClick={() => setActiveTab("departments")}
                    className="text-xs"
                  >
                    Go to Departments Tab
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <FieldLabel>Department</FieldLabel>
                      <Select
                        value={draft.department}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, department: e.target.value }))
                        }
                      >
                        <option value="">Select…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Year</FieldLabel>
                      <Input
                        list="year-suggestions"
                        placeholder="1st / 2nd / …"
                        value={draft.year}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, year: e.target.value }))
                        }
                      />
                      <datalist id="year-suggestions">
                        {yearSuggestions.map((y) => (
                          <option key={y} value={y} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <FieldLabel>Division</FieldLabel>
                      <Input
                        list="division-suggestions"
                        placeholder="T1 / T2 / A / …"
                        value={draft.section}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, section: e.target.value }))
                        }
                      />
                      <datalist id="division-suggestions">
                        {divisionSuggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <FieldLabel>Representative 1 (required)</FieldLabel>
                      <Select
                        value={draft.rep1Id}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, rep1Id: e.target.value }))
                        }
                      >
                        <option value="">Select…</option>
                        {chapterPeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                            {p.department ? ` (${p.department})` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Representative 2 (optional)</FieldLabel>
                      <Select
                        value={draft.rep2Id}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, rep2Id: e.target.value }))
                        }
                      >
                        <option value="">None — single rep</option>
                        {chapterPeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                            {p.department ? ` (${p.department})` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] text-text-dim">
                    Minimum one rep. Second is optional when class strength only needs
                    one person — both can be any gender.
                  </p>
                  {error ? (
                    <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="orange"
                      onClick={save}
                      disabled={!draft.department || !draft.rep1Id}
                    >
                      {editingId ? "Save changes" : "Create class"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </TerminalPanel>
          ) : null}

          {canManage && error && !showForm ? (
            <p className="mb-4 text-sm text-[var(--accent)]">{error}</p>
          ) : null}

          <TerminalPanel title="class.list" meta={`${cohorts.length} classes`} accent="orange">
            {!cohorts.length ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-text-dim">
                  No classes or divisions configured yet.
                </p>
                {canManage ? (
                  departments.length ? (
                    <Button variant="orange" size="sm" onClick={startCreate}>
                      <Plus size={14} className="mr-1" /> Create First Class Division
                    </Button>
                  ) : (
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={() => setActiveTab("departments")}
                    >
                      Add a Department First
                    </Button>
                  )
                ) : null}
              </div>
            ) : (
              <ul className="space-y-3">
                {cohorts.map((c) => {
                  const ids = cohortRepIds(c);
                  const names = ids.map(
                    (id) => store.profiles.find((p) => p.id === id)?.fullName ?? id,
                  );
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-bg shadow-[var(--shadow-sm)] p-3.5 border border-border"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-text">{cohortLabel(c)}</p>
                          <span className="rounded-full bg-[var(--accent-soft)] text-[var(--accent-hover)] border border-[var(--accent)]/20 px-2.5 py-0.5 text-[10px] font-semibold">
                            {c.department}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-text-dim">
                          {names.length
                            ? names.map((n, i) => `Rep ${i + 1}: ${n}`).join(" · ")
                            : "No representatives assigned"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ids.map((_, i) => (
                            <Badge key={i} tone={i === 0 ? "orange" : "mute"}>
                              rep {i + 1}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {canManage ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => startEdit(c)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => remove(c.id, cohortLabel(c))}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </TerminalPanel>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ASSIGN CLASS REPS (Year-Wise Department Coverage) */}
      {/* ========================================================= */}
      {(activeTab === "assign" || activeTab === "students") && (
        <div className="space-y-6">
          {/* Overview & Role Scope Panel */}
          <TerminalPanel
            title="leadership_and_class_assignments"
            meta={`${totalRepsCount} Class Reps`}
            accent="orange"
            className="mb-6"
          >
            {/* Role restriction callout & description */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                    <UserCheck size={16} />
                  </span>
                  <h3 className="text-base font-bold text-text">Assign Leadership &amp; Class Roles</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-500">
                    <Lock size={10} /> Campus Lead Scope: Class Reps &amp; Executive Members
                  </span>
                </div>
                <p className="text-xs text-text-dim max-w-2xl">
                  Campus Leads can appoint students as <strong>Class Representatives</strong> for their departments or as <strong>Executive Members</strong> for the current active term. Search or filter students below to manage appointments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isCampusLeadForThisChapter && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAssignExecStudentId("");
                      setAssignExecDesignation("");
                      setAssignExecError("");
                      setAssignExecModalOpen(true);
                    }}
                  >
                    <Shield size={14} className="mr-1 text-cyan" /> Assign Executive Member
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={() => openAssignModal()}
                    disabled={!departments.length}
                  >
                    <Plus size={14} className="mr-1" /> Appoint Class Rep
                  </Button>
                )}
              </div>
            </div>

            {/* 3-Stat Metric Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="rounded-xl border border-border bg-bg p-3.5 shadow-sm">
                <p className="text-[11px] font-medium text-text-dim">Enrolled Students</p>
                <p className="mt-1 text-xl font-black text-text">{chapterStudents.length}</p>
                <p className="mt-0.5 text-[10px] text-text-mute">Students in chapter</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-emerald-600">Appointed Class Reps</p>
                  <CheckCircle2 size={13} className="text-emerald-500" />
                </div>
                <p className="mt-1 text-xl font-black text-emerald-600">{totalRepsCount}</p>
                <p className="mt-0.5 text-[10px] text-emerald-600/70">Active class representatives</p>
              </div>
              <div className="rounded-xl border border-border bg-bg p-3.5 shadow-sm">
                <p className="text-[11px] font-medium text-text-dim">Academic Departments</p>
                <p className="mt-1 text-xl font-black text-text">{departments.length}</p>
                <p className="mt-0.5 text-[10px] text-text-mute">Configured in chapter</p>
              </div>
            </div>
          </TerminalPanel>

          {/* Student Directory & Quick Action Table */}
          <TerminalPanel
            title="students.directory_and_roles"
            meta={`${chapterStudents.length} students`}
            accent="orange"
            className="mb-6"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">
                      Student Directory & Role Management
                    </h3>
                    <p className="text-[12px] text-text-dim">
                      Filter students by department and appoint or remove Class Representatives.
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"
                  />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student, email, phone..."
                    className="pl-8 text-xs bg-bg"
                  />
                </div>
              </div>

              {/* Department Filter Pills */}
              <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedDeptFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${selectedDeptFilter === "all"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-bg-panel text-text-dim hover:text-text border border-border hover:bg-bg"
                    }`}
                >
                  All Departments ({chapterStudents.length})
                </button>
                {departments.map((dept) => {
                  const count = chapterStudents.filter(
                    (s) => s.deptNorm.toLowerCase() === dept.name.trim().toLowerCase(),
                  ).length;
                  const isSelected =
                    selectedDeptFilter.toLowerCase() === dept.name.trim().toLowerCase();
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDeptFilter(dept.name)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isSelected
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-bg-panel text-text-dim hover:text-text border border-border hover:bg-bg"
                        }`}
                    >
                      {dept.name} ({count})
                    </button>
                  );
                })}
                {chapterStudents.some(
                  (s) => !s.department || s.department === "Unassigned",
                ) && (
                    <button
                      type="button"
                      onClick={() => setSelectedDeptFilter("Unassigned")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${selectedDeptFilter === "Unassigned"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-bg-panel text-text-dim hover:text-text border border-border hover:bg-bg"
                        }`}
                    >
                      Unassigned (
                      {
                        chapterStudents.filter(
                          (s) => !s.department || s.department === "Unassigned",
                        ).length
                      }
                      )
                    </button>
                  )}
              </div>

              {/* Students List Table */}
              {!filteredChapterStudents.length ? (
                <div className="rounded-[14px] border border-dashed border-border p-6 text-center text-xs text-text-dim">
                  No students found
                  {selectedDeptFilter !== "all" ? ` in ${selectedDeptFilter}` : ""}
                  {studentSearch ? ` matching "${studentSearch}"` : ""}.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[14px] border border-border bg-bg-panel shadow-[var(--shadow-sm)]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-dim bg-bg/50">
                        <th className="px-3.5 py-3 font-semibold">Student Name</th>
                        <th className="px-3.5 py-3 font-semibold">Contact</th>
                        <th className="px-3.5 py-3 font-semibold">Department</th>
                        <th className="px-3.5 py-3 font-semibold">Year & Division</th>
                        <th className="px-3.5 py-3 font-semibold">Status / Role</th>
                        {canManage && (
                          <th className="px-3.5 py-3 font-semibold text-right">Class Rep Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredChapterStudents.map((stu) => {
                        const isClassRep =
                          stu.roleKey === "class_representative" ||
                          (stu.roleKey !== "student" && Boolean(stu.cohortLabel));
                        return (
                          <tr key={stu.id} className="hover:bg-bg/40 transition">
                            <td className="px-3.5 py-3 font-medium text-text">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)] shrink-0">
                                  {stu.fullName.charAt(0)}
                                </span>
                                <div>
                                  <p className="font-semibold text-text">{stu.fullName}</p>
                                  {stu.elevatesId ? (
                                    <span className="text-[10px] text-text-dim">
                                      {stu.elevatesId}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-text-dim">
                              <p className="text-text">{stu.email}</p>
                              {stu.phone ? (
                                <p className="text-[11px] text-text-mute">{stu.phone}</p>
                              ) : null}
                            </td>

                            <td className="px-3.5 py-3">
                              <span className="inline-block rounded-full bg-bg border border-border px-2.5 py-0.5 text-[11px] font-medium text-text">
                                {stu.department || "Unassigned"}
                              </span>
                            </td>

                            <td className="px-3.5 py-3 text-text-dim">
                              {stu.year ? stu.year : "—"}
                              {stu.section ? ` · Sec ${stu.section}` : ""}
                            </td>
                            <td className="px-3.5 py-3">
                              {isClassRep ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                                  <CheckCircle2 size={12} /> Class Rep {stu.cohortLabel ? `· ${stu.cohortLabel}` : ""}
                                </span>
                              ) : stu.roleKey === "executive_member" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-600">
                                  <Shield size={12} /> Executive Member
                                </span>
                              ) : (
                                <span className="text-[11px] text-text-dim capitalize">
                                  {stu.roleKey ? stu.roleKey.replace("_", " ") : "student"}
                                </span>
                              )}
                            </td>

                            {canManage && (
                              <td className="px-3.5 py-3 text-right">
                                {isClassRep ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveClassRep(stu.id)}
                                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 py-1 h-7"
                                  >
                                    Remove Rep
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        openAssignModal(
                                          stu.deptNorm !== "Unassigned"
                                            ? stu.deptNorm
                                            : departments[0]?.name,
                                          stu.year || activeYears[0],
                                          stu.id,
                                        )
                                      }
                                      className="text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 py-1 h-7"
                                    >
                                      <UserCheck size={12} className="mr-1" />
                                      Class Rep
                                    </Button>
                                    {isCampusLeadForThisChapter && stu.roleKey !== "executive_member" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setAssignExecStudentId(stu.id);
                                          setAssignExecDesignation("");
                                          setAssignExecError("");
                                          setAssignExecModalOpen(true);
                                        }}
                                        className="text-xs text-cyan hover:bg-cyan/10 py-1 h-7"
                                      >
                                        <Shield size={12} className="mr-1" />
                                        Executive
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TerminalPanel>

          {/* Modal for Appointing Class Rep */}
          {assignModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-border bg-bg-panel p-4 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">Appoint Class Representative</h3>
                      <p className="text-[11px] text-text-dim">Assign student to department & academic year</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="rounded-lg p-1 text-text-dim hover:text-text hover:bg-bg"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Strict Role Policy Callout */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-text-dim leading-relaxed">
                    <strong className="text-text font-semibold">Strict Role Restriction:</strong>{" "}
                    As a Campus Lead, you are authorized to assign <strong>only</strong> the{" "}
                    <span className="text-[var(--accent)] font-bold">Class Representative</span> role.
                  </div>
                </div>

                {assignModalError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {assignModalError}
                  </div>
                )}

                <div className="space-y-3.5 text-xs">
                  <div>
                    <FieldLabel>Department *</FieldLabel>
                    <Select
                      value={assignModalDept}
                      onChange={(e) => setAssignModalDept(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Academic Year *</FieldLabel>
                      <Select
                        value={assignModalYear}
                        onChange={(e) => setAssignModalYear(e.target.value)}
                      >
                        {activeYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <FieldLabel>Class Section</FieldLabel>
                      <Input
                        value={assignModalSection}
                        onChange={(e) => setAssignModalSection(e.target.value)}
                        placeholder="e.g. A or B"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Select Student to Appoint *</FieldLabel>
                    <Select
                      value={assignModalStudentId}
                      onChange={(e) => setAssignModalStudentId(e.target.value)}
                    >
                      <option value="">-- Choose student --</option>
                      {eligibleCandidates.inSlot.length > 0 && (
                        <optgroup
                          label={`Enrolled in ${assignModalDept} (${assignModalYear}) — Recommended`}
                        >
                          {eligibleCandidates.inSlot.map((s) => (
                            <option key={s.id} value={s.id}>
                              ★ {s.fullName} {s.section ? `(Sec ${s.section})` : ""} — {s.email}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {eligibleCandidates.others.length > 0 && (
                        <optgroup label="Other Students in Chapter">
                          {eligibleCandidates.others.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName} ({s.department || "No Dept"} · {s.year || "No Year"}) — {s.email}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </Select>
                    <p className="mt-1 text-[10px] text-text-mute">
                      Upon confirmation, this student will receive the Class Representative role and be linked to this department cohort in Supabase.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssignModalOpen(false)}
                    disabled={isAssigning}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={executeAssignClassRep}
                    disabled={isAssigning || !assignModalStudentId}
                  >
                    {isAssigning ? "Assigning..." : "Confirm & Appoint Class Rep"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Appointing Executive Member */}
          {assignExecModalOpen && (
            <Dialog
              open={assignExecModalOpen}
              onClose={() => setAssignExecModalOpen(false)}
              title="Assign Executive Member"
              description={`Appoint a student as Executive Member for ${chapter?.name || "chapter"}${activeTerm ? ` (Term ${activeTerm.termYear})` : ""}.`}
              footer={
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssignExecModalOpen(false)}
                    disabled={isAssigningExec}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={executeAssignExecutiveMember}
                    disabled={isAssigningExec || !assignExecStudentId}
                  >
                    {isAssigningExec ? "Assigning..." : "Confirm & Appoint"}
                  </Button>
                </div>
              }
            >
              <div className="space-y-3.5 py-2 text-xs">
                {assignExecError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {assignExecError}
                  </div>
                )}

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-cyan shrink-0 mt-0.5" />
                  <div className="text-[11px] text-text-dim leading-relaxed">
                    <strong className="text-text font-semibold">Executive Member Role:</strong>{" "}
                    Appointees receive the same operational event &amp; attendance tracking capabilities as Campus Leads for this chapter, attached to the current active term.
                  </div>
                </div>

                <div>
                  <FieldLabel>Select Student to Appoint *</FieldLabel>
                  <Select
                    value={assignExecStudentId}
                    onChange={(e) => setAssignExecStudentId(e.target.value)}
                  >
                    <option value="">-- Choose student in chapter --</option>
                    {chapterStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.department || "No Dept"} · Year {s.year || "—"}) — {s.email}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel>Designation (Optional free-text label)</FieldLabel>
                  <Input
                    value={assignExecDesignation}
                    onChange={(e) => setAssignExecDesignation(e.target.value)}
                    placeholder="e.g. Vice Chairman, Secretary, Operations Lead"
                  />
                  <p className="mt-1 text-[10px] text-text-mute">
                    Free-text title for display on profiles and leadership directories (does not change permissions).
                  </p>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}

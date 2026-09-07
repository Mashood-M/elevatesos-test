"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { cohortLabel, cohortRepIds } from "@/lib/forms/helpers";
import { canManageClasses, hasPermission, isHqRole } from "@/lib/permissions";
import type { ClassCohort, Department } from "@/types";
import {
  Building2,
  Check,
  Plus,
  Search,
  Sparkles,
  Users,
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
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Biotechnology (BT)",
  "Chemical Engineering (CHE)",
  "Common / First Year",
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
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    canManageClasses(session.roleKey) ||
    hasPermission(store, session.roleKey, "class.manage");

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
      .filter((p) => p.chapterId === chapter.id)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter((p) => p.chapterId === chapter.id)
      .map((p) => {
        const cohort = (store.classCohorts ?? []).find(
          (c) =>
            c.chapterId === chapter.id &&
            cohortRepIds(c).includes(p.id),
        );
        const userRole = (store.userRoles ?? []).find((ur) => ur.userId === p.id);
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

  if (!chapter) {
    return <p className="text-orange">// Chapter not found</p>;
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

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Classes"
        description="Student-led — create departments first, then class divisions and assign 1–2 representatives (any gender; second is optional). Faculty is optional."
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            {canManage ? (
              <Button
                variant="primary"
                onClick={startCreate}
                disabled={!departments.length}
              >
                {showForm && !editingId ? "Close form" : "New class"}
              </Button>
            ) : null}
          </div>
        }
      />

      {!canManage ? (
        <TerminalPanel title="read.only" className="mb-6">
          <p className="text-sm text-text-dim">
            Class lists are managed by chapter executives (Campus Lead, Faculty Coordinator, Secretary,
            Elevates Coordinator). Ask them to add your division.
          </p>
          <Link
            href={`/chapter/${slug}`}
            className="mt-3 inline-block text-[var(--accent)]"
          >
            Back to chapter
          </Link>
        </TerminalPanel>
      ) : null}

      {/* Departments Management Panel */}
      {canManage ? (
        <TerminalPanel
          title="departments"
          meta={`${departments.length} configured`}
          accent="cyan"
          className="mb-6"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-cyan-400" />
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    College Academic Departments
                  </h3>
                  <p className="text-[12px] text-text-dim">
                    Pick from standard college departments or add custom ones. Saved to Supabase for this chapter only.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-xs text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 flex items-center gap-1.5 py-1.5 h-auto"
                onClick={handleAddAllStandardDepts}
              >
                <Sparkles size={13} />
                <span>Add All Standard Depts</span>
              </Button>
            </div>

            {deptError ? (
              <p className="rounded-[8px] bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400 font-medium">
                {deptError}
              </p>
            ) : null}

            {/* Option 1: Select from standard college departments */}
            <div className="rounded-[14px] bg-bg/60 border border-border/60 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] text-cyan-400">
                  1
                </span>
                Select from College Department List (Standard Presets):
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  className="max-w-md text-xs"
                  value={selectedStandardDept}
                  onChange={(e) => setSelectedStandardDept(e.target.value)}
                >
                  <option value="">-- Choose from standard college list --</option>
                  {standardDeptOptions.map((dept) => {
                    const alreadyAdded = departments.some(
                      (d) => d.name.trim().toLowerCase() === dept.trim().toLowerCase(),
                    );
                    return (
                      <option key={dept} value={dept} disabled={alreadyAdded}>
                        {dept} {alreadyAdded ? "(Already added)" : ""}
                      </option>
                    );
                  })}
                </Select>
                <Button
                  variant="primary"
                  onClick={() => handleAddStandardDept(selectedStandardDept)}
                  disabled={!selectedStandardDept}
                  className="text-xs"
                >
                  Add Selected
                </Button>
              </div>

              {/* Quick-add chips */}
              <div className="pt-1">
                <p className="text-[11px] text-text-dim mb-2">
                  Quick-add chips (click to add to your chapter):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {standardDeptOptions.map((dept) => {
                    const isAdded = departments.some(
                      (d) => d.name.trim().toLowerCase() === dept.trim().toLowerCase(),
                    );
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => !isAdded && handleAddStandardDept(dept)}
                        disabled={isAdded}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                          isAdded
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-bg-panel hover:bg-cyan-500/15 text-text-dim hover:text-cyan-300 border border-border/70 hover:border-cyan-500/40 cursor-pointer active:scale-95"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span>{dept}</span>
                            <span className="text-[9px] opacity-75 font-normal">(Added)</span>
                          </>
                        ) : (
                          <>
                            <Plus size={11} className="text-cyan-400" />
                            <span>{dept}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Option 2: Add custom department */}
            <div className="rounded-[14px] bg-bg/60 border border-border/60 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px] text-orange-400">
                  2
                </span>
                Add Other Department (Custom for this chapter only):
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-md text-xs"
                  placeholder="e.g. Biomedical Engineering, Robotics, Architecture..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomDepartment();
                  }}
                />
                <Button
                  variant="orange"
                  onClick={addCustomDepartment}
                  disabled={!newDeptName.trim()}
                  className="text-xs"
                >
                  <Plus size={13} className="mr-1" /> Add Custom Department
                </Button>
              </div>
              <p className="text-[11px] text-text-dim">
                Custom departments added here will be saved to Supabase specifically for this chapter.
              </p>
            </div>

            {/* Configured departments list */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-text mb-2">
                Configured Departments in this Chapter ({departments.length})
              </p>

              {!departments.length ? (
                <div className="rounded-[12px] border border-dashed border-border/70 p-5 text-center text-xs text-text-dim">
                  No departments added yet. Select from the standard list above or add a custom department.
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
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
                        className="flex flex-col justify-between gap-2 rounded-[12px] bg-bg border border-border/70 shadow-[var(--shadow-sm)] p-3"
                      >
                        {renamingId === d.id ? (
                          <div className="flex flex-1 flex-wrap gap-1.5">
                            <Input
                              className="text-xs"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename();
                              }}
                            />
                            <div className="flex gap-1.5 w-full justify-end mt-1">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={saveRename}
                                className="text-xs py-1 h-auto"
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }}
                                className="text-xs py-1 h-auto"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-xs text-text">{d.name}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-text-dim">
                                <span className="rounded bg-bg-panel px-1.5 py-0.5 border border-border/50">
                                  {classCount} {classCount === 1 ? "class" : "classes"}
                                </span>
                                <span className="rounded bg-bg-panel px-1.5 py-0.5 border border-border/50">
                                  {studentCount} {studentCount === 1 ? "student" : "students"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startRename(d)}
                                className="text-[11px] py-1 px-2 h-auto text-text-dim hover:text-text"
                              >
                                Rename
                              </Button>
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={() => removeDepartment(d)}
                                className="text-[11px] py-1 px-2 h-auto"
                              >
                                Delete
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
      ) : null}

      {/* Class Form */}
      {canManage && showForm ? (
        <TerminalPanel
          title={editingId ? "edit.class" : "create.class"}
          accent="orange"
          className="mb-6"
        >
          {!departments.length ? (
            <p className="text-sm text-[var(--accent)]">
              Create a department first.
            </p>
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
                  variant="primary"
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

      {/* Class Cohorts List */}
      <TerminalPanel title="class.list" meta={`${cohorts.length} classes`}>
        {!cohorts.length ? (
          <p className="text-sm text-text-dim">
            No classes yet.
            {canManage
              ? departments.length
                ? " Create first-year T1/T2/T3 and department years."
                : " Add a department above, then create classes."
              : ""}
          </p>
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-bg shadow-[var(--shadow-sm)] p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{cohortLabel(c)}</p>
                    <p className="mt-1 text-[12px] text-text-dim">
                      {names.length
                        ? names.map((n, i) => `Rep ${i + 1}: ${n}`).join(" · ")
                        : "No representatives"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ids.map((_, i) => (
                        <Badge key={i} tone={i === 0 ? "cyan" : "magenta"}>
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
                        variant="orange"
                        onClick={() => remove(c.id, cohortLabel(c))}
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

      {/* Students by Department Panel */}
      <TerminalPanel
        title="students.by_department"
        meta={`${chapterStudents.length} students`}
        accent="magenta"
        className="mt-6"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <Users size={16} className="text-fuchsia-400" />
                Chapter Students Directory by Department
              </h3>
              <p className="text-[12px] text-text-dim">
                Filter and view students in different departments from {chapter.name}.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="pl-8 text-xs"
              />
            </div>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-border/50 pb-3">
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedDeptFilter === "all"
                  ? "bg-text text-bg-page shadow-sm"
                  : "bg-bg text-text-dim hover:text-text border border-border/50"
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-fuchsia-500 text-white shadow-sm"
                      : "bg-bg text-text-dim hover:text-text border border-border/50"
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
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedDeptFilter === "Unassigned"
                    ? "bg-fuchsia-500 text-white shadow-sm"
                    : "bg-bg text-text-dim hover:text-text border border-border/50"
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

          {/* Students List / Table */}
          {!filteredChapterStudents.length ? (
            <div className="rounded-[12px] border border-dashed border-border/70 p-6 text-center text-xs text-text-dim">
              No students found
              {selectedDeptFilter !== "all" ? ` in ${selectedDeptFilter}` : ""}
              {studentSearch ? ` matching "${studentSearch}"` : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-border/60 bg-bg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-dim">
                    <th className="px-3 py-2.5 font-semibold">Student Name</th>
                    <th className="px-3 py-2.5 font-semibold">Contact</th>
                    <th className="px-3 py-2.5 font-semibold">Department</th>
                    <th className="px-3 py-2.5 font-semibold">Year & Division</th>
                    <th className="px-3 py-2.5 font-semibold">Status / Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredChapterStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-bg-panel/40">
                      <td className="px-3 py-2.5 font-medium text-text">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--secondary-soft)] text-[11px] font-bold text-[var(--secondary)]">
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
                      <td className="px-3 py-2.5 text-text-dim">
                        <p>{stu.email}</p>
                        {stu.phone ? (
                          <p className="text-[11px] text-text-dim/80">{stu.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block rounded bg-bg-panel border border-border/60 px-2 py-0.5 text-[11px] font-medium text-text">
                          {stu.department || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-dim">
                        {stu.year ? stu.year : "—"}
                        {stu.section ? ` · Sec ${stu.section}` : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        {stu.cohortLabel ? (
                          <Badge tone="cyan">Rep · {stu.cohortLabel}</Badge>
                        ) : (
                          <span className="text-[11px] text-text-dim capitalize">
                            {stu.roleKey ? stu.roleKey.replace("_", " ") : "student"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TerminalPanel>
    </div>
  );
}

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
import { hasPermission, isHqRole } from "@/lib/permissions";
import type { ClassCohort, Department } from "@/types";

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
    isHqRole(session.roleKey) ||
    hasPermission(store, session.roleKey, "class.manage");

  const yearSuggestions = store.academicYears ?? [];
  const divisionSuggestions = store.academicDivisions ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const [newDeptName, setNewDeptName] = useState("");
  const [deptError, setDeptError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  function addDepartment() {
    setDeptError("");
    if (!chapter) return;
    const created = createDepartment({
      chapterId: chapter.id,
      name: newDeptName,
    });
    if (!created) {
      setDeptError("Could not add — empty or duplicate name.");
      return;
    }
    setNewDeptName("");
    setFlash("Department added");
    window.setTimeout(() => setFlash(""), 1400);
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
            Class lists are managed by chapter executives (Campus Lead, Secretary,
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

      {canManage ? (
        <TerminalPanel
          title="departments"
          meta={`${departments.length} depts`}
          accent="cyan"
          className="mb-6"
        >
          <p className="mb-4 text-[13px] text-text-dim">
            Create departments separately. Classes pick from this list.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="e.g. Common, CSE, ECE"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addDepartment();
              }}
            />
            <Button variant="primary" onClick={addDepartment}>
              Add department
            </Button>
          </div>
          {deptError ? (
            <p className="mb-3 text-sm text-[var(--accent)]">{deptError}</p>
          ) : null}
          {!departments.length ? (
            <p className="text-sm text-text-dim">
              No departments yet — add Common for first-year batches, then CSE /
              ECE / …
            </p>
          ) : (
            <ul className="space-y-2">
              {departments.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-bg shadow-[var(--shadow-sm)] px-3 py-2"
                >
                  {renamingId === d.id ? (
                    <div className="flex flex-1 flex-wrap gap-2">
                      <Input
                        className="max-w-xs"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename();
                        }}
                      />
                      <Button variant="primary" onClick={saveRename}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setRenamingId(null);
                          setRenameValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p className="font-semibold">{d.name}</p>
                  )}
                  {renamingId !== d.id ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => startRename(d)}>
                        Rename
                      </Button>
                      <Button
                        variant="orange"
                        onClick={() => removeDepartment(d)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TerminalPanel>
      ) : null}

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
    </div>
  );
}

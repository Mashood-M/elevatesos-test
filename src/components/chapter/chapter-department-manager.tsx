"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { Building2, Plus, Trash2, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";

interface Props {
  chapterId: string;
}

const DEFAULT_ENGINEERING_DEPTS = [
  "Computer Science & Engineering (CSE)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
];

export function ChapterDepartmentManager({ chapterId }: Props) {
  const { store, createDepartment, deleteDepartment } = useStore();
  const [newDeptName, setNewDeptName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const chapterDepts = (store.departments ?? []).filter(
    (d) => d.chapterId === chapterId
  );

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const name = newDeptName.trim();
    if (!name) {
      setErrorMsg("Please enter a department name.");
      return;
    }

    const created = createDepartment({ chapterId, name });
    if (!created) {
      setErrorMsg("Department already exists in your chapter.");
      return;
    }

    setNewDeptName("");
    setSuccessMsg(`Added department "${name}"`);
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleAddDefaults = () => {
    setErrorMsg("");
    setSuccessMsg("");
    let addedCount = 0;

    DEFAULT_ENGINEERING_DEPTS.forEach((dept) => {
      const created = createDepartment({ chapterId, name: dept });
      if (created) addedCount++;
    });

    if (addedCount > 0) {
      setSuccessMsg(`Added ${addedCount} standard departments.`);
      setTimeout(() => setSuccessMsg(""), 2500);
    } else {
      setErrorMsg("All default departments are already present.");
    }
  };

  const handleDelete = (id: string, name: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const ok = deleteDepartment(id);
    if (!ok) {
      setErrorMsg(`Cannot delete "${name}" because it is currently assigned to a class cohort or student.`);
      return;
    }

    setSuccessMsg(`Removed department "${name}".`);
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <div className="rounded-[18px] border border-border bg-bg-panel p-5 shadow-[var(--shadow-sm)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-orange-500/10 text-orange-400">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-text">College Departments</h3>
            <p className="text-xs text-text-mute">
              Manage departments available for students during chapter onboarding.
            </p>
          </div>
        </div>

        {chapterDepts.length === 0 && (
          <Button
            type="button"
            variant="ghost"
            className="text-xs text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 flex items-center gap-1.5 py-1.5 h-auto"
            onClick={handleAddDefaults}
          >
            <Sparkles size={14} />
            <span>⚡ Load Default Engineering Depts</span>
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-[10px] bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400 font-medium">
          <ShieldAlert size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form to add a department */}
      <form onSubmit={handleAddDept} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="e.g. Computer Science & Engineering (CSE)"
            className="text-xs"
          />
        </div>
        <Button
          type="submit"
          variant="orange"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 shrink-0"
        >
          <Plus size={15} />
          Add Department
        </Button>
      </form>

      {/* List of current departments */}
      <div className="space-y-2 pt-1">
        <FieldLabel>Configured Departments ({chapterDepts.length})</FieldLabel>

        {chapterDepts.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border p-4 text-center">
            <p className="text-xs text-text-mute">
              No departments added yet. Add a department above or click "Load Default Engineering Depts".
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {chapterDepts.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-bg px-3 py-2 text-xs font-medium text-text shadow-sm hover:border-[var(--accent)]/50 transition"
              >
                <span className="truncate">{dept.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(dept.id, dept.name)}
                  className="text-text-mute hover:text-red-400 transition p-1 shrink-0"
                  title="Remove Department"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

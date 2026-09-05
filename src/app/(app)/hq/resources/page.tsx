"use client";

import { useMemo, useState } from "react";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { DEFAULT_RESOURCE_CATEGORIES, resourceCategoryLabel } from "@/lib/resources/categories";
import { cn, formatDateTime } from "@/lib/utils";
import type { Resource } from "@/types";

const TONES = ["cyan", "magenta", "green", "orange"] as const;

function toneForKey(key: string): (typeof TONES)[number] {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h + key.charCodeAt(i) * (i + 1)) % TONES.length;
  return TONES[h] ?? "cyan";
}

type Draft = {
  title: string;
  category: string;
  description: string;
  url: string;
};

function emptyDraft(defaultCategory = "sop"): Draft {
  return {
    title: "",
    category: defaultCategory,
    description: "",
    url: "",
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function HqResourcesPage() {
  const {
    store,
    createResource,
    updateResource,
    deleteResource,
    createResourceCategory,
    deleteResourceCategory,
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const canManage = hasPermission(store, session.roleKey, "resource.upload");

  const categories = useMemo(() => {
    return store.resourceCategories ?? [];
  }, [store.resourceCategories]);

  const labelOf = (key: string) =>
    resourceCategoryLabel(categories, key);

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() =>
    emptyDraft(categories[0]?.key ?? "sop"),
  );
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [catError, setCatError] = useState("");

  const latestUpload = useMemo(() => {
    if (!store.resources.length) return null;
    return store.resources.reduce((a, b) =>
      a.uploadedAt > b.uploadedAt ? a : b,
    );
  }, [store.resources]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.resources
      .filter((r) => {
        if (categoryFilter !== "all" && r.category !== categoryFilter) {
          return false;
        }
        if (!needle) return true;
        return (
          r.title.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle) ||
          labelOf(r.category).toLowerCase().includes(needle)
        );
      })
      .slice()
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [store.resources, q, categoryFilter, categories]);

  const byCategory = useMemo(() => {
    return filtered.reduce<Record<string, Resource[]>>((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {});
  }, [filtered]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1600);
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft(categories[0]?.key ?? "sop"));
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(res: Resource) {
    setEditingId(res.id);
    setDraft({
      title: res.title,
      category: res.category,
      description: res.description,
      url: res.url,
    });
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setDraft(emptyDraft(categories[0]?.key ?? "sop"));
    setFormError("");
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFormError("File must be under 4 MB for demo storage.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDraft((d) => ({
        ...d,
        url: dataUrl,
        title: d.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      setFormError("");
    } catch {
      setFormError("Could not read that file.");
    }
  }

  function saveResource() {
    setFormError("");
    if (!draft.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!draft.url.trim()) {
      setFormError("Add a URL or upload a file.");
      return;
    }
    if (!draft.category) {
      setFormError("Pick or create a category.");
      return;
    }
    if (editingId) {
      const ok = updateResource(editingId, draft);
      if (!ok) {
        setFormError("Could not update resource.");
        return;
      }
      flashMsg("Resource updated");
    } else {
      const created = createResource(draft);
      if (!created) {
        setFormError("Could not create resource.");
        return;
      }
      flashMsg("Resource uploaded");
    }
    closeDialog();
  }

  async function removeResource(res: Resource) {
    const ok = await confirm({
      title: "Delete resource",
      description: `Delete “${res.title}”? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteResource(res.id);
    flashMsg("Resource deleted");
  }

  function saveCategory() {
    setCatError("");
    const created = createResourceCategory(newCatLabel);
    if (!created) {
      setCatError("Could not create — empty or duplicate name.");
      return;
    }
    setDraft((d) => ({ ...d, category: created.key }));
    setCategoryFilter(created.key);
    setNewCatLabel("");
    setCatDialogOpen(false);
    flashMsg(`Category “${created.label}” created`);
  }

  async function removeCategory(key: string) {
    const inUse = store.resources.some((r) => r.category === key);
    if (inUse) {
      flashMsg("Remove or reassign resources first");
      return;
    }
    const cat = categories.find((c) => c.key === key);
    const ok = await confirm({
      title: "Delete category",
      description: `Delete category “${cat?.label ?? key}”?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    if (!deleteResourceCategory(key)) {
      flashMsg("Could not delete category");
      return;
    }
    if (categoryFilter === key) setCategoryFilter("all");
    if (draft.category === key) {
      setDraft((d) => ({ ...d, category: categories[0]?.key ?? "sop" }));
    }
    flashMsg("Category deleted");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Resource Library"
        description="Central HQ asset repository — SOPs, workshop kits, brand packs, and certificate templates for all chapters."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="text-[12px] text-[var(--accent)]">{flash}</span>
            ) : null}
            {canManage ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setNewCatLabel("");
                    setCatError("");
                    setCatDialogOpen(true);
                  }}
                >
                  New category
                </Button>
                <Button type="button" variant="orange" onClick={openCreate}>
                  Upload
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total Assets"
          value={store.resources.length}
          accent="cyan"
        />
        <Stat label="Categories" value={categories.length} accent="magenta" />
        <Stat
          label="Latest Upload"
          value={
            latestUpload ? formatDateTime(latestUpload.uploadedAt) : "—"
          }
          accent="green"
        />
      </div>

      <TerminalPanel
        title="resource.catalog"
        meta={`${filtered.length} shown · ${store.resources.length} total`}
        className="mt-6"
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, description, category…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium",
                categoryFilter === "all"
                  ? "bg-[var(--charcoal-900)] text-white"
                  : "bg-bg text-text-dim hover:bg-bg-hover",
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategoryFilter(c.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  categoryFilter === c.key
                    ? "bg-[var(--charcoal-900)] text-white"
                    : "bg-bg text-text-dim hover:bg-bg-hover",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {canManage && categories.length ? (
          <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
            <span className="mr-1 self-center text-[11px] text-text-mute">
              Manage categories:
            </span>
            {categories.map((c) => {
              const used = store.resources.some((r) => r.category === c.key);
              return (
                <button
                  key={`del-${c.key}`}
                  type="button"
                  disabled={used}
                  title={
                    used
                      ? "In use — reassign resources first"
                      : `Delete ${c.label}`
                  }
                  onClick={() => void removeCategory(c.key)}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-mute hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {c.label} ×
                </button>
              );
            })}
          </div>
        ) : null}

        {!filtered.length ? (
          <p className="py-8 text-center text-[13px] text-text-mute">
            {store.resources.length
              ? "No resources match this search."
              : "No resources yet. Upload the first asset."}
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-mute">
                    {labelOf(category)}
                  </h3>
                  <span className="text-[11px] text-text-mute">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((res) => {
                    const uploader = store.profiles.find(
                      (p) => p.id === res.uploadedBy,
                    );
                    return (
                      <article
                        key={res.id}
                        className="rounded-[14px] border border-border bg-bg p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-text">
                            {res.title}
                          </h3>
                          <Badge tone={toneForKey(res.category)}>
                            {labelOf(res.category)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-[12px] text-text-dim">
                          {res.description}
                        </p>
                        <p className="mt-3 text-[10px] text-text-mute">
                          Uploaded by {uploader?.fullName ?? "Unknown"} ·{" "}
                          {formatDateTime(res.uploadedAt)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={
                              res.url.startsWith("data:")
                                ? res.title
                                : undefined
                            }
                            className="min-w-0 flex-1"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full"
                            >
                              Download
                            </Button>
                          </a>
                          {canManage ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => openEdit(res)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                onClick={() => void removeResource(res)}
                              >
                                Delete
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </TerminalPanel>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingId ? "Edit resource" : "Upload resource"}
        description="Add a public URL or attach a small file (stored as a data URL in this demo)."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Asset name"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <FieldLabel>Category</FieldLabel>
              {canManage ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-[var(--secondary)] hover:underline"
                  onClick={() => {
                    setNewCatLabel("");
                    setCatError("");
                    setCatDialogOpen(true);
                  }}
                >
                  + New category
                </button>
              ) : null}
            </div>
            <Select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  category: e.target.value,
                }))
              }
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextArea
              rows={3}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="What chapters should use this for…"
            />
          </div>
          <div>
            <FieldLabel>File URL</FieldLabel>
            <Input
              value={
                draft.url.startsWith("data:")
                  ? "(uploaded file attached)"
                  : draft.url
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "(uploaded file attached)") return;
                setDraft((d) => ({ ...d, url: v }));
              }}
              placeholder="https://…"
              disabled={draft.url.startsWith("data:")}
            />
            {draft.url.startsWith("data:") ? (
              <button
                type="button"
                className="mt-1 text-[11px] text-[var(--secondary)] hover:underline"
                onClick={() => setDraft((d) => ({ ...d, url: "" }))}
              >
                Clear file / use URL instead
              </button>
            ) : null}
          </div>
          <div>
            <FieldLabel>Or upload file (max 4 MB)</FieldLabel>
            <Input
              type="file"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {formError ? (
            <p className="text-[12px] text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" variant="orange" onClick={saveResource}>
              {editingId ? "Save changes" : "Upload"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        title="New category"
        description="Create a library category for filtering and uploads."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="e.g. Media Kit"
              autoFocus
            />
          </div>
          {catError ? (
            <p className="text-[12px] text-[var(--danger)]">{catError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCatDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="orange" onClick={saveCategory}>
              Create category
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

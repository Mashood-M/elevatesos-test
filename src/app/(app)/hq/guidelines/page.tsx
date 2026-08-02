"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { cn, formatDateTime } from "@/lib/utils";
import type { Guideline, GuidelineStatus } from "@/types";

const CATEGORIES = [
  "Operations",
  "Events",
  "Members",
  "Governance",
  "Brand",
  "Reporting",
] as const;

const STATUSES: GuidelineStatus[] = ["draft", "published", "archived"];

type Draft = {
  title: string;
  category: string;
  version: string;
  summary: string;
  sectionsText: string;
  body: string;
  status: GuidelineStatus;
  relatedHref: string;
};

function emptyDraft(): Draft {
  return {
    title: "",
    category: "Operations",
    version: "v1.0",
    summary: "",
    sectionsText: "",
    body: "",
    status: "draft",
    relatedHref: "",
  };
}

function parseSections(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function statusTone(
  status: GuidelineStatus,
): "mute" | "green" | "orange" | "magenta" {
  if (status === "published") return "green";
  if (status === "draft") return "orange";
  return "mute";
}

export default function HqGuidelinesPage() {
  const {
    store,
    createGuideline,
    updateGuideline,
    deleteGuideline,
  } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const canManage = hasPermission(store, session.roleKey, "org.manage");

  const guidelines = store.guidelines ?? [];
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    for (const g of guidelines) {
      if (g.category.trim()) set.add(g.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [guidelines]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return guidelines
      .filter((g) => {
        if (categoryFilter !== "all" && g.category !== categoryFilter) {
          return false;
        }
        if (!needle) return true;
        return (
          g.title.toLowerCase().includes(needle) ||
          g.summary.toLowerCase().includes(needle) ||
          g.category.toLowerCase().includes(needle)
        );
      })
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [guidelines, q, categoryFilter]);

  const publishedCount = guidelines.filter((g) => g.status === "published").length;

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1600);
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(doc: Guideline) {
    setEditingId(doc.id);
    setDraft({
      title: doc.title,
      category: doc.category,
      version: doc.version,
      summary: doc.summary,
      sectionsText: doc.sections.join("\n"),
      body: doc.body,
      status: doc.status,
      relatedHref: doc.relatedHref ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
  }

  function saveGuideline() {
    setFormError("");
    if (!draft.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!draft.category.trim()) {
      setFormError("Category is required.");
      return;
    }
    if (!draft.body.trim()) {
      setFormError("Document body is required.");
      return;
    }
    const payload = {
      title: draft.title,
      category: draft.category,
      version: draft.version,
      summary: draft.summary,
      sections: parseSections(draft.sectionsText),
      body: draft.body,
      status: draft.status,
      relatedHref: draft.relatedHref.trim() || undefined,
    };
    if (editingId) {
      const ok = updateGuideline(editingId, payload);
      if (!ok) {
        setFormError("Could not update guideline.");
        return;
      }
      flashMsg("Guideline updated");
    } else {
      const created = createGuideline(payload);
      if (!created) {
        setFormError("Could not create guideline.");
        return;
      }
      flashMsg("Guideline created");
    }
    closeDialog();
  }

  async function removeGuideline(doc: Guideline) {
    const ok = await confirm({
      title: "Delete guideline",
      description: `Delete “${doc.title}”? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteGuideline(doc.id);
    flashMsg("Guideline deleted");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Policies & Guidelines"
        description="Operational SOPs, workflows, and governance policies for chapters and HQ. Chapter culture lives in the Playbook."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="text-[12px] text-[var(--accent)]">{flash}</span>
            ) : null}
            <Link href="/hq/playbook">
              <Button type="button" variant="ghost">
                Open playbook
              </Button>
            </Link>
            {canManage ? (
              <Button type="button" variant="orange" onClick={openCreate}>
                New guideline
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total" value={guidelines.length} accent="cyan" />
        <Stat label="Published" value={publishedCount} accent="green" />
        <Stat label="Categories" value={categories.length} accent="magenta" />
      </div>

      <TerminalPanel
        title="Policy library"
        meta={`${filtered.length} shown · ${guidelines.length} total`}
        className="mt-6"
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, summary, category…"
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
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  categoryFilter === c
                    ? "bg-[var(--charcoal-900)] text-white"
                    : "bg-bg text-text-dim hover:bg-bg-hover",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {!filtered.length ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-text-mute">
              {guidelines.length
                ? "No guidelines match this search."
                : "No guidelines yet. Create the first policy document."}
            </p>
            {canManage && !guidelines.length ? (
              <Button
                type="button"
                variant="orange"
                className="mt-3"
                onClick={openCreate}
              >
                New guideline
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((doc) => (
              <article
                key={doc.id}
                className="rounded-[var(--radius)] border border-border bg-bg p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em] text-text">
                    {doc.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="cyan">{doc.category}</Badge>
                    <Badge tone="mute">{doc.version}</Badge>
                    <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-text-dim">{doc.summary}</p>
                {doc.sections.length ? (
                  <ul className="mt-4 space-y-1 border-t border-border pt-3 text-[12px] text-text-mute">
                    {doc.sections.map((s) => (
                      <li key={s}>— {s}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 text-[11px] text-text-mute">
                  Updated {formatDateTime(doc.updatedAt)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/hq/guidelines/${doc.id}`}>
                    <Button type="button" variant="primary">
                      Read document
                    </Button>
                  </Link>
                  {doc.relatedHref ? (
                    <Link href={doc.relatedHref}>
                      <Button type="button" variant="ghost">
                        {doc.relatedHref === "/hq/brand"
                          ? "Open brand kit"
                          : "Related"}
                      </Button>
                    </Link>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openEdit(doc)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => void removeGuideline(doc)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </TerminalPanel>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingId ? "Edit guideline" : "New guideline"}
        description="Policy document for HQ and chapter reference."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Chapter Onboarding SOP"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Input
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, category: e.target.value }))
                }
                list="guideline-categories"
                placeholder="Operations"
              />
              <datalist id="guideline-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <FieldLabel>Version</FieldLabel>
              <Input
                value={draft.version}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, version: e.target.value }))
                }
                placeholder="v1.0"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as GuidelineStatus,
                }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Summary</FieldLabel>
            <TextArea
              value={draft.summary}
              onChange={(e) =>
                setDraft((d) => ({ ...d, summary: e.target.value }))
              }
              placeholder="One-line overview for the card."
              rows={2}
            />
          </div>
          <div>
            <FieldLabel>Sections (one per line)</FieldLabel>
            <TextArea
              value={draft.sectionsText}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sectionsText: e.target.value }))
              }
              placeholder={"Student-led launch\nCluster setup"}
              rows={3}
            />
          </div>
          <div>
            <FieldLabel>Body</FieldLabel>
            <TextArea
              value={draft.body}
              onChange={(e) =>
                setDraft((d) => ({ ...d, body: e.target.value }))
              }
              placeholder="Full policy text…"
              rows={8}
            />
          </div>
          <div>
            <FieldLabel>Related link (optional)</FieldLabel>
            <Input
              value={draft.relatedHref}
              onChange={(e) =>
                setDraft((d) => ({ ...d, relatedHref: e.target.value }))
              }
              placeholder="/hq/brand"
            />
          </div>
          {formError ? (
            <p className="text-[12px] text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={saveGuideline}>
              {editingId ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

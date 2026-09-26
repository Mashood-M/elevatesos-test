"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Plus,
  Search,
  X,
  FileText,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  BarChart2,
} from "lucide-react";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole } from "@/lib/access";
import { findChapterBySlugOrId } from "@/lib/chapters";
import {
  createFormFromTemplate,
  FORM_TEMPLATES,
  type FormTemplateId,
} from "@/lib/forms/templates";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "open" | "draft" | "closed";

export default function ChapterFormsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { store, createForm, deleteForm, duplicateForm } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = findChapterBySlugOrId(store.chapters, slug);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<FormTemplateId>("event_registration");
  const [attachEventId, setAttachEventId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  const canManage =
    isHqRole(session.roleKey) || isExecutiveRole(session.roleKey);

  const chapterEvents = useMemo(() => {
    if (!chapter) return [];
    return store.events.filter((e) => e.chapterId === chapter.id);
  }, [store.events, chapter]);

  const chapterForms = useMemo(() => {
    if (!chapter) return [];
    return [...(store.forms ?? []).filter((f) => f.chapterId === chapter.id)].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [store.forms, chapter]);

  const forms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapterForms
      .filter((f) => (status === "all" ? true : f.status === status))
      .filter((f) =>
        !q
          ? true
          : f.title.toLowerCase().includes(q) ||
            f.purpose.toLowerCase().includes(q),
      );
  }, [chapterForms, search, status]);

  const counts = useMemo(
    () => ({
      all: chapterForms.length,
      open: chapterForms.filter((f) => f.status === "open").length,
      draft: chapterForms.filter((f) => f.status === "draft").length,
      closed: chapterForms.filter((f) => f.status === "closed").length,
    }),
    [chapterForms],
  );

  const totalResponses = useMemo(() => {
    const formIds = new Set(chapterForms.map((f) => f.id));
    return (store.formResponses ?? []).filter((r) => formIds.has(r.formId)).length;
  }, [chapterForms, store.formResponses]);

  const linkedEventsCount = useMemo(() => {
    return chapterForms.filter((f) => f.eventId).length;
  }, [chapterForms]);

  const formTemplates = store.formTemplates ?? [];
  const stripTemplates = formTemplates.filter((t) => t.id !== "blank");
  const template = formTemplates.find((t) => t.id === selectedTemplate);

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-text">Chapter not found</p>
      </div>
    );
  }

  if (session.roleKey === "class_representative") {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-text">Forms restricted</p>
        <p className="mt-1 text-xs text-text-dim">
          Class Representatives manage class attendance and records, but do not manage chapter forms.
        </p>
        <Link
          href={`/chapter/${slug}`}
          className="mt-3 inline-block text-[var(--accent)] text-sm font-semibold hover:underline"
        >
          ← Back to Chapter
        </Link>
      </div>
    );
  }

  function openPicker() {
    setSelectedTemplate("event_registration");
    setAttachEventId("");
    setCustomTitle("");
    setPickerOpen(true);
  }

  function createAndOpen(templateId: FormTemplateId, title?: string) {
    const draft = createFormFromTemplate(templateId, chapter!.id, {
      title: title || undefined,
      templates: formTemplates,
    });
    const created = createForm(draft);
    router.push(`/chapter/${slug}/forms/${created.id}`);
  }

  function handleCreateFromTemplate() {
    const draft = createFormFromTemplate(selectedTemplate, chapter!.id, {
      eventId: attachEventId || undefined,
      title: customTitle || undefined,
      templates: formTemplates,
    });
    const created = createForm(draft);
    setPickerOpen(false);
    router.push(`/chapter/${slug}/forms/${created.id}`);
  }

  function handleBlank() {
    createAndOpen("blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Forms Hub"
        description="Dynamic forms for registrations, surveys, attendance check-in, and feedback packs linked directly to your events."
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                onClick={openPicker}
                className="border border-border/70 hover:bg-bg-panel text-xs sm:text-sm"
              >
                Template Gallery
              </Button>
              <Button
                variant="orange"
                onClick={handleBlank}
                className="gap-1.5 shadow-sm text-xs sm:text-sm"
              >
                <Plus size={15} />
                Create Form
              </Button>
            </div>
          ) : null
        }
      />

      {/* High-Level Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Forms"
          value={chapterForms.length}
          hint="Created forms in chapter"
        />
        <Stat
          label="Open Submissions"
          value={counts.open}
          hint="Active & accepting"
          accent="orange"
        />
        <Stat
          label="Responses Logged"
          value={totalResponses}
          hint="Student submissions"
        />
        <Stat
          label="Linked Events"
          value={linkedEventsCount}
          hint="Integrated with programs"
        />
      </div>

      {/* Quick Template Strip */}
      {canManage && (
        <section className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--accent)]" />
              <h2 className="font-[family-name:var(--font-display)] text-sm sm:text-[15px] font-bold tracking-[-0.02em] text-text">
                Start a New Form
              </h2>
            </div>
            <button
              type="button"
              onClick={openPicker}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Browse all templates →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Blank Form Starter */}
            <button
              type="button"
              onClick={handleBlank}
              className="group flex flex-col items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-border/90 bg-bg/50 p-4 text-center transition-all hover:border-[var(--accent)] hover:bg-bg-panel hover:shadow-xs"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] group-hover:scale-110 transition-transform">
                <Plus size={20} />
              </div>
              <p className="mt-2.5 text-xs font-bold text-text">Blank Form</p>
              <p className="mt-0.5 text-[10px] text-text-dim">Create custom questions</p>
            </button>

            {/* Template Presets */}
            {stripTemplates.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => createAndOpen(t.id)}
                className="group flex flex-col justify-between rounded-[var(--radius-sm)] border border-border/70 bg-bg/70 p-3.5 text-left transition-all hover:border-border hover:bg-bg hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-border/40 text-text-dim group-hover:text-[var(--accent)] transition-colors">
                      <FileText size={13} />
                    </span>
                    <Badge tone="mute" className="text-[9px] px-1.5 py-0">
                      {t.purpose}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-bold text-text truncate">{t.name}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim line-clamp-2">
                    {t.description}
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-semibold text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Use template →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main Forms Workspace */}
      <section className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow-sm)]">
        {/* Search and Filters Bar */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms by title or purpose..."
              className="pl-9 pr-8 h-9.5 rounded-[var(--radius-sm)] bg-bg border-border/70 text-xs sm:text-sm"
              aria-label="Search forms"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-1"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills with Counts */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["draft", "Draft"],
                ["closed", "Closed"],
              ] as const
            )
              .filter(
                ([key]) =>
                  key !== "draft" ||
                  session.roleKey === "campus_lead" ||
                  isHqRole(session.roleKey),
              )
              .map(([key, label]) => {
                const isActive = status === key;
                const count = counts[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "bg-text text-bg shadow-sm"
                        : "bg-bg border border-border/70 text-text-dim hover:text-text hover:border-border",
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
                        isActive
                          ? "bg-bg/20 text-bg"
                          : "bg-border/60 text-text-dim",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Forms Grid */}
        {chapterForms.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border/40 text-text-dim mb-3">
              <FileText size={22} />
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
              No forms created yet
            </h4>
            <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
              {canManage
                ? "Start by selecting a template or create a custom registration form for your upcoming chapter events."
                : "No forms currently active for your chapter."}
            </p>
            {canManage && (
              <Button
                variant="orange"
                className="mt-4 gap-1.5 text-xs font-semibold"
                onClick={openPicker}
              >
                <Plus size={14} />
                Open Template Gallery
              </Button>
            )}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-12 text-center">
            <p className="text-sm font-semibold text-text">No matching forms found</p>
            <p className="mt-1 text-xs text-text-dim">
              Try adjusting your search query or selecting a different status filter.
            </p>
            <Button
              variant="ghost"
              className="mt-3 text-xs border border-border/70 hover:bg-bg"
              onClick={() => {
                setStatus("all");
                setSearch("");
              }}
            >
              Clear Filters & Search
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forms.map((form) => {
              const event = form.eventId
                ? store.events.find((e) => e.id === form.eventId)
                : undefined;
              const count = (store.formResponses ?? []).filter(
                (r) => r.formId === form.id,
              ).length;
              const updated = new Date(form.updatedAt).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" },
              );

              return (
                <article
                  key={form.id}
                  className="group relative flex flex-col justify-between rounded-[var(--radius)] border border-border/70 bg-bg p-4 shadow-[var(--shadow-sm)] hover:border-border hover:shadow-[var(--shadow)] transition-all"
                >
                  <div>
                    {/* Card Top Row: Purpose & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        tone={
                          form.status === "open"
                            ? "green"
                            : form.status === "closed"
                              ? "mute"
                              : "orange"
                        }
                        className="text-[10px] font-semibold"
                      >
                        {form.status === "open" ? "Active" : form.status}
                      </Badge>
                      <span className="text-[11px] text-text-dim font-mono">{updated}</span>
                    </div>

                    {/* Title */}
                    <Link
                      href={`/chapter/${slug}/forms/${form.id}`}
                      className="mt-2.5 block group-hover:text-[var(--accent)] transition-colors"
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.02em] text-text line-clamp-1">
                        {form.title}
                      </h3>
                    </Link>

                    {/* Metadata: Responses & Event */}
                    <div className="mt-3 flex flex-col gap-1.5 text-xs text-text-dim">
                      <div className="flex items-center gap-1.5 font-medium">
                        <BarChart2 size={13} className="text-text-dim" />
                        <span>{count} response{count === 1 ? "" : "s"} collected</span>
                      </div>
                      {event ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-text-dim truncate">
                          <Calendar size={12} className="text-[var(--accent)] shrink-0" />
                          <span className="truncate">Linked: {event.title}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-mute">Standalone form</span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/chapter/${slug}/forms/${form.id}`}
                      className="text-xs font-semibold text-text hover:text-[var(--accent)] transition-colors"
                    >
                      Open Editor
                    </Link>
                    <div className="flex items-center gap-1">
                      {form.status === "open" && (
                        <Link href={`/chapter/${slug}/forms/${form.id}/fill`}>
                          <Button
                            variant="ghost"
                            className="h-7 px-2 text-[11px] border border-border/60 hover:bg-bg-panel"
                            title="Preview submission form"
                          >
                            Fill
                          </Button>
                        </Link>
                      )}
                      {canManage && (
                        <div className="relative">
                          <button
                            type="button"
                            className="rounded-full p-1 text-text-dim hover:bg-bg-panel hover:text-text transition-colors"
                            aria-label="More actions"
                            onClick={() =>
                              setMenuId((id) => (id === form.id ? null : form.id))
                            }
                          >
                            <MoreVertical size={15} />
                          </button>
                          {menuId === form.id && (
                            <div className="absolute right-0 bottom-full mb-1 z-30 w-36 overflow-hidden rounded-[var(--radius-sm)] bg-bg-panel py-1 shadow-[var(--shadow)] ring-1 ring-border">
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-bg transition-colors"
                                onClick={() => {
                                  const copy = duplicateForm(form.id);
                                  setMenuId(null);
                                  if (copy) {
                                    router.push(`/chapter/${slug}/forms/${copy.id}`);
                                  }
                                }}
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-bg transition-colors"
                                onClick={() => {
                                  setMenuId(null);
                                  void (async () => {
                                    const ok = await confirm({
                                      title: "Delete form",
                                      description: `Are you sure you want to delete “${form.title}”? All responses will be permanently removed.`,
                                      confirmLabel: "Delete Form",
                                      danger: true,
                                    });
                                    if (ok) deleteForm(form.id);
                                  })();
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Template Gallery Dialog */}
      <Dialog
        open={pickerOpen && canManage}
        onClose={() => setPickerOpen(false)}
        title="Template Gallery"
        description="Choose a pre-configured template tailored for campus events, student feedback, or lead applications."
        className="max-w-2xl"
      >
        <div className="grid max-h-[min(50vh,420px)] gap-2.5 overflow-y-auto sm:grid-cols-2 pr-1">
          {formTemplates.map((t) => {
            const active = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  "rounded-[var(--radius-sm)] border p-3.5 text-left transition-all",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-2xs"
                    : "border-border/80 bg-bg hover:bg-bg-hover hover:border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-text">{t.name}</p>
                  <Badge tone={active ? "orange" : "mute"} className="text-[9px]">
                    {t.purpose}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-text-dim">
                  {t.description}
                </p>
                <ul className="mt-2.5 space-y-1 text-[11px] text-text-mute border-t border-border/50 pt-2">
                  {t.previewQuestions.slice(0, 3).map((q) => (
                    <li key={q} className="truncate">· {q}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3 border-t border-border/80 pt-4">
          <div>
            <FieldLabel>Custom Title (optional)</FieldLabel>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={template?.name ?? "Form title"}
              className="text-xs sm:text-sm h-9.5 rounded-[var(--radius-sm)]"
            />
          </div>
          {template?.suggestEvent && (
            <div>
              <FieldLabel>Link to Event (optional)</FieldLabel>
              <Select
                value={attachEventId}
                onChange={(e) => setAttachEventId(e.target.value)}
                className="text-xs sm:text-sm h-9.5 rounded-[var(--radius-sm)]"
              >
                <option value="">Standalone — attach to event later</option>
                {chapterEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/80 pt-4">
          <Button variant="ghost" onClick={() => setPickerOpen(false)}>
            Cancel
          </Button>
          <Button variant="orange" onClick={handleCreateFromTemplate} className="font-bold">
            Create From Template
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

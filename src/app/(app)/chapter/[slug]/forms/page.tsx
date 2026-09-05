"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Plus } from "lucide-react";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole } from "@/lib/access";
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
  const chapter = store.chapters.find((c) => c.slug === slug);
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

  const formTemplates = store.formTemplates ?? [];
  const stripTemplates = formTemplates.filter((t) => t.id !== "blank");
  const template = formTemplates.find((t) => t.id === selectedTemplate);

  if (!chapter) {
    return <p className="text-orange">Chapter not found</p>;
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
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Forms"
        description="Campus form packs for registration, feedback, and chapter surveys — linked to your events when you need them."
      />

      {canManage ? (
        <section className="-mx-4 mb-8 bg-[color-mix(in_srgb,var(--bg)_92%,var(--charcoal-900))] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.02em]">
              Start a new form
            </h2>
            <button
              type="button"
              onClick={openPicker}
              className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
            >
              Template gallery
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={handleBlank}
              className="flex w-[160px] shrink-0 flex-col overflow-hidden rounded-[14px] bg-bg-panel shadow-[var(--shadow-sm)] ring-1 ring-border transition hover:shadow-[var(--shadow)]"
            >
              <div className="flex h-[110px] items-center justify-center bg-bg">
                <Plus size={36} className="text-[var(--accent)]" strokeWidth={1.5} />
              </div>
              <div className="px-3 py-2.5 text-left">
                <p className="truncate text-[13px] font-semibold">Blank form</p>
              </div>
            </button>
            {stripTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => createAndOpen(t.id)}
                className="flex w-[160px] shrink-0 flex-col overflow-hidden rounded-[14px] bg-bg-panel text-left shadow-[var(--shadow-sm)] ring-1 ring-border transition hover:shadow-[var(--shadow)]"
              >
                <div className="flex h-[110px] flex-col justify-end gap-1.5 overflow-hidden bg-bg px-3 py-3">
                  {t.previewQuestions.slice(0, 2).map((q) => (
                    <div
                      key={q}
                      className="truncate rounded-sm bg-bg-panel px-1.5 py-0.5 text-[9px] leading-tight text-text-mute shadow-[var(--shadow-sm)]"
                    >
                      {q}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 px-3 py-2.5">
                  <p className="truncate text-[13px] font-semibold">{t.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.02em]">
            Recent forms
          </h2>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search forms"
                aria-label="Search forms"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium",
                      status === key
                        ? "bg-[var(--charcoal-900)] text-white"
                        : "bg-bg text-text-dim hover:bg-bg-hover",
                    )}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {chapterForms.length === 0 ? (
          <div className="rounded-[var(--radius)] bg-bg-panel px-6 py-12 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-text-dim">
              {canManage
                ? "No forms yet — pick a template above or open the gallery."
                : "No forms for you right now."}
            </p>
            {canManage ? (
              <Button variant="orange" className="mt-4" onClick={openPicker}>
                Template gallery
              </Button>
            ) : null}
          </div>
        ) : !forms.length ? (
          <div className="rounded-[var(--radius)] bg-bg-panel px-6 py-12 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-text-dim">
              No forms match. Try clearing search or another status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("all");
                setSearch("");
              }}
              className="mt-3 text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
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
              const previewQs = form.questions
                .filter((q) => q.type !== "section_header")
                .slice(0, 3);
              const updated = new Date(form.updatedAt).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" },
              );
              return (
                <article
                  key={form.id}
                  className={cn(
                    "group relative flex flex-col rounded-[14px] bg-bg-panel shadow-[var(--shadow-sm)] ring-1 ring-border transition hover:ring-[var(--accent)] hover:shadow-[var(--shadow)]",
                    menuId === form.id && "z-30",
                  )}
                >
                  <Link
                    href={`/chapter/${slug}/forms/${form.id}`}
                    className="block overflow-hidden rounded-t-[14px]"
                  >
                    <div className="flex h-[140px] flex-col justify-end gap-1.5 overflow-hidden bg-bg px-4 py-4">
                      {previewQs.length ? (
                        previewQs.map((q) => (
                          <div
                            key={q.id}
                            className="truncate rounded-sm bg-bg-panel px-2 py-1 text-[10px] text-text-mute shadow-[var(--shadow-sm)]"
                          >
                            {q.title || "Untitled"}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-text-mute">
                          No questions yet
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="relative min-w-0 border-t border-border/80 px-3 py-3.5 pr-10">
                    <Link
                      href={`/chapter/${slug}/forms/${form.id}`}
                      className="block min-w-0"
                    >
                      <p className="truncate font-[family-name:var(--font-display)] text-[14px] font-bold tracking-[-0.02em] hover:text-[var(--accent)]">
                        {form.title}
                      </p>
                    </Link>
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          form.status === "open"
                            ? "orange"
                            : form.status === "closed"
                              ? "mute"
                              : "green"
                        }
                      >
                        {form.status}
                      </Badge>
                      <span className="text-[11px] text-text-mute">
                        {updated}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[11px] text-text-mute">
                      {count} response{count === 1 ? "" : "s"}
                      {" · "}
                      {event ? `Linked · ${event.title}` : "Standalone"}
                    </p>

                    {canManage || form.status === "open" ? (
                      <div className="absolute right-2 top-2">
                        <button
                          type="button"
                          className="rounded-full p-1.5 text-text-mute hover:bg-bg hover:text-text"
                          aria-label="Form actions"
                          onClick={() =>
                            setMenuId((id) =>
                              id === form.id ? null : form.id,
                            )
                          }
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuId === form.id ? (
                          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-[12px] bg-bg-panel py-1 shadow-[var(--shadow)] ring-1 ring-border">
                            <Link
                              href={`/chapter/${slug}/forms/${form.id}`}
                              className="block px-3 py-2 text-[12px] hover:bg-bg"
                              onClick={() => setMenuId(null)}
                            >
                              Open
                            </Link>
                            {form.status === "open" ? (
                              <Link
                                href={`/chapter/${slug}/forms/${form.id}/fill`}
                                className="block px-3 py-2 text-[12px] hover:bg-bg"
                                onClick={() => setMenuId(null)}
                              >
                                Fill
                              </Link>
                            ) : null}
                            {canManage ? (
                              <>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-[12px] hover:bg-bg"
                                  onClick={() => {
                                    const copy = duplicateForm(form.id);
                                    setMenuId(null);
                                    if (copy) {
                                      router.push(
                                        `/chapter/${slug}/forms/${copy.id}`,
                                      );
                                    }
                                  }}
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-[12px] text-[var(--danger)] hover:bg-bg"
                                  onClick={() => {
                                    setMenuId(null);
                                    void (async () => {
                                      const ok = await confirm({
                                        title: "Delete form",
                                        description: `Delete “${form.title}”?`,
                                        confirmLabel: "Delete",
                                        danger: true,
                                      });
                                      if (ok) deleteForm(form.id);
                                    })();
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={pickerOpen && canManage}
        onClose={() => setPickerOpen(false)}
        title="Template gallery"
        description="Campus packs for registration, feedback, and chapter ops — blank if you want to invent."
        className="max-w-2xl"
      >
        <div className="grid max-h-[min(50vh,420px)] gap-2 overflow-y-auto sm:grid-cols-2">
          {formTemplates.map((t) => {
            const active = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  "rounded-[14px] border px-3 py-3 text-left transition",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-border bg-bg hover:bg-bg-hover",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold">{t.name}</p>
                  <Badge tone={active ? "orange" : "mute"}>{t.purpose}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-text-dim">
                  {t.description}
                </p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-text-mute">
                  {t.previewQuestions.slice(0, 3).map((q) => (
                    <li key={q}>· {q}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>Title (optional)</FieldLabel>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={template?.name ?? "Form title"}
            />
          </div>
          {template?.suggestEvent ? (
            <div className="sm:col-span-2">
              <FieldLabel>Link to event (optional)</FieldLabel>
              <Select
                value={attachEventId}
                onChange={(e) => setAttachEventId(e.target.value)}
              >
                <option value="">Standalone — attach later</option>
                {chapterEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setPickerOpen(false)}>
            Cancel
          </Button>
          <Button variant="orange" onClick={handleCreateFromTemplate}>
            Use template
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

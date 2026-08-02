"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Maximize2, Minimize2 } from "lucide-react";
import { FormFill } from "@/components/domain/form-fill";
import { FormResponses } from "@/components/domain/form-responses";
import { FormSharePanel } from "@/components/domain/form-share-panel";
import { FormSummary } from "@/components/domain/form-summary";
import { GoogleFormBuilder as FormBuilder } from "@/components/domain/google-form-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isExecutiveRole, isFacultyRole } from "@/lib/access";
import { migrateForm } from "@/lib/forms/helpers";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Tab = "questions" | "responses" | "preview";
type ResponsesSub = "summary" | "individual";

export default function FormWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = use(params);
  const { store, setFormStatus } = useStore();
  const { session } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("questions");
  const [responsesSub, setResponsesSub] = useState<ResponsesSub>("summary");
  const [sendOpen, setSendOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const chapter = store.chapters.find((c) => c.slug === slug);
  const raw = store.forms?.find((f) => f.id === formId);
  const form = raw ? migrateForm(raw) : null;

  const canManage =
    isHqRole(session.roleKey) || isExecutiveRole(session.roleKey);
  const canViewResponses =
    canManage || isFacultyRole(session.roleKey);

  if (!chapter || !form || form.chapterId !== chapter.id) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Form not found</p>
        <Link
          href={`/chapter/${slug}/forms`}
          className="mt-2 inline-block text-[var(--accent)]"
        >
          Back to forms
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; managerOnly?: boolean }[] = [
    { id: "questions", label: "Questions", managerOnly: true },
    { id: "responses", label: "Responses", managerOnly: true },
    { id: "preview", label: "Preview" },
  ];

  const visibleTabs = tabs.filter(
    (t) =>
      !t.managerOnly ||
      (t.id === "questions" ? canManage : canViewResponses),
  );
  const activeTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : (visibleTabs[0]?.id ?? "preview");

  const responseCount = (store.formResponses ?? []).filter(
    (r) => r.formId === form.id,
  ).length;

  const event = form.eventId
    ? store.events.find((e) => e.id === form.eventId)
    : undefined;

  const shell = (
    <div
      className={cn(
        fullscreen &&
          "fixed inset-0 z-[var(--z-modal)] overflow-y-auto bg-bg px-4 pb-16 sm:px-6",
      )}
    >
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title={form.title}
        description={
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  form.status === "open"
                    ? "orange"
                    : form.status === "closed"
                      ? "mute"
                      : "green"
                }
              >
                {form.status === "open" ? "Accepting" : form.status}
              </Badge>
              <span>
                {form.purpose} form
                {event ? ` · ${event.title}` : ""}
              </span>
            </div>
            {form.description?.trim() ? (
              <p className="text-[14px] leading-relaxed text-text-dim">
                {form.description.trim()}
              </p>
            ) : null}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-text-dim">
              {!fullscreen ? (
                <Link
                  href={`/chapter/${slug}/forms`}
                  className="hover:text-[var(--accent)]"
                >
                  ← Forms
                </Link>
              ) : null}
              {event && !fullscreen ? (
                <Link
                  href={`/chapter/${slug}/events/${event.id}`}
                  className="hover:text-[var(--accent)]"
                >
                  Event
                </Link>
              ) : null}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-text-dim hover:bg-bg hover:text-text"
                onClick={() => setFullscreen((v) => !v)}
                aria-pressed={fullscreen}
                aria-label={
                  fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"
                }
                title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              >
                {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <Button
                  variant="primary"
                  className="h-9"
                  onClick={() =>
                    setFormStatus(
                      form.id,
                      form.status === "open" ? "closed" : "open",
                    )
                  }
                >
                  {form.status === "open"
                    ? "Stop accepting"
                    : "Accept responses"}
                </Button>
              ) : null}
              <Button
                variant="orange"
                className="h-9"
                disabled={form.status !== "open"}
                onClick={() => setSendOpen(true)}
              >
                Send
              </Button>
            </div>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-medium",
              activeTab === t.id
                ? "bg-[var(--charcoal-900)] text-white"
                : "bg-bg text-text-dim hover:bg-bg-hover",
            )}
          >
            {t.label}
            {t.id === "responses" ? ` (${responseCount})` : ""}
          </button>
        ))}
      </div>

      {form.status === "draft" && canManage && activeTab === "questions" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-bg-panel px-4 py-3 text-[13px] shadow-[var(--shadow-sm)]">
          <p className="text-text-dim">
            Draft — open the form when you are ready to collect responses.
          </p>
          <Button
            variant="orange"
            className="h-8"
            onClick={() => setFormStatus(form.id, "open")}
          >
            Accept responses
          </Button>
        </div>
      ) : null}

      {activeTab === "questions" && canManage ? (
        <FormBuilder form={form} chapterId={chapter.id} />
      ) : null}

      {activeTab === "responses" && canViewResponses ? (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(
              [
                ["summary", "Summary"],
                ["individual", "Individual"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setResponsesSub(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  responsesSub === id
                    ? "bg-[var(--charcoal-900)] text-white"
                    : "bg-bg text-text-dim hover:bg-bg-hover",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {responsesSub === "summary" ? (
            <FormSummary form={form} />
          ) : (
            <FormResponses form={form} canManage={canManage} />
          )}
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="py-1">
          <FormFill form={form} preview />
        </div>
      ) : null}

      <Dialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send form"
        description={
          form.status === "open"
            ? "Share the public link or QR with your campus."
            : "Open the form (Accept responses) before sharing."
        }
        className="max-w-lg"
      >
        {form.status === "open" ? (
          <FormSharePanel formId={form.id} title={form.title} />
        ) : (
          <Button
            variant="orange"
            onClick={() => {
              setFormStatus(form.id, "open");
            }}
          >
            Accept responses first
          </Button>
        )}
        {form.status === "open" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/f/${form.id}`} target="_blank">
              <Button variant="ghost">Open public fill</Button>
            </Link>
            <Link href={`/chapter/${slug}/forms/${form.id}/fill`}>
              <Button variant="ghost">In-app fill</Button>
            </Link>
          </div>
        ) : null}
      </Dialog>
    </div>
  );

  return shell;
}

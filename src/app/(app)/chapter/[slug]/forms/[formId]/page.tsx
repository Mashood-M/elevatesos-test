"use client";

import { use, useState } from "react";
import Link from "next/link";
import { FormFill } from "@/components/domain/form-fill";
import { FormResponses } from "@/components/domain/form-responses";
import { FormSharePanel } from "@/components/domain/form-share-panel";
import { FormSummary } from "@/components/domain/form-summary";
import { GoogleFormBuilder } from "@/components/domain/google-form-builder";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { migrateForm } from "@/lib/forms/helpers";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Tab = "questions" | "responses" | "summary" | "preview";

export default function FormWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("questions");

  const chapter = store.chapters.find((c) => c.slug === slug);
  const raw = store.forms?.find((f) => f.id === formId);
  const form = raw ? migrateForm(raw) : null;

  const canManage =
    isHqRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    isExecutiveRole(session.roleKey);

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
    { id: "summary", label: "Summary", managerOnly: true },
    { id: "preview", label: "Preview" },
  ];

  const visibleTabs = tabs.filter((t) => canManage || !t.managerOnly);
  const activeTab =
    visibleTabs.some((t) => t.id === tab) ? tab : "preview";

  return (
    <div>
      <PageHeader
        title={form.title}
        description={form.description || `${form.purpose} · ${form.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/forms`}>
              <Button variant="ghost">All forms</Button>
            </Link>
            {form.eventId ? (
              <Link href={`/chapter/${slug}/events/${form.eventId}`}>
                <Button variant="ghost">Event</Button>
              </Link>
            ) : null}
            {form.status === "open" ? (
              <>
                <Link href={`/f/${form.id}`}>
                  <Button variant="orange">Public fill</Button>
                </Link>
                <Link href={`/chapter/${slug}/forms/${form.id}/fill`}>
                  <Button variant="ghost">In-app fill</Button>
                </Link>
              </>
            ) : null}
          </div>
        }
      />

      {form.status === "open" ? (
        <div className="mb-6">
          <FormSharePanel formId={form.id} title={form.title} />
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-[var(--radius-sm)] border px-3 py-1.5 text-[12px] transition",
              activeTab === t.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-border text-text-dim hover:border-[var(--border-strong)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "questions" && canManage ? (
        <GoogleFormBuilder form={form} chapterId={chapter.id} />
      ) : null}
      {activeTab === "responses" && canManage ? (
        <FormResponses form={form} canManage={canManage} />
      ) : null}
      {activeTab === "summary" && canManage ? (
        <FormSummary form={form} />
      ) : null}
      {activeTab === "preview" ? <FormFill form={form} preview /> : null}
    </div>
  );
}

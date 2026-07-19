"use client";

import { use } from "react";
import Link from "next/link";
import { FormFill } from "@/components/domain/form-fill";
import { useStore } from "@/context/store-context";
import { migrateForm } from "@/lib/forms/helpers";

export default function PublicFormFillPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const { store } = useStore();
  const raw = store.forms?.find((f) => f.id === formId);
  const form = raw ? migrateForm(raw) : null;
  const chapter = form
    ? store.chapters.find((c) => c.id === form.chapterId)
    : undefined;

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan">
            Elevates
          </p>
          <p className="mt-1 text-[12px] text-text-dim">
            {chapter?.name ?? "Chapter form"}
          </p>
        </header>

        {!form ? (
          <div className="rounded-[var(--radius)] border border-border p-8 text-center">
            <p className="font-semibold">Form not found</p>
            <p className="mt-2 text-sm text-text-dim">
              This share link is invalid or the form was removed.
            </p>
            <Link href="/login" className="mt-4 inline-block text-[var(--accent)]">
              Go to Elevates OS
            </Link>
          </div>
        ) : form.status !== "open" ? (
          <div className="rounded-[var(--radius)] border border-border p-8 text-center">
            <p className="font-semibold">{form.title}</p>
            <p className="mt-2 text-sm text-text-dim">
              This form is {form.status} and is not accepting responses.
            </p>
          </div>
        ) : (
          <FormFill form={form} publicMode />
        )}
      </div>
    </div>
  );
}

"use client";

import { use } from "react";
import Link from "next/link";
import { FormFill } from "@/components/domain/form-fill";
import { TerminalPanel } from "@/components/ui/terminal-panel";
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
      <div className="mx-auto mb-6 max-w-xl">
        <p className="font-[family-name:var(--font-display)] text-[1.5rem] font-extrabold tracking-[-0.04em] text-text">
          Elevates
        </p>
        <p className="mt-1 text-[13px] text-text-dim">
          {chapter?.name ?? "Chapter form"}
        </p>
      </div>

      {!form ? (
        <div className="mx-auto max-w-xl">
          <TerminalPanel title="form" meta="not found">
            <p className="font-semibold">Form not found</p>
            <p className="mt-2 text-sm text-text-dim">
              This share link is invalid or the form was removed.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-[var(--accent)]"
            >
              Go to Elevates OS
            </Link>
          </TerminalPanel>
        </div>
      ) : form.status !== "open" ? (
        <div className="mx-auto max-w-xl">
          <TerminalPanel title={form.title} meta={form.status} accent="orange">
            <p className="text-sm text-text-dim">
              This form is {form.status} and is not accepting responses.
            </p>
          </TerminalPanel>
        </div>
      ) : (
        <FormFill form={form} publicMode />
      )}
    </div>
  );
}

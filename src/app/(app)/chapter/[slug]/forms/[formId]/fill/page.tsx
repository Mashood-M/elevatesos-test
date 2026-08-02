"use client";

import { use } from "react";
import Link from "next/link";
import { FormFill } from "@/components/domain/form-fill";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { migrateForm } from "@/lib/forms/helpers";

export default function FormFillPage({
  params,
}: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);
  const raw = store.forms?.find((f) => f.id === formId);
  const form = raw ? migrateForm(raw) : null;

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

  return (
    <div className="pb-10">
      <div className="mb-4 flex justify-end">
        <Link href={`/chapter/${slug}/forms/${form.id}`}>
          <Button variant="ghost" className="h-9">
            Back to form
          </Button>
        </Link>
      </div>
      {form.status !== "open" ? (
        <div className="mx-auto max-w-xl">
          <TerminalPanel title={form.title} meta={form.status} accent="orange">
            <p className="text-sm text-text-dim">
              This form is {form.status} and is not accepting responses.
            </p>
          </TerminalPanel>
        </div>
      ) : (
        <FormFill form={form} />
      )}
    </div>
  );
}

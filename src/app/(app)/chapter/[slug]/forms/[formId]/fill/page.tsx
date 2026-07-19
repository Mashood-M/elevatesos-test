"use client";

import { use } from "react";
import Link from "next/link";
import { FormFill } from "@/components/domain/form-fill";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Respond"
        description={form.title}
        actions={
          <Link href={`/chapter/${slug}/forms/${form.id}`}>
            <Button variant="ghost">Back to form</Button>
          </Link>
        }
      />
      {form.status !== "open" ? (
        <p className="rounded-[var(--radius)] border border-border p-4 text-sm text-text-dim">
          This form is {form.status} and is not accepting responses.
        </p>
      ) : (
        <FormFill form={form} />
      )}
    </div>
  );
}

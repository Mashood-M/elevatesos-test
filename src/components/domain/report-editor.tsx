"use client";

import { DocumentEditor } from "@/components/domain/document-editor";
import type { DocumentMeta } from "@/components/domain/document-editor";

/** @deprecated Prefer DocumentEditor — kept as a thin compatibility wrapper. */
export function ReportEditor({
  initialHtml,
  initialJson,
  editable = true,
  onChange,
  title = "Untitled document",
  meta,
  libraryHref = "#",
}: {
  initialHtml?: string;
  initialJson?: string;
  editable?: boolean;
  onChange?: (payload: { html: string; json: string }) => void;
  title?: string;
  meta?: DocumentMeta;
  libraryHref?: string;
}) {
  return (
    <DocumentEditor
      initialHtml={initialHtml}
      initialJson={initialJson}
      editable={editable}
      onChange={onChange}
      title={title}
      meta={meta ?? { status: "draft" }}
      libraryHref={libraryHref}
    />
  );
}

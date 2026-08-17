"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DocumentEditor } from "@/components/domain/document-editor";
import type { SaveState } from "@/components/domain/document-editor";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isFacultyRole, resolveChapter } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { downloadReportDocx } from "@/lib/reports/docx-export";
import { formatDateTime } from "@/lib/utils";

export default function ChapterReportDocumentPage({
  params,
}: {
  params: Promise<{ slug: string; reportId: string }>;
}) {
  const { slug, reportId } = use(params);
  const { store, updateReportDocument, submitReportDraft } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug);
  const report = store.reports.find((r) => r.id === reportId);

  const [title, setTitle] = useState(report?.title ?? "");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const draftRef = useRef<{ html: string; json: string } | null>(null);

  const canSubmit = hasPermission(store, session.roleKey, "report.submit");
  const canDownload = hasPermission(store, session.roleKey, "report.download");
  const isFaculty = isFacultyRole(session.roleKey);
  const isHq = isHqRole(session.roleKey);

  const editable = useMemo(() => {
    if (!report) return false;
    if (isFaculty) return false;
    if (
      report.status === "approved" ||
      report.status === "archived" ||
      report.status === "rejected" ||
      report.status === "submitted"
    ) {
      return false;
    }
    if (isHq) {
      return (
        report.status === "draft" || report.status === "changes_requested"
      );
    }
    if (!canSubmit) return false;
    return report.status === "draft" || report.status === "changes_requested";
  }, [report, isFaculty, isHq, canSubmit]);

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;
  if (!report || report.chapterId !== chapter.id) {
    return (
      <div>
        <p className="text-[var(--accent)]">Report not found</p>
        <Link href={`/chapter/${slug}/reports`} className="text-cyan">
          Back to reports
        </Link>
      </div>
    );
  }

  const currentChapter = chapter;
  const currentReport = report;
  const event = currentReport.eventId
    ? store.events.find((e) => e.id === currentReport.eventId)
    : undefined;
  const author = store.profiles.find((p) => p.id === currentReport.submittedBy);

  function saveDocument() {
    const payload = draftRef.current;
    const summary =
      payload?.html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220) || currentReport.summary;
    setSaveState("saving");
    const ok = updateReportDocument(
      currentReport.id,
      {
        title: title.trim() || currentReport.title,
        bodyHtml: payload?.html ?? currentReport.bodyHtml,
        bodyJson: payload?.json ?? currentReport.bodyJson,
        summary,
      },
      session.userId,
    );
    setSaveState(ok ? "saved" : "dirty");
  }

  async function handleDownload(forCollege = false) {
    const approver = store.profiles.find(
      (p) => p.id === currentReport.approvedBy,
    );
    await downloadReportDocx({
      report: {
        ...currentReport,
        title: title.trim() || currentReport.title,
        bodyHtml: draftRef.current?.html ?? currentReport.bodyHtml,
        bodyJson: draftRef.current?.json ?? currentReport.bodyJson,
      },
      chapterName: currentChapter.name,
      forCollege,
      approverName: approver?.fullName,
    });
  }

  return (
    <DocumentEditor
      key={`${currentReport.id}-${currentReport.updatedAt ?? ""}`}
      initialHtml={currentReport.bodyHtml}
      initialJson={currentReport.bodyJson}
      editable={editable}
      title={title}
      onTitleChange={setTitle}
      saveState={saveState}
      libraryHref={`/chapter/${slug}/reports`}
      libraryLabel="Library"
      exportLabel={isFaculty ? "Download for college" : "Export .docx"}
      showSubmit={Boolean(
        canSubmit &&
          editable &&
          (currentReport.status === "draft" ||
            currentReport.status === "changes_requested"),
      )}
      showApprove={false}
      meta={{
        status: currentReport.status,
        type: currentReport.type,
        chapterName: currentChapter.name,
        eventTitle: event?.title,
        authorName: author?.fullName,
        updatedAt: currentReport.updatedAt
          ? formatDateTime(currentReport.updatedAt)
          : undefined,
        source: currentReport.source,
        hqComment: currentReport.hqComment,
      }}
      onChange={(payload) => {
        draftRef.current = payload;
        setSaveState("dirty");
      }}
      onSave={editable ? saveDocument : undefined}
      onExportDocx={
        canDownload || currentReport.status === "approved"
          ? () => void handleDownload(isFaculty)
          : undefined
      }
      onSubmit={() => {
        saveDocument();
        submitReportDraft(currentReport.id, session.userId);
      }}
    />
  );
}

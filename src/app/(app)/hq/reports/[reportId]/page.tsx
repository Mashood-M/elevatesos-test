"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HqReportViewer } from "@/components/domain/reports/hq-report-viewer";
import { useCurrentUser, useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { downloadReportDocx } from "@/lib/reports/docx-export";

/** HQ review: PDF-style viewer with Approve / Correction / Reject. */
export default function HqReportDocumentPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const router = useRouter();
  const { store, reviewReport } = useStore();
  const { session } = useCurrentUser();
  const report = store.reports.find((r) => r.id === reportId);
  const chapter = report
    ? store.chapters.find((c) => c.id === report.chapterId)
    : undefined;

  const canReview = hasPermission(store, session.roleKey, "report.approve");

  if (!report || !chapter) {
    return (
      <div>
        <p className="text-[var(--accent)]">Report not found</p>
        <Link href="/hq/reports" className="text-cyan">
          Back to queue
        </Link>
      </div>
    );
  }

  const event = report.eventId
    ? store.events.find((e) => e.id === report.eventId)
    : undefined;
  const author = store.profiles.find((p) => p.id === report.submittedBy);

  return (
    <HqReportViewer
      report={report}
      chapterName={chapter.name}
      eventTitle={event?.title}
      authorName={author?.fullName}
      canReview={canReview}
      onExportDocx={() =>
        void downloadReportDocx({
          report,
          chapterName: chapter.name,
          forCollege: report.status === "approved",
        })
      }
      onReview={(decision, comment) => {
        const ok = reviewReport(
          report.id,
          decision,
          comment,
          session.userId,
        );
        if (ok) router.push("/hq/reports");
      }}
    />
  );
}

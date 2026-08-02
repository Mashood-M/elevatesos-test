"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Report, ReportReviewDecision, ReportStatus } from "@/types";
import "./hq-report-viewer.css";

const statusTone: Record<ReportStatus, "mute" | "orange" | "green" | "magenta" | "cyan"> = {
  draft: "mute",
  submitted: "orange",
  changes_requested: "magenta",
  approved: "green",
  rejected: "mute",
  archived: "mute",
};

function statusLabel(status: ReportStatus) {
  if (status === "changes_requested") return "changes requested";
  return status.replaceAll("_", " ");
}

type ReviewAction = ReportReviewDecision;

export function HqReportViewer({
  report,
  chapterName,
  eventTitle,
  authorName,
  canReview,
  onExportDocx,
  onReview,
}: {
  report: Report;
  chapterName: string;
  eventTitle?: string;
  authorName?: string;
  canReview: boolean;
  onExportDocx?: () => void;
  onReview: (decision: ReviewAction, comment: string) => void;
}) {
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const showActions = canReview && report.status === "submitted";

  function openAction(next: ReviewAction) {
    setAction(next);
    setComment(report.hqComment ?? "");
    setError("");
  }

  function closeAction() {
    setAction(null);
    setComment("");
    setError("");
  }

  function confirmAction() {
    if (!action) return;
    if (
      (action === "reject" || action === "correction") &&
      !comment.trim()
    ) {
      setError("A comment is required.");
      return;
    }
    onReview(action, comment.trim());
    closeAction();
  }

  const actionTitle =
    action === "approve"
      ? "Approve report"
      : action === "correction"
        ? "Request correction"
        : action === "reject"
          ? "Reject report"
          : "";

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-panel shadow-[var(--shadow)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-5">
        <Link
          href="/hq/reports"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] text-text-dim hover:bg-bg-hover hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Queue
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-[family-name:var(--font-display)] text-[16px] font-bold tracking-[-0.02em] text-text">
              {report.title}
            </h1>
            <Badge tone={statusTone[report.status]}>
              {statusLabel(report.status)}
            </Badge>
            <Badge tone="mute">View only</Badge>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-text-mute">
            {chapterName}
            {eventTitle ? ` · ${eventTitle}` : ""}
            {authorName ? ` · ${authorName}` : ""}
            {" · "}
            {report.type.replaceAll("_", " ")}
          </p>
        </div>
        {onExportDocx ? (
          <Button type="button" variant="ghost" onClick={onExportDocx}>
            Export .docx
          </Button>
        ) : null}
      </header>

      {report.hqComment ? (
        <div className="shrink-0 border-b border-border bg-[#faf8f5] px-4 py-2.5 text-[12px] text-text-dim md:px-5">
          <span className="font-semibold text-text">HQ comment: </span>
          {report.hqComment}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-[#d8d4cc] px-4 py-8 md:px-8">
        <article
          className="hq-report-viewer-page"
          dangerouslySetInnerHTML={{
            __html: report.bodyHtml || "<p><em>Empty report.</em></p>",
          }}
        />
      </div>

      {showActions ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-bg-panel px-4 py-3 md:px-5">
          <p className="mr-auto text-[12px] text-text-mute">
            Review this submission, then choose an outcome.
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => openAction("reject")}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => openAction("correction")}
          >
            Request correction
          </Button>
          <Button
            type="button"
            variant="green"
            onClick={() => openAction("approve")}
          >
            Approve
          </Button>
        </footer>
      ) : null}

      <Dialog
        open={Boolean(action)}
        onClose={closeAction}
        title={actionTitle}
        description={
          action === "approve"
            ? "Optional comment for the chapter. Approved reports can be downloaded for college."
            : action === "correction"
              ? "Explain what needs to change. The chapter can edit and resubmit."
              : "Explain why this report is rejected. The chapter cannot edit it afterward."
        }
      >
        <div className="space-y-3">
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              action === "approve"
                ? "Optional feedback…"
                : "Required feedback for the chapter…"
            }
          />
          {error ? (
            <p className="text-[12px] text-[var(--danger)]">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeAction}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                action === "approve"
                  ? "green"
                  : action === "reject"
                    ? "danger"
                    : "orange"
              }
              className={cn(action === "correction" && "text-white")}
              onClick={confirmAction}
            >
              {action === "approve"
                ? "Confirm approve"
                : action === "correction"
                  ? "Send for correction"
                  : "Confirm reject"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

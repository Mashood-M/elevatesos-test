"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
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
  backHref = "/hq/reports",
  backLabel = "Queue",
  onExportDocx,
  onReview,
}: {
  report: Report;
  chapterName: string;
  eventTitle?: string;
  authorName?: string;
  canReview: boolean;
  backHref?: string;
  backLabel?: string;
  onExportDocx?: () => void;
  onReview: (decision: ReviewAction, comment: string) => void;
}) {
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const showActions =
    canReview &&
    (report.status === "submitted" ||
      report.status === "changes_requested");

  function openAction(next: ReviewAction) {
    setAction(next);
    setComment(next === "approve" ? (report.hqComment ?? "") : "");
    setError("");
  }

  function closeAction() {
    setAction(null);
    setComment("");
    setError("");
  }

  function confirmAction() {
    if (!action) return;
    if (action === "reject" && !comment.trim()) {
      setError("Please provide a reason explaining why this report is rejected.");
      return;
    }
    if (action === "correction" && !comment.trim()) {
      setError("Please describe the corrections needed before resubmitting.");
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
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] text-text-dim hover:bg-bg-hover hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-[family-name:var(--font-display)] text-[16px] font-bold tracking-[-0.02em] text-text">
              {report.title}
            </h1>
            <Badge tone={statusTone[report.status]}>
              {statusLabel(report.status)}
            </Badge>
            <Badge tone="mute">Review view</Badge>
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

      {report.status === "rejected" ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50/90 px-4 py-3.5 text-[13px] text-red-900 md:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-900">Report Rejected</span>
                <span className="text-[11px] text-red-600">Decision by Reviewer</span>
              </div>
              <div className="mt-2 rounded-md border border-red-200 bg-white p-3 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                  Why this report was rejected:
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-red-950 whitespace-pre-wrap">
                  {report.hqComment || "No specific reason was entered."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : report.status === "approved" ? (
        <div className="shrink-0 border-b border-green-200 bg-emerald-50/80 px-4 py-3 text-[13px] text-emerald-900 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-emerald-900">Report Approved</span>
              {report.hqComment ? (
                <span className="text-[12px] text-emerald-700">
                  — “{report.hqComment}”
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : report.status === "changes_requested" ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50/80 px-4 py-3 text-[13px] text-amber-900 md:px-5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <span className="font-bold text-amber-900">Corrections Requested: </span>
              <span className="text-[12px] text-amber-800">
                {report.hqComment || "Please revise and resubmit."}
              </span>
            </div>
          </div>
        </div>
      ) : report.hqComment ? (
        <div className="shrink-0 border-b border-border bg-[#faf8f5] px-4 py-2.5 text-[12px] text-text-dim md:px-5">
          <span className="font-semibold text-text">Reviewer feedback: </span>
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
        title={
          action === "reject"
            ? "Reject Report — Reason Required"
            : action === "approve"
              ? "Approve Report"
              : "Request Corrections"
        }
        description={
          action === "reject"
            ? "Specify why this report is being rejected. The Campus Lead and chapter executives will see this explanation."
            : action === "approve"
              ? "Approve this chapter report. Approved reports are available for official college records."
              : "Explain what needs to change. The chapter can edit the document and resubmit."
        }
      >
        <div className="space-y-4">
          {action === "reject" ? (
            <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50/90 p-3 text-[12px] text-red-900">
              <p className="font-semibold text-red-800">Why is this report rejected?</p>
              <p className="mt-0.5 text-red-700">
                Please specify the reason (e.g. attendance discrepancies, incomplete outcomes, or missing details) so the submitter understands why this was rejected.
              </p>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-text">
              {action === "reject" ? (
                <span>
                  Why is this report rejected? (Reason required) <span className="text-[var(--danger)]">*</span>
                </span>
              ) : action === "correction" ? (
                <span>
                  Required corrections <span className="text-[var(--danger)]">*</span>
                </span>
              ) : (
                <span>Approval comments (optional)</span>
              )}
            </label>
            <TextArea
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError("");
              }}
              placeholder={
                action === "reject"
                  ? "Explain why this report cannot be accepted..."
                  : action === "correction"
                    ? "Explain what needs to be revised or added..."
                    : "Optional feedback or note for the chapter..."
              }
              className={cn(
                action === "reject" && "border-red-300 focus:border-red-500",
              )}
              autoFocus
            />
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-[var(--danger)]">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
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
                ? "Confirm Approve"
                : action === "correction"
                  ? "Send for Correction"
                  : "Confirm & Reject Report"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

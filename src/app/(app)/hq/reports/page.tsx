"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { downloadReportDocx } from "@/lib/reports/docx-export";
import { formatDateTime } from "@/lib/utils";
import type { ReportStatus, ReportType } from "@/types";

const statusTone = {
  draft: "mute" as const,
  submitted: "orange" as const,
  changes_requested: "magenta" as const,
  approved: "green" as const,
  rejected: "mute" as const,
  archived: "mute" as const,
};

type StatusFilter =
  | "submitted"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "draft"
  | "archived"
  | "all";

const REPORT_TYPES: ReportType[] = [
  "event",
  "monthly",
  "semester",
  "annual",
  "budget",
  "activity",
];

export default function HqReportsPage() {
  const { store } = useStore();
  const { session } = useCurrentUser();
  const canApprove = hasPermission(store, session.roleKey, "report.approve");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("submitted");
  const [chapterFilter, setChapterFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [flash, setFlash] = useState("");

  const pendingCount = store.reports.filter((r) => r.status === "submitted").length;
  const approvedCount = store.reports.filter((r) => r.status === "approved").length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.reports
      .filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (chapterFilter && r.chapterId !== chapterFilter) return false;
        if (typeFilter && r.type !== typeFilter) return false;
        if (!needle) return true;
        return r.title.toLowerCase().includes(needle);
      })
      .slice()
      .sort((a, b) =>
        (b.submittedAt ?? b.updatedAt ?? "").localeCompare(
          a.submittedAt ?? a.updatedAt ?? "",
        ),
      );
  }, [store.reports, q, statusFilter, chapterFilter, typeFilter]);

  const filtersActive = Boolean(
    q.trim() ||
      statusFilter !== "submitted" ||
      chapterFilter ||
      typeFilter,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Report Review"
        description="Open reports in a PDF-style viewer. Approve, request correction, or reject with a comment."
        actions={
          flash ? (
            <span className="text-[12px] text-[var(--accent)]">{flash}</span>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending review" value={pendingCount} accent="orange" />
        <Stat label="Approved" value={approvedCount} accent="green" />
        <Stat label="Total reports" value={store.reports.length} accent="cyan" />
      </div>

      {!canApprove ? (
        <TerminalPanel title="view.only" className="mt-6">
          <p className="text-sm text-text-dim">
            You can open documents. Approving requires report.approve.
          </p>
        </TerminalPanel>
      ) : null}

      <TerminalPanel
        title="report.queue"
        meta={`${rows.length} shown · ${pendingCount} pending`}
        className="mt-6"
      >
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title…"
            />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="submitted">Pending (submitted)</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Chapter</FieldLabel>
            <Select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
            >
              <option value="">All chapters</option>
              {store.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!rows.length ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {filtersActive
                ? "No reports match these filters."
                : "No reports in the queue yet."}
            </p>
            {filtersActive ? (
              <Button
                variant="ghost"
                className="mt-3"
                onClick={() => {
                  setQ("");
                  setStatusFilter("submitted");
                  setChapterFilter("");
                  setTypeFilter("");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((report) => {
              const chapter = store.chapters.find(
                (c) => c.id === report.chapterId,
              );
              const submitter = store.profiles.find(
                (p) => p.id === report.submittedBy,
              );
              return (
                <li
                  key={report.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/hq/reports/${report.id}`}
                        className="font-[family-name:var(--font-display)] text-[15px] font-bold hover:text-[var(--accent)]"
                      >
                        {report.title}
                      </Link>
                      <Badge tone={statusTone[report.status as ReportStatus]}>
                        {report.status === "changes_requested"
                          ? "changes requested"
                          : report.status}
                      </Badge>
                      {report.source === "student_auto" ? (
                        <Badge tone="cyan">auto</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-text-dim">
                      {chapter?.name ?? "Unknown"} ·{" "}
                      {report.type.replaceAll("_", " ")} ·{" "}
                      {submitter?.fullName ?? "Unknown"}
                      {report.submittedAt
                        ? ` · ${formatDateTime(report.submittedAt)}`
                        : ""}
                    </p>
                    {report.summary ? (
                      <p className="mt-2 text-[13px] text-text-dim">
                        {report.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/hq/reports/${report.id}`}>
                      <Button variant="primary">
                        {report.status === "submitted" ? "Review" : "View"}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        void downloadReportDocx({
                          report,
                          chapterName: chapter?.name ?? "Chapter",
                          forCollege: report.status === "approved",
                        }).then(() => {
                          setFlash("Downloaded .docx");
                          window.setTimeout(() => setFlash(""), 1400);
                        });
                      }}
                    >
                      .docx
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

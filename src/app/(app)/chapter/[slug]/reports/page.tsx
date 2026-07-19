"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { ReportType } from "@/types";

const statusTone = {
  draft: "mute" as const,
  submitted: "orange" as const,
  approved: "green" as const,
  archived: "mute" as const,
};

export default function ChapterReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { store, submitReport } = useStore();
  const { slug } = use(params);
  const chapter = store.chapters.find((c) => c.slug === slug);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReportType>("monthly");
  const [flash, setFlash] = useState("");

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;

  const reports = store.reports.filter((r) => r.chapterId === chapter.id);
  const canSubmit = hasPermission(store, store.session.roleKey, "report.submit");

  function handleSubmit() {
    if (!title.trim()) {
      setFlash("Title is required.");
      return;
    }
    submitReport({
      chapterId: chapter!.id,
      type,
      title: title.trim(),
      submittedBy: store.session.userId,
    });
    setTitle("");
    setOpen(false);
    setFlash("Report submitted to HQ for review.");
  }

  return (
    <div>
      <PageHeader
        title="Chapter reports"
        description="Event reports, monthly summaries, and activity logs submitted to HQ for review."
        actions={
          canSubmit ? (
            <Button variant="orange" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "New report"}
            </Button>
          ) : null
        }
      />

      {flash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">{flash}</p>
      ) : null}

      {open ? (
        <TerminalPanel title="Submit report" className="mb-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="March activity report"
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
              >
                <option value="event">Event</option>
                <option value="monthly">Monthly</option>
                <option value="semester">Semester</option>
                <option value="annual">Annual</option>
                <option value="budget">Budget</option>
                <option value="activity">Activity</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="primary" className="w-full" onClick={handleSubmit}>
                Submit to HQ
              </Button>
            </div>
          </div>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="History">
        <div className="space-y-4">
          {reports.map((report) => {
            const submitter = store.profiles.find((p) => p.id === report.submittedBy);
            const approver = store.profiles.find((p) => p.id === report.approvedBy);
            return (
              <article
                key={report.id}
                className="rounded-[var(--radius)] border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{report.title}</h3>
                    <p className="mt-1 text-[12px] text-text-dim">
                      {report.type} · {submitter?.fullName}
                      {report.submittedAt
                        ? ` · ${formatDateTime(report.submittedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone[report.status]}>{report.status}</Badge>
                </div>
                {report.hqComment ? (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--success)]/40 p-3 text-[12px]">
                    <p className="text-[var(--success)]">HQ: {report.hqComment}</p>
                    {approver ? (
                      <p className="mt-1 text-text-mute">
                        Approved by {approver.fullName}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {reports.length === 0 ? (
            <p className="text-[13px] text-text-dim">No reports yet.</p>
          ) : null}
        </div>
      </TerminalPanel>
    </div>
  );
}

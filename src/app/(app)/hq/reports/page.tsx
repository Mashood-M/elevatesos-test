"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

const statusTone = {
  draft: "mute" as const,
  submitted: "orange" as const,
  approved: "green" as const,
  archived: "mute" as const,
};

export default function HqReportsPage() {
  const { store, approveReport } = useStore();
  const { session } = useCurrentUser();
  const [comments, setComments] = useState<Record<string, string>>({});

  const reports = [...store.reports].sort((a, b) =>
    (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""),
  );

  function handleApprove(reportId: string) {
    const comment = comments[reportId]?.trim() || "Approved by HQ.";
    approveReport(reportId, comment, session.userId);
  }

  return (
    <div>
      <PageHeader
        title="Report Review"
        description="Review chapter submissions — event reports, monthly summaries, and activity logs. Approve with HQ comments."
      />

      <TerminalPanel title="report.queue" meta={`${reports.filter((r) => r.status === "submitted").length} pending`}>
        <div className="space-y-4">
          {reports.map((report) => {
            const chapter = store.chapters.find((c) => c.id === report.chapterId);
            const submitter = store.profiles.find((p) => p.id === report.submittedBy);
            const approver = store.profiles.find((p) => p.id === report.approvedBy);

            return (
              <article key={report.id} className="border border-border bg-bg p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{report.title}</h3>
                    <p className="mt-1 text-[11px] text-text-dim">
                      {chapter?.name} · {report.type.replaceAll("_", " ")} · submitted by {submitter?.fullName}
                      {report.submittedAt ? ` · ${formatDateTime(report.submittedAt)}` : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone[report.status]}>{report.status}</Badge>
                </div>

                {report.hqComment ? (
                  <div className="mt-3 border border-dashed border-green/30 bg-green/5 p-3 text-[11px]">
                    <p className="text-green">// hq.comment</p>
                    <p className="mt-1 text-text-dim">{report.hqComment}</p>
                    {approver ? (
                      <p className="mt-1 text-[10px] text-text-mute">Approved by {approver.fullName}</p>
                    ) : null}
                  </div>
                ) : null}

                {report.status === "submitted" ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <FieldLabel>HQ Comment</FieldLabel>
                    <TextArea
                      rows={2}
                      placeholder="// Feedback for chapter executives..."
                      value={comments[report.id] ?? ""}
                      onChange={(e) =>
                        setComments((c) => ({ ...c, [report.id]: e.target.value }))
                      }
                    />
                    <Button variant="green" className="mt-2" onClick={() => handleApprove(report.id)}>
                      Approve Report
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </TerminalPanel>
    </div>
  );
}

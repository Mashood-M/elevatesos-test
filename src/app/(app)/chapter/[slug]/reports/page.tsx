"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, isFacultyRole, resolveChapter } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { compressImageFile, downloadReportDocx } from "@/lib/reports/docx-export";
import {
  buildStudentEventReportHtml,
  emptyManualReportHtml,
} from "@/lib/reports/templates";
import { formatDateTime } from "@/lib/utils";
import type { ReportImage, ReportType } from "@/types";

const statusTone = {
  draft: "mute" as const,
  submitted: "orange" as const,
  changes_requested: "magenta" as const,
  approved: "green" as const,
  rejected: "mute" as const,
  archived: "mute" as const,
};

export default function ChapterReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const router = useRouter();
  const {
    store,
    createReportDraft,
    generateStudentEventReport,
    submitReportDraft,
  } = useStore();
  const { session, profile } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  const [flash, setFlash] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [eventId, setEventId] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [attendanceNote, setAttendanceNote] = useState("");
  const [images, setImages] = useState<ReportImage[]>([]);
  const [wizardError, setWizardError] = useState("");

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading reports...</p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold text-text">Chapter not found</p>
        <p className="mt-2 text-xs text-text-dim max-w-md mx-auto">This campus chapter is not yet registered or opened. HQ and HQ Admins only can manage un-opened chapters.</p>
      </div>
    );
  }
  const currentChapter = chapter;

  const canSubmit = hasPermission(store, session.roleKey, "report.submit");
  const canDownload = hasPermission(store, session.roleKey, "report.download");
  const isFaculty = isFacultyRole(session.roleKey);
  const isStudent =
    session.roleKey === "student" ||
    session.roleKey === "class_representative";
  const isExecOrHq =
    isHqRole(session.roleKey) ||
    (!isFaculty && !isStudent && canSubmit);

  const chapterEvents = store.events.filter(
    (e) => e.chapterId === currentChapter.id,
  );

  const reports = useMemo(() => {
    let list = store.reports.filter((r) => r.chapterId === currentChapter.id);
    if (isFaculty) {
      list = list.filter((r) => r.status === "approved");
    } else if (isStudent && !isExecOrHq) {
      list = list.filter(
        (r) => r.submittedBy === session.userId || r.source === "student_auto",
      );
    }
    return list
      .slice()
      .sort((a, b) =>
        (b.updatedAt ?? b.submittedAt ?? "").localeCompare(
          a.updatedAt ?? a.submittedAt ?? "",
        ),
      );
  }, [
    store.reports,
    currentChapter.id,
    isFaculty,
    isStudent,
    isExecOrHq,
    session.userId,
  ]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function handleNewManual() {
    const title = "Untitled chapter report";
    const html = emptyManualReportHtml(title);
    const report = createReportDraft({
      chapterId: currentChapter.id,
      type: "monthly" as ReportType,
      title,
      bodyHtml: html,
      source: "manual",
      submittedBy: session.userId,
    });
    router.push(`/chapter/${slug}/reports/${report.id}`);
  }

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return;
    setWizardError("");
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= 4) break;
      try {
        next.push(await compressImageFile(file));
      } catch {
        setWizardError("Could not process one of the images.");
      }
    }
    setImages(next.slice(0, 4));
  }

  function handleGenerate() {
    setWizardError("");
    const event = chapterEvents.find((e) => e.id === eventId);
    if (!event) {
      setWizardError("Select an event.");
      return;
    }
    if (!outcomes.trim()) {
      setWizardError("Add a short outcomes summary.");
      return;
    }
    const built = buildStudentEventReportHtml(store, event, {
      outcomes: outcomes.trim(),
      attendanceNote: attendanceNote.trim() || undefined,
      authorName: profile?.fullName ?? "Student",
      chapterName: currentChapter.name,
      images,
    });
    const report = generateStudentEventReport({
      chapterId: currentChapter.id,
      eventId: event.id,
      outcomes: outcomes.trim(),
      attendanceNote: attendanceNote.trim() || undefined,
      images,
      bodyHtml: built.bodyHtml,
      title: built.title,
      summary: built.summary,
      submittedBy: session.userId,
    });
    if (!report) {
      setWizardError("Could not generate report.");
      return;
    }
    setWizardOpen(false);
    setEventId("");
    setOutcomes("");
    setAttendanceNote("");
    setImages([]);
    router.push(`/chapter/${slug}/reports/${report.id}`);
  }

  async function handleDownload(reportId: string, forCollege = false) {
    const report = store.reports.find((r) => r.id === reportId);
    if (!report) return;
    const approver = store.profiles.find((p) => p.id === report.approvedBy);
    await downloadReportDocx({
      report,
      chapterName: currentChapter.name,
      forCollege,
      approverName: approver?.fullName,
    });
    flashMsg(forCollege ? "Downloaded for college" : "Downloaded .docx");
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Reports"
        description={
          isFaculty
            ? "Download approved Elevates reports as Word documents for college head / management."
            : "Write Word-like reports, auto-generate from events + photos, submit to HQ, and download .docx."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            {canSubmit && !isFaculty ? (
              isStudent && !isExecOrHq ? (
                <Button variant="orange" onClick={() => setWizardOpen(true)}>
                  Generate from event
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setWizardOpen(true)}>
                    Generate from event
                  </Button>
                  <Button variant="orange" onClick={handleNewManual}>
                    New report
                  </Button>
                </>
              )
            ) : null}
          </div>
        }
      />

      <TerminalPanel
        title="report.library"
        meta={`${reports.length} report${reports.length === 1 ? "" : "s"}`}
      >
        {!reports.length ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {isFaculty
                ? "No approved reports yet for college submission."
                : "No reports yet. Generate from an event or start a blank document."}
            </p>
            {canSubmit && !isFaculty ? (
              <Button
                variant="orange"
                className="mt-4"
                onClick={() => setWizardOpen(true)}
              >
                Generate from event
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((report) => {
              const event = report.eventId
                ? store.events.find((e) => e.id === report.eventId)
                : undefined;
              const author = store.profiles.find(
                (p) => p.id === report.submittedBy,
              );
              return (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/chapter/${slug}/reports/${report.id}`}
                        className="font-semibold hover:text-[var(--accent)]"
                      >
                        {report.title}
                      </Link>
                      <Badge tone={statusTone[report.status]}>
                        {report.status === "changes_requested"
                          ? "changes requested"
                          : report.status}
                      </Badge>
                      {report.source === "student_auto" ? (
                        <Badge tone="cyan">auto</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-text-dim">
                      {report.type.replaceAll("_", " ")}
                      {event ? ` · ${event.title}` : ""}
                      {author ? ` · ${author.fullName}` : ""}
                      {report.updatedAt || report.submittedAt
                        ? ` · ${formatDateTime(report.updatedAt ?? report.submittedAt!)}`
                        : ""}
                    </p>
                    {report.hqComment ? (
                      <p className="mt-1 text-[12px] text-[var(--secondary)]">
                        HQ: {report.hqComment}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/chapter/${slug}/reports/${report.id}`}>
                      <Button variant="ghost">Open</Button>
                    </Link>
                    {(canDownload || report.status === "approved") &&
                    (isFaculty
                      ? report.status === "approved"
                      : canDownload || canSubmit) ? (
                      <Button
                        variant={isFaculty ? "orange" : "ghost"}
                        onClick={() =>
                          void handleDownload(report.id, isFaculty)
                        }
                      >
                        {isFaculty ? "Download for college" : "Download .docx"}
                      </Button>
                    ) : null}
                    {canSubmit &&
                    (report.status === "draft" ||
                      report.status === "changes_requested") &&
                    (report.submittedBy === session.userId || isExecOrHq) ? (
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (submitReportDraft(report.id, session.userId)) {
                            flashMsg("Submitted to HQ");
                          }
                        }}
                      >
                        {report.status === "changes_requested"
                          ? "Resubmit"
                          : "Submit"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>

      <Dialog
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setWizardError("");
        }}
        title="Generate report from event"
        description="Pick an event, add outcomes and photos — Elevates drafts a Word-like report you can edit."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Event</FieldLabel>
            <Select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Select…</option>
              {chapterEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Outcomes / highlights</FieldLabel>
            <TextArea
              rows={3}
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              placeholder="What happened, who benefited, what ships next…"
            />
          </div>
          <div>
            <FieldLabel>Attendance note (optional)</FieldLabel>
            <Input
              value={attendanceNote}
              onChange={(e) => setAttendanceNote(e.target.value)}
              placeholder="e.g. Full house, 3 waitlisted"
            />
          </div>
          <div>
            <FieldLabel>Photos (up to 4)</FieldLabel>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void onPickImages(e.target.files)}
              className="block w-full text-[12px] text-text-dim"
            />
            {images.length ? (
              <p className="mt-1 text-[11px] text-text-mute">
                {images.length} image{images.length === 1 ? "" : "s"} attached
              </p>
            ) : null}
          </div>
          {wizardError ? (
            <p className="text-[13px] text-[var(--accent)]">{wizardError}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setWizardOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="orange" onClick={handleGenerate}>
              Generate & edit
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

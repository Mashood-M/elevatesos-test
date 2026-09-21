"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
  GraduationCap,
} from "lucide-react";
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
import { extractEventReportAnalytics } from "@/lib/reports/feedback-analytics";
import {
  buildStudentEventReportHtml,
  emptyManualReportHtml,
} from "@/lib/reports/templates";
import { isUserAppointedVolunteerForEvent } from "@/lib/volunteers";
import { formatDate } from "@/lib/datetime";
import { formatDateTime } from "@/lib/utils";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
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

  const canSubmit = hasPermission(store, session.roleKey, "report.submit");
  const canDownload = hasPermission(store, session.roleKey, "report.download");
  const isFaculty = isFacultyRole(session.roleKey);
  const isStudent =
    session.roleKey === "student" ||
    session.roleKey === "class_representative";
  const isExecOrHq =
    isHqRole(session.roleKey) ||
    (!isFaculty && !isStudent && canSubmit);

  const appointedEventIds = useMemo(() => {
    return new Set(
      store.events
        .filter((e) => isUserAppointedVolunteerForEvent(store, session.userId, e.id))
        .map((e) => e.id),
    );
  }, [store.events, store.userRoles, store.volunteerAssignments, store.volunteerGroups, session.userId]);

  const isAppointedVolunteer = appointedEventIds.size > 0;
  const canCreateReport = canSubmit || isAppointedVolunteer;

  const reports = useMemo(() => {
    if (!chapter) return [];
    let list = store.reports.filter((r) => r.chapterId === chapter.id);
    if (isFaculty) {
      list = list.filter((r) => r.status !== "draft");
    } else if (isStudent && !isExecOrHq) {
      list = list.filter(
        (r) =>
          r.submittedBy === session.userId ||
          r.source === "student_auto" ||
          (r.eventId && appointedEventIds.has(r.eventId)),
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
    chapter?.id,
    isFaculty,
    isStudent,
    isExecOrHq,
    session.userId,
    appointedEventIds,
  ]);

  const currentChapter = chapter;

  const chapterEvents = useMemo(() => {
    if (!currentChapter) return [];
    return store.events
      .filter((e) => e.chapterId === currentChapter.id)
      .slice()
      .sort((a, b) => {
        const aAppointed = appointedEventIds.has(a.id) ? 1 : 0;
        const bAppointed = appointedEventIds.has(b.id) ? 1 : 0;
        if (aAppointed !== bAppointed) return bAppointed - aAppointed;
        return (b.startsAt || "").localeCompare(a.startsAt || "");
      });
  }, [store.events, currentChapter?.id, appointedEventIds]);

  const selectedEvent = useMemo(() => {
    return chapterEvents.find((e) => e.id === eventId);
  }, [chapterEvents, eventId]);

  const selectedAnalytics = useMemo(() => {
    if (!selectedEvent) return null;
    return extractEventReportAnalytics(store, selectedEvent);
  }, [store, selectedEvent]);

  const isVolunteerForSelected = Boolean(
    selectedEvent && appointedEventIds.has(selectedEvent.id),
  );

  const assignedFaculty = useMemo(() => {
    const facId = selectedEvent?.facultyId || currentChapter?.facultyId;
    if (facId) return store.profiles.find((p) => p.id === facId);
    const facultyRole = store.roles.find((r) => r.key === "faculty_coordinator");
    if (!facultyRole || !currentChapter) return null;
    const chMemberIds = new Set(
      store.profiles.filter((p) => p.chapterId === currentChapter.id).map((p) => p.id),
    );
    const ur = store.userRoles.find(
      (u) => u.roleId === facultyRole.id && chMemberIds.has(u.userId),
    );
    return ur ? store.profiles.find((p) => p.id === ur.userId) : null;
  }, [selectedEvent?.facultyId, currentChapter, store.profiles, store.roles, store.userRoles]);

  // Auto-fill sensible outcomes when event is selected if outcomes is empty
  useEffect(() => {
    if (selectedEvent && !outcomes.trim()) {
      setOutcomes(
        `Successfully hosted ${selectedEvent.title} with high student engagement, hands-on activities, and positive peer collaboration.`,
      );
    }
  }, [selectedEvent, outcomes]);

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading reports...</p>
      </div>
    );
  }

  if (!chapter) {
    return <ChapterNotFound />;
  }

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function handleNewManual() {
    const title = "Untitled chapter report";
    const html = emptyManualReportHtml(title);
    const report = createReportDraft({
      chapterId: currentChapter!.id,
      type: "monthly" as ReportType,
      title,
      bodyHtml: html,
      source: "manual",
      submittedBy: session.userId,
    });
    setWizardOpen(false);
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

  function handleGenerate(autoSubmit = false) {
    setWizardError("");
    if (!selectedEvent) {
      setWizardError("Please select an event to generate the report.");
      return;
    }
    const outcomesText =
      outcomes.trim() ||
      `Official activity report and event outcomes for ${selectedEvent.title} at ${currentChapter!.name}.`;

    const analytics = selectedAnalytics || extractEventReportAnalytics(store, selectedEvent);

    const isVolunteer = isUserAppointedVolunteerForEvent(
      store,
      session.userId,
      selectedEvent.id,
    );

    const built = buildStudentEventReportHtml(store, selectedEvent, {
      outcomes: outcomesText,
      attendanceNote: attendanceNote.trim() || undefined,
      authorName: profile?.fullName ?? "Volunteer",
      chapterName: currentChapter!.name,
      images,
      leadDescription: analytics.campusLeadDescription,
      goodComments: analytics.feedback.goodComments,
      badReviews: analytics.feedback.badReviews,
      isVolunteer,
    });

    const report = generateStudentEventReport({
      chapterId: currentChapter!.id,
      eventId: selectedEvent.id,
      outcomes: outcomesText,
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

    if (autoSubmit) {
      submitReportDraft(report.id, session.userId);
      flashMsg("Report generated & submitted to Faculty Coordinator");
    } else {
      router.push(`/chapter/${slug}/reports/${report.id}`);
    }
  }

  async function handleDownload(reportId: string, forCollege = false) {
    const report = store.reports.find((r) => r.id === reportId);
    if (!report) return;
    const approver = store.profiles.find((p) => p.id === report.approvedBy);
    await downloadReportDocx({
      report,
      chapterName: currentChapter!.name,
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
            ? "Review and approve chapter event reports, or download approved reports as Word documents for college administration."
            : "Write Word-like reports, auto-generate from events with attendance ratios and reviews, submit to Faculty Coordinator, and download .docx."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)] font-medium">
                {flash}
              </span>
            ) : null}
            {canCreateReport && !isFaculty ? (
              <div className="flex flex-wrap items-center gap-2">
                {isExecOrHq ? (
                  <Button variant="ghost" onClick={handleNewManual}>
                    Blank manual report
                  </Button>
                ) : null}
                <Button variant="orange" onClick={() => setWizardOpen(true)}>
                  New report
                </Button>
              </div>
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
                : "No reports yet. Click 'New report' to select an event and generate an activity report."}
            </p>
            {canCreateReport && !isFaculty ? (
              <Button
                variant="orange"
                className="mt-4"
                onClick={() => setWizardOpen(true)}
              >
                New report
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
              const isVolunteerForThisEvent = Boolean(
                report.eventId && appointedEventIds.has(report.eventId),
              );
              const canSubmitThisReport =
                (canSubmit && (report.submittedBy === session.userId || isExecOrHq)) ||
                isVolunteerForThisEvent;

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
                      {isVolunteerForThisEvent && report.status !== "approved" ? (
                        <Badge tone="orange">Appointed Volunteer</Badge>
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
                        Faculty review note: {report.hqComment}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link href={`/chapter/${slug}/reports/${report.id}`}>
                      <Button variant="ghost">Open</Button>
                    </Link>
                    {isFaculty && report.status === "submitted" ? (
                      <Link href={`/chapter/${slug}/reports/${report.id}`}>
                        <Button variant="orange">
                          Review & Approve
                        </Button>
                      </Link>
                    ) : null}
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
                    {canSubmitThisReport &&
                    (report.status === "draft" ||
                      report.status === "changes_requested") ? (
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (submitReportDraft(report.id, session.userId)) {
                            flashMsg("Submitted to Faculty Coordinator");
                          }
                        }}
                      >
                        {report.status === "changes_requested"
                          ? "Resubmit to Faculty"
                          : "Submit to Faculty"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>

      {/* Interactive Event Selection & Report Generation Modal */}
      <Dialog
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setWizardError("");
        }}
        title="Generate Report from Event"
        description="Select an event to automatically load attendance ratios, the campus lead description, and attendee feedback (good comments & bad reviews)."
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* 1. Event Selector */}
          <div>
            <FieldLabel>Select Event</FieldLabel>
            <Select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="font-medium"
            >
              <option value="">Choose an event to load data…</option>
              {chapterEvents.map((e) => {
                const isAppointed = appointedEventIds.has(e.id);
                return (
                  <option key={e.id} value={e.id}>
                    {isAppointed ? "★ [Your Appointed Event] " : ""}
                    {e.title} ({formatDate(e.startsAt)})
                  </option>
                );
              })}
            </Select>
            {isVolunteerForSelected ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--accent)] font-medium">
                <CheckCircle2 size={13} /> You are an appointed volunteer for this event with full authoring and submission rights.
              </p>
            ) : null}
          </div>

          {/* Assigned Faculty Coordinator Info Card */}
          {selectedEvent ? (
            <div className="rounded-xl border border-cyan/30 bg-cyan/5 p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-cyan shrink-0" />
                <div>
                  <p className="font-semibold text-text">
                    Reviewer: {assignedFaculty ? assignedFaculty.fullName : "Chapter Faculty Coordinator"}
                  </p>
                  <p className="text-[11px] text-text-dim">
                    {assignedFaculty?.email ? assignedFaculty.email : "Assigned faculty coordinator will review and approve this report"}
                  </p>
                </div>
              </div>
              <Badge tone="cyan">Faculty Reviewer</Badge>
            </div>
          ) : null}

          {/* Dynamic Event Data Display when selected */}
          {selectedEvent && selectedAnalytics ? (
            <div className="space-y-3 pt-1">
              {/* Card 1: Attendance Ratio */}
              <div className="rounded-xl border border-border bg-bg-panel p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                    <Users size={15} className="text-[var(--accent)]" />
                    <span>Attendance & Turnout Ratio</span>
                  </div>
                  <Badge
                    tone={
                      selectedAnalytics.attendanceRatio.turnoutPercentage >= 75
                        ? "green"
                        : "orange"
                    }
                  >
                    {selectedAnalytics.attendanceRatio.ratioText}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                      style={{
                        width: `${Math.max(5, selectedAnalytics.attendanceRatio.turnoutPercentage)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-text-dim">
                    <span>
                      Present: <strong>{selectedAnalytics.attendanceRatio.present}</strong>
                    </span>
                    <span>
                      Approved: <strong>{selectedAnalytics.attendanceRatio.approved}</strong> / Registered: {selectedAnalytics.attendanceRatio.registered}
                    </span>
                    <span>
                      Capacity: {selectedEvent.capacity || "Open"}
                      {selectedAnalytics.attendanceRatio.isFullHouse ? " (Full House)" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Campus Lead Description */}
              <div className="rounded-xl border border-border bg-bg-panel p-3.5 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                    <FileText size={15} className="text-cyan" />
                    <span>Description (by Campus Lead)</span>
                  </div>
                  <Badge tone="cyan">Event Form Input</Badge>
                </div>
                <blockquote className="rounded-lg border-l-2 border-[var(--accent)] bg-bg-subtle/70 px-3 py-2 text-[12px] text-text italic leading-relaxed">
                  &ldquo;{selectedAnalytics.campusLeadDescription}&rdquo;
                </blockquote>
              </div>

              {/* Card 3: Feedback Analysis (Good Comments & Bad Reviews) */}
              <div className="rounded-xl border border-border bg-bg-panel p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                    <MessageSquare size={15} className="text-[var(--secondary)]" />
                    <span>Participant Feedback & Reviews</span>
                  </div>
                  {selectedAnalytics.feedback.averageRating ? (
                    <Badge tone="orange">
                      ★ {selectedAnalytics.feedback.averageRating} / 5.0 Rating
                    </Badge>
                  ) : (
                    <Badge tone="mute">
                      {selectedAnalytics.feedback.hasRealResponses
                        ? `${selectedAnalytics.feedback.totalResponses} submissions`
                        : "Synthesized Insights"}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Good Comments */}
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ThumbsUp size={13} />
                      <span>Good Comments & Praises</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedAnalytics.feedback.goodComments.map((comment, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-text leading-tight">
                          <span className="text-emerald-500 shrink-0 font-bold">•</span>
                          <span>{comment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bad Reviews */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                      <AlertCircle size={13} />
                      <span>Bad Reviews & Areas to Improve</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedAnalytics.feedback.badReviews.map((review, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-text leading-tight">
                          <span className="text-amber-500 shrink-0 font-bold">•</span>
                          <span>{review}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 4. Outcomes and Highlights input */}
          <div>
            <FieldLabel>Outcomes / Key Highlights</FieldLabel>
            <TextArea
              rows={3}
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              placeholder="Summary of accomplishments, student projects, learnings, and next milestones…"
            />
          </div>

          {/* 5. Attendance Note */}
          <div>
            <FieldLabel>Attendance Note (Optional)</FieldLabel>
            <Input
              value={attendanceNote}
              onChange={(e) => setAttendanceNote(e.target.value)}
              placeholder="e.g. Full hall, active volunteer coordination, zero dropouts"
            />
          </div>

          {/* 6. Photos */}
          <div>
            <FieldLabel>Event Photos (up to 4)</FieldLabel>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void onPickImages(e.target.files)}
              className="block w-full text-[12px] text-text-dim file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border file:border-border file:text-[12px] file:bg-bg-subtle hover:file:bg-bg-hover"
            />
            {images.length ? (
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-border bg-bg-subtle shadow-xs"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="h-16 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white text-[10px] hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      ✕
                    </button>
                    <div className="p-1 truncate text-[10px] text-text-dim text-center">
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {wizardError ? (
            <p className="text-[13px] font-medium text-[var(--accent)]">{wizardError}</p>
          ) : null}

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            {isExecOrHq ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleNewManual}
                className="text-[12px]"
              >
                Start blank report
              </Button>
            ) : (
              <div />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWizardOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleGenerate(false)}
                disabled={!selectedEvent}
              >
                Generate draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleGenerate(true)}
                disabled={!selectedEvent}
              >
                Generate & Submit to Faculty
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

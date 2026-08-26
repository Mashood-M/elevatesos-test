"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { FormSharePanel } from "@/components/domain/form-share-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isFacultyRole } from "@/lib/access";
import { canRegisterNow } from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { formatDateTime } from "@/lib/utils";
import type { EventAttendanceSession, EventItem, EventStatus, RegistrationStatus, Visibility } from "@/types";


function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] bg-bg px-4 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-text-dim">{hint}</p> : null}
    </div>
  );
}

type EventDraft = {
  title: string;
  category: string;
  description: string;
  venue: string;
  capacity: string;
  waitlistCapacity: string;
  visibility: Visibility;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  registrationStart: string;
  registrationEnd: string;
  certificateEnabled: boolean;
  topics: string;
  eventType: "standalone" | "main" | "sub";
  parentEventId: string;
  attendanceSessions: EventAttendanceSession[];
  hasPlatform: boolean;
  hasCaseStudy: boolean;
  platformName: string;
  caseStudySlug: string;
  tagline: string;
  liveUrl: string;
  repoUrl: string;
  highlightMetric: string;
  architectureSummary: string;
};

function draftFromEvent(event: EventItem): EventDraft {
  const status =
    event.status === "pending_approval"
      ? "registration_open"
      : event.status;
  return {
    title: event.title,
    category: event.category,
    description: event.description,
    venue: event.venue,
    capacity: String(event.capacity),
    waitlistCapacity: String(event.waitlistCapacity),
    visibility: event.visibility,
    status,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    registrationStart: toLocalInput(event.registrationStart),
    registrationEnd: toLocalInput(event.registrationEnd),
    certificateEnabled: event.certificateEnabled,
    topics: event.topics ? event.topics.join(", ") : "",
    eventType: event.eventType ?? "standalone",
    parentEventId: event.parentEventId ?? "",
    attendanceSessions: event.attendanceSessions && event.attendanceSessions.length > 0
      ? event.attendanceSessions
      : [{ id: "sess-1", name: "Main Arrival Check-In", time: "09:30 AM", isRequired: true }],
    hasPlatform: !!(event.platform?.enabled || event.caseStudy?.enabled),
    hasCaseStudy: !!event.caseStudy?.enabled,
    platformName: event.platform?.platformName ?? event.caseStudy?.platformName ?? "",
    caseStudySlug: event.caseStudy?.caseStudySlug ?? "",
    tagline: event.platform?.tagline ?? event.caseStudy?.tagline ?? "",
    liveUrl: event.platform?.liveUrl ?? event.caseStudy?.liveUrl ?? "",
    repoUrl: event.platform?.repoUrl ?? event.caseStudy?.repoUrl ?? "",
    highlightMetric: event.platform?.highlightMetric ?? event.caseStudy?.highlightMetric ?? "",
    architectureSummary: event.platform?.architectureSummary ?? event.caseStudy?.architectureSummary ?? "",
  };
}



const STATUS_OPTIONS: EventStatus[] = [
  "draft",
  "approved",
  "registration_open",
  "registration_closed",
  "completed",
  "cancelled",
];

function regStatusTone(
  status: RegistrationStatus,
): "green" | "orange" | "mute" | "cyan" {
  if (status === "approved") return "green";
  if (status === "waitlisted") return "mute";
  if (status === "rejected") return "mute";
  if (status === "reviewed") return "cyan";
  return "orange";
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = use(params);
  const router = useRouter();
  const {
    store,
    createForm,
    updateEvent,
    updateRegistrationStatus,
    setFormStatus,
    sendEventReminders,
  } = useStore();
  const { session } = useCurrentUser();

  const chapter = store.chapters.find(
    (c) => c.slug === slug || c.id === slug,
  ) ?? store.chapters[0];

  const event = store.events.find(
    (e) =>
      e.id === eventId ||
      e.slug === eventId ||
      e.id === `evt-${eventId}` ||
      (e.slug && e.slug.toLowerCase() === eventId.toLowerCase()),
  );


  const isFaculty = isFacultyRole(session.roleKey);
  const canEdit = hasPermission(store, session.roleKey, "event.manage");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canAttendance = hasPermission(
    store,
    session.roleKey,
    "attendance.verify",
  );
  const isOps = canEdit || canReview || canApprove;
  const isFacultyMonitor = isFaculty && !isOps;
  const isStudentView = !isOps && !isFacultyMonitor;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [queueFlash, setQueueFlash] = useState("");
  const [publishFlash, setPublishFlash] = useState("");
  const [qrCopied, setQrCopied] = useState(false);

  useEffect(() => {
    if (event && !editing) {
      setDraft(draftFromEvent(event));
    }
  }, [event, editing]);

  const regs = useMemo(
    () => (event ? store.registrations.filter((r) => r.eventId === event.id) : []),
    [store.registrations, event],
  );

  if (!chapter || !event) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Event not found</p>
        <Link
          href={`/chapter/${slug}/events`}
          className="mt-2 inline-block text-[var(--accent)]"
        >
          Back to events
        </Link>
      </div>
    );
  }


  const approved = regs.filter((r) => r.status === "approved").length;
  const waitlisted = regs.filter((r) => r.status === "waitlisted").length;
  const pending = regs.filter(
    (r) => r.status === "pending" || r.status === "reviewed",
  ).length;
  const seatsLeft = Math.max(0, event.capacity - approved);
  const regForm = getEventForm(store, event.id, "registration");
  const fbForm = getEventForm(store, event.id, "feedback");
  const myReg = regs.find((r) => r.userId === session.userId);
  const organizer = store.profiles.find((p) => p.id === event.organizerId);
  const queue = regs.filter(
    (r) => r.status === "pending" || r.status === "reviewed",
  );
  const eligibility = canRegisterNow(store, event, session.userId);

  function startEdit() {
    setDraft(draftFromEvent(event!));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(draftFromEvent(event!));
    setEditing(false);
  }

  function saveEdit() {
    if (!draft || !draft.title.trim() || !draft.venue.trim()) return;
    const topics = draft.topics
      ? draft.topics.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const isPlatformActive = draft.hasPlatform || draft.hasCaseStudy;
    const platformData = isPlatformActive
      ? {
          enabled: true,
          platformName: draft.platformName || draft.title,
          tagline: draft.tagline,
          liveUrl: draft.liveUrl,
          repoUrl: draft.repoUrl,
          highlightMetric: draft.highlightMetric,
          architectureSummary: draft.architectureSummary,
        }
      : undefined;

    updateEvent(event!.id, {
      title: draft.title.trim(),
      category: draft.category.trim() || event!.category,
      description: draft.description.trim(),
      venue: draft.venue.trim(),
      capacity: Math.max(1, parseInt(draft.capacity, 10) || event!.capacity),
      waitlistCapacity: Math.max(
        0,
        parseInt(draft.waitlistCapacity, 10) || 0,
      ),
      visibility: draft.visibility,
      status: draft.status,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      registrationStart: fromLocalInput(draft.registrationStart),
      registrationEnd: fromLocalInput(draft.registrationEnd),
      certificateEnabled: draft.certificateEnabled,
      topics,
      eventType: draft.eventType,
      parentEventId: draft.eventType === "sub" ? draft.parentEventId || undefined : undefined,
      attendanceSessions: draft.attendanceSessions,
      platform: platformData,


      caseStudy: isPlatformActive
        ? {
            enabled: true,
            platformName: draft.platformName || draft.title,
            tagline: draft.tagline,
            caseStudySlug:
              draft.caseStudySlug ||
              draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            liveUrl: draft.liveUrl,
            repoUrl: draft.repoUrl,
            highlightMetric: draft.highlightMetric,
            architectureSummary: draft.architectureSummary,
          }
        : undefined,
    });
    setEditing(false);
  }

  function ensureForm(purpose: "registration" | "feedback") {
    const existing = getEventForm(store, event!.id, purpose);
    if (existing) {
      router.push(`/chapter/${slug}/forms/${existing.id}`);
      return;
    }
    const defaults = defaultFormsForEvent(
      event!.id,
      chapter!.id,
      event!.title,
    );
    const template = defaults.find((f) => f.purpose === purpose)!;
    const created = createForm({
      ...template,
      id: template.id,
      status: "open",
    });
    router.push(`/chapter/${slug}/forms/${created.id}`);
  }

  function publishEvent() {
    setPublishFlash("");
    const existing = getEventForm(store, event!.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        event!.id,
        chapter!.id,
        event!.title,
      ).find((f) => f.purpose === "registration")!;
      createForm({
        ...template,
        id: template.id,
        status: "open",
      });
      setPublishFlash("Published — registration form created and opened.");
    } else if (existing.status !== "open") {
      setFormStatus(existing.id, "open");
      setPublishFlash("Published — registration form reopened.");
    } else {
      setPublishFlash("Published — registration is open.");
    }
    updateEvent(event!.id, { status: "registration_open" });
  }

  function handleRegAction(regId: string, status: RegistrationStatus) {
    setQueueFlash("");
    const result = updateRegistrationStatus(regId, status, session.userId);
    if (!result.ok) {
      setQueueFlash(result.message);
      return;
    }
    if (status === "approved" && result.status === "waitlisted") {
      setQueueFlash(
        "Seats full — registrant moved to the waitlist (no QR yet).",
      );
    }
  }

  async function copyQr(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setQrCopied(true);
      window.setTimeout(() => setQrCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  const parentEvent = event.parentEventId
    ? store.events.find((e) => e.id === event.parentEventId)
    : null;
  const subEvents = store.events.filter((e) => e.parentEventId === event.id);

  const detailsReadonly = (
    <>
      {parentEvent ? (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-[12px] border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3.5 py-2.5 text-[12px]">
          <div>
            <span className="font-semibold text-[var(--accent)]">⚡ Sub-Event of Flagship:</span>{" "}
            <span className="font-medium text-text">{parentEvent.title}</span>
          </div>
          <Link
            href={`/chapter/${slug}/events/${parentEvent.id}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            View Main Event →
          </Link>
        </div>
      ) : null}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Scope</dt>
          <dd className="font-medium">
            {event.eventType === "main"
              ? "🏆 Main Flagship Event"
              : event.eventType === "sub"
              ? "⚡ Sub-Event"
              : "🌟 Standalone Event"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Starts</dt>
          <dd>{formatDateTime(event.startsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Ends</dt>
          <dd>{formatDateTime(event.endsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Venue</dt>
          <dd>{event.venue}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Registration</dt>
          <dd className="text-right text-[13px]">
            Closes {new Date(event.registrationEnd).toLocaleDateString()}
          </dd>
        </div>
        {!isStudentView ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-text-dim">Visibility</dt>
              <dd className="capitalize">
                {event.visibility.replaceAll("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-dim">Ticket</dt>
              <dd>{event.ticketNo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-dim">Organizer</dt>
              <dd>{organizer?.fullName ?? event.organizerId}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {event.topics && event.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.topics.map((t) => (
            <Badge key={t} tone="mute">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Custom Built Platform / Web App Showcase */}
      {(event.platform?.enabled || event.caseStudy?.enabled) ? (
        <div className="mt-4 rounded-[12px] border border-border/80 bg-bg-panel p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                🚀 Custom Built Platform / Live Web App
              </span>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {event.platform?.platformName || event.caseStudy?.platformName || event.title}
              </p>
              {(event.platform?.tagline || event.caseStudy?.tagline) ? (
                <p className="text-[12px] text-text-dim">
                  {event.platform?.tagline || event.caseStudy?.tagline}
                </p>
              ) : null}
            </div>
            {(event.platform?.highlightMetric || event.caseStudy?.highlightMetric) ? (
              <Badge tone="orange">
                {event.platform?.highlightMetric || event.caseStudy?.highlightMetric}
              </Badge>
            ) : null}
          </div>
          {(event.platform?.architectureSummary || event.caseStudy?.architectureSummary) ? (
            <p className="mt-2 text-[12px] text-text-mute">
              {event.platform?.architectureSummary || event.caseStudy?.architectureSummary}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            {(event.platform?.liveUrl || event.caseStudy?.liveUrl) ? (
              <a
                href={event.platform?.liveUrl || event.caseStudy?.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Launch Live App ↗
              </a>
            ) : null}
            {(event.platform?.repoUrl || event.caseStudy?.repoUrl) ? (
              <a
                href={event.platform?.repoUrl || event.caseStudy?.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-dim hover:text-text hover:underline"
              >
                GitHub Source ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Sub-Events List (if this is a main flagship event) */}
      {subEvents.length > 0 ? (
        <div className="mt-4 rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12px] font-semibold text-text">
              ⚡ Sub-Events Track ({subEvents.length})
            </p>
            <Link
              href={`/chapter/${slug}/events?create=1`}
              className="text-[11px] text-[var(--accent)] hover:underline"
            >
              + Add Sub-Event
            </Link>
          </div>
          <div className="space-y-2">
            {subEvents.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-[10px] border border-border/60 bg-bg-panel px-3 py-2 text-[12px]"
              >
                <div>
                  <span className="font-medium text-text">{sub.title}</span>
                  <span className="ml-1.5 text-[10px] text-text-dim">
                    · {sub.category} · {sub.venue}
                  </span>
                  {sub.platform?.enabled && sub.platform.liveUrl ? (
                    <span className="ml-1.5 text-[10px] text-[var(--accent)]">
                      (Live App ↗)
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/chapter/${slug}/events/${sub.id}`}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {event.description ? (
        <p className="mt-4 text-[13px] leading-relaxed text-text-dim">
          {event.description}
        </p>
      ) : null}
    </>
  );

  if (isStudentView) {
    return (
      <div>
        <PageHeader
          title={event.title}
          description={`${event.category} · ${event.venue}`}
          actions={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={`/chapter/${slug}/events`}
                className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
              >
                ← Events
              </Link>
              {eligibility.ok ? (
                <Link href={`/f/${eligibility.formId}`}>
                  <Button variant="orange" className="h-8 px-3 text-[12px]">
                    Register
                  </Button>
                </Link>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <TicketCard
              event={event}
              meta={`${seatsLeft} seats left · closes ${new Date(event.registrationEnd).toLocaleDateString()}`}
            />
            <TerminalPanel title="about">
              {event.description ? (
                <p className="text-[13px] leading-relaxed text-text-dim">
                  {event.description}
                </p>
              ) : (
                <p className="text-[13px] text-text-dim">No description yet.</p>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Starts</dt>
                  <dd>{formatDateTime(event.startsAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Ends</dt>
                  <dd>{formatDateTime(event.endsAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Venue</dt>
                  <dd>{event.venue}</dd>
                </div>
              </dl>
              {!eligibility.ok &&
              event.status === "registration_open" &&
              (!myReg || myReg.status === "rejected") ? (
                <p className="mt-4 text-[12px] text-text-mute">
                  {eligibility.reason}
                </p>
              ) : null}
            </TerminalPanel>
          </div>

          <TerminalPanel
            title="your registration"
            meta={myReg && myReg.status !== "rejected" ? myReg.status : "none"}
          >
            {!myReg || myReg.status === "rejected" ? (
              <p className="text-[13px] text-text-dim">
                {myReg?.status === "rejected"
                  ? "Your previous registration was rejected. Use Register above if the form is still open."
                  : eligibility.ok
                    ? "You are not registered yet — use Register above."
                    : eligibility.reason}
              </p>
            ) : (
              <div className="space-y-3">
                <Badge tone={regStatusTone(myReg.status)}>
                  {myReg.status.replaceAll("_", " ")}
                </Badge>
                {myReg.status === "pending" ? (
                  <p className="text-[13px] text-text-dim">
                    Waiting for class representative review.
                  </p>
                ) : null}
                {myReg.status === "reviewed" ? (
                  <p className="text-[13px] text-text-dim">
                    Reviewed — waiting for secretary approval.
                  </p>
                ) : null}
                {myReg.status === "waitlisted" ? (
                  <p className="text-[13px] text-text-dim">
                    You are on the waitlist. A seat may open if someone drops.
                  </p>
                ) : null}
                {myReg.status === "approved" && myReg.qrCode ? (
                  <div className="rounded-[14px] border border-border bg-bg px-4 py-5">
                    <p className="text-center text-[11px] font-medium uppercase tracking-wider text-text-mute">
                      Your check-in QR
                    </p>
                    <div className="mx-auto mt-3 w-fit rounded-[12px] border border-border bg-white p-3">
                      <QRCode
                        value={myReg.qrCode}
                        size={160}
                        style={{ height: "auto", width: 160 }}
                      />
                    </div>
                    <p className="mt-3 break-all text-center font-[family-name:var(--font-mono)] text-[12px] font-semibold tracking-wide text-text">
                      {myReg.qrCode}
                    </p>
                    <p className="mt-1 text-center text-[12px] text-text-dim">
                      Show this at the door, or copy the code for desk check-in.
                    </p>
                    <div className="mt-3 flex justify-center">
                      <Button
                        variant="ghost"
                        className="h-9 px-4"
                        onClick={() => copyQr(myReg.qrCode)}
                      >
                        {qrCopied ? "Copied" : "Copy code"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {myReg.status === "approved" && !myReg.qrCode ? (
                  <p className="text-[13px] text-text-dim">
                    Approved — check-in code will appear here when minted.
                  </p>
                ) : null}
              </div>
            )}
            {event.status === "completed" && fbForm?.status === "open" ? (
              <Link
                href={`/f/${fbForm.id}`}
                className="mt-4 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Give feedback →
              </Link>
            ) : null}
          </TerminalPanel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={event.title}
        description={`${event.category} · ${event.venue}${
          event.progressStage ? ` · EOS stage: ${event.progressStage}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-text-dim">
              <Link
                href={`/chapter/${slug}/events`}
                className="hover:text-[var(--accent)]"
              >
                ← Events
              </Link>
              {canAttendance ? (
                <Link
                  href={`/chapter/${slug}/attendance?eventId=${event.id}`}
                  className="hover:text-[var(--accent)]"
                >
                  Attendance
                </Link>
              ) : null}
              {canEdit || canApprove ? (
                <button
                  type="button"
                  className="hover:text-[var(--accent)]"
                  onClick={() => {
                    const n = sendEventReminders(event.id);
                    setQueueFlash(
                      n
                        ? `Queued ${n} reminder messages (email + WhatsApp demo).`
                        : "No approved registrants to remind.",
                    );
                  }}
                >
                  Send reminders
                </button>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="ghost"
                      className="h-8 px-3 text-[12px]"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="h-8 px-3 text-[12px]"
                      onClick={saveEdit}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    {(event.status === "draft" ||
                      event.status === "pending_approval" ||
                      event.status === "approved") && (
                      <Button
                        variant="orange"
                        className="h-8 px-3 text-[12px]"
                        onClick={publishEvent}
                      >
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      className="h-8 px-3 text-[12px]"
                      onClick={startEdit}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        }
      />

      {publishFlash || queueFlash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">
          {queueFlash || publishFlash}
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered" value={regs.length} hint={`${pending} in queue`} />
        <Stat label="Approved" value={approved} hint={`${waitlisted} waitlist`} />
        <Stat
          label="Capacity"
          value={`${seatsLeft} left`}
          hint={`${event.capacity} seats · wl ${event.waitlistCapacity}`}
        />
        <Stat
          label="Reg closes"
          value={new Date(event.registrationEnd).toLocaleDateString()}
          hint={`Opened ${new Date(event.registrationStart).toLocaleDateString()}`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <TerminalPanel
          title="event.details"
          meta={editing ? "editing" : event.status}
          accent={editing ? "orange" : undefined}
        >
          {editing && draft && canEdit ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 rounded-[10px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                <FieldLabel>Event Scope / Hierarchy</FieldLabel>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "standalone"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, eventType: "standalone", parentEventId: "" } : d,
                      )
                    }
                  >
                    🌟 Standalone
                  </button>
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "main"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, eventType: "main", parentEventId: "" } : d,
                      )
                    }
                  >
                    🏆 Main Flagship
                  </button>
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "sub"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) => (d ? { ...d, eventType: "sub" } : d))
                    }
                  >
                    ⚡ Sub-Event
                  </button>
                </div>
                {draft.eventType === "sub" ? (
                  <div className="mt-2.5">
                    <FieldLabel>Parent Main Event</FieldLabel>
                    <Select
                      value={draft.parentEventId}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, parentEventId: e.target.value } : d,
                        )
                      }
                    >
                      <option value="">Select parent flagship event…</option>
                      {store.events
                        .filter(
                          (ev) =>
                            ev.chapterId === chapter.id && ev.id !== event.id,
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            🏆 {m.title}
                          </option>
                        ))}
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                  }
                />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <Input
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, category: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Venue</FieldLabel>
                <Input
                  value={draft.venue}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, venue: e.target.value } : d))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Capacity</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 100"
                  value={draft.capacity}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, capacity: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Waitlist capacity</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 15"
                  value={draft.waitlistCapacity}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, waitlistCapacity: e.target.value } : d,
                    )
                  }
                />
              </div>

              <div>
                <FieldLabel>Visibility</FieldLabel>
                <Select
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            visibility: e.target.value as Visibility,
                          }
                        : d,
                    )
                  }
                >
                  <option value="chapter_only">Chapter Only</option>
                  <option value="specific_chapters">Selected Chapters</option>
                  <option value="all_chapters">All Chapters</option>
                  <option value="public">Public</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? { ...d, status: e.target.value as EventStatus }
                        : d,
                    )
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Starts</FieldLabel>
                <Input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, startsAt: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Ends</FieldLabel>
                <Input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, endsAt: e.target.value } : d))
                  }
                />
              </div>
              <div>
                <FieldLabel>Registration opens</FieldLabel>
                <Input
                  type="datetime-local"
                  value={draft.registrationStart}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, registrationStart: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Registration closes</FieldLabel>
                <Input
                  type="datetime-local"
                  value={draft.registrationEnd}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, registrationEnd: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Topics / Tags (comma-separated)</FieldLabel>
                <Input
                  placeholder="e.g. AI, Full-Stack, Web3, Career"
                  value={draft.topics}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, topics: e.target.value } : d,
                    )
                  }
                />
              </div>

              {/* Custom Built Platform / Web App in Edit Mode */}
              <div className="md:col-span-2 rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
                <label className="flex items-center gap-2 text-[13px] font-medium text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.hasPlatform || draft.hasCaseStudy}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              hasPlatform: e.target.checked,
                              hasCaseStudy: e.target.checked,
                            }
                          : d,
                      )
                    }
                    className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                  />
                  <span>💻 Built a custom platform / web app for this {draft.eventType === "sub" ? "sub-event" : "event"}</span>
                </label>
                <p className="mt-1 text-[11px] text-text-dim">
                  Enable if your team built a custom web app (e.g. QR Hunt Scanner, Live Leaderboard, Battle Arena) for this event.
                </p>

                {(draft.hasPlatform || draft.hasCaseStudy) ? (
                  <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Platform / App Name</FieldLabel>
                      <Input
                        placeholder={
                          draft.eventType === "sub"
                            ? "e.g. Vibranium QR Treasure Hunt Engine"
                            : "e.g. Vibranium Portal / Celestia Platform"
                        }
                        value={draft.platformName}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, platformName: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Live Web App URL</FieldLabel>
                      <Input
                        placeholder="https://hunt.vibranium.live or https://..."
                        value={draft.liveUrl}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, liveUrl: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Highlight Metric / Feature</FieldLabel>
                      <Input
                        placeholder="e.g. 120+ Teams · Real-time GPS & QR Scanner"
                        value={draft.highlightMetric}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, highlightMetric: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Source Code / GitHub Repo</FieldLabel>
                      <Input
                        placeholder="https://github.com/..."
                        value={draft.repoUrl}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, repoUrl: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Architecture / Tech Stack Highlights</FieldLabel>
                      <Input
                        placeholder="e.g. Next.js 15, WebSockets, Supabase Realtime, Geolocation API"
                        value={draft.architectureSummary}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  architectureSummary: e.target.value,
                                }
                              : d,
                          )
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-text-dim">
                  <input
                    type="checkbox"
                    checked={draft.certificateEnabled}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? { ...d, certificateEnabled: e.target.checked }
                          : d,
                      )
                    }
                    className="accent-[var(--accent)]"
                  />
                  Certificates enabled
                </label>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button variant="primary" onClick={saveEdit}>
                  Save changes
                </Button>
                <Button variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {detailsReadonly}
              {canEdit ? (
                <Button variant="ghost" className="mt-4" onClick={startEdit}>
                  Edit details
                </Button>
              ) : null}
            </>
          )}
        </TerminalPanel>

        {isOps ? (
          <TerminalPanel title="linked.forms" accent="orange">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]">
                <div>
                  <p className="font-semibold">Registration</p>
                  <p className="text-[12px] text-text-dim">
                    {regForm
                      ? `${regForm.title} · ${regForm.status}`
                      : "Not created yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button
                      variant="primary"
                      onClick={() => ensureForm("registration")}
                    >
                      {regForm ? "Manage form" : "Create form"}
                    </Button>
                  ) : null}
                  {regForm?.status === "open" ? (
                    <Link href={`/f/${regForm.id}`}>
                      <Button variant="ghost">Public fill</Button>
                    </Link>
                  ) : null}
                  {canEdit && regForm ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setFormStatus(
                          regForm.id,
                          regForm.status === "open" ? "closed" : "open",
                        )
                      }
                    >
                      {regForm.status === "open" ? "Close" : "Open"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {regForm?.status === "open" ? (
                <FormSharePanel formId={regForm.id} title="Registration link" />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]">
                <div>
                  <p className="font-semibold">Feedback</p>
                  <p className="text-[12px] text-text-dim">
                    {fbForm
                      ? `${fbForm.title} · ${fbForm.status}`
                      : "Not created yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button
                      variant="orange"
                      onClick={() => ensureForm("feedback")}
                    >
                      {fbForm ? "Manage form" : "Create form"}
                    </Button>
                  ) : null}
                  {fbForm?.status === "open" ? (
                    <Link href={`/f/${fbForm.id}`}>
                      <Button variant="ghost">Public fill</Button>
                    </Link>
                  ) : null}
                  {canEdit && fbForm ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setFormStatus(
                          fbForm.id,
                          fbForm.status === "open" ? "closed" : "open",
                        )
                      }
                    >
                      {fbForm.status === "open" ? "Close" : "Open"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {fbForm?.status === "open" ? (
                <FormSharePanel formId={fbForm.id} title="Feedback link" />
              ) : null}

              <Link href={`/chapter/${slug}/forms`}>
                <Button variant="ghost" className="w-full">
                  Open Forms hub
                </Button>
              </Link>
            </div>
          </TerminalPanel>
        ) : (
          <TerminalPanel title="monitor" meta="read-only">
            <p className="text-[13px] leading-relaxed text-text-dim">
              Faculty liaison view — chapters publish without faculty approval.
              Monitor delivery from stats and the roster below.
            </p>
          </TerminalPanel>
        )}
      </div>

      {(canApprove || canReview) && queue.length > 0 ? (
        <TerminalPanel title="approval.queue" accent="orange" className="mb-6">
          <ul className="space-y-3">
            {queue.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]"
                >
                  <div>
                    <p className="font-bold">{user?.fullName}</p>
                    <p className="text-[11px] text-text-dim">{reg.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {reg.status === "pending" && (canReview || canApprove) ? (
                      <Button
                        variant="orange"
                        onClick={() => handleRegAction(reg.id, "reviewed")}
                      >
                        Review
                      </Button>
                    ) : null}
                    {canApprove &&
                    (reg.status === "reviewed" || reg.status === "pending") ? (
                      <Button
                        variant="green"
                        onClick={() => handleRegAction(reg.id, "approved")}
                      >
                        Approve → QR
                      </Button>
                    ) : null}
                    {(canReview || canApprove) &&
                    (reg.status === "pending" || reg.status === "reviewed") ? (
                      <Button
                        variant="danger"
                        onClick={() => handleRegAction(reg.id, "rejected")}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="roster" meta={`${regs.length} registrations`}>
        {!regs.length ? (
          <p className="text-sm text-text-dim">No registrations yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {regs.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const rep = reg.representativeId
                ? store.profiles.find((p) => p.id === reg.representativeId)
                : undefined;
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user?.fullName ?? reg.userId}
                    </p>
                    {rep ? (
                      <p className="text-[11px] text-text-dim">
                        Rep: {rep.fullName}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={regStatusTone(reg.status)}>{reg.status}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

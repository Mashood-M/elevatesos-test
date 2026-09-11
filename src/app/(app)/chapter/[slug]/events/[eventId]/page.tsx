"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { FormSharePanel } from "@/components/domain/form-share-panel";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isFacultyRole } from "@/lib/access";
import { canRegisterNow, isEventVisibleToUser } from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { formatDateTime } from "@/lib/utils";
import { Search, Users, GraduationCap, X } from "lucide-react";
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
      e.id.toLowerCase() === eventId.toLowerCase() ||
      e.slug === eventId ||
      (e.slug && e.slug.toLowerCase() === eventId.toLowerCase()) ||
      e.id === `evt-${eventId}` ||
      eventId === `evt-${e.id}`,
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
  const canPublish =
    session.roleKey === "founder" || session.roleKey === "campus_lead" || canEdit;
  const isFacultyMonitor = isFaculty && !isOps;
  const isStudentView = !isOps && !isFacultyMonitor && !isFaculty;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [queueFlash, setQueueFlash] = useState("");
  const [publishFlash, setPublishFlash] = useState("");
  const [qrCopied, setQrCopied] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>("all");
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    if (event && !editing) {
      setDraft(draftFromEvent(event));
    }
  }, [event, editing]);

  const regs = useMemo(
    () => (event ? store.registrations.filter((r) => r.eventId === event.id) : []),
    [store.registrations, event],
  );

  const registeredStudents = useMemo(() => {
    return regs.map((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      const rep = reg.representativeId
        ? store.profiles.find((p) => p.id === reg.representativeId)
        : undefined;
      return {
        reg,
        user,
        rep,
        fullName: user?.fullName || reg.guestName || "Anonymous Student",
        department: user?.department || "Unassigned",
        year: user?.year || "—",
        email: user?.email || reg.guestEmail || "—",
        phone: user?.phone || "—",
        elevatesId: user?.elevatesId,
        status: reg.status,
      };
    });
  }, [regs, store.profiles]);

  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    registeredStudents.forEach((s) => {
      if (s.department && s.department !== "Unassigned") set.add(s.department);
    });
    return Array.from(set).sort();
  }, [registeredStudents]);

  const filteredRegisteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return registeredStudents.filter((item) => {
      if (studentStatusFilter !== "all" && item.status !== studentStatusFilter) {
        return false;
      }
      if (studentDeptFilter !== "all" && item.department !== studentDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.year.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        (item.elevatesId && item.elevatesId.toLowerCase().includes(q))
      );
    });
  }, [registeredStudents, studentSearch, studentStatusFilter, studentDeptFilter]);

  if (!chapter || !event) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-text">Event not found</p>
        <p className="mt-1 text-xs text-text-dim">
          The event you are looking for does not exist or has been removed.
        </p>
        <Link
          href={session.chapterId ? `/chapter/${slug}/events` : `/events`}
          className="mt-3 inline-block text-[var(--accent)] text-sm"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const isVisible = isEventVisibleToUser(
    event,
    chapter.id,
    session.roleKey,
    session.userId,
    store.chapters,
  );

  if (!isVisible) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <span className="text-xl">🔒</span>
        </div>
        <p className="font-semibold text-text">
          {event.status === "draft" || event.status === "pending_approval"
            ? "Event is in Draft"
            : "Access Restricted"}
        </p>
        <p className="mt-1.5 text-xs text-text-dim leading-relaxed">
          {event.status === "draft" || event.status === "pending_approval"
            ? "This event has been saved as a draft and is awaiting publication by the Campus Lead before students can view it."
            : "This event is exclusive to verified members of this campus chapter."}
        </p>
        <Link
          href={`/chapter/${slug}/events`}
          className="mt-4 inline-block rounded-md bg-bg-panel px-4 py-2 text-[var(--accent)] text-xs font-semibold border border-border hover:bg-bg-hover"
        >
          Back to events
        </Link>
      </div>
    );
  }


  const approved = regs.filter((r) => r.status === "approved").length;
  const waitlisted = regs.filter((r) => r.status === "waitlisted").length;
  const seatsLeft = Math.max(0, event.capacity - approved);
  const regForm = getEventForm(store, event.id, "registration");
  const fbForm = getEventForm(store, event.id, "feedback");
  const myReg = regs.find((r) => r.userId === session.userId);
  const organizer = store.profiles.find((p) => p.id === event.organizerId);
  const queue = regs.filter((r) => r.status === "waitlisted");
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
                href={session.chapterId ? `/chapter/${slug}/events` : `/events`}
                className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
              >
                ← Events
              </Link>
              {myReg && myReg.status !== "rejected" ? (
                <Badge tone={regStatusTone(myReg.status)}>
                  {myReg.status === "approved" ? "Confirmed Pass" : myReg.status.replaceAll("_", " ")}
                </Badge>
              ) : event.status === "completed" ? (
                <Badge tone="mute">Event Completed</Badge>
              ) : event.status === "cancelled" ? (
                <Badge tone="magenta">Event Cancelled</Badge>
              ) : event.status === "draft" && canPublish ? (
                <Button
                  variant="orange"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => publishEvent()}
                >
                  Publish → Open Registration
                </Button>
              ) : (
                <Button
                  variant="orange"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => setRegisterOpen(true)}
                >
                  Register
                </Button>
              )}
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <TicketCard
              event={event}
              meta={`${seatsLeft} seats left · closes ${new Date(event.registrationEnd).toLocaleDateString()}`}
              hideStatus={true}
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
              <div className="space-y-3">
                <p className="text-[13px] text-text-dim">
                  {myReg?.status === "rejected"
                    ? "Your previous registration was rejected. Use Register above if the form is still open."
                    : eligibility.ok
                      ? "You are not registered yet — register now with your student profile."
                      : eligibility.reason}
                </p>
                {event.status !== "completed" && event.status !== "cancelled" ? (
                  <Button
                    variant="orange"
                    className="h-8 px-3 text-[12px]"
                    onClick={() => setRegisterOpen(true)}
                  >
                    Register now
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <Badge tone={regStatusTone(myReg.status)}>
                  {myReg.status.replaceAll("_", " ")}
                </Badge>
                {myReg.status === "waitlisted" ? (
                  <p className="text-[13px] text-amber-500 font-medium">
                    You are on the waiting list because event capacity is full. Waiting list approvals are granted exclusively by the Campus Lead.
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

        <EventRegistrationDialog
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          event={event}
        />
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
              {canAttendance || isFaculty ? (
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
            {isFaculty ? (
              <Badge tone="cyan">Faculty Oversight</Badge>
            ) : null}
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

      {event.status === "draft" && (
        <div className="mb-5 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-sm font-bold">
                📝
              </span>
              <div>
                <p className="text-[13px] font-semibold text-text">
                  Draft Event — Unpublished
                </p>
                <p className="text-[11px] text-text-dim">
                  {canPublish
                    ? "This event is currently saved in draft mode and is hidden from students. Click publish when you are ready to open registrations."
                    : "This event is saved as a draft. It will be visible to students once published by the Campus Lead."}
                </p>
              </div>
            </div>
            {canPublish && (
              <Button
                variant="orange"
                className="h-8 px-4 text-[12px] font-semibold shadow-sm"
                onClick={publishEvent}
              >
                Publish Event → Open Registration
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered" value={regs.length} hint={`${approved} confirmed · ${waitlisted} waitlist`} />
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
                  min={toLocalInput(new Date().toISOString())}
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
                  min={draft.startsAt || toLocalInput(new Date().toISOString())}
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
                  min={toLocalInput(new Date().toISOString())}
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
                  min={draft.registrationStart || toLocalInput(new Date().toISOString())}
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
          <TerminalPanel title="faculty.oversight" meta="read-only">
            <div className="space-y-3.5 text-[13px]">
              <div className="rounded-[10px] border border-border/70 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-text">Faculty Coordinator Oversight</p>
                  <Badge tone="cyan">Faculty View</Badge>
                </div>
                <p className="mt-1.5 text-xs text-text-dim leading-relaxed">
                  As the faculty advisor, you have institutional oversight over this chapter event.
                  Review student participation, department-wise registration counts, and attendance delivery below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                    Total Registrations
                  </span>
                  <p className="mt-1 text-xl font-bold text-text">{regs.length}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Student signups</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    Approved Attendees
                  </span>
                  <p className="mt-1 text-xl font-bold text-emerald-500">{approved}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Confirmed seats</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                    Waiting List
                  </span>
                  <p className="mt-1 text-xl font-bold text-amber-500">{waitlisted}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Requires Campus Lead approval</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Available Seats
                  </span>
                  <p className="mt-1 text-xl font-bold text-[var(--accent)]">{seatsLeft} / {event.capacity}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">{seatsLeft > 0 ? "Open for instant registration" : "Capacity reached"}</p>
                </div>
              </div>

              <div className="rounded-[10px] border border-border/50 bg-bg/50 px-3.5 py-2.5 text-xs text-text-dim flex items-center justify-between">
                <span>View full event attendance:</span>
                <Link
                  href={`/chapter/${slug}/attendance?eventId=${event.id}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Attendance Registry →
                </Link>
              </div>
            </div>
          </TerminalPanel>
        )}
      </div>

      {queue.length > 0 ? (
        <TerminalPanel
          title="waiting.list.approvals"
          meta={`${queue.length} student${queue.length === 1 ? "" : "s"} on waitlist`}
          accent="orange"
          className="mb-6"
        >
          <div className="mb-3 flex items-start gap-2.5 rounded-[10px] bg-amber-500/10 p-3 text-xs text-amber-400">
            <span className="text-base leading-none">ℹ️</span>
            <div>
              <p className="font-semibold">Event Capacity Waiting List</p>
              <p className="mt-0.5 text-text-dim leading-relaxed">
                Registrations are approved automatically with an instant QR pass as long as seats are available.
                These students joined the waiting list after the {event.capacity}-seat limit was reached.
                <strong> Only the Campus Lead</strong> has authority to approve waitlisted students and grant them a confirmed seat with a check-in QR code.
              </p>
            </div>
          </div>
          {queueFlash ? (
            <div className="mb-3 rounded-[8px] bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent)]">
              {queueFlash}
            </div>
          ) : null}
          <ul className="space-y-3">
            {queue.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]"
                >
                  <div>
                    <p className="font-bold text-text">{user?.fullName || reg.guestName || "Student"}</p>
                    <p className="text-[11px] text-text-dim">
                      {user?.department || "Unassigned"} • Year {user?.year || "—"} • Registered {new Date(reg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canApprove ? (
                      <>
                        <Button
                          variant="green"
                          className="h-8 px-3 text-[12px]"
                          onClick={() => handleRegAction(reg.id, "approved")}
                        >
                          Approve Seat → Mint QR
                        </Button>
                        <Button
                          variant="danger"
                          className="h-8 px-3 text-[12px]"
                          onClick={() => handleRegAction(reg.id, "rejected")}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <span className="rounded-full bg-border/50 px-2.5 py-1 text-[11px] font-medium text-text-dim">
                        Approvals restricted to Campus Lead
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      <TerminalPanel
        title="student.directory"
        meta={`${filteredRegisteredStudents.length} of ${regs.length} registrations`}
        accent={isFaculty ? "cyan" : undefined}
      >
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by student name, department, academic year, email..."
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="h-9 text-xs min-w-[130px]"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="rejected">Rejected</option>
              </Select>

              {availableDepts.length > 0 ? (
                <Select
                  value={studentDeptFilter}
                  onChange={(e) => setStudentDeptFilter(e.target.value)}
                  className="h-9 text-xs min-w-[140px]"
                >
                  <option value="all">All Departments</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              ) : null}

              {(studentSearch || studentStatusFilter !== "all" || studentDeptFilter !== "all") ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStudentSearch("");
                    setStudentStatusFilter("all");
                    setStudentDeptFilter("all");
                  }}
                  className="h-9 px-2 text-xs text-text-dim hover:text-text"
                >
                  <X size={13} className="mr-1" /> Reset
                </Button>
              ) : null}
            </div>
          </div>

          {/* Table or Empty State */}
          {!regs.length ? (
            <div className="rounded-[12px] border border-dashed border-border/80 bg-bg p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-bg-panel text-text-dim">
                <Users size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold text-text">No student registrations yet</p>
              <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
                When students register for this event, their names, departments, academic years, and registration statuses will appear here.
              </p>
            </div>
          ) : !filteredRegisteredStudents.length ? (
            <div className="rounded-[12px] border border-dashed border-border/80 bg-bg p-8 text-center">
              <p className="text-sm font-medium text-text">No registered students match your search</p>
              <p className="mt-1 text-xs text-text-dim">Try modifying your keyword or status filter.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStudentSearch("");
                  setStudentStatusFilter("all");
                  setStudentDeptFilter("all");
                }}
                className="mt-3 h-8 text-xs text-[var(--accent)]"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border bg-bg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-panel/60 font-medium text-text-dim">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Academic Year</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRegisteredStudents.map((item, idx) => (
                    <tr
                      key={item.reg.id}
                      className="transition-colors hover:bg-bg-panel/50"
                    >
                      <td className="py-2.5 px-3 text-text-mute font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="min-w-[140px]">
                          <p className="font-semibold text-text">
                            {item.fullName}
                          </p>
                          {item.elevatesId ? (
                            <p className="font-mono text-[10px] text-text-mute">
                              {item.elevatesId}
                            </p>
                          ) : null}
                          {item.rep ? (
                            <p className="text-[10px] text-text-dim">
                              Rep: {item.rep.fullName}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block rounded-[6px] border border-border/80 bg-bg-panel px-2 py-0.5 text-[11px] font-medium text-text">
                          {item.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-text-dim font-medium">
                        {item.year}
                      </td>
                      <td className="py-2.5 px-3 text-text-dim font-mono text-[11px]">
                        {item.email}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge tone={regStatusTone(item.status)}>
                          {item.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-text-mute text-[11px]">
                        {new Date(item.reg.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TerminalPanel>
    </div>
  );
}

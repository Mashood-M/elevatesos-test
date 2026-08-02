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
import type { EventItem, EventStatus, RegistrationStatus, Visibility } from "@/types";

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

  const chapter = store.chapters.find((c) => c.slug === slug);
  const event = store.events.find((e) => e.id === eventId);

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
    () => store.registrations.filter((r) => r.eventId === eventId),
    [store.registrations, eventId],
  );

  if (!chapter || !event || event.chapterId !== chapter.id) {
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

  const detailsReadonly = (
    <>
      <dl className="space-y-2 text-sm">
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

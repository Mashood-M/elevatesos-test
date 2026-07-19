"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { EventItem, EventStatus, Visibility } from "@/types";

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
    <div className="border border-border bg-[var(--surface)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-text-dim">{hint}</p> : null}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
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
  return {
    title: event.title,
    category: event.category,
    description: event.description,
    venue: event.venue,
    capacity: String(event.capacity),
    waitlistCapacity: String(event.waitlistCapacity),
    visibility: event.visibility,
    status: event.status,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    registrationStart: toLocalInput(event.registrationStart),
    registrationEnd: toLocalInput(event.registrationEnd),
    certificateEnabled: event.certificateEnabled,
  };
}

const STATUS_OPTIONS: EventStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "registration_open",
  "registration_closed",
  "completed",
  "cancelled",
];

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
  } = useStore();
  const { session } = useCurrentUser();

  const chapter = store.chapters.find((c) => c.slug === slug);
  const event = store.events.find((e) => e.id === eventId);

  const canManage =
    isHqRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    isExecutiveRole(session.roleKey);
  const canEdit = hasPermission(store, session.roleKey, "event.manage");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);

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
  const alreadyRegistered = regs.some((r) => r.userId === session.userId);
  const organizer = store.profiles.find((p) => p.id === event.organizerId);

  const queue = regs.filter(
    (r) => r.status === "pending" || r.status === "reviewed",
  );

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

  return (
    <div>
      <PageHeader
        title={event.title}
        description={`${event.category} · ${event.venue}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/events`}>
              <Button variant="ghost">All events</Button>
            </Link>
            {canEdit ? (
              editing ? (
                <>
                  <Button variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={saveEdit}>
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={startEdit}>
                  Edit event
                </Button>
              )
            ) : null}
            {!alreadyRegistered &&
            event.status === "registration_open" &&
            regForm?.status === "open" ? (
              <Link href={`/chapter/${slug}/forms/${regForm.id}/fill`}>
                <Button variant="orange">Register</Button>
              </Link>
            ) : null}
            {canManage ? (
              <Link href={`/chapter/${slug}/attendance`}>
                <Button variant="ghost">Attendance</Button>
              </Link>
            ) : null}
          </div>
        }
      />

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
          {editing && draft ? (
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
              <div className="md:col-span-2 flex flex-wrap gap-2 border-t border-border pt-3 text-[12px] text-text-dim">
                <span>Ticket {event.ticketNo}</span>
                <span>·</span>
                <span>Organizer {organizer?.fullName ?? event.organizerId}</span>
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
                  <dt className="text-text-dim">Visibility</dt>
                  <dd className="capitalize">
                    {event.visibility.replaceAll("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Status</dt>
                  <dd>
                    <Badge tone="orange">
                      {event.status.replaceAll("_", " ")}
                    </Badge>
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
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Certificates</dt>
                  <dd>{event.certificateEnabled ? "Enabled" : "Off"}</dd>
                </div>
              </dl>
              {event.description ? (
                <p className="mt-4 text-[13px] text-text-dim">
                  {event.description}
                </p>
              ) : null}
              {canEdit ? (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={startEdit}
                >
                  Edit details
                </Button>
              ) : null}
            </>
          )}
        </TerminalPanel>

        <TerminalPanel title="linked.forms" accent="orange">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
              <div>
                <p className="font-semibold">Registration</p>
                <p className="text-[12px] text-text-dim">
                  {regForm
                    ? `${regForm.title} · ${regForm.status}`
                    : "Not created yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button
                    variant="primary"
                    onClick={() => ensureForm("registration")}
                  >
                    {regForm ? "Manage form" : "Create form"}
                  </Button>
                ) : null}
                {regForm?.status === "open" ? (
                  <Link href={`/chapter/${slug}/forms/${regForm.id}/fill`}>
                    <Button variant="ghost">Fill</Button>
                  </Link>
                ) : null}
                {canManage && regForm ? (
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

            <div className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
              <div>
                <p className="font-semibold">Feedback</p>
                <p className="text-[12px] text-text-dim">
                  {fbForm
                    ? `${fbForm.title} · ${fbForm.status}`
                    : "Not created yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button
                    variant="orange"
                    onClick={() => ensureForm("feedback")}
                  >
                    {fbForm ? "Manage form" : "Create form"}
                  </Button>
                ) : null}
                {fbForm?.status === "open" ? (
                  <Link href={`/chapter/${slug}/forms/${fbForm.id}/fill`}>
                    <Button variant="ghost">Fill</Button>
                  </Link>
                ) : null}
              </div>
            </div>

            <Link href={`/chapter/${slug}/forms`}>
              <Button variant="ghost" className="w-full">
                Open Forms hub
              </Button>
            </Link>
          </div>
        </TerminalPanel>
      </div>

      {(canApprove || canReview) && queue.length > 0 ? (
        <TerminalPanel title="approval.queue" accent="orange" className="mb-6">
          <ul className="space-y-3">
            {queue.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-border p-3"
                >
                  <div>
                    <p className="font-bold">{user?.fullName}</p>
                    <p className="text-[11px] text-text-dim">{reg.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {canReview && reg.status === "pending" ? (
                      <Button
                        variant="orange"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "reviewed",
                            session.userId,
                          )
                        }
                      >
                        Review
                      </Button>
                    ) : null}
                    {canApprove && reg.status === "reviewed" ? (
                      <Button
                        variant="green"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "approved",
                            session.userId,
                          )
                        }
                      >
                        Approve → QR
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
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="font-medium">
                    {user?.fullName ?? reg.userId}
                  </span>
                  <Badge
                    tone={
                      reg.status === "approved"
                        ? "green"
                        : reg.status === "waitlisted"
                          ? "mute"
                          : "orange"
                    }
                  >
                    {reg.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}

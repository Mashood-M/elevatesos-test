"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { fromLocalInput, offsetIso, toLocalInput } from "@/lib/datetime";
import { canRegisterNow } from "@/lib/events";
import { getEventForm } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { EventItem, EventStatus, Visibility } from "@/types";

type StatusChip = "all" | "registration_open" | "draft" | "completed";

const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registration_open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "completed", label: "Completed" },
];

function defaultCreateSchedule() {
  return {
    startsAt: toLocalInput(offsetIso(7, 10)),
    endsAt: toLocalInput(offsetIso(7, 18)),
    registrationEnd: toLocalInput(offsetIso(6, 23, 59)),
  };
}

function emptyCreateForm() {
  return {
    title: "",
    venue: "",
    category: "WORKSHOP",
    capacity: "40",
    visibility: "chapter_only" as Visibility,
    description: "",
    ...defaultCreateSchedule(),
  };
}

export default function ChapterEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store, createEvent, updateRegistrationStatus } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [createFlash, setCreateFlash] = useState("");
  const [form, setForm] = useState(emptyCreateForm);

  const canCreate = hasPermission(store, session.roleKey, "event.create");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canManage =
    canCreate || hasPermission(store, session.roleKey, "event.manage");

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      setShowForm(true);
    }
  }, [searchParams, canCreate]);

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;

  const events = store.events.filter((e) => e.chapterId === chapter.id);
  const q = search.trim().toLowerCase();
  const filteredEvents = events
    .filter((e) =>
      statusChip === "all" ? true : e.status === (statusChip as EventStatus),
    )
    .filter((e) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const pendingApproval = store.registrations.filter((r) => {
    const ev = store.events.find((e) => e.id === r.eventId);
    return (
      ev?.chapterId === chapter.id &&
      (r.status === "reviewed" || r.status === "pending")
    );
  });

  function closeCreate() {
    setShowForm(false);
    setCreateFlash("");
  }

  function handleCreate() {
    if (!chapter || !form.title.trim() || !form.venue.trim()) {
      setCreateFlash("Title and venue are required.");
      return;
    }
    setCreateFlash("");
    const id = `ev-${Date.now()}`;
    const startsAt = fromLocalInput(form.startsAt);
    const endsAt = fromLocalInput(form.endsAt);
    const registrationEnd = fromLocalInput(form.registrationEnd);
    const event: EventItem = {
      id,
      chapterId: chapter.id,
      title: form.title,
      bannerEmoji: "NEW",
      description: form.description || "New chapter event",
      venue: form.venue,
      startsAt,
      endsAt,
      organizerId: session.userId,
      capacity: parseInt(form.capacity, 10) || 40,
      waitlistCapacity: 10,
      visibility: form.visibility,
      registrationStart: new Date().toISOString(),
      registrationEnd,
      status: "draft",
      certificateEnabled: true,
      ticketNo: `NO. ${String(events.length + 10).padStart(2, "0")}`,
      category: form.category,
    };
    createEvent(event);
    closeCreate();
    setForm(emptyCreateForm());
    router.push(`/chapter/${slug}/events/${id}`);
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Events"
        description="Publish opens registration directly — faculty approval never required. Link Forms, then check in."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/forms`}>
              <Button variant="ghost">Forms hub</Button>
            </Link>
            {canCreate ? (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Create event
              </Button>
            ) : null}
          </div>
        }
      />

      {(canApprove || canReview) && pendingApproval.length > 0 ? (
        <div className="mb-5 rounded-[var(--radius)] border border-border/80 bg-bg-panel px-4 py-3 shadow-[var(--shadow-sm)]">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[12px] font-semibold tracking-[-0.01em] text-text">
              Needs attention
            </p>
            <p className="text-[11px] text-text-mute">
              {pendingApproval.length} registration
              {pendingApproval.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="divide-y divide-border/80">
            {pendingApproval.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text">
                      {user?.fullName}
                      <span className="font-normal text-text-dim">
                        {" "}
                        · {ev?.title}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">{reg.status}</Badge>
                    {reg.status === "pending" && (canReview || canApprove) ? (
                      <Button
                        variant="orange"
                        className="h-8 px-3 text-[12px]"
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
                    {canApprove &&
                    (reg.status === "reviewed" || reg.status === "pending") ? (
                      <Button
                        variant="green"
                        className="h-8 px-3 text-[12px]"
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
                    {(canReview || canApprove) &&
                    (reg.status === "pending" || reg.status === "reviewed") ? (
                      <Button
                        variant="danger"
                        className="h-8 px-3 text-[12px]"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "rejected",
                            session.userId,
                          )
                        }
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <TerminalPanel
        title="events"
        meta={`${filteredEvents.length} shown · ${events.length} total`}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, venue, category…"
              aria-label="Search events"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusChip(chip.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  statusChip === chip.key
                    ? "bg-[var(--charcoal-900)] text-white"
                    : "bg-bg text-text-dim hover:bg-bg-hover",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {canCreate
                ? "Create a draft event, publish it, then share the registration form."
                : "Nothing scheduled yet — check back soon or browse when events open."}
            </p>
            {canCreate ? (
              <Button
                variant="orange"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Create event
              </Button>
            ) : null}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              No events match. Try clearing search or another status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusChip("all");
                setSearch("");
              }}
              className="mt-3 text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredEvents.map((ev) => {
              const regForm = getEventForm(store, ev.id, "registration");
              const fbForm = getEventForm(store, ev.id, "feedback");
              const approved = store.registrations.filter(
                (r) => r.eventId === ev.id && r.status === "approved",
              ).length;
              const eligibility = canRegisterNow(store, ev, session.userId);

              let secondary: { href: string; label: string } | null = null;
              if (canManage && regForm) {
                secondary = {
                  href: `/chapter/${slug}/forms/${regForm.id}`,
                  label: "Forms",
                };
              } else if (
                ev.status === "completed" &&
                fbForm &&
                fbForm.status === "open"
              ) {
                secondary = {
                  href: `/chapter/${slug}/forms/${fbForm.id}/fill`,
                  label: "Feedback",
                };
              }

              return (
                <TicketCard
                  key={ev.id}
                  event={ev}
                  href={`/chapter/${slug}/events/${ev.id}`}
                  className="bg-bg shadow-[var(--shadow-sm)]"
                  meta={`${approved}/${ev.capacity} approved · closes ${new Date(ev.registrationEnd).toLocaleDateString()}`}
                  footer={
                    <>
                      {eligibility.ok ? (
                        <Link href={`/f/${eligibility.formId}`}>
                          <Button variant="orange" className="h-9 px-4">
                            Register
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button variant="primary" className="h-9 px-4">
                            Open event
                          </Button>
                        </Link>
                      )}
                      {secondary ? (
                        <Link
                          href={secondary.href}
                          className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
                        >
                          {secondary.label}
                        </Link>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </TerminalPanel>

      <Dialog
        open={showForm && canCreate}
        onClose={closeCreate}
        title="Create event"
        description="Starts as a draft — publish from the event page to open registration."
        className="max-w-2xl"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Venue</FieldLabel>
            <Input
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel>Capacity</FieldLabel>
            <Input
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel>Visibility</FieldLabel>
            <Select
              value={form.visibility}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  visibility: e.target.value as Visibility,
                }))
              }
            >
              <option value="chapter_only">Chapter Only</option>
              <option value="specific_chapters">Selected Chapters</option>
              <option value="all_chapters">All Chapters</option>
              <option value="public">Public</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Starts</FieldLabel>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel>Ends</FieldLabel>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel>Registration closes</FieldLabel>
            <Input
              type="datetime-local"
              value={form.registrationEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, registrationEnd: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <TextArea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </div>
        {createFlash ? (
          <p className="mt-3 text-[13px] text-[var(--accent)]">{createFlash}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={closeCreate}>
            Cancel
          </Button>
          <Button type="button" variant="orange" onClick={handleCreate}>
            Create → Open event
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

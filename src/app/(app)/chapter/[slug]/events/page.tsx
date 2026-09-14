"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, resolveChapter, isFacultyRole } from "@/lib/access";
import {
  canRegisterNow,
  isEventVisibleToUser,
  getEventRegistrationState,
  canPublishEvent,
  isEventOngoing,
} from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import type { EventItem, EventRegistration, EventStatus } from "@/types";


type StatusChip = "all" | "ongoing" | "registration_open" | "registration_closed" | "draft" | "completed";

const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "registration_open", label: "Open" },
  { key: "registration_closed", label: "Stopped" },
  { key: "draft", label: "Draft" },
  { key: "completed", label: "Completed" },
];



export default function ChapterEventsPage({
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
  const searchParams = useSearchParams();
  const {
    store,
    createEvent,
    updateEvent,
    startEvent,
    endEvent,
    createForm,
    setFormStatus,
    updateRegistrationStatus,
    batchUpdateRegistrationStatus,
    addEventCategory,
  } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [admitCount, setAdmitCount] = useState<number>(1);
  const toggleSelectReg = (id: string) => {
    setSelectedRegIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem | null>(null);


  const canCreate = hasPermission(store, session.roleKey, "event.create");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canManage =
    canCreate || hasPermission(store, session.roleKey, "event.manage");
  const canPublish =
    canPublishEvent(session.roleKey, undefined, session.userId) || canManage;

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      setShowForm(true);
    }
  }, [searchParams, canCreate]);

  const waitlistRegistrations: EventRegistration[] = useMemo(() => {
    if (!chapter) return [];
    return (store.registrations ?? [])
      .filter((r) => {
        const ev = store.events.find((e) => e.id === r.eventId);
        return ev?.chapterId === chapter.id && r.status === "waitlisted";
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [store.registrations, store.events, chapter?.id]);

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading events...</p>
      </div>
    );
  }

  if (!chapter) {
    return <ChapterNotFound />;
  }

  const events = store.events
    .filter((e) => e.chapterId === chapter.id)
    .filter((e) =>
      isEventVisibleToUser(
        e,
        chapter.id,
        session.roleKey,
        session.userId,
        store.chapters,
      ),
    );
  const mainEvents = events.filter((e) => e.eventType === "main" || !e.parentEventId);
  const q = search.trim().toLowerCase();
  const filteredEvents = events
    .filter((e) => {
      if (statusChip === "all") return true;
      if (statusChip === "ongoing") return isEventOngoing(e);
      return e.status === (statusChip as EventStatus);
    })
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

  function publishEventFromList(eventItem: EventItem) {
    const existing = getEventForm(store, eventItem.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        eventItem.id,
        chapter!.id,
        eventItem.title,
        eventItem,
      ).find((f) => f.purpose === "registration");
      if (template) {
        createForm({
          ...template,
          id: template.id,
          status: "open",
        });
      }
    } else if (existing.status !== "open") {
      setFormStatus(existing.id, "open");
    }
    updateEvent(eventItem.id, {
      status: "registration_open",
      publishedAt: new Date().toISOString(),
      registrationStart: new Date().toISOString(),
    });
  }

  function stopEventFromList(eventItem: EventItem) {
    const existing = getEventForm(store, eventItem.id, "registration");
    if (existing && existing.status === "open") {
      setFormStatus(existing.id, "closed");
    }
    updateEvent(eventItem.id, {
      status: "registration_closed",
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Events"
        description="Publish opens registration directly — faculty approval never required. Link Forms, then check in."
        actions={
          <div className="flex flex-wrap gap-2">
            {session.roleKey !== "class_representative" && (
              <Link href={`/chapter/${slug}/forms`}>
                <Button variant="ghost">Forms hub</Button>
              </Link>
            )}
            {canCreate ? (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Create event
              </Button>
            ) : null}
          </div>
        }
      />

      {waitlistRegistrations.length > 0 ? (
        <div className="mb-5 rounded-[var(--radius)] border border-border/80 bg-bg-panel px-4 py-3 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold tracking-[-0.01em] text-text">
                Waiting List Approvals ({waitlistRegistrations.length} student{waitlistRegistrations.length === 1 ? "" : "s"} in queue)
              </p>
              <p className="text-[11px] text-text-dim">
                Registration directly confirms seats while open. If registered members do not come to the event, event coordinators approve waitlisted students in first-registered priority order (FIFO).
              </p>
            </div>
            {canApprove && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1">
                  <span className="text-[11px] text-text-dim">Admit seats:</span>
                  <input
                    type="number"
                    min={1}
                    max={waitlistRegistrations.length}
                    value={admitCount}
                    onChange={(e) =>
                      setAdmitCount(
                        Math.max(
                          1,
                          Math.min(
                            waitlistRegistrations.length,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        ),
                      )
                    }
                    className="h-6 w-12 rounded border border-border bg-bg-panel text-center font-mono text-[11px] text-text"
                  />
                  <Button
                    variant="orange"
                    className="h-6 px-2.5 text-[11px]"
                    onClick={() => {
                      const count = Math.min(
                        admitCount,
                        waitlistRegistrations.length,
                      );
                      const targetIds = waitlistRegistrations
                        .slice(0, count)
                        .map((r) => r.id);
                      batchUpdateRegistrationStatus(
                        targetIds,
                        "approved",
                        session.userId,
                      );
                    }}
                  >
                    Approve Next {Math.min(admitCount, waitlistRegistrations.length)} (FIFO) → QR
                  </Button>
                </div>
                {selectedRegIds.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      className="h-7 px-2.5 text-[11px] text-red-400"
                      onClick={() => {
                        batchUpdateRegistrationStatus(
                          selectedRegIds,
                          "rejected",
                          session.userId,
                        );
                        setSelectedRegIds([]);
                      }}
                    >
                      Decline Selected
                    </Button>
                    <Button
                      variant="green"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => {
                        batchUpdateRegistrationStatus(
                          selectedRegIds,
                          "approved",
                          session.userId,
                        );
                        setSelectedRegIds([]);
                      }}
                    >
                      Approve Selected ({selectedRegIds.length})
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <ul className="divide-y divide-border/80">
            {waitlistRegistrations.map((reg, idx) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              const isSelected = selectedRegIds.includes(reg.id);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {canApprove && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectReg(reg.id)}
                        className="rounded border-border"
                      />
                    )}
                    <span className="font-mono text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <p className="text-[13px] font-medium text-text">
                      {user?.fullName || reg.guestName || "Student"}
                      <span className="font-normal text-text-dim">
                        {" "}
                        · {ev?.title}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">Priority #{idx + 1}</Badge>
                    {canApprove ? (
                      <>
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
                          Decline
                        </Button>
                      </>
                    ) : (
                      <span className="rounded-full bg-border/50 px-2 py-0.5 text-[11px] text-text-dim">
                        Coordinator approval required
                      </span>
                    )}
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
            {STATUS_CHIPS.filter(
              (chip) =>
                chip.key !== "draft" ||
                session.roleKey === "campus_lead" ||
                isHqRole(session.roleKey),
            ).map((chip) => (
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
              const regState = getEventRegistrationState(store, ev, session.userId);
              const regForm = getEventForm(store, ev.id, "registration");
              const fbForm = getEventForm(store, ev.id, "feedback");
              const approved = store.registrations.filter(
                (r) => r.eventId === ev.id && r.status === "approved",
              ).length;
              const eligibility = canRegisterNow(store, ev, session.userId);
              const myReg = store.registrations.find(
                (r) =>
                  r.eventId === ev.id &&
                  (r.userId === session.userId || (session.authUserId && r.userId === session.authUserId)) &&
                  r.status !== "rejected",
              );

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
                  hideStatus={!canManage}
                  meta={`${approved}/${ev.capacity} approved · closes ${new Date(ev.registrationEnd).toLocaleDateString()}`}
                  footer={
                    <div className="flex flex-wrap items-center gap-2">
                      {isFacultyRole(session.roleKey) ? (
                        <div className="flex items-center gap-2">
                          <Link href={`/chapter/${slug}/events/${ev.id}`}>
                            <Button variant="primary" className="h-9 px-3 text-xs">
                              View details
                            </Button>
                          </Link>
                          <Link href={`/chapter/${slug}/attendance?eventId=${ev.id}`}>
                            <Button variant="ghost" className="h-9 px-3 text-xs border border-border/70 hover:border-border hover:bg-bg-panel">
                              View Attendance
                            </Button>
                          </Link>
                        </div>
                      ) : myReg ? (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button
                            variant={myReg.status === "approved" ? "green" : "secondary"}
                            className="h-9 px-4"
                          >
                            {myReg.status === "approved"
                              ? "Pass Confirmed"
                              : myReg.status === "waitlisted"
                                ? "Waitlisted Pass"
                                : "Registered"}
                          </Button>
                        </Link>
                      ) : isEventOngoing(ev) ? (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button variant="green" className="h-9 px-4 font-semibold shadow-sm">
                            Live Event Ongoing
                          </Button>
                        </Link>
                      ) : regState.status === "ended" ? (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button variant="primary" className="h-9 px-4">
                            Open event
                          </Button>
                        </Link>
                      ) : regState.status === "upcoming" || regState.isUpcoming ? (
                        <Button
                          variant="secondary"
                          className="h-9 px-4 text-text-dim border border-border/70 cursor-not-allowed opacity-80"
                          disabled
                          title={regState.reason || `Registration opens on ${new Date(ev.registrationStart).toLocaleString()}`}
                        >
                          Registration Not Started
                        </Button>
                      ) : regState.isClosed ? (
                        <Button
                          variant="ghost"
                          className="h-9 px-4 text-text-dim border border-border/70 cursor-not-allowed opacity-75"
                          disabled
                          title={regState.reason || "Registration is closed"}
                        >
                          {ev.status === "registration_closed" ? "Registration Stopped" : "Registration Closed"}
                        </Button>
                      ) : regState.isWaitlist ? (
                        <Button
                          variant="secondary"
                          className="h-9 px-4 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-semibold"
                          onClick={() => setSelectedEventForReg(ev)}
                        >
                          Join Waiting List
                        </Button>
                      ) : (
                        <Button
                          variant="orange"
                          className="h-9 px-4"
                          onClick={() => setSelectedEventForReg(ev)}
                        >
                          Register
                        </Button>
                      )}

                      {/* Management Controls: Start Event, End Event, Publish & Stop Registration */}
                      {(canPublishEvent(session.roleKey, ev, session.userId) || canManage) ? (
                        ev.status === "ongoing" || isEventOngoing(ev) ? (
                          <Button
                            variant="danger"
                            className="h-9 px-3 text-xs flex items-center gap-1 font-semibold"
                            onClick={() => endEvent(ev.id, session.userId)}
                            title="End this event now and close attendance"
                          >
                            End Event
                          </Button>
                        ) : ev.status !== "completed" && ev.status !== "cancelled" ? (
                          <Button
                            variant="green"
                            className="h-9 px-3 text-xs flex items-center gap-1 font-bold shadow-sm"
                            onClick={() => startEvent(ev.id, session.userId)}
                            title="Start this event now - marks as Ongoing and opens attendance"
                          >
                            Start Event
                          </Button>
                        ) : null
                      ) : null}

                      {(canPublishEvent(session.roleKey, ev, session.userId) || canManage) ? (
                        ev.status === "registration_open" ? (
                          <Button
                            variant="danger"
                            className="h-9 px-3 text-xs"
                            onClick={() => stopEventFromList(ev)}
                            title="Stop registration immediately for this event"
                          >
                            Stop Registration
                          </Button>
                        ) : ev.status !== "ongoing" && ev.status !== "completed" ? (
                          <Button
                            variant="orange"
                            className="h-9 px-3 text-xs"
                            onClick={() => publishEventFromList(ev)}
                            title="Publish / Open registration for this event"
                          >
                            Publish Event
                          </Button>
                        ) : null
                      ) : null}

                      {secondary && !isFacultyRole(session.roleKey) ? (
                        <Link
                          href={secondary.href}
                          className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
                        >
                          {secondary.label}
                        </Link>
                      ) : null}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </TerminalPanel>

      <EventManagerCreateDialog
        open={showForm && canCreate}
        onClose={() => setShowForm(false)}
        chapterSlug={chapter.slug}
        chapterId={chapter.id}
      />

      <EventRegistrationDialog
        open={Boolean(selectedEventForReg)}
        onClose={() => setSelectedEventForReg(null)}
        event={selectedEventForReg}
      />
    </div>
  );
}

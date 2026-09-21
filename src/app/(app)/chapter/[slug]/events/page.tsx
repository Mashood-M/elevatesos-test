"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
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
  isEventEnded,
} from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import {
  CheckCircle2,
  Play,
  Search,
  X,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  QrCode,
  Users,
} from "lucide-react";
import type { EventItem, EventRegistration, EventStatus } from "@/types";

type StatusChip =
  | "all"
  | "ongoing"
  | "registration_open"
  | "registration_closed"
  | "draft"
  | "completed";

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
    return <ContentSkeleton />;
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
    .sort((a, b) => {
      const timeB = new Date(b.startsAt || b.publishedAt || 0).getTime();
      const timeA = new Date(a.startsAt || a.publishedAt || 0).getTime();
      return timeB - timeA;
    });

  const counts: Record<StatusChip, number> = {
    all: events.length,
    ongoing: events.filter((e) => isEventOngoing(e) || e.status === "ongoing").length,
    registration_open: events.filter((e) => e.status === "registration_open" && !isEventOngoing(e)).length,
    registration_closed: events.filter((e) => e.status === "registration_closed").length,
    draft: events.filter((e) => e.status === "draft").length,
    completed: events.filter((e) => e.status === "completed" || isEventEnded(e)).length,
  };

  const totalConfirmedSeats = store.registrations.filter(
    (r) => events.some((e) => e.id === r.eventId) && r.status === "approved",
  ).length;

  const totalCategories = new Set(events.map((e) => e.category).filter(Boolean)).size;

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
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Events & Programs"
        description="Discover upcoming workshops, hackathons, and sessions, or coordinate chapter registrations and live schedules."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {session.roleKey !== "class_representative" && (
              <Link href={`/chapter/${slug}/forms`}>
                <Button variant="ghost" className="border border-border/70 hover:bg-bg-panel text-xs sm:text-sm">
                  Forms Hub
                </Button>
              </Link>
            )}
            {canCreate ? (
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                className="gap-1.5 shadow-sm text-xs sm:text-sm"
              >
                <Plus size={15} />
                Create Event
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Metric Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Events"
          value={events.length}
          hint="All programs scheduled"
        />
        <Stat
          label="Active & Ongoing"
          value={counts.ongoing + counts.registration_open}
          hint="Live or registering"
          accent="orange"
        />
        <Stat
          label="Confirmed Seats"
          value={totalConfirmedSeats}
          hint="Approved registrations"
        />
        <Stat
          label="Tracks & Disciplines"
          value={totalCategories}
          hint="Distinct domains"
        />
      </div>

      {/* Waitlist Queue Banner / Drawer */}
      {waitlistRegistrations.length > 0 && (
        <div className="rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-amber-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-[15px] font-bold text-text">
                  Waitlist Queue
                </h3>
                <Badge tone="orange" className="font-semibold">
                  {waitlistRegistrations.length} student{waitlistRegistrations.length === 1 ? "" : "s"} waiting
                </Badge>
              </div>
              <p className="mt-1 text-xs text-text-dim max-w-xl">
                Seats can be approved in first-come priority order (FIFO) or individually. Approved students immediately receive confirmed QR passes.
              </p>
            </div>

            {canApprove && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-amber-500/30 bg-bg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-medium text-text-dim">Admit FIFO:</span>
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
                    className="h-7 w-12 rounded border border-border bg-bg-panel text-center font-mono text-xs font-semibold text-text"
                  />
                  <Button
                    variant="orange"
                    className="h-7 px-3 text-[11px] font-bold"
                    onClick={() => {
                      const count = Math.min(admitCount, waitlistRegistrations.length);
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
                    Approve Next {Math.min(admitCount, waitlistRegistrations.length)} → QR
                  </Button>
                </div>

                {selectedRegIds.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      className="h-8 px-2.5 text-xs text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        batchUpdateRegistrationStatus(
                          selectedRegIds,
                          "rejected",
                          session.userId,
                        );
                        setSelectedRegIds([]);
                      }}
                    >
                      Decline ({selectedRegIds.length})
                    </Button>
                    <Button
                      variant="green"
                      className="h-8 px-3 text-xs font-semibold"
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
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-border/50 pr-1">
            {waitlistRegistrations.map((reg, idx) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              const isSelected = selectedRegIds.includes(reg.id);
              const isVolunteerForRegEvent =
                Boolean(ev?.volunteerStudentIds?.includes(session.userId)) ||
                (store.volunteerGroups || []).some(
                  (g) =>
                    g.chapterId === ev?.chapterId &&
                    g.eventId === ev?.id &&
                    g.memberIds?.includes(session.userId),
                );
              const canApproveThisReg = canApprove || isVolunteerForRegEvent;

              return (
                <div
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 transition-colors hover:bg-bg/40 px-2 rounded-[var(--radius-sm)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {canApproveThisReg && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectReg(reg.id)}
                        className="rounded border-border text-[var(--accent)] focus:ring-0"
                      />
                    )}
                    <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-semibold text-text truncate">
                        {user?.fullName || reg.guestName || "Student"}
                        <span className="font-normal text-text-dim text-xs">
                          {" "}· {ev?.title}
                        </span>
                      </p>
                      <p className="text-[10px] text-text-dim">
                        Registered {new Date(reg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canApproveThisReg ? (
                      <>
                        <Button
                          variant="green"
                          className="h-7 px-2.5 text-[11px] font-semibold"
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
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-text-dim hover:text-red-500"
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
                      <span className="text-[11px] text-text-dim">
                        In queue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Events Workspace */}
      <div className="space-y-5">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category, or venue..."
              className="pl-9 pr-8 h-9.5 rounded-[var(--radius-sm)] bg-bg border-border/70 text-xs sm:text-sm"
              aria-label="Search events"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-1"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segmented Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {STATUS_CHIPS.filter(
              (chip) =>
                chip.key !== "draft" ||
                session.roleKey === "campus_lead" ||
                isHqRole(session.roleKey),
            ).map((chip) => {
              const isActive = statusChip === chip.key;
              const count = counts[chip.key];
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusChip(chip.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-text text-bg shadow-sm"
                      : "bg-bg border border-border/70 text-text-dim hover:text-text hover:border-border",
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
                      isActive
                        ? "bg-bg/20 text-bg"
                        : "bg-border/60 text-text-dim",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Cards Grid */}
        {events.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border/40 text-text-dim mb-3">
              <Calendar size={22} />
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
              No events scheduled yet
            </h4>
            <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
              {canCreate
                ? "Create your first workshop, hackathon, or meetup to open registration and engage chapter members."
                : "Check back soon for new sessions, bootcamps, and technical events from this chapter."}
            </p>
            {canCreate && (
              <Button
                variant="orange"
                className="mt-4 gap-1.5 text-xs font-semibold"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Create First Event
              </Button>
            )}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-12 text-center">
            <p className="text-sm font-semibold text-text">No matching events found</p>
            <p className="mt-1 text-xs text-text-dim">
              Try adjusting your search keywords or selecting another status filter.
            </p>
            <Button
              variant="ghost"
              className="mt-3 text-xs border border-border/70 hover:bg-bg"
              onClick={() => {
                setStatusChip("all");
                setSearch("");
              }}
            >
              Clear Filters & Search
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredEvents.map((ev) => {
              const isAssignedVolunteer =
                Boolean(ev.volunteerStudentIds?.includes(session.userId)) ||
                (store.volunteerGroups || []).some(
                  (g) =>
                    g.chapterId === ev.chapterId &&
                    g.eventId === ev.id &&
                    g.memberIds?.includes(session.userId),
                );
              const canManageThisEvent = canManage || isAssignedVolunteer;
              const regState = getEventRegistrationState(store, ev, session.userId);
              const regForm = getEventForm(store, ev.id, "registration");
              const fbForm = getEventForm(store, ev.id, "feedback");
              const approved = store.registrations.filter(
                (r) => r.eventId === ev.id && r.status === "approved",
              ).length;
              const myReg = store.registrations.find(
                (r) =>
                  r.eventId === ev.id &&
                  (r.userId === session.userId ||
                    (session.authUserId && r.userId === session.authUserId)) &&
                  r.status !== "rejected",
              );

              let secondary: { href: string; label: string } | null = null;
              if (canManageThisEvent && regForm) {
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

              const isOngoing = isEventOngoing(ev) || ev.status === "ongoing";
              const isEnded = isEventEnded(ev) || ev.status === "completed";

              return (
                <TicketCard
                  key={ev.id}
                  event={ev}
                  href={`/chapter/${slug}/events/${ev.id}`}
                  className="bg-white border border-border/60 hover:border-border transition-all shadow-[var(--shadow-sm)]"
                  hideStatus={!canManageThisEvent}
                  meta={`${approved}/${ev.capacity} approved · closes ${new Date(ev.registrationEnd).toLocaleDateString()}`}
                  footer={
                    <div className="w-full pt-3 mt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      {/* Left: Attendee Status / Primary CTA */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isFacultyRole(session.roleKey) ? (
                          <div className="flex items-center gap-2">
                            <Link href={`/chapter/${slug}/events/${ev.id}`}>
                              <Button variant="ghost" className="h-8 px-3 text-xs border border-border/70 hover:bg-bg-hover">
                                View Details
                              </Button>
                            </Link>
                            <Link href={`/chapter/${slug}/attendance?eventId=${ev.id}`}>
                              <Button variant="ghost" className="h-8 px-3 text-xs border border-border/70 hover:bg-bg-hover">
                                Attendance
                              </Button>
                            </Link>
                          </div>
                        ) : myReg ? (
                          <Link href={`/chapter/${slug}/events/${ev.id}`}>
                            <Button
                              variant={myReg.status === "approved" ? "green" : "secondary"}
                              className={cn(
                                "h-8 px-3 text-xs font-semibold gap-1.5 shadow-2xs",
                                myReg.status === "waitlisted" && "border-amber-500/40 text-amber-600 dark:text-amber-400",
                              )}
                            >
                              <CheckCircle2 size={13} />
                              {myReg.status === "approved"
                                ? "Pass Confirmed"
                                : myReg.status === "waitlisted"
                                  ? "Waitlisted Pass"
                                  : "Registered"}
                            </Button>
                          </Link>
                        ) : isOngoing ? (
                          <Link href={`/chapter/${slug}/events/${ev.id}`}>
                            <Button variant="green" className="h-8 px-3 text-xs font-bold shadow-2xs flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                              </span>
                              Live Session Ongoing
                            </Button>
                          </Link>
                        ) : isEnded ? (
                          <Link href={`/chapter/${slug}/events/${ev.id}`}>
                            <Button variant="ghost" className="h-8 px-3 text-xs border border-border/70 text-text-dim hover:text-text hover:bg-bg-hover">
                              View Details
                            </Button>
                          </Link>
                        ) : regState.status === "upcoming" || regState.isUpcoming ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-text-dim bg-bg rounded border border-border/60">
                              <Clock size={11} />
                              Opens {new Date(ev.registrationStart).toLocaleDateString()}
                            </span>
                            <Link href={`/chapter/${slug}/events/${ev.id}`}>
                              <Button variant="ghost" className="h-8 px-2 text-xs text-text-dim hover:text-text">
                                Details
                              </Button>
                            </Link>
                          </div>
                        ) : regState.isClosed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 text-[11px] font-medium text-text-dim bg-bg rounded border border-border/60">
                              {ev.status === "registration_closed" ? "Reg. Stopped" : "Reg. Closed"}
                            </span>
                            <Link href={`/chapter/${slug}/events/${ev.id}`}>
                              <Button variant="ghost" className="h-8 px-2 text-xs text-text-dim hover:text-text">
                                Details
                              </Button>
                            </Link>
                          </div>
                        ) : regState.isWaitlist ? (
                          <Button
                            variant="secondary"
                            className="h-8 px-3.5 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
                            onClick={() => setSelectedEventForReg(ev)}
                          >
                            Join Waitlist
                          </Button>
                        ) : (
                          <Button
                            variant="orange"
                            className="h-8 px-4 text-xs font-bold shadow-2xs"
                            onClick={() => setSelectedEventForReg(ev)}
                          >
                            Register
                          </Button>
                        )}
                      </div>

                      {/* Right: Management Controls */}
                      {(canPublishEvent(session.roleKey, ev, session.userId) ||
                        canManageThisEvent ||
                        session.roleKey === "campus_lead" ||
                        session.roleKey === "chairman" ||
                        session.roleKey === "elevates_coordinator" ||
                        session.roleKey === "hq_admin" ||
                        ev.organizerId === session.userId) && (
                        <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                          {isOngoing ? (
                            <Button
                              variant="danger"
                              className="h-8 px-2.5 text-xs flex items-center gap-1 font-semibold shadow-2xs"
                              onClick={() => endEvent(ev.id, session.userId)}
                              title="End this event now and close attendance"
                            >
                              <CheckCircle2 size={12} />
                              End Event
                            </Button>
                          ) : isEnded ? (
                            <span className="text-[11px] font-medium text-text-dim px-2 py-0.5 rounded bg-bg border border-border/50">
                              Completed
                            </span>
                          ) : (
                            <>
                              {ev.status !== "cancelled" && (
                                <Button
                                  variant="green"
                                  className="h-8 px-2.5 text-xs flex items-center gap-1 font-bold shadow-2xs"
                                  onClick={() => startEvent(ev.id, session.userId)}
                                  title="Start event and open attendance"
                                >
                                  <Play size={11} className="fill-current" />
                                  Start
                                </Button>
                              )}

                              {(canPublishEvent(session.roleKey, ev, session.userId) || canManageThisEvent) && (
                                ev.status === "registration_open" ? (
                                  <Button
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => stopEventFromList(ev)}
                                    title="Stop registration"
                                  >
                                    Stop Reg
                                  </Button>
                                ) : ev.status !== "cancelled" ? (
                                  <Button
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                                    onClick={() => publishEventFromList(ev)}
                                    title="Open registration"
                                  >
                                    Open Reg
                                  </Button>
                                ) : null
                              )}
                            </>
                          )}

                          {isAssignedVolunteer && !isFacultyRole(session.roleKey) && (
                            <Link href={`/chapter/${slug}/attendance?eventId=${ev.id}`}>
                              <Button
                                variant="ghost"
                                className="h-8 px-2.5 text-xs border border-border/80 hover:bg-bg-hover font-medium"
                              >
                                Attendance
                              </Button>
                            </Link>
                          )}

                          {secondary && !isFacultyRole(session.roleKey) && (
                            <Link
                              href={secondary.href}
                              className="text-[11px] font-medium text-text-dim hover:text-[var(--accent)] px-1.5 py-1 transition-colors"
                            >
                              {secondary.label}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

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

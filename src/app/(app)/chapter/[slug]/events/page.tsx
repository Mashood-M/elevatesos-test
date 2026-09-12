"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { canRegisterNow, isEventVisibleToUser } from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import type { EventItem, EventStatus } from "@/types";


type StatusChip = "all" | "registration_open" | "draft" | "completed";

const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registration_open", label: "Open" },
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
  const { store, createEvent, updateEvent, createForm, setFormStatus, updateRegistrationStatus, batchUpdateRegistrationStatus, addEventCategory } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
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
  // Only HQ Founder and Campus Lead can publish events (move draft → registration_open)
  const canPublish =
    session.roleKey === "founder" || session.roleKey === "campus_lead";

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      setShowForm(true);
    }
  }, [searchParams, canCreate]);

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

  const waitlistRegistrations = store.registrations.filter((r) => {
    const ev = store.events.find((e) => e.id === r.eventId);
    return (
      ev?.chapterId === chapter.id &&
      r.status === "waitlisted"
    );
  });



  function publishEventFromList(eventItem: EventItem) {
    const existing = getEventForm(store, eventItem.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        eventItem.id,
        chapter!.id,
        eventItem.title,
      ).find((f) => f.purpose === "registration")!;
      createForm({
        ...template,
        id: template.id,
        status: "open",
      });
    } else if (existing.status !== "open") {
      setFormStatus(existing.id, "open");
    }
    updateEvent(eventItem.id, { status: "registration_open" });
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold tracking-[-0.01em] text-text">
                Waiting List Approvals ({waitlistRegistrations.length} student{waitlistRegistrations.length === 1 ? "" : "s"} on waitlist)
              </p>
              <p className="text-[11px] text-text-dim">
                Registration is automatically approved when seats are available. Only the Campus Lead can approve students from the waiting list.
              </p>
            </div>
            {canApprove && selectedRegIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-[12px] text-red-400"
                  onClick={() => {
                    batchUpdateRegistrationStatus(selectedRegIds, "rejected", session.userId);
                    setSelectedRegIds([]);
                  }}
                >
                  Decline Selected
                </Button>
                <Button
                  variant="green"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => {
                    batchUpdateRegistrationStatus(selectedRegIds, "approved", session.userId);
                    setSelectedRegIds([]);
                  }}
                >
                  Approve Selected → QR ({selectedRegIds.length})
                </Button>
              </div>
            )}
          </div>
          <ul className="divide-y divide-border/80">
            {waitlistRegistrations.map((reg) => {
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
                    <p className="text-[13px] font-medium text-text">
                      {user?.fullName || reg.guestName || "Student"}
                      <span className="font-normal text-text-dim">
                        {" "}
                        · {ev?.title}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">waitlisted</Badge>
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
                        Campus Lead only
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
                    <>
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
                      ) : ev.status === "draft" && canPublish ? (
                        <Button
                          variant="orange"
                          className="h-9 px-4"
                          onClick={() => publishEventFromList(ev)}
                        >
                          Publish → Open Registration
                        </Button>
                      ) : ev.status === "draft" && canManage ? (
                        <Button
                          variant="ghost"
                          className="h-9 px-4 text-text-dim cursor-default"
                          disabled
                        >
                          Draft (pending publish)
                        </Button>
                      ) : ev.status !== "completed" && ev.status !== "cancelled" ? (
                        <Button
                          variant="orange"
                          className="h-9 px-4"
                          onClick={() => setSelectedEventForReg(ev)}
                        >
                          Register
                        </Button>
                      ) : (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button variant="primary" className="h-9 px-4">
                            Open event
                          </Button>
                        </Link>
                      )}
                      {secondary && !isFacultyRole(session.roleKey) ? (
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

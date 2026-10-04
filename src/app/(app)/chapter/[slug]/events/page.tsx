"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BauhausEventCard } from "@/components/domain/bauhaus-event-card";
import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { useStore, useCurrentUser } from "@/context/store-context";
import { resolveChapter } from "@/lib/access";
import {
  isEventVisibleToUser,
  getEventRegistrationState,
  isEventOngoing,
  isEventEnded,
} from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { hasExecutiveDelegation } from "@/lib/leadership";
import { cn } from "@/lib/utils";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import {
  Search,
  X,
  Plus,
  Calendar,
  QrCode,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const searchParams = useSearchParams();
  const {
    store,
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

  const hasEventDelegation = Boolean(
    chapter && hasExecutiveDelegation(store, session.userId, chapter.id, "manage_events"),
  );

  const canCreate = hasPermission(store, session.roleKey, "event.create") || hasEventDelegation;
  const canApprove = hasPermission(store, session.roleKey, "registration.approve") || hasEventDelegation;
  const canManage =
    canCreate || hasPermission(store, session.roleKey, "event.manage") || hasEventDelegation;

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [store.registrations, store.events, chapter]);

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
    <div className="space-y-6 pb-12">
      {/* ─── 01. MINIMAL BAUHAUS ARCHITECTURAL HERO ─────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[3px_3px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Decorative Bauhaus shapes */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-10 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-15 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            {/* Bauhaus Eyebrow */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {chapter.shortCode || chapter.slug.toUpperCase()} {"//"} EVENTS
              </span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                CHAPTER · {chapter.name}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Program Architecture &
              <span className="block text-[#f26430] text-xl sm:text-2xl font-bold mt-0.5">
                EVENTS
              </span>
            </h1>

           
            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Create Event
                </button>
              )}

              <Link href={`/chapter/${slug}/attendance`}>
                <button
                  type="button"
                  className="h-9 px-3.5 rounded-[8px] bg-white text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#2d2d34] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <QrCode size={13} />
                  Attendance Desk
                </button>
              </Link>

              {session.roleKey !== "class_representative" && (
                <Link href={`/chapter/${slug}/forms`}>
                  <button
                    type="button"
                    className="h-9 px-3.5 rounded-[8px] bg-white text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#2d2d34] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Forms Hub
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Status Badge: Chapter Stats Minimal Architecture */}
          <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[12px] shadow-[2px_2px_0px_#2d2d34] select-none shrink-0 w-56 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-[#f26430] border border-[#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[10px]">
                E
              </span>
              <span className="h-6 w-6 bg-[#414066] border border-[#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[10px]">
                O
              </span>
              <span className="h-6 w-6 bg-[#f59e0b] border border-[#2d2d34] rotate-45 flex items-center justify-center text-[#2d2d34] font-mono font-bold text-[10px]">
                S
              </span>
            </div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2d2d34]">
              {chapter.shortCode || "CHAPTER"} STATUS
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] uppercase tracking-widest mt-0.5">
              ACTIVE TERM
            </p>
            <div className="mt-2.5 w-full border-t border-[#2d2d34]/15 pt-2 flex items-center justify-between font-mono text-[9.5px] text-[#52525b]">
              <span>PROGRAMS</span>
              <span className="font-bold text-[#2d2d34]">{events.length} RECORDED</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02. MINIMAL BAUHAUS METRIC STRIP ──────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Total Events */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-[#71717a] font-mono text-[9.5px] uppercase font-bold">
            <span>01 {"//"} TOTAL</span>
            <span className="h-1.5 w-1.5 bg-[#2d2d34]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
            {events.length}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            All Programs
          </p>
        </div>

        {/* Metric 2: Active & Live */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-[#f26430] font-mono text-[9.5px] uppercase font-bold">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26430] animate-ping" />
              02 {"//"} ACTIVE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#f26430] tracking-tight">
            {counts.ongoing + counts.registration_open}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Live or Registering
          </p>
        </div>

        {/* Metric 3: Confirmed Seats */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-[#414066] font-mono text-[9.5px] uppercase font-bold">
            <span>03 {"//"} SEATS</span>
            <span className="h-1.5 w-1.5 bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
            {totalConfirmedSeats}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Confirmed Attendees
          </p>
        </div>

        {/* Metric 4: Tracks / Disciplines */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-[#5f7560] font-mono text-[9.5px] uppercase font-bold">
            <span>04 {"//"} TRACKS</span>
            <span className="h-1.5 w-1.5 bg-[#5f7560] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
            {totalCategories}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Distinct Domains
          </p>
        </div>
      </section>

      {/* ─── 03. WAITLIST QUEUE BANNER (WHEN ACTIVE) ─────────────────── */}
      {waitlistRegistrations.length > 0 && (
        <div className="rounded-[14px] border border-[#f59e0b]/40 bg-[#fef3c7]/20 p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#f59e0b]/20 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f59e0b]"></span>
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-[15px] font-bold text-[#2d2d34]">
                  Waitlist Priority Queue
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]/30">
                  {waitlistRegistrations.length} student{waitlistRegistrations.length === 1 ? "" : "s"} waiting
                </span>
              </div>
              <p className="mt-1 text-xs text-[#52525b] max-w-xl">
                Seats can be approved in FIFO sequence or individually. Approved students immediately receive verified QR passes.
              </p>
            </div>

            {canApprove && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-[7px] border border-[#2d2d34]/20 bg-white px-2.5 py-1 shadow-[1px_1px_0px_#2d2d34]">
                  <span className="text-[11px] font-mono font-medium text-[#71717a]">Admit FIFO:</span>
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
                    className="h-6 w-12 rounded border border-[#2d2d34]/20 bg-[#faf9f6] text-center font-mono text-xs font-semibold text-[#2d2d34]"
                  />
                  <button
                    type="button"
                    className="h-6 px-2.5 rounded bg-[#f26430] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider hover:bg-[#e05320] transition cursor-pointer"
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
                  </button>
                </div>

                {selectedRegIds.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="h-7 px-2.5 rounded text-xs font-mono font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition cursor-pointer"
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
                    </button>
                    <button
                      type="button"
                      className="h-7 px-3 rounded text-xs font-mono font-bold text-white bg-[#5f7560] hover:bg-[#4d604e] border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer"
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
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-[#2d2d34]/10 pr-1">
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
                  className="flex flex-wrap items-center justify-between gap-3 py-2 transition-colors hover:bg-white/60 px-2 rounded-[6px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {canApproveThisReg && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectReg(reg.id)}
                        className="rounded border-[#2d2d34]/20 text-[#f26430] focus:ring-0"
                      />
                    )}
                    <span className="font-mono text-[10px] font-bold text-[#92400e] bg-amber-500/10 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-semibold text-[#2d2d34] truncate">
                        {user?.fullName || reg.guestName || "Student"}
                        <span className="font-normal text-[#71717a] text-xs">
                          {" "}· {ev?.title}
                        </span>
                      </p>
                      <p className="text-[10px] font-mono text-[#71717a]">
                        Registered {new Date(reg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canApproveThisReg ? (
                      <>
                        <button
                          type="button"
                          className="h-6.5 px-2.5 rounded text-[10.5px] font-mono font-bold text-white bg-[#5f7560] hover:bg-[#4d604e] border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer"
                          onClick={() =>
                            updateRegistrationStatus(
                              reg.id,
                              "approved",
                              session.userId,
                            )
                          }
                        >
                          Approve → QR
                        </button>
                        <button
                          type="button"
                          className="h-6.5 px-2 text-[10.5px] font-mono text-[#71717a] hover:text-red-600 transition cursor-pointer"
                          onClick={() =>
                            updateRegistrationStatus(
                              reg.id,
                              "rejected",
                              session.userId,
                            )
                          }
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-[#71717a]">
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

      {/* ─── 04. SEARCH & STATUS FILTER BAR ─────────────────────────── */}
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category, or venue..."
              className="w-full pl-8.5 pr-8 h-9 rounded-[8px] bg-white border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34] font-mono text-xs text-[#2d2d34] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#f26430]"
              aria-label="Search events"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34] p-1"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Segmented Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {STATUS_CHIPS.filter(
              (chip) =>
                chip.key !== "draft" ||
                session.roleKey === "campus_lead" ||
                isHqRole(session.roleKey) ||
                hasEventDelegation,
            ).map((chip) => {
              const isActive = statusChip === chip.key;
              const count = counts[chip.key];
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusChip(chip.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-mono text-[11px] font-bold uppercase transition-all cursor-pointer",
                    isActive
                      ? "bg-[#2d2d34] text-white border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                      : "bg-white border border-[#2d2d34]/20 text-[#4b5563] hover:text-[#2d2d34] hover:border-[#2d2d34]/40 shadow-[1px_1px_0px_#2d2d34]/15",
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[9.5px] font-bold tabular-nums",
                      isActive
                        ? "bg-[#f26430] text-white"
                        : "bg-[#f3f4f6] text-[#4b5563]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 05. EVENT CARDS GRID (BAUHAUS MINIMAL) ───────────────── */}
        {events.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#2d2d34]/25 bg-white py-14 text-center shadow-[2px_2px_0px_#2d2d34]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 text-[#2d2d34] mb-3">
              <Calendar size={22} />
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-[16px] font-black text-[#2d2d34]">
              No programs scheduled yet
            </h4>
            <p className="mt-1 text-xs text-[#52525b] max-w-sm mx-auto font-mono">
              {canCreate
                ? "Initiate your chapter's first workshop, hackathon, or symposium to open registrations."
                : "Check back soon for new technical sessions and bootcamps from this chapter."}
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                Create First Event
              </button>
            )}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#2d2d34]/25 bg-white py-12 text-center shadow-[2px_2px_0px_#2d2d34]">
            <p className="text-sm font-bold text-[#2d2d34] font-mono">No matching events found</p>
            <p className="mt-1 text-xs text-[#52525b] font-mono">
              Try adjusting your search keywords or selecting another status filter.
            </p>
            <button
              type="button"
              className="mt-3 h-8 px-3 rounded-[7px] bg-white border border-[#2d2d34]/20 text-[#2d2d34] font-mono text-xs font-bold uppercase hover:bg-zinc-100 transition cursor-pointer"
              onClick={() => {
                setStatusChip("all");
                setSearch("");
              }}
            >
              Clear Filters & Search
            </button>
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
              const myReg = store.registrations.find(
                (r) =>
                  r.eventId === ev.id &&
                  (r.userId === session.userId ||
                    (session.authUserId && r.userId === session.authUserId)) &&
                  r.status !== "rejected",
              );

              return (
                <BauhausEventCard
                  key={ev.id}
                  event={ev}
                  chapter={chapter}
                  userId={session.userId}
                  roleKey={session.roleKey}
                  regState={regState}
                  myReg={myReg}
                  onRegister={(eventItem) => setSelectedEventForReg(eventItem)}
                  onStart={(eventId) => startEvent(eventId, session.userId)}
                  onEnd={(eventId) => endEvent(eventId, session.userId)}
                  onPublish={(eventItem) => publishEventFromList(eventItem)}
                  onStop={(eventItem) => stopEventFromList(eventItem)}
                  canManage={canManageThisEvent}
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

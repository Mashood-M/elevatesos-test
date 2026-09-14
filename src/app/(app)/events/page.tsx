"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isOpenToAllEvent, isEventVisibleToUser, canRegisterNow, getEventRegistrationState, canPublishEvent } from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { hasPermission } from "@/lib/permissions";
import { isFacultyRole } from "@/lib/access";
import { Search, Sparkles, Calendar, ArrowRight, Ban, Play } from "lucide-react";
import type { EventItem } from "@/types";

type FilterTab = "all" | "open_reg" | "workshop" | "challenge";

export default function OpenEventsPage() {
  const { store, updateEvent, createForm, setFormStatus } = useStore();
  const { session } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem | null>(null);
  const canCreate = hasPermission(store, session.roleKey, "event.create");

  function handlePublishEvent(ev: EventItem) {
    const existing = getEventForm(store, ev.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        ev.id,
        ev.chapterId,
        ev.title,
        ev,
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
    updateEvent(ev.id, {
      status: "registration_open",
      publishedAt: new Date().toISOString(),
      registrationStart: new Date().toISOString(),
    });
  }

  function handleStopEvent(ev: EventItem) {
    const existing = getEventForm(store, ev.id, "registration");
    if (existing && existing.status === "open") {
      setFormStatus(existing.id, "closed");
    }
    updateEvent(ev.id, {
      status: "registration_closed",
    });
  }

  // All events open across chapters / colleges
  const allOpenEvents = useMemo(() => {
    return store.events
      .filter((e) => isOpenToAllEvent(e) && isEventVisibleToUser(e, session.chapterId, session.roleKey))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [store.events, session.chapterId, session.roleKey]);

  // Filtered by search and category/status tab
  const filteredEvents = useMemo(() => {
    return allOpenEvents.filter((ev) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesCategory = ev.category?.toLowerCase().includes(q);
        const matchesVenue = ev.venue?.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesVenue && !matchesDesc) {
          return false;
        }
      }

      if (activeTab === "open_reg") {
        return ev.status === "registration_open";
      }
      if (activeTab === "workshop") {
        return ev.category?.toLowerCase() === "workshop";
      }
      if (activeTab === "challenge") {
        return (
          ev.category?.toLowerCase() === "challenge" ||
          ev.category?.toLowerCase() === "hackathon"
        );
      }

      return true;
    });
  }, [allOpenEvents, search, activeTab]);

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Events"
        description="Workshops, challenges, and hands-on sessions open to all students across campuses"
        actions={
          <div className="flex items-center gap-2">
            {canCreate ? (
              <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                Create event
              </Button>
            ) : null}
            {!session.chapterId ? (
              <Button variant="orange" onClick={() => setIsJoinModalOpen(true)}>
                Join Chapter with Code
              </Button>
            ) : null}
            <Link href="/referrals">
              <Button variant="ghost">Invite Friends</Button>
            </Link>
          </div>
        }
      />

      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {canCreate ? (
        <EventManagerCreateDialog
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          chapterId={session.chapterId || undefined}
        />
      ) : null}

      {/* Filter & Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "all"
                ? "bg-[var(--accent)] text-white"
                : "bg-bg-panel text-text-dim hover:text-text border border-border"
            }`}
          >
            All Events ({allOpenEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("open_reg")}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "open_reg"
                ? "bg-[var(--accent)] text-white"
                : "bg-bg-panel text-text-dim hover:text-text border border-border"
            }`}
          >
            Open for Registration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workshop")}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "workshop"
                ? "bg-[var(--accent)] text-white"
                : "bg-bg-panel text-text-dim hover:text-text border border-border"
            }`}
          >
            Workshops
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("challenge")}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "challenge"
                ? "bg-[var(--accent)] text-white"
                : "bg-bg-panel text-text-dim hover:text-text border border-border"
            }`}
          >
            Challenges
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, topics..."
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Events List */}
      <TerminalPanel
        title="open.events"
        meta={`${filteredEvents.length} available`}
        accent="orange"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-bg-panel border border-border text-text-dim">
              <Calendar size={20} />
            </div>
            <p className="text-[14px] font-semibold text-text">
              No matching events found
            </p>
            <p className="mt-1 text-[12px] text-text-dim max-w-sm mx-auto">
              {search
                ? `No events match "${search}". Try clearing your search query.`
                : "No open-to-all events are currently scheduled under this filter."}
            </p>
            {search ? (
              <Button
                variant="ghost"
                className="mt-3 text-xs"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredEvents.map((ev: EventItem) => {
              const regState = getEventRegistrationState(store, ev, session.userId);
              const eligibility = canRegisterNow(store, ev, session.userId);
              const chapter = store.chapters.find((c) => c.id === ev.chapterId);
              const eventHref = chapter
                ? `/chapter/${chapter.slug}/events/${ev.id}`
                : `/chapter`;
              const myReg = store.registrations.find(
                (r) =>
                  r.eventId === ev.id &&
                  (r.userId === session.userId || (session.authUserId && r.userId === session.authUserId)) &&
                  r.status !== "rejected",
              );

              return (
                <TicketCard
                  key={ev.id}
                  event={ev}
                  href={eventHref}
                  className="bg-bg shadow-[var(--shadow-sm)]"
                  meta={`${chapter ? chapter.college : "Elevates"} · open for all participants`}
                  hideStatus={true}
                  footer={
                    <div className="flex flex-wrap items-center gap-2">
                      {isFacultyRole(session.roleKey) ? (
                        <Link href={eventHref}>
                          <Button variant="primary" className="h-9 px-4">
                            View Details
                          </Button>
                        </Link>
                      ) : myReg ? (
                        <Link href={eventHref}>
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
                      ) : regState.status === "ended" ? (
                        <Link href={eventHref}>
                          <Button variant="primary" className="h-9 px-4">
                            Open Event
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

                      {/* Management Controls: Publish & Stop */}
                      {canPublishEvent(session.roleKey, ev, session.userId) ? (
                        ev.status === "registration_open" ? (
                          <Button
                            variant="danger"
                            className="h-9 px-3 text-xs flex items-center gap-1"
                            onClick={() => handleStopEvent(ev)}
                            title="Stop registration for this event"
                          >
                            <Ban size={13} />
                            Stop Registration
                          </Button>
                        ) : (
                          <Button
                            variant="orange"
                            className="h-9 px-3 text-xs flex items-center gap-1"
                            onClick={() => handlePublishEvent(ev)}
                            title="Publish / Open registration for this event"
                          >
                            <Play size={13} />
                            Publish Event
                          </Button>
                        )
                      ) : null}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </TerminalPanel>

      {/* Join Chapter Notice Card */}
      {!session.chapterId ? (
        <div className="mt-8 rounded-[14px] border border-border bg-bg-panel p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text">
                Want access to college-exclusive events?
              </p>
              <p className="mt-0.5 text-xs text-text-dim">
                Enter your campus invite code to join your college chapter, unlock private workshops, and collaborate with your local team.
              </p>
            </div>
            <Button
              variant="orange"
              className="text-xs"
              onClick={() => setIsJoinModalOpen(true)}
            >
              Enter College Code <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      ) : null}

      <EventRegistrationDialog
        open={Boolean(selectedEventForReg)}
        onClose={() => setSelectedEventForReg(null)}
        event={selectedEventForReg}
      />
    </div>
  );
}

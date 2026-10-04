"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  isOpenToAllEvent,
  isEventVisibleToUser,
  getEventRegistrationState,
  canPublishEvent,
  isEventOngoing,
} from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { BauhausEventCard } from "@/components/domain/bauhaus-event-card";
import { hasPermission } from "@/lib/permissions";
import {
  Search,
  Users,
  Plus,
  X,
  Zap,
} from "lucide-react";
import type { EventItem } from "@/types";

type FilterTab = "all" | "ongoing" | "open_reg" | "workshop" | "challenge";

export default function OpenEventsPage() {
  const { store, updateEvent, startEvent, endEvent, createForm, setFormStatus } = useStore();
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
      .sort((a, b) => {
        const timeB = new Date(b.startsAt || b.publishedAt || 0).getTime();
        const timeA = new Date(a.startsAt || a.publishedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [store.events, session.chapterId, session.roleKey]);

  // Metrics counts for Bauhaus statistics strip
  const ongoingCount = useMemo(() => {
    return allOpenEvents.filter((ev) => isEventOngoing(ev)).length;
  }, [allOpenEvents]);

  const openRegCount = useMemo(() => {
    return allOpenEvents.filter((ev) => ev.status === "registration_open").length;
  }, [allOpenEvents]);

  const workshopCount = useMemo(() => {
    return allOpenEvents.filter((ev) => ev.category?.toLowerCase() === "workshop").length;
  }, [allOpenEvents]);

  const challengeCount = useMemo(() => {
    return allOpenEvents.filter(
      (ev) =>
        ev.category?.toLowerCase() === "challenge" ||
        ev.category?.toLowerCase() === "hackathon",
    ).length;
  }, [allOpenEvents]);

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

      if (activeTab === "ongoing") {
        return isEventOngoing(ev);
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
    <div className="space-y-5 pb-12">
      {/* ─── 01. BAUHAUS ARCHITECTURAL HERO & MANIFESTO ─────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Bauhaus Geometric Accents in Background */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-36 h-16 w-16 bg-[#f59e0b] opacity-10 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Bauhaus Exhibition Eyebrow */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                ELEVATES SESSIONS // 2026
              </span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                COMMUNITY · LABS · CAMPUS
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-[1.2]">
              Form Follows Function.
              <span className="block text-[#f26430]">
                Cross-Campus Innovation Sessions.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-2 text-xs sm:text-[13px] font-medium text-[#52525b] leading-relaxed max-w-xl">
              Workshops, peer hackathons, and technical symposiums open to students across all university chapters. Learn, build, and earn verifiable credentials.
            </p>

            {/* Bauhaus Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8.5 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Create Session
                </button>
              )}

              {!session.chapterId && (
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  className="h-8.5 px-4 rounded-[8px] bg-[#414066] hover:bg-[#343353] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Zap size={13} />
                  Join Chapter With Code
                </button>
              )}

              <Link href="/referrals">
                <button
                  type="button"
                  className="h-8.5 px-3.5 rounded-[8px] bg-white hover:bg-zinc-100 text-[#2d2d34] font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] hover:border-[#2d2d34]/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Users size={13} />
                  Invite Network
                </button>
              </Link>
            </div>
          </div>

          {/* Right Graphic: Minimal Bauhaus Geometries (Flame Circle, Slate Square, Amber Diamond) */}
          <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[12px] shadow-[2px_2px_0px_rgba(45,45,52,0.1)] select-none shrink-0 w-60 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-2.5">
              {/* Flame Circle */}
              <div className="h-8.5 w-8.5 rounded-full bg-[#f26430] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[11px]">
                K
              </div>
              {/* Slate Square */}
              <div className="h-8.5 w-8.5 rounded-[3px] bg-[#414066] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[11px]">
                U
              </div>
              {/* Amber Diamond */}
              <div className="relative h-8.5 w-8.5 flex items-center justify-center">
                <div
                  className="h-8.5 w-8.5 bg-[#f59e0b] border border-[#2d2d34]/30 rotate-45 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-[#2d2d34] font-mono font-bold text-[11px]"
                >
                  <span className="-rotate-45">T</span>
                </div>
              </div>
            </div>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
              KUNST & TECHNIK
            </p>
            <p className="font-mono text-[8.5px] text-[#71717a] mt-0.5 uppercase tracking-widest">
              A NEW UNITY · ELEVATES OS
            </p>
            <div className="mt-2.5 w-full border-t border-[#2d2d34]/15 pt-2 flex items-center justify-between font-mono text-[9.5px] text-[#52525b]">
              <span>ACTIVE LABS</span>
              <span className="font-bold text-[#2d2d34]">{allOpenEvents.length} AVAILABLE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02. BAUHAUS METRIC BLOCKS ───────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Total */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between text-[#71717a] font-mono text-[9.5px] uppercase font-bold">
            <span>01 // TOTAL</span>
            <span className="h-1.5 w-1.5 bg-[#2d2d34]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
            {allOpenEvents.length}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            All Open Sessions
          </p>
        </div>

        {/* Metric 2: Live Now */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between text-[#f26430] font-mono text-[9.5px] uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26430] animate-ping" />
              02 // LIVE NOW
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#f26430] tracking-tight">
            {ongoingCount}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Active Realtime Labs
          </p>
        </div>

        {/* Metric 3: Open Reg */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between text-[#414066] font-mono text-[9.5px] uppercase font-bold">
            <span>03 // OPEN REG</span>
            <span className="h-1.5 w-1.5 rotate-45 bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#414066] tracking-tight">
            {openRegCount}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Passes Available
          </p>
        </div>

        {/* Metric 4: Workshops & Hacks */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between text-[#b45309] font-mono text-[9.5px] uppercase font-bold">
            <span>04 // WORKSHOPS</span>
            <span className="h-1.5 w-1.5 bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
            {workshopCount + challengeCount}
          </p>
          <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">
            Hands-on Technical
          </p>
        </div>
      </section>

      {/* ─── 03. BAUHAUS MODULAR FILTER BAR & SEARCH ─────────────────── */}
      <section className="bg-white border border-[#2d2d34]/20 rounded-[14px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segmented Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* All */}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`h-8 px-3 rounded-[7px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeTab === "all"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                  : "bg-white text-[#4b5563] border-[#2d2d34]/20 hover:text-[#2d2d34] hover:border-[#2d2d34]/40 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <span className="h-1.5 w-1.5 bg-current" />
              All Sessions ({allOpenEvents.length})
            </button>

            {/* Live / Ongoing */}
            <button
              type="button"
              onClick={() => setActiveTab("ongoing")}
              className={`h-8 px-3 rounded-[7px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeTab === "ongoing"
                  ? "bg-[#f26430] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                  : "bg-white text-[#f26430] border-[#2d2d34]/20 hover:bg-[#fef0eb] shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              Live / Ongoing ({ongoingCount})
            </button>

            {/* Open Registration */}
            <button
              type="button"
              onClick={() => setActiveTab("open_reg")}
              className={`h-8 px-3 rounded-[7px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeTab === "open_reg"
                  ? "bg-[#414066] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                  : "bg-white text-[#414066] border-[#2d2d34]/20 hover:bg-[#414066]/5 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <span className="h-1.5 w-1.5 rotate-45 bg-current" />
              Open Registration ({openRegCount})
            </button>

            {/* Workshops */}
            <button
              type="button"
              onClick={() => setActiveTab("workshop")}
              className={`h-8 px-3 rounded-[7px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeTab === "workshop"
                  ? "bg-[#f59e0b] text-[#2d2d34] border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]"
                  : "bg-white text-[#b45309] border-[#2d2d34]/20 hover:bg-amber-50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <span className="h-1.5 w-1.5 bg-current" />
              Workshops ({workshopCount})
            </button>

            {/* Challenges */}
            <button
              type="button"
              onClick={() => setActiveTab("challenge")}
              className={`h-8 px-3 rounded-[7px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeTab === "challenge"
                  ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f59e0b]"
                  : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-zinc-100 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
              }`}
            >
              <span className="h-1.5 w-1.5 rotate-45 bg-current" />
              Challenges ({challengeCount})
            </button>
          </div>

          {/* Architectural Search Input */}
          <div className="relative w-full lg:w-72">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH SESSIONS, VENUES..."
              className="w-full h-8 pl-8 pr-8 bg-[#faf9f6] text-[#2d2d34] font-mono text-[11px] uppercase placeholder:text-[#a1a1aa] border border-[#2d2d34]/20 rounded-[7px] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] focus:outline-none focus:bg-white focus:border-[#2d2d34] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34] cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── 04. EVENTS LIST / GRID ──────────────────────────────────── */}
      {filteredEvents.length === 0 ? (
        /* Bauhaus Empty State */
        <div className="bg-white border border-dashed border-[#2d2d34]/25 rounded-[16px] p-8 sm:p-12 text-center shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#f26430] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34]" />
            <div className="h-7 w-7 rounded-[3px] bg-[#414066] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34]" />
            <div className="h-7 w-7 bg-[#f59e0b] border border-[#2d2d34]/30 rotate-45 shadow-[1px_1px_0px_#2d2d34]" />
          </div>

          <h3 className="font-[family-name:var(--font-display)] font-black text-base sm:text-lg text-[#2d2d34] uppercase tracking-tight">
            Keine Termine // No Matching Sessions
          </h3>
          <p className="mt-1 text-xs sm:text-[12.5px] font-mono text-[#52525b] max-w-md mx-auto">
            {search
              ? `Zero events found matching query "${search}". Try resetting the search filter.`
              : "No sessions currently scheduled under this category. Check back soon for upcoming chapter announcements."}
          </p>

          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-3.5 h-8 px-3.5 rounded-[7px] bg-[#2d2d34] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430] hover:bg-[#f26430] transition-all cursor-pointer"
            >
              Reset Search Filter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="mt-3.5 h-8 px-3.5 rounded-[7px] bg-[#2d2d34] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#414066] transition-all cursor-pointer"
            >
              View All Sessions
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredEvents.map((ev: EventItem) => {
            const regState = getEventRegistrationState(store, ev, session.userId);
            const chapter = store.chapters.find((c) => c.id === ev.chapterId);
            const myReg = store.registrations.find(
              (r) =>
                r.eventId === ev.id &&
                (r.userId === session.userId ||
                  (session.authUserId && r.userId === session.authUserId)) &&
                r.status !== "rejected",
            );

            const canManage = Boolean(
              canPublishEvent(session.roleKey, ev, session.userId) ||
                session.roleKey === "campus_lead" ||
                session.roleKey === "chairman" ||
                session.roleKey === "elevates_coordinator" ||
                session.roleKey === "hq_admin" ||
                ev.organizerId === session.userId,
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
                canManage={canManage}
                onRegister={(targetEv) => setSelectedEventForReg(targetEv)}
                onStart={(id) => startEvent(id, session.userId)}
                onEnd={(id) => endEvent(id, session.userId)}
                onPublish={(targetEv) => handlePublishEvent(targetEv)}
                onStop={(targetEv) => handleStopEvent(targetEv)}
              />
            );
          })}
        </div>
      )}

      {/* ─── MODALS & REGISTRATION DIALOGS ───────────────────────────── */}
      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {canCreate && (
        <EventManagerCreateDialog
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          chapterId={session.chapterId || undefined}
        />
      )}

      <EventRegistrationDialog
        open={Boolean(selectedEventForReg)}
        onClose={() => setSelectedEventForReg(null)}
        event={selectedEventForReg}
      />
    </div>
  );
}

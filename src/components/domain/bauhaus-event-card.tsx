"use client";

import React from "react";
import Link from "next/link";
import { isEventOngoing, isEventEnded } from "@/lib/events";
import { isFacultyRole } from "@/lib/access";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Play,
  Ban,
  ArrowUpRight,
  Ticket,
} from "lucide-react";
import type { EventItem, Chapter, RoleKey } from "@/types";

interface BauhausEventCardProps {
  event: EventItem;
  chapter?: Chapter;
  userId?: string;
  roleKey: RoleKey;
  regState: {
    status: string;
    isUpcoming?: boolean;
    isClosed?: boolean;
    isWaitlist?: boolean;
    reason?: string;
  };
  myReg?: {
    status: string;
  };
  onRegister: (event: EventItem) => void;
  onStart?: (eventId: string) => void;
  onEnd?: (eventId: string) => void;
  onPublish?: (event: EventItem) => void;
  onStop?: (event: EventItem) => void;
  canManage?: boolean;
}

export function BauhausEventCard({
  event,
  chapter,
  roleKey,
  regState,
  myReg,
  onRegister,
  onStart,
  onEnd,
  onPublish,
  onStop,
  canManage = false,
}: BauhausEventCardProps) {
  const ongoing = isEventOngoing(event);
  const ended = isEventEnded(event) || event.status === "completed";
  const eventHref = chapter
    ? `/chapter/${chapter.slug}/events/${event.id}`
    : `/chapter`;

  // Parse start date for Bauhaus date badge
  const dateObj = event.startsAt ? new Date(event.startsAt) : new Date();
  const dayNumber = isNaN(dateObj.getTime())
    ? "01"
    : String(dateObj.getDate()).padStart(2, "0");
  const monthAbbr = isNaN(dateObj.getTime())
    ? "SESSION"
    : dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const timeFormatted = isNaN(dateObj.getTime())
    ? "TBA"
    : dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

  // Determine Bauhaus color scheme for this card based on category & status
  const categoryLower = (event.category || "").toLowerCase();
  let themeColor: "flame" | "slate" | "amber" | "dark" = "slate";
  if (ongoing) {
    themeColor = "flame";
  } else if (categoryLower.includes("challenge") || categoryLower.includes("hack")) {
    themeColor = "slate";
  } else if (categoryLower.includes("workshop") || categoryLower.includes("bootcamp")) {
    themeColor = "amber";
  } else if (ended || event.status === "registration_closed") {
    themeColor = "dark";
  }

  const posterSrc = event.thumbnailUrl || event.posterUrl;

  return (
    <article
      className="group relative flex flex-col sm:flex-row bg-white border border-[#2d2d34]/20 rounded-[12px] overflow-hidden shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* ─── LEFT: POSTER / ARCHITECTURAL MEDIA PILLAR ───────────────── */}
      <div className="relative w-full sm:w-[135px] md:w-[150px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#2d2d34]/20 bg-zinc-900 overflow-hidden min-h-[110px] sm:min-h-0">
        <Link href={eventHref} className="absolute inset-0 z-10" aria-label={event.title} />

        {posterSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={posterSrc}
            alt={event.title}
            className="w-full h-32 sm:h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Minimal Bauhaus Graphic Placeholder */
          <div className="w-full h-32 sm:h-full bg-[#faf9f6] flex flex-col items-center justify-center p-3 text-center select-none relative bauhaus-grid-bg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-4.5 w-4.5 rounded-full bg-[#f26430] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[8px] font-black">
                E
              </span>
              <span className="h-4.5 w-4.5 rounded-[2px] bg-[#414066] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[8px] font-black">
                O
              </span>
              <span className="h-4.5 w-4.5 bg-[#f59e0b] border border-[#2d2d34] rotate-45 flex items-center justify-center text-[#2d2d34] font-mono text-[8px] font-black">
                S
              </span>
            </div>
            <span className="font-mono text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
              {chapter ? chapter.shortCode || chapter.slug.toUpperCase() : "ELEVATES"}
            </span>
          </div>
        )}

        {/* Overlaid Date Stamp on Top-Left */}
        <div className="absolute top-2 left-2 z-20 flex flex-col items-center justify-center bg-[#2d2d34] text-white border border-[#2d2d34] px-1.5 py-0.5 rounded-[5px] shadow-[1px_1px_0px_#f26430] select-none font-mono pointer-events-none">
          <span className="text-[12px] font-black leading-none">{dayNumber}</span>
          <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mt-0.5 text-zinc-300">
            {monthAbbr}
          </span>
        </div>

        {/* Live Pulse Indicator on Top-Right */}
        {ongoing && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-[#f26430] text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded border border-white/40 shadow-[1px_1px_0px_#2d2d34] uppercase tracking-wider animate-pulse pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </div>
        )}
      </div>

      {/* ─── RIGHT: COMPACT EVENT CONTENT & ACTIONS ──────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-3.5 min-w-0 bg-[#faf9f6]/30">
        <div className="min-w-0">
          {/* Top Metadata Row: Badges, Chapter, Live Status */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {/* Category Pill with Bauhaus shape */}
              <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#2d2d34] border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    themeColor === "flame"
                      ? "bg-[#f26430]"
                      : themeColor === "amber"
                      ? "bg-[#f59e0b]"
                      : "bg-[#414066]"
                  }`}
                />
                {event.category || "SESSION"}
              </span>

              {/* Chapter Tag */}
              <span className="inline-flex items-center font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                {chapter ? chapter.shortCode || chapter.slug.toUpperCase() : "ELEVATES"}
              </span>

              {/* Visibility Badge */}
              <span className="hidden md:inline-flex items-center font-mono text-[8.5px] font-medium text-[#52525b] px-1.5 py-0.5 border border-[#2d2d34]/12 rounded bg-white">
                {event.visibility === "open_to_all" || event.visibility === "public"
                  ? "OPEN TO ALL"
                  : "CAMPUS"}
              </span>
            </div>

            {/* Live or Status Chip */}
            <div className="shrink-0">
              {ongoing ? (
                <span className="inline-flex items-center gap-1 bg-[#f26430] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded border border-[#2d2d34]/20 shadow-[1px_1px_0px_#2d2d34] uppercase tracking-wider animate-pulse">
                  <span className="h-1 w-1 rounded-full bg-white" />
                  LIVE NOW
                </span>
              ) : ended ? (
                <span className="font-mono text-[9px] font-semibold text-[#71717a] bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded uppercase">
                  CONCLUDED
                </span>
              ) : event.status === "registration_open" ? (
                <span className="font-mono text-[9px] font-bold text-[#5f7560] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                  OPEN
                </span>
              ) : (
                <span className="font-mono text-[9px] font-medium text-[#52525b] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded uppercase">
                  {event.status.replaceAll("_", " ")}
                </span>
              )}
            </div>
          </div>

          {/* Event Title */}
          <Link href={eventHref} className="block group/title">
            <h3 className="font-[family-name:var(--font-display)] text-[14px] sm:text-[15px] font-black text-[#2d2d34] tracking-tight leading-snug line-clamp-1 group-hover/title:text-[#f26430] transition-colors">
              {event.title}
            </h3>
          </Link>

          {/* Optional Short Description */}
          {event.description ? (
            <p className="mt-0.5 text-[11px] text-[#52525b] line-clamp-1 leading-relaxed">
              {event.description}
            </p>
          ) : null}

          {/* Compact Info Row: Time & Venue */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-[#52525b]">
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-[#f26430] shrink-0" />
              <span>{timeFormatted}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <MapPin size={11} className="text-[#414066] shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[200px]">
                {event.venue || "Campus / Online"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── ACTION FOOTER ───────────────────────────────────────────── */}
        <div className="mt-2.5 pt-2 border-t border-[#2d2d34]/10 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {isFacultyRole(roleKey) ? (
              <Link href={eventHref}>
                <button
                  type="button"
                  className="h-7.5 px-3 rounded-[6px] bg-[#2d2d34] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
                >
                  View Details <ArrowUpRight size={11} />
                </button>
              </Link>
            ) : myReg ? (
              <Link href={eventHref}>
                <button
                  type="button"
                  className={`h-7.5 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1 ${
                    myReg.status === "approved"
                      ? "bg-[#5f7560] text-white"
                      : myReg.status === "waitlisted"
                      ? "bg-[#f59e0b] text-[#2d2d34]"
                      : "bg-[#414066] text-white"
                  }`}
                >
                  <Ticket size={11} />
                  {myReg.status === "approved"
                    ? "Pass Confirmed"
                    : myReg.status === "waitlisted"
                    ? "Waitlisted Pass"
                    : "Registered"}
                </button>
              </Link>
            ) : ongoing ? (
              <Link href={eventHref}>
                <button
                  type="button"
                  className="h-7.5 px-3 rounded-[6px] bg-[#f26430] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1 animate-pulse"
                >
                  <Play size={10} className="fill-current" />
                  Live Ongoing
                </button>
              </Link>
            ) : regState.status === "ended" ? (
              <Link href={eventHref}>
                <button
                  type="button"
                  className="h-7.5 px-2.5 rounded-[6px] bg-zinc-100 text-[#52525b] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:bg-zinc-200 transition cursor-pointer"
                >
                  View Details
                </button>
              </Link>
            ) : regState.status === "upcoming" || regState.isUpcoming ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="h-7.5 px-2.5 rounded-[6px] bg-zinc-100 text-[#71717a] font-mono text-[10.5px] font-semibold uppercase tracking-wider border border-[#2d2d34]/15 cursor-not-allowed opacity-80"
                >
                  Not Started
                </button>
                <Link href={eventHref}>
                  <button
                    type="button"
                    className="h-7.5 px-2 rounded-[6px] bg-white text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:bg-zinc-100 transition"
                  >
                    Details
                  </button>
                </Link>
              </div>
            ) : regState.isClosed ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="h-7.5 px-2.5 rounded-[6px] bg-zinc-100 text-[#71717a] font-mono text-[10.5px] font-semibold uppercase tracking-wider border border-[#2d2d34]/15 cursor-not-allowed opacity-75"
                >
                  Reg. Closed
                </button>
                <Link href={eventHref}>
                  <button
                    type="button"
                    className="h-7.5 px-2 rounded-[6px] bg-white text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:bg-zinc-100 transition"
                  >
                    Details
                  </button>
                </Link>
              </div>
            ) : regState.isWaitlist ? (
              <button
                type="button"
                onClick={() => onRegister(event)}
                className="h-7.5 px-3 rounded-[6px] bg-[#f59e0b] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
              >
                Join Waitlist
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRegister(event)}
                className="h-7.5 px-3 rounded-[6px] bg-[#f26430] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
              >
                <Ticket size={11} />
                Register Now
              </button>
            )}

            {/* Quick Details link */}
            {!isFacultyRole(roleKey) && !ended && (
              <Link href={eventHref}>
                <button
                  type="button"
                  className="h-7.5 px-2 rounded-[6px] bg-white text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.1)] hover:bg-[#2d2d34] hover:text-white transition-all cursor-pointer"
                >
                  Details
                </button>
              </Link>
            )}
          </div>

          {/* Management Controls: Lead, Chairman, HQ Admin, Organizer */}
          {canManage && (
            <div className="flex items-center gap-1">
              {ongoing ? (
                onEnd && (
                  <button
                    type="button"
                    onClick={() => onEnd(event.id)}
                    className="h-7.5 px-2.5 rounded-[6px] bg-[#f26430] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
                    title="End event and conclude session"
                  >
                    <CheckCircle2 size={11} />
                    End
                  </button>
                )
              ) : ended ? (
                <span className="font-mono text-[9px] font-semibold text-[#71717a] bg-zinc-200 px-1.5 py-0.5 rounded border border-zinc-300 uppercase">
                  Closed
                </span>
              ) : (
                <>
                  {event.status !== "cancelled" && onStart && (
                    <button
                      type="button"
                      onClick={() => onStart(event.id)}
                      className="h-7.5 px-2.5 rounded-[6px] bg-[#5f7560] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
                      title="Start event now"
                    >
                      <Play size={10} className="fill-current" />
                      Start
                    </button>
                  )}

                  {onPublish && onStop && (
                    event.status === "registration_open" ? (
                      <button
                        type="button"
                        onClick={() => onStop(event)}
                        className="h-7.5 px-2 rounded-[6px] bg-zinc-100 text-[#f26430] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.1)] hover:bg-orange-50 transition cursor-pointer flex items-center gap-1"
                        title="Stop registration"
                      >
                        <Ban size={10} />
                        Stop
                      </button>
                    ) : event.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => onPublish(event)}
                        className="h-7.5 px-2 rounded-[6px] bg-[#2d2d34] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition cursor-pointer flex items-center gap-1"
                        title="Publish registration"
                      >
                        <Play size={10} />
                        {event.status === "registration_closed" ? "Reopen" : "Publish"}
                      </button>
                    ) : null
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export const ArchitecturalEventCard = BauhausEventCard;

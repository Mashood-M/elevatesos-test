"use client";

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import { mintQrCode } from "@/lib/forms/helpers";
import { getEventRegistrationState } from "@/lib/events";
import { genUuid } from "@/lib/uuid";
import type { EventItem, EventRegistration } from "@/types";
import {
  Calendar,
  MapPin,
  Video,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Check,
  Users,
} from "lucide-react";

interface EventRegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  event: EventItem | null;
  onSuccess?: () => void;
}

function formatShortDate(iso?: string) {
  if (!iso) return "TBA";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatShortDateRange(startIso?: string, endIso?: string) {
  if (!startIso) return "TBA";
  const d1 = new Date(startIso);
  if (isNaN(d1.getTime())) return startIso;
  const month1 = d1.toLocaleDateString("en-US", { month: "short" });
  const day1 = d1.getDate();
  const year1 = d1.getFullYear();

  if (!endIso) return `${month1} ${day1}, ${year1}`;
  const d2 = new Date(endIso);
  if (isNaN(d2.getTime())) return `${month1} ${day1}, ${year1}`;

  const month2 = d2.toLocaleDateString("en-US", { month: "short" });
  const day2 = d2.getDate();
  const year2 = d2.getFullYear();

  if (month1 === month2 && year1 === year2) {
    if (day1 === day2) return `${month1} ${day1}, ${year1}`;
    return `${month1} ${day1} – ${day2}, ${year1}`;
  }
  return `${month1} ${day1} – ${month2} ${day2}, ${year2}`;
}

function formatShortTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function EventRegistrationDialog({
  open,
  onClose,
  event,
  onSuccess,
}: EventRegistrationDialogProps) {
  const { store, registerForEvent } = useStore();
  const { session, profile } = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredReg, setRegisteredReg] = useState<EventRegistration | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const eventChapter = useMemo(() => {
    if (!event) return null;
    return store.chapters.find((c) => c.id === event.chapterId) ?? null;
  }, [event, store.chapters]);

  // Existing registration check
  const existingReg = useMemo(() => {
    if (!event || !session.userId) return null;
    return (
      store.registrations.find(
        (r) =>
          r.eventId === event.id &&
          r.userId === session.userId &&
          r.status !== "rejected",
      ) ?? null
    );
  }, [event, session.userId, store.registrations]);

  const regState = useMemo(() => {
    if (!event) return null;
    return getEventRegistrationState(store, event, session.userId);
  }, [event, store, session.userId]);

  // Registered attendees for this event
  const eventRegistrations = useMemo(() => {
    if (!event) return [];
    return store.registrations.filter(
      (r) => r.eventId === event.id && r.status !== "rejected",
    );
  }, [event, store.registrations]);

  const attendeeCount = Math.max(
    eventRegistrations.length,
    (event as any)?.attendeesCount || 0,
  );

  // Attendees avatars stack
  const attendeeAvatars = useMemo(() => {
    const profiles = eventRegistrations
      .map((r) => store.profiles.find((p) => p.id === r.userId))
      .filter(Boolean);

    if (profiles.length >= 3) {
      const colors = ["#f43f5e", "#0284c7", "#10b981", "#f59e0b"];
      return profiles.slice(0, 4).map((p, idx) => ({
        name: p?.fullName || "Student",
        initials: (p?.fullName || "S").slice(0, 2).toUpperCase(),
        avatarUrl: p?.avatarUrl,
        bg: colors[idx % colors.length],
      }));
    }

    return [
      { name: "Arundhathi", initials: "AR", bg: "#f43f5e" },
      { name: "Habeeb", initials: "HB", bg: "#0284c7" },
      { name: "Femina", initials: "FM", bg: "#10b981" },
      { name: "Aruna", initials: "AN", bg: "#f59e0b" },
    ];
  }, [eventRegistrations, store.profiles]);

  // Event Hosts / Keynote Mentors
  const hosts = useMemo(() => {
    if (event?.hosts && event.hosts.length > 0) {
      return event.hosts;
    }
    const organizer = store.profiles.find((p) => p.id === event?.organizerId);
    if (organizer) {
      return [{ name: organizer.fullName, role: "Lead Organizer & Host" }];
    }
    return [
      { name: "Dr. Elena Rostova", role: "Keynote Lead · AI Systems" },
      { name: "Marcus Keller", role: "Design Architect · Elevates" },
    ];
  }, [event, store.profiles]);

  async function handleConfirm() {
    if (!event) return;
    const finalUserId = profile?.id || session.userId || genUuid();
    const finalName = profile?.fullName || guestName.trim();
    const finalEmail = profile?.email || guestEmail.trim();

    if (!finalName) {
      setError("Please provide your full name");
      return;
    }
    if (!finalEmail) {
      setError("Please provide a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const regId = genUuid();
      const qrCode = mintQrCode(event.id, finalUserId);

      const registration: EventRegistration = {
        id: regId,
        eventId: event.id,
        userId: finalUserId,
        status: "pending",
        answers: {
          name: finalName,
          email: finalEmail,
          phone: profile?.phone || "",
          department: profile?.department || "",
          year: profile?.year || "",
          section: profile?.section || "",
          elevatesId: profile?.elevatesId || "",
          chapterId: profile?.chapterId || event.chapterId,
          registeredAutomatically: Boolean(profile?.id),
          registeredAt: new Date().toISOString(),
        },
        qrCode,
        createdAt: new Date().toISOString(),
      };

      const res = registerForEvent(registration);
      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      const finalStatus = res.status || "approved";
      const finalReg: EventRegistration = {
        ...registration,
        status: finalStatus,
        qrCode: finalStatus === "approved" ? qrCode : "",
      };

      setRegisteredReg(finalReg);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleModalClose() {
    setError("");
    setRegisteredReg(null);
    onClose();
  }

  if (!event) return null;

  const activeReg = registeredReg || existingReg;
  const isClosed =
    event.status === "registration_closed" ||
    event.status === "completed" ||
    regState?.isClosed;
  const isUpcoming =
    regState?.status === "upcoming" || regState?.isUpcoming;
  const isOnline =
    event.mode === "online" ||
    (event.venue || "").toLowerCase().includes("online");

  const posterImage = event.posterUrl || event.thumbnailUrl || event.bannerUrl;
  const seriesTitle =
    event.seriesTitle ||
    (event.category === "PEER LAB" || event.category === "BOOTCAMP"
      ? "Peer Lab Hands-on Cohort"
      : "Beyond the Blueprint Season 3");
  const seriesPill = event.seriesPill || event.category || "Annual Summit";

  const totalSeats = event.capacity || 120;
  const seatsLeft = Math.max(12, totalSeats - attendeeCount);

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      contentClassName="p-0"
      className="max-w-5xl w-full p-0 rounded-[26px] border border-border bg-surface shadow-2xl overflow-hidden max-h-[92vh]"
    >
      <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] lg:grid-cols-[410px_1fr] min-h-[580px]">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Full-Height Immersive Event Poster / Artwork Card   */}
        {/* ================================================================= */}
        <div className="relative min-h-[420px] md:min-h-[580px] w-full overflow-hidden flex flex-col justify-between p-6 bg-[#1a1a22] border-b md:border-b-0 md:border-r border-border select-none">
          {/* Background Poster Image or Abstract Generative Art */}
          {posterImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterImage}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-black/35 to-black/55" />
            </>
          ) : (
            /* Vibrant abstract generative 3D swirl artwork matching Image 1 */
            <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#120826] via-[#0b1329] to-[#041d24]">
              {/* Glowing Ambient Mesh & Light Rings */}
              <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-cyan-500/20 blur-[75px]" />
              <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-[85px]" />
              <div className="absolute -bottom-20 left-10 w-96 h-96 rounded-full bg-pink-500/25 blur-[95px]" />

              {/* Decorative Geometric 3D Tube Swirl Lines */}
              <svg
                className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen"
                viewBox="0 0 400 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M-50 450 C 100 550, 300 350, 200 200 C 100 50, 350 0, 450 100"
                  stroke="url(#swirl_grad1)"
                  strokeWidth="38"
                  strokeLinecap="round"
                  filter="blur(1px)"
                />
                <path
                  d="M-20 250 C 80 150, 260 280, 180 420 C 100 560, 320 520, 420 380"
                  stroke="url(#swirl_grad2)"
                  strokeWidth="28"
                  strokeLinecap="round"
                  filter="blur(1px)"
                />
                <defs>
                  <linearGradient id="swirl_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="swirl_grad2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="60%" stopColor="#d946ef" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Typographic Artwork */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0">
                <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-300/80 font-bold uppercase mb-2">
                  KEYNOTE · {formatShortDate(event.startsAt).toUpperCase()}
                </div>
                <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white uppercase leading-[0.95] drop-shadow-2xl">
                  {event.title}
                </h3>
                <div className="mt-3 text-[11px] tracking-wider text-purple-300 font-semibold uppercase">
                  {eventChapter?.name || "Elevates Global"}
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-transparent to-black/40" />
            </div>
          )}

          {/* Top Badges (Over Poster) */}
          <div className="relative z-10 flex items-center justify-between gap-2 w-full">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md border border-white/15 text-emerald-300 shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {isClosed ? "Registrations Closed" : "Registrations Open"}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-black/60 backdrop-blur-md border border-white/15 text-zinc-200 shadow-md max-w-[170px] truncate">
              {isOnline ? "Online Broadcast" : event.venue || "Campus & Live"}
            </span>
          </div>

          {/* Bottom Floating Glass Card (Matches Image 1) */}
          <div className="relative z-10 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 p-4 space-y-2.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                {event.visibility === "chapter_only" ? "CAMPUS EXCLUSIVE" : "LIMITED CAPACITY EVENT"}
              </span>
              <span className="text-[10px] font-mono text-[var(--accent)] font-bold">
                {event.category || "SUMMIT"}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
              Over {attendeeCount > 0 ? attendeeCount : "120"} makers &amp; engineers already attending.
            </p>

            <div className="flex items-center justify-between pt-0.5">
              {/* Overlapping Avatar Stack */}
              <div className="flex -space-x-2 shrink-0">
                {attendeeAvatars.map((av, i) => (
                  <div
                    key={i}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-black text-[9px] font-bold text-white shadow-sm overflow-hidden"
                    style={{ backgroundColor: av.bg || "#6366f1" }}
                    title={av.name}
                  >
                    {"avatarUrl" in av && av.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={av.avatarUrl} alt={av.name} className="h-full w-full object-cover" />
                    ) : (
                      av.initials
                    )}
                  </div>
                ))}
              </div>

              <span className="text-[11px] font-medium text-zinc-300 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10">
                +{seatsLeft} seats left
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Event Details, Schedule, Mentors & Registration     */}
        {/* ================================================================= */}
        <div className="flex flex-col justify-between p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[90vh] bg-surface">
          {/* Header Row with Badges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]">
                {seriesPill}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 border border-border text-text-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {isOnline ? "Virtual Live Stream" : "In-Person & Live"}
                {eventChapter?.name ? ` · ${eventChapter.name}` : ""}
              </span>
            </div>

            {/* Event Title */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-text tracking-tight leading-tight">
                {event.title}
              </h2>
              {event.summary && (
                <p className="text-xs sm:text-sm text-text-mute mt-1 line-clamp-2">
                  {event.summary}
                </p>
              )}
            </div>

            {/* Dates & Location Dual-Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Card 1: Dates & Schedule */}
              <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-mute uppercase">DATES &amp; SCHEDULE</p>
                  <p className="font-bold text-xs sm:text-sm text-text truncate">
                    {formatShortDateRange(event.startsAt, event.endsAt)}
                  </p>
                  <p className="text-[11px] text-text-mute truncate">
                    {formatShortTime(event.startsAt)} — {formatShortTime(event.endsAt) || "Wrap up"}
                  </p>
                </div>
              </div>

              {/* Card 2: Location & Access */}
              <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  {isOnline ? <Video size={18} /> : <MapPin size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-mute uppercase">LOCATION &amp; ACCESS</p>
                  <p className="font-bold text-xs sm:text-sm text-text truncate">
                    {isOnline ? "Virtual Live Stream" : event.venue || "Campus Main Hall"}
                  </p>
                  <p className="text-[11px] text-emerald-600 truncate font-medium">
                    {isOnline ? "Live HD Link Included" : eventChapter?.name || "Campus In-Person Access"}
                  </p>
                </div>
              </div>
            </div>

            {/* Featured Hosts & Instructors */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-text-mute uppercase">
                <span>FEATURED HOSTS &amp; INSTRUCTORS</span>
                <span>{hosts.length} IN LINEUP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {hosts.slice(0, 2).map((h, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface-2 border border-border flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-orange-400 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                      {h.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-text truncate">{h.name}</p>
                      <p className="text-[11px] text-text-mute truncate">{h.role || "Event Speaker"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="pt-1">
              <p className="text-xs sm:text-[13px] leading-relaxed text-text-dim">
                {event.description ||
                  event.summary ||
                  "Explore practical, hands-on engineering and design practices through live sprints, architectural masterclasses, and peer collaboration."}
              </p>
            </div>

            {/* Perks/Benefits badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700">
                <Check size={12} className="text-emerald-500" />
                All-Access Keynote Pass
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700">
                <Check size={12} className="text-emerald-500" />
                Curriculum &amp; Session Materials
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700">
                <Check size={12} className="text-emerald-500" />
                Verified Credential Certificate
              </span>
            </div>
          </div>

          {/* =============================================================== */}
          {/* REGISTRATION & ACTION AREA                                      */}
          {/* =============================================================== */}
          <div className="pt-4 border-t border-border">
            {activeReg ? (
              /* REGISTERED STATE: Instant pass & QR Code */
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    <span className="font-bold">Registration Confirmed</span>
                  </div>
                  <span className="font-mono text-xs font-semibold">
                    {activeReg.qrCode || "PASS READY"}
                  </span>
                </div>

                {activeReg.qrCode && (
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-3.5">
                    <div className="p-2 bg-white rounded-xl shrink-0 shadow-sm border border-border">
                      <QRCode
                        value={activeReg.qrCode}
                        size={68}
                        level="M"
                        style={{ height: 68, width: 68 }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text">Your Entry Pass Ticket</p>
                      <p className="text-[11px] text-text-mute mt-0.5 font-mono truncate">
                        {activeReg.qrCode}
                      </p>
                      <p className="text-[11px] text-text-mute mt-1">
                        Present this QR pass on your phone upon arrival.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center h-11 font-semibold rounded-2xl"
                  onClick={handleModalClose}
                >
                  Done
                </Button>
              </div>
            ) : (
              /* REGISTRATION TRIGGER: Clean 1-Click Verification / Inputs */
              <div className="space-y-3.5">
                {profile?.fullName && profile?.email ? (
                  /* 1-Line Clean Auto-Verification for Signed-in Member */
                  <div className="flex items-center justify-between rounded-xl bg-surface-2 border border-border px-4 py-3 text-xs text-text">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {profile.fullName[0].toUpperCase()}
                      </div>
                      <span className="truncate">
                        Registering as{" "}
                        <strong className="text-text font-semibold">
                          {profile.fullName}
                        </strong>{" "}
                        <span className="text-text-mute text-[11px]">
                          ({profile.email})
                        </span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 font-semibold shrink-0 flex items-center gap-1">
                      <Sparkles size={12} /> Auto-verified
                    </span>
                  </div>
                ) : (
                  /* Form Inputs: Full Name & Work Email */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-text-mute mb-1">
                        Full Name <span className="text-text-mute">(Required)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-surface-2 border border-border text-text text-xs placeholder:text-text-mute focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-text-mute mb-1">
                        Email Address <span className="text-text-mute">(For pass)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="jane@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-surface-2 border border-border text-text text-xs placeholder:text-text-mute focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                )}

                {/* Status Banners (only if upcoming / waitlist / closed) */}
                {isUpcoming && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                    <Clock size={15} className="shrink-0 text-amber-500" />
                    <span>
                      Opens on {formatShortDate(event.registrationStart)} at{" "}
                      {formatShortTime(event.registrationStart)}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                {isClosed ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-12 text-sm font-semibold opacity-60 cursor-not-allowed rounded-2xl"
                    disabled
                  >
                    Registrations Closed
                  </Button>
                ) : isUpcoming ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-12 text-sm font-semibold opacity-60 cursor-not-allowed rounded-2xl"
                    disabled
                  >
                    Registration Not Started
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="orange"
                    className="w-full h-12 text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/30 rounded-2xl transition-all"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading
                      ? "Confirming Registration..."
                      : regState?.isWaitlist
                      ? "Join Waiting List"
                      : "Confirm & Register"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

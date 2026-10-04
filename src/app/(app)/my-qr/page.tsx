"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  MapPin,
  Maximize2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useStore, useCurrentUser, showToast } from "@/context/store-context";
import { cn, formatDateTime } from "@/lib/utils";
import { mintQrCode } from "@/lib/forms/helpers";

// Render QR code using the installed `qrcode` package via canvas
function useQrCanvas(value: string, size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!value) return;
    import("qrcode")
      .then((QRCode) => {
        if (!canvasRef.current || !isMounted) return;
        return QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: { dark: "#2d2d34", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
      })
      .then(() => {
        if (isMounted) setReady(true);
      })
      .catch(() => {
        if (isMounted) setError(true);
      });
    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return { canvasRef, ready, error };
}

export default function MyQrPage() {
  const { store } = useStore();
  const { session, profile } = useCurrentUser();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Events this student is registered for
  const myRegistrations = useMemo(() => {
    return store.registrations.filter(
      (r) => r.userId === session.userId && r.status !== "rejected",
    );
  }, [store.registrations, session.userId]);

  const myEvents = myRegistrations
    .map((r) => {
      const ev = store.events.find((e) => e.id === r.eventId);
      return ev ? { event: ev, registration: r } : null;
    })
    .filter(Boolean) as {
      event: (typeof store.events)[0];
      registration: (typeof store.registrations)[0];
    }[];

  const effectiveEventId = selectedEventId || myEvents[0]?.event.id || "";
  const selected = myEvents.find((m) => m.event.id === effectiveEventId);
  const qrValue =
    selected?.registration.qrCode ||
    (selected ? mintQrCode(selected.event.id, session.userId) : "");

  const { canvasRef, ready, error } = useQrCanvas(
    qrValue,
    fullscreen ? 380 : 250,
  );

  // Try to boost screen brightness on fullscreen via wake lock
  useEffect(() => {
    if (!fullscreen) return;
    let lock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      (
        navigator as Navigator & {
          wakeLock: { request: (t: string) => Promise<WakeLockSentinel> };
        }
      ).wakeLock
        .request("screen")
        .then((l) => {
          lock = l;
        })
        .catch(() => {});
    }
    return () => {
      lock?.release().catch(() => {});
    };
  }, [fullscreen]);

  const handleCopyId = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    showToast("Pass ID copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const userChapter = store.chapters.find((c) => c.id === session.chapterId);
  const userChapterSlug = userChapter?.slug ?? store.chapters[0]?.slug;
  const backHref = userChapterSlug ? `/chapter/${userChapterSlug}` : "/chapter";

  // ─── FULLSCREEN VIEW ────────────────────────────────────────────────────────
  if (fullscreen && qrValue) {
    return (
      <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-between bg-[#faf9f6] p-6 bauhaus-grid-bg">
        {/* Top Bar */}
        <div className="w-full max-w-lg flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-2 rounded-[8px] border border-[#2d2d34] bg-white px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            Exit Fullscreen
          </button>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-[#71717a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
            High Contrast Scan Mode
          </div>
        </div>

        {/* Center QR Plate */}
        <div className="flex flex-col items-center max-w-sm w-full bg-white border-2 border-[#2d2d34] rounded-[16px] p-6 shadow-[5px_5px_0px_#2d2d34] text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#2d2d34] text-white font-mono text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={13} className="text-[#f26430]" />
            {selected?.event.title || "Elevates Pass"}
          </div>

          <div className="relative rounded-[12px] bg-white p-3 border border-[#2d2d34]/20 shadow-[2px_2px_0px_rgba(45,45,52,0.1)]">
            <canvas
              ref={canvasRef}
              className={cn("block mx-auto", !ready && "opacity-0")}
              style={{ borderRadius: "8px" }}
            />
            {!ready && !error && (
              <div className="flex h-[320px] w-[320px] items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-[#71717a]" />
              </div>
            )}
          </div>

          <p className="mt-4 font-mono text-[11px] font-bold text-[#2d2d34] bg-[#faf9f6] px-3 py-1.5 rounded-[6px] border border-[#2d2d34]/20 select-all">
            {qrValue}
          </p>

          <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold text-[#2d2d34]">
            {profile?.fullName ?? "Elevates Member"}
          </p>
          <p className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider">
            {userChapter?.name || "Campus Chapter"} ·{" "}
            {session.roleKey.replace("_", " ")}
          </p>
        </div>

        {/* Footer info */}
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#71717a]">
          ☀️ Maximize screen brightness for desk scanner check-in
        </p>
      </div>
    );
  }

  // ─── STANDARD VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-14 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#52525b] hover:text-[#2d2d34] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to chapter overview
      </Link>

      {/* ─── 01. ARCHITECTURAL HERO ────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="max-w-xl">
            {/* Monospace Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CREDENTIALS // VENUE CHECK-IN
              </span>
              <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                ELEVATES ID · OFFLINE READY
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
              My Digital Ticket Pass.
            </h1>
            <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
              Show this high-resolution QR pass at campus workshops, hackathons,
              and peer labs for rapid offline check-in and instantaneous
              attendance verification.
            </p>
          </div>

          {/* Right Geometric Badge */}
          <div className="hidden sm:flex flex-col items-center justify-center p-3.5 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[12px] shadow-[2px_2px_0px_rgba(45,45,52,0.08)] select-none shrink-0 w-44 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-[#f26430] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[10px]">
                Q
              </div>
              <div className="h-7 w-7 rounded-[2px] bg-[#414066] border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] flex items-center justify-center text-white font-mono font-bold text-[10px]">
                R
              </div>
            </div>
            <p className="font-mono text-[9px] font-bold text-[#2d2d34] uppercase tracking-wider">
              OFFLINE VERIFICATION
            </p>
            <p className="font-mono text-[8px] text-[#71717a] uppercase tracking-widest mt-0.5">
              NO WI-FI REQUIRED
            </p>
          </div>
        </div>
      </section>

      {/* ─── 02. METRIC STRIP ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>01 // PASS STATUS</span>
            <span className="h-2 w-2 rounded-full bg-[#5f7560]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#2d2d34]">
            {myEvents.length > 0 ? "VALID & ACTIVE" : "STANDBY"}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Elevates ID Synced
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>02 // REGISTERED</span>
            <span className="h-2 w-2 rounded-[2px] bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#f26430]">
            {myEvents.length} EVENTS
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Active Registrations
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>03 // VENUE</span>
            <span className="h-2 w-2 bg-[#414066] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#414066] truncate">
            {selected?.event.venue || "Campus Lab"}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Selected Check-in
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>04 // SERIAL</span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-mono text-[13px] font-bold text-[#2d2d34] truncate">
            {qrValue ? qrValue.slice(0, 14) + "..." : "NONE"}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Digital Token
          </p>
        </div>
      </section>

      {/* ─── 03. TICKET PASS OR EMPTY STATE ───────────────────────────── */}
      {myEvents.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[2px_2px_0px_rgba(45,45,52,0.05)]">
          <div className="h-12 w-12 rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 flex items-center justify-center mx-auto mb-3 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <QrCode size={22} className="text-[#71717a]" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
            No Active Event Registrations
          </h3>
          <p className="mt-1 max-w-sm mx-auto text-[12.5px] text-[#71717a]">
            You have not registered for any upcoming events yet. Register for an
            event or peer lab to generate your venue check-in QR pass.
          </p>
          <Link
            href="/events"
            className="mt-4 inline-flex items-center gap-1.5 h-8.5 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all"
          >
            Explore Events Catalog →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Event Picker If Multiple */}
          {myEvents.length > 1 && (
            <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-4 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34] flex items-center gap-1.5">
                  <Ticket size={13} className="text-[#f26430]" />
                  Select Active Ticket / Pass ({myEvents.length} Available)
                </label>
                <span className="font-mono text-[9px] text-[#71717a] uppercase">
                  SWITCH PASS
                </span>
              </div>
              <select
                className="w-full h-10 px-3 rounded-[8px] bg-[#faf9f6] border border-[#2d2d34]/30 font-mono text-[12px] font-medium text-[#2d2d34] focus:outline-none focus:border-[#f26430] shadow-[1px_1px_0px_#2d2d34]"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {myEvents.map(({ event }) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {event.venue || "Campus Venue"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collectible Architectural Ticket Pass */}
          {selected && (
            <div className="relative overflow-hidden rounded-[16px] border-2 border-[#2d2d34] bg-white shadow-[4px_4px_0px_#2d2d34]">
              {/* Ticket Top Inverted Header */}
              <div className="bg-[#2d2d34] px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f26430]" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f26430]">
                    OFFICIAL ADMISSION PASS
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-[#d4d4d8]">
                  <span>{userChapter?.name || "ELEVATES CAMPUS"}</span>
                  <span>{"//"}</span>
                  <span className="font-bold text-white">SEC-01</span>
                </div>
              </div>

              {/* Event Title Block */}
              <div className="p-5 sm:p-6 border-b border-[#2d2d34]/15 bg-[#faf9f6]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-black text-[#2d2d34] leading-tight">
                      {selected.event.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#52525b]">
                      <span className="flex items-center gap-1 font-bold text-[#2d2d34]">
                        <MapPin size={12} className="text-[#f26430]" />
                        {selected.event.venue || "Campus Lab"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {selected.event.startsAt
                          ? formatDateTime(selected.event.startsAt)
                          : "Scheduled Session"}
                      </span>
                    </div>
                  </div>

                  <span className="self-start inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-[6px] bg-[#2d2d34] text-white shadow-[1px_1px_0px_#f26430]">
                    VALID TICKET
                  </span>
                </div>
              </div>

              {/* Perforated Ticket Divider Simulation */}
              <div className="relative py-2 flex items-center justify-between bg-white px-4">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#f3f4f6] border-r-2 border-[#2d2d34]" />
                <div className="w-full border-b-2 border-dashed border-[#2d2d34]/25" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#f3f4f6] border-l-2 border-[#2d2d34]" />
              </div>

              {/* Center Body: QR Plate + Student Details */}
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Plate */}
                <div className="flex flex-col items-center">
                  <div className="relative rounded-[12px] bg-white p-3 border-2 border-[#2d2d34] shadow-[3px_3px_0px_#2d2d34]">
                    <canvas
                      ref={canvasRef}
                      className={cn("block mx-auto", !ready && "opacity-0")}
                      style={{ borderRadius: "6px" }}
                    />
                    {!ready && !error && (
                      <div className="flex h-[250px] w-[250px] items-center justify-center">
                        <RefreshCw
                          size={24}
                          className="animate-spin text-[#71717a]"
                        />
                      </div>
                    )}
                    {error && (
                      <div className="flex h-[250px] w-[250px] flex-col items-center justify-center gap-2 text-center">
                        <QrCode
                          size={28}
                          className="text-[#71717a] opacity-40"
                        />
                        <p className="font-mono text-[11px] text-[#71717a]">
                          Could not render QR
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Monospace Serial Stamp */}
                  <div className="mt-3 flex items-center gap-1.5 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[6px] px-3 py-1 font-mono text-[10.5px] font-bold text-[#2d2d34]">
                    <span>TOKEN:</span>
                    <span className="text-[#f26430] select-all">
                      {qrValue || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Student Credentials & Verification Details */}
                <div className="space-y-4 bg-[#faf9f6] border border-[#2d2d34]/20 rounded-[12px] p-4 sm:p-5 shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.06)]">
                  <div>
                    <span className="font-mono text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                      ATTENDEE CREDENTIALS
                    </span>
                    <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#2d2d34] mt-0.5">
                      {profile?.fullName || "Student Attendee"}
                    </p>
                    <p className="font-mono text-[11px] text-[#71717a]">
                      {profile?.email || "student@campus.edu"}
                    </p>
                  </div>

                  <div className="border-t border-[#2d2d34]/15 pt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-[#71717a] uppercase block text-[8.5px]">
                        ROLE
                      </span>
                      <span className="font-bold text-[#2d2d34] uppercase">
                        {session.roleKey.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717a] uppercase block text-[8.5px]">
                        REGISTRATION STATUS
                      </span>
                      <span className="font-bold text-[#5f7560] uppercase flex items-center gap-1">
                        <Check size={11} /> CONFIRMED
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#2d2d34]/15 pt-3 space-y-2">
                    {/* Action 1: Show Fullscreen */}
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      className="w-full h-9 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Maximize2 size={13} />
                      Show Fullscreen For Scan
                    </button>

                    {/* Action 2: Copy Pass ID */}
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="w-full h-8.5 rounded-[8px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied To Clipboard" : "Copy Token Code"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ticket Footer Strip */}
              <div className="bg-[#faf9f6] border-t border-[#2d2d34]/15 px-5 py-2.5 flex flex-wrap items-center justify-between font-mono text-[9.5px] text-[#71717a]">
                <span>ELEVATES OPERATING SYSTEM · VERIFIED ADMISSION</span>
                <span>DESK SCAN VERIFIED {"//"} NO INTERNET REQUIRED</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

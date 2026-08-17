"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, QrCode, RefreshCw } from "lucide-react";
import { useStore, useCurrentUser } from "@/context/store-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

// Render QR code using the installed `qrcode` package via canvas
function useQrCanvas(value: string, size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) return;
    setReady(false);
    setError(false);
    import("qrcode")
      .then((QRCode) => {
        if (!canvasRef.current) return;
        return QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: { dark: "#2d2d34", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
      })
      .then(() => setReady(true))
      .catch(() => setError(true));
  }, [value, size]);

  return { canvasRef, ready, error };
}

export default function MyQrPage() {
  const { store } = useStore();
  const { session, profile } = useCurrentUser();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  // Events this student is registered for (approved)
  const myRegistrations = useMemo(() => {
    return store.registrations.filter(
      (r) => r.userId === session.userId && r.status === "approved",
    );
  }, [store.registrations, session.userId]);

  const myEvents = useMemo(() => {
    return myRegistrations
      .map((r) => {
        const ev = store.events.find((e) => e.id === r.eventId);
        return ev ? { event: ev, registration: r } : null;
      })
      .filter(Boolean) as { event: (typeof store.events)[0]; registration: (typeof store.registrations)[0] }[];
  }, [myRegistrations, store.events]);

  // Auto-select first event
  useEffect(() => {
    if (myEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(myEvents[0].event.id);
    }
  }, [myEvents, selectedEventId]);

  const selected = myEvents.find((m) => m.event.id === selectedEventId);
  const qrValue = selected?.registration.qrCode ?? "";

  const { canvasRef, ready, error } = useQrCanvas(qrValue, fullscreen ? 420 : 280);

  // Try to boost screen brightness on fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    // Request wake lock to keep screen on
    let lock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock
        .request("screen")
        .then((l) => { lock = l; })
        .catch(() => {});
    }
    return () => { lock?.release().catch(() => {}); };
  }, [fullscreen]);

  const firstName = profile?.fullName?.split(" ")[0] ?? "You";

  if (fullscreen && qrValue) {
    return (
      <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center bg-white">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-2 rounded-full bg-[var(--bg)] px-4 py-2 text-[13px] font-medium text-text-dim"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <p className="text-[12px] text-text-mute">Show this to the organizer</p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-6 px-8">
          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_48px_rgba(45,45,52,0.12)]">
            <canvas
              ref={canvasRef}
              className={cn("block", !ready && "opacity-0")}
              style={{ borderRadius: "12px" }}
            />
            {!ready && !error && (
              <div className="flex h-[420px] w-[420px] items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-text-mute" />
              </div>
            )}
          </div>

          {/* Name + event */}
          <div className="text-center">
            <p className="text-[22px] font-extrabold tracking-[-0.03em] text-text">
              {profile?.fullName ?? "Student"}
            </p>
            <p className="mt-1 text-[14px] text-text-dim">
              {selected?.event.title}
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
              {qrValue}
            </p>
          </div>
        </div>

        {/* Brightness hint */}
        <p className="absolute bottom-8 text-[12px] text-text-mute">
          ☀️ Turn up your screen brightness for easier scanning
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {/* Back */}
      <Link
        href={`/chapter/${store.chapters.find((c) => c.id === session.chapterId)?.slug ?? "ekc"}`}
        className="mb-8 flex items-center gap-2 text-[13px] text-text-mute hover:text-text"
      >
        <ArrowLeft size={15} />
        Back to chapter
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
          <QrCode size={26} className="text-[var(--accent)]" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-extrabold tracking-[-0.04em] text-text">
          My QR Code
        </h1>
        <p className="mt-2 text-[14px] text-text-dim">
          Show this to the organizer or CR to mark your attendance.
        </p>
      </div>

      {myEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
          <QrCode size={32} className="mx-auto mb-3 text-text-mute opacity-40" />
          <p className="text-[14px] font-medium text-text-dim">No approved registrations</p>
          <p className="mt-1 text-[13px] text-text-mute">
            Register for an event first — once approved, your QR code will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Event picker */}
          {myEvents.length > 1 && (
            <div className="mb-6">
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-text-mute">
                Select event
              </label>
              <Select
                className="h-11 w-full rounded-xl bg-white"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {myEvents.map(({ event }) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* QR Card */}
          {selected && (
            <div className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow)]">
              {/* Event bar */}
              <div className="border-b border-[var(--border)] px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-mute">
                  {selected.event.title}
                </p>
                <p className="mt-0.5 text-[13px] text-text-dim">
                  {selected.event.venue}
                </p>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center gap-5 px-6 py-8">
                <div className="relative rounded-2xl bg-white p-3 shadow-[0_4px_20px_rgba(45,45,52,0.08)]">
                  <canvas
                    ref={canvasRef}
                    className={cn("block", !ready && "opacity-0")}
                    style={{ borderRadius: "8px" }}
                  />
                  {!ready && !error && (
                    <div className="flex h-[280px] w-[280px] items-center justify-center">
                      <RefreshCw size={20} className="animate-spin text-text-mute" />
                    </div>
                  )}
                  {error && (
                    <div className="flex h-[280px] w-[280px] flex-col items-center justify-center gap-2 text-center">
                      <QrCode size={28} className="text-text-mute opacity-40" />
                      <p className="text-[13px] text-text-mute">Could not render QR</p>
                    </div>
                  )}
                </div>

                {/* Code */}
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                  {qrValue}
                </p>

                {/* Student name */}
                <div className="text-center">
                  <p className="text-[15px] font-bold text-text">{profile?.fullName ?? firstName}</p>
                  <p className="text-[12px] text-text-mute">{profile?.email}</p>
                </div>
              </div>

              {/* Fullscreen CTA */}
              <div className="border-t border-[var(--border)] px-6 py-4">
                <Button
                  type="button"
                  variant="orange"
                  className="flex w-full items-center justify-center gap-2"
                  onClick={() => setFullscreen(true)}
                >
                  <Maximize2 size={15} />
                  Show fullscreen for scanning
                </Button>
                <p className="mt-2 text-center text-[11px] text-text-mute">
                  Tap to expand · Screen stays on
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

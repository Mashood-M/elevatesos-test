"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast, useCurrentUser } from "@/context/store-context";
import { EventLessonsCard } from "@/components/domain/event-lessons-card";
import { EventGatedResources } from "@/components/domain/event-gated-resources";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Globe,
  Layers,
  Lock,
  Maximize2,
  QrCode,
  Send,
  Settings2,
  Share2,
  Shield,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";
import type { PeerLabSeriesItem } from "@/components/domain/peer-lab-manager-dialog";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-amber-100 text-amber-700 border border-amber-200",
  Active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Completed: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  Upcoming: "bg-blue-100 text-blue-700 border border-blue-200",
};

interface PeerLabDetailDialogProps {
  lab: PeerLabSeriesItem | null;
  open: boolean;
  onClose: () => void;
  onEnrollmentChange?: () => void;
  chapterName?: string;
  canManage?: boolean;
  onPublish?: (lab: PeerLabSeriesItem) => void;
  onEdit?: (lab: PeerLabSeriesItem) => void;
}

export function PeerLabDetailDialog({
  lab,
  open,
  onClose,
  onEnrollmentChange,
  chapterName,
  canManage,
  onPublish,
  onEdit,
}: PeerLabDetailDialogProps) {
  const { session, profile } = useCurrentUser();
  const [enrolling, setEnrolling] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [localEnrolled, setLocalEnrolled] = useState<boolean | null>(null);
  const [showFullscreenPass, setShowFullscreenPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    setLocalEnrolled(null);
  }, [lab?.id]);

  // Request wake lock to keep screen active when presenting pass on phone
  useEffect(() => {
    if (!showFullscreenPass) return;
    let lock: WakeLockSentinel | null = null;
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } })
        .wakeLock.request("screen")
        .then((l) => {
          lock = l;
        })
        .catch(() => {});
    }
    return () => {
      lock?.release().catch(() => {});
    };
  }, [showFullscreenPass]);

  if (!lab) return null;

  const isEnrolled = localEnrolled !== null ? localEnrolled : Boolean(lab.enrolled);
  const isOpenToAll = !lab.chapterId;
  const isClosed = lab.applicationsOpen === false;
  const sessionCount = lab.lessons?.length ?? 0;
  const posterSrc = lab.posterUrl || lab.thumbnailUrl;

  const elevatesId = profile?.elevatesId || "";
  const passSerial = elevatesId
    ? `PASS-${elevatesId}`
    : `PASS-LAB-${(lab.slug || lab.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}-${session.userId ? session.userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() : "USR"}`;
  const qrValue = elevatesId || passSerial;

  const handleEnroll = async () => {
    if (!session.userId) {
      showToast("Please sign in to register", "error");
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "enroll_peer_lab", data: { labId: lab.id } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Enrollment failed");
      setLocalEnrolled(true);
      showToast("🎉 Enrolled successfully! Your Peer Lab Pass is ready.", "success");
      onEnrollmentChange?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to enroll", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("Withdraw from this Peer Lab? Your pass will be cancelled.")) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "enroll_peer_lab", data: { labId: lab.id, action: "withdraw" } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to withdraw");
      setLocalEnrolled(false);
      showToast("Withdrawn from Peer Lab. Pass cancelled.", "info");
      onEnrollmentChange?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error withdrawing", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied!", "success");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        className="max-w-4xl w-full p-0 border-0 rounded-[28px] overflow-hidden bg-white shadow-2xl"
      >
        <div className="flex flex-col md:flex-row min-h-0 max-h-[92vh]">

          {/* LEFT: Poster Panel - Cropped & Fitted with Ambient Atmosphere */}
          <div className="relative md:w-[42%] md:flex-shrink-0 min-h-[300px] sm:min-h-[360px] md:min-h-[580px] bg-gradient-to-br from-[#1a1a22] via-[#2d2d34] to-[#111117] overflow-hidden flex flex-col justify-between select-none">
            {posterSrc ? (
              <>
                {/* Atmospheric Ambient Blur Backdrop */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={posterSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover blur-2xl opacity-40 scale-125"
                  />
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                </div>

                {/* Main Poster Image - Cropped and Fitted cleanly */}
                <img
                  src={posterSrc}
                  alt={lab.title}
                  className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300"
                />

                {/* Scrim for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20 pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/30 via-purple-900/20 to-[#1a1a22]" />
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <BookOpen size={36} className="text-white/60" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Top badges & Full Poster toggle */}
            <div className="relative z-10 p-4 flex items-center justify-between gap-2 w-full">
              <div className="flex flex-wrap gap-1.5 items-center">
                {isOpenToAll ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white shadow-sm">
                    <Globe size={10} /> Global
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-zinc-900 shadow-sm">
                    <Shield size={10} className="text-[var(--accent)]" />
                    {chapterName || "Campus"}
                  </span>
                )}
                {lab.track && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-md border border-white/10">
                    {lab.track}
                  </span>
                )}
              </div>

              {/* View Full Poster button */}
              {posterSrc && (
                <button
                  type="button"
                  onClick={() => setShowPosterModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-sm transition cursor-pointer"
                  title="Click to view full uncropped poster"
                >
                  <Maximize2 size={11} />
                  <span>Full Poster</span>
                </button>
              )}
            </div>

            {/* Bottom info */}
            <div className="relative z-10 p-5 pt-8">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2 shadow-xs ${
                  STATUS_STYLES[lab.status] ?? "bg-white/20 text-white"
                }`}
              >
                {lab.status}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-display)] text-white leading-snug drop-shadow-sm">
                {lab.title}
              </h2>
              {lab.subtitle && (
                <p className="text-[13px] text-zinc-200 mt-1 line-clamp-2 drop-shadow-xs leading-relaxed">
                  {lab.subtitle}
                </p>
              )}

              {/* Quick stat chips */}
              <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-white/15">
                {sessionCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-200">
                    <Layers size={11} className="text-[var(--accent)]" /> {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-200">
                  <Users size={11} /> {lab.joinedCount} enrolled
                </span>
                {lab.maxParticipants && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-200">
                    <Lock size={11} /> {lab.maxParticipants} seats max
                  </span>
                )}
              </div>
            </div>
          </div>

        {/* RIGHT: Details Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">

          {/* Sticky header bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100 shrink-0">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
              Peer Lab
            </p>
            <button
              onClick={handleShare}
              className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-900"
              title="Share"
            >
              <Share2 size={14} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Lead Controls */}
            {canManage && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Settings2 size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">Lead Controls</p>
                    <p className="text-[12px] text-amber-700 mt-0.5 leading-snug">
                      {lab.status === "Draft"
                        ? "Hidden from students. Publish to open campus registrations."
                        : lab.applicationsOpen !== false
                          ? "Published · Accepting student registrations."
                          : "Published · Registrations paused."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lab.status === "Draft" && onPublish && (
                    <Button
                      size="sm"
                      variant="orange"
                      onClick={() => onPublish(lab)}
                      className="gap-1.5 rounded-full text-xs font-bold"
                    >
                      <Send size={12} /> Publish
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { onClose(); onEdit(lab); }}
                      className="rounded-full text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Enrollment Section: Official Access Pass or Registration CTA */}
            {isEnrolled ? (
              <div className="rounded-[22px] border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 p-4 sm:p-5 shadow-sm relative overflow-hidden">
                {/* Decorative background watermark */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

                {/* Pass Header */}
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-emerald-200/90 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase flex items-center gap-1.5 font-mono">
                      <Ticket size={13} className="text-emerald-600" />
                      Official Cohort Pass
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    Pass Active
                  </span>
                </div>

                {/* Pass Ticket Body: QR Code + Attendee Identity */}
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                  {/* Left QR Plate */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-emerald-200/70 shadow-xs shrink-0 w-full sm:w-auto">
                    <div className="p-1.5 bg-white rounded-xl">
                      <QRCode
                        value={qrValue}
                        size={92}
                        level="M"
                        style={{ height: 92, width: 92 }}
                      />
                    </div>
                    <span className="mt-1.5 font-mono text-[10px] font-bold text-zinc-700 tracking-tight">
                      {passSerial}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-medium">Scan for lab check-in</span>
                  </div>

                  {/* Right Attendee & Program Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2 text-center sm:text-left w-full">
                    <div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md mb-1">
                        {lab.track || "Learning Track"} · Attendee Pass
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug truncate">
                        {profile?.fullName || "Student Member"}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 mt-1 text-[11px] text-zinc-600">
                        {elevatesId && (
                          <span className="font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {elevatesId}
                          </span>
                        )}
                        <span>{chapterName || (lab.chapterId ? "Campus Chapter" : "Elevates Global")}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-100/80 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-zinc-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                        <Layers size={12} className="text-emerald-600" />
                        {sessionCount} Session{sessionCount === 1 ? "" : "s"} All-Access
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-500 truncate max-w-[200px]">
                        {lab.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pass Quick Action Buttons */}
                <div className="mt-4 pt-3 border-t border-dashed border-emerald-200/90 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="orange"
                      size="sm"
                      onClick={() => setShowFullscreenPass(true)}
                      className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-xs"
                    >
                      <Maximize2 size={12} />
                      <span>Fullscreen Pass</span>
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(qrValue);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                          showToast("Pass code copied to clipboard!", "success");
                        }
                      }}
                      className="h-8 px-2.5 text-xs rounded-xl gap-1"
                      title="Copy Pass Code"
                    >
                      {copiedPass ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span className="hidden sm:inline">{copiedPass ? "Copied" : "Copy Code"}</span>
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={enrolling}
                    className="text-[11px] font-medium text-zinc-400 hover:text-red-600 transition cursor-pointer p-1"
                  >
                    Withdraw Registration
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl border p-4 transition-colors ${
                  isClosed
                    ? "bg-zinc-50 border-zinc-200"
                    : "bg-white border-zinc-200 shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isClosed ? "bg-zinc-100" : "bg-[var(--accent)]/10"
                      }`}
                    >
                      {isClosed ? (
                        <Lock size={18} className="text-zinc-400" />
                      ) : (
                        <Sparkles size={18} className="text-[var(--accent)]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">
                        {isClosed ? "Registrations closed" : "Reserve your seat & get pass"}
                      </p>
                      <p className="text-[12px] text-zinc-500 mt-0.5 leading-snug">
                        {isClosed
                          ? "Not accepting new registrations right now."
                          : "Enroll to receive your official QR access pass instantly."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={isClosed ? "secondary" : "orange"}
                      size="sm"
                      onClick={!isClosed ? handleEnroll : undefined}
                      disabled={enrolling || isClosed}
                      className="rounded-full px-5 text-xs font-bold gap-1 shadow-sm"
                    >
                      {enrolling ? "Enrolling…" : isClosed ? "Closed" : (
                        <><span>Enroll Now</span><ChevronRight size={13} /></>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Seat progress bar */}
                {lab.maxParticipants && (
                  <div className="mt-3 pt-3 border-t border-black/5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                      <span>{lab.joinedCount} enrolled</span>
                      <span>{lab.maxParticipants} total seats</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                        style={{ width: `${Math.min(100, (lab.joinedCount / lab.maxParticipants) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {lab.description && (
              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  About this Peer Lab
                </h4>
                <p className="text-[13.5px] text-zinc-700 leading-relaxed whitespace-pre-line">
                  {lab.description}
                </p>
              </section>
            )}

            {/* Facilitators */}
            {lab.facilitators?.length > 0 && (
              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Instructors & Mentors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {lab.facilitators.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs hover:border-[var(--accent)]/40 hover:shadow-sm transition-all"
                    >
                      <div className="h-7 w-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold flex items-center justify-center text-[11px] uppercase">
                        {f.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 leading-tight">{f.name}</p>
                        <p className="text-[10px] text-zinc-400">{f.role || "Mentor"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sessions */}
            {lab.lessons?.length > 0 && (
              <section className="pt-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Sessions · {lab.lessons.length} {lab.lessons.length === 1 ? "session" : "sessions"}
                </h4>
                <EventLessonsCard
                  lessons={lab.lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    dateText: l.date,
                    timeText: l.time,
                    mode: l.location,
                    actionUrl: l.eventSlug ? `/events/${l.eventSlug}` : undefined,
                  }))}
                  seriesTitle={lab.title}
                />
              </section>
            )}

            {/* Resources */}
            {lab.resources?.length > 0 && (
              <section className="pt-1 pb-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Curriculum Resources
                </h4>
                <EventGatedResources
                  resources={lab.resources.map((r, i) => ({
                    id: String(i),
                    title: r.title,
                    type: (r.type?.toLowerCase() as "slides" | "code" | "notes" | "recording") || "notes",
                    url: r.url,
                    isGated: r.isGated ?? true,
                  }))}
                  isRegistered={isEnrolled}
                  onRegisterClick={handleEnroll}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </Dialog>

      {/* Lightbox to inspect full, uncropped poster flyer */}
      {showPosterModal && posterSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowPosterModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{lab.title}</span>
                <span className="text-xs text-white/60">· Full Poster Flyer</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-2xl">
              <img
                src={posterSrc}
                alt={lab.title}
                className="max-h-[82vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Pass Presentation Modal (for venue / lab door check-in) */}
      {showFullscreenPass && (
        <div
          className="fixed inset-0 z-[110] flex flex-col items-center justify-between bg-zinc-950/95 backdrop-blur-md p-6 text-white select-none animate-in fade-in duration-200"
          onClick={() => setShowFullscreenPass(false)}
        >
          {/* Header */}
          <div
            className="w-full max-w-sm flex items-center justify-between pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Official Entry Pass
            </span>
            <button
              type="button"
              onClick={() => setShowFullscreenPass(false)}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white cursor-pointer"
              title="Close Fullscreen Pass"
            >
              <X size={18} />
            </button>
          </div>

          {/* Centered Pass Plate */}
          <div
            className="w-full max-w-sm flex flex-col items-center justify-center space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* White QR Plate */}
            <div className="p-6 rounded-3xl bg-white shadow-2xl flex flex-col items-center">
              <QRCode
                value={qrValue}
                size={220}
                level="H"
                style={{ height: 220, width: 220 }}
              />
              <p className="mt-3 font-mono text-xs font-bold text-zinc-800 tracking-wider">
                {passSerial}
              </p>
            </div>

            {/* Attendee Info */}
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold font-[family-name:var(--font-display)] text-white">
                {profile?.fullName || "Student Member"}
              </h3>
              <p className="text-xs text-zinc-300 font-medium">
                {lab.title}
              </p>
              <p className="text-[11px] text-zinc-400">
                {chapterName || (lab.chapterId ? "Campus Chapter" : "Elevates Global")} · {lab.track || "Cohort Track"}
              </p>
              {elevatesId && (
                <p className="mt-1 font-mono text-[11px] text-emerald-400 font-semibold">
                  {elevatesId}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="w-full max-w-sm pb-4 text-center">
            <p className="text-[12px] text-zinc-400">
              ☀️ Hold up to the camera or scanner at the lab entrance
            </p>
          </div>
        </div>
      )}
    </>
  );
}

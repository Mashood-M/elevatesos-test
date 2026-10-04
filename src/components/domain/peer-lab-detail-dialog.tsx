"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog } from "@/components/ui/dialog";
import { showToast, useCurrentUser } from "@/context/store-context";
import { EventLessonsCard } from "@/components/domain/event-lessons-card";
import { EventGatedResources } from "@/components/domain/event-gated-resources";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Globe,
  Layers,
  Lock,
  Maximize2,
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
  const [prevLabId, setPrevLabId] = useState<string | undefined>(lab?.id);
  if (lab?.id !== prevLabId) {
    setPrevLabId(lab?.id);
    setLocalEnrolled(null);
  }

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
        className="max-w-4xl w-full p-0 border border-[#2d2d34]/30 rounded-[16px] overflow-hidden bg-white shadow-[4px_4px_0px_#2d2d34]"
      >
        <div className="flex flex-col md:flex-row min-h-0 max-h-[92vh]">

          {/* LEFT: Poster Panel */}
          <div className="relative md:w-[40%] md:flex-shrink-0 min-h-[300px] sm:min-h-[360px] md:min-h-[580px] bg-zinc-900 border-b md:border-b-0 md:border-r border-[#2d2d34]/20 overflow-hidden flex flex-col justify-between select-none">
            {posterSrc ? (
              <>
                {/* Atmospheric Ambient Backdrop */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover blur-2xl opacity-40 scale-125"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                </div>

                {/* Main Poster Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc}
                  alt={lab.title}
                  className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300"
                />

                {/* Scrim for Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-[#faf9f6] bauhaus-grid-bg flex flex-col items-center justify-center p-6 text-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-7 w-7 rounded-full bg-[#f26430] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[11px] font-black shadow-[1px_1px_0px_#2d2d34]">
                    P
                  </span>
                  <span className="h-7 w-7 rounded-[3px] bg-[#414066] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[11px] font-black shadow-[1px_1px_0px_#2d2d34]">
                    L
                  </span>
                  <span className="h-7 w-7 bg-[#f59e0b] border border-[#2d2d34] rotate-45 flex items-center justify-center text-[#2d2d34] font-mono text-[11px] font-black shadow-[1px_1px_0px_#2d2d34]">
                    <span className="-rotate-45">B</span>
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                  {isOpenToAll ? "GLOBAL TRACK" : chapterName || "CAMPUS LAB"}
                </span>
                <span className="font-mono text-[9px] text-[#71717a] uppercase tracking-widest mt-1">
                  SYLLABUS &amp; SPECIFICATIONS
                </span>
              </div>
            )}

            {/* Top badges & Full Poster toggle */}
            <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between gap-2 w-full">
              <div className="flex flex-wrap gap-1.5 items-center">
                {isOpenToAll ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f26430] text-white border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                    <Globe size={10} /> Global
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-white text-[#2d2d34] border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                    <Shield size={10} className="text-[#f26430]" />
                    {chapterName || "Campus"}
                  </span>
                )}
                {lab.track && (
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#2d2d34] text-white border border-white/20">
                    {lab.track}
                  </span>
                )}
              </div>

              {/* View Full Poster button */}
              {posterSrc && (
                <button
                  type="button"
                  onClick={() => setShowPosterModal(true)}
                  className="h-6.5 px-2.5 rounded-[5px] bg-[#2d2d34]/90 hover:bg-[#2d2d34] text-white font-mono text-[10px] font-bold uppercase tracking-wider border border-white/30 shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer flex items-center gap-1"
                  title="Click to view full uncropped poster"
                >
                  <Maximize2 size={11} />
                  <span>Poster</span>
                </button>
              )}
            </div>

            {/* Bottom info */}
            <div className="relative z-10 p-4 sm:p-5 pt-8">
              <span
                className={`inline-flex items-center font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] mb-2 border shadow-[1px_1px_0px_#2d2d34] ${
                  lab.status === "Active"
                    ? "bg-[#5f7560] text-white border-white/30"
                    : lab.status === "Completed"
                    ? "bg-zinc-800 text-zinc-300 border-zinc-600"
                    : lab.status === "Draft"
                    ? "bg-[#f59e0b] text-[#2d2d34] border-[#2d2d34]"
                    : "bg-[#414066] text-white border-white/30"
                }`}
              >
                {lab.status}
              </span>
              <h2 className="text-lg sm:text-xl font-black font-[family-name:var(--font-display)] text-white leading-snug drop-shadow-sm">
                {lab.title}
              </h2>
              {lab.subtitle && (
                <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                  {lab.subtitle}
                </p>
              )}

              {/* Quick stat chips */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-white/15 font-mono text-[10px] text-zinc-300">
                {sessionCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers size={11} className="text-[#f26430]" /> {sessionCount} {sessionCount !== 1 ? "SESSIONS" : "SESSION"}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} /> {lab.joinedCount} ENROLLED
                </span>
                {lab.maxParticipants && (
                  <span className="flex items-center gap-1">
                    <Lock size={11} /> {lab.maxParticipants} SEATS MAX
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Details Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#faf9f6]/50">

            {/* Sticky header bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#faf9f6] border-b border-[#2d2d34]/15 shrink-0">
              <p className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                01 {"//"} SYLLABUS &amp; ADMISSIONS PASS
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-7 w-7 rounded-[6px] bg-white hover:bg-zinc-100 border border-[#2d2d34]/20 flex items-center justify-center transition-colors text-[#52525b] hover:text-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] cursor-pointer"
                  title="Share"
                >
                  <Share2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-7 w-7 rounded-[6px] bg-white hover:bg-zinc-100 border border-[#2d2d34]/20 flex items-center justify-center transition-colors text-[#52525b] hover:text-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] cursor-pointer"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

              {/* Lead Controls */}
              {canManage && (
                <div className="rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/20 p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-[6px] bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center shrink-0 mt-0.5 text-[#2d2d34]">
                      <Settings2 size={14} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">Lead Controls</p>
                      <p className="font-mono text-[11px] text-[#71717a] mt-0.5 leading-snug">
                        {lab.status === "Draft"
                          ? "Draft stage · Unpublished to campus students."
                          : lab.applicationsOpen !== false
                            ? "Published · Accepting active campus registrations."
                            : "Published · Registrations paused."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lab.status === "Draft" && onPublish && (
                      <button
                        type="button"
                        onClick={() => onPublish(lab)}
                        className="h-7.5 px-3 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Send size={11} /> Publish
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onEdit(lab); }}
                        className="h-7.5 px-3 rounded-[6px] bg-white hover:bg-zinc-100 text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34]/30 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Enrollment Section: Official Access Pass or Registration CTA */}
              {isEnrolled ? (
                <div className="rounded-[12px] border-2 border-[#2d2d34] bg-white p-4 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg relative overflow-hidden">
                  {/* Pass Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#2d2d34]/20 pb-2.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5f7560] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5f7560]" />
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-[#2d2d34] tracking-wider uppercase flex items-center gap-1.5">
                        <Ticket size={12} className="text-[#f26430]" />
                        OFFICIAL COHORT ADMISSIONS PASS
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-[#5f7560] border border-emerald-200">
                      <CheckCircle2 size={10} />
                      PASS CONFERRED
                    </span>
                  </div>

                  {/* Pass Ticket Body: QR Code + Attendee Identity */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                    {/* Left QR Plate */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-[8px] bg-white border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] shrink-0 w-full sm:w-auto">
                      <div className="p-1 bg-white">
                        <QRCode
                          value={qrValue}
                          size={92}
                          level="M"
                          style={{ height: 92, width: 92 }}
                        />
                      </div>
                      <span className="mt-1.5 font-mono text-[10px] font-bold text-[#2d2d34] tracking-tight">
                        {passSerial}
                      </span>
                      <span className="font-mono text-[8.5px] text-[#71717a] uppercase">SCAN FOR LAB CHECK-IN</span>
                    </div>

                    {/* Right Attendee & Program Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2 text-center sm:text-left w-full">
                      <div>
                        <span className="inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-[#f26430] bg-[#f26430]/10 border border-[#f26430]/20 px-2 py-0.5 rounded mb-1">
                          {lab.track || "Learning Track"} · ATTENDEE PASS
                        </span>
                        <h3 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-black text-[#2d2d34] leading-snug truncate">
                          {profile?.fullName || "Student Member"}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-[#52525b]">
                          {elevatesId && (
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#2d2d34] text-white">
                              {elevatesId}
                            </span>
                          )}
                          <span>{chapterName || (lab.chapterId ? "Campus Chapter" : "Elevates Global")}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#2d2d34]/10 flex flex-wrap items-center justify-center sm:justify-start gap-3 font-mono text-[10.5px] text-[#52525b]">
                        <span className="inline-flex items-center gap-1 font-bold text-[#5f7560]">
                          <Layers size={11} className="text-[#5f7560]" />
                          {sessionCount} Session{sessionCount === 1 ? "" : "s"} All-Access
                        </span>
                        <span className="text-[#2d2d34]/20">·</span>
                        <span className="text-[#71717a] truncate max-w-[200px]">
                          {lab.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pass Quick Action Buttons */}
                  <div className="mt-3.5 pt-2.5 border-t border-dashed border-[#2d2d34]/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFullscreenPass(true)}
                        className="h-7.5 px-3 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Maximize2 size={11} />
                        <span>Fullscreen Pass</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(qrValue);
                            setCopiedPass(true);
                            setTimeout(() => setCopiedPass(false), 2000);
                            showToast("Pass code copied to clipboard!", "success");
                          }
                        }}
                        className="h-7.5 px-2.5 rounded-[6px] bg-white hover:bg-zinc-100 text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/30 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] transition-all cursor-pointer flex items-center gap-1"
                        title="Copy Pass Code"
                      >
                        {copiedPass ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedPass ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={enrolling}
                      className="font-mono text-[10px] text-[#71717a] hover:text-red-600 transition cursor-pointer p-1 uppercase"
                    >
                      Withdraw Registration
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-[12px] border p-4 shadow-[1.5px_1.5px_0px_#2d2d34] transition-colors ${
                    isClosed
                      ? "bg-zinc-50 border-[#2d2d34]/20"
                      : "bg-white border-[#2d2d34]/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 border border-[#2d2d34]/20 ${
                          isClosed ? "bg-zinc-100 text-zinc-400" : "bg-[#f26430]/10 text-[#f26430]"
                        }`}
                      >
                        {isClosed ? (
                          <Lock size={16} />
                        ) : (
                          <Sparkles size={16} />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                          {isClosed ? "Admissions Closed" : "Reserve Cohort Seat &amp; Get Pass"}
                        </p>
                        <p className="font-mono text-[11px] text-[#71717a] mt-0.5 leading-snug">
                          {isClosed
                            ? "Not accepting new cohort members at this time."
                            : "Enroll to receive your verifiable QR admission pass instantly."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={!isClosed ? handleEnroll : undefined}
                        disabled={enrolling || isClosed}
                        className={`h-8 px-4 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5 ${
                          isClosed
                            ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                            : "bg-[#f26430] hover:bg-[#e05320] text-white hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5"
                        }`}
                      >
                        {enrolling ? "Enrolling…" : isClosed ? "Closed" : (
                          <><span>Enroll Now</span><ChevronRight size={12} /></>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Seat progress bar */}
                  {lab.maxParticipants && (
                    <div className="mt-3 pt-3 border-t border-[#2d2d34]/10">
                      <div className="flex items-center justify-between font-mono text-[10px] text-[#71717a] mb-1">
                        <span>{lab.joinedCount} ENROLLED</span>
                        <span>{lab.maxParticipants} SEATS TOTAL</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 border border-[#2d2d34]/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#f26430] transition-all duration-500"
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
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">
                    {"//"} ABOUT THIS PEER LAB
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#2d2d34] leading-relaxed whitespace-pre-line bg-white border border-[#2d2d34]/15 rounded-[8px] p-3 shadow-[1px_1px_0px_rgba(45,45,52,0.06)]">
                    {lab.description}
                  </p>
                </section>
              )}

              {/* Facilitators */}
              {lab.facilitators?.length > 0 && (
                <section>
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-2">
                    {"//"} INSTRUCTORS &amp; MENTORS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {lab.facilitators.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.1)] text-xs"
                      >
                        <div className="h-7 w-7 rounded-[4px] bg-[#f26430]/15 text-[#f26430] border border-[#f26430]/30 font-mono font-bold flex items-center justify-center text-[11px] uppercase">
                          {f.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-[#2d2d34] leading-tight">{f.name}</p>
                          <p className="font-mono text-[9.5px] text-[#71717a]">{f.role || "Mentor"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sessions */}
              {lab.lessons?.length > 0 && (
                <section className="pt-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-2">
                    {"//"} SESSIONS &amp; TIMELINE ({lab.lessons.length} {lab.lessons.length === 1 ? "PART" : "PARTS"})
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
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-2">
                    {"//"} CURRICULUM RESOURCES ({lab.resources.length})
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <span className="font-mono text-[10.5px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              OFFICIAL ENTRY PASS {"//"} ACTIVE
            </span>
            <button
              type="button"
              onClick={() => setShowFullscreenPass(false)}
              className="h-8 w-8 rounded-[6px] bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition text-white cursor-pointer"
              title="Close Fullscreen Pass"
            >
              <X size={16} />
            </button>
          </div>

          {/* Centered Pass Plate */}
          <div
            className="w-full max-w-sm flex flex-col items-center justify-center space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* White QR Plate */}
            <div className="p-5 rounded-[12px] bg-white border-2 border-[#2d2d34] shadow-[4px_4px_0px_#f26430] flex flex-col items-center select-all">
              <QRCode
                value={qrValue}
                size={220}
                level="H"
                style={{ height: 220, width: 220 }}
              />
              <p className="mt-3 font-mono text-xs font-bold text-[#2d2d34] tracking-wider">
                {passSerial}
              </p>
            </div>

            {/* Attendee Info */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black font-[family-name:var(--font-display)] text-white">
                {profile?.fullName || "Student Member"}
              </h3>
              <p className="text-xs text-zinc-300 font-medium">
                {lab.title}
              </p>
              <p className="font-mono text-[10.5px] text-zinc-400">
                {chapterName || (lab.chapterId ? "Campus Chapter" : "Elevates Global")} · {lab.track || "Cohort Track"}
              </p>
              {elevatesId && (
                <p className="mt-1 font-mono text-xs text-emerald-400 font-bold">
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

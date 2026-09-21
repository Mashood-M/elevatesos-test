"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast, useCurrentUser } from "@/context/store-context";
import { EventLessonsCard } from "@/components/domain/event-lessons-card";
import { EventGatedResources } from "@/components/domain/event-gated-resources";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Globe,
  Layers,
  Lock,
  Send,
  Settings2,
  Share2,
  Shield,
  Sparkles,
  Users,
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

  if (!lab) return null;

  const isEnrolled = Boolean(lab.enrolled);
  const isOpenToAll = !lab.chapterId;
  const isClosed = lab.applicationsOpen === false;
  const sessionCount = lab.lessons?.length ?? 0;

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
      showToast("Successfully enrolled! Resources unlocked.", "success");
      onEnrollmentChange?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to enroll", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("Withdraw from this Peer Lab?")) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "enroll_peer_lab", data: { labId: lab.id, action: "withdraw" } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to withdraw");
      showToast("Withdrawn from Peer Lab", "info");
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
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-4xl w-full p-0 border-0 rounded-[28px] overflow-hidden bg-white shadow-2xl"
    >
      <div className="flex flex-col md:flex-row min-h-0 max-h-[92vh]">

        {/* LEFT: Poster Panel */}
        <div className="relative md:w-[42%] md:flex-shrink-0 h-56 md:h-auto bg-gradient-to-br from-[#1a1a22] via-[#2d2d34] to-[#111117]">
          {lab.posterUrl ? (
            <img
              src={lab.posterUrl}
              alt={lab.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
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
            </div>
          )}

          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
            {isOpenToAll ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white shadow">
                <Globe size={10} /> Global
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-zinc-900 shadow">
                <Shield size={10} className="text-[var(--accent)]" />
                {chapterName || "Campus"}
              </span>
            )}
            {lab.track && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-md">
                {lab.track}
              </span>
            )}
          </div>


          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2 ${
                STATUS_STYLES[lab.status] ?? "bg-white/20 text-white"
              }`}
            >
              {lab.status}
            </span>
            <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-white leading-snug">
              {lab.title}
            </h2>
            {lab.subtitle && (
              <p className="text-[13px] text-zinc-300 mt-0.5 line-clamp-2">{lab.subtitle}</p>
            )}

            {/* Quick stat chips */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              {sessionCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                  <Layers size={11} /> {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                <Users size={11} /> {lab.joinedCount} enrolled
              </span>
              {lab.maxParticipants && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-300">
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

            {/* Enrollment CTA */}
            <div
              className={`rounded-2xl border p-4 transition-colors ${
                isEnrolled
                  ? "bg-emerald-50 border-emerald-200"
                  : isClosed
                    ? "bg-zinc-50 border-zinc-200"
                    : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEnrolled ? "bg-emerald-100" : isClosed ? "bg-zinc-100" : "bg-[var(--accent)]/10"
                    }`}
                  >
                    {isEnrolled ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : isClosed ? (
                      <Lock size={18} className="text-zinc-400" />
                    ) : (
                      <Sparkles size={18} className="text-[var(--accent)]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {isEnrolled ? "You're enrolled!" : isClosed ? "Registrations closed" : "Reserve your seat"}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-0.5 leading-snug">
                      {isEnrolled
                        ? `${profile?.fullName || "Student"} · ${profile?.elevatesId || ""}`
                        : isClosed
                          ? "Not accepting new registrations right now."
                          : "Enroll to unlock curriculum files instantly."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEnrolled ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Enrolled
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleWithdraw}
                        disabled={enrolling}
                        className="text-xs rounded-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Withdraw
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant={isClosed ? "secondary" : "orange"}
                      size="sm"
                      onClick={!isClosed ? handleEnroll : undefined}
                      disabled={enrolling || isClosed}
                      className="rounded-full px-5 text-xs font-bold gap-1"
                    >
                      {enrolling ? "Enrolling…" : isClosed ? "Closed" : (
                        <><span>Enroll Now</span><ChevronRight size={13} /></>
                      )}
                    </Button>
                  )}
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
  );
}

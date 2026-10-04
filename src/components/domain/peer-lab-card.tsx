"use client";

import {
  CheckCircle2,
  Edit2,
  Globe,
  Layers,
  Lock,
  LockOpen,
  Send,
  Shield,
  Ticket,
  Trash2,
  Users,
  ArrowUpRight,
} from "lucide-react";
import type { PeerLabSeriesItem } from "@/components/domain/peer-lab-manager-dialog";

interface PeerLabCardProps {
  lab: PeerLabSeriesItem;
  chapterName?: string;
  onSelect: (lab: PeerLabSeriesItem) => void;
  onEdit?: (lab: PeerLabSeriesItem) => void;
  onDelete?: (lab: PeerLabSeriesItem) => void;
  onPublish?: (lab: PeerLabSeriesItem) => void;
  canManage?: boolean;
}

export function PeerLabCard({
  lab,
  chapterName,
  onSelect,
  onEdit,
  onDelete,
  onPublish,
  canManage = false,
}: PeerLabCardProps) {
  const isOpenToAll = !lab.chapterId;
  const isEnrolled = Boolean(lab.enrolled);
  const imageSrc = lab.thumbnailUrl || lab.posterUrl;
  const lessonCount = lab.lessons?.length || 0;
  const resourceCount = lab.resources?.length || 0;

  // Determine theme color accent
  const trackLower = (lab.track || "").toLowerCase();
  let themeColor: "flame" | "slate" | "amber" | "emerald" = "flame";
  if (lab.status === "Active") {
    themeColor = "emerald";
  } else if (trackLower.includes("ai") || trackLower.includes("code") || trackLower.includes("dev")) {
    themeColor = "slate";
  } else if (trackLower.includes("design") || trackLower.includes("product")) {
    themeColor = "amber";
  }

  return (
    <article
      onClick={() => onSelect(lab)}
      className="group relative flex flex-col sm:flex-row bg-white border border-[#2d2d34]/20 rounded-[12px] overflow-hidden shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* ─── LEFT: MEDIA / POSTER PILLAR ─────────────────────────────── */}
      <div className="relative w-full sm:w-[135px] md:w-[150px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#2d2d34]/20 bg-zinc-900 overflow-hidden min-h-[115px] sm:min-h-0 select-none">
        {imageSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={lab.title}
            className="w-full h-32 sm:h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-32 sm:h-full bg-[#faf9f6] flex flex-col items-center justify-center p-3 text-center select-none relative bauhaus-grid-bg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-4.5 w-4.5 rounded-full bg-[#f26430] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[8px] font-black">
                P
              </span>
              <span className="h-4.5 w-4.5 rounded-[2px] bg-[#414066] border border-[#2d2d34] flex items-center justify-center text-white font-mono text-[8px] font-black">
                L
              </span>
              <span className="h-4.5 w-4.5 bg-[#f59e0b] border border-[#2d2d34] rotate-45 flex items-center justify-center text-[#2d2d34] font-mono text-[8px] font-black">
                B
              </span>
            </div>
            <span className="font-mono text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
              {isOpenToAll ? "GLOBAL LAB" : chapterName || "CAMPUS"}
            </span>
          </div>
        )}

        {/* Overlaid Sessions Stamp on Top-Left */}
        <div className="absolute top-2 left-2 z-20 flex flex-col items-center justify-center bg-[#2d2d34] text-white border border-[#2d2d34] px-1.5 py-0.5 rounded-[5px] shadow-[1px_1px_0px_#f26430] font-mono pointer-events-none">
          <span className="text-[12px] font-black leading-none">{lessonCount > 0 ? String(lessonCount).padStart(2, "0") : "01"}</span>
          <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mt-0.5 text-zinc-300">
            {lessonCount === 1 ? "PART" : "PARTS"}
          </span>
        </div>

        {/* Status Pill on Top-Right */}
        <div className="absolute top-2 right-2 z-20">
          <span
            className={`inline-flex items-center font-mono text-[8px] font-black px-1.5 py-0.5 rounded border shadow-[1px_1px_0px_#2d2d34] uppercase tracking-wider pointer-events-none ${
              lab.status === "Active"
                ? "bg-[#5f7560] text-white border-white/40 animate-pulse"
                : lab.status === "Completed"
                ? "bg-zinc-800 text-zinc-300 border-zinc-600"
                : lab.status === "Draft"
                ? "bg-[#f59e0b] text-[#2d2d34] border-[#2d2d34]"
                : "bg-[#414066] text-white border-white/30"
            }`}
          >
            {lab.status}
          </span>
        </div>
      </div>

      {/* ─── RIGHT: COMPACT CONTENT & METRICS ───────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-3.5 min-w-0 bg-[#faf9f6]/30">
        <div className="min-w-0">
          {/* Top Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {/* Track Badge with geometric dot */}
              <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#2d2d34] border border-[#2d2d34]/20 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    themeColor === "flame"
                      ? "bg-[#f26430]"
                      : themeColor === "amber"
                      ? "bg-[#f59e0b]"
                      : themeColor === "emerald"
                      ? "bg-[#5f7560]"
                      : "bg-[#414066]"
                  }`}
                />
                {lab.track || "TRACK"}
              </span>

              {/* Campus Scope Tag */}
              <span className="inline-flex items-center font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                {isOpenToAll ? (
                  <span className="inline-flex items-center gap-1">
                    <Globe size={9} /> ALL CAMPUSES
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Shield size={9} className="text-[#f26430]" /> {chapterName || "CAMPUS"}
                  </span>
                )}
              </span>

              {/* Pass Ready tag if enrolled */}
              {isEnrolled && (
                <span className="inline-flex items-center gap-1 font-mono text-[8.5px] font-bold text-[#5f7560] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                  <CheckCircle2 size={10} /> PASS ACTIVE
                </span>
              )}
            </div>

            {/* Enrolled Count Chip */}
            <div className="shrink-0 font-mono text-[9.5px] font-bold text-[#52525b]">
              <span className="inline-flex items-center gap-1">
                <Users size={11} className="text-[#414066]" />
                {lab.joinedCount} ENROLLED
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-[family-name:var(--font-display)] text-[14.5px] sm:text-[15.5px] font-black text-[#2d2d34] tracking-tight leading-snug line-clamp-1 group-hover:text-[#f26430] transition-colors">
            {lab.title}
          </h3>

          {/* Subtitle / Description */}
          {lab.subtitle ? (
            <p className="mt-0.5 text-[11px] text-[#52525b] line-clamp-1 leading-relaxed">
              {lab.subtitle}
            </p>
          ) : lab.description ? (
            <p className="mt-0.5 text-[11px] text-[#52525b] line-clamp-1 leading-relaxed">
              {lab.description}
            </p>
          ) : null}

          {/* Facilitators row */}
          {lab.facilitators && lab.facilitators.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-[#71717a] truncate">
              <span className="font-bold text-[#2d2d34]">MENTORS //</span>
              <span className="truncate">{lab.facilitators.map((f) => f.name).join(", ")}</span>
            </div>
          )}

          {/* Highlights Row: Sessions, Seats, Materials */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-[#52525b]">
            {lessonCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Layers size={11} className="text-[#f26430]" />
                {lessonCount} {lessonCount === 1 ? "SESSION" : "SESSIONS"}
              </span>
            )}
            {resourceCount > 0 && (
              <span className="inline-flex items-center gap-1">
                {isEnrolled ? (
                  <LockOpen size={11} className="text-[#5f7560]" />
                ) : (
                  <Lock size={11} className="text-[#f59e0b]" />
                )}
                {resourceCount} {resourceCount === 1 ? "RESOURCE" : "RESOURCES"}
              </span>
            )}
            <span className="text-[#71717a]">
              {lab.applicationsOpen ? "OPEN ADMISSIONS" : "SEATS CLOSED"}
            </span>
          </div>
        </div>

        {/* ─── ACTION FOOTER ───────────────────────────────────────────── */}
        <div className="mt-2.5 pt-2 border-t border-[#2d2d34]/10 flex flex-wrap items-center justify-between gap-1.5">
          {canManage ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-1">
                {onPublish && lab.status === "Draft" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish(lab);
                    }}
                    className="h-7 px-2 rounded-[6px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
                    title="Publish peer lab"
                  >
                    <Send size={10} /> Publish
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(lab);
                    }}
                    className="h-7 px-2 rounded-[6px] bg-white hover:bg-zinc-100 text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34]/30 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 size={10} /> Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(lab);
                    }}
                    className="h-7 px-2 rounded-[6px] bg-white hover:bg-red-50 text-red-600 font-mono text-[10.5px] font-bold uppercase tracking-wider border border-red-300 shadow-[1px_1px_0px_rgba(45,45,52,0.15)] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(lab);
                }}
                className="h-7 px-3 rounded-[6px] bg-[#2d2d34] hover:bg-[#1a1a1e] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1"
              >
                Syllabus <ArrowUpRight size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[10px] text-[#71717a]">
                {isEnrolled ? (
                  <span className="font-bold text-[#5f7560] flex items-center gap-1">
                    <CheckCircle2 size={11} /> PASS CONFERRED
                  </span>
                ) : lab.applicationsOpen ? (
                  "FREE ADMISSION"
                ) : (
                  "REGISTRATION CLOSED"
                )}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(lab);
                }}
                className={`h-7 px-3 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isEnrolled
                    ? "bg-[#5f7560] hover:bg-[#4d614e] text-white"
                    : "bg-[#f26430] hover:bg-[#e05320] text-white"
                }`}
              >
                {isEnrolled ? (
                  <>
                    <Ticket size={11} />
                    <span>View Pass</span>
                  </>
                ) : (
                  <>
                    <span>Syllabus &amp; Enroll</span>
                    <ArrowUpRight size={11} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

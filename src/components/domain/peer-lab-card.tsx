"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Edit2,
  Globe,
  Layers,
  Lock,
  LockOpen,
  Send,
  Shield,
  Trash2,
  Users,
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

  return (
    <div className="group relative flex flex-col rounded-[22px] bg-surface border border-border/70 shadow-[var(--shadow)] overflow-hidden transition-all duration-200 hover:border-border hover:shadow-md">
      {/* Top Banner / Image Area */}
      <div
        className="relative h-44 w-full bg-gradient-to-br from-[#1e1e24] via-[#2d2d34] to-[#141416] overflow-hidden cursor-pointer"
        onClick={() => onSelect(lab)}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={lab.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-80"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-black/10">
            <BookOpen size={40} className="text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex flex-wrap gap-1.5">
            {isOpenToAll ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white shadow-sm">
                <Globe size={11} /> Open to All
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-zinc-900 shadow-sm">
                <Shield size={11} className="text-[var(--accent)]" /> {chapterName || "Campus Lab"}
              </span>
            )}
            {lab.track && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-black/40 text-white backdrop-blur-md">
                {lab.track}
              </span>
            )}
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm ${
              lab.status === "Active"
                ? "bg-emerald-500 text-white"
                : lab.status === "Completed"
                  ? "bg-zinc-600 text-white"
                  : lab.status === "Draft"
                    ? "bg-amber-500 text-white"
                    : "bg-blue-500 text-white"
            }`}
          >
            {lab.status}
          </span>
        </div>

        {/* Bottom Title on Image */}
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
          <h3 className="font-[family-name:var(--font-display)] italic font-bold text-white text-lg leading-snug line-clamp-1">
            {lab.title}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {lab.subtitle && (
            <p className="text-xs text-text-mute font-medium line-clamp-2">
              {lab.subtitle}
            </p>
          )}

          {/* Facilitator info */}
          {lab.facilitators?.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-text-mute">
              <span className="font-semibold text-text">Mentors:</span>
              <span className="truncate">
                {lab.facilitators.map((f) => f.name).join(", ")}
              </span>
            </div>
          )}

          {/* Highlights Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-text-mute border-t border-border/40">
            {lessonCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Layers size={12} className="text-[var(--accent)]" />
                {lessonCount} session{lessonCount === 1 ? "" : "s"}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {lab.joinedCount} enrolled
            </span>
            {resourceCount > 0 && (
              <span className="inline-flex items-center gap-1">
                {isEnrolled ? (
                  <LockOpen size={12} className="text-emerald-600" />
                ) : (
                  <Lock size={12} className="text-amber-500" />
                )}
                {resourceCount} material{resourceCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
          {canManage ? (
            <div className="flex items-center gap-1 w-full justify-between">
              <div className="flex items-center gap-1">
                {onPublish && lab.status === "Draft" && (
                  <Button
                    size="sm"
                    variant="orange"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish(lab);
                    }}
                    className="h-8 px-2.5 text-xs gap-1 shadow-xs"
                    title="Publish this Peer Lab so students can register"
                  >
                    <Send size={12} /> Publish
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(lab)}
                    className="h-8 px-2.5 text-xs gap-1"
                  >
                    <Edit2 size={12} /> Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDelete(lab)}
                    className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="orange"
                onClick={() => onSelect(lab)}
                className="h-8 px-3 text-xs font-semibold rounded-full"
              >
                View
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {isEnrolled ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> Enrolled
                </span>
              ) : (
                <span className="text-[11px] text-text-mute">
                  {lab.applicationsOpen ? "Free enrollment" : "Registrations closed"}
                </span>
              )}
              <Button
                size="sm"
                variant={isEnrolled ? "secondary" : "orange"}
                onClick={() => onSelect(lab)}
                className="h-8 px-3.5 text-xs font-bold rounded-full"
              >
                {isEnrolled ? "View Pass" : "View & Enroll"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

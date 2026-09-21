"use client";

import {
  FileText,
  Lock,
  Unlock,
  ExternalLink,
  Code,
  Presentation,
  Video,
  FileCheck,
  FolderArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventResource } from "@/types";

export function getResourceIcon(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("slide") || t.includes("presentation") || t.includes("deck")) {
    return <Presentation size={15} className="text-purple-500" />;
  }
  if (t.includes("code") || t.includes("git") || t.includes("repo") || t.includes("script")) {
    return <Code size={15} className="text-emerald-500" />;
  }
  if (t.includes("video") || t.includes("recording") || t.includes("stream")) {
    return <Video size={15} className="text-rose-500" />;
  }
  if (t.includes("cheatsheet") || t.includes("template")) {
    return <FileCheck size={15} className="text-amber-500" />;
  }
  if (t.includes("zip") || t.includes("asset") || t.includes("pack")) {
    return <FolderArchive size={15} className="text-cyan" />;
  }
  return <FileText size={15} className="text-[var(--accent)]" />;
}

export function EventGatedResources({
  resources = [],
  isRegistered = false,
  onRegisterClick,
  className = "",
}: {
  resources?: EventResource[];
  isRegistered?: boolean;
  onRegisterClick?: () => void;
  className?: string;
}) {
  if (!resources || resources.length === 0) return null;

  const visibleCount = resources.length;

  return (
    <div
      className={`rounded-[18px] border border-border/80 bg-bg-panel shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-bg-panel">
        <div className="flex items-center gap-2">
          {isRegistered ? (
            <Unlock size={16} className="text-emerald-500" />
          ) : (
            <Lock size={16} className="text-amber-500" />
          )}
          <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-text">
            Event Resources
          </h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isRegistered
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {isRegistered ? "Unlocked for Attendees" : "Members Only"}
        </span>
      </div>

      {isRegistered ? (
        /* UNLOCKED VIEW: Full Access */
        <div className="divide-y divide-border/60">
          {resources.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-bg-page/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg shrink-0">
                  {getResourceIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-text truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-text-dim">
                    {item.type || "Document"}
                  </p>
                </div>
              </div>

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors shrink-0"
                >
                  <span>Open</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-xs text-text-dim">Shared during session</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* GATED VIEW: Locked Teaser */
        <div className="p-5 text-center space-y-3.5">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <Lock size={20} />
          </div>

          <div className="max-w-sm mx-auto space-y-1">
            <h4 className="text-sm font-bold text-text">
              Exclusive Materials for Registered Attendees
            </h4>
            <p className="text-xs text-text-dim leading-relaxed">
              This event includes {visibleCount} exclusive{" "}
              {visibleCount === 1 ? "resource" : "resources"} (slides, starter code, and session guides). Register to get instant access.
            </p>
          </div>

          {onRegisterClick && (
            <Button
              variant="orange"
              size="sm"
              onClick={onRegisterClick}
              className="font-semibold shadow-sm"
            >
              Register to Unlock
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

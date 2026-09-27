"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface EntryLoadingScreenProps {
  /** Optional custom title text (default: "Elevates") */
  title?: string;
  /** Optional custom subtitle / message */
  message?: string;
  /** Optional container className */
  className?: string;
  /** If true, fills the entire viewport. Defaults to true. */
  fullScreen?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NATURAL ENTRY SCREEN (Elevates OS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Warm, authentic, human entry screen shown when a fresh visitor first visits.
 * Designed with zero AI-slop — no fake terminals, no pulsing radar chips,
 * and no synthetic progress metrics. Just clean brand identity and calm motion.
 *
 * HOW TO REDESIGN IN THE FUTURE:
 * - BLOCK 1: BRAND EMBLEM (Change logo size, icon, or squircle styling)
 * - BLOCK 2: WORDMARK & TAGLINE (Change title or student community motto)
 * - BLOCK 3: GENTLE MOTION INDICATOR (Adjust dots or replace with simple loader)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EntryLoadingScreen({
  title = "Elevates",
  message = "Learn · Build · Grow",
  className,
  fullScreen = true,
}: EntryLoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-[#f8fafc] text-[#2d2d34] select-none p-6",
        fullScreen ? "fixed inset-0 z-50 min-h-dvh w-full" : "w-full min-h-[400px]",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center max-w-xs w-full animate-in fade-in duration-300">
        {/* ─── BLOCK 1: BRAND EMBLEM ───────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20 p-3 transition-transform duration-200">
            <Image
              src="/elevates-symbol-white.png"
              alt="Elevates Logo"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* ─── BLOCK 2: WORDMARK & TAGLINE ─────────────────────────────────── */}
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-tight text-[#2d2d34]">
          {title}
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">
          {message}
        </p>

        {/* ─── BLOCK 3: GENTLE MOTION INDICATOR ────────────────────────────── */}
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}

export default EntryLoadingScreen;

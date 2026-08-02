"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveState } from "./types";

export function StatusBar({
  words,
  zoom,
  onZoomChange,
  focusMode,
  onToggleFocus,
  page,
  pageCount,
}: {
  words: number;
  characters?: number;
  saveState?: SaveState;
  zoom: number;
  onZoomChange: (z: number) => void;
  focusMode?: boolean;
  onToggleFocus?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  page?: number;
  pageCount?: number;
}) {
  const clamped = Math.min(200, Math.max(50, zoom));
  const current = page ?? 1;
  const total = pageCount ?? 1;

  return (
    <footer className="flex h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-[#f7f5f1] px-3 text-[11px] text-text-mute">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Page {current} of {total}
        </span>
        <span>{words} words</span>
        <span>English (US)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "rounded px-1.5 py-0.5 hover:bg-white hover:text-text",
            focusMode && "bg-[var(--secondary-soft)] text-[var(--secondary)]",
          )}
          onClick={onToggleFocus}
          title="Focus mode"
        >
          Focus
        </button>
        <button
          type="button"
          className="rounded p-0.5 hover:bg-white"
          onClick={() => onZoomChange(Math.max(50, clamped - 10))}
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          value={clamped}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer accent-[var(--accent)]"
          aria-label="Zoom"
        />
        <button
          type="button"
          className="rounded p-0.5 hover:bg-white"
          onClick={() => onZoomChange(Math.min(200, clamped + 10))}
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[2.5rem] text-center tabular-nums text-text-dim">
          {clamped}%
        </span>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-white hover:text-text"
          onClick={() => onZoomChange(100)}
          title="Fit / reset zoom"
        >
          Fit
        </button>
      </div>
    </footer>
  );
}

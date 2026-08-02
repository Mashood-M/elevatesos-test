"use client";

import { cn } from "@/lib/utils";

/** Word-like top + left rulers with margin markers (inches at 96dpi). */
export function PageRulers({
  marginPx,
  show,
  pageWidth = 816,
  pageHeight = 1056,
}: {
  marginPx: number;
  show: boolean;
  pageWidth?: number;
  pageHeight?: number;
}) {
  if (!show) return null;

  const inches = Math.ceil(pageWidth / 96);
  const ticks = Array.from({ length: inches * 4 + 1 }, (_, i) => i);

  return (
    <>
      <div
        className="pointer-events-none absolute left-6 top-0 z-10 h-6 overflow-hidden border-b border-[#cfc9be] bg-[#f3f0ea]"
        style={{ width: pageWidth, marginLeft: 24 }}
      >
        <div className="relative h-full" style={{ width: pageWidth }}>
          {ticks.map((t) => {
            const x = (t / 4) * 96;
            const major = t % 4 === 0;
            return (
              <span
                key={`tx-${t}`}
                className={cn(
                  "absolute bottom-0 w-px bg-[#9ca3af]",
                  major ? "h-3" : "h-1.5",
                )}
                style={{ left: x }}
              />
            );
          })}
          {Array.from({ length: inches + 1 }, (_, i) => (
            <span
              key={`tn-${i}`}
              className="absolute top-0 text-[9px] text-text-mute"
              style={{ left: i * 96 + 2 }}
            >
              {i}
            </span>
          ))}
          <span
            className="absolute bottom-0 top-0 border-l-2 border-[var(--accent)] opacity-70"
            style={{ left: marginPx }}
          />
          <span
            className="absolute bottom-0 top-0 border-r-2 border-[var(--accent)] opacity-70"
            style={{ left: pageWidth - marginPx }}
          />
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-0 top-6 z-10 w-6 overflow-hidden border-r border-[#cfc9be] bg-[#f3f0ea]"
        style={{ height: pageHeight }}
      >
        <div className="relative w-full" style={{ height: pageHeight }}>
          {Array.from({ length: Math.ceil(pageHeight / 24) + 1 }, (_, t) => {
            const y = t * 24;
            const major = t % 4 === 0;
            return (
              <span
                key={`ly-${t}`}
                className={cn(
                  "absolute right-0 h-px bg-[#9ca3af]",
                  major ? "w-3" : "w-1.5",
                )}
                style={{ top: y }}
              />
            );
          })}
          <span
            className="absolute left-0 right-0 border-t-2 border-[var(--accent)] opacity-70"
            style={{ top: marginPx }}
          />
          <span
            className="absolute left-0 right-0 border-b-2 border-[var(--accent)] opacity-70"
            style={{ top: pageHeight - marginPx }}
          />
        </div>
      </div>
    </>
  );
}

export const MARGIN_PRESETS = {
  narrow: 48,
  normal: 96,
  wide: 144,
} as const;

export type MarginPreset = keyof typeof MARGIN_PRESETS;

"use client";

import { useEffect, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TablePicker({
  onPick,
}: {
  onPick: (rows: number, cols: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ r: 3, c: 3 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex h-[52px] w-[56px] flex-col items-center justify-center gap-0.5 rounded-md text-text-dim hover:bg-bg-hover hover:text-text"
        onClick={() => setOpen((v) => !v)}
        title="Table"
      >
        <Table2 className="h-4 w-4" />
        <span className="text-[10px] font-medium">Table</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 rounded-[10px] border border-border bg-bg-panel p-2 shadow-[var(--shadow)]">
          <p className="mb-1.5 text-[10px] text-text-mute">
            {hover.r} × {hover.c} table
          </p>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(6, 16px)" }}
            onMouseLeave={() => setHover({ r: 3, c: 3 })}
          >
            {Array.from({ length: 36 }, (_, i) => {
              const r = Math.floor(i / 6) + 1;
              const c = (i % 6) + 1;
              const active = r <= hover.r && c <= hover.c;
              return (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "h-4 w-4 rounded-[2px] border border-border",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "bg-bg",
                  )}
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => {
                    onPick(r, c);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex gap-1">
            {[
              [2, 2],
              [3, 3],
              [4, 4],
            ].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                type="button"
                className="rounded px-1.5 py-0.5 text-[10px] text-text-dim hover:bg-bg-hover"
                onClick={() => {
                  onPick(r, c);
                  setOpen(false);
                }}
              >
                {r}×{c}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

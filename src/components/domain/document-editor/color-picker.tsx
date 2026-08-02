"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#1f1f1f" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#c24141" },
  { label: "Orange", value: "#f26430" },
  { label: "Green", value: "#5f7560" },
  { label: "Blue", value: "#414066" },
];

export const BG_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Gray", value: "#e5e7eb" },
];

export function ColorPickerButton({
  label,
  mode,
  onPick,
  icon: Icon,
  active,
  swatch,
}: {
  label: string;
  mode: "text" | "background";
  onPick: (value: string) => void;
  icon?: ComponentType<{ className?: string }>;
  active?: boolean;
  /** Underline / marker color on the icon button */
  swatch?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const colors = mode === "text" ? TEXT_COLORS : BG_COLORS;

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
        title={label}
        className={cn(
          Icon
            ? "flex h-8 w-8 flex-col items-center justify-center gap-0.5 rounded-md text-text-dim hover:bg-bg-hover hover:text-text"
            : "h-8 rounded-md px-2 text-[11px] font-medium text-text-dim hover:bg-bg-hover hover:text-text",
          (active || open) &&
            "bg-[var(--secondary-soft)] text-[var(--secondary)]",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {Icon ? (
          <>
            <Icon className="h-3.5 w-3.5" />
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{ background: swatch || (mode === "text" ? "#1f1f1f" : "#fef08a") }}
            />
          </>
        ) : (
          label
        )}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-[10px] border border-border bg-bg-panel p-1.5 shadow-[var(--shadow)]">
          {colors.map((c) => (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className={cn(
                "h-6 w-6 rounded-md border border-border",
                !c.value && "bg-bg text-[9px] text-text-mute",
              )}
              style={c.value ? { background: c.value } : undefined}
              onClick={() => {
                onPick(c.value);
                setOpen(false);
              }}
            >
              {!c.value ? "∅" : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

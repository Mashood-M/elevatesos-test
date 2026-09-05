"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  footer,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const hasCustomMaxW = className && /\bmax-w-/.test(className);
  const hasCustomMaxH = className && /\bmax-h-/.test(className);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--charcoal-900)_45%,transparent)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex flex-col w-full rounded-[var(--radius)] border border-border bg-bg-panel shadow-[var(--shadow)] outline-none overflow-hidden",
          !hasCustomMaxH && "max-h-[min(90dvh,820px)]",
          !hasCustomMaxW && "max-w-lg",
          className,
        )}
      >
        {/* Pinned Header */}
        {title || description ? (
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4 shrink-0 sm:px-6">
            <div className="min-w-0 flex-1">
              {title ? (
                <h2
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold tracking-[-0.03em] text-text"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descId} className="mt-0.5 text-[12px] text-text-mute">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-text-mute hover:bg-bg-hover hover:text-text transition shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-text-mute hover:bg-bg-hover hover:text-text transition"
          >
            <X size={18} />
          </button>
        )}

        {/* Scrollable Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>

        {/* Optional Pinned Footer */}
        {footer ? (
          <div className="border-t border-border/70 bg-bg-panel px-5 py-3.5 shrink-0 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

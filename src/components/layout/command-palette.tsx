"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useStore } from "@/context/store-context";
import {
  buildSearchIndex,
  CATEGORY_LABEL,
  searchIndex,
  type SearchResult,
} from "@/lib/search";
import { cn } from "@/lib/utils";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { store } = useStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const index = useMemo(
    () => buildSearchIndex(store, store.session.roleKey),
    [store],
  );
  const results = useMemo(() => searchIndex(index, query), [index, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  function go(item: SearchResult) {
    onOpenChange(false);
    router.push(item.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[var(--charcoal-900)]/45 px-4 pt-[14vh]">
      <button
        className="absolute inset-0"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-panel">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4 w-4 text-text-mute" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Search chapters, events, people…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-text-mute"
          />
          <kbd className="hidden rounded-[var(--radius-sm)] border border-border px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-text-mute sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-text-mute">
              No matches
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150",
                    i === active ? "bg-bg-hover" : "hover:bg-bg-hover/70",
                  )}
                >
                  <span className="w-[4.5rem] shrink-0 font-[family-name:var(--font-mono)] text-[11px] font-medium text-text-mute">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold tracking-[-0.01em]">
                      {item.title}
                    </span>
                    <span className="block truncate text-[12px] text-text-mute">
                      {item.subtitle}
                    </span>
                  </span>
                  {i === active ? (
                    <span className="shrink-0 text-[11px] text-[var(--accent)]">
                      ↵
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

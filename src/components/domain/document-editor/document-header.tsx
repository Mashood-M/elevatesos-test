"use client";

import Link from "next/link";
import { ArrowLeft, Cloud, CloudOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocumentMeta, SaveState } from "./types";

export function DocumentHeader({
  title,
  onTitleChange,
  meta,
  editable,
  libraryHref,
  libraryLabel = "Library",
  onExportDocx,
  exportLabel = "Export",
  onSave,
  onSubmit,
  showSubmit,
  saveState,
  toolQuery,
  onToolQueryChange,
  onOpenComments,
}: {
  title: string;
  onTitleChange?: (t: string) => void;
  meta: DocumentMeta;
  editable: boolean;
  libraryHref: string;
  libraryLabel?: string;
  onExportDocx?: () => void;
  exportLabel?: string;
  onSave?: () => void;
  onSubmit?: () => void;
  showSubmit?: boolean;
  saveState: SaveState;
  toolQuery: string;
  onToolQueryChange: (q: string) => void;
  onOpenComments?: () => void;
}) {
  const saved =
    saveState === "saved"
      ? "Saved"
      : saveState === "saving"
        ? "Saving…"
        : "Unsaved";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-bg-panel px-3">
      <Link
        href={libraryHref}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-dim hover:bg-bg-hover hover:text-text"
        title={`Back to ${libraryLabel}`}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent)] text-[12px] font-extrabold text-white">
        E
      </div>
      <div className="min-w-0 max-w-[240px]">
        <input
          value={title}
          disabled={!editable}
          onChange={(e) => onTitleChange?.(e.target.value)}
          className="w-full truncate bg-transparent text-[13px] font-semibold text-text outline-none disabled:opacity-70"
          placeholder="Document title"
        />
        <div className="flex items-center gap-1 text-[10px] text-text-mute">
          {saveState === "saved" ? (
            <Cloud className="h-3 w-3 text-green" />
          ) : (
            <CloudOff className="h-3 w-3 text-orange" />
          )}
          <span
            className={cn(
              saveState === "saved" && "text-green",
              saveState === "dirty" && "text-orange",
              saveState === "saving" && "text-[var(--accent)]",
            )}
          >
            {saved}
          </span>
          {meta.status ? <span>· {meta.status}</span> : null}
        </div>
      </div>

      <div className="mx-auto hidden min-w-0 max-w-md flex-1 md:block">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-mute" />
          <input
            value={toolQuery}
            onChange={(e) => onToolQueryChange(e.target.value)}
            placeholder="Search for tools, help, and more"
            className="h-8 w-full rounded-full border border-border bg-bg pl-8 pr-3 text-[12px] text-text outline-none placeholder:text-text-mute focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          className="h-8 text-[12px]"
          onClick={onOpenComments}
        >
          Comments
        </Button>
        <span className="hidden text-[11px] text-text-mute sm:inline">
          {editable ? "Editing" : "Viewing"}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-8 text-[12px]"
          disabled
          title="Demo stub"
        >
          Share
        </Button>
        {onExportDocx ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-[12px]"
            onClick={onExportDocx}
          >
            {exportLabel}
          </Button>
        ) : null}
        {editable && onSave ? (
          <Button
            type="button"
            variant="primary"
            className="h-8 text-[12px]"
            onClick={onSave}
          >
            Save
          </Button>
        ) : null}
        {showSubmit && onSubmit ? (
          <Button
            type="button"
            variant="orange"
            className="h-8 text-[12px]"
            onClick={onSubmit}
          >
            Submit
          </Button>
        ) : null}
      </div>
    </header>
  );
}

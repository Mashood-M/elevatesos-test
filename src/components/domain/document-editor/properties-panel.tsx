"use client";

import type { DocumentMeta } from "./types";

export function PropertiesPanel({
  meta,
  open,
  tab,
  onTabChange,
  children,
}: {
  meta: DocumentMeta;
  open: boolean;
  tab: "properties" | "comments" | "ai";
  onTabChange: (t: "properties" | "comments" | "ai") => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-l border-border bg-[#faf8f5] xl:flex">
      <div className="flex border-b border-border">
        {(
          [
            ["properties", "Props"],
            ["comments", "Notes"],
            ["ai", "AI"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`flex-1 px-2 py-2 text-[11px] font-semibold ${
              tab === key
                ? "border-b-2 border-[var(--accent)] text-text"
                : "text-text-mute hover:text-text"
            }`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {tab === "properties" ? (
          <dl className="space-y-3 text-[12px]">
            <Row label="Status" value={meta.status} />
            <Row label="Type" value={meta.type?.replaceAll("_", " ") ?? "—"} />
            <Row label="Chapter" value={meta.chapterName ?? "—"} />
            <Row label="Event" value={meta.eventTitle ?? "—"} />
            <Row label="Author" value={meta.authorName ?? "—"} />
            <Row label="Updated" value={meta.updatedAt ?? "—"} />
            <Row label="Source" value={meta.source ?? "manual"} />
          </dl>
        ) : (
          children
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-mute">
        {label}
      </dt>
      <dd className="mt-0.5 text-text">{value}</dd>
    </div>
  );
}

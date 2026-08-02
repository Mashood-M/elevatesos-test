"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { answerableQuestions } from "@/lib/forms/helpers";
import type { ElevatesStore, FormDefinition, FormQuestion } from "@/types";

function formatAnswer(
  v: unknown,
  question: FormQuestion | undefined,
  store: ElevatesStore,
): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (question?.type === "representative" && typeof v === "string") {
    return store.profiles.find((p) => p.id === v)?.fullName ?? v;
  }
  if (question?.type === "file_upload" && typeof v === "string") {
    try {
      const parsed = JSON.parse(v) as { name?: string };
      return parsed.name || v;
    } catch {
      return v;
    }
  }
  if (question?.type === "rating" && typeof v === "number") {
    const max = question.ratingMax ?? 5;
    return `${"★".repeat(v)}${"☆".repeat(Math.max(0, max - v))} (${v})`;
  }
  return String(v);
}

function FileAnswerLink({ value }: { value: string }) {
  try {
    const parsed = JSON.parse(value) as { name?: string; dataUrl?: string };
    if (parsed.dataUrl && parsed.name) {
      return (
        <a
          href={parsed.dataUrl}
          download={parsed.name}
          className="text-[var(--accent)] hover:underline"
        >
          {parsed.name}
        </a>
      );
    }
    if (parsed.name) return <>{parsed.name}</>;
  } catch {
    /* plain */
  }
  return <>{value}</>;
}

export function FormResponses({
  form,
  canManage,
}: {
  form: FormDefinition;
  canManage: boolean;
}) {
  const { store, deleteFormResponse } = useStore();
  const [index, setIndex] = useState(0);

  const cols = useMemo(() => answerableQuestions(form), [form]);
  const rows = useMemo(
    () => (store.formResponses ?? []).filter((r) => r.formId === form.id),
    [store.formResponses, form.id],
  );

  useEffect(() => {
    if (index >= rows.length) setIndex(Math.max(0, rows.length - 1));
  }, [rows.length, index]);

  function exportCsv() {
    const headers = ["Submitted", "Respondent", ...cols.map((c) => c.title)];
    const lines = [headers.join(",")];
    for (const row of rows) {
      const user = store.profiles.find((p) => p.id === row.userId);
      const cells = [
        row.submittedAt,
        user?.fullName ?? row.userId,
        ...cols.map((c) => {
          const raw = formatAnswer(row.answers[c.id], c, store);
          return `"${raw.replace(/"/g, '""')}"`;
        }),
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, "-").toLowerCase()}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!rows.length) {
    return (
      <TerminalPanel title="individual" meta="0 responses">
        <p className="py-6 text-center text-[14px] text-text-dim">
          No responses yet.
        </p>
      </TerminalPanel>
    );
  }

  const row = rows[index];
  const user = store.profiles.find((p) => p.id === row.userId);

  return (
    <div className="space-y-4">
      <TerminalPanel
        title="individual"
        meta={`${index + 1} of ${rows.length}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="rounded-full p-2 text-text-dim hover:bg-bg disabled:opacity-30"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={index >= rows.length - 1}
              onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))}
              className="rounded-full p-2 text-text-dim hover:bg-bg disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
            <Button variant="ghost" className="h-9" onClick={exportCsv}>
              Export CSV
            </Button>
            {canManage ? (
              <Button
                variant="danger"
                className="h-9"
                onClick={() => {
                  deleteFormResponse(row.id);
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="mb-4 border-b border-border/80 pb-4">
          <p className="font-semibold">{user?.fullName ?? row.userId}</p>
          <p className="mt-0.5 text-[12px] text-text-mute">
            {new Date(row.submittedAt).toLocaleString()}
          </p>
        </div>
        <dl className="divide-y divide-border/80">
          {cols.map((c) => (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-[12px] font-medium text-text-mute">
                {c.title}
              </dt>
              <dd className="mt-1 text-[14px] text-text">
                {c.type === "file_upload" &&
                typeof row.answers[c.id] === "string" &&
                row.answers[c.id] ? (
                  <FileAnswerLink value={String(row.answers[c.id])} />
                ) : (
                  formatAnswer(row.answers[c.id], c, store) || "—"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </TerminalPanel>
    </div>
  );
}

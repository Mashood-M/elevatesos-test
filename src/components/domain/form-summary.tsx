"use client";

import { useMemo } from "react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { answerableQuestions } from "@/lib/forms/helpers";
import type { FormDefinition, FormQuestion } from "@/types";

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-text-dim">{label}</span>
        <span className="font-semibold">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OptionSummary({
  question,
  answers,
}: {
  question: FormQuestion;
  answers: unknown[];
}) {
  const options = question.options ?? [];
  const counts = new Map<string, number>();
  for (const opt of options) counts.set(opt, 0);
  for (const a of answers) {
    if (Array.isArray(a)) {
      for (const item of a) {
        counts.set(String(item), (counts.get(String(item)) ?? 0) + 1);
      }
    } else if (a !== undefined && a !== null && a !== "") {
      counts.set(String(a), (counts.get(String(a)) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...counts.values());
  return (
    <div>
      {[...counts.entries()].map(([label, count]) => (
        <Bar key={label} label={label} count={count} max={max} />
      ))}
    </div>
  );
}

function ScaleSummary({
  question,
  answers,
}: {
  question: FormQuestion;
  answers: unknown[];
}) {
  const min = question.scaleMin ?? 1;
  const maxScale =
    question.type === "rating"
      ? (question.ratingMax ?? 5)
      : (question.scaleMax ?? 5);
  const nums = answers
    .map((a) => Number(a))
    .filter((n) => !Number.isNaN(n));
  const avg = nums.length
    ? nums.reduce((s, n) => s + n, 0) / nums.length
    : 0;
  const dist = new Map<number, number>();
  for (let i = min; i <= maxScale; i++) dist.set(i, 0);
  for (const n of nums) dist.set(n, (dist.get(n) ?? 0) + 1);
  const maxCount = Math.max(1, ...dist.values());

  return (
    <div>
      <p className="mb-3 text-sm">
        Average{" "}
        <span className="font-bold text-[var(--accent)]">{avg.toFixed(1)}</span>
        {" · "}
        {nums.length} response{nums.length === 1 ? "" : "s"}
      </p>
      {[...dist.entries()].map(([n, count]) => (
        <Bar key={n} label={String(n)} count={count} max={maxCount} />
      ))}
    </div>
  );
}

function TextSummary({ answers }: { answers: unknown[] }) {
  const latest = answers
    .map((a) => String(a ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!latest.length) {
    return <p className="text-[12px] text-text-dim">No text answers yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {latest.map((text, i) => (
        <li
          key={`${i}-${text.slice(0, 12)}`}
          className="border-l-2 border-[var(--accent)] pl-3 text-[13px] text-text-dim"
        >
          {text}
        </li>
      ))}
    </ul>
  );
}

export function FormSummary({ form }: { form: FormDefinition }) {
  const { store } = useStore();
  const responses = useMemo(
    () => (store.formResponses ?? []).filter((r) => r.formId === form.id),
    [store.formResponses, form.id],
  );
  const questions = useMemo(() => answerableQuestions(form), [form]);

  return (
    <div className="space-y-4">
      <TerminalPanel title="summary" meta={`${responses.length} responses`}>
        <p className="text-sm text-text-dim">
          Aggregate view by question — choice bars, scale averages, and recent
          text.
        </p>
      </TerminalPanel>

      {!responses.length ? (
        <p className="text-sm text-text-dim">No responses to summarize.</p>
      ) : (
        questions.map((q) => {
          const answers = responses.map((r) => r.answers[q.id]);
          return (
            <TerminalPanel key={q.id} title={q.title} meta={q.type}>
              {q.type === "multiple_choice" ||
              q.type === "dropdown" ||
              q.type === "checkboxes" ? (
                <OptionSummary question={q} answers={answers} />
              ) : q.type === "linear_scale" || q.type === "rating" ? (
                <ScaleSummary question={q} answers={answers} />
              ) : q.type === "short_text" || q.type === "paragraph" ? (
                <TextSummary answers={answers} />
              ) : (
                <TextSummary
                  answers={answers.map((a) =>
                    a === undefined || a === null ? "" : String(a),
                  )}
                />
              )}
            </TerminalPanel>
          );
        })
      )}
    </div>
  );
}

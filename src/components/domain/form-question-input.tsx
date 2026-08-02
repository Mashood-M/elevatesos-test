"use client";

import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import type { FormQuestion } from "@/types";
import { cn } from "@/lib/utils";

export type AnswerValue = string | string[] | number | boolean;

export function FormQuestionInput({
  question,
  value,
  onChange,
  disabled,
  representativeOptions,
}: {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  disabled?: boolean;
  /** Dynamic options for type === "representative" ({ id, label }) */
  representativeOptions?: { id: string; label: string }[];
}) {
  if (question.type === "section_header") {
    return (
      <div className="border-b border-border pb-2">
        <h3 className="font-display text-lg font-bold">{question.title}</h3>
        {question.description ? (
          <p className="mt-1 text-[13px] text-text-dim">{question.description}</p>
        ) : null}
      </div>
    );
  }

  const label = (
    <FieldLabel>
      {question.title}
      {question.required ? <span className="text-[var(--accent)]"> *</span> : null}
    </FieldLabel>
  );

  if (question.type === "paragraph") {
    return (
      <div>
        {label}
        {question.description ? (
          <p className="mb-1 text-[11px] text-text-dim">{question.description}</p>
        ) : null}
        <TextArea
          rows={3}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div>
        {label}
        <div className="mt-2 space-y-2">
          {(question.options ?? []).map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 text-sm text-text-dim"
            >
              <input
                type="radio"
                name={question.id}
                disabled={disabled}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-[var(--accent)]"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        {label}
        <div className="mt-2 space-y-2">
          {(question.options ?? []).map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 text-sm text-text-dim"
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={() => {
                    onChange(
                      checked
                        ? selected.filter((s) => s !== opt)
                        : [...selected, opt],
                    );
                  }}
                  className="accent-[var(--accent)]"
                />
                {opt}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "dropdown" || question.type === "representative") {
    const reps = representativeOptions ?? [];
    return (
      <div>
        {label}
        {question.description ? (
          <p className="mb-1 text-[11px] text-text-dim">{question.description}</p>
        ) : null}
        <Select
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {question.type === "representative"
              ? "Select your representative…"
              : "Select…"}
          </option>
          {question.type === "representative"
            ? reps.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            : (question.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
        </Select>
        {question.type === "representative" && !reps.length ? (
          <p className="mt-1 text-[11px] text-[var(--accent)]">
            No class representatives listed for this chapter yet.
          </p>
        ) : null}
      </div>
    );
  }

  if (question.type === "linear_scale") {
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 5;
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        {label}
        <div className="mt-2 flex flex-wrap items-end gap-3">
          {question.scaleMinLabel ? (
            <span className="pb-2 text-[11px] text-text-dim">
              {question.scaleMinLabel}
            </span>
          ) : null}
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border text-sm font-semibold transition",
                value === n
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-border text-text-dim hover:border-[var(--border-strong)]",
              )}
            >
              {n}
            </button>
          ))}
          {question.scaleMaxLabel ? (
            <span className="pb-2 text-[11px] text-text-dim">
              {question.scaleMaxLabel}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (question.type === "rating") {
    const max = question.ratingMax ?? 5;
    const current = typeof value === "number" ? value : 0;
    return (
      <div>
        {label}
        <div className="mt-2 flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cn(
                "text-2xl transition",
                n <= current ? "text-[var(--accent)]" : "text-border",
              )}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "date" || question.type === "time") {
    return (
      <div>
        {label}
        {question.description ? (
          <p className="mb-1 text-[11px] text-text-dim">{question.description}</p>
        ) : null}
        <Input
          type={question.type}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (question.type === "file_upload") {
    let fileLabel = "";
    if (typeof value === "string" && value) {
      try {
        const parsed = JSON.parse(value) as { name?: string };
        fileLabel = parsed.name || value;
      } catch {
        fileLabel = value;
      }
    }
    const maxMb = question.fileMaxMb ?? 2;
    return (
      <div>
        {label}
        {question.description ? (
          <p className="mb-1 text-[11px] text-text-dim">{question.description}</p>
        ) : null}
        <Input
          type="file"
          disabled={disabled}
          accept={question.fileAccept || undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) {
              onChange("");
              return;
            }
            if (file.size > maxMb * 1024 * 1024) {
              onChange("");
              e.target.value = "";
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              onChange(
                JSON.stringify({
                  name: file.name,
                  mime: file.type || "application/octet-stream",
                  size: file.size,
                  dataUrl: String(reader.result || ""),
                }),
              );
            };
            reader.readAsDataURL(file);
          }}
        />
        <p className="mt-1 text-[11px] text-text-mute">
          Max {maxMb} MB
          {question.fileAccept ? ` · ${question.fileAccept}` : ""}
        </p>
        {fileLabel ? (
          <p className="mt-1 text-[11px] text-text-dim">Selected: {fileLabel}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {label}
      {question.description ? (
        <p className="mb-1 text-[11px] text-text-dim">{question.description}</p>
      ) : null}
      <Input
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { getEventForm, questionToField } from "@/lib/forms/helpers";
import type { FormField, FormFieldType, FormPurpose } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const FIELD_TYPES: { type: FormFieldType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "tel", label: "Phone" },
  { type: "email", label: "Email" },
  { type: "number", label: "Number" },
  { type: "textarea", label: "Textarea" },
  { type: "select", label: "Dropdown" },
  { type: "radio", label: "Radio" },
  { type: "checkbox", label: "Checkbox" },
  { type: "file", label: "File Upload" },
  { type: "resume", label: "Resume Upload" },
];

const PRESETS: { label: string; field: Omit<FormField, "id"> }[] = [
  {
    label: "Name",
    field: { key: "name", label: "Full Name", type: "text", required: true },
  },
  {
    label: "Phone",
    field: { key: "phone", label: "Phone", type: "tel", required: true },
  },
  {
    label: "Rating",
    field: {
      key: "rating",
      label: "Overall rating",
      type: "select",
      required: true,
      options: ["5 — Excellent", "4 — Good", "3 — Okay", "2 — Poor", "1 — Bad"],
    },
  },
  {
    label: "Feedback",
    field: {
      key: "feedback",
      label: "Your feedback",
      type: "textarea",
      required: true,
    },
  },
  {
    label: "Recommend",
    field: {
      key: "recommend",
      label: "Would you recommend?",
      type: "radio",
      required: true,
      options: ["Yes", "No", "Maybe"],
    },
  },
];

function slugKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function FieldPreview({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-text-dim">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        {field.label}
        {field.required ? <span className="text-[var(--accent)]">*</span> : null}
      </label>
    );
  }

  if (field.type === "radio") {
    return (
      <div>
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-1.5 text-sm text-text-dim"
            >
              <input
                type="radio"
                name={field.key}
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

  if (field.type === "select") {
    return (
      <div>
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        <Select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        <TextArea
          rows={3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "file" || field.type === "resume") {
    return (
      <div>
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        <Input
          type="file"
          accept={field.type === "resume" ? ".pdf,.doc,.docx" : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file ? file.name : "");
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel>
        {field.label}
        {field.required ? " *" : ""}
      </FieldLabel>
      <Input
        type={
          field.type === "tel"
            ? "tel"
            : field.type === "email"
              ? "email"
              : field.type === "number"
                ? "number"
                : "text"
        }
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FormBuilder({
  eventId,
  purpose,
}: {
  eventId: string;
  purpose: FormPurpose;
}) {
  const { store, saveForm, registerForEvent, submitFormResponse } = useStore();
  const { session, profile } = useCurrentUser();
  const event = store.events.find((e) => e.id === eventId);
  const existing = getEventForm(store, eventId, purpose);

  const [fields, setFields] = useState<FormField[]>(
    () => existing?.questions.map(questionToField) ?? [],
  );
  const [draft, setDraft] = useState({
    label: "",
    type: "text" as FormFieldType,
    required: false,
    options: "",
  });
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const form = getEventForm(store, eventId, purpose);
    setFields(form?.questions.map(questionToField) ?? []);
    setAnswers({});
    setSubmitted(false);
    setError("");
  }, [eventId, purpose, store.forms]);

  const responses = useMemo(
    () =>
      (store.formResponses ?? []).filter(
        (r) => r.eventId === eventId && r.formId === existing?.id,
      ),
    [store.formResponses, eventId, existing?.id],
  );

  const alreadyRegistered = useMemo(
    () =>
      store.registrations.some(
        (r) => r.eventId === eventId && r.userId === session.userId,
      ),
    [store.registrations, eventId, session.userId],
  );

  const alreadyFeedback = useMemo(
    () =>
      (store.formResponses ?? []).some(
        (r) =>
          r.eventId === eventId &&
          r.userId === session.userId &&
          r.formId === existing?.id,
      ),
    [store.formResponses, eventId, session.userId, existing?.id],
  );

  const attended = useMemo(
    () =>
      store.attendance.some(
        (a) =>
          a.eventId === eventId &&
          a.userId === session.userId &&
          ["present", "late", "volunteer", "speaker"].includes(a.status),
      ),
    [store.attendance, eventId, session.userId],
  );

  if (!event) return null;

  function addField(partial?: Omit<FormField, "id">) {
    const base = partial ?? {
      key: slugKey(draft.label) || `field_${fields.length + 1}`,
      label: draft.label || `Field ${fields.length + 1}`,
      type: draft.type,
      required: draft.required,
      options:
        draft.type === "select" || draft.type === "radio"
          ? draft.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };
    if (!base.label.trim()) return;
    setFields((f) => [
      ...f,
      {
        id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...base,
        key: base.key || slugKey(base.label),
      },
    ]);
    setDraft({ label: "", type: "text", required: false, options: "" });
  }

  function move(index: number, dir: -1 | 1) {
    setFields((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    saveForm(
      eventId,
      purpose,
      fields,
      purpose === "feedback"
        ? `${event!.title} feedback`
        : `${event!.title} registration`,
    );
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  function submitPreview() {
    setError("");
    for (const field of fields) {
      if (!field.required) continue;
      const v = answers[field.key];
      if (field.type === "checkbox") continue;
      if (v === undefined || v === "") {
        setError(`Missing: ${field.label}`);
        return;
      }
    }

    if (purpose === "registration") {
      const regResult = registerForEvent({
        id: `reg-${Date.now()}`,
        eventId,
        userId: session.userId,
        status: "pending",
        answers: {
          name: profile?.fullName ?? "",
          ...answers,
        },
        qrCode: "",
        createdAt: new Date().toISOString(),
      });
      if (!regResult.ok) {
        setError(regResult.message);
        return;
      }
      setSubmitted(true);
      return;
    }

    if (purpose === "feedback") {
      if (!attended && event!.status !== "completed") {
        setError("Feedback opens after you attend (or when the event is completed).");
        return;
      }
      const form = getEventForm(store, eventId, "feedback");
      if (!form) {
        setError("Save the feedback form first.");
        return;
      }
      const res = submitFormResponse({
        formId: form.id,
        userId: session.userId,
        eventId,
        answers,
      });
      if (!res) {
        setError("You already submitted feedback.");
        return;
      }
      setSubmitted(true);
    }
  }

  const title =
    purpose === "feedback" ? "Feedback form" : "Registration form";
  const previewLocked =
    purpose === "registration"
      ? alreadyRegistered || submitted
      : alreadyFeedback || submitted;

  const chapterSlug = store.chapters.find((c) => c.id === event.chapterId)?.slug;
  const formsHref = existing
    ? `/chapter/${chapterSlug}/forms/${existing.id}`
    : `/chapter/${chapterSlug}/forms`;

  return (
    <div className="space-y-4">
      {chapterSlug ? (
        <TerminalPanel title="forms.hub" accent="orange">
          <p className="mb-3 text-[12px] text-text-dim">
            Open the Elevates form builder for templates, responses, and summary charts.
          </p>
          <Link href={formsHref}>
            <Button variant="orange">Open in Forms</Button>
          </Link>
        </TerminalPanel>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title={title} meta={event.title}>
          <p className="mb-3 text-[12px] text-text-dim">
            {purpose === "feedback"
              ? "Post-event survey — MakeMyPass-style feedback fields."
              : "Custom registration schema for this event."}
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addField(p.field)}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-[11px] text-text-dim hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-2 rounded-[var(--radius)] border border-dashed border-border p-3 md:grid-cols-2">
            <div>
              <FieldLabel>Custom field label</FieldLabel>
              <Input
                value={draft.label}
                placeholder="e.g. Team name"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, label: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    type: e.target.value as FormFieldType,
                  }))
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            {(draft.type === "select" || draft.type === "radio") && (
              <div className="md:col-span-2">
                <FieldLabel>Options (comma-separated)</FieldLabel>
                <Input
                  value={draft.options}
                  placeholder="Option A, Option B"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, options: e.target.value }))
                  }
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-[12px] text-text-dim md:col-span-2">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, required: e.target.checked }))
                }
              />
              Required
            </label>
            <Button variant="ghost" onClick={() => addField()}>
              Add field
            </Button>
          </div>

          <ul className="space-y-2">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2"
              >
                <span className="flex-1 text-sm font-semibold">{field.label}</span>
                <Badge tone="mute">{field.type}</Badge>
                <button
                  type="button"
                  className="text-[11px] text-text-mute"
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-[11px] text-text-mute"
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-[11px] text-[var(--accent)]"
                  onClick={() =>
                    setFields((f) => f.filter((x) => x.id !== field.id))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="orange" onClick={save}>
              Save schema
            </Button>
            {savedFlash ? (
              <span className="self-center text-[12px] text-[var(--success)]">
                Saved
              </span>
            ) : null}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title={purpose === "feedback" ? "Submit feedback" : "Live preview"}
          meta="student view"
        >
          {fields.length === 0 ? (
            <p className="text-[13px] text-text-mute">
              Add fields to preview.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <FieldPreview
                  key={field.id}
                  field={field}
                  value={
                    answers[field.key] ??
                    (field.type === "checkbox" ? false : "")
                  }
                  onChange={(v) =>
                    setAnswers((a) => ({ ...a, [field.key]: v }))
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            {error ? (
              <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>
            ) : null}
            {previewLocked ? (
              <p className={cn("text-sm text-[var(--success)]")}>
                {purpose === "feedback"
                  ? "Feedback submitted. Thank you."
                  : "Registration submitted — awaiting review. QR issues on approval."}
              </p>
            ) : (
              <Button
                variant="primary"
                disabled={fields.length === 0}
                onClick={submitPreview}
              >
                {purpose === "feedback"
                  ? "Submit feedback"
                  : "Submit registration"}
              </Button>
            )}
          </div>
        </TerminalPanel>
      </div>

      {purpose === "feedback" ? (
        <TerminalPanel title="Responses" meta={`${responses.length} submitted`}>
          {responses.length === 0 ? (
            <p className="text-[13px] text-text-dim">No feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {responses.map((r) => {
                const user = store.profiles.find((p) => p.id === r.userId);
                return (
                  <li
                    key={r.id}
                    className="rounded-[var(--radius-sm)] border border-border p-3 text-[13px]"
                  >
                    <p className="font-semibold">{user?.fullName ?? r.userId}</p>
                    <dl className="mt-2 space-y-1 text-[12px] text-text-dim">
                      {Object.entries(r.answers).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="font-medium text-text">{k}:</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </TerminalPanel>
      ) : null}
    </div>
  );
}

/** Back-compat wrapper */
export function RegistrationBuilder({ eventId }: { eventId: string }) {
  return <FormBuilder eventId={eventId} purpose="registration" />;
}

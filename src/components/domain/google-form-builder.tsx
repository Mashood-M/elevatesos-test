"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { QUESTION_TYPE_LABELS } from "@/lib/forms/helpers";
import type {
  FormDefinition,
  FormPurpose,
  FormQuestion,
  FormQuestionType,
  FormStatus,
} from "@/types";
import { cn } from "@/lib/utils";

const ADD_TYPES: FormQuestionType[] = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "representative",
  "linear_scale",
  "rating",
  "date",
  "time",
  "file_upload",
  "section_header",
];

function newQuestion(type: FormQuestionType): FormQuestion {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const base: FormQuestion = {
    id,
    type,
    title:
      type === "section_header"
        ? "Untitled section"
        : type === "representative"
          ? "Class representative"
          : "Untitled question",
    description:
      type === "representative"
        ? "Students pick their CR from the chapter list at fill time."
        : undefined,
    required: type !== "section_header",
  };
  if (
    type === "multiple_choice" ||
    type === "checkboxes" ||
    type === "dropdown"
  ) {
    base.options = ["Option 1", "Option 2"];
  }
  if (type === "linear_scale") {
    base.scaleMin = 1;
    base.scaleMax = 5;
    base.scaleMinLabel = "";
    base.scaleMaxLabel = "";
  }
  if (type === "rating") base.ratingMax = 5;
  return base;
}

export function GoogleFormBuilder({
  form,
  chapterId,
}: {
  form: FormDefinition;
  chapterId: string;
}) {
  const { store, updateForm, saveFormQuestions, setFormStatus } = useStore();
  const [meta, setMeta] = useState({
    title: form.title,
    description: form.description ?? "",
    purpose: form.purpose,
    eventId: form.eventId ?? "",
    status: form.status,
  });
  const [questions, setQuestions] = useState<FormQuestion[]>(form.questions);
  const [selectedId, setSelectedId] = useState<string | null>(
    form.questions[0]?.id ?? null,
  );
  const [flash, setFlash] = useState("");

  useEffect(() => {
    setMeta({
      title: form.title,
      description: form.description ?? "",
      purpose: form.purpose,
      eventId: form.eventId ?? "",
      status: form.status,
    });
    setQuestions(form.questions);
  }, [form.id, form.updatedAt]);

  const events = store.events.filter((e) => e.chapterId === chapterId);
  const selected = questions.find((q) => q.id === selectedId) ?? null;

  function persistMeta(next = meta) {
    updateForm(form.id, {
      title: next.title.trim() || "Untitled form",
      description: next.description,
      purpose: next.purpose,
      eventId: next.eventId || undefined,
      status: next.status,
    });
    setFlash("Saved");
    window.setTimeout(() => setFlash(""), 1200);
  }

  function persistQuestions(next: FormQuestion[]) {
    setQuestions(next);
    saveFormQuestions(form.id, next);
    setFlash("Saved");
    window.setTimeout(() => setFlash(""), 1200);
  }

  function patchQuestion(id: string, patch: Partial<FormQuestion>) {
    persistQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  function addQuestion(type: FormQuestionType) {
    const q = newQuestion(type);
    const next = [...questions, q];
    persistQuestions(next);
    setSelectedId(q.id);
  }

  function move(id: string, dir: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistQuestions(next);
  }

  function duplicate(id: string) {
    const src = questions.find((q) => q.id === id);
    if (!src) return;
    const copy: FormQuestion = {
      ...src,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: `${src.title} (copy)`,
      options: src.options ? [...src.options] : undefined,
    };
    const idx = questions.findIndex((q) => q.id === id);
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    persistQuestions(next);
    setSelectedId(copy.id);
  }

  function remove(id: string) {
    const next = questions.filter((q) => q.id !== id);
    persistQuestions(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  return (
    <div className="space-y-4">
      <TerminalPanel title="form.settings" meta={flash || form.status}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Title</FieldLabel>
            <Input
              value={meta.title}
              onChange={(e) =>
                setMeta((m) => ({ ...m, title: e.target.value }))
              }
              onBlur={() => persistMeta()}
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <TextArea
              rows={2}
              value={meta.description}
              onChange={(e) =>
                setMeta((m) => ({ ...m, description: e.target.value }))
              }
              onBlur={() => persistMeta()}
            />
          </div>
          <div>
            <FieldLabel>Purpose</FieldLabel>
            <Select
              value={meta.purpose}
              onChange={(e) => {
                const purpose = e.target.value as FormPurpose;
                const next = { ...meta, purpose };
                setMeta(next);
                persistMeta(next);
              }}
            >
              <option value="registration">Registration</option>
              <option value="feedback">Feedback</option>
              <option value="survey">Survey</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={meta.status}
              onChange={(e) => {
                const status = e.target.value as FormStatus;
                const next = { ...meta, status };
                setMeta(next);
                setFormStatus(form.id, status);
                setFlash("Status updated");
                window.setTimeout(() => setFlash(""), 1200);
              }}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Attach to event (optional)</FieldLabel>
            <Select
              value={meta.eventId}
              onChange={(e) => {
                const next = { ...meta, eventId: e.target.value };
                setMeta(next);
                persistMeta(next);
              }}
            >
              <option value="">Standalone — no event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.ticketNo} · {ev.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </TerminalPanel>

      <div className="flex flex-wrap gap-2">
        {ADD_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addQuestion(type)}
            className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-[11px] text-text-dim transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            + {QUESTION_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {questions.map((q, index) => {
            const active = q.id === selectedId;
            const isSection = q.type === "section_header";
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedId(q.id)}
                className={cn(
                  "w-full border px-4 py-3 text-left transition",
                  isSection
                    ? "border-dashed border-border bg-[var(--surface-2)]"
                    : "border-border bg-[var(--surface)]",
                  active && "border-[var(--accent)] ring-1 ring-[var(--accent)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-text-dim">
                      {index + 1}. {QUESTION_TYPE_LABELS[q.type]}
                      {q.required && !isSection ? " · required" : ""}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-semibold",
                        isSection && "font-display text-base",
                      )}
                    >
                      {q.title || "Untitled"}
                    </p>
                    {q.description ? (
                      <p className="mt-0.5 truncate text-[12px] text-text-dim">
                        {q.description}
                      </p>
                    ) : null}
                    {q.options?.length ? (
                      <p className="mt-1 text-[11px] text-text-dim">
                        {q.options.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={active ? "orange" : "mute"}>
                    {isSection ? "section" : "question"}
                  </Badge>
                </div>
              </button>
            );
          })}
          {!questions.length ? (
            <p className="text-sm text-text-dim">
              Add a question to start building.
            </p>
          ) : null}
        </div>

        <TerminalPanel title="edit.question" accent="orange">
          {!selected ? (
            <p className="text-[12px] text-text-dim">Select a question.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={selected.type}
                  onChange={(e) =>
                    patchQuestion(selected.id, {
                      type: e.target.value as FormQuestionType,
                    })
                  }
                >
                  {ADD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={selected.title}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((q) =>
                        q.id === selected.id
                          ? { ...q, title: e.target.value }
                          : q,
                      ),
                    )
                  }
                  onBlur={(e) =>
                    patchQuestion(selected.id, { title: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  rows={2}
                  value={selected.description ?? ""}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((q) =>
                        q.id === selected.id
                          ? { ...q, description: e.target.value }
                          : q,
                      ),
                    )
                  }
                  onBlur={(e) =>
                    patchQuestion(selected.id, {
                      description: e.target.value,
                    })
                  }
                />
              </div>
              {selected.type !== "section_header" ? (
                <label className="flex items-center gap-2 text-sm text-text-dim">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(e) =>
                      patchQuestion(selected.id, {
                        required: e.target.checked,
                      })
                    }
                    className="accent-[var(--accent)]"
                  />
                  Required
                </label>
              ) : null}

              {(selected.type === "multiple_choice" ||
                selected.type === "checkboxes" ||
                selected.type === "dropdown") && (
                <div>
                  <FieldLabel>Options (one per line)</FieldLabel>
                  <TextArea
                    rows={4}
                    value={(selected.options ?? []).join("\n")}
                    onChange={(e) =>
                      setQuestions((list) =>
                        list.map((q) =>
                          q.id === selected.id
                            ? {
                                ...q,
                                options: e.target.value.split("\n"),
                              }
                            : q,
                        ),
                      )
                    }
                    onBlur={(e) =>
                      patchQuestion(selected.id, {
                        options: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              )}

              {selected.type === "linear_scale" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel>Min</FieldLabel>
                    <Input
                      type="number"
                      value={selected.scaleMin ?? 1}
                      onChange={(e) =>
                        patchQuestion(selected.id, {
                          scaleMin: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Max</FieldLabel>
                    <Input
                      type="number"
                      value={selected.scaleMax ?? 5}
                      onChange={(e) =>
                        patchQuestion(selected.id, {
                          scaleMax: Number(e.target.value) || 5,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Min label</FieldLabel>
                    <Input
                      value={selected.scaleMinLabel ?? ""}
                      onChange={(e) =>
                        patchQuestion(selected.id, {
                          scaleMinLabel: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Max label</FieldLabel>
                    <Input
                      value={selected.scaleMaxLabel ?? ""}
                      onChange={(e) =>
                        patchQuestion(selected.id, {
                          scaleMaxLabel: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selected.type === "rating" ? (
                <div>
                  <FieldLabel>Max stars</FieldLabel>
                  <Select
                    value={String(selected.ratingMax ?? 5)}
                    onChange={(e) =>
                      patchQuestion(selected.id, {
                        ratingMax: Number(e.target.value),
                      })
                    }
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </Select>
                </div>
              ) : null}

              {selected.type === "representative" ? (
                <p className="text-[12px] text-text-dim">
                  At fill time students only see the 1–2 representatives
                  for their class (department + year + section on their profile).
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => move(selected.id, -1)}
                >
                  ↑
                </Button>
                <Button variant="ghost" onClick={() => move(selected.id, 1)}>
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => duplicate(selected.id)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="orange"
                  onClick={() => remove(selected.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </TerminalPanel>
      </div>
    </div>
  );
}

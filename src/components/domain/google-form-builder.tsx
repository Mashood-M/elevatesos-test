"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { FormLogicBuilder } from "@/components/domain/form-logic-builder";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import {
  ensureRepresentativeQuestion,
  QUESTION_TYPE_LABELS,
} from "@/lib/forms/helpers";
import type {
  FormDefinition,
  FormLogicRule,
  FormPurpose,
  FormQuestion,
  FormQuestionType,
} from "@/types";
import { cn } from "@/lib/utils";

/** Types available when changing an existing question (no Section). */
const QUESTION_TYPES: FormQuestionType[] = [
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
];

/** Types in the Add (+) menu — includes Section as a page break. */
const ADD_TYPES: FormQuestionType[] = [...QUESTION_TYPES, "section_header"];

const panelSection =
  "rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow-sm)] md:p-6";

function applyTypeDefaults(
  q: FormQuestion,
  type: FormQuestionType,
): FormQuestion {
  const next: FormQuestion = {
    ...q,
    type,
    required: type === "section_header" ? false : q.required,
    options: undefined,
    scaleMin: undefined,
    scaleMax: undefined,
    scaleMinLabel: undefined,
    scaleMaxLabel: undefined,
    ratingMax: undefined,
  };

  if (
    type === "multiple_choice" ||
    type === "checkboxes" ||
    type === "dropdown"
  ) {
    next.options =
      q.options && q.options.length >= 1
        ? [...q.options]
        : ["Option 1", "Option 2"];
  }

  if (type === "linear_scale") {
    next.scaleMin = q.scaleMin ?? 1;
    next.scaleMax = q.scaleMax ?? 5;
    next.scaleMinLabel = q.scaleMinLabel ?? "";
    next.scaleMaxLabel = q.scaleMaxLabel ?? "";
  }

  if (type === "rating") {
    next.ratingMax = q.ratingMax ?? 5;
  }

  if (type === "section_header") {
    if (!q.title.trim() || q.title === "Untitled question") {
      next.title = "Untitled section";
    }
  }

  if (type === "representative") {
    if (!q.title.trim() || q.title === "Untitled question") {
      next.title = "Class representative";
    }
    next.description =
      q.description?.trim() ||
      "Students pick their CR from the chapter list at fill time.";
    next.required = true;
  }

  return next;
}

function newQuestion(type: FormQuestionType): FormQuestion {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  return applyTypeDefaults(
    {
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
    },
    type,
  );
}

function AddTypeMenu({
  open,
  onToggle,
  onPick,
  variant = "button",
}: {
  open: boolean;
  onToggle: () => void;
  onPick: (t: FormQuestionType) => void;
  /** `rail` = G Forms–style circular + on the right */
  variant?: "button" | "rail";
}) {
  const menu = open ? (
    <div
      className={cn(
        "z-20 max-h-72 w-48 overflow-y-auto rounded-[var(--radius)] bg-bg-panel p-2 shadow-[var(--shadow)]",
        variant === "rail"
          ? "absolute left-12 top-0"
          : "absolute bottom-11 left-0 sm:bottom-auto sm:top-11",
      )}
    >
      {ADD_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="block w-full rounded-[10px] px-3 py-2 text-left text-[12px] hover:bg-bg"
        >
          {QUESTION_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  ) : null;

  if (variant === "rail") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-panel text-[var(--accent)] shadow-[var(--shadow)] ring-1 ring-border hover:bg-[var(--accent-soft)]"
          aria-label="Add question"
        >
          <Plus size={20} />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="orange"
        className="h-9 gap-1.5"
        onClick={onToggle}
        type="button"
      >
        <Plus size={16} />
        Add
      </Button>
      {menu}
    </div>
  );
}

/** Form builder — preview-matched Elevates panels; purpose/event in settings. */
export function GoogleFormBuilder({
  form,
  chapterId,
}: {
  form: FormDefinition;
  chapterId: string;
}) {
  const { store, updateForm, saveFormQuestions } = useStore();
  const [meta, setMeta] = useState({
    title: form.title,
    description: form.description ?? "",
    purpose: form.purpose,
    eventId: form.eventId ?? "",
  });
  const [logicEnabled, setLogicEnabled] = useState(
    Boolean(form.logicEnabled),
  );
  const [logicRules, setLogicRules] = useState<FormLogicRule[]>(
    form.logicRules ?? [],
  );
  const [questions, setQuestions] = useState<FormQuestion[]>(form.questions);
  const [selectedId, setSelectedId] = useState<string | null>(
    form.questions[0]?.id ?? "title",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setMeta({
      title: form.title,
      description: form.description ?? "",
      purpose: form.purpose,
      eventId: form.eventId ?? "",
    });
    setLogicEnabled(Boolean(form.logicEnabled));
    setLogicRules(form.logicRules ?? []);
    setQuestions(form.questions);
  }, [form.id, form.updatedAt]);

  const events = store.events.filter((e) => e.chapterId === chapterId);

  function persistMeta(next = meta) {
    const purpose = next.purpose;
    updateForm(form.id, {
      title: next.title.trim() || "Untitled form",
      description: next.description,
      purpose,
      eventId: next.eventId || undefined,
    });
    if (purpose === "registration") {
      const ensured = ensureRepresentativeQuestion({
        ...form,
        purpose,
        questions,
      });
      if (ensured.questions.length !== questions.length) {
        persistQuestions(ensured.questions);
      }
    }
  }

  function persistLogic(
    nextEnabled = logicEnabled,
    nextRules = logicRules,
  ) {
    updateForm(form.id, {
      logicEnabled: nextEnabled,
      logicRules: nextRules.slice(0, 8),
    });
  }

  function persistQuestions(next: FormQuestion[]) {
    let toSave = next;
    if (meta.purpose === "registration") {
      toSave = ensureRepresentativeQuestion({
        ...form,
        purpose: "registration",
        questions: next,
      }).questions;
    }
    setQuestions(toSave);
    saveFormQuestions(form.id, toSave);
  }

  function patchQuestion(id: string, patch: Partial<FormQuestion>) {
    persistQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  function changeQuestionType(id: string, type: FormQuestionType) {
    let nextSelected = id;
    const next = questions.map((q) => {
      if (q.id !== id) return q;
      const applied = applyTypeDefaults(q, type);
      // Free the reserved CR id when leaving representative so ensure can re-add it.
      if (
        q.type === "representative" &&
        type !== "representative" &&
        applied.id === "f-representative"
      ) {
        nextSelected = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
        return { ...applied, id: nextSelected };
      }
      return applied;
    });
    persistQuestions(next);
    setSelectedId(nextSelected);
  }

  function addQuestion(type: FormQuestionType) {
    const q = newQuestion(type);
    const next = [...questions];
    if (selectedId === "title") {
      next.splice(0, 0, q);
    } else {
      const idx = selectedId
        ? questions.findIndex((x) => x.id === selectedId)
        : questions.length - 1;
      next.splice(idx >= 0 ? idx + 1 : next.length, 0, q);
    }
    persistQuestions(next);
    setSelectedId(q.id);
    setAddOpen(false);
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
    if (selectedId === id) setSelectedId(next[0]?.id ?? "title");
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = questions.findIndex((q) => q.id === dragId);
    const to = questions.findIndex((q) => q.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistQuestions(next);
    setDragId(null);
  }

  return (
    <div className="relative mx-auto max-w-xl space-y-4 pb-16 sm:pr-12">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-text-dim hover:bg-bg"
        >
          <Settings2 size={14} />
          Elevates settings
        </button>
      </div>

      {showSettings ? (
        <TerminalPanel title="settings" meta="purpose · event · logic">
          <div className="grid gap-3 sm:grid-cols-2">
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
              <FieldLabel>Attach to event</FieldLabel>
              <Select
                value={meta.eventId}
                onChange={(e) => {
                  const next = { ...meta, eventId: e.target.value };
                  setMeta(next);
                  persistMeta(next);
                }}
              >
                <option value="">Standalone</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2 border-t border-border/80 pt-3">
              <label className="flex items-center gap-2 text-[13px] text-text">
                <input
                  type="checkbox"
                  checked={logicEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setLogicEnabled(on);
                    persistLogic(on, logicRules);
                  }}
                  className="accent-[var(--accent)]"
                />
                Enable form logic (blocks)
              </label>
              <p className="mt-1 text-[11px] text-text-mute">
                Notion-style When / If / Then — drag blocks, no code. Sections
                still use the Section item in Add.
              </p>
              {logicEnabled ? (
                <div className="mt-3">
                  <FormLogicBuilder
                    form={{ ...form, questions, purpose: meta.purpose }}
                    rules={logicRules}
                    onChange={(next) => {
                      setLogicRules(next);
                      persistLogic(true, next);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </TerminalPanel>
      ) : null}

      <div className="relative">
        <section
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedId("title");
            setAddOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedId("title");
            }
          }}
          className={cn(
            "rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] md:p-6",
            selectedId === "title" && "ring-1 ring-[var(--accent)]",
          )}
        >
          <p className="mb-2 text-[12px] text-text-mute">{meta.purpose}</p>
          <input
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            onBlur={() => persistMeta()}
            onClick={(e) => e.stopPropagation()}
            className="w-full border-0 border-b border-transparent bg-transparent font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.03em] text-text outline-none focus:border-[var(--accent)]"
            placeholder="Untitled form"
          />
          <textarea
            value={meta.description}
            onChange={(e) =>
              setMeta((m) => ({ ...m, description: e.target.value }))
            }
            onBlur={() => persistMeta()}
            onClick={(e) => e.stopPropagation()}
            rows={2}
            placeholder="Form description"
            className="mt-3 w-full resize-none border-0 border-b border-transparent bg-transparent text-[14px] text-text-dim outline-none focus:border-[var(--accent)]"
          />
        </section>
        {selectedId === "title" ? (
          <div className="absolute -right-12 top-4 hidden sm:block">
            <AddTypeMenu
              variant="rail"
              open={addOpen}
              onToggle={() => setAddOpen((v) => !v)}
              onPick={addQuestion}
            />
          </div>
        ) : null}
      </div>

      {questions.map((q) => {
        const active = q.id === selectedId;
        const isSection = q.type === "section_header";
        return (
          <div key={q.id} className="relative">
          <section
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedId(q.id);
              if (!active) setAddOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedId(q.id);
              }
            }}
            className={cn(
              panelSection,
              active && "ring-1 ring-[var(--accent)]",
              dragId === q.id && "opacity-60",
            )}
          >
            <div className="flex gap-2">
              <div
                className="mt-1 shrink-0 cursor-grab text-text-mute"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragId(q.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDrop(q.id);
                }}
              >
                <GripVertical size={16} />
              </div>

              <div className="min-w-0 flex-1">
                {active ? (
                  <div
                    className="space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <input
                        value={q.title}
                        onChange={(e) =>
                          setQuestions((list) =>
                            list.map((x) =>
                              x.id === q.id
                                ? { ...x, title: e.target.value }
                                : x,
                            ),
                          )
                        }
                        onBlur={(e) =>
                          patchQuestion(q.id, { title: e.target.value })
                        }
                        className={cn(
                          "min-w-0 flex-1 border-0 border-b border-border bg-transparent font-medium outline-none focus:border-[var(--accent)]",
                          isSection ? "text-[18px] font-bold" : "text-[16px]",
                        )}
                        placeholder={
                          isSection ? "Untitled section" : "Question"
                        }
                      />
                      <Select
                        value={q.type}
                        onChange={(e) =>
                          changeQuestionType(
                            q.id,
                            e.target.value as FormQuestionType,
                          )
                        }
                        className="w-[160px]"
                      >
                        {(isSection ? ADD_TYPES : QUESTION_TYPES).map((t) => (
                          <option key={t} value={t}>
                            {QUESTION_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <input
                      value={q.description ?? ""}
                      onChange={(e) =>
                        setQuestions((list) =>
                          list.map((x) =>
                            x.id === q.id
                              ? { ...x, description: e.target.value }
                              : x,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        patchQuestion(q.id, { description: e.target.value })
                      }
                      placeholder={
                        isSection
                          ? "Section description (optional)"
                          : "Description (optional)"
                      }
                      className="w-full border-0 border-b border-transparent bg-transparent text-[13px] text-text-dim outline-none focus:border-[var(--accent)]"
                    />

                    {isSection ? (
                      <p className="rounded-[10px] bg-bg px-3 py-2 text-[12px] text-text-mute">
                        Section break — starts a new page on fill. Respondents
                        complete the previous section, then Next to reach this
                        one.
                      </p>
                    ) : null}

                    {(q.type === "multiple_choice" ||
                      q.type === "checkboxes" ||
                      q.type === "dropdown") && (
                      <div className="space-y-2">
                        {(q.options ?? []).map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-text-mute">
                              {q.type === "checkboxes" ? "☐" : "○"}
                            </span>
                            <input
                              value={opt}
                              onChange={(e) => {
                                const options = [...(q.options ?? [])];
                                options[i] = e.target.value;
                                setQuestions((list) =>
                                  list.map((x) =>
                                    x.id === q.id ? { ...x, options } : x,
                                  ),
                                );
                              }}
                              onBlur={() =>
                                patchQuestion(q.id, {
                                  options: (q.options ?? [])
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              className="flex-1 border-0 border-b border-border bg-transparent text-[14px] outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-[13px] text-[var(--accent)]"
                          onClick={() =>
                            patchQuestion(q.id, {
                              options: [
                                ...(q.options ?? []),
                                `Option ${(q.options?.length ?? 0) + 1}`,
                              ],
                            })
                          }
                        >
                          Add option
                        </button>
                      </div>
                    )}

                    {q.type === "linear_scale" ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <FieldLabel>Min</FieldLabel>
                          <Input
                            type="number"
                            value={q.scaleMin ?? 1}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                scaleMin: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Max</FieldLabel>
                          <Input
                            type="number"
                            value={q.scaleMax ?? 5}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                scaleMax: Number(e.target.value) || 5,
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Min label</FieldLabel>
                          <Input
                            value={q.scaleMinLabel ?? ""}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                scaleMinLabel: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Max label</FieldLabel>
                          <Input
                            value={q.scaleMaxLabel ?? ""}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                scaleMaxLabel: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {q.type === "rating" ? (
                      <div className="space-y-2">
                        <div className="flex gap-1 text-2xl text-[var(--accent)]">
                          {Array.from(
                            { length: q.ratingMax ?? 5 },
                            (_, i) => (
                              <span key={i}>★</span>
                            ),
                          )}
                        </div>
                        <div className="max-w-[120px]">
                          <FieldLabel>Max stars</FieldLabel>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={q.ratingMax ?? 5}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                ratingMax: Math.min(
                                  10,
                                  Math.max(1, Number(e.target.value) || 5),
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {q.type === "short_text" || q.type === "paragraph" ? (
                      <p className="border-b border-dashed border-border py-2 text-[13px] text-text-mute">
                        {q.type === "short_text"
                          ? "Short answer text"
                          : "Long answer text"}
                      </p>
                    ) : null}

                    {q.type === "date" || q.type === "time" ? (
                      <Input
                        type={q.type}
                        disabled
                        className="opacity-70"
                        placeholder={q.type === "date" ? "YYYY-MM-DD" : "HH:MM"}
                      />
                    ) : null}

                    {q.type === "file_upload" ? (
                      <div className="space-y-2">
                        <Input type="file" disabled className="opacity-70" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Accept</FieldLabel>
                            <Input
                              value={q.fileAccept ?? ""}
                              onChange={(e) =>
                                patchQuestion(q.id, {
                                  fileAccept: e.target.value || undefined,
                                })
                              }
                              placeholder=".pdf,image/*"
                            />
                          </div>
                          <div>
                            <FieldLabel>Max MB</FieldLabel>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={q.fileMaxMb ?? 2}
                              onChange={(e) =>
                                patchQuestion(q.id, {
                                  fileMaxMb: Math.min(
                                    10,
                                    Math.max(1, Number(e.target.value) || 2),
                                  ),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {!isSection &&
                    (q.type === "short_text" ||
                      q.type === "paragraph" ||
                      q.type === "linear_scale" ||
                      q.type === "rating") ? (
                      <div className="space-y-2 border-t border-border/60 pt-3">
                        <FieldLabel>Validation</FieldLabel>
                        <Select
                          value={q.validation?.[0]?.kind ?? ""}
                          onChange={(e) => {
                            const kind = e.target.value;
                            if (!kind) {
                              patchQuestion(q.id, { validation: undefined });
                              return;
                            }
                            patchQuestion(q.id, {
                              validation: [
                                {
                                  kind: kind as NonNullable<
                                    typeof q.validation
                                  >[0]["kind"],
                                  value: q.validation?.[0]?.value,
                                  message: q.validation?.[0]?.message,
                                },
                              ],
                            });
                          }}
                        >
                          <option value="">None</option>
                          {(q.type === "short_text" ||
                            q.type === "paragraph") && (
                            <>
                              <option value="email">Email</option>
                              <option value="url">URL</option>
                              <option value="phone">Phone</option>
                              <option value="min_length">Min length</option>
                              <option value="max_length">Max length</option>
                            </>
                          )}
                          {(q.type === "linear_scale" ||
                            q.type === "rating") && (
                            <>
                              <option value="min">Min value</option>
                              <option value="max">Max value</option>
                            </>
                          )}
                        </Select>
                        {q.validation?.[0] &&
                        (q.validation[0].kind === "min_length" ||
                          q.validation[0].kind === "max_length" ||
                          q.validation[0].kind === "min" ||
                          q.validation[0].kind === "max") ? (
                          <Input
                            type="number"
                            value={q.validation[0].value ?? ""}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                validation: [
                                  {
                                    ...q.validation![0],
                                    value: Number(e.target.value) || 0,
                                  },
                                ],
                              })
                            }
                            placeholder="Value"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {q.type === "representative" ? (
                      <p className="border-b border-dashed border-border py-2 text-[13px] text-text-mute">
                        Class representative dropdown at fill time
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-full p-2 text-text-dim hover:bg-bg"
                          onClick={() => move(q.id, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-text-dim hover:bg-bg"
                          onClick={() => move(q.id, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-text-dim hover:bg-bg"
                          onClick={() => duplicate(q.id)}
                          aria-label="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-2 text-text-dim hover:bg-bg"
                          onClick={() => remove(q.id)}
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {!isSection ? (
                        <label className="flex items-center gap-2 text-[13px] text-text-dim">
                          Required
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              patchQuestion(q.id, {
                                required: e.target.checked,
                              })
                            }
                            className="accent-[var(--accent)]"
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-text-mute">
                      {QUESTION_TYPE_LABELS[q.type]}
                      {q.required && !isSection ? " · Required" : ""}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.02em] text-text",
                        isSection && "text-[17px]",
                      )}
                    >
                      {q.title ||
                        (isSection ? "Untitled section" : "Untitled question")}
                    </p>
                    {q.description ? (
                      <p className="mt-1 text-[13px] text-text-dim">
                        {q.description}
                      </p>
                    ) : null}
                    {!isSection && q.options?.length ? (
                      <ul className="mt-2 space-y-1 text-[13px] text-text-dim">
                        {q.options.slice(0, 3).map((o) => (
                          <li key={o}>○ {o}</li>
                        ))}
                      </ul>
                    ) : null}
                    {!isSection && q.type === "rating" ? (
                      <p className="mt-2 text-[16px] text-[var(--accent)]">
                        {"★".repeat(q.ratingMax ?? 5)}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>
          {active ? (
            <div className="absolute -right-12 top-4 hidden sm:block">
              <AddTypeMenu
                variant="rail"
                open={addOpen}
                onToggle={() => setAddOpen((v) => !v)}
                onPick={addQuestion}
              />
            </div>
          ) : null}
          </div>
        );
      })}

      {!questions.length ? (
        <div className={cn(panelSection, "text-center")}>
          <p className="text-[13px] text-text-dim">No questions yet.</p>
          <div className="mt-3 flex justify-center">
            <AddTypeMenu
              open={addOpen}
              onToggle={() => setAddOpen((v) => !v)}
              onPick={addQuestion}
            />
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 sm:hidden">
        <AddTypeMenu
          open={addOpen}
          onToggle={() => {
            if (!selectedId && questions[0]) setSelectedId(questions[0].id);
            setAddOpen((v) => !v);
          }}
          onPick={addQuestion}
        />
      </div>
    </div>
  );
}

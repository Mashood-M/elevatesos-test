"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import {
  defaultLogicRule,
  LOGIC_WHEN_LABELS,
  MAX_LOGIC_RULES,
} from "@/lib/forms/script-runtime";
import { splitFormSections } from "@/lib/forms/helpers";
import type {
  FormDefinition,
  FormLogicIf,
  FormLogicRule,
  FormLogicThen,
  FormLogicWhen,
  FormQuestion,
} from "@/types";
import { cn } from "@/lib/utils";

const PALETTE: { label: string; when: FormLogicWhen }[] = [
  { label: "When answer changes", when: "answer_change" },
  { label: "Before Next", when: "before_next" },
  { label: "Before Submit", when: "before_submit" },
];

function answerable(questions: FormQuestion[]) {
  return questions.filter((q) => q.type !== "section_header");
}

export function FormLogicBuilder({
  form,
  rules,
  onChange,
}: {
  form: FormDefinition;
  rules: FormLogicRule[];
  onChange: (rules: FormLogicRule[]) => void;
}) {
  const [dragRuleId, setDragRuleId] = useState<string | null>(null);
  const sections = splitFormSections(form);
  const fields = answerable(form.questions);

  function addRule(when: FormLogicWhen = "before_next") {
    if (rules.length >= MAX_LOGIC_RULES) return;
    const rule = defaultLogicRule();
    rule.when = when;
    onChange([...rules, rule]);
  }

  function patchRule(id: string, patch: Partial<FormLogicRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function patchIf(id: string, next: FormLogicIf) {
    patchRule(id, { if: next });
  }

  function patchThen(id: string, next: FormLogicThen) {
    patchRule(id, { then: next });
  }

  function removeRule(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }

  function onDropReorder(targetId: string) {
    if (!dragRuleId || dragRuleId === targetId) {
      setDragRuleId(null);
      return;
    }
    const from = rules.findIndex((r) => r.id === dragRuleId);
    const to = rules.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) {
      setDragRuleId(null);
      return;
    }
    const next = [...rules];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setDragRuleId(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[12px] font-medium text-text">Logic blocks</p>
        <p className="mt-0.5 text-[11px] text-text-mute">
          Drag a When chip onto the stack (or click). Max {MAX_LOGIC_RULES}{" "}
          rules — Notion-style When / If / Then only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PALETTE.map((p) => (
          <button
            key={p.when}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-elevates-logic-when", p.when);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => addRule(p.when)}
            className="rounded-full bg-bg px-3 py-1.5 text-[11px] font-medium text-text-dim ring-1 ring-border hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            + {p.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "min-h-[80px] space-y-2 rounded-[12px] border border-dashed border-border bg-bg/50 p-3",
          !rules.length && "flex items-center justify-center",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const when = e.dataTransfer.getData(
            "application/x-elevates-logic-when",
          ) as FormLogicWhen;
          if (when && LOGIC_WHEN_LABELS[when]) addRule(when);
        }}
      >
        {!rules.length ? (
          <p className="text-center text-[12px] text-text-mute">
            Drop a When block here
          </p>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "rounded-[12px] bg-bg-panel p-3 shadow-[var(--shadow-sm)]",
                dragRuleId === rule.id && "opacity-60",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const when = e.dataTransfer.getData(
                  "application/x-elevates-logic-when",
                );
                if (when) return;
                onDropReorder(rule.id);
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div
                  className="cursor-grab text-text-mute"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragRuleId(rule.id);
                  }}
                >
                  <GripVertical size={16} />
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-text-dim hover:bg-bg hover:text-[var(--danger)]"
                  onClick={() => removeRule(rule.id)}
                  aria-label="Delete rule"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid gap-2">
                <div>
                  <FieldLabel>When</FieldLabel>
                  <Select
                    value={rule.when}
                    onChange={(e) =>
                      patchRule(rule.id, {
                        when: e.target.value as FormLogicWhen,
                      })
                    }
                  >
                    {(Object.keys(LOGIC_WHEN_LABELS) as FormLogicWhen[]).map(
                      (w) => (
                        <option key={w} value={w}>
                          {LOGIC_WHEN_LABELS[w]}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>If</FieldLabel>
                  <Select
                    value={rule.if.kind}
                    onChange={(e) => {
                      const kind = e.target.value as FormLogicIf["kind"];
                      if (kind === "always") {
                        patchIf(rule.id, { kind: "always" });
                      } else if (kind === "answer_not_empty") {
                        patchIf(rule.id, {
                          kind: "answer_not_empty",
                          questionId: fields[0]?.id ?? "",
                        });
                      } else {
                        patchIf(rule.id, {
                          kind: "answer_equals",
                          questionId: fields[0]?.id ?? "",
                          value: "",
                        });
                      }
                    }}
                  >
                    <option value="always">Always</option>
                    <option value="answer_equals">Answer equals…</option>
                    <option value="answer_not_empty">Answer not empty…</option>
                  </Select>
                </div>

                {rule.if.kind === "answer_equals" ||
                rule.if.kind === "answer_not_empty" ? (
                  <div>
                    <FieldLabel>Question</FieldLabel>
                    <Select
                      value={rule.if.questionId}
                      onChange={(e) => {
                        const qid = e.target.value;
                        if (rule.if.kind === "answer_equals") {
                          patchIf(rule.id, {
                            kind: "answer_equals",
                            questionId: qid,
                            value: rule.if.value,
                          });
                        } else if (rule.if.kind === "answer_not_empty") {
                          patchIf(rule.id, {
                            kind: "answer_not_empty",
                            questionId: qid,
                          });
                        }
                      }}
                    >
                      <option value="">Select question…</option>
                      {fields.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title || q.id}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {rule.if.kind === "answer_equals" ? (
                  <div>
                    <FieldLabel>Value</FieldLabel>
                    <Input
                      value={rule.if.value}
                      onChange={(e) => {
                        if (rule.if.kind !== "answer_equals") return;
                        patchIf(rule.id, {
                          kind: "answer_equals",
                          questionId: rule.if.questionId,
                          value: e.target.value,
                        });
                      }}
                      placeholder="Exact answer…"
                    />
                  </div>
                ) : null}

                <div>
                  <FieldLabel>Then</FieldLabel>
                  <Select
                    value={rule.then.kind}
                    onChange={(e) => {
                      const kind = e.target.value as FormLogicThen["kind"];
                      if (kind === "go_to_section") {
                        patchThen(rule.id, {
                          kind: "go_to_section",
                          sectionIndex: 0,
                        });
                      } else if (kind === "set_answer") {
                        patchThen(rule.id, {
                          kind: "set_answer",
                          questionId: fields[0]?.id ?? "",
                          value: "",
                        });
                      } else if (kind === "show_questions") {
                        patchThen(rule.id, {
                          kind: "show_questions",
                          questionIds: fields[1] ? [fields[1].id] : [],
                        });
                      } else if (kind === "hide_questions") {
                        patchThen(rule.id, {
                          kind: "hide_questions",
                          questionIds: fields[1] ? [fields[1].id] : [],
                        });
                      } else {
                        patchThen(rule.id, {
                          kind: "show_error",
                          message: "Please check this section.",
                          block: true,
                        });
                      }
                    }}
                  >
                    <option value="go_to_section">Go to section…</option>
                    <option value="show_error">Show error…</option>
                    <option value="set_answer">Set answer…</option>
                    <option value="show_questions">Show questions…</option>
                    <option value="hide_questions">Hide questions…</option>
                  </Select>
                </div>

                {rule.then.kind === "show_questions" ||
                rule.then.kind === "hide_questions" ? (
                  <div>
                    <FieldLabel>Questions</FieldLabel>
                    <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-[10px] bg-bg p-2">
                      {fields.map((q) => {
                        const checked = rule.then.kind === "show_questions" ||
                          rule.then.kind === "hide_questions"
                          ? rule.then.questionIds.includes(q.id)
                          : false;
                        return (
                          <label
                            key={q.id}
                            className="flex cursor-pointer items-center gap-2 text-[12px] text-text-dim"
                          >
                            <input
                              type="checkbox"
                              className="accent-[var(--accent)]"
                              checked={checked}
                              onChange={() => {
                                if (
                                  rule.then.kind !== "show_questions" &&
                                  rule.then.kind !== "hide_questions"
                                ) {
                                  return;
                                }
                                const ids = checked
                                  ? rule.then.questionIds.filter(
                                      (id) => id !== q.id,
                                    )
                                  : [...rule.then.questionIds, q.id];
                                patchThen(rule.id, {
                                  kind: rule.then.kind,
                                  questionIds: ids,
                                });
                              }}
                            />
                            {q.title || q.id}
                          </label>
                        );
                      })}
                    </div>
                    {rule.then.kind === "show_questions" ? (
                      <p className="mt-1 text-[10px] text-text-mute">
                        Selected questions stay hidden until this If matches.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {rule.then.kind === "go_to_section" ? (
                  <div>
                    <FieldLabel>Section</FieldLabel>
                    <Select
                      value={String(rule.then.sectionIndex)}
                      onChange={(e) =>
                        patchThen(rule.id, {
                          kind: "go_to_section",
                          sectionIndex: Number(e.target.value) || 0,
                        })
                      }
                    >
                      {sections.map((s, i) => (
                        <option key={s.id} value={i}>
                          {i + 1}. {s.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {rule.then.kind === "show_error" ? (
                  <>
                    <div>
                      <FieldLabel>Message</FieldLabel>
                      <Input
                        value={rule.then.message}
                        onChange={(e) => {
                          if (rule.then.kind !== "show_error") return;
                          patchThen(rule.id, {
                            kind: "show_error",
                            message: e.target.value,
                            block: rule.then.block,
                          });
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[12px] text-text-dim">
                      <input
                        type="checkbox"
                        checked={rule.then.block}
                        onChange={(e) => {
                          if (rule.then.kind !== "show_error") return;
                          patchThen(rule.id, {
                            kind: "show_error",
                            message: rule.then.message,
                            block: e.target.checked,
                          });
                        }}
                        className="accent-[var(--accent)]"
                      />
                      Block Next / Submit
                    </label>
                  </>
                ) : null}

                {rule.then.kind === "set_answer" ? (
                  <>
                    <div>
                      <FieldLabel>Question</FieldLabel>
                      <Select
                        value={rule.then.questionId}
                        onChange={(e) => {
                          if (rule.then.kind !== "set_answer") return;
                          patchThen(rule.id, {
                            kind: "set_answer",
                            questionId: e.target.value,
                            value: rule.then.value,
                          });
                        }}
                      >
                        <option value="">Select…</option>
                        {fields.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title || q.id}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Value</FieldLabel>
                      <Input
                        value={rule.then.value}
                        onChange={(e) => {
                          if (rule.then.kind !== "set_answer") return;
                          patchThen(rule.id, {
                            kind: "set_answer",
                            questionId: rule.then.questionId,
                            value: e.target.value,
                          });
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {rules.length < MAX_LOGIC_RULES ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 gap-1.5"
          onClick={() => addRule("before_next")}
        >
          <Plus size={14} />
          Add rule
        </Button>
      ) : (
        <p className="text-[11px] text-text-mute">Rule limit reached.</p>
      )}
    </div>
  );
}

import type {
  FormLogicIf,
  FormLogicRule,
  FormLogicThen,
  FormLogicWhen,
  FormQuestion,
} from "@/types";

export type ScriptAnswerValue = string | string[] | number | boolean;

export type FormLogicEventName =
  | "onAnswerChange"
  | "onBeforeNext"
  | "onBeforeSubmit";

const WHEN_TO_EVENT: Record<FormLogicWhen, FormLogicEventName> = {
  answer_change: "onAnswerChange",
  before_next: "onBeforeNext",
  before_submit: "onBeforeSubmit",
};

export type FormLogicHost = {
  getAnswers: () => Record<string, ScriptAnswerValue>;
  setAnswer: (questionId: string, value: ScriptAnswerValue) => void;
  getSectionIndex: () => number;
  setSectionIndex: (index: number) => void;
  sectionCount: () => number;
  questions: FormQuestion[];
  setError: (message: string) => void;
};

function answerAsString(v: ScriptAnswerValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function evalIf(
  cond: FormLogicIf,
  answers: Record<string, ScriptAnswerValue>,
): boolean {
  if (cond.kind === "always") return true;
  if (cond.kind === "answer_not_empty") {
    const v = answers[cond.questionId];
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
      return false;
    }
    return true;
  }
  if (cond.kind === "answer_equals") {
    return answerAsString(answers[cond.questionId]).trim() === cond.value.trim();
  }
  return false;
}

function applyThen(then: FormLogicThen, host: FormLogicHost): boolean {
  /** @returns whether to continue (false = blocked) */
  if (then.kind === "go_to_section") {
    const max = Math.max(0, host.sectionCount() - 1);
    const next = Math.min(max, Math.max(0, Math.floor(then.sectionIndex)));
    host.setSectionIndex(next);
    return true;
  }
  if (then.kind === "set_answer") {
    host.setAnswer(then.questionId, then.value);
    return true;
  }
  if (then.kind === "show_error") {
    host.setError(then.message || "Check your answers.");
    return !then.block;
  }
  // show_questions / hide_questions applied via computeHiddenQuestionIds
  return true;
}

/**
 * Questions targeted by any show_questions rule start hidden until a matching
 * answer_change rule reveals them. hide_questions adds to the hidden set.
 */
export function computeHiddenQuestionIds(
  rules: FormLogicRule[] | undefined,
  enabled: boolean | undefined,
  answers: Record<string, ScriptAnswerValue>,
): Set<string> {
  const hidden = new Set<string>();
  if (!enabled || !rules?.length) return hidden;

  for (const rule of rules) {
    if (rule.then.kind === "show_questions") {
      for (const id of rule.then.questionIds) hidden.add(id);
    }
  }

  for (const rule of rules) {
    if (rule.when !== "answer_change") continue;
    if (!evalIf(rule.if, answers)) continue;
    if (rule.then.kind === "hide_questions") {
      for (const id of rule.then.questionIds) hidden.add(id);
    }
    if (rule.then.kind === "show_questions") {
      for (const id of rule.then.questionIds) hidden.delete(id);
    }
  }

  return hidden;
}

/**
 * Run structured When/If/Then rules for a fill event.
 * Returns false if a blocking rule stopped the flow.
 */
export function runFormLogic(
  rules: FormLogicRule[] | undefined,
  enabled: boolean | undefined,
  host: FormLogicHost,
  eventName: FormLogicEventName,
  detail?: { questionId?: string },
): boolean {
  if (!enabled || !rules?.length) return true;

  const answers = host.getAnswers();
  let allow = true;

  for (const rule of rules) {
    if (WHEN_TO_EVENT[rule.when] !== eventName) continue;
    if (eventName === "onAnswerChange" && detail?.questionId) {
      // Optional: only fire answer_change when the watched question changes
      if (
        rule.if.kind === "answer_equals" ||
        rule.if.kind === "answer_not_empty"
      ) {
        if (rule.if.questionId && rule.if.questionId !== detail.questionId) {
          // Still allow rules that watch other fields — skip filter
        }
      }
    }
    if (!evalIf(rule.if, answers)) continue;
    const ok = applyThen(rule.then, host);
    if (!ok) allow = false;
  }

  return allow;
}

/** @deprecated use runFormLogic */
export function runFormScript(
  _source: string | undefined,
  _enabled: boolean | undefined,
  _host: FormLogicHost,
  _eventName: string,
  _detail?: { questionId?: string; sectionIndex?: number },
): boolean {
  return true;
}

export function defaultLogicRule(): FormLogicRule {
  return {
    id: `logic-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    when: "before_next",
    if: { kind: "always" },
    then: { kind: "show_error", message: "Please review this section.", block: false },
  };
}

export const LOGIC_WHEN_LABELS: Record<FormLogicWhen, string> = {
  answer_change: "When answer changes",
  before_next: "Before Next",
  before_submit: "Before Submit",
};

export const LOGIC_IF_KINDS = [
  "always",
  "answer_equals",
  "answer_not_empty",
] as const;

export const LOGIC_THEN_KINDS = [
  "go_to_section",
  "show_error",
  "set_answer",
  "show_questions",
  "hide_questions",
] as const;

export const MAX_LOGIC_RULES = 8;

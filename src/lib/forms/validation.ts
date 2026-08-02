import type { FormQuestion, FormValidationRule } from "@/types";

export type AnswerValue = string | string[] | number | boolean;

function asString(v: AnswerValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function parseFileMeta(v: AnswerValue | undefined): {
  name: string;
  size: number;
} | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const parsed = JSON.parse(v) as { name?: string; size?: number };
    if (parsed?.name) {
      return { name: parsed.name, size: Number(parsed.size) || 0 };
    }
  } catch {
    /* plain filename legacy */
  }
  return { name: v, size: 0 };
}

export function validateRule(
  rule: FormValidationRule,
  value: AnswerValue | undefined,
): string | null {
  const raw = asString(value).trim();
  if (!raw && rule.kind !== "min" && rule.kind !== "max") return null;

  if (rule.kind === "email") {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    return ok ? null : rule.message || "Enter a valid email.";
  }
  if (rule.kind === "url") {
    try {
      // eslint-disable-next-line no-new
      new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return null;
    } catch {
      return rule.message || "Enter a valid URL.";
    }
  }
  if (rule.kind === "phone") {
    const digits = raw.replace(/\D/g, "");
    const ok = digits.length >= 10 && digits.length <= 15;
    return ok ? null : rule.message || "Enter a valid phone number.";
  }
  if (rule.kind === "min_length") {
    const n = Number(rule.value) || 0;
    return raw.length >= n
      ? null
      : rule.message || `Must be at least ${n} characters.`;
  }
  if (rule.kind === "max_length") {
    const n = Number(rule.value) || 0;
    return raw.length <= n
      ? null
      : rule.message || `Must be at most ${n} characters.`;
  }
  if (rule.kind === "min") {
    const num = typeof value === "number" ? value : Number(raw);
    const n = Number(rule.value) || 0;
    if (Number.isNaN(num)) return rule.message || "Enter a number.";
    return num >= n ? null : rule.message || `Must be at least ${n}.`;
  }
  if (rule.kind === "max") {
    const num = typeof value === "number" ? value : Number(raw);
    const n = Number(rule.value) || 0;
    if (Number.isNaN(num)) return rule.message || "Enter a number.";
    return num <= n ? null : rule.message || `Must be at most ${n}.`;
  }
  return null;
}

export function validateQuestion(
  question: FormQuestion,
  value: AnswerValue | undefined,
): string | null {
  if (question.type === "section_header") return null;

  const empty =
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && !value.length);

  if (question.required && empty) {
    return `Missing: ${question.title}`;
  }

  if (empty) return null;

  if (question.type === "file_upload") {
    const meta = parseFileMeta(value);
    const maxMb = question.fileMaxMb ?? 2;
    if (meta && meta.size > maxMb * 1024 * 1024) {
      return `File too large (max ${maxMb} MB).`;
    }
  }

  for (const rule of question.validation ?? []) {
    const err = validateRule(rule, value);
    if (err) return err;
  }
  return null;
}

export function validateQuestions(
  questions: FormQuestion[],
  answers: Record<string, AnswerValue>,
  hiddenIds?: Set<string>,
): string | null {
  for (const q of questions) {
    if (hiddenIds?.has(q.id)) continue;
    const err = validateQuestion(q, answers[q.id]);
    if (err) return err;
  }
  return null;
}

import type { FormDefinition, FormPurpose, FormQuestion } from "@/types";

export type FormTemplateId = string;

export type FormTemplate = {
  id: FormTemplateId | string;
  name: string;
  description: string;
  purpose: FormPurpose;
  /** Whether picker should offer an event attach control */
  suggestEvent: boolean;
  previewQuestions: string[];
  questions: FormQuestion[];
};

function cloneQuestions(questions: FormQuestion[]): FormQuestion[] {
  return questions.map((q) => ({
    ...q,
    options: q.options ? [...q.options] : undefined,
  }));
}

/** Fallback empty templates array — templates are stored in and loaded dynamically from Supabase */
export const FORM_TEMPLATES: FormTemplate[] = [];

export function getFormTemplate(
  id: FormTemplateId | string,
  customTemplates?: FormTemplate[],
): FormTemplate | undefined {
  const list = customTemplates && customTemplates.length > 0 ? customTemplates : FORM_TEMPLATES;
  return list.find((t) => t.id === id);
}

export function createFormFromTemplate(
  templateId: FormTemplateId | string,
  chapterId: string,
  opts?: { eventId?: string; title?: string; templates?: FormTemplate[] },
): FormDefinition {
  const template =
    getFormTemplate(templateId, opts?.templates) ?? {
      id: "blank",
      name: "Blank form",
      description: "Start from scratch with title, description, and custom questions.",
      purpose: "custom" as FormPurpose,
      suggestEvent: false,
      previewQuestions: [],
      questions: [],
    };
  const now = new Date().toISOString();
  const eventId =
    opts?.eventId && template.suggestEvent ? opts.eventId : undefined;
  return {
    id: `form-${Date.now()}`,
    purpose: template.purpose,
    title: opts?.title?.trim() || template.name,
    description: template.description,
    chapterId,
    eventId,
    status: "draft",
    questions: cloneQuestions(template.questions || []),
    createdAt: now,
    updatedAt: now,
  };
}

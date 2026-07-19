import type {
  ElevatesStore,
  FormDefinition,
  FormField,
  FormFieldType,
  FormPurpose,
  FormQuestion,
  FormQuestionType,
} from "@/types";

const FIELD_TO_QUESTION: Record<FormFieldType, FormQuestionType> = {
  text: "short_text",
  tel: "short_text",
  email: "short_text",
  number: "short_text",
  textarea: "paragraph",
  select: "dropdown",
  radio: "multiple_choice",
  checkbox: "checkboxes",
  file: "file_upload",
  resume: "file_upload",
};

const QUESTION_TO_FIELD: Partial<Record<FormQuestionType, FormFieldType>> = {
  short_text: "text",
  paragraph: "textarea",
  multiple_choice: "radio",
  checkboxes: "checkbox",
  dropdown: "select",
  file_upload: "file",
};

export function fieldToQuestion(field: FormField): FormQuestion {
  return {
    id: field.id,
    type: FIELD_TO_QUESTION[field.type] ?? "short_text",
    title: field.label,
    description: field.helpText,
    required: field.required,
    options: field.options,
  };
}

export function questionToField(q: FormQuestion): FormField {
  return {
    id: q.id,
    key: q.id,
    label: q.title,
    type: QUESTION_TO_FIELD[q.type] ?? "text",
    required: q.required,
    options: q.options,
    helpText: q.description,
  };
}

export function migrateForm(raw: FormDefinition & { fields?: FormField[] }): FormDefinition {
  const questions =
    raw.questions?.length
      ? raw.questions
      : (raw.fields ?? []).map(fieldToQuestion);
  const now = new Date().toISOString();
  return {
    id: raw.id,
    purpose: raw.purpose ?? "custom",
    title: raw.title || "Untitled form",
    description: raw.description,
    chapterId: raw.chapterId || "ch-ekc",
    eventId: raw.eventId,
    status: raw.status ?? "open",
    questions,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

export function getEventForm(
  store: ElevatesStore,
  eventId: string,
  purpose: FormPurpose,
): FormDefinition | undefined {
  const form = store.forms?.find(
    (f) => f.eventId === eventId && f.purpose === purpose,
  );
  return form ? migrateForm(form) : undefined;
}

export function registrationFields(
  store: ElevatesStore,
  eventId: string,
): FormField[] {
  const form = getEventForm(store, eventId, "registration");
  if (form?.questions?.length) return form.questions.map(questionToField);
  return store.eventForms.find((f) => f.eventId === eventId)?.fields ?? [];
}

export function mintQrCode(eventId: string, userId: string) {
  const short = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QR-${eventId.toUpperCase()}-${userId.toUpperCase()}-${short}`;
}

const DEFAULT_REG_QUESTIONS: FormQuestion[] = [
  { id: "f-name", type: "short_text", title: "Full name", required: true },
  { id: "f-phone", type: "short_text", title: "Phone", required: true },
  { id: "f-dept", type: "short_text", title: "Department", required: true },
  { id: "f-year", type: "short_text", title: "Year", required: true },
];

const DEFAULT_FEEDBACK_QUESTIONS: FormQuestion[] = [
  {
    id: "fb-rating",
    type: "rating",
    title: "Overall rating",
    required: true,
    ratingMax: 5,
  },
  {
    id: "fb-scale",
    type: "linear_scale",
    title: "How useful was this event?",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "Not useful",
    scaleMaxLabel: "Very useful",
  },
  {
    id: "fb-learned",
    type: "paragraph",
    title: "What did you learn?",
    required: true,
  },
  {
    id: "fb-recommend",
    type: "multiple_choice",
    title: "Would you recommend this event?",
    required: true,
    options: ["Yes", "No", "Maybe"],
  },
];

export function defaultFormsForEvent(
  eventId: string,
  chapterId: string,
  title: string,
): FormDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      id: `form-reg-${eventId}`,
      purpose: "registration",
      title: `${title} registration`,
      chapterId,
      eventId,
      status: "open",
      questions: DEFAULT_REG_QUESTIONS,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `form-fb-${eventId}`,
      purpose: "feedback",
      title: `${title} feedback`,
      chapterId,
      eventId,
      status: "open",
      questions: DEFAULT_FEEDBACK_QUESTIONS,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function emptyForm(
  chapterId: string,
  purpose: FormPurpose = "custom",
): FormDefinition {
  const now = new Date().toISOString();
  return {
    id: `form-${Date.now()}`,
    purpose,
    title: "Untitled form",
    description: "",
    chapterId,
    status: "draft",
    questions: [
      {
        id: `q-${Date.now()}`,
        type: "short_text",
        title: "Untitled question",
        required: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeStore(store: ElevatesStore): ElevatesStore {
  let forms = (store.forms ?? []).map((f) => migrateForm(f as FormDefinition));
  const formResponses = store.formResponses ?? [];
  if (!forms.length && store.eventForms?.length) {
    const now = new Date().toISOString();
    forms = store.eventForms.map((ef) =>
      migrateForm({
        id: `form-reg-${ef.eventId}`,
        purpose: "registration",
        title: "Registration",
        chapterId: "ch-ekc",
        eventId: ef.eventId,
        status: "open",
        questions: ef.fields.map(fieldToQuestion),
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  return { ...store, forms, formResponses };
}

export function answerableQuestions(form: FormDefinition): FormQuestion[] {
  return form.questions.filter((q) => q.type !== "section_header");
}

export const QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  short_text: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  linear_scale: "Linear scale",
  rating: "Rating",
  date: "Date",
  time: "Time",
  file_upload: "File upload",
  section_header: "Section",
};

import { ensureOrganizationBrandKit } from "@/lib/brand/kit";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  humanizeCategoryKey,
} from "@/lib/resources/categories";
import type {
  ClassCohort,
  ElevatesStore,
  FormDefinition,
  FormField,
  FormFieldType,
  FormPurpose,
  FormQuestion,
  FormQuestionType,
  Profile,
  ResourceCategory,
} from "@/types";

function mergeResourceCategoriesLocal(
  stored: ResourceCategory[] | undefined,
  resourceKeys: string[],
): ResourceCategory[] {
  const map = new Map<string, ResourceCategory>();
  for (const c of DEFAULT_RESOURCE_CATEGORIES) map.set(c.key, c);
  for (const c of stored ?? []) {
    if (c?.key) {
      map.set(c.key, {
        key: c.key,
        label: c.label || humanizeCategoryKey(c.key),
      });
    }
  }
  for (const key of resourceKeys) {
    if (key && !map.has(key)) {
      map.set(key, { key, label: humanizeCategoryKey(key) });
    }
  }
  return Array.from(map.values());
}

export type RepresentativeOption = {
  id: string;
  label: string;
};

/** Normalize cohort reps (supports legacy boyRepId/girlRepId). */
export function cohortRepIds(c: ClassCohort & {
  boyRepId?: string;
  girlRepId?: string;
}): string[] {
  if (Array.isArray(c.repIds) && c.repIds.length) {
    return [...new Set(c.repIds.map((id) => id.trim()).filter(Boolean))].slice(
      0,
      2,
    );
  }
  const legacy = [c.boyRepId, c.girlRepId]
    .map((id) => (id ?? "").trim())
    .filter(Boolean);
  return [...new Set(legacy)].slice(0, 2);
}

export function normalizeClassYear(year?: string): string {
  if (!year) return "";
  const t = year.trim().toLowerCase();
  if (t.startsWith("1")) return "1st";
  if (t.startsWith("2")) return "2nd";
  if (t.startsWith("3")) return "3rd";
  if (t.startsWith("4")) return "4th";
  return year.trim();
}

export function cohortLabel(c: ClassCohort): string {
  return `${c.department} · ${c.year} · ${c.section}`;
}

export function findClassCohort(
  store: ElevatesStore,
  chapterId: string,
  department?: string,
  year?: string,
  section?: string,
): ClassCohort | undefined {
  if (!department || !year || !section) return undefined;
  const y = normalizeClassYear(year);
  const d = department.trim().toUpperCase();
  const s = section.trim().toUpperCase();
  return (store.classCohorts ?? []).find(
    (c) =>
      c.chapterId === chapterId &&
      c.department.trim().toUpperCase() === d &&
      normalizeClassYear(c.year) === y &&
      c.section.trim().toUpperCase() === s,
  );
}

export function studentHasClassSet(profile?: Profile | null): boolean {
  return Boolean(
    profile?.chapterId &&
      profile.department?.trim() &&
      profile.year?.trim() &&
      profile.section?.trim(),
  );
}

/** Class CRs for the student’s class order (1–2 options). */
export function listStudentRepresentatives(
  store: ElevatesStore,
  profile?: Profile | null,
): RepresentativeOption[] {
  if (!profile?.chapterId || !studentHasClassSet(profile)) return [];
  const cohort = findClassCohort(
    store,
    profile.chapterId,
    profile.department,
    profile.year,
    profile.section,
  );
  if (!cohort) return [];
  return cohortRepIds(cohort)
    .map((id, index) => {
      const p = store.profiles.find((x) => x.id === id);
      if (!p) return null;
      const n = cohortRepIds(cohort).length;
      const prefix = n > 1 ? `Rep ${index + 1} — ` : "";
      return { id: p.id, label: `${prefix}${p.fullName}` };
    })
    .filter((x): x is RepresentativeOption => Boolean(x));
}

/** @deprecated prefer listStudentRepresentatives — chapter-wide list */
export function listChapterRepresentatives(
  store: ElevatesStore,
  chapterId: string,
): RepresentativeOption[] {
  const cohorts = (store.classCohorts ?? []).filter(
    (c) => c.chapterId === chapterId,
  );
  const ids = [...new Set(cohorts.flatMap((c) => cohortRepIds(c)))];
  return ids
    .map((id) => {
      const profile = store.profiles.find((p) => p.id === id);
      if (!profile) return null;
      return {
        id,
        label: `${profile.fullName}${profile.department ? ` (${profile.department})` : ""}`,
      };
    })
    .filter((x): x is RepresentativeOption => Boolean(x))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const REPRESENTATIVE_QUESTION: FormQuestion = {
  id: "f-representative",
  type: "representative",
  title: "Class representative",
  description:
    "Choose your class representative (assigned for your class on your profile).",
  required: true,
};

/** Ensure unique question ids (keeps first occurrence). */
export function dedupeFormQuestions(questions: FormQuestion[]): FormQuestion[] {
  const seen = new Set<string>();
  const out: FormQuestion[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

export function ensureRepresentativeQuestion(
  form: FormDefinition,
): FormDefinition {
  if (form.purpose !== "registration") return form;
  let questions = dedupeFormQuestions(form.questions);
  if (questions.some((q) => q.type === "representative")) {
    return questions === form.questions ? form : { ...form, questions };
  }

  // If f-representative id is still on a non-rep question (type was changed),
  // rename that id so we can insert the CR field without a React key clash.
  const idTaken = questions.some((q) => q.id === REPRESENTATIVE_QUESTION.id);
  if (idTaken) {
    questions = questions.map((q) =>
      q.id === REPRESENTATIVE_QUESTION.id
        ? {
            ...q,
            id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          }
        : q,
    );
  }

  const basicsIdx = questions.findIndex(
    (q) => q.type === "section_header" && /you|basic/i.test(q.title),
  );
  const insertAt = basicsIdx >= 0 ? basicsIdx + 1 : 0;
  const next = [...questions];
  next.splice(insertAt, 0, { ...REPRESENTATIVE_QUESTION });
  return { ...form, questions: next };
}

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
  const questions = dedupeFormQuestions(
    raw.questions?.length
      ? raw.questions
      : (raw.fields ?? []).map(fieldToQuestion),
  );
  const now = new Date().toISOString();
  return {
    id: raw.id,
    purpose: raw.purpose ?? "custom",
    title: raw.title || "Untitled form",
    description: raw.description,
    chapterId: raw.chapterId || "ch-ekc",
    eventId: raw.eventId,
    status: raw.status ?? "draft",
    questions,
    logicEnabled: raw.logicEnabled,
    logicRules: Array.isArray(raw.logicRules)
      ? raw.logicRules.slice(0, 8)
      : undefined,
    scriptEnabled: raw.scriptEnabled,
    script: raw.script,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

export type FormSectionPage = {
  id: string;
  title: string;
  description?: string;
  /** Answerable questions on this page (no section_header). */
  questions: FormQuestion[];
  header?: FormQuestion;
};

/** Split questions into G Forms–style pages at each section_header. */
export function splitFormSections(form: FormDefinition): FormSectionPage[] {
  const pages: FormSectionPage[] = [];
  let current: FormSectionPage = {
    id: "section-0",
    title: form.title,
    description: form.description,
    questions: [],
  };

  for (const q of form.questions) {
    if (q.type === "section_header") {
      if (current.questions.length > 0) {
        pages.push(current);
      }
      current = {
        id: q.id,
        title: q.title || "Untitled section",
        description: q.description,
        questions: [],
        header: q,
      };
      continue;
    }
    current.questions.push(q);
  }
  pages.push(current);

  if (
    pages.length > 1 &&
    pages[0].questions.length === 0 &&
    !pages[0].header
  ) {
    return pages.slice(1);
  }
  return pages.length
    ? pages
    : [
        {
          id: "section-0",
          title: form.title,
          description: form.description,
          questions: [],
        },
      ];
}

export function getEventForm(
  store: ElevatesStore,
  eventId: string,
  purpose: FormPurpose,
): FormDefinition | undefined {
  const form = store.forms?.find(
    (f) => f.eventId === eventId && f.purpose === purpose,
  );
  return form ? ensureRepresentativeQuestion(migrateForm(form)) : undefined;
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
  { ...REPRESENTATIVE_QUESTION },
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
  const organization = ensureOrganizationBrandKit(store.organization);
  let forms = (store.forms ?? []).map((f) =>
    ensureRepresentativeQuestion(migrateForm(f as FormDefinition)),
  );
  const formResponses = store.formResponses ?? [];
  if (!forms.length && store.eventForms?.length) {
    const now = new Date().toISOString();
    forms = store.eventForms.map((ef) =>
      ensureRepresentativeQuestion(
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
      ),
    );
  }
  const classCohorts = (store.classCohorts ?? []).map((c) => {
    const { boyRepId: _b, girlRepId: _g, ...rest } = c as ClassCohort & {
      boyRepId?: string;
      girlRepId?: string;
    };
    return {
      ...rest,
      repIds: cohortRepIds(c),
    };
  });

  const profiles = (store.profiles ?? []).map((p) => ({
    ...p,
    engagementTier: p.engagementTier ?? ("everyone" as const),
    journeyStage: p.journeyStage ?? ("awareness" as const),
  }));
  const clusters = (store.clusters ?? []).map((c) => ({
    ...c,
    accessMode: c.accessMode ?? ("invite" as const),
    responsibilities: c.responsibilities ?? [],
  }));

  const resources = store.resources ?? [];
  const resourceCategories = mergeResourceCategoriesLocal(
    store.resourceCategories,
    resources.map((r) => r.category),
  );

  return {
    ...store,
    organization,
    profiles,
    departments: store.departments ?? [],
    classCohorts,
    clusters,
    clusterInvites: store.clusterInvites ?? [],
    leadershipApplications: store.leadershipApplications ?? [],
    chapterStandardChecks: store.chapterStandardChecks ?? [],
    resourceCategories,
    resources,
    // Old localStorage saves may omit guidelines.
    guidelines: Array.isArray(store.guidelines) ? store.guidelines : [],
    forms,
    formResponses,
    outboundMessages: store.outboundMessages ?? [],
  };
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
  representative: "Class representative",
  section_header: "Section",
};

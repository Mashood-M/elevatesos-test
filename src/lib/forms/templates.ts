import { REPRESENTATIVE_QUESTION } from "@/lib/forms/helpers";
import type { FormDefinition, FormPurpose, FormQuestion } from "@/types";

export type FormTemplateId =
  | "event_registration"
  | "event_feedback"
  | "workshop_signup"
  | "chapter_survey"
  | "volunteer_interest"
  | "blank";

export type FormTemplate = {
  id: FormTemplateId;
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

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "event_registration",
    name: "Event registration",
    description:
      "Campus event signup with class representative routing — Elevates’ default registration pack.",
    purpose: "registration",
    suggestEvent: true,
    previewQuestions: [
      "Class representative",
      "Full name",
      "Phone",
      "Department",
      "Year",
    ],
    questions: [
      { ...REPRESENTATIVE_QUESTION },
      { id: "f-name", type: "short_text", title: "Full name", required: true },
      { id: "f-phone", type: "short_text", title: "Phone", required: true },
      {
        id: "f-dept",
        type: "short_text",
        title: "Department",
        required: true,
      },
      { id: "f-year", type: "short_text", title: "Year", required: true },
    ],
  },
  {
    id: "event_feedback",
    name: "Event feedback",
    description:
      "Post-event ratings and learnings for chapter retrospectives.",
    purpose: "feedback",
    suggestEvent: true,
    previewQuestions: [
      "Overall rating",
      "How useful was this event?",
      "What did you learn?",
      "Would you recommend?",
    ],
    questions: [
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
    ],
  },
  {
    id: "workshop_signup",
    name: "Workshop signup",
    description:
      "Hands-on workshop registration with gear and food preferences.",
    purpose: "registration",
    suggestEvent: true,
    previewQuestions: [
      "Class representative",
      "Full name",
      "Bringing laptop?",
      "Food preference",
    ],
    questions: [
      { ...REPRESENTATIVE_QUESTION },
      { id: "ws-name", type: "short_text", title: "Full name", required: true },
      { id: "ws-phone", type: "short_text", title: "Phone", required: true },
      {
        id: "ws-dept",
        type: "dropdown",
        title: "Department",
        required: true,
        options: ["CSE", "ECE", "EEE", "ME", "CE", "Other"],
      },
      {
        id: "ws-year",
        type: "dropdown",
        title: "Year",
        required: true,
        options: ["1st", "2nd", "3rd", "4th"],
      },
      {
        id: "ws-laptop",
        type: "multiple_choice",
        title: "Bringing a laptop?",
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "ws-food",
        type: "multiple_choice",
        title: "Food preference",
        required: false,
        options: ["Veg", "Non-veg", "Jain", "None"],
      },
    ],
  },
  {
    id: "chapter_survey",
    name: "Chapter survey",
    description: "Quick pulse survey for campus leads and coordinators.",
    purpose: "survey",
    suggestEvent: false,
    previewQuestions: [
      "How engaged do you feel?",
      "What should we run next?",
      "Anything else?",
    ],
    questions: [
      {
        id: "sv-engaged",
        type: "linear_scale",
        title: "How engaged do you feel with the chapter?",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Not at all",
        scaleMaxLabel: "Fully",
      },
      {
        id: "sv-next",
        type: "multiple_choice",
        title: "What should we run next?",
        required: true,
        options: [
          "Workshop",
          "Hackathon",
          "Talk / AMA",
          "Social",
          "Something else",
        ],
      },
      {
        id: "sv-else",
        type: "paragraph",
        title: "Anything else we should know?",
        required: false,
      },
    ],
  },
  {
    id: "volunteer_interest",
    name: "Volunteer interest",
    description: "Collect skills and availability for ops and event crews.",
    purpose: "custom",
    suggestEvent: false,
    previewQuestions: ["Full name", "Skills", "Availability", "Why join?"],
    questions: [
      { id: "vol-name", type: "short_text", title: "Full name", required: true },
      {
        id: "vol-skills",
        type: "checkboxes",
        title: "Skills you can offer",
        required: true,
        options: [
          "Tech / AV",
          "Design",
          "Content",
          "Logistics",
          "Hospitality",
          "Photography",
        ],
      },
      {
        id: "vol-avail",
        type: "multiple_choice",
        title: "Typical availability",
        required: true,
        options: ["Weekdays", "Weekends", "Either", "Event days only"],
      },
      {
        id: "vol-why",
        type: "paragraph",
        title: "Why do you want to volunteer?",
        required: false,
      },
    ],
  },
  {
    id: "blank",
    name: "Blank form",
    description: "Start from scratch with one untitled question.",
    purpose: "custom",
    suggestEvent: false,
    previewQuestions: ["Untitled question"],
    questions: [
      {
        id: "q-blank",
        type: "short_text",
        title: "Untitled question",
        required: false,
      },
    ],
  },
];

export function getFormTemplate(
  id: FormTemplateId | string,
): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}

export function createFormFromTemplate(
  templateId: FormTemplateId | string,
  chapterId: string,
  opts?: { eventId?: string; title?: string },
): FormDefinition {
  const template = getFormTemplate(templateId) ?? getFormTemplate("blank")!;
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
    questions: cloneQuestions(template.questions),
    createdAt: now,
    updatedAt: now,
  };
}

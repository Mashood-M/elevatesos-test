"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import {
  FormQuestionInput,
  type AnswerValue,
} from "@/components/domain/form-question-input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { answerableQuestions } from "@/lib/forms/helpers";
import type { FormDefinition } from "@/types";

export function FormFill({
  form,
  preview,
}: {
  form: FormDefinition;
  preview?: boolean;
}) {
  const { submitFormResponse, registerForEvent } = useStore();
  const { session, profile } = useCurrentUser();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const answerable = useMemo(() => answerableQuestions(form), [form]);

  function setAnswer(id: string, v: AnswerValue) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  function submit() {
    setError("");
    if (preview) {
      setDone(true);
      return;
    }
    if (form.status !== "open") {
      setError("This form is not accepting responses.");
      return;
    }
    for (const q of answerable) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
        setError(`Missing: ${q.title}`);
        return;
      }
    }

    if (form.purpose === "registration" && form.eventId) {
      registerForEvent({
        id: `reg-${Date.now()}`,
        eventId: form.eventId,
        userId: session.userId,
        status: "pending",
        answers: {
          name: profile?.fullName ?? String(answers.f1 ?? ""),
          ...answers,
        },
        qrCode: "",
        createdAt: new Date().toISOString(),
      });
    }

    const res = submitFormResponse({
      formId: form.id,
      userId: session.userId,
      eventId: form.eventId,
      answers,
    });
    if (!res && form.purpose !== "registration") {
      setError("Could not submit — already submitted or form closed.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <TerminalPanel title="submitted" accent="green">
        <p className="font-semibold">
          {preview ? "Preview complete (not saved)." : "Response recorded."}
        </p>
        {preview ? (
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => {
              setDone(false);
              setAnswers({});
            }}
          >
            Fill again
          </Button>
        ) : null}
      </TerminalPanel>
    );
  }

  return (
    <TerminalPanel
      title={preview ? "preview.fill" : "fill.form"}
      meta={form.status}
      accent="orange"
    >
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">{form.title}</h2>
        {form.description ? (
          <p className="mt-1 text-sm text-text-dim">{form.description}</p>
        ) : null}
        {preview ? (
          <p className="mt-2 text-[11px] text-[var(--accent)]">
            Preview mode — submissions are not saved.
          </p>
        ) : null}
      </div>

      <div className="space-y-5">
        {form.questions.map((q) => (
          <FormQuestionInput
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>
      ) : null}

      <Button variant="primary" className="mt-6" onClick={submit}>
        {preview ? "Test submit" : "Submit"}
      </Button>
    </TerminalPanel>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import {
  FormQuestionInput,
  type AnswerValue,
} from "@/components/domain/form-question-input";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  answerableQuestions,
  ensureRepresentativeQuestion,
  listStudentRepresentatives,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import type { FormDefinition } from "@/types";

export function FormFill({
  form,
  preview,
}: {
  form: FormDefinition;
  preview?: boolean;
}) {
  const { store, submitFormResponse, registerForEvent } = useStore();
  const { session, profile } = useCurrentUser();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const resolvedForm = useMemo(
    () => ensureRepresentativeQuestion(form),
    [form],
  );
  const isRegistration = resolvedForm.purpose === "registration";
  const classReady = studentHasClassSet(profile);
  const reps = useMemo(
    () => listStudentRepresentatives(store, profile),
    [store, profile],
  );
  const answerable = useMemo(
    () => answerableQuestions(resolvedForm),
    [resolvedForm],
  );

  function setAnswer(id: string, v: AnswerValue) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  function submit() {
    setError("");
    if (preview) {
      setDone(true);
      return;
    }
    if (resolvedForm.status !== "open") {
      setError("This form is not accepting responses.");
      return;
    }

    if (isRegistration) {
      if (!classReady) {
        setError("Set your class on your profile before registering.");
        return;
      }
      if (reps.length < 2) {
        setError(
          "No boy/girl representatives configured for your class. Ask your chapter exec.",
        );
        return;
      }
    }

    for (const q of answerable) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
        setError(`Missing: ${q.title}`);
        return;
      }
    }

    const repQuestion = resolvedForm.questions.find(
      (q) => q.type === "representative",
    );
    const representativeId =
      repQuestion && typeof answers[repQuestion.id] === "string"
        ? String(answers[repQuestion.id])
        : undefined;

    if (isRegistration && repQuestion) {
      if (
        !representativeId ||
        !reps.some((r) => r.id === representativeId)
      ) {
        setError("Select your boy or girl class representative.");
        return;
      }
    }

    if (isRegistration && resolvedForm.eventId) {
      registerForEvent({
        id: `reg-${Date.now()}`,
        eventId: resolvedForm.eventId,
        userId: session.userId,
        status: "pending",
        representativeId,
        answers: {
          name:
            profile?.fullName ??
            String(answers.f1 ?? answers["f-name"] ?? ""),
          ...answers,
        },
        qrCode: "",
        createdAt: new Date().toISOString(),
      });
    }

    const res = submitFormResponse({
      formId: resolvedForm.id,
      userId: session.userId,
      eventId: resolvedForm.eventId,
      answers,
    });
    if (!res && !isRegistration) {
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

  const blockRegistration =
    isRegistration && !preview && (!classReady || reps.length < 2);

  return (
    <TerminalPanel
      title={preview ? "preview.fill" : "fill.form"}
      meta={resolvedForm.status}
      accent="orange"
    >
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">{resolvedForm.title}</h2>
        {resolvedForm.description ? (
          <p className="mt-1 text-sm text-text-dim">{resolvedForm.description}</p>
        ) : null}
        {isRegistration ? (
          <p className="mt-2 text-[12px] text-text-dim">
            Your class order assigns two representatives (boy and girl). Pick
            one of those two to register.
          </p>
        ) : null}
        {preview ? (
          <p className="mt-2 text-[11px] text-[var(--accent)]">
            Preview mode — submissions are not saved.
          </p>
        ) : null}
      </div>

      {blockRegistration ? (
        <div className="mb-4 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
          {!classReady ? (
            <>
              <p className="text-sm font-semibold">Set your class first</p>
              <p className="mt-1 text-[13px] text-text-dim">
                Open your profile and choose department, year, and section. Your
                boy and girl class representatives will be assigned from that
                class.
              </p>
              {profile ? (
                <Link href={`/profile/${profile.id}`} className="mt-3 inline-block">
                  <Button variant="orange">Go to profile</Button>
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">
                No representatives for your class
              </p>
              <p className="mt-1 text-[13px] text-text-dim">
                Ask your chapter exec to configure boy and girl reps for{" "}
                {[profile?.department, profile?.year, profile?.section]
                  .filter(Boolean)
                  .join(" · ")}
                .
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-5">
        {resolvedForm.questions.map((q) => {
          if (q.type === "representative" && blockRegistration) {
            return (
              <div key={q.id} className="opacity-50">
                <FormQuestionInput
                  question={q}
                  value={undefined}
                  onChange={() => {}}
                  disabled
                  representativeOptions={[]}
                />
              </div>
            );
          }
          return (
            <FormQuestionInput
              key={q.id}
              question={
                q.type === "representative"
                  ? {
                      ...q,
                      description:
                        "Choose your boy or girl class representative.",
                    }
                  : q
              }
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
              disabled={q.type === "representative" && blockRegistration}
              representativeOptions={
                q.type === "representative" ? reps : undefined
              }
            />
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>
      ) : null}

      <Button
        variant="primary"
        className="mt-6"
        onClick={submit}
        disabled={Boolean(blockRegistration)}
      >
        {preview
          ? "Test submit"
          : isRegistration
            ? "Register"
            : "Submit"}
      </Button>
    </TerminalPanel>
  );
}

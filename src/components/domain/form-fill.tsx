"use client";

import { useEffect, useMemo, useState } from "react";
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
  migrateForm,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import type { FormDefinition } from "@/types";

function pickAnswerString(
  answers: Record<string, AnswerValue>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const v = answers[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(answers)) {
    if (typeof v === "string" && v.includes("@")) return v.trim();
  }
  return "";
}

export function FormFill({
  form,
  preview,
  publicMode,
}: {
  form: FormDefinition;
  preview?: boolean;
  /** Public share link — allows guest registrants without a logged-in class */
  publicMode?: boolean;
}) {
  const { store, submitFormResponse, registerForEvent, createUser } = useStore();
  const { session, profile } = useCurrentUser();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const classReady = studentHasClassSet(profile);
  const useClassReps = !publicMode || classReady;

  const resolvedForm = useMemo(() => {
    const base = migrateForm(form);
    if (useClassReps) return ensureRepresentativeQuestion(base);
    return {
      ...base,
      questions: base.questions.filter((q) => q.type !== "representative"),
    };
  }, [form, useClassReps]);

  const isRegistration = resolvedForm.purpose === "registration";
  const reps = useMemo(
    () => (useClassReps ? listStudentRepresentatives(store, profile) : []),
    [store, profile, useClassReps],
  );
  const answerable = useMemo(
    () => answerableQuestions(resolvedForm),
    [resolvedForm],
  );

  useEffect(() => {
    if (reps.length !== 1) return;
    const repQ = resolvedForm.questions.find((q) => q.type === "representative");
    if (!repQ) return;
    setAnswers((a) =>
      a[repQ.id] === reps[0].id ? a : { ...a, [repQ.id]: reps[0].id },
    );
  }, [reps, resolvedForm.questions]);

  function setAnswer(id: string, v: AnswerValue) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  function resolveSubmitUserId(): string | null {
    if (!publicMode || (profile && session.userId)) {
      return session.userId;
    }
    const fullName =
      pickAnswerString(answers, "f-name", "f1", "name") || "Guest Registrant";
    let email = pickAnswerString(answers, "f-email", "email", "f2");
    if (!email) {
      email = `guest+${Date.now()}@elevates.live`;
    }
    const existing = store.profiles.find(
      (p) => p.email.toLowerCase() === email.toLowerCase(),
    );
    if (existing) return existing.id;
    if (!resolvedForm.chapterId) return null;
    const created = createUser({
      fullName,
      email,
      chapterId: resolvedForm.chapterId,
      roleKey: "student",
    });
    return created?.id ?? null;
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

    if (isRegistration && !publicMode) {
      if (!classReady) {
        setError("Set your class on your profile before registering.");
        return;
      }
      if (reps.length < 1) {
        setError(
          "No representatives configured for your class. Ask your chapter exec.",
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

    if (isRegistration && repQuestion && useClassReps) {
      if (
        !representativeId ||
        !reps.some((r) => r.id === representativeId)
      ) {
        setError("Select your class representative.");
        return;
      }
    }

    const userId = resolveSubmitUserId();
    if (!userId) {
      setError("Could not create guest registrant. Add a name and email.");
      return;
    }

    if (isRegistration && resolvedForm.eventId) {
      registerForEvent({
        id: `reg-${Date.now()}`,
        eventId: resolvedForm.eventId,
        userId,
        status: "pending",
        representativeId,
        answers: {
          name:
            profile?.fullName ??
            (pickAnswerString(answers, "f-name", "f1", "name") || "Guest"),
          ...answers,
        },
        qrCode: "",
        createdAt: new Date().toISOString(),
      });
    }

    const res = submitFormResponse({
      formId: resolvedForm.id,
      userId,
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
    isRegistration &&
    !preview &&
    !publicMode &&
    (!classReady || reps.length < 1);

  return (
    <TerminalPanel
      title={preview ? "preview.fill" : publicMode ? "public.fill" : "fill.form"}
      meta={resolvedForm.status}
      accent="orange"
    >
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">{resolvedForm.title}</h2>
        {resolvedForm.description ? (
          <p className="mt-1 text-sm text-text-dim">{resolvedForm.description}</p>
        ) : null}
        {isRegistration && useClassReps ? (
          <p className="mt-2 text-[12px] text-text-dim">
            Your class has one or two assigned representatives. Pick one to
            register.
          </p>
        ) : null}
        {publicMode && isRegistration && !classReady ? (
          <p className="mt-2 text-[12px] text-text-dim">
            Public registration — enter your details below. Class representative
            selection applies when you register while signed in with a class set.
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
                Open your profile and choose your class. Your class
                representatives will be assigned from that division.
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
                Ask your chapter exec to assign at least one representative for{" "}
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
                      description: "Choose your class representative.",
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

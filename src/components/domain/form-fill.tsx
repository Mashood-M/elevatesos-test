"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import {
  FormQuestionInput,
  type AnswerValue,
} from "@/components/domain/form-question-input";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  ensureRepresentativeQuestion,
  listStudentRepresentatives,
  migrateForm,
  splitFormSections,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import {
  runFormLogic,
  computeHiddenQuestionIds,
  type FormLogicEventName,
} from "@/lib/forms/script-runtime";
import { validateQuestions } from "@/lib/forms/validation";
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
  publicMode?: boolean;
}) {
  const { store, submitFormResponse, registerForEvent, createUser } = useStore();
  const { session, profile } = useCurrentUser();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);

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

  const sections = useMemo(
    () => splitFormSections(resolvedForm),
    [resolvedForm],
  );

  const hiddenIds = useMemo(
    () =>
      computeHiddenQuestionIds(
        resolvedForm.logicRules,
        resolvedForm.logicEnabled,
        answers as Record<string, string | string[] | number | boolean>,
      ),
    [resolvedForm.logicRules, resolvedForm.logicEnabled, answers],
  );

  useEffect(() => {
    if (!hiddenIds.size) return;
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of hiddenIds) {
        if (next[id] !== undefined && next[id] !== "") {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [hiddenIds]);

  const isRegistration = resolvedForm.purpose === "registration";
  const reps = useMemo(
    () => (useClassReps ? listStudentRepresentatives(store, profile) : []),
    [store, profile, useClassReps],
  );

  const chapter = resolvedForm.chapterId
    ? store.chapters.find((c) => c.id === resolvedForm.chapterId)
    : undefined;

  const safeIndex = Math.min(
    Math.max(0, sectionIndex),
    Math.max(0, sections.length - 1),
  );
  const current = sections[safeIndex] ?? sections[0];
  const isLast = safeIndex >= sections.length - 1;
  const isFirst = safeIndex <= 0;

  const answersRef = useRef(answers);
  const sectionRef = useRef(safeIndex);
  answersRef.current = answers;
  sectionRef.current = safeIndex;

  function logicHost() {
    return {
      getAnswers: () =>
        answersRef.current as Record<
          string,
          string | string[] | number | boolean
        >,
      setAnswer: (questionId: string, value: AnswerValue) => {
        setAnswers((a) => ({ ...a, [questionId]: value }));
      },
      getSectionIndex: () => sectionRef.current,
      setSectionIndex: (index: number) => {
        setSectionIndex(index);
        setError("");
      },
      sectionCount: () => sections.length,
      questions: resolvedForm.questions,
      setError: (message: string) => setError(message),
    };
  }

  function runHook(
    name: FormLogicEventName,
    detail?: { questionId?: string },
  ) {
    return runFormLogic(
      resolvedForm.logicRules,
      resolvedForm.logicEnabled,
      logicHost(),
      name,
      detail,
    );
  }

  useEffect(() => {
    setSectionIndex(0);
    setDone(false);
    setError("");
  }, [resolvedForm.id]);

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
    queueMicrotask(() => {
      runHook("onAnswerChange", { questionId: id });
    });
  }

  function resolveSubmitUserId(): string | null {
    if (!publicMode) {
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

  function validateCurrentPage(): boolean {
    const visible = (current?.questions ?? []).filter((q) => !hiddenIds.has(q.id));
    const miss = validateQuestions(visible, answers, hiddenIds);
    if (miss) {
      setError(miss);
      return false;
    }
    return true;
  }

  function goNext() {
    setError("");
    if (!validateCurrentPage()) return;
    if (!runHook("onBeforeNext")) return;
    if (!isLast) setSectionIndex((i) => i + 1);
  }

  function goBack() {
    setError("");
    if (!isFirst) setSectionIndex((i) => Math.max(0, i - 1));
  }

  function submit() {
    setError("");
    if (!validateCurrentPage()) return;

    if (!runHook("onBeforeSubmit")) return;

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

    // Final pass: all visible answerable across sections
    const allQs = sections.flatMap((s) => s.questions);
    const miss = validateQuestions(allQs, answers, hiddenIds);
    if (miss) {
      setError(miss);
      return;
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
      const regResult = registerForEvent({
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
      if (!regResult.ok) {
        setError(regResult.message);
        return;
      }
    }

    const res = submitFormResponse({
      formId: resolvedForm.id,
      userId,
      eventId: resolvedForm.eventId,
      answers,
    });
    if (!res) {
      setError("Could not submit — already submitted or form closed.");
      return;
    }
    setDone(true);
  }

  const eventForLink = resolvedForm.eventId
    ? store.events.find((e) => e.id === resolvedForm.eventId)
    : undefined;
  const chapterForLink = eventForLink
    ? store.chapters.find((c) => c.id === eventForLink.chapterId)
    : chapter;

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <TerminalPanel
          title={preview ? "preview" : "submitted"}
          meta={chapter?.name}
          accent="orange"
        >
          <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.03em]">
            {preview
              ? "Preview complete"
              : isRegistration
                ? "Submitted — pending review"
                : "Got it — thanks"}
          </h2>
          <p className="mt-2 text-[14px] text-text-dim">
            {preview
              ? "Nothing was saved — this was a preview only."
              : isRegistration
                ? "Your registration is with the chapter team for review."
                : "Your response is in Elevates."}
          </p>
          {!preview && isRegistration && chapterForLink && eventForLink ? (
            <Link
              href={`/chapter/${chapterForLink.slug}/events/${eventForLink.id}`}
              className="mt-4 inline-block text-[14px] font-medium text-[var(--accent)] hover:underline"
            >
              View {eventForLink.title} →
            </Link>
          ) : null}
          {preview ? (
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setDone(false);
                setAnswers({});
                setSectionIndex(0);
              }}
            >
              Fill again
            </Button>
          ) : null}
        </TerminalPanel>
      </div>
    );
  }

  const blockRegistration =
    isRegistration &&
    !preview &&
    !publicMode &&
    (!classReady || reps.length < 1);

  const multiSection = sections.length > 1;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <TerminalPanel
        title={resolvedForm.title}
        meta={
          [
            chapter?.name,
            resolvedForm.purpose,
            preview ? "preview" : null,
            multiSection
              ? `section ${safeIndex + 1}/${sections.length}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        accent="orange"
      >
        {resolvedForm.description && safeIndex === 0 && !current?.header ? (
          <p className="text-[14px] text-text-dim">
            {resolvedForm.description}
          </p>
        ) : null}
        {preview ? (
          <p className="mt-3 text-[12px] font-medium text-[var(--accent)]">
            Preview mode — responses are not saved.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-text-mute">
            * Required fields
            {multiSection ? " on this section" : ""}
          </p>
        )}
      </TerminalPanel>

      {blockRegistration ? (
        <TerminalPanel title="before you continue" accent="orange">
          {!classReady ? (
            <>
              <p className="font-semibold">Set your class first</p>
              <p className="mt-1 text-[13px] text-text-dim">
                Open your profile and choose your class so representatives can
                be assigned.
              </p>
              {profile ? (
                <Link href={`/profile/${profile.id}`} className="mt-3 inline-block">
                  <Button variant="orange">Go to profile</Button>
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-semibold">No representatives for your class</p>
              <p className="mt-1 text-[13px] text-text-dim">
                Ask your chapter exec to assign representatives for{" "}
                {[profile?.department, profile?.year, profile?.section]
                  .filter(Boolean)
                  .join(" · ")}
                .
              </p>
            </>
          )}
        </TerminalPanel>
      ) : null}

      {current?.header || (multiSection && safeIndex > 0) ? (
        <section className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow-sm)] md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[-0.02em]">
            {current.title}
          </h2>
          {current.description ? (
            <p className="mt-1 text-[13px] text-text-dim">
              {current.description}
            </p>
          ) : null}
        </section>
      ) : null}

      {(current?.questions ?? [])
        .filter((q) => !hiddenIds.has(q.id))
        .map((q) => (
        <section
          key={q.id}
          className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow-sm)] md:p-6"
        >
          <FormQuestionInput
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
        </section>
      ))}

      {error ? (
        <p className="px-1 text-[13px] text-[var(--accent)]">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
        <div className="flex flex-wrap gap-2">
          {multiSection && !isFirst ? (
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
          ) : null}
          {!isLast ? (
            <Button
              variant="orange"
              onClick={goNext}
              disabled={Boolean(blockRegistration)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="orange"
              onClick={submit}
              disabled={Boolean(blockRegistration)}
            >
              {preview
                ? "Test submit"
                : isRegistration
                  ? "Register"
                  : "Submit"}
            </Button>
          )}
        </div>
        <button
          type="button"
          className="text-[13px] text-text-dim hover:text-[var(--accent)]"
          onClick={() => {
            setAnswers({});
            setSectionIndex(0);
            setError("");
          }}
        >
          Clear form
        </button>
      </div>
    </div>
  );
}

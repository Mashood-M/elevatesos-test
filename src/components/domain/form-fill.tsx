"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/input";
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
  mintQrCode,
  splitFormSections,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import {
  runFormLogic,
  computeHiddenQuestionIds,
  type FormLogicEventName,
} from "@/lib/forms/script-runtime";
import { validateQuestions } from "@/lib/forms/validation";
import { formatDateTime } from "@/lib/utils";
import { genUuid } from "@/lib/uuid";
import type { FormDefinition, FormQuestion, EventRegistration } from "@/types";
import {
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";

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

const STANDARD_REG_KEYS = new Set([
  "f-name",
  "f-phone",
  "f-dept",
  "f-year",
  "f-section",
  "f-email",
  "q-rep",
  "name",
  "email",
  "phone",
  "department",
  "year",
  "section",
  "representative",
]);

function isStandardProfileQuestion(q: FormQuestion): boolean {
  if (q.type === "representative") return true;
  const id = q.id.toLowerCase();
  const title = q.title.toLowerCase();
  if (STANDARD_REG_KEYS.has(id)) return true;
  if (
    title.includes("name") ||
    title.includes("phone") ||
    title.includes("mobile") ||
    title.includes("department") ||
    title.includes("year") ||
    title.includes("section") ||
    title.includes("email") ||
    title.includes("representative")
  ) {
    return true;
  }
  return false;
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
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [registeredReg, setRegisteredReg] = useState<EventRegistration | null>(null);

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

  const alreadyRegistered = useMemo(() => {
    if (!isRegistration || !resolvedForm.eventId || !profile?.id) return null;
    return (
      store.registrations.find(
        (r) =>
          r.eventId === resolvedForm.eventId &&
          r.userId === profile.id &&
          r.status !== "rejected",
      ) ?? null
    );
  }, [isRegistration, resolvedForm.eventId, profile?.id, store.registrations]);

  const isOneClickRegistration = isRegistration && Boolean(profile) && !preview;

  const extraQuestions = useMemo(() => {
    if (!isOneClickRegistration) return resolvedForm.questions;
    return resolvedForm.questions.filter(
      (q) => !isStandardProfileQuestion(q) && !hiddenIds.has(q.id),
    );
  }, [isOneClickRegistration, resolvedForm.questions, hiddenIds]);

  useEffect(() => {
    if (!profile || !isRegistration) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const q of resolvedForm.questions) {
        if (next[q.id] !== undefined && next[q.id] !== "") continue;
        const qId = q.id.toLowerCase();
        const qTitle = q.title.toLowerCase();
        if (qId === "f-name" || qTitle.includes("name")) {
          next[q.id] = profile.fullName;
        } else if (qId === "f-email" || qTitle.includes("email")) {
          next[q.id] = profile.email;
        } else if (qId === "f-phone" || qTitle.includes("phone") || qTitle.includes("mobile")) {
          next[q.id] = profile.phone || "";
        } else if (qId === "f-dept" || qTitle.includes("department")) {
          next[q.id] = profile.department || "";
        } else if (qId === "f-year" || qTitle.includes("year")) {
          next[q.id] = profile.year || "";
        } else if (qId === "f-section" || qTitle.includes("section")) {
          next[q.id] = profile.section || "";
        } else if (q.type === "representative" && reps.length > 0) {
          next[q.id] = reps[0].id;
        }
      }
      return next;
    });
  }, [profile, isRegistration, resolvedForm.questions, reps]);

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

    // Phone 10-digit enforcement
    for (const q of allQs) {
      if (hiddenIds.has(q.id)) continue;
      const qTitle = q.title.toLowerCase();
      const qId = q.id.toLowerCase();
      const isPhone =
        qTitle.includes("phone") ||
        qTitle.includes("mobile") ||
        qTitle.includes("contact") ||
        qTitle.includes("whatsapp") ||
        qTitle.includes("tel") ||
        qId.includes("phone") ||
        qId.includes("tel");
      if (!isPhone) continue;
      const val = typeof answers[q.id] === "string" ? String(answers[q.id]) : "";
      if (!val) continue; // required check already handled above
      const digits = val.replace(/\D/g, "");
      if (digits.length !== 10) {
        setError(`${q.title}: Please enter exactly 10 digits (no spaces, dashes, or country code).`);
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
      const chosenRepId =
        selectedRepId ||
        representativeId ||
        (typeof answers["q-rep"] === "string" ? answers["q-rep"] : undefined) ||
        reps[0]?.id;
      const regId = genUuid();
      const qrCode = mintQrCode(resolvedForm.eventId, userId);
      const regAnswers = {
        name: profile?.fullName ?? (pickAnswerString(answers, "f-name", "f1", "name") || "Guest"),
        email: profile?.email ?? (pickAnswerString(answers, "f-email", "f2", "email") || ""),
        phone: profile?.phone ?? (pickAnswerString(answers, "f-phone", "phone") || ""),
        department: profile?.department ?? (pickAnswerString(answers, "f-dept", "department") || ""),
        year: profile?.year ?? (pickAnswerString(answers, "f-year", "year") || ""),
        section: profile?.section ?? (pickAnswerString(answers, "f-section", "section") || ""),
        elevatesId: profile?.elevatesId || "",
        chapterId: profile?.chapterId || resolvedForm.chapterId,
        registeredAutomatically: Boolean(profile),
        registeredAt: new Date().toISOString(),
        ...answers,
      };
      const regRecord: EventRegistration = {
        id: regId,
        eventId: resolvedForm.eventId,
        userId,
        status: "pending",
        representativeId: chosenRepId,
        answers: regAnswers,
        qrCode,
        createdAt: new Date().toISOString(),
      };
      const regResult = registerForEvent(regRecord);
      if (!regResult.ok) {
        setError(regResult.message);
        return;
      }
      setRegisteredReg(regRecord);
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
          {isRegistration && (registeredReg?.qrCode || alreadyRegistered?.qrCode) ? (
            <div className="mt-4 rounded-[14px] border border-border bg-bg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute font-mono">
                Your Check-In QR
              </p>
              <div className="mx-auto mt-2.5 w-fit rounded-[12px] border border-border bg-white p-3 shadow-sm">
                <QRCode
                  value={registeredReg?.qrCode || alreadyRegistered?.qrCode || ""}
                  size={140}
                  style={{ height: "auto", width: 140 }}
                />
              </div>
              <p className="mt-2.5 font-mono text-[11px] font-semibold text-text">
                {registeredReg?.qrCode || alreadyRegistered?.qrCode}
              </p>
              <p className="mt-1 text-[11px] text-text-dim">
                Show this QR code at the door for instant check-in.
              </p>
            </div>
          ) : null}
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

  if (alreadyRegistered) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <TerminalPanel
          title="registration status"
          accent="orange"
          meta={alreadyRegistered.status}
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                You are already registered!
              </h2>
              <p className="mt-1 text-xs text-text-dim">
                Status:{" "}
                <span className="font-semibold capitalize text-text">
                  {alreadyRegistered.status}
                </span>
                {alreadyRegistered.status === "pending"
                  ? " (waiting for class rep review)"
                  : ""}
              </p>
            </div>
            {alreadyRegistered.qrCode ? (
              <div className="mx-auto max-w-xs rounded-[14px] border border-border bg-bg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute font-mono">
                  Your Check-In QR
                </p>
                <div className="mx-auto mt-2.5 w-fit rounded-[12px] border border-border bg-white p-3 shadow-sm">
                  <QRCode
                    value={alreadyRegistered.qrCode}
                    size={140}
                    style={{ height: "auto", width: 140 }}
                  />
                </div>
                <p className="mt-2 font-mono text-[11px] font-semibold text-text">
                  {alreadyRegistered.qrCode}
                </p>
                <p className="mt-1 text-[11px] text-text-dim">
                  Show this QR code at the door for instant check-in.
                </p>
              </div>
            ) : null}
            {eventForLink && chapterForLink ? (
              <Link
                href={`/chapter/${chapterForLink.slug}/events/${eventForLink.id}`}
                className="inline-block text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                View event details →
              </Link>
            ) : null}
          </div>
        </TerminalPanel>
      </div>
    );
  }

  const blockRegistration =
    isRegistration &&
    !preview &&
    !publicMode &&
    (!classReady || reps.length < 1);

  if (isOneClickRegistration && profile) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <TerminalPanel
          title={resolvedForm.title}
          meta={
            [chapter?.name, resolvedForm.purpose].filter(Boolean).join(" · ") ||
            undefined
          }
          accent="orange"
        >
          {resolvedForm.description ? (
            <p className="text-[14px] text-text-dim">
              {resolvedForm.description}
            </p>
          ) : null}
        </TerminalPanel>

        {/* EVENT BANNER */}
        {eventForLink ? (
          <div className="rounded-[14px] border border-border/80 bg-bg p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] font-mono">
                  {eventForLink.category || "Event"}
                </span>
                <h3 className="mt-0.5 text-base font-bold text-text">
                  {eventForLink.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-dim">
                  <Calendar size={13} className="shrink-0 text-text-mute" />
                  <span>{formatDateTime(eventForLink.startsAt)}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-dim">
                  <MapPin size={13} className="shrink-0 text-text-mute" />
                  <span>{eventForLink.venue}</span>
                </p>
              </div>
              <Badge tone="cyan">
                {eventForLink.status === "registration_open"
                  ? "Open"
                  : eventForLink.status}
              </Badge>
            </div>
          </div>
        ) : null}

        {/* CLASS SETUP WARNING */}
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
                  <Link
                    href={`/profile/${profile.elevatesId || profile.id}`}
                    className="mt-3 inline-block"
                  >
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
        ) : (
          <>
            {/* VERIFIED STUDENT DETAILS CARD */}
            <div className="space-y-3 rounded-[14px] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--accent)]" />
                  <span className="text-[12px] font-semibold text-text">
                    Verified Student Details
                  </span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-emerald-500">
                  <Sparkles size={12} />
                  Auto-populated
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Student Name
                  </span>
                  <span className="font-semibold text-text">
                    {profile.fullName}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Elevates ID
                  </span>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    {profile.elevatesId || "ELV-STUDENT"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Email
                  </span>
                  <span className="block truncate text-text">{profile.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Phone
                  </span>
                  <span className="text-text">
                    {profile.phone || "Not set in profile"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Academic Class
                  </span>
                  <span className="text-text">
                    {[
                      profile.department,
                      profile.year,
                      profile.section ? `Sec ${profile.section}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "General Student"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-text-mute">
                    Campus Chapter
                  </span>
                  <span className="block truncate text-text">
                    {chapterForLink?.name || chapter?.name || "Campus Chapter"}
                  </span>
                </div>
              </div>
            </div>

            {/* CLASS REP ASSIGNMENT */}
            {reps.length > 1 ? (
              <section className="rounded-[var(--radius)] bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
                <FieldLabel>Class Representative (for approval review)</FieldLabel>
                <Select
                  value={selectedRepId || reps[0]?.id || ""}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="mt-1 w-full text-xs"
                >
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.label}
                    </option>
                  ))}
                </Select>
              </section>
            ) : reps[0] ? (
              <div className="flex items-center justify-between rounded-[10px] border border-border/60 bg-bg p-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <GraduationCap size={15} className="shrink-0 text-cyan" />
                  <span className="text-text-dim">Assigned Class Rep:</span>
                  <span className="font-semibold text-text">
                    {reps[0].label}
                  </span>
                </div>
                <Badge tone="cyan">Assigned</Badge>
              </div>
            ) : null}

            {/* EXTRA QUESTIONS (if any) */}
            {extraQuestions.map((q) => (
              <section
                key={q.id}
                className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow-sm)] md:p-6"
              >
                <FormQuestionInput
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </section>
            ))}

            {error ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-400">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="pt-2">
              <Button
                type="button"
                variant="orange"
                className="h-11 w-full justify-center text-sm font-semibold shadow-md"
                onClick={submit}
              >
                Confirm & Register
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

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
                <Link href={`/profile/${profile.elevatesId || profile.id}`} className="mt-3 inline-block">
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

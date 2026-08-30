"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, ShieldAlert, Clock, CheckCircle2, Building2 } from "lucide-react";

const DEFAULT_DEPTS = [
  "Computer Science & Engineering (CSE)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Other",
];

function JoinChapterContent() {
  const { joinChapterWithCode, store } = useStore();
  const { session } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code") || searchParams.get("chapter") || "";

  const [inputCode, setInputCode] = useState(urlCode);
  const [department, setDepartment] = useState("");
  const [customDept, setCustomDept] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successChapter, setSuccessChapter] = useState<import("@/types").Chapter | null>(null);

  // Dynamically resolve target chapter from typed code to fetch Campus Lead configured departments
  const cleanCode = inputCode.trim().toUpperCase();
  const matchingCode = (store.chapterInviteCodes ?? []).find((c) => c.code === cleanCode);
  const targetChapter = matchingCode
    ? store.chapters.find((c) => c.id === matchingCode.chapterId)
    : store.chapters.find((c) => c.slug.toUpperCase() === cleanCode);

  const configuredDepts = targetChapter
    ? (store.departments ?? []).filter((d) => d.chapterId === targetChapter.id)
    : [];

  const availableDepts = configuredDepts.length > 0
    ? [...configuredDepts.map((d) => d.name), "Other"]
    : DEFAULT_DEPTS;

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const finalDept = department === "Other" ? customDept.trim() : department.trim();
    if (!finalDept) {
      setErrorMsg("Please select or enter your academic department.");
      return;
    }

    const result = joinChapterWithCode(inputCode, session.userId, finalDept);
    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    if (result.chapter) {
      setSuccessChapter(result.chapter);
    }
  }

  function handleGoToChapter() {
    if (successChapter) {
      router.push(`/chapter/${successChapter.slug}`);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--charcoal-900)] px-6 py-14 text-white flex items-center justify-center">
      <div className="mx-auto max-w-md w-full">
        <div className="text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-[22px] font-extrabold tracking-[-0.04em] text-white"
          >
            Elevates OS
          </Link>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[2rem] font-extrabold tracking-[-0.035em]">
            Join College Chapter
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/50">
            Enter your 3-day invite code and select your department to join instantly.
          </p>
        </div>

        <div className="mt-8 rounded-[18px] bg-white/[0.04] p-6 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
          {errorMsg ? (
            <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 font-medium">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {!successChapter ? (
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="flex items-center gap-2 rounded-[10px] bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-400">
                <Clock size={14} />
                <span>3-Day Validity Invite Code Required</span>
              </div>

              <div>
                <FieldLabel>1. Unique Invite Code</FieldLabel>
                <Input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EKC-9A82F1"
                  className="font-mono uppercase font-bold text-center tracking-widest text-lg border-white/15 bg-black/40 text-white focus:border-orange-500"
                  autoFocus
                />
              </div>

              <div>
                <FieldLabel className="flex items-center gap-1.5 text-white/80">
                  <Building2 size={14} />
                  <span>2. Select Your Department</span>
                </FieldLabel>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                >
                  <option value="" className="bg-[var(--charcoal-900)] text-white">-- Select Department --</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d} className="bg-[var(--charcoal-900)] text-white">
                      {d}
                    </option>
                  ))}
                </Select>
              </div>

              {department === "Other" && (
                <div>
                  <FieldLabel className="text-white/80">Specify Department Name</FieldLabel>
                  <Input
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="e.g. Biotechnology Engineering"
                    className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="orange"
                className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                Join Chapter Instantly
              </Button>
            </form>
          ) : (
            <div className="py-4 text-center space-y-4">
              <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
              <h3 className="font-bold text-xl text-white">🎉 Welcome to {successChapter.name}!</h3>
              <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
                You are now a registered student member of <strong>{successChapter.college || successChapter.name}</strong> under <strong>{department === "Other" ? customDept : department}</strong>.
              </p>
              <Button variant="orange" onClick={handleGoToChapter} className="w-full py-3 font-bold">
                Go to Chapter Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinChapterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[var(--charcoal-900)] flex items-center justify-center text-white text-xs font-mono animate-pulse">
          Loading join portal...
        </div>
      }
    >
      <JoinChapterContent />
    </Suspense>
  );
}

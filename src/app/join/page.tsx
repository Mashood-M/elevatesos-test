"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, ShieldAlert, CheckCircle2, Building2, ArrowRight } from "lucide-react";
import type { Chapter } from "@/types";

function JoinChapterContent() {
  const { joinChapterWithCode, store } = useStore();
  const { session } = useCurrentUser();
  const userProfile = store.profiles.find((p) => p.id === session.userId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code") || searchParams.get("chapter") || "";

  const [inputCode, setInputCode] = useState(urlCode);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("1st Year");
  const [skills, setSkills] = useState(userProfile?.skills?.join(", ") || "");
  const [interests, setInterests] = useState(userProfile?.interests?.join(", ") || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successChapter, setSuccessChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.skills?.length && !skills) {
        setSkills(userProfile.skills.join(", "));
      }
      if (userProfile.interests?.length && !interests) {
        setInterests(userProfile.interests.join(", "));
      }
    }
  }, [userProfile]);

  // Dynamically resolve target chapter from typed code to fetch Campus Lead configured departments
  const cleanCode = inputCode.trim().toUpperCase();
  const matchingCode =
    (store.chapterInviteCodes ?? []).find((c) => c.code.toUpperCase() === cleanCode) ||
    (store.inviteTokens ?? []).find(
      (t) => !t.token?.toUpperCase().startsWith("REF-") && t.token?.toUpperCase() === cleanCode && t.chapterId
    );
  const targetChapterId = matchingCode?.chapterId || "";
  const targetChapter = targetChapterId
    ? store.chapters.find((c) => c.id === targetChapterId)
    : store.chapters.find((c) => c.slug.toUpperCase() === cleanCode);

  // Departments added by Campus Lead from Supabase / store
  const configuredDepts = targetChapter
    ? (store.departments ?? []).filter((d) => d.chapterId === targetChapter.id)
    : [];

  const [forceShowForm, setForceShowForm] = useState(false);

  const existingChapterId =
    session.chapterId || store.profiles.find((p) => p.id === session.userId)?.chapterId;
  const existingChapter = existingChapterId
    ? store.chapters.find((c) => c.id === existingChapterId)
    : null;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const codeToUse = inputCode.trim().toUpperCase();
    if (!codeToUse) {
      setErrorMsg("Please enter an invite code.");
      return;
    }

    if (!targetChapter) {
      setErrorMsg("Invalid invite code or chapter not found. Please check with your Campus Lead.");
      return;
    }

    const finalDept = configuredDepts.length > 0 ? department.trim() : department.trim() || "General";
    if (configuredDepts.length > 0 && !finalDept) {
      setErrorMsg("Please select your academic department.");
      return;
    }

    if (!year.trim()) {
      setErrorMsg("Please select your academic year.");
      return;
    }

    if (existingChapter && targetChapter && existingChapter.id === targetChapter.id) {
      setErrorMsg(`You are already an active member of ${existingChapter.name}.`);
      return;
    }

    const skillsArr = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const interestsArr = interests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const result = await joinChapterWithCode(codeToUse, session.userId, finalDept, year.trim(), skillsArr, interestsArr);
      if (!result.success) {
        setErrorMsg(result.message);
        setSubmitting(false);
        return;
      }

      if (result.chapter) {
        setSuccessChapter(result.chapter);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify invite code";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToChapter() {
    if (successChapter) {
      router.push(`/chapter/${successChapter.slug}`);
    }
  }

  if (existingChapter && !forceShowForm) {
    return (
      <div className="min-h-dvh bg-[var(--charcoal-900)] px-6 py-14 text-white flex items-center justify-center">
        <div className="w-full max-w-sm rounded-[18px] bg-white/[0.04] p-6 shadow-2xl ring-1 ring-white/10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
            <Building2 size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Already in Chapter</h3>
            <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
              You are currently enrolled in <strong>{existingChapter.name}</strong>.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Button
              variant="orange"
              onClick={() => router.push(`/chapter/${existingChapter.slug}`)}
              className="w-full py-2.5 font-semibold text-xs"
            >
              Go to Chapter Dashboard
            </Button>
            <button
              type="button"
              onClick={() => setForceShowForm(true)}
              className="text-[11px] text-white/50 hover:text-white underline pt-1 block mx-auto transition"
            >
              Have an invite code for another chapter? Enter Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--charcoal-900)] px-6 py-14 text-white flex items-center justify-center">
      <div className="mx-auto max-w-lg w-full">
        <div className="text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-[22px] font-extrabold tracking-[-0.04em] text-white hover:opacity-90 transition"
          >
            Elevates OS
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.85rem] sm:text-[2rem] font-extrabold tracking-[-0.035em]">
            Join College Chapter
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 max-w-sm mx-auto">
            Enter your campus invite code and academic details to join your college community.
          </p>
        </div>

        <div className="mt-8 rounded-[20px] bg-white/[0.04] p-6 sm:p-7 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
          {errorMsg ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-xs text-red-300 font-medium">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {!successChapter ? (
            <form onSubmit={handleJoin} className="space-y-4">
              {/* Invite Code */}
              <div className="space-y-1.5">
                <FieldLabel className="text-white/80">Chapter Invite Code</FieldLabel>
                <div className="relative">
                  <Input
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="e.g. EKC-9A82"
                    className="font-mono uppercase font-semibold tracking-wider text-sm pl-10 border-white/15 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                    <KeyRound size={16} />
                  </div>
                </div>
                <p className="text-[11px] text-white/50">
                  Provided by your Campus Lead, Class Representative, or chapter executives.
                </p>
              </div>
                {targetChapter ? (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 block">
                        Verified Chapter
                      </span>
                      <span className="font-semibold text-white truncate block">{targetChapter.name}</span>
                    </div>
                  </div>
                ) : null}

                {/* Academic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <FieldLabel className="text-white/80">Academic Department</FieldLabel>
                    {configuredDepts.length > 0 ? (
                      <Select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                      >
                        <option value="" className="bg-[var(--charcoal-900)] text-white">
                          Select Department
                        </option>
                        {configuredDepts.map((d) => (
                          <option key={d.id} value={d.name} className="bg-[var(--charcoal-900)] text-white">
                            {d.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                      />
                    )}
                  </div>

                  <div>
                    <FieldLabel className="text-white/80">Academic Year</FieldLabel>
                    <Select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                    >
                      <option value="1st Year" className="bg-[var(--charcoal-900)] text-white">1st Year</option>
                      <option value="2nd Year" className="bg-[var(--charcoal-900)] text-white">2nd Year</option>
                      <option value="3rd Year" className="bg-[var(--charcoal-900)] text-white">3rd Year</option>
                      <option value="4th Year" className="bg-[var(--charcoal-900)] text-white">4th Year</option>
                      <option value="Postgraduate" className="bg-[var(--charcoal-900)] text-white">Postgraduate</option>
                      <option value="Alumni / Other" className="bg-[var(--charcoal-900)] text-white">Alumni / Other</option>
                    </Select>
                  </div>
                </div>

                {/* Optional Profile Info */}
                <div className="border-t border-white/10 pt-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">
                      Skills & Interests <span className="font-normal text-white/40">(Optional)</span>
                    </span>
                    <span className="text-[11px] text-white/40">For projects & peer labs</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <FieldLabel className="text-white/60 text-[11px] mb-1">Skills</FieldLabel>
                      <Input
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        placeholder="e.g. React, Python, UI/UX"
                        className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <FieldLabel className="text-white/60 text-[11px] mb-1">Focus Areas</FieldLabel>
                      <Input
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="e.g. AI, Web3, Hackathons"
                        className="border-white/15 bg-black/40 text-white text-xs focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="orange"
                    disabled={submitting}
                    className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Joining Chapter...
                      </span>
                    ) : (
                      <>
                        Join Chapter
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </div>
            </form>
          ) : (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="font-bold text-xl text-white">Welcome to {successChapter.name}!</h3>
                <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
                  Your student membership is active.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Campus</span>
                  <span className="font-semibold text-white">{successChapter.college || successChapter.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Department</span>
                  <span className="font-semibold text-white">{department || "General"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Academic Year</span>
                  <span className="font-semibold text-white">{year}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="orange"
                  onClick={handleGoToChapter}
                  className="w-full py-3 font-semibold text-sm"
                >
                  Go to Chapter Dashboard
                </Button>
              </div>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  KeyRound,
  Check,
  Building2,
  GraduationCap,
  Code2,
  FlaskConical,
  ArrowRight,
  X,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

type InterestItem = {
  id: string;
  label: string;
  icon: string;
  isCustom?: boolean;
};

const DEFAULT_SUGGESTED_INTERESTS: InterestItem[] = [
  { id: "ai-ml", label: "AI/ML", icon: "⚡" },
  { id: "hackathons", label: "Hackathons", icon: "🏆" },
];

export function ChapterJoinModal({ isOpen, onClose, initialCode = "" }: Props) {
  const router = useRouter();
  const { joinChapterWithCode, store } = useStore();
  const { session } = useCurrentUser();
  const userProfile = store.profiles.find((p) => p.id === session.userId);

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("1st Year");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [interestsList, setInterestsList] = useState<InterestItem[]>(DEFAULT_SUGGESTED_INTERESTS);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [customInterestText, setCustomInterestText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successChapter, setSuccessChapter] = useState<Chapter | null>(null);
  const [forceShowForm, setForceShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialCode) {
      setInviteCode(initialCode);
    }
  }, [isOpen, initialCode]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.skills?.length && skillsList.length === 0) {
        setSkillsList(userProfile.skills);
      }
      if (userProfile.interests?.length && selectedInterests.length === 0) {
        setSelectedInterests(userProfile.interests);
      }
    }
  }, [userProfile]);

  // Dynamically resolve target chapter from typed code to fetch Campus Lead configured departments
  const cleanCode = inviteCode.trim().toUpperCase();
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

  // Reset or align department selection when target chapter changes
  useEffect(() => {
    if (targetChapter) {
      if (configuredDepts.length > 0) {
        if (!configuredDepts.some((d) => d.name === department)) {
          setDepartment("");
        }
      }
    } else {
      setDepartment("");
    }
  }, [targetChapterId, targetChapter]);

  const currentChapterId =
    session.chapterId || store.profiles.find((p) => p.id === session.userId)?.chapterId;
  const currentChapter = currentChapterId
    ? store.chapters.find((c) => c.id === currentChapterId)
    : null;

  const handleReset = () => {
    setInviteCode("");
    setDepartment("");
    setYear("1st Year");
    setSkillsList(userProfile?.skills || []);
    setInterestsList(DEFAULT_SUGGESTED_INTERESTS);
    setSelectedInterests(userProfile?.interests || []);
    setIsAddingInterest(false);
    setCustomInterestText("");
    setErrorMsg("");
    setSuccessChapter(null);
    setForceShowForm(false);
    setShowGuide(false);
    onClose();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const codeToUse = inviteCode.trim().toUpperCase();
    if (!codeToUse) {
      setErrorMsg("Please enter an invite code.");
      return;
    }

    if (!targetChapter) {
      setErrorMsg("Invalid invite code or chapter not found. Please check with your Campus Lead.");
      return;
    }

    const finalDept = department.trim() || "General";
    if (configuredDepts.length > 0 && !department.trim()) {
      setErrorMsg("Please select your academic department.");
      return;
    }

    if (!year.trim()) {
      setErrorMsg("Please select your academic year.");
      return;
    }

    if (currentChapter && targetChapter && currentChapter.id === targetChapter.id) {
      setErrorMsg(`You are already an active member of ${currentChapter.name}.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await joinChapterWithCode(
        codeToUse,
        session.userId,
        finalDept,
        year.trim(),
        skillsList,
        selectedInterests
      );
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
  };

  const handleGoToChapter = () => {
    const slug = successChapter?.slug;
    handleReset();
    if (slug) {
      router.push(`/chapter/${slug}`);
    }
  };

  // Case 1: Already in chapter
  if (currentChapter && !forceShowForm) {
    return (
      <Dialog
        open={isOpen}
        onClose={handleReset}
        className="max-w-md rounded-[var(--radius-lg)] border border-border bg-bg-panel shadow-[var(--shadow)]"
        contentClassName="p-6 text-center space-y-4"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Building2 size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-text">
            Already enrolled in {currentChapter.name}
          </h3>
          <p className="mt-1.5 text-xs text-text-dim max-w-xs mx-auto leading-relaxed">
            Your account is currently linked to <strong>{currentChapter.name}</strong>.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Button
            variant="orange"
            onClick={() => {
              handleReset();
              router.push(`/chapter/${currentChapter.slug}`);
            }}
            className="w-full py-2.5 font-semibold text-xs"
          >
            Go to Chapter Dashboard
          </Button>
          <button
            type="button"
            onClick={() => setForceShowForm(true)}
            className="text-xs text-text-dim hover:text-text py-1.5 transition underline-offset-4 hover:underline"
          >
            Have an invite code for another chapter? Enter Code
          </button>
        </div>
      </Dialog>
    );
  }

  // Case 2: Success state
  if (successChapter) {
    return (
      <Dialog
        open={isOpen}
        onClose={handleReset}
        className="max-w-md rounded-[var(--radius-lg)] border border-border bg-bg-panel shadow-[var(--shadow)]"
        contentClassName="p-6 text-center space-y-4"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text">
            Welcome to {successChapter.name}!
          </h3>
          <p className="mt-1 text-xs text-text-dim max-w-xs mx-auto">
            Your student membership has been activated successfully.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg p-3.5 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-mute">Campus</span>
            <span className="font-semibold text-text">{successChapter.college || successChapter.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-mute">Department</span>
            <span className="font-semibold text-text">{department || "General"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-mute">Academic Year</span>
            <span className="font-semibold text-text">{year}</span>
          </div>
        </div>
        <div className="pt-2">
          <Button
            variant="orange"
            onClick={handleGoToChapter}
            className="w-full py-2.5 font-semibold"
          >
            Enter Chapter Dashboard
          </Button>
        </div>
      </Dialog>
    );
  }

  // Case 3: Form Design
  return (
    <Dialog
      open={isOpen}
      onClose={handleReset}
      className="max-w-[490px] w-full rounded-[var(--radius-lg)] border border-border bg-bg-panel shadow-[var(--shadow)] overflow-hidden"
      contentClassName="p-6 sm:p-7 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3.5 pr-6 pb-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] shadow-2xs">
          <KeyRound size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-[20px] sm:text-[21px] font-extrabold text-text tracking-[-0.03em] leading-tight">
            Join College Chapter
          </h2>
          <p className="text-[12px] text-text-mute mt-0.5 truncate font-medium">
            {targetChapter
              ? `${targetChapter.name} • Campus Network`
              : "Campus Innovation & Learning Network"}
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 font-medium">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {/* Interactive Guide Tab */}
      {showGuide && (
        <div className="rounded-2xl border border-border bg-bg/80 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <HelpCircle size={14} />
              </div>
              <h4 className="text-xs font-bold text-text tracking-tight">
                How to join your campus chapter
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="rounded-full p-1 text-text-mute hover:text-text hover:bg-neutral-200/60 transition"
              aria-label="Close guide"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-white p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <KeyRound size={14} />
                </div>
                <span className="text-[10px] font-bold text-text-mute">01</span>
              </div>
              <div className="text-xs font-bold text-text">Get your code</div>
              <p className="text-[11px] text-text-dim leading-snug">
                Ask your Campus Lead or Class Rep (e.g. <span className="font-mono font-medium text-text">EKC-9A82</span>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-white p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--secondary-soft)] text-[var(--secondary)]">
                  <GraduationCap size={15} />
                </div>
                <span className="text-[10px] font-bold text-text-mute">02</span>
              </div>
              <div className="text-xs font-bold text-text">Choose branch</div>
              <p className="text-[11px] text-text-dim leading-snug">
                Select your academic department & study year from the list.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border bg-white p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]">
                  <Sparkles size={14} />
                </div>
                <span className="text-[10px] font-bold text-text-mute">03</span>
              </div>
              <div className="text-xs font-bold text-text">Instant access</div>
              <p className="text-[11px] text-text-dim leading-snug">
                Unlock peer labs, campus hackathons & digital certificates.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
            <a
              href="mailto:support@elevates.live?subject=Need%20Chapter%20Invite%20Code"
              className="text-text-dim hover:text-[var(--accent)] font-medium inline-flex items-center gap-1 transition"
            >
              
              <span className="text-orange-600 font-semibold underline underline-offset-2"> </span>
            </a>
            <button
              type="button"
              onClick={() => {
                setShowGuide(false);
                const input = document.getElementById("chapter-invite-input");
                if (input) input.focus();
              }}
              className="rounded-lg bg-[var(--charcoal-900)] hover:bg-[var(--charcoal-800)] text-white px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer"
            >
              Got it, let's join
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-4">
        {/* 1. Unique Chapter Invite Code */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            1. Unique Chapter Invite Code
          </label>
          <div className="relative flex items-center">
            <input
              id="chapter-invite-input"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="e.g. EKC-9A82F1"
              style={{ outline: "none" }}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 font-mono font-bold tracking-wider text-sm text-text uppercase placeholder:text-text-mute placeholder:font-normal transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] focus:outline-none focus-visible:outline-none outline-none shadow-2xs pr-20"
              autoFocus
            />
            {targetChapter ? (
              <div className="absolute right-2.5 flex items-center gap-1 rounded-lg bg-[var(--success-soft)] border border-[var(--success)]/25 px-2.5 py-1 text-xs font-semibold text-[var(--success)] shrink-0 pointer-events-none animate-in fade-in">
                <Check size={12} className="stroke-[2.5]" />
                <span>Valid</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 2. Academic Department (Loaded strictly after valid code is typed) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
            <Building2 size={13} className="text-text-mute" />
            <span>2. Academic Department</span>
          </label>
          {!targetChapter ? (
            <div className="relative">
              <div className="w-full rounded-xl border border-dashed border-border bg-bg/60 px-3.5 py-2.5 text-xs font-medium text-text-mute flex items-center justify-between cursor-not-allowed">
                <span>Type invite code above to load departments</span>
                <span className="text-[11px] text-text-mute">▾</span>
              </div>
            </div>
          ) : configuredDepts.length > 0 ? (
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-9 text-xs font-medium text-text outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] cursor-pointer"
              >
                <option value="">-- Select department at {targetChapter.name} --</option>
                {configuredDepts.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-mute">
                <span className="text-[11px]">▾</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                style={{ outline: "none" }}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-medium text-text outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] focus-visible:outline-none"
              />
            </div>
          )}
        </div>

        {/* 3. Academic Year */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
            <GraduationCap size={13} className="text-text-mute" />
            <span>3. Academic Year</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={cn(
                  "rounded-xl py-2 text-xs text-center border transition font-medium cursor-pointer",
                  year === y
                    ? "border-[var(--accent)] bg-white text-[var(--accent)] font-semibold shadow-xs"
                    : "border-border bg-white text-text-dim hover:border-border-strong hover:text-text"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Skills (Optional) - Empty by default */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
            <Code2 size={13} className="text-text-mute" />
            <span>4. Skills</span>
            <span className="text-text-mute font-normal">(Optional)</span>
          </label>
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-white p-2 min-h-[44px] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)] cursor-text"
            onClick={() => skillInputRef.current?.focus()}
          >
            {skillsList.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-neutral-100/80 px-2.5 py-1 text-xs font-medium text-text shadow-2xs"
              >
                {skill}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSkillsList((prev) => prev.filter((s) => s !== skill));
                  }}
                  className="text-text-mute hover:text-text transition cursor-pointer"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              ref={skillInputRef}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const trimmed = newSkill.trim().replace(/,$/, "");
                  if (trimmed && !skillsList.includes(trimmed)) {
                    setSkillsList([...skillsList, trimmed]);
                    setNewSkill("");
                  }
                } else if (e.key === "Backspace" && !newSkill && skillsList.length > 0) {
                  setSkillsList(skillsList.slice(0, -1));
                }
              }}
              placeholder={skillsList.length === 0 ? "+ Add skills (e.g. React, Python)..." : "+ Add skill..."}
              style={{ outline: "none" }}
              className="flex-1 min-w-[120px] bg-transparent border-0 border-none outline-none ring-0 shadow-none focus:outline-none focus-visible:outline-none focus:ring-0 text-xs text-text placeholder:text-text-mute py-1"
            />
          </div>
        </div>

        {/* 5. Interests / Focus Areas (Optional) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
            <FlaskConical size={13} className="text-text-mute" />
            <span>5. Interests / Focus Areas</span>
            <span className="text-text-mute font-normal">(Optional)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {interestsList.map((item) => {
              const isSelected = selectedInterests.includes(item.label);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedInterests((prev) =>
                      prev.includes(item.label)
                        ? prev.filter((i) => i !== item.label)
                        : [...prev, item.label]
                    );
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs flex items-center gap-1.5 transition cursor-pointer font-medium",
                    isSelected
                      ? "border-[var(--accent)] bg-white text-[var(--accent)] font-semibold shadow-xs"
                      : "border-border bg-white text-text-dim hover:border-border-strong hover:text-text"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.isCustom ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInterestsList((prev) => prev.filter((i) => i.id !== item.id));
                        setSelectedInterests((prev) => prev.filter((i) => i !== item.label));
                      }}
                      className="ml-0.5 text-text-mute hover:text-red-500 transition p-0.5"
                      aria-label={`Remove ${item.label}`}
                    >
                      <X size={11} />
                    </span>
                  ) : null}
                </button>
              );
            })}

            {isAddingInterest ? (
              <div className="rounded-xl border border-[var(--accent)] bg-white px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-xs animate-in fade-in">
                <input
                  value={customInterestText}
                  onChange={(e) => setCustomInterestText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = customInterestText.trim();
                      if (trimmed) {
                        if (!interestsList.some((i) => i.label.toLowerCase() === trimmed.toLowerCase())) {
                          const newItem: InterestItem = {
                            id: `custom-${Date.now()}`,
                            label: trimmed,
                            icon: "💡",
                            isCustom: true,
                          };
                          setInterestsList((prev) => [...prev, newItem]);
                        }
                        if (!selectedInterests.includes(trimmed)) {
                          setSelectedInterests((prev) => [...prev, trimmed]);
                        }
                      }
                      setCustomInterestText("");
                      setIsAddingInterest(false);
                    } else if (e.key === "Escape") {
                      setIsAddingInterest(false);
                      setCustomInterestText("");
                    }
                  }}
                  autoFocus
                  placeholder="e.g. Web3, UI/UX"
                  style={{ outline: "none" }}
                  className="bg-transparent border-0 border-none outline-none ring-0 shadow-none focus:outline-none focus-visible:outline-none focus:ring-0 text-xs text-text w-24 p-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customInterestText.trim();
                    if (trimmed) {
                      if (!interestsList.some((i) => i.label.toLowerCase() === trimmed.toLowerCase())) {
                        const newItem: InterestItem = {
                          id: `custom-${Date.now()}`,
                          label: trimmed,
                          icon: "💡",
                          isCustom: true,
                        };
                        setInterestsList((prev) => [...prev, newItem]);
                      }
                      if (!selectedInterests.includes(trimmed)) {
                        setSelectedInterests((prev) => [...prev, trimmed]);
                      }
                    }
                    setCustomInterestText("");
                    setIsAddingInterest(false);
                  }}
                  className="text-[var(--accent)] font-bold hover:underline cursor-pointer text-[11px]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingInterest(false);
                    setCustomInterestText("");
                  }}
                  className="text-text-mute hover:text-text transition cursor-pointer p-0.5"
                  aria-label="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingInterest(true)}
                className="rounded-xl border border-dashed border-border bg-white hover:border-[var(--accent)] hover:text-[var(--accent)] px-2.5 py-1.5 text-xs flex items-center gap-1 transition text-text-dim font-medium cursor-pointer"
              >
                <Plus size={13} className="text-text-mute" />
                <span>Add interest</span>
              </button>
            )}
          </div>
        </div>

        {/* Join Chapter Button - Unified Brand Accent */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-[var(--shadow-sm)] flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Joining Chapter...
              </span>
            ) : (
              <>
                Join Chapter Instantly
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>

        {/* Bottom Help Links */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="text-text-mute hover:text-text transition font-medium cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400"> </span>
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold underline underline-offset-2 transition cursor-pointer"
            >
              {showGuide ? "Hide guide" : "How to join?"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

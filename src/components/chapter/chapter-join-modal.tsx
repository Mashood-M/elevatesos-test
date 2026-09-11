"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, FieldLabel } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, CheckCircle2, ArrowRight, X, Clock, ShieldAlert, Building2, GraduationCap, Code, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function ChapterJoinModal({ isOpen, onClose, initialCode = "" }: Props) {
  const router = useRouter();
  const { joinChapterWithCode, store } = useStore();
  const { session } = useCurrentUser();
  const userProfile = store.profiles.find((p) => p.id === session.userId);

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("1st Year");
  const [skills, setSkills] = useState(userProfile?.skills?.join(", ") || "");
  const [interests, setInterests] = useState(userProfile?.interests?.join(", ") || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successChapter, setSuccessChapter] = useState<import("@/types").Chapter | null>(null);

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
  const cleanCode = inviteCode.trim().toUpperCase();
  const matchingCode =
    (store.chapterInviteCodes ?? []).find((c) => c.code.toUpperCase() === cleanCode) ||
    (store.inviteTokens ?? []).find((t) => t.token?.toUpperCase() === cleanCode);
  const targetChapterId = matchingCode?.chapterId || "";
  const targetChapter = targetChapterId
    ? store.chapters.find((c) => c.id === targetChapterId)
    : store.chapters.find((c) => c.slug.toUpperCase() === cleanCode);

  // Departments added by Campus Lead from Supabase / store
  const configuredDepts = targetChapter
    ? (store.departments ?? []).filter((d) => d.chapterId === targetChapter.id)
    : [];

  const [forceShowForm, setForceShowForm] = useState(false);

  const currentChapterId =
    session.chapterId ||
    store.profiles.find((p) => p.id === session.userId)?.chapterId;
  const currentChapter = currentChapterId
    ? store.chapters.find((c) => c.id === currentChapterId)
    : null;

  const handleReset = () => {
    setInviteCode("");
    setDepartment("");
    setYear("1st Year");
    setErrorMsg("");
    setSuccessChapter(null);
    setForceShowForm(false);
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
      setErrorMsg("Invalid invite code or chapter not found.");
      return;
    }

    const finalDept = configuredDepts.length > 0 ? department.trim() : (department.trim() || "General");
    if (configuredDepts.length > 0 && !finalDept) {
      setErrorMsg("Please select your academic department from the list.");
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
  };

  const handleGoToChapter = () => {
    const slug = successChapter?.slug;
    handleReset();
    if (slug) {
      router.push(`/chapter/${slug}`);
    }
  };

  if (currentChapter && !forceShowForm) {
    return (
      <Dialog open={isOpen} onClose={handleReset} title="Join Chapter">
        <div className="p-6 max-w-sm w-full bg-bg-panel rounded-[18px] border border-border shadow-2xl text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <h3 className="font-bold text-base text-text">Already in Chapter</h3>
            <p className="mt-1.5 text-xs text-text-dim">
              You are currently enrolled in {currentChapter.name}.
            </p>
          </div>
          <Button
            variant="orange"
            onClick={handleReset}
            className="w-full py-2.5 text-xs font-bold"
          >
            OK
          </Button>
          <button
            type="button"
            onClick={() => setForceShowForm(true)}
            className="text-[11px] text-text-dim hover:text-white underline pt-1 block mx-auto"
          >
            Have an invite code for another chapter? Enter Code
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={handleReset} title="Join Chapter">
      <div className="p-6 max-w-lg w-full bg-bg-panel rounded-[18px] border border-[var(--accent)] shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="text-[var(--accent)]" size={20} />
            <h3 className="font-bold text-lg text-text">Join College Chapter</h3>
          </div>
          <button onClick={handleReset} className="text-text-dim hover:text-text">
            <X size={18} />
          </button>
        </div>

        {errorMsg ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 font-medium">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {!successChapter ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="rounded-[12px] bg-bg p-3 border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                <Clock size={13} />
                <span>3-Day Valid Invite Code</span>
              </div>
              <p className="text-xs text-text-mute leading-relaxed">
                {targetChapter
                  ? `Joining ${targetChapter.name}. Select your department and enter your invite code below.`
                  : "Enter your Campus Lead's unique 3-day invite code and select your department to join."}
              </p>
            </div>

            <div>
              <FieldLabel>1. Unique Chapter Invite Code</FieldLabel>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. EKC-9A82F1"
                className="font-mono uppercase font-bold text-center tracking-widest text-lg"
                autoFocus
              />
            </div>

            {configuredDepts.length > 0 ? (
              <div>
                <FieldLabel className="flex items-center gap-1.5">
                  <Building2 size={13} />
                  <span>2. Select Department (Campus Lead Configured)</span>
                </FieldLabel>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="text-xs"
                >
                  <option value="">-- Choose Department --</option>
                  {configuredDepts.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : targetChapter ? (
              <div className="rounded-[10px] bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-400">
                Notice: The Campus Lead has not configured departments for this chapter yet. You will be joined as General/Unassigned.
              </div>
            ) : (
              <div>
                <FieldLabel className="flex items-center gap-1.5">
                  <Building2 size={13} />
                  <span>2. Academic Department</span>
                </FieldLabel>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="text-xs"
                />
              </div>
            )}

            <div>
              <FieldLabel className="flex items-center gap-1.5">
                <GraduationCap size={13} />
                <span>3. Academic Year</span>
              </FieldLabel>
              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-xs"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </Select>
            </div>

            {/* Skills */}
            <div>
              <FieldLabel className="flex items-center gap-1.5">
                <Code size={13} />
                <span>4. Skills (Optional)</span>
              </FieldLabel>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, Python, UI/UX, Figma (comma separated)"
                className="text-xs"
              />
            </div>

            {/* Interests / Focus Areas */}
            <div>
              <FieldLabel className="flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>5. Interests / Focus Areas (Optional)</span>
              </FieldLabel>
              <Input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. AI/ML, Hackathons, Web3, Cloud (comma separated)"
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="orange"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 font-bold py-3"
            >
              {submitting ? "Verifying & Joining Chapter…" : "Join Chapter Instantly"}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
            <h4 className="font-bold text-xl text-text">🎉 Welcome to {successChapter.name}!</h4>
            <p className="text-xs text-text-mute leading-relaxed max-w-xs mx-auto">
              Your account has been assigned to <strong>{successChapter.college || successChapter.name}</strong> under the <strong>{department || "General"}</strong> department ({year}).
            </p>
            <Button variant="orange" onClick={handleGoToChapter} className="w-full py-2.5 font-bold">
              Go to Chapter Dashboard →
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, FieldLabel } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, CheckCircle2, ArrowRight, X, Clock, ShieldAlert, Building2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

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

export function ChapterJoinModal({ isOpen, onClose, initialCode = "" }: Props) {
  const router = useRouter();
  const { joinChapterWithCode, store } = useStore();
  const { session } = useCurrentUser();

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [department, setDepartment] = useState("");
  const [customDept, setCustomDept] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successChapter, setSuccessChapter] = useState<import("@/types").Chapter | null>(null);

  // Dynamically resolve target chapter from typed code to fetch Campus Lead configured departments
  const cleanCode = inviteCode.trim().toUpperCase();
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

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const finalDept = department === "Other" ? customDept.trim() : department.trim();
    if (!finalDept) {
      setErrorMsg("Please select or enter your academic department.");
      return;
    }

    const result = joinChapterWithCode(inviteCode, session.userId, finalDept);
    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    if (result.chapter) {
      setSuccessChapter(result.chapter);
    }
  };

  const handleReset = () => {
    setInviteCode("");
    setDepartment("");
    setCustomDept("");
    setErrorMsg("");
    setSuccessChapter(null);
    onClose();
  };

  const handleGoToChapter = () => {
    const slug = successChapter?.slug;
    handleReset();
    if (slug) {
      router.push(`/chapter/${slug}`);
    }
  };

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

            <div>
              <FieldLabel className="flex items-center gap-1.5">
                <Building2 size={13} />
                <span>2. Select Your Department</span>
              </FieldLabel>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-xs"
              >
                <option value="">-- Choose Department --</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>

            {department === "Other" && (
              <div>
                <FieldLabel>Specify Department Name</FieldLabel>
                <Input
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  placeholder="e.g. Biotechnology Engineering"
                  className="text-xs"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="orange"
              className="w-full flex items-center justify-center gap-2 font-bold py-3"
            >
              Join Chapter Instantly <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
            <h4 className="font-bold text-xl text-text">🎉 Welcome to {successChapter.name}!</h4>
            <p className="text-xs text-text-mute leading-relaxed max-w-xs mx-auto">
              Your account has been assigned to <strong>{successChapter.college || successChapter.name}</strong> under the <strong>{department === "Other" ? customDept : department}</strong> department.
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

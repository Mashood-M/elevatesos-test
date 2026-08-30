"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, Sparkles, CheckCircle2, ArrowRight, X, Clock, ShieldAlert } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function ChapterJoinModal({ isOpen, onClose, initialCode = "" }: Props) {
  const router = useRouter();
  const { joinChapterWithCode } = useStore();
  const { session } = useCurrentUser();

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [errorMsg, setErrorMsg] = useState("");
  const [successChapter, setSuccessChapter] = useState<import("@/types").Chapter | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const result = joinChapterWithCode(inviteCode, session.userId);
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
                Enter your Campus Lead's unique 3-day invite code to directly join your college chapter.
              </p>
            </div>

            <div>
              <FieldLabel>Unique Chapter Invite Code</FieldLabel>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. EKC-9A82F1"
                className="font-mono uppercase font-bold text-center tracking-widest text-lg"
                autoFocus
              />
            </div>

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
              Your account has been successfully assigned to <strong>{successChapter.college || successChapter.name}</strong>. You now have full member access to events, projects, and chapter tools.
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

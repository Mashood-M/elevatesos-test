"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { KeyRound, ArrowRight, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";

function JoinChapterContent() {
  const { joinChapterWithCode } = useStore();
  const { session } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code") || searchParams.get("chapter") || "";

  const [inputCode, setInputCode] = useState(urlCode);
  const [errorMsg, setErrorMsg] = useState("");
  const [successChapter, setSuccessChapter] = useState<import("@/types").Chapter | null>(null);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const result = joinChapterWithCode(inputCode, session.userId);
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
            Enter the unique 3-day invite code provided by your Campus Lead or Class Representative.
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
                <FieldLabel>Unique Invite Code</FieldLabel>
                <Input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EKC-9A82F1"
                  className="font-mono uppercase font-bold text-center tracking-widest text-lg border-white/15 bg-black/40 text-white focus:border-orange-500"
                  autoFocus
                />
              </div>

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
                You are now a registered student member of <strong>{successChapter.college || successChapter.name}</strong>.
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

"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel, Select, TextArea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser, useStore } from "@/context/store-context";
import type { ChapterInviteConfig, CustomFormField } from "@/types";
import { KeyRound, Sparkles, CheckCircle2, ArrowRight, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function ChapterJoinModal({ isOpen, onClose, initialCode = "" }: Props) {
  const { store, submitCustomJoinRequest } = useStore();
  const { profile, session } = useCurrentUser();

  const [step, setStep] = useState<"code" | "form" | "success">(initialCode ? "form" : "code");
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [errorMsg, setErrorMsg] = useState("");

  const [matchedChapterId, setMatchedChapterId] = useState("");
  const [matchedChapterName, setMatchedChapterName] = useState("");
  const [matchedFields, setMatchedFields] = useState<CustomFormField[]>([]);
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});

  const handleVerifyCode = (codeToVerify: string) => {
    setErrorMsg("");
    const cleanCode = codeToVerify.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg("Please enter an invite code.");
      return;
    }

    // Find in configs first
    const config = (store.chapterInviteConfigs ?? []).find(
      (c) => c.code === cleanCode && c.enabled
    );

    let chap = config ? store.chapters.find((c) => c.id === config.chapterId) : undefined;

    // Fallback: match by chapter slug or prefix
    if (!chap) {
      chap = store.chapters.find(
        (c) => c.slug.toUpperCase() === cleanCode || cleanCode.startsWith(c.slug.toUpperCase())
      );
    }

    if (!chap) {
      setErrorMsg("Invalid or expired chapter invite code. Please check with your Campus Lead.");
      return;
    }

    setMatchedChapterId(chap.id);
    setMatchedChapterName(chap.name);

    const customFields = config?.customFields?.length
      ? config.customFields
      : [
          { id: "f-dept", label: "Department / Stream", type: "text", required: true },
          { id: "f-year", label: "Academic Year", type: "text", required: true },
          { id: "f-phone", label: "Contact / WhatsApp", type: "text", required: true },
        ];

    setMatchedFields(customFields as CustomFormField[]);
    setStep("form");
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate required fields
    for (const f of matchedFields) {
      if (f.required && !formAnswers[f.id]?.trim()) {
        setErrorMsg(`Please fill in required field: "${f.label}"`);
        return;
      }
    }

    submitCustomJoinRequest({
      chapterId: matchedChapterId,
      userId: session.userId,
      userName: profile?.fullName || "Student",
      userEmail: profile?.email || "",
      inviteCodeUsed: inviteCode,
      answers: formAnswers,
    });

    setStep("success");
  };

  const handleReset = () => {
    setStep("code");
    setInviteCode("");
    setErrorMsg("");
    setFormAnswers({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleReset} title="Join Chapter">
      <div className="p-6 max-w-lg w-full bg-bg-panel rounded-[18px] border border-[var(--accent)] shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="text-[var(--accent)]" size={20} />
            <h3 className="font-bold text-lg text-text">Join Chapter</h3>
          </div>
          <button onClick={handleReset} className="text-text-dim hover:text-text">
            <X size={18} />
          </button>
        </div>

        {errorMsg ? (
          <div className="rounded-[10px] bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 font-medium">
            {errorMsg}
          </div>
        ) : null}

        {/* STEP 1: Code Verification */}
        {step === "code" && (
          <div className="space-y-4">
            <p className="text-xs text-text-dim leading-relaxed">
              Enter the unique Chapter Invite Code provided by your Campus Lead or Class Representative to join your college chapter.
            </p>

            <div>
              <FieldLabel>Chapter Invite Code</FieldLabel>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. EKC-2026"
                className="font-mono uppercase font-bold text-center tracking-widest text-lg"
                autoFocus
              />
            </div>

            <Button
              variant="orange"
              onClick={() => handleVerifyCode(inviteCode)}
              className="w-full flex items-center justify-center gap-2"
            >
              Verify Code & Continue <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* STEP 2: Custom College Join Form */}
        {step === "form" && (
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="rounded-[12px] bg-bg p-3 border border-border">
              <span className="text-[10px] uppercase font-bold text-orange-400">Joining Chapter</span>
              <h4 className="font-bold text-base text-text">{matchedChapterName}</h4>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <Input value={profile?.fullName || ""} disabled className="bg-bg text-text-dim" />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <Input value={profile?.email || ""} disabled className="bg-bg text-text-dim" />
              </div>

              {matchedFields.map((field) => (
                <div key={field.id}>
                  <FieldLabel>
                    {field.label} {field.required ? <span className="text-orange-400">*</span> : null}
                  </FieldLabel>
                  {field.type === "textarea" ? (
                    <TextArea
                      rows={3}
                      value={formAnswers[field.id] || ""}
                      onChange={(e) =>
                        setFormAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "select" && field.options?.length ? (
                    <Select
                      value={formAnswers[field.id] || ""}
                      onChange={(e) =>
                        setFormAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                    >
                      <option value="">Select option...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={formAnswers[field.id] || ""}
                      onChange={(e) =>
                        setFormAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setStep("code")} className="w-1/3">
                Back
              </Button>
              <Button variant="orange" type="submit" className="w-2/3">
                Submit Join Request
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === "success" && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-green-400" />
            <h4 className="font-bold text-lg text-text">Join Request Submitted!</h4>
            <p className="text-xs text-text-dim leading-relaxed max-w-xs mx-auto">
              Your request and custom form details have been sent to the <strong>{matchedChapterName}</strong> Campus Lead. You will be notified once approved.
            </p>
            <Button variant="primary" onClick={handleReset} className="px-6">
              Done
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

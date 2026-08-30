"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel, Select, TextArea } from "@/components/ui/input";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import type { ChapterInviteConfig, CustomFormField } from "@/types";
import { Copy, Plus, Trash2, Check, Sparkles, Link2 } from "lucide-react";

interface Props {
  chapterId: string;
  chapterSlug: string;
  collegeName: string;
}

const DEFAULT_FIELDS: CustomFormField[] = [
  {
    id: "f-dept",
    label: "Department / Stream",
    type: "select",
    required: true,
    options: ["Computer Science", "Information Technology", "Electronics & Comm", "Electrical & Electronics", "Mechanical", "Civil", "Other"],
  },
  {
    id: "f-year",
    label: "Academic Year",
    type: "select",
    required: true,
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"],
  },
  {
    id: "f-phone",
    label: "WhatsApp / Contact Number",
    type: "text",
    required: true,
    placeholder: "+91 90000 00000",
  },
  {
    id: "f-motivation",
    label: "Why do you want to join this chapter?",
    type: "textarea",
    required: false,
    placeholder: "Share your goals and interests...",
  },
];

export function ChapterFormBuilder({ chapterId, chapterSlug, collegeName }: Props) {
  const { store, saveChapterInviteConfig } = useStore();
  const existingConfig = (store.chapterInviteConfigs ?? []).find(
    (c) => c.chapterId === chapterId
  );

  const defaultCode = `${chapterSlug.toUpperCase()}-2026`;

  const [code, setCode] = useState(existingConfig?.code || defaultCode);
  const [enabled, setEnabled] = useState(existingConfig?.enabled ?? true);
  const [fields, setFields] = useState<CustomFormField[]>(
    existingConfig?.customFields?.length ? existingConfig.customFields : DEFAULT_FIELDS
  );

  const [flashMsg, setFlashMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // New field constructor state
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"text" | "textarea" | "select" | "number">("text");
  const [newRequired, setNewRequired] = useState(true);
  const [newOptions, setNewOptions] = useState("");

  const directLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${code}`
      : `/join?code=${code}`;

  const handleSave = () => {
    if (!code.trim()) {
      setFlashMsg("Please enter an invite code.");
      return;
    }
    saveChapterInviteConfig(chapterId, code.trim(), enabled, fields);
    setFlashMsg("✓ Custom Join Form & Invite Code saved successfully!");
    setTimeout(() => setFlashMsg(""), 3500);
  };

  const handleAddField = () => {
    if (!newLabel.trim()) return;
    const opts =
      newType === "select"
        ? newOptions.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const created: CustomFormField = {
      id: `f-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      options: opts,
    };

    setFields((prev) => [...prev, created]);
    setNewLabel("");
    setNewOptions("");
    setNewType("text");
    setNewRequired(true);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TerminalPanel title="Chapter Invite & Custom Join Form Builder" accent="orange">
      <div className="space-y-6">
        <p className="text-[13px] text-text-dim leading-relaxed">
          Create a customized onboarding form for <strong>{collegeName}</strong>. Students can submit their join requests using your custom invite code or direct link.
        </p>

        {flashMsg ? (
          <div className="rounded-[10px] bg-orange-500/10 border border-orange-500/30 p-3 text-xs font-semibold text-orange-300">
            {flashMsg}
          </div>
        ) : null}

        {/* Invite Code & Direct Link Configuration */}
        <div className="grid gap-4 rounded-[14px] bg-bg p-4 border border-border">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Invite Code & Direct Link
            </h4>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-gray-700 bg-black text-orange-500"
              />
              <span className="font-semibold text-text">Enable Invite Code</span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Unique Chapter Invite Code</FieldLabel>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EKC-2026"
                className="font-mono uppercase font-bold"
              />
            </div>
            <div>
              <FieldLabel>Direct Student Join Link</FieldLabel>
              <div className="flex gap-2">
                <Input value={directLink} readOnly className="font-mono text-xs text-text-dim" />
                <Button variant="secondary" onClick={handleCopyLink} className="shrink-0 text-xs">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Form Fields Builder (Google Forms Style) */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-dim">
            Form Questions & Fields ({fields.length})
          </h4>

          <div className="space-y-3">
            {fields.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-[12px] bg-bg p-3 border border-border/80"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-mute">#{idx + 1}</span>
                    <span className="font-semibold text-sm text-text">{f.label}</span>
                    {f.required ? (
                      <Badge tone="orange" className="text-[10px]">Required</Badge>
                    ) : (
                      <Badge tone="mute" className="text-[10px]">Optional</Badge>
                    )}
                    <Badge tone="cyan" className="text-[10px] uppercase">{f.type}</Badge>
                  </div>
                  {f.options?.length ? (
                    <p className="text-[11px] text-text-dim">Options: {f.options.join(", ")}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleRemoveField(f.id)}
                  className="text-red-400 hover:text-red-300 p-1 h-auto"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Field Box */}
          <div className="rounded-[14px] bg-bg p-4 border border-dashed border-border space-y-3">
            <h5 className="text-xs font-semibold text-text flex items-center gap-1.5">
              <Plus size={14} /> Add New Custom Question / Field
            </h5>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <FieldLabel>Question / Label</FieldLabel>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Roll Number / LinkedIn Profile"
                />
              </div>
              <div>
                <FieldLabel>Field Type</FieldLabel>
                <Select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                >
                  <option value="text">Short Text</option>
                  <option value="textarea">Paragraph / Long Text</option>
                  <option value="select">Dropdown Options</option>
                  <option value="number">Number</option>
                </Select>
              </div>
            </div>

            {newType === "select" ? (
              <div>
                <FieldLabel>Dropdown Options (comma separated)</FieldLabel>
                <Input
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="e.g. Option 1, Option 2, Option 3"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded border-gray-700 bg-black text-orange-500"
                />
                <span>Required Field</span>
              </label>
              <Button variant="secondary" onClick={handleAddField} className="text-xs">
                Add Question
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="orange" onClick={handleSave} className="px-6">
            Save Form & Invite Link
          </Button>
        </div>
      </div>
    </TerminalPanel>
  );
}

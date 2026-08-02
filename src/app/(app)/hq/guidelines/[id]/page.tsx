"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { GuidelineStatus } from "@/types";

const STATUSES: GuidelineStatus[] = ["draft", "published", "archived"];

function statusTone(
  status: GuidelineStatus,
): "mute" | "green" | "orange" {
  if (status === "published") return "green";
  if (status === "draft") return "orange";
  return "mute";
}

function parseSections(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function HqGuidelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const { store, updateGuideline, deleteGuideline } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const canManage = hasPermission(store, session.roleKey, "org.manage");

  const doc = useMemo(
    () => (store.guidelines ?? []).find((g) => g.id === id),
    [store.guidelines, id],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    category: "",
    version: "",
    summary: "",
    sectionsText: "",
    body: "",
    status: "published" as GuidelineStatus,
    relatedHref: "",
  });

  function openEdit() {
    if (!doc) return;
    setDraft({
      title: doc.title,
      category: doc.category,
      version: doc.version,
      summary: doc.summary,
      sectionsText: doc.sections.join("\n"),
      body: doc.body,
      status: doc.status,
      relatedHref: doc.relatedHref ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function save() {
    if (!doc) return;
    setFormError("");
    if (!draft.title.trim() || !draft.category.trim() || !draft.body.trim()) {
      setFormError("Title, category, and body are required.");
      return;
    }
    const ok = updateGuideline(doc.id, {
      title: draft.title,
      category: draft.category,
      version: draft.version,
      summary: draft.summary,
      sections: parseSections(draft.sectionsText),
      body: draft.body,
      status: draft.status,
      relatedHref: draft.relatedHref.trim() || undefined,
    });
    if (!ok) {
      setFormError("Could not save.");
      return;
    }
    setDialogOpen(false);
    setFlash("Saved");
    window.setTimeout(() => setFlash(""), 1600);
  }

  async function remove() {
    if (!doc) return;
    const ok = await confirm({
      title: "Delete guideline",
      description: `Delete “${doc.title}”? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteGuideline(doc.id);
    router.push("/hq/guidelines");
  }

  if (!doc) {
    return (
      <div>
        <PageHeader
          eyebrow="Library"
          title="Guideline not found"
          description="This policy may have been deleted or is not in the demo store."
          actions={
            <Link href="/hq/guidelines">
              <Button type="button" variant="ghost">
                Back to guidelines
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const author =
    store.profiles.find((p) => p.id === doc.updatedBy)?.fullName ??
    doc.updatedBy;

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title={doc.title}
        description={doc.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="text-[12px] text-[var(--accent)]">{flash}</span>
            ) : null}
            <Link href="/hq/guidelines">
              <Button type="button" variant="ghost">
                Back
              </Button>
            </Link>
            {doc.relatedHref ? (
              <Link href={doc.relatedHref}>
                <Button type="button" variant="ghost">
                  {doc.relatedHref === "/hq/brand"
                    ? "Open brand kit"
                    : "Related link"}
                </Button>
              </Link>
            ) : null}
            {canManage ? (
              <>
                <Button type="button" variant="orange" onClick={openEdit}>
                  Edit
                </Button>
                <Button type="button" variant="danger" onClick={() => void remove()}>
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <TerminalPanel
        title="Document"
        meta={`${doc.version} · ${doc.status}`}
        action={
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="cyan">{doc.category}</Badge>
            <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
          </div>
        }
      >
        <p className="text-[12px] text-text-mute">
          Updated {formatDateTime(doc.updatedAt)} · {author}
        </p>

        {doc.sections.length ? (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold text-text">Sections</h3>
            <ul className="mt-2 space-y-1 text-[13px] text-text-dim">
              {doc.sections.map((s) => (
                <li key={s}>— {s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-[13px] font-semibold text-text">Full document</h3>
          <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-text-dim">
            {doc.body}
          </div>
        </div>
      </TerminalPanel>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Edit guideline"
        description="Update this policy document."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Input
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, category: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Version</FieldLabel>
              <Input
                value={draft.version}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, version: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as GuidelineStatus,
                }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Summary</FieldLabel>
            <TextArea
              value={draft.summary}
              onChange={(e) =>
                setDraft((d) => ({ ...d, summary: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div>
            <FieldLabel>Sections (one per line)</FieldLabel>
            <TextArea
              value={draft.sectionsText}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sectionsText: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div>
            <FieldLabel>Body</FieldLabel>
            <TextArea
              value={draft.body}
              onChange={(e) =>
                setDraft((d) => ({ ...d, body: e.target.value }))
              }
              rows={8}
            />
          </div>
          <div>
            <FieldLabel>Related link (optional)</FieldLabel>
            <Input
              value={draft.relatedHref}
              onChange={(e) =>
                setDraft((d) => ({ ...d, relatedHref: e.target.value }))
              }
            />
          </div>
          {formError ? (
            <p className="text-[12px] text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";

export default function ChapterFormsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { store, createForm, deleteForm, duplicateForm } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    isExecutiveRole(session.roleKey);

  const forms = useMemo(() => {
    if (!chapter) return [];
    return (store.forms ?? []).filter((f) => f.chapterId === chapter.id);
  }, [store.forms, chapter]);

  if (!chapter) {
    return <p className="text-orange">// Chapter not found</p>;
  }

  function handleCreate() {
    const form = createForm({
      chapterId: chapter!.id,
      purpose: "custom",
      title: "Untitled form",
      status: "draft",
    });
    router.push(`/chapter/${slug}/forms/${form.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Forms"
        description="Google Forms–style builder for registration, feedback, and chapter surveys."
        actions={
          canManage ? (
            <Button variant="primary" onClick={handleCreate}>
              New form
            </Button>
          ) : null
        }
      />

      {!forms.length ? (
        <TerminalPanel title="empty">
          <p className="text-sm text-text-dim">
            No forms yet.
            {canManage
              ? " Create one, or open an event and attach a registration form."
              : " Ask an executive when a survey opens."}
          </p>
        </TerminalPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((form) => {
            const event = form.eventId
              ? store.events.find((e) => e.id === form.eventId)
              : undefined;
            const count = (store.formResponses ?? []).filter(
              (r) => r.formId === form.id,
            ).length;
            return (
              <TerminalPanel
                key={form.id}
                title={form.purpose}
                meta={form.status}
                accent={form.status === "open" ? "orange" : "green"}
              >
                <Link
                  href={`/chapter/${slug}/forms/${form.id}`}
                  className="block"
                >
                  <h3 className="font-display text-lg font-bold hover:text-[var(--accent)]">
                    {form.title}
                  </h3>
                </Link>
                {form.description ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-text-dim">
                    {form.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    tone={
                      form.status === "open"
                        ? "orange"
                        : form.status === "closed"
                          ? "mute"
                          : "green"
                    }
                  >
                    {form.status}
                  </Badge>
                  <Badge tone="mute">{form.purpose}</Badge>
                  <Badge tone="cyan">
                    {count} response{count === 1 ? "" : "s"}
                  </Badge>
                </div>
                {event ? (
                  <p className="mt-2 text-[12px] text-text-dim">
                    Event:{" "}
                    <Link
                      href={`/chapter/${slug}/events/${event.id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {event.title}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] text-text-dim">Standalone</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/chapter/${slug}/forms/${form.id}`}>
                    <Button variant="primary">
                      {canManage ? "Open builder" : "View"}
                    </Button>
                  </Link>
                  {form.status === "open" ? (
                    <Link href={`/chapter/${slug}/forms/${form.id}/fill`}>
                      <Button variant="orange">Fill</Button>
                    </Link>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const copy = duplicateForm(form.id);
                          if (copy) {
                            router.push(`/chapter/${slug}/forms/${copy.id}`);
                          }
                        }}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (
                            window.confirm(`Delete “${form.title}”?`)
                          ) {
                            deleteForm(form.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </TerminalPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

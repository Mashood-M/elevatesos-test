"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/store-context";
import { formatDate } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const statusFlow: TaskStatus[] = ["pending", "in_progress", "completed"];
const statusTone = {
  pending: "orange" as const,
  in_progress: "cyan" as const,
  completed: "green" as const,
};

export default function ChapterTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, updateTaskStatus } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const tasks = store.tasks.filter((t) => t.chapterId === chapter.id);

  function advanceStatus(current: TaskStatus) {
    const idx = statusFlow.indexOf(current);
    return statusFlow[Math.min(idx + 1, statusFlow.length - 1)];
  }

  return (
    <div>
      <PageHeader
        title="Task Board"
        description="Event and chapter operations — venue, marketing, registration, certificates, documentation."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {statusFlow.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <TerminalPanel key={status} title={status.replace("_", ".")} meta={`${column.length} tasks`} accent={statusTone[status]}>
              <ul className="space-y-3">
                {column.map((task) => {
                  const assignee = store.profiles.find((p) => p.id === task.assigneeId);
                  const event = store.events.find((e) => e.id === task.eventId);
                  return (
                    <li key={task.id} className="border border-border bg-bg p-3">
                      <p className="font-bold text-[12px]">{task.title}</p>
                      <p className="mt-1 text-[10px] text-text-mute">
                        {task.category} · due {formatDate(task.dueDate)}
                      </p>
                      {event ? (
                        <p className="mt-1 text-[10px] text-magenta">{event.title}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-cyan">{assignee?.fullName}</p>
                      {status !== "completed" ? (
                        <Button
                          variant="ghost"
                          className="mt-2 w-full"
                          onClick={() => updateTaskStatus(task.id, advanceStatus(task.status))}
                        >
                          → {advanceStatus(task.status).replace("_", " ")}
                        </Button>
                      ) : (
                        <Badge tone="green" className="mt-2">done</Badge>
                      )}
                    </li>
                  );
                })}
                {column.length === 0 ? (
                  <li className="text-[11px] text-text-mute">// empty</li>
                ) : null}
              </ul>
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useStore } from "@/context/store-context";

export default function WorkflowsPage() {
  const { store } = useStore();
  const chapterSlug = store.chapters[0]?.slug ?? "";

  const demoLoops = [
    {
      id: "event-loop",
      title: "Event loop",
      persona: "Secretary → Student → CR → Attendance",
      steps: [
        { label: "Create draft", detail: "Chapter → Events → New event (or Calendar create)" },
        { label: "Publish", detail: "Event detail → Publish opens registration" },
        { label: "Register", detail: "Student → Register CTA / public form link" },
        { label: "CR review", detail: "Class rep reviews registrations on the event page" },
        { label: "Secretary approve", detail: "Secretary approves → QR minted for check-in" },
        { label: "Check-in + cert", detail: "Attendance QR/manual → Issue cert → verify" },
      ],
      href: chapterSlug ? `/chapter/${chapterSlug}/events` : "/chapter",
    },
    {
      id: "forms-loop",
      title: "Forms loop",
      persona: "Secretary → Student",
      steps: [
        { label: "Forms hub", detail: "Chapter → Forms → New form or open survey" },
        { label: "Questions", detail: "Add rating, linear scale, MCQ, sections" },
        { label: "Preview / fill", detail: "Preview tab or public-style fill link" },
        { label: "Responses + Summary", detail: "Spreadsheet table, CSV, bar charts" },
      ],
      href: chapterSlug ? `/chapter/${chapterSlug}/forms` : "/chapter",
    },
    {
      id: "ops-loop",
      title: "Ops loop",
      persona: "Executive → HQ",
      steps: [
        { label: "Tasks", detail: "Update task status on chapter tasks" },
        { label: "Announce", detail: "Publish a chapter announcement" },
        { label: "Submit report", detail: "New report → submitted to HQ" },
        { label: "HQ approve", detail: "Founder/HQ Admin approves with comment" },
      ],
      href: chapterSlug ? `/chapter/${chapterSlug}/tasks` : "/chapter",
    },
    {
      id: "org-loop",
      title: "Org loop",
      persona: "Founder (HQ)",
      steps: [
        { label: "Create chapter", detail: "HQ → Chapters → create form" },
        { label: "See on dashboard", detail: "Network overview lists the new chapter" },
        { label: "Open chapter", detail: "Click through into the chapter home" },
      ],
      href: "/hq/chapters",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="More"
        title="Demo loops"
        description="Three flagship paths that mutate the demo store. Switch persona as you go. State persists in this browser tab."
      />

      <div className="space-y-6">
        {demoLoops.map((loop) => (
          <TerminalPanel
            key={loop.id}
            title={loop.title}
            meta={loop.persona}
            action={
              <Link href={loop.href}>
                <Button variant="orange" className="h-8">
                  Start
                </Button>
              </Link>
            }
          >
            <ol className="space-y-3">
              {loop.steps.map((step, i) => (
                <li key={step.label} className="flex gap-3">
                  <Badge tone="mute" className="h-6 shrink-0">
                    {i + 1}
                  </Badge>
                  <div>
                    <p className="text-[13px] font-semibold">{step.label}</p>
                    <p className="text-[12px] text-text-dim">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </TerminalPanel>
        ))}
      </div>
    </div>
  );
}

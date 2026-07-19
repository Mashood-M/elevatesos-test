"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "@/components/ui/ticket-card";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore } from "@/context/store-context";

export default function DesignSystemPage() {
  const { store } = useStore();
  const sampleEvent = store.events[0];
  const [progress, setProgress] = useState(68);

  return (
    <div>
      <PageHeader
        title="Design system"
        description="Restrained product UI: cool canvas, charcoal ink, Elevates orange accent. See DESIGN.md."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Components" value={12} hint="Core UI kit" />
        <Stat
          label="Brand colors"
          value={4}
          hint="orange · charcoal · sage · indigo"
        />
        <Stat label="Ticket events" value={store.events.length} />
        <Stat label="Health target" value="90+" hint="Chapter excellence" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Buttons">
          <p className="mb-4 text-[13px] text-text-dim">
            Charcoal for primary product actions. Orange for brand CTAs.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="orange">Orange</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="magenta">Indigo</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">Registration open</Badge>
            <Badge tone="magenta">HQ review</Badge>
            <Badge tone="green">Approved</Badge>
            <Badge tone="orange">Pending</Badge>
            <Badge tone="mute">Archived</Badge>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Forms" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Event title</FieldLabel>
              <Input placeholder="IoT Hands-On" defaultValue="Build-A-Thon" />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select defaultValue="workshop">
                <option value="workshop">Industry Workshop</option>
                <option value="hackathon">Hackathon</option>
                <option value="challenge">Challenge</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextArea rows={3} placeholder="What students will build." />
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Progress">
          <ProgressBar value={progress} label="Demo load" />
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setProgress((p) => Math.max(0, p - 10))}
            >
              −10
            </Button>
            <Button
              variant="primary"
              onClick={() => setProgress((p) => Math.min(100, p + 10))}
            >
              +10
            </Button>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Tokens">
          <ul className="space-y-2 text-[13px] text-text-dim">
            <li>
              <span className="font-semibold text-[var(--accent)]">#f26430</span>{" "}
              — accent
            </li>
            <li>
              <span className="font-semibold text-[var(--secondary)]">
                #414066
              </span>{" "}
              — indigo secondary
            </li>
            <li>
              <span className="font-semibold text-[var(--success)]">#758173</span>{" "}
              — sage success
            </li>
            <li>
              <span className="font-semibold text-text">#2d2d34</span> — charcoal
            </li>
            <li className="pt-1 text-text-mute">
              Canvas cool zinc · Syne + IBM Plex · border-only cards
            </li>
          </ul>
        </TerminalPanel>
      </div>

      {sampleEvent ? (
        <div className="mt-4">
          <TerminalPanel title="Ticket card" meta="store.events[0]">
            <TicketCard event={sampleEvent} />
          </TerminalPanel>
        </div>
      ) : null}
    </div>
  );
}

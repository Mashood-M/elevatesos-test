"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";

const policies = [
  {
    id: "pol-1",
    title: "Chapter Onboarding SOP",
    category: "Operations",
    version: "v2.1",
    summary: "Step-by-step guide for launching a new chapter — faculty liaison, executive election, first event.",
    sections: ["Faculty appointment", "Executive roster", "Cluster setup", "First workshop"],
  },
  {
    id: "pol-2",
    title: "Event Approval Workflow",
    category: "Events",
    version: "v3.0",
    summary: "Draft → Faculty approval → Registration open → Attendance → Report → Certificate.",
    sections: ["Faculty sign-off required", "Capacity limits", "Cross-chapter visibility rules"],
  },
  {
    id: "pol-3",
    title: "Registration & Attendance Policy",
    category: "Members",
    version: "v1.4",
    summary: "Two-step registration: Representative review, then Secretary approval. QR check-in at venue.",
    sections: ["CR review queue", "Secretary approval", "Waitlist handling", "Certificate eligibility"],
  },
  {
    id: "pol-4",
    title: "Leadership Handover Guide",
    category: "Governance",
    version: "v1.0",
    summary: "End-of-term checklist — document handover notes, transfer permissions, archive reports.",
    sections: ["Handover notes field", "Role reassignment", "Audit trail"],
  },
  {
    id: "pol-5",
    title: "Brand & Communications",
    category: "Brand",
    version: "v2.0",
    summary: "Use official logo pack. Poster templates in resource library. No unauthorized sponsor claims.",
    sections: ["Logo usage", "Social media templates", "Sponsor deck approval"],
  },
  {
    id: "pol-6",
    title: "Report Submission Standards",
    category: "Reporting",
    version: "v1.2",
    summary: "Monthly reports due by 5th. Event reports within 72 hours. HQ review with comments.",
    sections: ["Report types", "Submission deadlines", "HQ approval flow"],
  },
];

export default function HqGuidelinesPage() {
  return (
    <div>
      <PageHeader
        title="Policies & Guidelines"
        description="Official Elevates OS documentation — SOPs, workflows, and governance policies for chapters and HQ."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((doc) => (
          <TerminalPanel key={doc.id} title={doc.id} meta={doc.version}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{doc.title}</h3>
              <Badge tone="cyan">{doc.category}</Badge>
            </div>
            <p className="mt-2 text-[12px] text-text-dim">{doc.summary}</p>
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-[11px]">
              {doc.sections.map((s) => (
                <li key={s} className="text-green">✓ {s}</li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-text-mute cursor-pointer hover:text-cyan">
              // Read full document →
            </p>
          </TerminalPanel>
        ))}
      </div>
    </div>
  );
}

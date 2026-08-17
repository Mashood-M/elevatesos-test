"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit,
  FileText,
  HelpCircle,
  Layers,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OfferItem {
  id: string;
  level: string;
  title: string;
  subtitle: string;
  desc: string;
  commitment: string;
  idealFor: string;
}

interface BenefitItem {
  category: string;
  target: string;
  problem: string;
  solution: string;
  document: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface TimelineItem {
  period: string;
  title: string;
  desc: string;
}

interface UniversityLookupItem {
  id: string;
  university: string;
  coverage: string;
  leverTitle: string;
  description: string;
  group1: string;
  group2: string;
  group3: string;
  adminValue: string;
}

const DEFAULT_OFFERS: OfferItem[] = [
  {
    id: "workshop",
    level: "01",
    title: "Single Workshop",
    subtitle: "Zero Franchise Fee • High Impact",
    desc: "A hands-on technical or design workshop delivered by ELEVATES mentors on your campus. We handle curriculum, tools, and technical delivery.",
    commitment: "Access to a lab/seminar hall for 3-4 hours.",
    idealFor: "Testing student interest without long-term commitment.",
  },
  {
    id: "event-ops",
    level: "02",
    title: "Full Event Operations",
    subtitle: "We Plan It. We Run It. We Bring the Guest.",
    desc: "Complete end-to-end management for association relaunches, technical fests, or department days. Includes chief guest invitation, stage ops, and live building demos.",
    commitment: "Auditorium reservation + guest TA/hospitality via department fund.",
    idealFor: "Department HODs needing a seamless, high-visibility event.",
  },
  {
    id: "iedc-trade",
    level: "03",
    title: "IEDC Programme Calendar",
    subtitle: "You Have the Mandate. We Have the Calendar.",
    desc: "Co-host our 13-programme technical calendar under your IEDC banner. Fulfill KSUM KPIs, generate annual report proof, and build innovation outcomes.",
    commitment: "IEDC Nodal Officer partnership + venue + IEDC workshop allocation.",
    idealFor: "IEDC Nodal Officers seeking active programming across campuses.",
  },
  {
    id: "full-chapter",
    level: "04",
    title: "Full Campus Chapter",
    subtitle: "Permanent Innovation Ecosystem",
    desc: "Establish ELEVATES Chapter #02 on your campus. Includes structured 25-student cohorts per term, learning clusters, faculty coordinator oversight, and HQ playbook.",
    commitment: "Faculty Coordinator + dedicated space + MOU + student support fund.",
    idealFor: "Principals & Directors wanting long-term accreditation proof.",
  },
];

const DEFAULT_FAQS: FAQItem[] = [
  {
    question: "How does funding work for ELEVATES chapters and campus events?",
    answer: "ELEVATES charges zero commercial or franchise fees to the college or students. All core platform infrastructure, playbooks, and community frameworks are free. For campus events, standard operational funds (such as guest speaker travel allowance/TA or hospitality) are allocated directly by the college/department or IEDC funds out of heads the institution already holds.",
  },
  {
    question: "Which budget heads do colleges use to fund event operational expenses?",
    answer: "Colleges typically spend from existing heads already collected for this purpose: (1) Department Association Fund collected in published fee structures, (2) IEDC KSUM Activity Budget for KSUM KPIs, (3) PTA Discretionary Fund, or (4) IQAC Quality Initiative Head for NAAC activities.",
  },
  {
    question: "What specifically is required from the college administration?",
    answer: "Four practical things: (1) Seminar hall or computer lab access, (2) One named Faculty Coordinator, (3) Permission to co-brand event announcements, and (4) Standard department or IEDC allocation for guest travel allowance (TA) when organizing major events.",
  },
  {
    question: "How does ELEVATES adapt to different universities in Kerala (KTU, Calicut, MG, Kerala)?",
    answer: "For KTU colleges, our project clusters fill Group III Activity Points (startups, patents, shipped projects). For Calicut/MG/Kerala Four-Year Programmes (FYUGP 2024), we provide project proof for Skill Enhancement Courses, mandatory internships, and research projects.",
  },
];

const DEFAULT_TIMELINE: TimelineItem[] = [
  {
    period: "Month 01 (Days 1–30)",
    title: "Foundation & First Workshop",
    desc: "Faculty coordinator appointment, room allocation, and first hands-on workshop (120+ seats).",
  },
  {
    period: "Month 02 (Days 31–60)",
    title: "Peer Lab Cohorts & First Campus Platform",
    desc: "Launching 3 Peer Lab cohorts and specifying the first student-built software platform for the campus.",
  },
  {
    period: "Month 03 (Days 61–90)",
    title: "Independence, NAAC File & Leadership Handover",
    desc: "First term outcomes file generated for IQAC/NAAC accreditation and junior team leadership training.",
  },
];

export default function ForCollegesCMSPage() {
  const [tab, setTab] = useState<"offers" | "faqs" | "timeline">("offers");
  const [offers, setOffers] = useState<OfferItem[]>(DEFAULT_OFFERS);
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);
  const [timeline, setTimeline] = useState<TimelineItem[]>(DEFAULT_TIMELINE);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = () => {
    setSaveStatus("For Colleges CMS changes synced!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="For Colleges & Institutional Partnerships"
        description="Manage the 4 institutional engagement tiers, 90-day rollout roadmap, accreditation university lookups (KTU, FYUGP), and FAQs on elevates.live/for-colleges"
        actions={
          <Button size="sm" variant="orange" onClick={handleSave}>
            <Save size={13} /> Save Changes
          </Button>
        }
      />

      {saveStatus && (
        <div className="rounded-[var(--radius-md)] border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-500 flex items-center gap-2">
          <CheckCircle2 size={14} /> {saveStatus}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex gap-0 border-b border-border">
        {[
          { key: "offers", label: "4 Engagement Tiers (Offers)" },
          { key: "timeline", label: "First 90 Days Roadmap" },
          { key: "faqs", label: "Institutional FAQs & Accreditation" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--accent)] text-text"
                : "border-transparent text-text-dim hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Offers / Tiers Tab */}
      {tab === "offers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 hover:border-border-hover transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-white bg-[var(--accent)] px-2 py-0.5 rounded-sm">
                      LEVEL {offer.level}
                    </span>
                    <Badge tone="mute">{offer.id}</Badge>
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-[var(--accent)] font-semibold mb-2">{offer.subtitle}</p>
                  <p className="text-xs text-text-dim leading-relaxed mb-4">{offer.desc}</p>
                  <div className="text-[11px] font-mono bg-bg-page border border-border rounded-[var(--radius-md)] p-2.5 space-y-1 text-text-dim mb-4">
                    <p><strong className="text-text">College Commitment:</strong> {offer.commitment}</p>
                    <p><strong className="text-text">Ideal For:</strong> {offer.idealFor}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="secondary" size="sm" onClick={() => setEditingOffer(offer)}>
                    <Edit size={13} /> Edit Tier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {tab === "timeline" && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text">
              First 90-Day Campus Rollout Milestones
            </h3>
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="p-4 rounded-[var(--radius-md)] border border-border bg-bg-page flex items-start gap-4">
                  <span className="font-mono text-xs font-bold text-[var(--accent)] shrink-0 pt-0.5">
                    {item.period}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text mb-1">{item.title}</h4>
                    <p className="text-xs text-text-dim leading-relaxed">{item.desc}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--danger)] shrink-0"
                    onClick={() => setTimeline((prev) => prev.filter((_, j) => j !== idx))}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setTimeline((prev) => [
                  ...prev,
                  { period: "Month 04 (Days 91–120)", title: "New Phase", desc: "Description..." },
                ])
              }
            >
              <Plus size={13} /> Add Milestone
            </Button>
          </div>
        </div>
      )}

      {/* FAQs Tab */}
      {tab === "faqs" && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                Accreditation & Institutional FAQs ({faqs.length})
              </h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setFaqs((prev) => [
                    ...prev,
                    { question: "New FAQ Question?", answer: "Detailed answer..." },
                  ])
                }
              >
                <Plus size={13} /> Add FAQ
              </Button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      className="h-8 flex-1 font-bold text-xs text-text bg-transparent border-b border-border focus:border-[var(--accent)] outline-none px-1"
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...faqs];
                        next[idx].question = e.target.value;
                        setFaqs(next);
                      }}
                    />
                    <button
                      onClick={() => setFaqs((prev) => prev.filter((_, j) => j !== idx))}
                      className="text-text-dim hover:text-red-500 p-1 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
                    value={faq.answer}
                    onChange={(e) => {
                      const next = [...faqs];
                      next[idx].answer = e.target.value;
                      setFaqs(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Offer Editor Modal */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text">Edit Engagement Tier</h3>
              <button onClick={() => setEditingOffer(null)} className="text-text-dim hover:text-text"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text-dim block mb-1">Title</label>
                <Input
                  value={editingOffer.title}
                  onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-text-dim block mb-1">Subtitle / Value Proposition</label>
                <Input
                  value={editingOffer.subtitle}
                  onChange={(e) => setEditingOffer({ ...editingOffer, subtitle: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-text-dim block mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
                  value={editingOffer.desc}
                  onChange={(e) => setEditingOffer({ ...editingOffer, desc: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-text-dim block mb-1">College Commitment Required</label>
                <Input
                  value={editingOffer.commitment}
                  onChange={(e) => setEditingOffer({ ...editingOffer, commitment: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-text-dim block mb-1">Ideal For (Target Stakeholder)</label>
                <Input
                  value={editingOffer.idealFor}
                  onChange={(e) => setEditingOffer({ ...editingOffer, idealFor: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingOffer(null)}>Cancel</Button>
              <Button
                variant="orange"
                size="sm"
                onClick={() => {
                  setOffers((prev) => prev.map((o) => (o.id === editingOffer.id ? editingOffer : o)));
                  setEditingOffer(null);
                }}
              >
                Save Tier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

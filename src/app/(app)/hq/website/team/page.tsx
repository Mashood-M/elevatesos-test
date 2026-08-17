"use client";

import { useState } from "react";
import {
  Edit, ExternalLink, Plus, Search, Trash2, X, Users, User, GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types exactly matching src/data/team/founders.ts on Elevates Web ─────────
interface Founder {
  id: string;
  name: string;
  tag: string;       // e.g. "Main Class Bunker" — the authentic persona badge
  role: string;      // e.g. "Founder"
  proof: string;     // e.g. "Full-stack · Built elevates.live"
  linkedin?: string;
  cohort: "2025-26";
  image: string;     // e.g. /images/founders/sarhan-qadir.jpeg
}

// ── Types exactly matching src/data/team/advisors.ts ─────────────────────────
interface Advisor {
  id: string;
  name: string;
  role: string;
  institution: string;
  linkedin?: string;
  image?: string;
}

const DEFAULT_FOUNDERS: Founder[] = [
  { id: "sarhan-qadir-kvm", name: "Sarhan Qadir KVM", tag: "Main Class Bunker", role: "Founder", proof: "Full-stack · Built elevates.live", linkedin: "https://www.linkedin.com/in/sqadirkvm/", cohort: "2025-26", image: "/images/founders/sarhan-qadir.jpeg" },
  { id: "naseem-shan", name: "Naseem Shan", tag: "Studies In Silence", role: "Founder", proof: "Backend · Systems & Infrastructure", linkedin: "https://www.linkedin.com/in/naseem-shan-b5039a255/", cohort: "2025-26", image: "/images/founders/naseem-shan.jpeg" },
  { id: "muhammed-nafih-p", name: "Muhammed Nafih P", tag: "Design Wizard", role: "Founder", proof: "Design · Aaroh brand and UI", linkedin: "https://www.linkedin.com/in/muhammed-nafih-8777a2282/", cohort: "2025-26", image: "/images/founders/nafih.jpeg" },
  { id: "anil-das-p", name: "Anil Das P", tag: "Last Minute Committer", role: "Founder", proof: "Development · Ships right before deadline", linkedin: "https://www.linkedin.com/in/anildasp/", cohort: "2025-26", image: "/images/founders/anil-das.jpeg" },
  { id: "nadheem-roshan", name: "Nadheem Roshan", tag: "Coming for 75% Attendance", role: "Founder", proof: "IoT · Hardware & Embedded Systems", linkedin: "https://www.linkedin.com/in/nadheem-roshan-aa417427a/", cohort: "2025-26", image: "/images/founders/nadheem.jpg" },
  { id: "muhammed-shanif-p", name: "Muhammed Shanif P", tag: "Hardware Hacker", role: "Founder", proof: "Embedded · Vibranium RFID check-in", linkedin: "https://www.linkedin.com/in/muhammed-shanif-p-52865a27a/", cohort: "2025-26", image: "/images/founders/shanif.jpeg" },
  { id: "adhinan-k", name: "Adhinan K", tag: "Terminal Addict", role: "Founder", proof: "DevOps · Linux & server infrastructure", linkedin: "https://www.linkedin.com/in/adhinan-k-48b65927a/", cohort: "2025-26", image: "/images/founders/adhinan.png" },
  { id: "mashood-m", name: "Mashood M", tag: "Unfinished Project Collector", role: "Founder", proof: "Development · Multiple ambitious WIPs", linkedin: "https://www.linkedin.com/in/mashood-m-5516b71a7/", cohort: "2025-26", image: "/images/founders/mashood.jpeg" },
  { id: "mohammed-shahin-ek", name: "Mohammed Shahin E K", tag: "Late Night Shipper", role: "Founder", proof: "Backend · 400k requests, zero downtime", linkedin: "https://www.linkedin.com/in/shahinek/", cohort: "2025-26", image: "/images/founders/shahin-ek.jpeg" },
  { id: "shifna-kp", name: "Shifna K P", tag: "The Reason We Shipped", role: "Founder", proof: "Ops · Campus launch, 120 seats in 2 hours", linkedin: "https://www.linkedin.com/in/shifnarisan/", cohort: "2025-26", image: "/images/founders/shifna.jpeg" },
  { id: "mohammed-mijvad", name: "Mohammed Mijvad", tag: "Lab Bench Resident", role: "Founder", proof: "Hardware · Lab systems & electronics", linkedin: "https://www.linkedin.com/in/mohammed-mijvad-1b8a3b376/", cohort: "2025-26", image: "/images/founders/mijvad.jpeg" },
  { id: "sona-varghese", name: "Sona Varghese", tag: "Zero Stage Fear", role: "Founder", proof: "Events · Ran the first public showcase", linkedin: "https://www.linkedin.com/in/sona-varughese-97509b408/", cohort: "2025-26", image: "/images/founders/sona.jpg" },
  { id: "ashith-mk", name: "Ashith MK", tag: "Bug Hunter", role: "Founder", proof: "Security · Ran the cybersecurity workshop", linkedin: "https://www.linkedin.com/in/ashith-mk-723599355/", cohort: "2025-26", image: "/images/founders/ashith.jpeg" },
  { id: "arshak-perumballi", name: "Arshak Perumballi", tag: "PPT Specialist", role: "Founder", proof: "Comms · Every deck that got us in a room", linkedin: "https://www.linkedin.com/in/arshak-perumballi-14973b1b6/", cohort: "2025-26", image: "/images/founders/arshak.png" },
  { id: "sinan-nooren", name: "Sinan Nooren", tag: "Quiet Builder", role: "Founder", proof: "Development · Builds first, talks later", linkedin: "https://www.linkedin.com/in/sinan-nooren-9329372b6/", cohort: "2025-26", image: "/images/founders/sinan-nooren.png" },
  { id: "muhammed-fiyas-n", name: "Muhammed Fiyas", tag: "Works On My Machine", role: "Founder", proof: "Development · Environment debugging specialist", linkedin: "https://www.linkedin.com/in/muhammed-fiyas-n/", cohort: "2025-26", image: "/images/founders/fiyas.png" },
  { id: "adil-pt", name: "Adil P T", tag: "Back Bencher", role: "Founder", proof: "Dev · Quietly ships from the last row", linkedin: "https://www.linkedin.com/in/adil-pt-2a6553267/", cohort: "2025-26", image: "/images/founders/adil.jpeg" },
  { id: "abdul-haadi", name: "Abdul Haadi", tag: "Front Bencher", role: "Founder", proof: "Python · Development & Backend", linkedin: "https://www.linkedin.com/in/abdul-haadi/", cohort: "2025-26", image: "/images/founders/haadi.jpeg" },
];

const DEFAULT_ADVISORS: Advisor[] = [
  { id: "jasira-kt", name: "Jasira KT", role: "Faculty Head & Advisor", institution: "CSE, Eranad Knowledge City Technical Campus", image: "/images/team/jasira-kt.jpeg" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}
function TInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${mono ? "font-mono" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function FounderEditor({ founder, onSave, onClose }: { founder: Founder; onSave: (f: Founder) => void; onClose: () => void }) {
  const [d, setD] = useState<Founder>(founder);
  const u = (patch: Partial<Founder>) => setD((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border p-5 sticky top-0 bg-bg-panel z-10">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">Edit Founder Profile</h3>
            <p className="text-[11px] text-text-dim mt-0.5">Appears on elevates.live/team — all 18 founders</p>
          </div>
          <button onClick={onClose} className="text-text-dim p-1.5 rounded-full hover:bg-bg-page"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Full Name (displayed on team card)">
            <TInput value={d.name} onChange={(v) => u({ name: v })} placeholder="Sarhan Qadir KVM" />
          </Field>
          <Field label="Tag — Authentic Persona Badge (shown below name on card)">
            <div className="relative">
              <TInput value={d.tag} onChange={(v) => u({ tag: v })} placeholder="Main Class Bunker" />
              <p className="text-[10px] text-text-dim mt-1">
                e.g. "Main Class Bunker", "Design Wizard", "Terminal Addict", "Hardware Hacker", "Last Minute Committer"
              </p>
            </div>
          </Field>
          <Field label="Role">
            <TInput value={d.role} onChange={(v) => u({ role: v })} placeholder="Founder" />
          </Field>
          <Field label="Proof of Work (1 line — what they actually built/did)">
            <TInput value={d.proof} onChange={(v) => u({ proof: v })} placeholder="Full-stack · Built elevates.live" />
          </Field>
          <Field label="Founder ID (slug — used for internal linking)">
            <TInput value={d.id} onChange={(v) => u({ id: v })} mono placeholder="sarhan-qadir-kvm" />
          </Field>
          <Field label="LinkedIn URL">
            <TInput value={d.linkedin ?? ""} onChange={(v) => u({ linkedin: v })} mono placeholder="https://www.linkedin.com/in/sqadirkvm/" />
          </Field>
          <Field label="Photo Path (in /public/images/founders/)">
            <TInput value={d.image} onChange={(v) => u({ image: v })} mono placeholder="/images/founders/sarhan-qadir.jpeg" />
          </Field>
          {d.image && (
            <div className="border border-border rounded-[var(--radius-md)] p-3 bg-bg-page">
              <img src={d.image} alt={d.name} className="w-24 h-24 object-cover rounded-[var(--radius-md)] border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />
              <p className="text-[10px] text-text-dim mt-1.5 font-mono">{d.image}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5 sticky bottom-0 bg-bg-panel">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => { onSave(d); onClose(); }}>Save Founder</Button>
        </div>
      </div>
    </div>
  );
}

function AdvisorEditor({ advisor, onSave, onClose }: { advisor: Advisor; onSave: (a: Advisor) => void; onClose: () => void }) {
  const [d, setD] = useState<Advisor>(advisor);
  const u = (patch: Partial<Advisor>) => setD((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="font-bold text-text">Edit Faculty Advisor</h3>
          <button onClick={onClose} className="text-text-dim"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Name"><TInput value={d.name} onChange={(v) => u({ name: v })} /></Field>
          <Field label="Role / Title"><TInput value={d.role} onChange={(v) => u({ role: v })} placeholder="Faculty Head & Advisor" /></Field>
          <Field label="Institution / Department"><TInput value={d.institution} onChange={(v) => u({ institution: v })} placeholder="CSE, Eranad Knowledge City Technical Campus" /></Field>
          <Field label="LinkedIn URL (optional)"><TInput value={d.linkedin ?? ""} onChange={(v) => u({ linkedin: v })} mono /></Field>
          <Field label="Photo Path (optional)"><TInput value={d.image ?? ""} onChange={(v) => u({ image: v })} mono placeholder="/images/team/jasira-kt.jpeg" /></Field>
          <Field label="ID (slug)"><TInput value={d.id} onChange={(v) => u({ id: v })} mono /></Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => { onSave(d); onClose(); }}>Save Advisor</Button>
        </div>
      </div>
    </div>
  );
}

type SectionTab = "founders" | "advisors";

export default function TeamCMSPage() {
  const [tab, setTab] = useState<SectionTab>("founders");
  const [search, setSearch] = useState("");
  const [founders, setFounders] = useState<Founder[]>(DEFAULT_FOUNDERS);
  const [advisors, setAdvisors] = useState<Advisor[]>(DEFAULT_ADVISORS);
  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);
  const [isNewFounder, setIsNewFounder] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [isNewAdvisor, setIsNewAdvisor] = useState(false);

  const q = search.toLowerCase();
  const filteredFounders = founders.filter(
    (f) => f.name.toLowerCase().includes(q) || f.tag.toLowerCase().includes(q) || f.proof.toLowerCase().includes(q),
  );
  const filteredAdvisors = advisors.filter(
    (a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q),
  );

  const blankFounder = (): Founder => ({
    id: `founder-${Date.now()}`, name: "", tag: "", role: "Founder", proof: "", linkedin: "", cohort: "2025-26", image: "",
  });
  const blankAdvisor = (): Advisor => ({
    id: `advisor-${Date.now()}`, name: "", role: "", institution: "", linkedin: "", image: "",
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="Founders & Team"
        description="Manage all 18 founding members and faculty advisors exactly as shown on elevates.live/team — names, authentic tags, proof of work, LinkedIn, and photos"
        actions={
          tab === "founders" ? (
            <Button size="sm" variant="orange" onClick={() => { setEditingFounder(blankFounder()); setIsNewFounder(true); }}>
              <Plus size={14} /> Add Founder
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => { setEditingAdvisor(blankAdvisor()); setIsNewAdvisor(true); }}>
              <Plus size={14} /> Add Advisor
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{founders.length}</p>
          <p className="text-xs text-text-dim">Founding Members</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{founders.filter((f) => f.linkedin).length}</p>
          <p className="text-xs text-text-dim">With LinkedIn</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{advisors.length}</p>
          <p className="text-xs text-text-dim">Faculty Advisors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: "founders", label: `18 Founding Members`, icon: Users },
          { key: "advisors", label: "Faculty Advisors", icon: GraduationCap },
        ] as { key: SectionTab; label: string; icon: typeof Users }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === key ? "border-[var(--accent)] text-text" : "border-transparent text-text-dim hover:text-text"}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ─── GROUP FOUNDERS PHOTO BANNER ─── */}
      {tab === "founders" && (
        <div className="relative rounded-[var(--radius-xl)] border-2 border-border overflow-hidden bg-bg-panel p-2 shadow-sm">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-[var(--radius-lg)]">
            <img
              src="/team/elevates-founders.jpeg"
              alt="The 18 founding members of ELEVATES at Eranad Knowledge City, September 2025"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span className="font-mono text-[10px] font-bold text-[var(--accent)] tracking-widest uppercase mb-1">
                FOUNDING BATCH · 2025–26
              </span>
              <h3 className="text-xl font-black uppercase text-white tracking-tight">
                THE 18 FOUNDING MEMBERS OF ELEVATES
              </h3>
              <p className="text-xs text-white/80 font-mono mt-0.5">
                Eranad Knowledge City · Manjeri, Malappuram · September 2025
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input placeholder="Search members..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Founders Grid */}
      {tab === "founders" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFounders.map((f, i) => (
            <div key={f.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 hover:border-border-hover transition-colors relative group">
              {/* Number watermark */}
              <div className="absolute top-3 right-4 font-mono font-black text-2xl text-text/5 select-none">
                #{String(i + 1).padStart(2, "0")}
              </div>

              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-[var(--radius-md)] border-2 border-border overflow-hidden bg-bg-page shrink-0">
                  {f.image ? (
                    <img src={f.image} alt={f.name} className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-dim"><User size={20} /></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text text-sm leading-tight">{f.name}</h3>
                  {/* Authentic persona tag — styled like the real site */}
                  <div className="mt-1">
                    <span className="inline-block font-mono text-[10px] font-bold text-text bg-bg-page border border-border px-1.5 py-0.5 rounded-sm transform -rotate-1">
                      {f.tag}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-text-dim leading-relaxed mb-2">{f.proof}</p>

              <div className="flex flex-wrap gap-1.5 items-center mb-3">
                <Badge tone="mute">{f.role}</Badge>
                <span className="text-[10px] font-mono text-text-dim bg-bg-page px-1.5 py-0.5 rounded border border-border">{f.cohort}</span>
                {f.linkedin && (
                  <a href={f.linkedin} target="_blank" rel="noreferrer"
                    className="text-[10px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5">
                    <ExternalLink size={9} /> LinkedIn
                  </a>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="secondary" size="sm" className="flex-1 justify-center"
                  onClick={() => { setEditingFounder(f); setIsNewFounder(false); }}>
                  <Edit size={12} /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]"
                  onClick={() => setFounders((prev) => prev.filter((x) => x.id !== f.id))}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
          {filteredFounders.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-dim">No founders found.</div>
          )}
        </div>
      )}

      {/* Advisors List */}
      {tab === "advisors" && (
        <div className="space-y-3">
          {filteredAdvisors.map((a) => (
            <div key={a.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 flex items-start justify-between gap-4 hover:border-border-hover">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-[var(--radius-md)] border border-border overflow-hidden bg-bg-page shrink-0">
                  {a.image ? (
                    <img src={a.image} alt={a.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-dim"><GraduationCap size={18} /></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-text text-sm">{a.name}</h3>
                  <p className="text-xs text-text-dim">{a.role}</p>
                  <p className="text-xs text-text-dim">{a.institution}</p>
                  {a.linkedin && (
                    <a href={a.linkedin} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5 mt-1">
                      <ExternalLink size={10} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => { setEditingAdvisor(a); setIsNewAdvisor(false); }}><Edit size={13} /></Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => setAdvisors((prev) => prev.filter((x) => x.id !== a.id))}><Trash2 size={13} /></Button>
              </div>
            </div>
          ))}
          {filteredAdvisors.length === 0 && (
            <div className="text-center py-12 text-text-dim">No advisors found. Add faculty advisors.</div>
          )}
        </div>
      )}

      {editingFounder && (
        <FounderEditor founder={editingFounder} onClose={() => { setEditingFounder(null); setIsNewFounder(false); }}
          onSave={(saved) => {
            if (isNewFounder) setFounders((prev) => [...prev, saved]);
            else setFounders((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
          }}
        />
      )}
      {editingAdvisor && (
        <AdvisorEditor advisor={editingAdvisor} onClose={() => { setEditingAdvisor(null); setIsNewAdvisor(false); }}
          onSave={(saved) => {
            if (isNewAdvisor) setAdvisors((prev) => [...prev, saved]);
            else setAdvisors((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
          }}
        />
      )}
    </div>
  );
}

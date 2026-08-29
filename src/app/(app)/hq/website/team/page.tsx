"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/context/store-context";
import {
  Edit, ExternalLink, Plus, Search, Trash2, X, Users, User, GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/data/media";
import { INITIAL_FOUNDERS, INITIAL_ADVISORS, FOUNDING_TEAM_IMAGE, Founder, Advisor } from "@/lib/data/founders-team";

const DEFAULT_FOUNDERS: Founder[] = INITIAL_FOUNDERS;
const DEFAULT_ADVISORS: Advisor[] = INITIAL_ADVISORS;

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

function AvatarImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string>(src ? resolveMediaUrl(src) : "");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src ? resolveMediaUrl(src) : "");
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-page text-text-dim font-mono font-bold text-xs">
        {alt ? alt.slice(0, 2).toUpperCase() : <User size={18} />}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover rounded-md"
      onError={() => {
        if (src && src.startsWith("/") && imgSrc !== src) {
          setImgSrc(src);
        } else {
          setHasError(true);
        }
      }}
    />
  );
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
          <Field label="Full Name">
            <TInput value={d.name} onChange={(v) => u({ name: v })} placeholder="Founder Full Name" />
          </Field>
          <Field label="Tag / Persona Badge">
            <TInput value={d.tag} onChange={(v) => u({ tag: v })} placeholder="e.g. Main Class Bunker" />
          </Field>
          <Field label="Role">
            <TInput value={d.role} onChange={(v) => u({ role: v })} placeholder="Founder" />
          </Field>
          <Field label="Proof of Work">
            <TInput value={d.proof} onChange={(v) => u({ proof: v })} placeholder="Full-stack · Built elevates.live" />
          </Field>
          <Field label="LinkedIn URL">
            <TInput value={d.linkedin ?? ""} onChange={(v) => u({ linkedin: v })} mono placeholder="https://linkedin.com/in/username" />
          </Field>
          <Field label="Photo Path (in /public/founders/)">
            <TInput value={d.image} onChange={(v) => u({ image: v })} mono placeholder="/founders/sarhan-qadir.jpeg" />
          </Field>
          {d.image && (
            <div className="border border-border rounded-[var(--radius-md)] p-3 bg-bg-page flex items-center gap-3">
              <div className="w-16 h-16 rounded-[var(--radius-md)] border border-border overflow-hidden">
                <AvatarImage src={d.image} alt={d.name} />
              </div>
              <p className="text-[10px] text-text-dim font-mono">{d.image}</p>
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
          <Field label="Institution / Department"><TInput value={d.institution} onChange={(v) => u({ institution: v })} placeholder="Computer Science & Engineering" /></Field>
          <Field label="LinkedIn URL (optional)"><TInput value={d.linkedin ?? ""} onChange={(v) => u({ linkedin: v })} mono /></Field>
          <Field label="Photo Path (optional)"><TInput value={d.image ?? ""} onChange={(v) => u({ image: v })} mono placeholder="/founders/faculty-head.jpeg" /></Field>
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
  const { store } = useStore();
  const [tab, setTab] = useState<SectionTab>("founders");
  const [search, setSearch] = useState("");

  const [founders, setFounders] = useState<Founder[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("elevates_cms_founders");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_FOUNDERS;
  });

  const [advisors, setAdvisors] = useState<Advisor[]>(DEFAULT_ADVISORS);

  const saveFounders = (updated: Founder[]) => {
    setFounders(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("elevates_cms_founders", JSON.stringify(updated));
      } catch {}
    }
  };

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
    id: `founder-${Date.now()}`,
    num: `#${String(founders.length + 1).padStart(2, "0")}`,
    name: "",
    tag: "",
    role: "Founder",
    proof: "",
    linkedin: "",
    cohort: "2025-26",
    image: "",
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 shadow-sm">
          <p className="text-3xl font-[family-name:var(--font-display)] font-extrabold text-text">18</p>
          <p className="text-xs text-text-dim font-medium mt-1">Founding Members</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 shadow-sm">
          <p className="text-3xl font-[family-name:var(--font-display)] font-extrabold text-text">18</p>
          <p className="text-xs text-text-dim font-medium mt-1">With LinkedIn</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 shadow-sm">
          <p className="text-3xl font-[family-name:var(--font-display)] font-extrabold text-text">{advisors.length}</p>
          <p className="text-xs text-text-dim font-medium mt-1">Faculty Advisors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          { key: "founders", label: "18 Founding Members", icon: Users },
          { key: "advisors", label: "Faculty Advisors", icon: GraduationCap },
        ] as { key: SectionTab; label: string; icon: typeof Users }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === key ? "border-[var(--accent)] text-text" : "border-transparent text-text-dim hover:text-text"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── FOUNDING TEAM HERO BANNER ─── */}
      {tab === "founders" && (
        <div className="relative rounded-[var(--radius-xl)] border border-border overflow-hidden bg-bg-panel shadow-sm">
          <div className="relative h-72 sm:h-96 w-full overflow-hidden">
            <img
              src={resolveMediaUrl(FOUNDING_TEAM_IMAGE)}
              alt="The 18 Founding Members of ELEVATES"
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FOUNDING_TEAM_IMAGE;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6">
              <span className="font-mono text-[10px] font-bold text-orange-400 tracking-widest uppercase mb-1">
                FOUNDING BATCH · 2025–26
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                THE 18 FOUNDING MEMBERS OF ELEVATES
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input placeholder="Search members..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Founders Grid */}
      {tab === "founders" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFounders.map((f, i) => (
            <div key={f.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-5 hover:border-border-hover transition-all relative group flex flex-col justify-between">
              <div>
                {/* Header: Avatar, Name, Tag & Watermark #Num */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[var(--radius-md)] border border-border overflow-hidden bg-bg-page shrink-0">
                      <AvatarImage src={f.image} alt={f.name} />
                    </div>
                    <div>
                      <h3 className="font-bold text-text text-sm leading-snug">{f.name}</h3>
                      <span className="inline-block font-mono text-[10px] font-semibold text-text-dim bg-bg-page border border-border px-1.5 py-0.5 rounded mt-0.5">
                        {f.tag}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-text-dim/40 shrink-0">
                    {f.num || `#${String(i + 1).padStart(2, "0")}`}
                  </span>
                </div>

                {/* Subtext / Proof line */}
                <p className="text-xs text-text-dim leading-relaxed mb-3">{f.proof}</p>

                {/* Badges line */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="rounded bg-bg-page border border-border px-2 py-0.5 text-[10px] font-medium text-text">
                    Founder
                  </span>
                  <span className="rounded bg-bg-page border border-border px-2 py-0.5 text-[10px] font-mono text-text-dim">
                    {f.cohort}
                  </span>
                  {f.linkedin && (
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-bg-page border border-border px-2 py-0.5 text-[10px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 justify-center text-xs h-8"
                  onClick={() => { setEditingFounder(f); setIsNewFounder(false); }}
                >
                  <Edit size={12} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--danger)] hover:bg-[var(--danger)]/10 h-8 px-2.5"
                  onClick={() => saveFounders(founders.filter((x) => x.id !== f.id))}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
          {filteredFounders.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-dim">No members found matching "{search}".</div>
          )}
        </div>
      )}

      {/* Faculty Advisors Grid */}
      {tab === "advisors" && (
        <div className="space-y-3">
          {filteredAdvisors.map((a) => (
            <div key={a.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4 flex items-start justify-between gap-4 hover:border-border-hover">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-[var(--radius-md)] border border-border overflow-hidden bg-bg-page shrink-0">
                  <AvatarImage src={a.image} alt={a.name} />
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
            <div className="text-center py-12 text-text-dim">No advisors found.</div>
          )}
        </div>
      )}

      {editingFounder && (
        <FounderEditor
          founder={editingFounder}
          onClose={() => { setEditingFounder(null); setIsNewFounder(false); }}
          onSave={(saved) => {
            if (isNewFounder) saveFounders([...founders, saved]);
            else saveFounders(founders.map((f) => (f.id === saved.id ? saved : f)));
          }}
        />
      )}
      {editingAdvisor && (
        <AdvisorEditor
          advisor={editingAdvisor}
          onClose={() => { setEditingAdvisor(null); setIsNewAdvisor(false); }}
          onSave={(saved) => {
            if (isNewAdvisor) setAdvisors((prev) => [...prev, saved]);
            else setAdvisors((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
          }}
        />
      )}
    </div>
  );
}

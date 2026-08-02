import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  EOS_ACTIVITIES,
  EOS_CHAPTER_STANDARDS,
  EOS_CLUSTER_RESPONSIBILITIES,
  EOS_COMMUNITY_TIERS,
  EOS_CORE_RULES,
  EOS_EVENT_PROGRESSION,
  EOS_JOURNEY_BEYOND,
  EOS_JOURNEY_STAGES,
  EOS_MISSION,
  EOS_PHILOSOPHY,
  EOS_PILLARS,
  EOS_PRINCIPLES,
  EOS_SUCCESS_METRICS,
  EOS_VISION,
  PLAYBOOK_SECTIONS,
} from "@/lib/eos/doctrine";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border pt-10 first:border-t-0 first:pt-0"
    >
      <h2 className="font-[family-name:var(--font-display)] text-[1.5rem] font-bold tracking-[-0.03em] text-text">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-text-mute">
      {children}
    </p>
  );
}

export function PlaybookContent({
  variant = "community",
}: {
  variant?: "hq" | "community";
}) {
  return (
    <>
      <nav
        aria-label="Playbook sections"
        className="mb-10 flex flex-wrap gap-2 border-b border-border pb-5"
      >
        {PLAYBOOK_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-text-dim ring-1 ring-border transition hover:bg-bg-hover hover:text-text"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mx-auto max-w-[720px] space-y-12">
        <Section id="foundations" title="Foundations">
          <SubLabel>Vision</SubLabel>
          <p className="text-[15px] leading-relaxed text-text">{EOS_VISION}</p>

          <div className="mt-8">
            <SubLabel>Mission</SubLabel>
            <ul className="space-y-1.5 text-[14px] text-text-dim">
              {EOS_MISSION.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <SubLabel>Philosophy</SubLabel>
            <ul className="space-y-1.5 text-[14px] text-text-dim">
              {EOS_PHILOSOPHY.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <SubLabel>Five pillars</SubLabel>
            <div className="space-y-5">
              {EOS_PILLARS.map((p) => (
                <div key={p.id}>
                  <p className="font-semibold text-[var(--accent)]">{p.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-text-dim">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SubLabel>Principles</SubLabel>
            <ul className="grid gap-2 sm:grid-cols-2">
              {EOS_PRINCIPLES.map((p) => (
                <li key={p} className="text-[14px] text-text-dim">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="community" title="Community">
          <SubLabel>Who can join</SubLabel>
          <p className="text-[15px] leading-relaxed text-text-dim">
            Every student on campus is an Elevates member. No fee. No registration
            barrier. No department or year restriction. Participate by showing up
            and contributing.
          </p>

          <div className="mt-8">
            <SubLabel>Tiers</SubLabel>
            <ol className="space-y-3">
              {EOS_COMMUNITY_TIERS.map((t, i) => (
                <li key={t.key} className="flex gap-4 text-[14px]">
                  <span className="w-5 font-[family-name:var(--font-mono)] text-text-mute">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="font-medium text-text">{t.label}</span>
                    <span className="text-text-dim"> — {t.blurb}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8">
            <SubLabel>Cluster responsibilities</SubLabel>
            <ul className="grid gap-2 sm:grid-cols-2">
              {EOS_CLUSTER_RESPONSIBILITIES.map((r) => (
                <li key={r} className="text-[14px] text-text-dim">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="path" title="Path">
          <SubLabel>Student journey</SubLabel>
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-[14px] text-text-dim">
            {EOS_JOURNEY_STAGES.map((s, i) => (
              <span key={s.key}>
                {s.label}
                {i < EOS_JOURNEY_STAGES.length - 1 ? (
                  <span className="text-text-mute"> → </span>
                ) : null}
              </span>
            ))}
          </p>
          <p className="mt-3 text-[13px] text-text-mute">{EOS_JOURNEY_BEYOND}</p>

          <div className="mt-8">
            <SubLabel>Event model</SubLabel>
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-[14px] text-text-dim">
              {EOS_EVENT_PROGRESSION.map((s, i) => (
                <span key={s.key}>
                  {s.label}
                  {i < EOS_EVENT_PROGRESSION.length - 1 ? (
                    <span className="text-text-mute"> → </span>
                  ) : null}
                </span>
              ))}
            </p>
          </div>
        </Section>

        <Section id="practice" title="Practice">
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <SubLabel>Activities</SubLabel>
              <ul className="space-y-1.5 text-[14px] text-text-dim">
                {EOS_ACTIVITIES.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <SubLabel>Chapter standards</SubLabel>
              <ul className="space-y-1.5 text-[14px] text-text-dim">
                {EOS_CHAPTER_STANDARDS.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <SubLabel>Core rules</SubLabel>
            <ul className="grid gap-2 sm:grid-cols-2">
              {EOS_CORE_RULES.map((r) => (
                <li key={r} className="text-[14px] text-text-dim">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="proof" title="Proof">
          <SubLabel>Success metrics</SubLabel>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EOS_SUCCESS_METRICS.map((m) => (
              <li key={m} className="text-[14px] text-text-dim">
                {m}
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-[var(--radius)] bg-bg-elevated p-6 ring-1 ring-border">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
              Identity
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-text-dim">
              Everyone is an Elevates member. Not everyone becomes a Cluster
              member. Leadership is earned through contribution. Campus Lead runs
              a student-led chapter; faculty remains an optional liaison.
            </p>
            <div className="mt-4">
              {variant === "hq" ? (
                <Link href="/hq/guidelines">
                  <Button type="button" variant="ghost">
                    Open policies &amp; guidelines
                  </Button>
                </Link>
              ) : (
                <Link href="/join">
                  <Button type="button" variant="orange">
                    Join a chapter
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

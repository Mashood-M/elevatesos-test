"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/store-context";

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
  const { store } = useStore();
  const d = store.doctrine ?? {};

  const vision = d.vision || "";
  const mission = d.mission ?? [];
  const philosophy = d.philosophy ?? [];
  const pillars = d.pillars ?? [];
  const principles = d.principles ?? [];
  const communityTiers = d.communityTiers ?? [];
  const clusterResponsibilities = d.clusterResponsibilities ?? [];
  const journeyStages = d.journeyStages ?? [];
  const eventProgression = d.eventProgression ?? [];
  const activities = d.activities ?? [];
  const chapterStandards = d.chapterStandards ?? [];
  const coreRules = d.coreRules ?? [];
  const successMetrics = d.successMetrics ?? [];
  const playbookSections = d.playbookSections ?? [
    { id: "foundations", label: "Foundations" },
    { id: "community", label: "Community" },
    { id: "path", label: "Path" },
    { id: "practice", label: "Practice" },
    { id: "proof", label: "Proof" },
  ];

  return (
    <>
      <nav
        aria-label="Playbook sections"
        className="mb-10 flex flex-wrap gap-2 border-b border-border pb-5"
      >
        {playbookSections.map((s: any) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-text-dim ring-1 ring-border transition hover:bg-bg-hover hover:text-text"
          >
            {s.label || s.title}
          </a>
        ))}
      </nav>

      <div className="mx-auto max-w-[720px] space-y-12">
        <Section id="foundations" title="Foundations">
          <SubLabel>Vision</SubLabel>
          <p className="text-[15px] leading-relaxed text-text">{vision}</p>

          {mission.length > 0 && (
            <div className="mt-8">
              <SubLabel>Mission</SubLabel>
              <ul className="space-y-1.5 text-[14px] text-text-dim">
                {mission.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {philosophy.length > 0 && (
            <div className="mt-8">
              <SubLabel>Philosophy</SubLabel>
              <ul className="space-y-1.5 text-[14px] text-text-dim">
                {philosophy.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {pillars.length > 0 && (
            <div className="mt-8">
              <SubLabel>Five pillars</SubLabel>
              <div className="space-y-5">
                {pillars.map((p) => (
                  <div key={p.id}>
                    <p className="font-semibold text-[var(--accent)]">{p.title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-text-dim">
                      {p.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {principles.length > 0 && (
            <div className="mt-8">
              <SubLabel>Principles</SubLabel>
              <ul className="grid gap-2 sm:grid-cols-2">
                {principles.map((p) => (
                  <li key={p} className="text-[14px] text-text-dim">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section id="community" title="Community">
          <SubLabel>Who can join</SubLabel>
          <p className="text-[15px] leading-relaxed text-text-dim">
            Every student on campus is an Elevates member. No fee. No registration
            barrier. No department or year restriction. Participate by showing up
            and contributing.
          </p>

          {communityTiers.length > 0 && (
            <div className="mt-8">
              <SubLabel>Tiers</SubLabel>
              <ol className="space-y-3">
                {communityTiers.map((t: any, i) => (
                  <li key={t.key || t.tier || i} className="flex gap-4 text-[14px]">
                    <span className="w-5 font-[family-name:var(--font-mono)] text-text-mute">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="font-medium text-text">{t.label}</span>
                      <span className="text-text-dim"> — {t.access || t.blurb}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {clusterResponsibilities.length > 0 && (
            <div className="mt-8">
              <SubLabel>Cluster responsibilities</SubLabel>
              <ul className="grid gap-2 sm:grid-cols-2">
                {clusterResponsibilities.map((r) => (
                  <li key={r} className="text-[14px] text-text-dim">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section id="path" title="Path">
          <SubLabel>Student journey</SubLabel>
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-[14px] text-text-dim">
            {journeyStages.map((s: any, i) => (
              <span key={s.key || s.stage || i}>
                {s.label}
                {i < journeyStages.length - 1 ? (
                  <span className="text-text-mute"> → </span>
                ) : null}
              </span>
            ))}
          </p>

          {eventProgression.length > 0 && (
            <div className="mt-8">
              <SubLabel>Event model</SubLabel>
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-[14px] text-text-dim">
                {eventProgression.map((s: any, i) => (
                  <span key={s.key || s.stage || i}>
                    {s.title || s.label}
                    {i < eventProgression.length - 1 ? (
                      <span className="text-text-mute"> → </span>
                    ) : null}
                  </span>
                ))}
              </p>
            </div>
          )}
        </Section>

        <Section id="practice" title="Practice">
          <div className="grid gap-10 sm:grid-cols-2">
            {activities.length > 0 && (
              <div>
                <SubLabel>Activities</SubLabel>
                <ul className="space-y-1.5 text-[14px] text-text-dim">
                  {activities.map((a: any) => (
                    <li key={typeof a === "string" ? a : a.title}>
                      {typeof a === "string" ? a : `${a.title} (${a.frequency})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {chapterStandards.length > 0 && (
              <div>
                <SubLabel>Chapter standards</SubLabel>
                <ul className="space-y-1.5 text-[14px] text-text-dim">
                  {chapterStandards.map((s: any, i) => (
                    <li key={s.id || i}>{typeof s === "string" ? s : s.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {coreRules.length > 0 && (
            <div className="mt-8">
              <SubLabel>Core rules</SubLabel>
              <ul className="grid gap-2 sm:grid-cols-2">
                {coreRules.map((r) => (
                  <li key={r} className="text-[14px] text-text-dim">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section id="proof" title="Proof">
          {successMetrics.length > 0 && (
            <>
              <SubLabel>Success metrics</SubLabel>
              <ul className="grid gap-2 sm:grid-cols-2">
                {successMetrics.map((m) => (
                  <li key={m} className="text-[14px] text-text-dim">
                    {m}
                  </li>
                ))}
              </ul>
            </>
          )}

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

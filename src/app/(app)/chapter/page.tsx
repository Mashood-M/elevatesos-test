"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isOpenToAllEvent, canRegisterNow } from "@/lib/events";
import { isHqRole } from "@/lib/permissions";
import { BookOpen, QrCode, Share2, User } from "lucide-react";

export default function ChapterIndexPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { store, hydrated } = useStore();
  const { session } = useCurrentUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // HQ roles redirect to HQ dashboard
    if (isHqRole(session.roleKey)) {
      router.replace("/hq");
      return;
    }

    // If student has an assigned chapter, redirect to their specific chapter dashboard
    if (session.chapterId) {
      const assignedChapter = store.chapters.find((c) => c.id === session.chapterId);
      if (assignedChapter?.slug) {
        router.replace(`/chapter/${assignedChapter.slug}`);
      }
    }
  }, [router, session, store.chapters, hydrated]);

  if (!mounted || !hydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center font-mono text-xs text-text-dim animate-pulse">
          Loading workspace...
        </div>
      </div>
    );
  }

  // If user has a chapter assigned, show loading indicator while redirecting
  if (session.chapterId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center font-mono text-xs text-text-dim">
          Redirecting to your chapter workspace...
        </div>
      </div>
    );
  }

  // Independent Student Hub (no chapter assigned) — privacy preserving, open-to-all events only
  const openEvents = store.events
    .filter((e) => isOpenToAllEvent(e))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Student Hub"
        description="Open-to-all workshops, challenges, playbook, and builder tools"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/eos">
              <Button variant="orange">Playbook</Button>
            </Link>
            <Link href="/referrals">
              <Button variant="ghost">Invite Friends</Button>
            </Link>
          </div>
        }
      />

      {/* Independent Student Notice */}
      <div className="mb-6 rounded-[14px] border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cyan-200">
              Independent Student Account
            </p>
            <p className="text-xs text-cyan-300/80 mt-0.5 leading-relaxed">
              You are currently an independent student. You can participate in all <strong>Open to All</strong> events across chapters.
              Ask your Campus Lead or Class Representative to add you to your college chapter anytime!
            </p>
          </div>
          <Badge tone="cyan">Independent</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Open to All Events */}
          <TerminalPanel
            title="open.events"
            meta={`${openEvents.length} open to all`}
            accent="orange"
          >
            {openEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-text-dim">
                  No open-to-all events scheduled right now. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {openEvents.map((ev) => {
                  const eligibility = canRegisterNow(store, ev, session.userId);
                  const chapter = store.chapters.find((c) => c.id === ev.chapterId);
                  return (
                    <TicketCard
                      key={ev.id}
                      event={ev}
                      href={chapter ? `/chapter/${chapter.slug}/events/${ev.id}` : `/notifications`}
                      className="bg-bg shadow-[var(--shadow-sm)]"
                      meta={`${chapter ? chapter.college : "Elevates"} · open for all participants`}
                      footer={
                        <>
                          {eligibility.ok ? (
                            <Link href={`/f/${eligibility.formId}`}>
                              <Button variant="orange" className="h-9 px-4">
                                Register
                              </Button>
                            </Link>
                          ) : (
                            <Link href={chapter ? `/chapter/${chapter.slug}/events/${ev.id}` : "#"}>
                              <Button variant="primary" className="h-9 px-4">
                                Open Event
                              </Button>
                            </Link>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </TerminalPanel>
        </div>

        {/* Quick Builder Tools */}
        <div className="space-y-6">
          <TerminalPanel title="builder.tools" accent="cyan">
            <div className="space-y-3">
              <Link
                href="/my-qr"
                className="flex items-center justify-between rounded-[12px] border border-border/80 bg-bg p-3.5 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text">My QR Ticket</p>
                    <p className="text-[11px] text-text-dim">Instant event check-in</p>
                  </div>
                </div>
                <span className="text-xs text-text-mute">→</span>
              </Link>

              <Link
                href="/referrals"
                className="flex items-center justify-between rounded-[12px] border border-border/80 bg-bg p-3.5 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                    <Share2 size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text">Invite Friends</p>
                    <p className="text-[11px] text-text-dim">Share 24h invite links</p>
                  </div>
                </div>
                <span className="text-xs text-text-mute">→</span>
              </Link>

              <Link
                href="/eos"
                className="flex items-center justify-between rounded-[12px] border border-border/80 bg-bg p-3.5 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text">Playbook</p>
                    <p className="text-[11px] text-text-dim">EOS doctrine & guidelines</p>
                  </div>
                </div>
                <span className="text-xs text-text-mute">→</span>
              </Link>

              <Link
                href={`/profile/${session.userId}`}
                className="flex items-center justify-between rounded-[12px] border border-border/80 bg-bg p-3.5 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text">My Profile & Elevates ID</p>
                    <p className="text-[11px] text-text-dim">View badges & certificates</p>
                  </div>
                </div>
                <span className="text-xs text-text-mute">→</span>
              </Link>
            </div>
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}

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
import { isOpenToAllEvent, isEventVisibleToUser, canRegisterNow } from "@/lib/events";
import { isHqRole } from "@/lib/permissions";
import { BookOpen, QrCode, Share2, User } from "lucide-react";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";

export default function ChapterIndexPage() {
  const [mounted, setMounted] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
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
      const assignedChapter = store.chapters.find((c) => c.id === session.chapterId || c.slug === session.chapterId);
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

  // If user has a valid assigned chapter, show loading indicator while redirecting
  const assignedChapter = session.chapterId
    ? store.chapters.find((c) => c.id === session.chapterId || c.slug === session.chapterId)
    : null;

  if (session.chapterId && assignedChapter?.slug) {
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
    .filter((e) => isOpenToAllEvent(e) && isEventVisibleToUser(e, session.chapterId, session.roleKey))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Student Hub"
        description="Open-to-all workshops, challenges, playbook, and builder tools"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="orange" onClick={() => setIsJoinModalOpen(true)}>
              Join Chapter with Code
            </Button>
            <Link href="/referrals">
              <Button variant="ghost">Invite Friends</Button>
            </Link>
          </div>
        }
      />

      {/* Independent Student Notice */}
      <div className="mb-6 rounded-[14px] border border-[var(--accent)] bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">
              Independent Student Account
            </p>
            <p className="text-xs text-text-dim mt-0.5 leading-relaxed">
              You are currently an independent student. You can participate in all <strong>Open to All</strong> events across chapters.
              Have a college invite code? Click <strong>Enter Invite Code</strong> to instantly join your college chapter!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="orange" className="text-xs py-1.5 h-auto" onClick={() => setIsJoinModalOpen(true)}>
              Enter Invite Code
            </Button>
            <Badge tone="orange">Independent</Badge>
          </div>
        </div>
      </div>

      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Start Here / Explore Tracks */}
          <TerminalPanel title="Start here" meta="Explore" accent="orange">
            <ol className="divide-y divide-border/80">
              <li>
                <Link
                  href="/events"
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3.5 hover:text-[var(--accent)] transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      01
                    </span>
                    <div>
                      <p className="font-semibold text-[13px] text-text">Browse Events</p>
                      <p className="text-[12px] text-text-dim">
                        Explore and register for open workshops, hackathons, and challenges across campuses
                      </p>
                    </div>
                  </div>
                  <Badge tone="cyan">{openEvents.length} open</Badge>
                </Link>
              </li>
              <li>
                <Link
                  href="/eos"
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3.5 hover:text-[var(--accent)] transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      02
                    </span>
                    <div>
                      <p className="font-semibold text-[13px] text-text">Explore Playbook</p>
                      <p className="text-[12px] text-text-dim">
                        Elevates principles, workflows, and builder tracks
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-mute">→</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3.5 text-left hover:text-[var(--accent)] transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      03
                    </span>
                    <div>
                      <p className="font-semibold text-[13px] text-text">Join College Chapter</p>
                      <p className="text-[12px] text-text-dim">
                        Have a college invite code? Join your campus chapter instantly
                      </p>
                    </div>
                  </div>
                  <Badge tone="orange">Code required</Badge>
                </button>
              </li>
              <li>
                <Link
                  href="/referrals"
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3.5 hover:text-[var(--accent)] transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      04
                    </span>
                    <div>
                      <p className="font-semibold text-[13px] text-text">Invite Friends</p>
                      <p className="text-[12px] text-text-dim">
                        Share Elevates invite links and build your network
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-mute">→</span>
                </Link>
              </li>
            </ol>
          </TerminalPanel>

          {/* Upcoming Events Spotlight */}
          <TerminalPanel
            title="upcoming.spotlight"
            meta={`${openEvents.length} open events`}
            accent="cyan"
          >
            {openEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-text-dim">
                  No open-to-all events scheduled right now. Check back soon!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {openEvents.slice(0, 2).map((ev) => {
                    const eligibility = canRegisterNow(store, ev, session.userId);
                    const chapter = store.chapters.find((c) => c.id === ev.chapterId);
                    return (
                      <TicketCard
                        key={ev.id}
                        event={ev}
                        href={chapter ? `/chapter/${chapter.slug}/events/${ev.id}` : `/notifications`}
                        className="bg-bg shadow-[var(--shadow-sm)]"
                        meta={`${chapter ? chapter.college : "Elevates"} · open for all participants`}
                        hideStatus={true}
                        footer={
                          <>
                            {eligibility.ok ? (
                              <Link href={`/f/${eligibility.formId}`}>
                                <Button variant="orange" className="h-8 px-3 text-xs">
                                  Register
                                </Button>
                              </Link>
                            ) : (
                              <Link href={chapter ? `/chapter/${chapter.slug}/events/${ev.id}` : "#"}>
                                <Button variant="primary" className="h-8 px-3 text-xs">
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

                <div className="pt-2 flex justify-end">
                  <Link href="/events">
                    <Button variant="ghost" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                      View all {openEvents.length} open events →
                    </Button>
                  </Link>
                </div>
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

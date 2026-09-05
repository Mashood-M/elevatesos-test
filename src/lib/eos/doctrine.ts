/** Elevates Operating System — community doctrine types and empty fallbacks.
 * All doctrine data is stored in and loaded dynamically from Supabase (`organizations.settings.doctrine`).
 */
import type { EventProgressStage } from "@/types";

export const EOS_VISION = "";
export const EOS_MISSION: string[] = [];
export const EOS_PHILOSOPHY: string[] = [];
export const EOS_PRINCIPLES: string[] = [];
export const EOS_PILLARS: { id: string; title: string; body: string }[] = [];
export const EOS_CORE_RULES: string[] = [];
export const EOS_COMMUNITY_TIERS: { key: string; label: string; blurb?: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "participant", label: "Participants" },
  { key: "active", label: "Active members" },
  { key: "cluster", label: "Cluster members" },
  { key: "executive", label: "Executive team" },
  { key: "campus_lead", label: "Campus Lead" },
];
export const EOS_JOURNEY_STAGES: { key: string; label: string }[] = [
  { key: "awareness", label: "Awareness" },
  { key: "workshop", label: "Workshop" },
  { key: "hands_on", label: "Hands-on" },
  { key: "cluster", label: "Cluster" },
  { key: "projects", label: "Projects" },
  { key: "leadership", label: "Leadership" },
];
export const EOS_JOURNEY_BEYOND = "";
export const EOS_EVENT_PROGRESSION: { key: EventProgressStage; label: string }[] = [];
export const EOS_ACTIVITIES: string[] = [];
export const EOS_CHAPTER_STANDARDS: (string | { id: string; label: string })[] = [];
export const EOS_CLUSTER_RESPONSIBILITIES: string[] = [];
export const EOS_SUCCESS_METRICS: string[] = [];
export const PLAYBOOK_SECTIONS: { id: string; label: string }[] = [
  { id: "foundations", label: "Foundations" },
  { id: "community", label: "Community" },
  { id: "path", label: "Path" },
  { id: "practice", label: "Practice" },
  { id: "proof", label: "Proof" },
];

export type EngagementTierKey = string;
export type JourneyStageKey = string;

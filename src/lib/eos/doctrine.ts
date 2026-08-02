/** Elevates Operating System — community doctrine (playbook content). */

import type { EventProgressStage } from "@/types";

export const EOS_VISION =
  "Build Kerala’s largest student innovation network.";

export const EOS_MISSION = [
  "Discover hidden talent.",
  "Build confidence.",
  "Create opportunities.",
  "Develop industry-ready innovators.",
];

export const EOS_PHILOSOPHY = [
  "We don’t create talent.",
  "We discover it.",
  "We nurture it.",
  "We showcase it.",
];

/** Values that shape culture — distinct from non-negotiable core rules. */
export const EOS_PRINCIPLES = [
  "Open community",
  "Learn by building",
  "Technology for every department",
  "Leadership through responsibility",
  "Community before competition",
  "Projects over certificates",
  "Anyone can join anytime",
];

export const EOS_PILLARS = [
  {
    id: "open",
    title: "Open Community",
    body: "Every student belongs to Elevates. No fee, no department gate, no year restriction.",
  },
  {
    id: "talent",
    title: "Talent Discovery",
    body: "We find hidden talent — especially students who are often overlooked.",
  },
  {
    id: "cluster",
    title: "Cluster-Based Growth",
    body: "Committed students grow through advanced learning and real projects in clusters.",
  },
  {
    id: "build",
    title: "Build First",
    body: "Projects, products, and real-world experience matter more than certificates.",
  },
  {
    id: "lead",
    title: "Student Leadership",
    body: "Students lead the community, mentor others, and build a sustainable culture.",
  },
] as const;

/** Non-negotiable norms for every chapter. */
export const EOS_CORE_RULES = [
  "Student-led",
  "Faculty optional",
  "No membership fee",
  "No politics",
  "No discrimination",
  "Respect every department",
  "Build before you speak",
  "Share knowledge freely",
];

export const EOS_COMMUNITY_TIERS = [
  { key: "everyone", label: "Everyone", blurb: "Campus community — automatic belonging" },
  { key: "participant", label: "Participants", blurb: "Attended an event or workshop" },
  { key: "active", label: "Active members", blurb: "Consistent contribution" },
  { key: "cluster", label: "Cluster members", blurb: "Invited builders in a track" },
  { key: "executive", label: "Executive team", blurb: "Running the chapter" },
  { key: "campus_lead", label: "Campus Lead", blurb: "Chapter lead — earned via leadership term" },
] as const;

/** Stages the product derives today — keep playbook and progression aligned. */
export const EOS_JOURNEY_STAGES = [
  { key: "awareness", label: "Awareness" },
  { key: "workshop", label: "Workshop" },
  { key: "hands_on", label: "Hands-on" },
  { key: "cluster", label: "Cluster" },
  { key: "projects", label: "Projects" },
  { key: "leadership", label: "Leadership" },
] as const;

export const EOS_JOURNEY_BEYOND =
  "Beyond: mentorship and alumni — earned after sustained leadership contribution.";

/** Shared ladder with `EventProgressStage` keys. */
export const EOS_EVENT_PROGRESSION: {
  key: EventProgressStage;
  label: string;
}[] = [
  { key: "open", label: "Open event" },
  { key: "workshop", label: "Workshop" },
  { key: "hands_on", label: "Hands-on" },
  { key: "challenge", label: "Mini challenge" },
  { key: "cluster_selection", label: "Cluster selection" },
  { key: "advanced", label: "Advanced session" },
  { key: "sprint", label: "Project sprint" },
  { key: "demo_day", label: "Demo day" },
];

export const EOS_ACTIVITIES = [
  "Workshops",
  "Guest talks",
  "Build sprints",
  "Hackathons",
  "Project showcases",
  "Open source",
  "Community meetups",
  "Career sessions",
  "Industry visits",
  "Startup talks",
] as const;

export const EOS_CHAPTER_STANDARDS = [
  { id: "workshops", label: "Conduct workshops" },
  { id: "clusters", label: "Run clusters" },
  { id: "projects", label: "Build projects" },
  { id: "docs", label: "Maintain documentation" },
  { id: "feedback", label: "Collect feedback" },
  { id: "outcomes", label: "Publish outcomes" },
  { id: "juniors", label: "Support juniors" },
] as const;

export const EOS_CLUSTER_RESPONSIBILITIES = [
  "Advanced workshops",
  "Weekly sessions",
  "Real client projects",
  "Internal products",
  "Hackathons",
  "Open source",
  "Mentorship",
  "Leadership opportunities",
] as const;

export const EOS_SUCCESS_METRICS = [
  "Students reached",
  "Workshop attendance",
  "Active members",
  "Cluster members",
  "Projects completed",
  "Open-source contributions",
  "Community projects",
  "Industry collaborations",
  "Placements",
  "Startups",
  "Leadership growth",
] as const;

export const PLAYBOOK_SECTIONS = [
  { id: "foundations", label: "Foundations" },
  { id: "community", label: "Community" },
  { id: "path", label: "Path" },
  { id: "practice", label: "Practice" },
  { id: "proof", label: "Proof" },
] as const;

export type EngagementTierKey = (typeof EOS_COMMUNITY_TIERS)[number]["key"];
export type JourneyStageKey = (typeof EOS_JOURNEY_STAGES)[number]["key"];

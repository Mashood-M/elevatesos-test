export interface PeerLabFacilitator {
  name: string;
  role: string;
}

export interface PeerLabResource {
  title: string;
  url: string;
  type: string;
}

export interface PeerLabLesson {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  eventSlug?: string;
}

export interface PeerLabSeries {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  campusName: string;
  status: "Active" | "Upcoming" | "Completed";
  joinedCount: number;
  featured?: boolean;
  facilitators: PeerLabFacilitator[];
  resources: PeerLabResource[];
  lessons: PeerLabLesson[];
}

export const PEER_LABS: PeerLabSeries[] = [
  {
    id: "cybersec-defense-lab",
    slug: "cybersec-defense-lab",
    title: "Cybersecurity Lab",
    subtitle: "3-Phase Hands-on Kali Linux & Network Defense",
    description: "Master terminal navigation, network mapping, vulnerability inspection, and defensive security drills in a safe, peer-mentored environment.",
    campusName: "Eranad Knowledge City Technical Campus (EKCTC)",
    status: "Completed",
    joinedCount: 76,
    featured: true,
    facilitators: [
      { name: "Adhinan K", role: "Cybersecurity Lead" },
      { name: "Sarhan Qadir", role: "Lab Facilitator" }
    ],
    resources: [
      { title: "Kali Linux Setup & Terminal Cheatsheet", url: "https://github.com/Elevates-Foundation", type: "Doc" },
      { title: "Wireshark Packet Analysis Labs", url: "https://github.com/Elevates-Foundation", type: "Labs" }
    ],
    lessons: [
      { id: "cs-1", slug: "cybersec-basics", title: "Phase 1: Kali Linux & Network Defense (2nd & 3rd Years)", date: "17 Sep 2025", time: "10:00 AM", location: "EKCTC Lab", eventSlug: "cybersec-basics" },
      { id: "cs-2", slug: "cybersec-basics", title: "Phase 2: Terminal Fundamentals (1st Years)", date: "24 Sep 2025", time: "10:00 AM", location: "EKCTC Lab", eventSlug: "cybersec-basics" },
      { id: "cs-3", slug: "cybersec-basics", title: "Phase 3: Security & Ethical Hacking (4th Years)", date: "25 Sep 2025", time: "10:00 AM", location: "EKCTC Lab", eventSlug: "cybersec-basics" },
      { id: "cs-4", slug: "cyber-raid-ctf", title: "Capstone: Cyber Raid Capture The Flag (₹1500 Prize Pool)", date: "09 Oct 2025", time: "10:00 AM", location: "EKCTC Campus", eventSlug: "cyber-raid-ctf" }
    ]
  }
];

export function getPeerLabBySlug(slug: string): PeerLabSeries | undefined {
  return PEER_LABS.find((p) => p.slug === slug || p.id === slug);
}

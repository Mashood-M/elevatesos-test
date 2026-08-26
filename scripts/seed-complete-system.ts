import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load .env file variables manually
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const ORG_ID = "e1000000-0000-4000-8000-000000000001";
const CHAPTER_ID = "c1000000-0000-4000-8000-000000000001";

function toUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash("md5").update(String(id)).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const ALL_FOUNDERS = [
  { id: "sarhan-qadir-kvm", name: "Sarhan Qadir KVM", tag: "Main Class Bunker", role: "Founder", proof: "Full-stack · Built elevates.live", email: "sarhan@elevates.live", image: "/images/founders/sarhan-qadir.jpeg" },
  { id: "naseem-shan", name: "Naseem Shan", tag: "Studies In Silence", role: "Founder", proof: "Backend · Systems & Infrastructure", email: "naseem@elevates.live", image: "/images/founders/naseem-shan.jpeg" },
  { id: "muhammed-nafih-p", name: "Muhammed Nafih P", tag: "Design Wizard", role: "Founder", proof: "Design · Aaroh brand and UI", email: "nafih@elevates.live", image: "/images/founders/nafih.jpeg" },
  { id: "anil-das-p", name: "Anil Das P", tag: "Last Minute Committer", role: "Founder", proof: "Development · Ships right before deadline", email: "anil@elevates.live", image: "/images/founders/anil-das.jpeg" },
  { id: "nadheem-roshan", name: "Nadheem Roshan", tag: "Coming for 75% Attendance", role: "Founder", proof: "IoT · Hardware & Embedded Systems", email: "nadheem@elevates.live", image: "/images/founders/nadheem.jpg" },
  { id: "muhammed-shanif-p", name: "Muhammed Shanif P", tag: "Hardware Hacker", role: "Founder", proof: "Embedded · Vibranium RFID check-in", email: "shanif@elevates.live", image: "/images/founders/shanif.jpeg" },
  { id: "adhinan-k", name: "Adhinan K", tag: "Terminal Addict", role: "Founder", proof: "DevOps · Linux & server infrastructure", email: "adhinan@elevates.live", image: "/images/founders/adhinan.png" },
  { id: "mashood-m", name: "Mashood M", tag: "Unfinished Project Collector", role: "Founder", proof: "Development · Multiple ambitious WIPs", email: "mashood@elevates.live", image: "/images/founders/mashood.jpeg" },
  { id: "mohammed-shahin-ek", name: "Mohammed Shahin E K", tag: "Late Night Shipper", role: "Founder", proof: "Backend · 400k requests, zero downtime", email: "shahin@elevates.live", image: "/images/founders/shahin-ek.jpeg" },
  { id: "shifna-kp", name: "Shifna K P", tag: "The Reason We Shipped", role: "Founder", proof: "Ops · Campus launch, 120 seats in 2 hours", email: "shifna@elevates.live", image: "/images/founders/shifna.jpeg" },
  { id: "mohammed-mijvad", name: "Mohammed Mijvad", tag: "Lab Bench Resident", role: "Founder", proof: "Hardware · Lab systems & electronics", email: "mijvad@elevates.live", image: "/images/founders/mijvad.jpeg" },
  { id: "sona-varghese", name: "Sona Varghese", tag: "Zero Stage Fear", role: "Founder", proof: "Events · Ran the first public showcase", email: "sona@elevates.live", image: "/images/founders/sona.jpg" },
  { id: "ashith-mk", name: "Ashith MK", tag: "Bug Hunter", role: "Founder", proof: "Security · Ran the cybersecurity workshop", email: "ashith@elevates.live", image: "/images/founders/ashith.jpeg" },
  { id: "arshak-perumballi", name: "Arshak Perumballi", tag: "PPT Specialist", role: "Founder", proof: "Comms · Every deck that got us in a room", email: "arshak@elevates.live", image: "/images/founders/arshak.png" },
  { id: "sinan-nooren", name: "Sinan Nooren", tag: "Quiet Builder", role: "Founder", proof: "Development · Builds first, talks later", email: "sinan@elevates.live", image: "/images/founders/sinan-nooren.png" },
  { id: "muhammed-fiyas-n", name: "Muhammed Fiyas", tag: "Works On My Machine", role: "Founder", proof: "Development · Environment debugging specialist", email: "fiyas@elevates.live", image: "/images/founders/fiyas.png" },
  { id: "adil-pt", name: "Adil P T", tag: "Back Bencher", role: "Founder", proof: "Dev · Quietly ships from the last row", email: "adil@elevates.live", image: "/images/founders/adil.jpeg" },
  { id: "abdul-haadi", name: "Abdul Haadi", tag: "Front Bencher", role: "Founder", proof: "Python · Development & Backend", email: "haadi@elevates.live", image: "/images/founders/haadi.jpeg" },
];

const ALL_19_EVENTS = [
  { id: "decode-linkedin-shiju-mishal", slug: "decode-linkedin-shiju-mishal", title: "LET'S DECODE LINKEDIN", tagline: "The LinkedIn Way · Professional Branding, Networking & Internships", description: "Full-day interactive workshop on unlocking the full potential of LinkedIn for personal branding, recruiter networking, and high-impact internship search.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2026-07-22T10:00:00+05:30", endsAt: "2026-07-22T16:00:00+05:30", bannerUrl: "/images/events/decode-linkedin-shiju-mishal.jpeg" },
  { id: "career-catalyst-baiju", slug: "career-catalyst-baiju", title: "CAREER CATALYST — WORKSHOP", tagline: "Want to Get Hired? Start Here · Employability, Resumes & Mock Interviews", description: "Full-day interactive employability and placement preparation workshop led by Prof. Baiju B S.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2026-07-15T10:00:00+05:30", endsAt: "2026-07-15T16:00:00+05:30", bannerUrl: "/images/events/career-catalyst-baiju.jpeg" },
  { id: "vibe-coding-brototype", slug: "vibe-coding-brototype", title: "VIBE CODING WORKSHOP", tagline: "Build, Create & Innovate · AI-Assisted Rapid Development with Brototype", description: "Full-day hands-on Vibe Coding workshop conducted by Brototype and powered by ELEVATES.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2026-03-26T10:00:00+05:30", endsAt: "2026-03-26T16:00:00+05:30", bannerUrl: "/images/events/vibe-coding-brototype.jpeg" },
  { id: "cse-association-revamp-mehar", slug: "cse-association-revamp-mehar", title: "REVAMP OF CSE ASSOCIATION (CELESTIA)", tagline: "Official Association Relaunch · Chief Guest Mehar M P (Co-Founder, TinkerHub)", description: "Official relaunch and revamp of the Computer Science Engineering Association at EKCTC.", venue: "Seminar Hall, EKCTC", category: "meetup", status: "completed", startsAt: "2026-03-25T14:00:00+05:30", endsAt: "2026-03-25T16:00:00+05:30", bannerUrl: "/images/events/cse-association-revamp-mehar.jpeg" },
  { id: "aids-association-inauguration", slug: "aids-association-inauguration", title: "AI & DS ASSOCIATION INAUGURATION", tagline: "Inauguration & Industry Keynote · Guests from Elyst AI", description: "Inauguration ceremony of the AI & Data Science Association at EKCTC.", venue: "Seminar Hall, EKCTC", category: "meetup", status: "completed", startsAt: "2026-03-12T10:00:00+05:30", endsAt: "2026-03-12T13:00:00+05:30", bannerUrl: "/images/events/aids-association-inauguration.jpeg" },
  { id: "elevates-campus-launch-ekctc", slug: "elevates-campus-launch-ekctc", title: "ELEVATES CAMPUS LAUNCH", tagline: "Official Chapter Opening & Leadership Handover · Chief Guest Shibili Rahman KP", description: "Official ELEVATES Campus Chapter Launch and leadership handover ceremony at EKCTC.", venue: "Seminar Hall, EKCTC", category: "meetup", status: "completed", startsAt: "2026-03-04T10:00:00+05:30", endsAt: "2026-03-04T13:00:00+05:30", bannerUrl: "/images/events/campus-launch-ekctc.jpeg" },
  { id: "basics-of-iot-naval", slug: "basics-of-iot-naval", title: "BASICS OF IOT WORKSHOP", tagline: "Step Into the World of IoT · Sensors, Microcontrollers & Cloud Dashboards", description: "Full-day hands-on workshop on smart sensors, microcontroller interfacing, and cloud dashboards.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2026-02-19T10:00:00+05:30", endsAt: "2026-02-19T16:00:00+05:30", bannerUrl: "/images/events/basics-of-iot-naval.jpeg" },
  { id: "dgps-land-survey-favad", slug: "dgps-land-survey-favad", title: "LAND SURVEY USING DGPS — WORKSHOP", tagline: "Modern Land Surveying & Differential GPS Technology in Action", description: "Practical outdoor hands-on surveying workshop on DGPS (Differential GPS) technology.", venue: "EKC Volleyball Court, EKCTC", category: "workshop", status: "completed", startsAt: "2026-01-19T10:00:00+05:30", endsAt: "2026-01-19T13:00:00+05:30", bannerUrl: "/images/events/dgps-survey-favad.jpeg" },
  { id: "modern-web-design-danish", slug: "modern-web-design-danish", title: "MODERN WEB DESIGN WORKSHOP", tagline: "Web Fundamentals, UI/UX, Bootstrap 5 & GitHub Pages Deployment", description: "Full-day hands-on workshop covering web fundamentals and GitHub Pages deployment.", venue: "Lab 4, EKCTC", category: "workshop", status: "completed", startsAt: "2026-01-12T10:00:00+05:30", endsAt: "2026-01-12T16:00:00+05:30", bannerUrl: "/images/events/modern-web-design-danish.jpeg" },
  { id: "no-code-ai-anshiq", slug: "no-code-ai-anshiq", title: "NO-CODE AI & AUTOMATION WORKSHOP", tagline: "Build Powerful AI Automations & Agents with n8n Without Writing Code", description: "Full-day hands-on workshop on n8n, AI workflow chaining, and autonomous agents.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2026-01-07T10:00:00+05:30", endsAt: "2026-01-07T16:00:00+05:30", bannerUrl: "/images/events/no-code-ai-anshiq.jpeg" },
  { id: "digital-marketing-kalkus", slug: "digital-marketing-kalkus", title: "DIGITAL MARKETING WORKSHOP", tagline: "By Kalkus Studio · Brand Growth, Social Media Strategy, SEO & Ad Analytics", description: "A practical beginner-friendly workshop by Kalkus Studio covering digital brand growth.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2025-12-10T10:00:00+05:30", endsAt: "2025-12-10T13:00:00+05:30", bannerUrl: "/images/events/digital-marketing-kalkus.jpeg" },
  { id: "cyber-raid-ctf", slug: "cyber-raid-ctf", title: "CYBER RAID — CAPTURE THE FLAG", tagline: "Hack. Solve. Conquer · ₹1500 Prize Pool by ELEVATES", description: "Competitive Capture The Flag battlefield featuring binary exploitation and CTF drills.", venue: "EKCTC", category: "challenge", status: "completed", startsAt: "2025-10-09T10:00:00+05:30", endsAt: "2025-10-09T16:30:00+05:30", bannerUrl: "/images/events/adhinan-ctf.jpeg" },
  { id: "buzzer-to-buzzer", slug: "buzzer-to-buzzer", title: "BUZZER TO BUZZER — TECH QUIZ", tagline: "Only the Fastest Mind Wins · High-Stakes Tech Quiz Battle", description: "High-stakes head-to-head buzzer quiz battle testing reflexes and engineering knowledge.", venue: "EKCTC", category: "challenge", status: "completed", startsAt: "2025-10-09T10:00:00+05:30", endsAt: "2025-10-09T15:30:00+05:30", bannerUrl: "/images/events/buzzer-to-buzzer.jpeg" },
  { id: "vibranium-vibe-coding", slug: "vibranium-vibe-coding", title: "VIBRANIUM 5.0 — VIBE CODING", tagline: "Code & Conquer · ₹250 Prize Pool by ELEVATES", description: "Two-hour dynamic vibe coding workshop and speed programming challenge.", venue: "Seminar Hall, EKCTC", category: "challenge", status: "completed", startsAt: "2025-10-09T10:00:00+05:30", endsAt: "2025-10-09T12:00:00+05:30", bannerUrl: "/images/events/vibe-coding-vibranium.jpeg" },
  { id: "vibranium-ai-battle", slug: "vibranium-ai-battle", title: "VIBRANIUM 5.0 — AI BATTLE ARENA", tagline: "Where Powerful LLMs Collide · Live AI Chess Duels", description: "Interactive AI showcase stall where LLM models battle in digital chess duels.", venue: "EKCTC", category: "showcase", status: "completed", startsAt: "2025-10-09T10:00:00+05:30", endsAt: "2025-10-09T16:00:00+05:30", bannerUrl: "/images/events/ai-battle-vibranium.jpeg" },
  { id: "vibranium-qr-treasure-hunt", slug: "vibranium-qr-treasure-hunt", title: "VIBRANIUM 5.0 — QR TREASURE HUNT", tagline: "Campus-Wide Cryptic QR Challenge by ELEVATES & Vibranium", description: "An interactive campus-wide cryptographic scavenger hunt hosted during Vibranium 5.0.", venue: "EKCTC", category: "challenge", status: "completed", startsAt: "2025-10-09T10:00:00+05:30", endsAt: "2025-10-09T13:30:00+05:30", bannerUrl: "/images/events/qr-tressure-hunt-vibranium.jpeg" },
  { id: "first-spark-electronics", slug: "first-spark-electronics", title: "FIRST SPARK — BASICS OF ELECTRONICS", tagline: "Circuit Fundamentals & Semiconductors by Sahad Nisham K", description: "Beginner-friendly hands-on session covering essential building blocks of electronic systems.", venue: "ECE Digital Lab, EKCTC", category: "workshop", status: "completed", startsAt: "2025-09-26T10:00:00+05:30", endsAt: "2025-09-26T16:00:00+05:30", bannerUrl: "/images/events/spark-sahad-nisham.jpeg" },
  { id: "stap-skill-assessment", slug: "stap-skill-assessment", title: "STAP — SKILL TASTE ASSESSMENT", tagline: "Find Your Skill & Build Your Portfolio by Skilltrai", description: "Hands-on assessment workshop exploring AI, data analytics, UI/UX, and freelancing.", venue: "Seminar Hall, EKCTC", category: "workshop", status: "completed", startsAt: "2025-09-22T14:00:00+05:30", endsAt: "2025-09-22T17:30:00+05:30", bannerUrl: "/images/events/stap-by-skilltrai.jpeg" },
  { id: "cybersec-basics", slug: "cybersec-basics", title: "CYBERSECURITY WORKSHOP", tagline: "Hands-on Kali Linux & Defensive Security by Adhinan K", description: "Hands-on cybersecurity workshop covering Kali Linux terminal navigation and network defense.", venue: "EKCTC", category: "workshop", status: "completed", startsAt: "2025-09-17T10:00:00+05:30", endsAt: "2025-09-25T16:10:00+05:30", bannerUrl: "/images/events/cybersecurity-workshop.jpeg" },
];

const ALL_PROJECTS = [
  { id: "vibranium", title: "Vibranium RFID & TechFest Platform", slug: "vibranium", description: "RFID smart badge ingress, automated leaderboard, dynamic certificate dispenser & event operations system.", stage: "production", project_type: "platform", repository_url: "https://github.com/Elevates-Foundation/vibranium", demo_url: "https://vibranium.live", awards: ["Best Technical Platform 2025"], progress: 100 },
  { id: "aaroh", title: "Aaroh Cultural Fest Platform", slug: "aaroh", description: "Official event ticketing, live voting, dynamic schedule & stage tracking engine built for Aaroh.", stage: "production", project_type: "platform", repository_url: "https://github.com/Elevates-Foundation/aaroh", demo_url: "https://aaroh.live", awards: ["Scale Benchmark (400k req)"], progress: 100 },
  { id: "elevates-os", title: "Elevates OS Multi-Campus Management Engine", slug: "elevates-os", description: "Chapter governance, event lifecycle, QR validation, forms pipeline & analytics dashboard.", stage: "production", project_type: "platform", repository_url: "https://github.com/Elevates-Foundation/elevates-os", demo_url: "https://os.elevates.live", awards: ["Architecture Award 2026"], progress: 100 },
  { id: "celestia", title: "Celestia Department Portal", slug: "celestia", description: "Department portal built in 1 hour with Python OpenCV gesture launch.", stage: "production", project_type: "platform", repository_url: "https://github.com/Elevates-Foundation/celestia", demo_url: "https://celestia-web-lti6.vercel.app", awards: ["Gesture Launch Award"], progress: 100 },
];

const ALL_PEER_LABS = [
  { id: "cybersec-defense-lab", slug: "cybersec-defense-lab", title: "Cybersecurity Lab", track: "Defensive Security & Kali Linux", description: "Master terminal navigation, network mapping, vulnerability inspection, and defensive security drills.", status: "completed", applications_open: false, banner_url: "/images/events/cybersecurity-workshop.jpeg", enrolled_count: 76 },
];

async function seedEverything() {
  console.log("🚀 Starting complete database seeding to Supabase...");

  // 1. Seed Profiles (Founders)
  console.log(`Seeding ${ALL_FOUNDERS.length} Founder Profiles...`);
  const profilePayload = ALL_FOUNDERS.map((f) => ({
    id: toUuid(f.id),
    email: f.email,
    full_name: f.name,
    avatar_url: f.image,
    chapter_id: CHAPTER_ID,
    status: "active",
    is_public: true,
    bio: `${f.role} · ${f.proof} (${f.tag})`,
    skills: ["Development", "Innovation", f.tag],
  }));

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });
  if (profErr) console.error("Profiles Seed Error:", profErr);
  else console.log("✓ Profiles seeded successfully.");

  // 2. Seed Events (All 19)
  console.log(`Seeding ${ALL_19_EVENTS.length} Events...`);
  const sarhanUuid = toUuid("sarhan-qadir-kvm");

  const { data: existingEvents } = await supabase.from("events").select("id, slug");
  const eventSlugToIdMap = new Map<string, string>();
  existingEvents?.forEach((e) => {
    if (e.slug) eventSlugToIdMap.set(e.slug, e.id);
  });

  const eventPayload = ALL_19_EVENTS.map((e) => ({
    id: eventSlugToIdMap.get(e.slug) || toUuid(e.id),
    chapter_id: CHAPTER_ID,
    title: e.title,
    slug: e.slug,
    description: e.description,
    summary: e.tagline,
    venue: e.venue,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    organizer_id: sarhanUuid,
    capacity: 100,
    waitlist_capacity: 20,
    visibility: "public",
    registration_start: e.startsAt,
    registration_end: e.endsAt,
    status: e.status,
    certificate_enabled: true,
    ticket_no: `T-${e.slug.slice(0, 8)}`,
    category: e.category,
    banner_url: e.bannerUrl,
    mode: "in_person",
  }));

  const { error: evErr } = await supabase
    .from("events")
    .upsert(eventPayload, { onConflict: "id" });
  if (evErr) console.error("Events Seed Error:", evErr);
  else console.log("✓ Events seeded successfully.");

  // 3. Seed Projects
  console.log(`Seeding ${ALL_PROJECTS.length} Projects...`);
  const { data: existingProjects } = await supabase.from("projects").select("id, slug");
  const projectSlugToIdMap = new Map<string, string>();
  existingProjects?.forEach((p) => {
    if (p.slug) projectSlugToIdMap.set(p.slug, p.id);
  });

  const projectPayload = ALL_PROJECTS.map((p) => ({
    id: projectSlugToIdMap.get(p.slug) || toUuid(p.id),
    chapter_id: CHAPTER_ID,
    title: p.title,
    slug: p.slug,
    description: p.description,
    stage: p.stage,
    project_type: p.project_type,
    repository_url: p.repository_url,
    demo_url: p.demo_url,
    awards: p.awards,
    progress: p.progress,
    is_showcased: true,
  }));

  const { error: prErr } = await supabase
    .from("projects")
    .upsert(projectPayload, { onConflict: "id" });
  if (prErr) console.error("Projects Seed Error:", prErr);
  else console.log("✓ Projects seeded successfully.");

  // 4. Seed Peer Labs
  console.log(`Seeding ${ALL_PEER_LABS.length} Peer Labs...`);
  const { data: existingLabs } = await supabase.from("peer_labs").select("id, slug");
  const labSlugToIdMap = new Map<string, string>();
  existingLabs?.forEach((l) => {
    if (l.slug) labSlugToIdMap.set(l.slug, l.id);
  });

  const peerLabPayload = ALL_PEER_LABS.map((l) => ({
    id: labSlugToIdMap.get(l.slug) || toUuid(l.id),
    slug: l.slug,
    title: l.title,
    track: l.track,
    description: l.description,
    status: l.status,
    applications_open: l.applications_open,
    banner_url: l.banner_url,
    enrolled_count: l.enrolled_count,
  }));

  const { error: labErr } = await supabase
    .from("peer_labs")
    .upsert(peerLabPayload, { onConflict: "id" });
  if (labErr) console.error("Peer Labs Seed Error:", labErr);
  else console.log("✓ Peer Labs seeded successfully.");

  console.log("🎉 ALL SYSTEM DATA PUSHED TO SUPABASE SUCCESSFULLY!");
}

seedEverything().catch(console.error);

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface ProjectBuilder {
  role: string;
  name: string;
  founderId?: string;
  did?: string;
}

export interface ProjectContributor {
  name: string;
  detail: string;
  did?: string;
}

export interface ProjectFaculty {
  name: string;
  detail: string;
}

export interface ProjectGalleryItem {
  src: string;
  caption: string;
}

export interface FlagshipProject {
  slug: string;
  title: string;
  client: string;
  date: string;
  type: "flagship" | "open-tool" | "ecosystem";
  status: "live" | "live-incomplete" | "live-unmaintained" | "archived";
  tagline: string;
  summary: string;
  metrics: ProjectMetric[];
  stack: string[];
  repo: string | null;
  live: string | null;
  cover: string;
  situation: {
    title: string;
    paragraphs: string[];
    highlight: string;
  };
  numbers: ProjectMetric[];
  whatWeBuilt: string[];
  whatActuallyRunsToday?: string;
  whatStalled?: string;
  howItHeldUp: {
    summary: string;
    metrics: ProjectMetric[];
    details: string[];
  };
  whatWouldDoDifferently?: string[];
  whatWeWouldDoDifferently?: string[];
  builders: ProjectBuilder[];
  contributors?: ProjectContributor[];
  faculty?: ProjectFaculty[];
  stackAndCode: {
    technologies: string[];
    repoUrl: string | null;
    repoNote: string;
    attribution?: {
      name: string;
      url: string;
      note: string;
    };
    attributionsList?: string[];
  };
  gallery?: ProjectGalleryItem[];
  inspiredBy?: {
    name: string;
    url: string;
  };
  datasets?: Array<{
    name: string;
    description: string;
    endpoint: string;
  }>;
}

export interface MemberShowcase {
  id: string;
  title: string;
  builder: string;
  builderId: string;
  cohort: string;
  status: string;
  description: string;
  repo: string | null;
  live: string | null;
}

export const CELESTIA_CASE_STUDY: FlagshipProject = {
  slug: "celestia",
  title: "Celestia — CSE Association Website",
  client: "Celestia, CSE Association — Eranad Knowledge City Technical Campus",
  date: "March 25, 2026",
  type: "flagship",
  status: "live-incomplete",
  tagline: "A department website, rebuilt in one hour.",
  summary: "We were running the event. The guest we had invited was arriving at two o'clock. We had two hours, five juniors, and a specification written on the way to campus. We finished in one hour, launched live on stage via Python gesture recognition.",
  metrics: [
    { value: "1 hour", label: "Build & deploy time to production" },
    { value: "2 hours", label: "Deadline given before guest arrival" },
    { value: "5", label: "Non-founder junior builders (3rd & 1st year)" },
  ],
  stack: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "Lenis", "Python", "OpenCV", "MediaPipe"],
  repo: null,
  live: "https://celestia-web-lti6.vercel.app",
  cover: "/team/elevates-founders.jpeg",
  situation: {
    title: "The One-Hour Challenge",
    paragraphs: [
      "On 25 March 2026 the Computer Science department at Eranad Knowledge City was relaunching its association as Celestia. ELEVATES coordinated the entire relaunch event, and we had invited the chief guest: Moosa Mehar MP, Co-Founder and CEO of TinkerHub Foundation. He was arriving at 2:00 PM.",
      "The association's website was three years old and needed a complete overhaul.",
      "With two hours left, two of us called the HOD from the back of a bike and asked for permission to rebuild it before the guest arrived. Then we named five students, none of whom had built anything for the department before, and three of us walked into their classrooms and pulled them out of their sessions.",
    ],
    highlight: "We invited TinkerHub's CEO, coordinated the event, and rebuilt the department website in 60 minutes.",
  },
  numbers: [
    { value: "1 hour", label: "Time taken to specify, code, and deploy to Vercel" },
    { value: "5", label: "Junior student builders (3rd year & 1st year)" },
    { value: "0", label: "Founding members who wrote code on the day" },
  ],
  whatWeBuilt: [
    "Full 4-route website (Home, Teams, Gallery, Contact) built with React 18, Vite, and Tailwind CSS.",
    "GSAP ScrollTrigger & Lenis smooth scrolling integration for pinned horizontal identity cards.",
    "Python gesture-detection launch mechanism using OpenCV and MediaPipe: Chief Guest raised his hand on stage to trigger the live website launch.",
    "Spec-driven rapid AI build pipeline executed in 60 minutes with Claude & Cursor.",
  ],
  howItHeldUp: {
    summary: "Shipped in 1 hour and deployed live on Vercel before the chief guest arrived. Launched on stage with 100% gesture recognition accuracy on the first attempt.",
    metrics: [
      { value: "100%", label: "First-attempt gesture launch accuracy on stage" },
      { value: "60 mins", label: "Total time from phone call to Vercel deploy" },
    ],
    details: [
      "Five non-founder junior students executed the specification while 7 founding members managed event operations.",
      "Chief Guest Moosa Mehar MP (Co-Founder & CEO of TinkerHub) personally tested the gesture launch and congratulated the student developer.",
    ],
  },
  whatWeWouldDoDifferently: [
    "Never deploy mock placeholder data to production without a pre-deploy read-through out loud.",
    "Restore dropped real faculty testimonials from the previous association site.",
    "Transfer Vercel deployment project ownership to an official institutional account.",
  ],
  builders: [
    { role: "Called the HOD from the bike, directed the build", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm", did: "Called the HOD from the bike, directed the build" },
    { role: "Wrote the build specification", name: "Naseem Shan", founderId: "naseem-shan", did: "Wrote the build specification" },
    { role: "On the bike when the call was made", name: "Mohammed Nafih P", founderId: "muhammed-nafih-p", did: "On the bike when the call was made" },
    { role: "Held the team together until the others arrived", name: "Adhinan K", founderId: "adhinan-k", did: "Held the team together until the others arrived" },
    { role: "Walked into the classrooms and fetched the builders", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek", did: "Walked into the classrooms and fetched the builders" },
    { role: "Walked into the classrooms and fetched the builders", name: "Mashood M", founderId: "mashood-m", did: "Walked into the classrooms and fetched the builders" },
    { role: "Walked into the classrooms and fetched the builders", name: "Arshak", founderId: "arshak", did: "Walked into the classrooms and fetched the builders" },
  ],
  contributors: [
    { name: "Faseen", detail: "3rd year, CSE — Frontend Build" },
    { name: "Shibin", detail: "3rd year, CSE — Frontend Build" },
    { name: "Zakariya", detail: "3rd year, CSE — Frontend Build" },
    { name: "Danish", detail: "1st year, T2 — Frontend Build" },
    { name: "Abhijith CJ", detail: "3rd year, AI & DS — Build & Gesture Launch Developer", did: "Built the gesture-controlled launch" },
  ],
  faculty: [
    { name: "Jasira KT", detail: "ELEVATES Faculty Head, CSE" },
    { name: "Anu K Soman", detail: "HOD, CSE" },
    { name: "Anas Bin Malik", detail: "Assistant Professor, Computer Science and Engineering" },
  ],
  stackAndCode: {
    technologies: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "Lenis", "Python", "OpenCV", "MediaPipe"],
    repoUrl: null,
    repoNote: "Production site deployed directly to Vercel preview under CSE Association Eranad Knowledge City.",
  },
};

export const FLAGSHIP_PROJECTS: FlagshipProject[] = [
  {
    slug: "vibranium-event-platform",
    title: "Vibranium Event Platform",
    client: "Eranad Knowledge City TechFest (Chapter 01)",
    date: "October 2025",
    type: "flagship",
    status: "live",
    tagline: "Five days to build it. 400,000 requests in the first 24 hours. It did not go down.",
    summary: "A complete event management system, running the fest end to end under extreme load.",
    metrics: [
      { value: "400,000", label: "requests in first 24h" },
      { value: "5", label: "days to build & launch" },
      { value: "0", label: "minutes of downtime" },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
    repo: null,
    live: null,
    cover: "/team/elevates-founders.jpeg",
    inspiredBy: {
      name: "MakeMyPass",
      url: "https://makemypass.com",
    },
    situation: {
      title: "The Application Window Was Closed",
      paragraphs: [
        "Vibranium is Eranad Knowledge City's flagship annual tech fest.",
        "Five days before registrations opened, it had no system to handle them. The options were a Google Form and a spreadsheet, or something that actually worked.",
        "ELEVATES was about a month old at that point — founded in September 2025. In our final year, we stopped waiting for permission and built the software our college actually ran on.",
      ],
      highlight: "Five days before registrations opened, our college had no system. So we built one.",
    },
    numbers: [
      { value: "400,000", label: "HTTP requests served in the first 24 hours" },
      { value: "5", label: "days from first commit to live production" },
      { value: "0", label: "minutes of downtime across the 3-day fest" },
    ],
    whatWeBuilt: [
      "Custom ticket generation with dynamic QR code verification",
      "Real-time check-in scanner interface for volunteers at event gates",
      "Admin dashboard with live registration counts, revenue tally, and capacity alerts",
      "PostgreSQL database schema optimized for concurrent write traffic during rush hours",
    ],
    howItHeldUp: {
      summary: "Peak load arrived on Day 1 when 3 events opened registrations simultaneously. The server response latency stayed under 120ms throughout.",
      metrics: [
        { value: "120ms", label: "average API response time under peak load" },
        { value: "100%", label: "ticket scan accuracy at gate entry" },
      ],
      details: [
        "Zero database connection pool exhaustion despite unthrottled burst requests from mobile browsers.",
        "Handled 400,000 total HTTP requests without server crashes or data corruption.",
      ],
    },
    whatWeWouldDoDifferently: [
      "We should have implemented client-side optimistic UI updates for the ticket scanner to feel even faster on 3G connections.",
      "The admin CSV export should have been streamed directly from Postgres rather than buffered in memory.",
    ],
    builders: [
      { role: "Founder & Lead Developer", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
      { role: "Co-Founder & Backend Lead", name: "Naseem Shan", founderId: "naseem-shan" },
      { role: "Development & Full-Stack", name: "Mashood M", founderId: "mashood-m" },
      { role: "Development & UI", name: "Anil Das P", founderId: "anil-das-p" },
      { role: "Development & Operations", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek" },
      { role: "Development & Testing", name: "Muhammed Shanif P", founderId: "muhammed-shanif-p" },
    ],
    stackAndCode: {
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Vercel Edge"],
      repoUrl: null,
      repoNote: "Private repository — production software built for Eranad Knowledge City (Chapter 01) TechFest.",
      attribution: {
        name: "MakeMyPass",
        url: "https://makemypass.com",
        note: "Inspired by MakeMyPass. Built from scratch by ELEVATES engineers for college fests.",
      },
    },
    gallery: [
      {
        src: "/projects/vibranium/digital-entry-pass.png",
        caption: "Digital Entry Pass — Unique QR verification pass for participants (Participant ID: VIBFC70D711), powered by ELEVATES for gate entry.",
      },
      {
        src: "/projects/vibranium/organizer-dashboard.png",
        caption: "Organizer Console — Real-time overview monitoring 42 total events, 901 registrations, 468 participants, and live check-in rates.",
      },
      {
        src: "/projects/vibranium/events-catalog.png",
        caption: "Events & Competitions Catalog — Live department filters (CS, Electronics, Mechanical, Civil, Safety & Fire, S&H) with real-time seat capacity bars.",
      },
      {
        src: "/projects/vibranium/staff-dashboard.png",
        caption: "Department Staff Dashboard — Managing Computer Science events (286 participants, 15 events, 20 assigned coordinators, 37 volunteers).",
      },
      {
        src: "/projects/vibranium/volunteer-scanner.png",
        caption: "Volunteer Gate Check-in Console — Live assignment tracking for volunteer gate stewards at event entry points.",
      },
      {
        src: "/projects/vibranium/roles-and-access.png",
        caption: "Roles & Access Control — Admin management interface to invite organizers, staff, coordinators, and assign system privileges.",
      },
      {
        src: "/projects/vibranium/coordinator-analytics.png",
        caption: "Coordinator Analytics Dashboard — Real-time registration approval monitoring and participation volume tracking.",
      },
    ],
  },
  {
    slug: "aaroh-arts-platform",
    title: "Aaroh Arts Platform",
    client: "Eranad Knowledge City Arts Fest (Chapter 01)",
    date: "January 5, 2026",
    type: "flagship",
    status: "live",
    tagline: "The second platform. This time we knew what we were doing.",
    summary: "Sophisticated web application streamlining the entire lifecycle of an arts festival — from student enrollment and event scheduling to real-time participation monitoring and automated PDF reporting.",
    metrics: [
      { value: "2nd", label: "production platform shipped" },
      { value: "50+", label: "stage competitions & events" },
      { value: "100%", label: "repeat college deployment" },
    ],
    stack: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "Supabase", "TanStack Query", "Zod", "jsPDF"],
    repo: "https://github.com/elevates-club/aaroh",
    live: null,
    cover: "/team/elevates-founders.jpeg",
    situation: {
      title: "The Repeat Client",
      paragraphs: [
        "Aaroh (meaning 'Ascent') is Eranad Knowledge City's annual inter-department arts festival.",
        "After Vibranium 5.0 succeeded, the college leadership returned to ask ELEVATES to build the complete event management, scoring, and scheduling system for the arts fest.",
        "A repeat client is the strongest proof available — one platform is luck, two platforms is a pattern.",
      ],
      highlight: "After Vibranium succeeded under 400k requests, our college returned to ask ELEVATES to build the arts fest platform.",
    },
    numbers: [
      { value: "4", label: "Role dashboards (Admin, Manager, Coordinator, Student)" },
      { value: "50+", label: "Arts competitions & stage events managed" },
      { value: "Real-time", label: "Supabase live monitoring & audit logs" },
    ],
    whatWeBuilt: [
      "Role-Based Access Control: Dedicated dashboards for Admins, Event Managers, Coordinators, and Students.",
      "Dynamic Event Management: Create and manage diverse event categories with custom capacity limits and registration deadlines.",
      "Real-Time Monitoring: Live tracking of event participation levels (Low Participation vs. At Capacity) powered by Supabase.",
      "Automated Registrations: Smart validation for on-stage and off-stage event limits per student using React Hook Form & Zod.",
      "Operational Oversight: Comprehensive Audit Logs to monitor system-wide configuration changes and user logins.",
      "Professional Reporting: Integrated PDF generation for student registrations and event rosters using jsPDF.",
    ],
    howItHeldUp: {
      summary: "Built with lessons learned from Vibranium — cleaner architecture with Vite + Supabase, zero rush-hour bugs, and instant real-time result updates.",
      metrics: [
        { value: "0", label: "critical bugs during live scoring" },
        { value: "Real-time", label: "Supabase live sync for 1,000+ audience" },
      ],
      details: [
        "Handled simultaneous stage updates from multiple venues without race conditions or score calculation errors using Row Level Security (RLS) policies.",
      ],
    },
    whatWeWouldDoDifferently: [
      "We should have provided offline judge draft saving in local storage before pushing to Supabase.",
      "Batch PDF roster generation for 50+ events should be offloaded to a background web worker.",
    ],
    builders: [
      { role: "Main Dev Overall", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
      { role: "Development & Operations", name: "Mohammed Shahin EK", founderId: "mohammed-shahin-ek" },
      { role: "Development & Operations", name: "Muhammed Shanif P", founderId: "muhammed-shanif-p" },
      { role: "Development & Full-Stack", name: "Mashood M", founderId: "mashood-m" },
    ],
    stackAndCode: {
      technologies: ["React 18", "Vite", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase (DB & Auth)", "TanStack Query", "Zod", "jsPDF", "Recharts"],
      repoUrl: "https://github.com/elevates-club/aaroh",
      repoNote: "Open-source repository specialized for the Aaroh Arts Festival under ELEVATES Club.",
    },
    gallery: [
      {
        src: "/projects/aaroh/dashboard-overview.png",
        caption: "Admin Dashboard — System Overview, Live Activity Feed, and Participation Density breakdown across First to Fourth Year batches.",
      },
      {
        src: "/projects/aaroh/user-management.png",
        caption: "Role-Based Access Control — Managing Administrators, Year Coordinators, Event Managers, and Student roles with instant role switching.",
      },
      {
        src: "/projects/aaroh/system-settings.png",
        caption: "System Settings Console — Dynamic On-Stage (Max 5) and Off-Stage (Max 4) event registration limit controls and Auto-Approval toggles.",
      },
      {
        src: "/projects/aaroh/activity-logs.png",
        caption: "System Activity Log (Dark Mode) — Real-time security audit trail tracking user logins, event updates, and IP addresses with CSV export.",
      },
      {
        src: "/projects/aaroh/coordinator-dashboard.png",
        caption: "Year Coordinator Dashboard — Live event capacity reminders (Pencil Drawing 6/5, Cartoon 5/5, Quiz 5/5) and year registration stats.",
      },
    ],
  },
  CELESTIA_CASE_STUDY,
];

export const ROADUNDO_CASE_STUDY: FlagshipProject = {
  slug: "roadundo",
  title: "RoadUndo",
  client: "Open Source Utility · ELEVATES Foundation",
  date: "August 2026",
  type: "open-tool",
  status: "live-unmaintained",
  tagline: "Kerala road passability and disaster board · Free Open Public API",
  summary: "A Kerala road passability and disaster board, with a free open API for 5,057 pincodes, LSGD wards, OpenStreetMap roads, live KSEB dam levels, and IMD weather alerts.",
  metrics: [
    { value: "5,057", label: "post offices mapped to LSGD wards" },
    { value: "18", label: "reservoirs tracked live with spillway data" },
    { value: "8", label: "open API endpoints (no key, no cost)" },
  ],
  stack: ["Next.js 15", "TypeScript 5", "Neon Postgres", "Drizzle ORM", "Leaflet", "OpenStreetMap Overpass API"],
  repo: "https://github.com/Elevates-Foundation/RoadUndo",
  live: "https://roadundo.vercel.app",
  cover: "/team/elevates-founders.jpeg",
  situation: {
    title: "The Monsoon Problem",
    paragraphs: [
      "Kerala floods. Every monsoon the same question moves through a hundred WhatsApp groups at once: is this road open? Do people need help?",
      "The official information exists. It is spread across the KSEB dam portal, IMD bulletins, district control rooms and PDF press notes, and none of it sits in one place, in one format, that software can read.",
      "So we put it in one place and opened it to everyone as a free, open-source public data API and real-time dashboard.",
    ],
    highlight: "Official Kerala disaster data exists in scattered PDFs and portals. We put it in one place and opened it to everyone.",
  },
  numbers: [
    { value: "5,057", label: "Kerala post offices with GPS mapped to LSGD wards" },
    { value: "18", label: "reservoirs with live water level, storage %, and spillway data" },
    { value: "14", label: "districts covered for alerts & emergency helplines" },
    { value: "8", label: "public API endpoints (CORS open, no key, no signup)" },
  ],
  whatWeBuilt: [
    "The Data Layer (Automated & Running): Pincode to LSGD ward resolver, OpenStreetMap road geometry, daily water levels for 18 reservoirs, live IMD alerts, and emergency control room numbers.",
    "The Reporting Layer (Crowdsourced): Road passability status reports (Open / Flooded / Blocked) and location-based SOS alerts.",
  ],
  whatActuallyRunsToday: "The data layer is live and refreshes daily. As of August 2026 it was tracking 18 reservoirs (3 spilling, 9 on alert).",
  whatStalled: "The reporting layer has never received a single report. We built the tool first and assumed the people would follow. They did not, because we never asked them to. There was no launch post, no district partner, no NSS unit, no volunteer network. One person built it and then the term ended.",
  howItHeldUp: {
    summary: "The automated data engine and OpenStreetMap Overpass mirror failover system run seamlessly in production.",
    metrics: [
      { value: "8", label: "CORS-open public API endpoints" },
      { value: "3", label: "Overpass API mirrors for automatic failover" },
    ],
    details: [
      "Bilingual data support including native Malayalam dam names (ഇടുക്കി അണക്കെട്ട്, ബാണാസുര സാഗർ അണക്കെട്ട്).",
      "Zero-downtime data synchronization pipeline running on automated GitHub Actions crons.",
    ],
  },
  whatWeWouldDoDifferently: [
    "Find the first fifty reporters before writing the crowdsourced reporting feature.",
    "Lead with the open data API as the primary product and treat the web dashboard as a live reference demo.",
  ],
  builders: [
    { role: "Creator & Lead Developer", name: "Sarhan Qadir KVM", founderId: "sarhan-qadir-kvm" },
  ],
  stackAndCode: {
    technologies: [
      "Next.js 15 App Router",
      "TypeScript 5",
      "Neon Serverless Postgres",
      "Drizzle ORM",
      "Leaflet & React-Leaflet",
      "OpenStreetMap Overpass API",
      "Tailwind CSS",
    ],
    repoUrl: "https://github.com/Elevates-Foundation/RoadUndo",
    repoNote: "Open-source repository hosted under Elevates-Foundation GitHub organization.",
    attributionsList: [
      "India Post (5,057 Pincode dataset)",
      "K-SMART (LSGD Ward Delimitation)",
      "OpenStreetMap (ODbL Open License)",
      "KSEB Dam Safety & KSDMA Kerala",
      "amith-vp/Kerala-Dam-Water-Levels",
      "India Meteorological Department (IMD)",
      "Open-Meteo Weather API",
    ],
  },
  datasets: [
    {
      name: "Kerala Postal Directory & Ward Map Dataset",
      description: "5,057 Kerala post offices with GPS coordinates, district, taluk, and LSGD ward mappings.",
      endpoint: "https://roadundo.vercel.app/api/v1/pincode/676505",
    },
    {
      name: "Kerala Reservoirs Live Water Levels & Spillway Dataset",
      description: "18 major Kerala reservoirs with live water levels, total storage capacity %, inflow rate, and spillway discharge.",
      endpoint: "https://roadundo.vercel.app/api/v1/dams",
    },
    {
      name: "IMD Kerala District Weather Alerts & Helplines Dataset",
      description: "Live IMD red/orange/yellow district alerts and 14 district DEOC emergency control room helplines.",
      endpoint: "https://roadundo.vercel.app/api/v1/alerts",
    },
  ],
};

export const ALL_CASE_STUDIES: FlagshipProject[] = [
  ...FLAGSHIP_PROJECTS,
  CELESTIA_CASE_STUDY,
  ROADUNDO_CASE_STUDY,
];

export const MEMBER_SHOWCASES: MemberShowcase[] = [
  {
    id: "gesture-launch",
    title: "Gesture-Controlled Website Launch",
    builder: "Abhijith CJ",
    builderId: "abhijith-cj",
    cohort: "2025-26",
    status: "live",
    description: "A Python, OpenCV, and MediaPipe gesture detector built for the Celestia relaunch that opened the website live on stage when Chief Guest Moosa Mehar MP raised his hand.",
    repo: null,
    live: "https://www.linkedin.com/posts/abhijith-cj-a81b8a318_python-opencv-mediapipe-ugcPost-7443588025219190784-O6Vb/",
  },
  {
    id: "roadundo",
    title: "RoadUndo",
    builder: "Sarhan Qadir KVM",
    builderId: "sarhan-qadir-kvm",
    cohort: "2025-26",
    status: "live-unmaintained",
    description: "Kerala road passability and disaster board, with a free open public API for pincodes, wards, dam levels & weather alerts.",
    repo: "https://github.com/Elevates-Foundation/RoadUndo",
    live: "https://roadundo.vercel.app",
  },
];

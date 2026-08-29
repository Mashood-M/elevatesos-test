export interface Founder {
  id: string;
  num?: string;
  name: string;
  tag: string;
  role: string;
  proof: string;
  linkedin?: string;
  cohort: "2025-26";
  image: string;
}

export interface Advisor {
  id: string;
  name: string;
  role: string;
  institution: string;
  linkedin?: string;
  image?: string;
}

export const FOUNDING_TEAM_IMAGE = "/founders/founding-team.png";

export const INITIAL_FOUNDERS: Founder[] = [
  {
    id: "sarhan-qadir-kvm",
    num: "#01",
    name: "Sarhan Qadir KVM",
    tag: "Main Class Bunker",
    role: "Founder",
    proof: "Full-stack · Built elevates.live",
    linkedin: "https://linkedin.com/in/sarhanqadir",
    cohort: "2025-26",
    image: "/founders/sarhan-qadir.jpeg",
  },
  {
    id: "naseem-shan",
    num: "#02",
    name: "Naseem Shan",
    tag: "Studies In Silence",
    role: "Founder",
    proof: "Backend · Systems & Infrastructure",
    linkedin: "https://linkedin.com/in/naseemshan",
    cohort: "2025-26",
    image: "/founders/naseem-shan.jpeg",
  },
  {
    id: "muhammed-nafih-p",
    num: "#03",
    name: "Muhammed Nafih P",
    tag: "Design Wizard",
    role: "Founder",
    proof: "Design · Aaroh brand and UI",
    linkedin: "https://linkedin.com/in/nafihp",
    cohort: "2025-26",
    image: "/founders/nafih.jpeg",
  },
  {
    id: "anil-das-p",
    num: "#04",
    name: "Anil Das P",
    tag: "Last Minute Committer",
    role: "Founder",
    proof: "Development · Ships right before deadline",
    linkedin: "https://linkedin.com/in/anildasp",
    cohort: "2025-26",
    image: "/founders/anil-das.jpeg",
  },
  {
    id: "nadheem-roshan",
    num: "#05",
    name: "Nadheem Roshan",
    tag: "Coming For 75% Attendance",
    role: "Founder",
    proof: "IoT · Hardware & Embedded Systems",
    linkedin: "https://linkedin.com/in/nadheemroshan",
    cohort: "2025-26",
    image: "/founders/nadheem.jpg",
  },
  {
    id: "muhammed-shanif-p",
    num: "#06",
    name: "Muhammed Shanif P",
    tag: "Hardware Hacker",
    role: "Founder",
    proof: "Embedded · Vibranium RFID check-in",
    linkedin: "https://linkedin.com/in/shanifp",
    cohort: "2025-26",
    image: "/founders/shanif.jpeg",
  },
  {
    id: "adhinan-k",
    num: "#07",
    name: "Adhinan K",
    tag: "Terminal Addict",
    role: "Founder",
    proof: "DevOps · Linux & server infrastructure",
    linkedin: "https://linkedin.com/in/adhinank",
    cohort: "2025-26",
    image: "/founders/adhinan.png",
  },
  {
    id: "mashood-m",
    num: "#08",
    name: "Mashood M",
    tag: "Unfinished Project Collector",
    role: "Founder",
    proof: "Development · Multiple ambitious WIPs",
    linkedin: "https://linkedin.com/in/mashoodm",
    cohort: "2025-26",
    image: "/founders/mashood.jpeg",
  },
  {
    id: "mohammed-shahin-ek",
    num: "#09",
    name: "Mohammed Shahin E K",
    tag: "Late Night Shipper",
    role: "Founder",
    proof: "Backend · 400k requests, zero downtime",
    linkedin: "https://linkedin.com/in/shahinek",
    cohort: "2025-26",
    image: "/founders/shahin-ek.jpeg",
  },
  {
    id: "shifna-kp",
    num: "#10",
    name: "Shifna K P",
    tag: "The Reason We Shipped",
    role: "Founder",
    proof: "Ops · Campus launch, 120 seats in 2 hours",
    linkedin: "https://linkedin.com/in/shifnakp",
    cohort: "2025-26",
    image: "/founders/shifna.jpeg",
  },
  {
    id: "mohammed-mijvad",
    num: "#11",
    name: "Mohammed Mijvad",
    tag: "Lab Bench Resident",
    role: "Founder",
    proof: "Hardware · Lab systems & electronics",
    linkedin: "https://linkedin.com/in/mijvad",
    cohort: "2025-26",
    image: "/founders/mijvad.jpeg",
  },
  {
    id: "sona-varghese",
    num: "#12",
    name: "Sona Varghese",
    tag: "Zero Stage Fright",
    role: "Founder",
    proof: "Events · Ran the first public showcase",
    linkedin: "https://linkedin.com/in/sonavarghese",
    cohort: "2025-26",
    image: "/founders/sona.jpg",
  },
  {
    id: "ashith-mk",
    num: "#13",
    name: "Ashith MK",
    tag: "Bug Hunter",
    role: "Founder",
    proof: "Security · Ran the cybersecurity workshop",
    linkedin: "https://linkedin.com/in/ashithmk",
    cohort: "2025-26",
    image: "/founders/ashith.jpeg",
  },
  {
    id: "arshak-perumballil",
    num: "#14",
    name: "Arshak Perumballil",
    tag: "PPT Specialist",
    role: "Founder",
    proof: "Comms · Every deck that got us in a room",
    linkedin: "https://linkedin.com/in/arshakp",
    cohort: "2025-26",
    image: "/founders/arshak.png",
  },
  {
    id: "sinan-nooren",
    num: "#15",
    name: "Sinan Nooren",
    tag: "Quiet Builder",
    role: "Founder",
    proof: "Development · Builds first, talks later",
    linkedin: "https://linkedin.com/in/sinannooren",
    cohort: "2025-26",
    image: "/founders/sinan-nooren.png",
  },
  {
    id: "muhammed-fiyas",
    num: "#16",
    name: "Muhammed Fiyas",
    tag: "Works On My Machine",
    role: "Founder",
    proof: "Development · Environment debugging specialist",
    linkedin: "https://linkedin.com/in/fiyas",
    cohort: "2025-26",
    image: "/founders/fiyas.png",
  },
  {
    id: "adil-pt",
    num: "#17",
    name: "Adil P T",
    tag: "Back Bencher",
    role: "Founder",
    proof: "Dev · Quietly ships from the back row",
    linkedin: "https://linkedin.com/in/adilpt",
    cohort: "2025-26",
    image: "/founders/adil.jpeg",
  },
  {
    id: "abdul-haadi",
    num: "#18",
    name: "Abdul Haadi",
    tag: "Front Bencher",
    role: "Founder",
    proof: "Python · Development & Backend",
    linkedin: "https://linkedin.com/in/abdulhaadi",
    cohort: "2025-26",
    image: "/founders/haadi.jpeg",
  },
];

export const INITIAL_ADVISORS: Advisor[] = [
  {
    id: "jasira-kt",
    name: "Jasira KT",
    role: "Faculty Head & Advisor",
    institution: "CSE, Eranad Knowledge City Technical Campus",
    image: "/faculaty/jasira-kt.jpeg",
  },
];

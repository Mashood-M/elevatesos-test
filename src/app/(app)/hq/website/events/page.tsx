"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
  Star,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Laptop,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventStatus = "Completed" | "Upcoming" | "Ongoing" | "Cancelled";
type EventFormat = "Campus Exclusive" | "Open" | "Online" | "Multi-Campus";
type EventCategory = "Workshop" | "Meetup" | "Hackathon" | "Challenge" | "Showcase" | "Lecture" | "Lab";

interface Host { name: string; role: string; }
interface Organizer { name: string; }

interface PlatformCaseStudyRef {
  enabled: boolean;
  platformName: string;
  tagline: string;
  caseStudySlug: string;
  liveUrl?: string;
  repoUrl?: string;
  highlightMetric?: string;
  architectureSummary?: string;
}

interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  fullDescription: string;
  format: EventFormat;
  category: EventCategory;
  status: EventStatus;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isoStartDate: string;
  isoEndDate: string;
  venue: string;
  locationName: string;
  organizer: Organizer[];
  hosts: Host[];
  topics: string[];
  attendeesCount: number;
  coverImage: string;
  featured: boolean;
  platform?: PlatformCaseStudyRef;
  peerLabSlug?: string;
  peerLabTitle?: string;
  chapterSlug: string;
  chapterName: string;
}

const STATUS_TONE: Record<EventStatus, "green" | "orange" | "mute" | "magenta"> = {
  Completed: "mute", Upcoming: "green", Ongoing: "orange", Cancelled: "magenta",
};

// ── ALL 19 EVENTS LINKED WITH CHAPTER #01 (ERANAD KNOWLEDGE CITY) ────────────
const ALL_19_EVENTS: EventItem[] = [
  {
    id: "decode-linkedin-shiju-mishal", slug: "decode-linkedin-shiju-mishal",
    title: "LET'S DECODE LINKEDIN",
    tagline: "The LinkedIn Way · Professional Branding, Networking & Internships",
    description: "Full-day interactive workshop on unlocking the full potential of LinkedIn for personal branding, recruiter networking, and high-impact internship search.",
    fullDescription: "Elevates - LETS DECODE LINKEDIN (The LinkedIn Way) 🚀\n\n📅 Date: 22nd July 2026 (Wednesday)\n🕙 Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)\n\n🎙️ Speakers:\n• Shiju Roy — LinkedIn Coach\n• Mishal V P — Business Strategist",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Jul 22, 2026", endDate: "Jul 22, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-07-22T10:00:00+05:30", isoEndDate: "2026-07-22T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }],
    hosts: [{ name: "Shiju Roy", role: "LinkedIn Coach" }, { name: "Mishal V P", role: "Business Strategist" }],
    topics: ["LinkedIn Optimization", "Personal Branding", "Networking Strategies", "Internship Search", "ATS Profile Building", "Career Growth"],
    attendeesCount: 80, coverImage: "/images/events/decode-linkedin-shiju-mishal.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "career-catalyst-baiju", slug: "career-catalyst-baiju",
    title: "CAREER CATALYST — WORKSHOP",
    tagline: "Want to Get Hired? Start Here · Employability, Resumes & Mock Interviews",
    description: "Full-day interactive employability and placement preparation workshop led by Prof. Baiju B S (Placement Head, MEA Engineering College).",
    fullDescription: "🚀 Career Catalyst – Interactive Employability & Placement Workshop\n\nStep into today’s competitive job market with an exclusive hands-on workshop designed to help you become placement-ready.\n\n📅 Date: 15 July 2026 (Wednesday)\n⏰ Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, EKCTC\n\n🎙️ Speaker: Prof. Baiju B S (PRO & Placement Head, MEA Engineering College · Partner Coord., MIELES Univ. of Barcelona)",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Jul 15, 2026", endDate: "Jul 15, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-07-15T10:00:00+05:30", isoEndDate: "2026-07-15T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }],
    hosts: [{ name: "Prof. Baiju B S", role: "Placement Head (MEA) · Partner Coord., MIELES (Univ. of Barcelona)" }],
    topics: ["Career Catalyst", "Employability", "Placement Strategies", "Resume Optimization", "Mock Interviews", "LinkedIn Branding"],
    attendeesCount: 65, coverImage: "/images/events/career-catalyst-baiju.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "vibe-coding-brototype", slug: "vibe-coding-brototype",
    title: "VIBE CODING WORKSHOP",
    tagline: "Build, Create & Innovate · AI-Assisted Rapid Development with Brototype",
    description: "Full-day hands-on Vibe Coding workshop conducted by Brototype and powered by ELEVATES, featuring rapid prototyping with AI tools, Git/GitHub, and Firebase.",
    fullDescription: "Elevates - Vibe Coding Workshop Conducted by Brototype ⚡\n\nBuild, Create & Innovate with modern AI-driven developer workflows!\n\n📅 Date: 26th March 2026 (Thursday)\n⏰ Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, EKCTC\n\n🎙️ Mentors: Jobin Selvanose (Lead SE, Brototype) & Umar Muqthar (Head of Placements, Brototype)",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Mar 26, 2026", endDate: "Mar 26, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-03-26T10:00:00+05:30", isoEndDate: "2026-03-26T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }, { name: "Brototype" }],
    hosts: [{ name: "Jobin Selvanose", role: "Lead Software Engineer & Content Creator, Brototype" }, { name: "Umar Muqthar", role: "Head of Placements, Brototype" }],
    topics: ["Vibe Coding", "AI-Assisted Coding", "Antigravity", "Git & GitHub", "Firebase Deployment", "Rapid Prototyping"],
    attendeesCount: 70, coverImage: "/images/events/vibe-coding-brototype.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "cse-association-revamp-mehar", slug: "cse-association-revamp-mehar",
    title: "REVAMP OF CSE ASSOCIATION (CELESTIA)",
    tagline: "Official Association Relaunch · Chief Guest Mehar M P (Co-Founder, TinkerHub)",
    description: "Official relaunch and revamp of the Computer Science Engineering Association at EKCTC with Chief Guest Mehar M P (Co-Founder, TinkerHub).",
    fullDescription: "Revamp of CSE Association – 2026\n\nWe are delighted to announce the official Revamp of the CSE Association, marking a new chapter of innovation, collaboration, and excellence.\n\nBuilt Celestia portal live in 60 mins before guest arrival with on-stage gesture launch.",
    format: "Campus Exclusive", category: "Meetup", status: "Completed",
    startDate: "Mar 25, 2026", endDate: "Mar 25, 2026", startTime: "2:00 PM", endTime: "4:00 PM",
    isoStartDate: "2026-03-25T14:00:00+05:30", isoEndDate: "2026-03-25T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }, { name: "Dept of CSE" }],
    hosts: [{ name: "Mehar M P", role: "Chief Guest · Co-Founder, TinkerHub" }],
    topics: ["CSE Association", "Celestia", "TinkerHub", "Tech Leadership", "Community Relaunch", "Open Source & Building"],
    attendeesCount: 80, coverImage: "/images/events/cse-association-revamp-mehar.jpeg", featured: true,
    platform: {
      enabled: true,
      platformName: "Celestia Department Portal",
      tagline: "Rebuilt in one hour on stage with Python OpenCV gesture launch.",
      caseStudySlug: "celestia",
      liveUrl: "https://celestia-web-lti6.vercel.app",
      highlightMetric: "1 hour build & deploy / 100% gesture launch accuracy",
      architectureSummary: "React 18, Vite, GSAP, Lenis, Python MediaPipe gesture recognition.",
    },
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "aids-association-inauguration", slug: "aids-association-inauguration",
    title: "AI & DS ASSOCIATION INAUGURATION",
    tagline: "Inauguration & Industry Keynote · Guests from Elyst AI",
    description: "Inauguration ceremony of the AI & Data Science Association at EKCTC, featuring keynote sessions by Elyst AI Co-Founders Fathima Shirin P (CEO) and Nihal Anas (CAIO).",
    fullDescription: "✨ A new chapter begins.\n\nThe Department of AI & DS proudly presents the Inauguration of the AI & DS Association.\n\n🎤 Guests from Elyst AI:\n• Fathima Shirin P — CEO & Co-Founder, Elyst AI\n• Nihal Anas — Chief AI Officer & Co-Founder, Elyst AI",
    format: "Campus Exclusive", category: "Meetup", status: "Completed",
    startDate: "Mar 12, 2026", endDate: "Mar 12, 2026", startTime: "10:00 AM", endTime: "1:00 PM",
    isoStartDate: "2026-03-12T10:00:00+05:30", isoEndDate: "2026-03-12T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }, { name: "Dept of AI & DS" }],
    hosts: [{ name: "Fathima Shirin P", role: "CEO & Co-Founder, Elyst AI" }, { name: "Nihal Anas", role: "Chief AI Officer & Co-Founder, Elyst AI" }],
    topics: ["Artificial Intelligence", "Data Science", "Elyst AI", "AI Startups", "Association Inauguration", "Industry Keynote"],
    attendeesCount: 68, coverImage: "/images/events/aids-association-inauguration.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "elevates-campus-launch-ekctc", slug: "elevates-campus-launch-ekctc",
    title: "ELEVATES CAMPUS LAUNCH",
    tagline: "Official Chapter Opening & Leadership Handover · Chief Guest Shibili Rahman KP",
    description: "Official ELEVATES Campus Chapter Launch and leadership handover ceremony at EKCTC, featuring Chief Guest Shibili Rahman KP (Founder & Chairman, RAC Global).",
    fullDescription: "We are thrilled to announce the Elevates Campus Launch Event at Eranad Knowledge City Technical Campus!\n\n🎙️ Chief Guest: Shibili Rahman KP, Founder & Chairman of RAC Global.",
    format: "Campus Exclusive", category: "Meetup", status: "Completed",
    startDate: "Mar 04, 2026", endDate: "Mar 04, 2026", startTime: "10:00 AM", endTime: "1:00 PM",
    isoStartDate: "2026-03-04T10:00:00+05:30", isoEndDate: "2026-03-04T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }],
    hosts: [{ name: "Shibili Rahman K P", role: "Chief Guest · Founder & Chairman, RAC Global" }, { name: "Team Elevates", role: "Campus Chapter Lead" }],
    topics: ["Campus Launch", "Chapter Opening", "Student Leadership", "RAC Global", "Innovation & Impact"],
    attendeesCount: 121, coverImage: "/images/events/campus-launch-ekctc.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "basics-of-iot-naval", slug: "basics-of-iot-naval",
    title: "BASICS OF IOT WORKSHOP",
    tagline: "Step Into the World of IoT · Sensors, Microcontrollers & Cloud Dashboards",
    description: "Full-day hands-on workshop on smart sensors, microcontroller interfacing, MQTT protocols, and real-time cloud data monitoring.",
    fullDescription: "🚀 Basics of IoT Workshop is here!\n\nA beginner-friendly, hands-on workshop designed to introduce students to the fundamentals of the Internet of Things (IoT).",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Feb 19, 2026", endDate: "Feb 19, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-02-19T10:00:00+05:30", isoEndDate: "2026-02-19T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }],
    hosts: [{ name: "Naval K Raj", role: "Embedded & IoT Lead (S2 Cyber)" }],
    topics: ["Internet of Things (IoT)", "Embedded Systems", "Sensors & Actuators", "Microcontrollers", "MQTT & Cloud Dashboards"],
    attendeesCount: 25, coverImage: "/images/events/basics-of-iot-naval.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "dgps-land-survey-favad", slug: "dgps-land-survey-favad",
    title: "LAND SURVEY USING DGPS — WORKSHOP",
    tagline: "Modern Land Surveying & Differential GPS Technology in Action",
    description: "Practical outdoor hands-on surveying workshop on DGPS (Differential GPS) technology, geospatial data, and precision field mapping.",
    fullDescription: "Land Survey Using DGPS – Workshop is here!\n\nGet introduced to modern land surveying techniques using DGPS (Differential GPS) and understand how real-world surveying is done 📍🛰️",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Jan 19, 2026", endDate: "Jan 19, 2026", startTime: "10:00 AM", endTime: "1:00 PM",
    isoStartDate: "2026-01-19T10:00:00+05:30", isoEndDate: "2026-01-19T13:00:00+05:30",
    venue: "EKC Volleyball Court (Outdoor Field), EKCTC", locationName: "",
    organizer: [{ name: "ELEVATES" }, { name: "Dept of Civil Engineering" }],
    hosts: [{ name: "Favad", role: "Surveying & Civil Lead (S8 Civil)" }],
    topics: ["DGPS Surveying", "Differential GPS", "Civil Engineering", "Geospatial Mapping"],
    attendeesCount: 30, coverImage: "/images/events/dgps-survey-favad.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "modern-web-design-danish", slug: "modern-web-design-danish",
    title: "MODERN WEB DESIGN WORKSHOP",
    tagline: "Web Fundamentals, UI/UX, Bootstrap 5 & GitHub Pages Deployment",
    description: "Full-day hands-on workshop covering web fundamentals, responsive Bootstrap 5 design, and live portfolio deployment on GitHub Pages.",
    fullDescription: "A beginner-friendly, hands-on workshop designed to introduce students to modern web development and design.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Jan 12, 2026", endDate: "Jan 12, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-01-12T10:00:00+05:30", isoEndDate: "2026-01-12T16:00:00+05:30",
    venue: "Lab 4, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }],
    hosts: [{ name: "Danish", role: "Web Design Lead (S2 Cyber)" }],
    topics: ["Web Design", "UI/UX Design", "HTML & CSS", "Bootstrap 5", "GitHub Pages", "Git & GitHub"],
    attendeesCount: 46, coverImage: "/images/events/modern-web-design-danish.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "no-code-ai-anshiq", slug: "no-code-ai-anshiq",
    title: "NO-CODE AI & AUTOMATION WORKSHOP",
    tagline: "Build Powerful AI Automations & Agents with n8n Without Writing Code",
    description: "Full-day hands-on workshop on n8n, AI workflow chaining, webhook triggers, and autonomous agent building without code.",
    fullDescription: "A beginner-friendly and practical workshop designed to introduce students to AI Automation and no-code workflows using n8n.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Jan 07, 2026", endDate: "Jan 07, 2026", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2026-01-07T10:00:00+05:30", isoEndDate: "2026-01-07T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "Dept of CSBS" }, { name: "IEDC EKCTC" }],
    hosts: [{ name: "Anshiq", role: "AI & Automation Lead (S4 CSBS)" }],
    topics: ["n8n Automation", "AI Agents", "LLM Workflows", "Webhooks & APIs", "Workflow Automation"],
    attendeesCount: 72, coverImage: "/images/events/no-code-ai-anshiq.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "digital-marketing-kalkus", slug: "digital-marketing-kalkus",
    title: "DIGITAL MARKETING WORKSHOP",
    tagline: "By Kalkus Studio · Brand Growth, Social Media Strategy, SEO & Ad Analytics",
    description: "A practical beginner-friendly workshop by Kalkus Studio covering digital brand growth, SEO/SEM mechanics, content strategy, and ad analytics.",
    fullDescription: "A beginner-friendly and practical workshop designed to introduce students to the fast-growing world of Digital Marketing.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Dec 10, 2025", endDate: "Dec 10, 2025", startTime: "10:00 AM", endTime: "1:00 PM",
    isoStartDate: "2025-12-10T10:00:00+05:30", isoEndDate: "2025-12-10T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "Kalkus Studio" }, { name: "IEDC EKCTC" }],
    hosts: [{ name: "Salim Salhaan", role: "Co-Founder & Design Head, Kalkus Studio" }, { name: "Muhammed Anas", role: "Co-Founder & Technical Head, Kalkus Studio" }],
    topics: ["Digital Marketing", "Social Media Strategy", "SEO & SEM", "Content Strategy", "Ad Analytics"],
    attendeesCount: 71, coverImage: "/images/events/digital-marketing-kalkus.jpeg", featured: true,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "cyber-raid-ctf", slug: "cyber-raid-ctf",
    title: "CYBER RAID — CAPTURE THE FLAG",
    tagline: "Hack. Solve. Conquer · ₹1500 Prize Pool by ELEVATES",
    description: "Competitive Capture The Flag battlefield featuring binary exploitation, cryptic challenges, web exploitation, and network defense drills.",
    fullDescription: "The ultimate cybersecurity battlefield where builders race to crack cryptic vulnerability stages with a ₹1,500 prize pool.",
    format: "Campus Exclusive", category: "Challenge", status: "Completed",
    startDate: "Oct 09, 2025", endDate: "Oct 09, 2025", startTime: "10:00 AM", endTime: "4:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30", isoEndDate: "2025-10-09T16:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }],
    hosts: [{ name: "Adhinan K", role: "CTF Lead & Cybersecurity Researcher (CSE S7)" }],
    topics: ["CTF (Capture The Flag)", "Reverse Engineering", "Web Exploitation", "Cryptography", "Network Forensics"],
    attendeesCount: 45, coverImage: "/images/events/adhinan-ctf.jpeg", featured: true,
    peerLabSlug: "cybersec-defense-lab", peerLabTitle: "Capstone of 'Cybersecurity Lab'",
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "buzzer-to-buzzer", slug: "buzzer-to-buzzer",
    title: "BUZZER TO BUZZER — TECH QUIZ",
    tagline: "Only the Fastest Mind Wins · High-Stakes Tech Quiz Battle",
    description: "High-stakes head-to-head buzzer quiz battle testing reflexes, logic, and core engineering knowledge during VIBRANIUM 5.0 TechFest.",
    fullDescription: "High-stakes quiz battles where only the fastest mind wins. Hit the buzzer before anyone else, test your reflexes, logic, and core technical knowledge.",
    format: "Campus Exclusive", category: "Challenge", status: "Completed",
    startDate: "Oct 09, 2025", endDate: "Oct 09, 2025", startTime: "10:00 AM", endTime: "3:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30", isoEndDate: "2025-10-09T15:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }, { name: "Dept of Cyber Security" }, { name: "Dept of Mechanical Engineering" }],
    hosts: [{ name: "Mohammed Mijvad", role: "Event Co-ordinator" }],
    topics: ["Tech Trivia", "Buzzer Battle", "Rapid Logic", "Cybersecurity", "Engineering Fundamentals"],
    attendeesCount: 36, coverImage: "/images/events/buzzer-to-buzzer.jpeg", featured: false,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "vibranium-vibe-coding", slug: "vibranium-vibe-coding",
    title: "VIBRANIUM 5.0 — VIBE CODING",
    tagline: "Code & Conquer · ₹250 Prize Pool by ELEVATES",
    description: "Two-hour dynamic vibe coding workshop and speed programming challenge with a ₹250 prize pool during VIBRANIUM 5.0 TechFest.",
    fullDescription: "Ready to dominate the code floor? ELEVATES presents VIBRANIUM 5.0 Vibe Coding! Structured as a 1st-hour basic vibe coding session followed by an intense 2nd-hour live coding challenge.",
    format: "Campus Exclusive", category: "Challenge", status: "Completed",
    startDate: "Oct 09, 2025", endDate: "Oct 09, 2025", startTime: "10:00 AM", endTime: "12:00 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30", isoEndDate: "2025-10-09T12:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }, { name: "Dept of Computer Science Engineering" }],
    hosts: [{ name: "Sarhan Qadir KVM", role: "Event Co-ordinator & Facilitator" }],
    topics: ["Vibe Coding", "AI-Assisted Coding", "Rapid Prototyping", "Speed Coding", "Problem Solving"],
    attendeesCount: 35, coverImage: "/images/events/vibe-coding-vibranium.jpeg", featured: false,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "vibranium-ai-battle", slug: "vibranium-ai-battle",
    title: "VIBRANIUM 5.0 — AI BATTLE ARENA",
    tagline: "Where Powerful LLMs Collide · Live AI Chess Duels",
    description: "Interactive AI showcase stall where LLM models (DeepSeek, GPT-OSS, Mistral, Gemini) battle in digital chess duels.",
    fullDescription: "Witness the future of intelligence at the AI Battle Arena! An interactive exhibition stall and demonstration session where powerful AI minds collide in thrilling digital chess duels.",
    format: "Campus Exclusive", category: "Showcase", status: "Completed",
    startDate: "Oct 09, 2025", endDate: "Oct 09, 2025", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30", isoEndDate: "2025-10-09T16:00:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }, { name: "Dept of Computer Science & Business Systems (CSBS)" }],
    hosts: [{ name: "Mashood M", role: "Event Co-ordinator & AI Lead" }],
    topics: ["Artificial Intelligence", "LLM Reasoning", "AI Chess Battle", "Autonomous Agents", "DeepSeek vs Gemini"],
    attendeesCount: 35, coverImage: "/images/events/ai-battle-vibranium.jpeg", featured: false,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "vibranium-qr-treasure-hunt", slug: "vibranium-qr-treasure-hunt",
    title: "VIBRANIUM 5.0 — QR TREASURE HUNT",
    tagline: "Campus-Wide Cryptic QR Challenge by ELEVATES & Vibranium",
    description: "An interactive campus-wide cryptographic scavenger hunt hosted during Vibranium 5.0 TechFest with algorithmic clues and QR checkpoints.",
    fullDescription: "An interactive campus adventure hosted during the Vibranium 5.0 TechFest. Participants solve cryptic algorithmic riddles, scan geo-distributed QR checkpoints, and race against the clock.",
    format: "Campus Exclusive", category: "Challenge", status: "Completed",
    startDate: "Oct 09, 2025", endDate: "Oct 09, 2025", startTime: "10:00 AM", endTime: "1:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30", isoEndDate: "2025-10-09T13:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }, { name: "Dept of AI & Data Science" }, { name: "Dept of Safety & Fire Engineering" }],
    hosts: [{ name: "Muhammed Fiyas", role: "Challenge Lead" }],
    topics: ["QR Codes", "Cryptic Clues", "Campus Scavenger", "Logic & Puzzles", "Vibranium Platform"],
    attendeesCount: 30, coverImage: "/images/events/qr-tressure-hunt-vibranium.jpeg", featured: false,
    platform: {
      enabled: true,
      platformName: "Vibranium TechFest Platform",
      tagline: "Full-stack registration, coordinator consoles, and gate scanners.",
      caseStudySlug: "vibranium-event-platform",
      highlightMetric: "400k requests / 0 downtime",
    },
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "first-spark-electronics", slug: "first-spark-electronics",
    title: "FIRST SPARK — BASICS OF ELECTRONICS",
    tagline: "Circuit Fundamentals & Semiconductors by Sahad Nisham K",
    description: "Beginner-friendly hands-on session covering essential building blocks of electronic systems, passive components, semiconductors, and real-world circuit design.",
    fullDescription: "A beginner-friendly session designed to introduce students to the fascinating world of electronics, covering the essential building blocks that form the heart of every electronic system.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Sep 26, 2025", endDate: "Sep 26, 2025", startTime: "10:00 AM", endTime: "4:00 PM",
    isoStartDate: "2025-09-26T10:00:00+05:30", isoEndDate: "2025-09-26T16:00:00+05:30",
    venue: "ECE Digital Lab, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }, { name: "Electronauts (ECE Dept)" }],
    hosts: [{ name: "Sahad Nisham K", role: "Electronics Lead (S5 ECE)" }],
    topics: ["Voltage & Current", "Passive Components", "Semiconductors", "Diodes & Transistors", "Circuit Design"],
    attendeesCount: 32, coverImage: "/images/events/spark-sahad-nisham.jpeg", featured: false,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "stap-skill-assessment", slug: "stap-skill-assessment",
    title: "STAP — SKILL TASTE ASSESSMENT",
    tagline: "Find Your Skill & Build Your Portfolio by Skilltrai",
    description: "Hands-on assessment workshop exploring AI, data analytics, UI/UX, and digital freelancing to build personal project portfolios.",
    fullDescription: "A hands-on Skill Taste Assessment workshop where participants test in-demand technical domains—including AI prompt workflows, data analysis, UI/UX design, and digital freelancing tracks.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Sep 22, 2025", endDate: "Sep 22, 2025", startTime: "2:00 PM", endTime: "5:30 PM",
    isoStartDate: "2025-09-22T14:00:00+05:30", isoEndDate: "2025-09-22T17:30:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "Skilltrai Freelance Academy" }],
    hosts: [
      { name: "Ikhlas PV", role: "Founder, AI Engineer" },
      { name: "Mohammed Shareef AT", role: "Co-Founder, COO & Data Analyst" },
      { name: "Muhammed Jasim", role: "Co-Founder, CMO" }
    ],
    topics: ["AI & Prompts", "Data Analytics", "UI/UX Design", "Freelancing", "Portfolio Building"],
    attendeesCount: 72, coverImage: "/images/events/stap-by-skilltrai.jpeg", featured: false,
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
  {
    id: "cybersec-basics", slug: "cybersec-basics",
    title: "CYBERSECURITY WORKSHOP",
    tagline: "Hands-on Kali Linux & Defensive Security by Adhinan K",
    description: "Hands-on cybersecurity workshop covering Kali Linux terminal navigation, network defense, and practical ethical hacking fundamentals.",
    fullDescription: "A hands-on, practical cybersecurity workshop designed to take students from terminal basics to practical network defense.",
    format: "Campus Exclusive", category: "Workshop", status: "Completed",
    startDate: "Sep 17, 2025", endDate: "Sep 25, 2025", startTime: "10:00 AM", endTime: "4:10 PM",
    isoStartDate: "2025-09-17T10:00:00+05:30", isoEndDate: "2025-09-25T16:10:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)", locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [{ name: "ELEVATES" }, { name: "IEDC EKCTC" }],
    hosts: [{ name: "Adhinan K", role: "Cybersecurity Expert & Lead (CSE S7)" }],
    topics: ["Cybersecurity", "Kali Linux", "Network Security", "Ethical Hacking", "Terminal"],
    attendeesCount: 76, coverImage: "/images/events/cybersecurity-workshop.jpeg", featured: false,
    peerLabSlug: "cybersec-defense-lab", peerLabTitle: "Linked with 'Cybersecurity Lab'",
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}
function TInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${mono ? "font-mono" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
function TArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea rows={rows} className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
function StrList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder={placeholder} value={item}
            onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, ""])}><Plus size={12} /> Add</Button>
    </div>
  );
}
function HostList({ hosts, onChange }: { hosts: Host[]; onChange: (v: Host[]) => void }) {
  return (
    <div className="space-y-2">
      {hosts.map((h, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <input className="h-8 flex-1 min-w-[140px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Speaker/Host name" value={h.name}
            onChange={(e) => { const n = [...hosts]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }} />
          <input className="h-8 flex-1 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Role / Company / Title" value={h.role}
            onChange={(e) => { const n = [...hosts]; n[i] = { ...n[i], role: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(hosts.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...hosts, { name: "", role: "" }])}><Plus size={12} /> Add Speaker/Host</Button>
    </div>
  );
}
function OrgList({ orgs, onChange }: { orgs: Organizer[]; onChange: (v: Organizer[]) => void }) {
  return (
    <div className="space-y-2">
      {orgs.map((o, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" placeholder="Organizer name" value={o.name}
            onChange={(e) => { const n = [...orgs]; n[i] = { name: e.target.value }; onChange(n); }} />
          <button onClick={() => onChange(orgs.filter((_, j) => j !== i))} className="text-text-dim hover:text-red-500 p-1"><X size={13} /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...orgs, { name: "" }])}><Plus size={12} /> Add Organizer</Button>
    </div>
  );
}

function EventEditor({ event, onSave, onClose }: { event: EventItem; onSave: (e: EventItem) => void; onClose: () => void }) {
  const [d, setD] = useState<EventItem>(event);
  const u = (patch: Partial<EventItem>) => setD((prev) => ({ ...prev, ...patch }));

  const currentPlatform = d.platform ?? {
    enabled: false, platformName: "", tagline: "", caseStudySlug: "",
  };

  const updatePlatform = (patch: Partial<PlatformCaseStudyRef>) => {
    u({ platform: { ...currentPlatform, ...patch } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-[var(--radius-xl)] bg-bg-panel shadow-2xl border border-border">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
              {event.id ? "Edit Event" : "Create New Event"}
            </h3>
            <p className="text-[11px] text-text-dim font-mono mt-0.5">elevates.live/events/{d.slug}</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text p-1.5 rounded-full hover:bg-bg-page"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Main Info */}
          <div className="space-y-4">
            <Field label="Event Title (displayed in UPPERCASE on /events)">
              <input className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-sm font-bold uppercase text-text tracking-tight"
                value={d.title} onChange={(e) => u({ title: e.target.value })} placeholder="VIBE CODING WORKSHOP" />
            </Field>

            {/* Chapter Linkage */}
            <Field label="Associated Campus Chapter (Links event to Chapter Portal)">
              <select
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text"
                value={d.chapterSlug}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "ekc") {
                    u({ chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus" });
                  } else {
                    u({ chapterSlug: val, chapterName: val });
                  }
                }}
              >
                <option value="ekc">Chapter #01 · Eranad Knowledge City Technical Campus (EKCTC)</option>
                <option value="hq">ELEVATES HQ / Network Wide</option>
              </select>
            </Field>

            <Field label="Slug (URL path)">
              <TInput value={d.slug} onChange={(v) => u({ slug: v })} mono placeholder="vibe-coding-brototype" />
            </Field>
            <Field label="Tagline (appears under title on event card)">
              <TInput value={d.tagline} onChange={(v) => u({ tagline: v })} placeholder="Build, Create & Innovate · AI-Assisted Development" />
            </Field>
            <Field label="Description (card preview text — 1-2 sentences)">
              <TArea value={d.description} onChange={(v) => u({ description: v })} rows={2} placeholder="Short description for event card..." />
            </Field>
            <Field label="Full Description (complete writeup shown on detail page)">
              <TArea value={d.fullDescription} onChange={(v) => u({ fullDescription: v })} rows={6} placeholder="Full event description..." />
            </Field>
          </div>

          {/* ── SPECIAL SECTION: SOFTWARE PLATFORM & CASE STUDY ATTACHMENT ── */}
          <div className="rounded-[var(--radius-xl)] border-2 border-[var(--accent)]/40 bg-[var(--accent)]/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="text-[var(--accent)]" size={18} />
                <div>
                  <h4 className="text-xs font-bold uppercase text-text tracking-wide">
                    Did ELEVATES Build a Custom Software Platform for this Event?
                  </h4>
                  <p className="text-[11px] text-text-dim">
                    If enabled, this event links to a verified case study on /projects/[slug] with metrics & architecture proof.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={currentPlatform.enabled}
                  onChange={(e) => updatePlatform({ enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>

            {currentPlatform.enabled && (
              <div className="pt-3 border-t border-[var(--accent)]/20 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Platform Name">
                    <TInput
                      value={currentPlatform.platformName}
                      onChange={(v) => updatePlatform({ platformName: v })}
                      placeholder="e.g. Vibranium Event Platform"
                    />
                  </Field>
                  <Field label="Case Study Slug (on /projects/[slug])">
                    <TInput
                      value={currentPlatform.caseStudySlug}
                      onChange={(v) => updatePlatform({ caseStudySlug: v })}
                      mono
                      placeholder="vibranium-event-platform"
                    />
                  </Field>
                </div>

                <Field label="Platform Tagline / Claim">
                  <TInput
                    value={currentPlatform.tagline}
                    onChange={(v) => updatePlatform({ tagline: v })}
                    placeholder="Five days to build it. 400,000 requests in 24 hours. Zero downtime."
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Live Platform URL">
                    <TInput
                      value={currentPlatform.liveUrl ?? ""}
                      onChange={(v) => updatePlatform({ liveUrl: v || undefined })}
                      mono
                      placeholder="https://vibranium.elevates.live"
                    />
                  </Field>
                  <Field label="GitHub Repo URL">
                    <TInput
                      value={currentPlatform.repoUrl ?? ""}
                      onChange={(v) => updatePlatform({ repoUrl: v || undefined })}
                      mono
                      placeholder="https://github.com/..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Highlight Metric">
                    <TInput
                      value={currentPlatform.highlightMetric ?? ""}
                      onChange={(v) => updatePlatform({ highlightMetric: v || undefined })}
                      placeholder="400,000 requests in 24h"
                    />
                  </Field>
                  <Field label="Architecture Summary">
                    <TInput
                      value={currentPlatform.architectureSummary ?? ""}
                      onChange={(v) => updatePlatform({ architectureSummary: v || undefined })}
                      placeholder="Next.js 15, PostgreSQL, Edge QR API"
                    />
                  </Field>
                </div>

                <div className="text-[11px] text-[var(--accent)] font-medium flex items-center gap-1 pt-1">
                  <Sparkles size={12} />
                  Badge will display: <code className="font-mono bg-[var(--accent)]/15 px-1 rounded">⚡ Platform Built ({currentPlatform.caseStudySlug})</code>
                </div>
              </div>
            )}
          </div>

          {/* Meta Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Format">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.format} onChange={(e) => u({ format: e.target.value as EventFormat })}>
                {["Campus Exclusive", "Open", "Online", "Multi-Campus"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.category} onChange={(e) => u({ category: e.target.value as EventCategory })}>
                {["Workshop", "Meetup", "Hackathon", "Challenge", "Showcase", "Lecture", "Lab"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text" value={d.status} onChange={(e) => u({ status: e.target.value as EventStatus })}>
                {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Attendees Count">
              <input type="number" className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text" value={d.attendeesCount}
                onChange={(e) => u({ attendeesCount: parseInt(e.target.value) || 0 })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date (display)"><TInput value={d.startDate} onChange={(v) => u({ startDate: v })} placeholder="Jul 22, 2026" /></Field>
            <Field label="End Date (display)"><TInput value={d.endDate} onChange={(v) => u({ endDate: v })} placeholder="Jul 22, 2026" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time"><TInput value={d.startTime} onChange={(v) => u({ startTime: v })} placeholder="10:00 AM" /></Field>
            <Field label="End Time"><TInput value={d.endTime} onChange={(v) => u({ endTime: v })} placeholder="4:00 PM" /></Field>
          </div>

          <Field label="Venue"><TInput value={d.venue} onChange={(v) => u({ venue: v })} placeholder="Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)" /></Field>
          <Field label="Cover Image Path"><TInput value={d.coverImage} onChange={(v) => u({ coverImage: v })} mono placeholder="/images/events/my-event.jpeg" /></Field>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={d.featured}
                onChange={(e) => u({ featured: e.target.checked })} />
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Star size={13} className={d.featured ? "fill-[var(--accent)] text-[var(--accent)]" : "text-text-dim"} />
                Featured Event — appears in hero banner at top of /events
              </span>
            </label>
          </div>

          <Field label="Organizers">
            <OrgList orgs={d.organizer} onChange={(v) => u({ organizer: v })} />
          </Field>
          <Field label="Speakers / Hosts">
            <HostList hosts={d.hosts} onChange={(v) => u({ hosts: v })} />
          </Field>
          <Field label="Topics / Tags">
            <StrList items={d.topics} onChange={(v) => u({ topics: v })} placeholder="e.g. LinkedIn Optimization" />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => { onSave(d); onClose(); }}>Save Event</Button>
        </div>
      </div>
    </div>
  );
}

export default function EventsCMSPage() {
  const [events, setEvents] = useState<EventItem[]>(ALL_19_EVENTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");
  const [filterChapter, setFilterChapter] = useState<string>("all");
  const [filterPlatformOnly, setFilterPlatformOnly] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const q = search.toLowerCase();
  const filtered = events.filter((e) => {
    const matchQ = e.title.toLowerCase().includes(q) || e.tagline.toLowerCase().includes(q) || e.hosts.some((h) => h.name.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchChapter = filterChapter === "all" || e.chapterSlug === filterChapter;
    const matchPlatform = !filterPlatformOnly || e.platform?.enabled;
    return matchQ && matchStatus && matchChapter && matchPlatform;
  });

  const blank = (): EventItem => ({
    id: `evt-${Date.now()}`, slug: "", title: "", tagline: "", description: "", fullDescription: "",
    format: "Campus Exclusive", category: "Workshop", status: "Upcoming",
    startDate: "", endDate: "", startTime: "", endTime: "",
    isoStartDate: "", isoEndDate: "",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)", locationName: "",
    organizer: [{ name: "ELEVATES" }], hosts: [{ name: "", role: "" }],
    topics: [], attendeesCount: 0, coverImage: "", featured: false,
    platform: { enabled: false, platformName: "", tagline: "", caseStudySlug: "" },
    chapterSlug: "ekc", chapterName: "Chapter #01 · Eranad Knowledge City Technical Campus",
  });

  const platformEventsCount = events.filter((e) => e.platform?.enabled).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Website CMS"
        title="Events & Workshops"
        description="All 19 authentic ELEVATES workshops, meetups, hackathons, and challenges across Kerala. Seamlessly linked to Chapter #01 (EKC) and production software case studies."
        actions={
          <Button size="sm" variant="orange" onClick={() => { setEditing(blank()); setIsNew(true); }}>
            <Plus size={14} /> New Event
          </Button>
        }
      />

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{events.length}</p>
          <p className="text-xs text-text-dim">Total Events (All 19)</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-[var(--accent)] flex items-center gap-1">
            <Laptop size={20} /> {platformEventsCount}
          </p>
          <p className="text-xs text-text-dim">Built Custom Software Platform</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">{events.filter((e) => e.status === "Completed").length}</p>
          <p className="text-xs text-text-dim">Completed</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-bg-panel p-4">
          <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-text">
            {events.reduce((sum, e) => sum + e.attendeesCount, 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-dim">Total Attendees</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input placeholder="Search all 19 events or speakers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        {/* Chapter Filter */}
        <select
          className="h-9 rounded-[var(--radius-md)] border border-border bg-bg-panel px-3 text-xs text-text"
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
        >
          <option value="all">All Chapters</option>
          <option value="ekc">Chapter #01 · Eranad Knowledge City ({events.length})</option>
        </select>

        <select className="h-9 rounded-[var(--radius-md)] border border-border bg-bg-panel px-3 text-xs text-text" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as EventStatus | "all")}>
          <option value="all">All Statuses</option>
          {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={() => setFilterPlatformOnly(!filterPlatformOnly)}
          className={`h-9 px-3 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors flex items-center gap-1.5 ${
            filterPlatformOnly
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "bg-bg-panel text-text-dim border-border hover:text-text"
          }`}
        >
          <Laptop size={13} />
          Built Platforms Only ({platformEventsCount})
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filtered.map((evt) => (
          <div key={evt.id} className={`rounded-[var(--radius-xl)] border ${evt.platform?.enabled ? "border-[var(--accent)]/40 bg-[var(--accent)]/3" : "border-border bg-bg-panel"} transition-colors p-5`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge tone={STATUS_TONE[evt.status]}>{evt.status}</Badge>
                  <Badge tone="cyan">{evt.category}</Badge>
                  <Badge tone="mute">{evt.format}</Badge>
                  {evt.featured && (
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] flex items-center gap-0.5">
                      <Star size={10} className="fill-[var(--accent)]" /> Featured
                    </span>
                  )}
                  {evt.platform?.enabled && (
                    <span className="text-[10px] font-mono font-bold text-white bg-[var(--accent)] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Laptop size={10} /> ⚡ Platform Built: {evt.platform.platformName}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-dim">/{evt.slug}</span>
                </div>

                {/* Title & Tagline */}
                <h3 className="font-[family-name:var(--font-display)] font-bold text-text text-base uppercase tracking-tight">{evt.title}</h3>
                <p className="text-xs text-text-dim mt-0.5 italic">{evt.tagline}</p>

                {/* Chapter Association Badge */}
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href={`/chapter/${evt.chapterSlug || "ekc"}/events`}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-text bg-bg-page border border-border px-2.5 py-1 rounded-[var(--radius-md)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    <Building2 size={12} className="text-[var(--accent)]" />
                    <span>{evt.chapterName || "Chapter #01 · Eranad Knowledge City Technical Campus"}</span>
                    <span className="text-text-dim text-[10px]">↗</span>
                  </Link>
                </div>

                {/* Platform Card Callout if built */}
                {evt.platform?.enabled && (
                  <div className="mt-3 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-bg-page flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs">
                      <span className="font-bold text-text">{evt.platform.platformName}</span>
                      {evt.platform.highlightMetric && (
                        <span className="ml-2 font-mono text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded">
                          {evt.platform.highlightMetric}
                        </span>
                      )}
                      <p className="text-[11px] text-text-dim mt-0.5">{evt.platform.tagline}</p>
                    </div>
                    <Link
                      href="/hq/website/projects"
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[var(--accent)] hover:underline"
                    >
                      <FileText size={12} /> Open Case Study ({evt.platform.caseStudySlug}) ↗
                    </Link>
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-mono text-text-dim">
                  <span>📅 {evt.startDate} {evt.startTime !== evt.endTime ? `${evt.startTime} – ${evt.endTime}` : ""}</span>
                  <span>📍 {evt.venue.split(",")[0]}</span>
                  <span>👥 {evt.attendeesCount} attendees</span>
                </div>

                {/* Hosts */}
                {evt.hosts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {evt.hosts.map((h, i) => (
                      <span key={i} className="text-[10px] font-mono bg-bg-page border border-border px-2 py-0.5 rounded text-text">
                        🎙️ {h.name} <span className="text-text-dim">· {h.role}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => { setEditing(evt); setIsNew(false); }}><Edit size={13} /> Edit</Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => setEvents((prev) => prev.filter((x) => x.id !== evt.id))}><Trash2 size={13} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EventEditor event={editing} onClose={() => { setEditing(null); setIsNew(false); }}
          onSave={(saved) => {
            if (isNew) setEvents((prev) => [saved, ...prev]);
            else setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
          }}
        />
      )}
    </div>
  );
}

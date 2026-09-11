# Elevates OS — Master System Specification & Architecture Document

**Document Identifier:** `system.md`  
**System Name:** Elevates OS (EOS)  
**Version:** 1.5.0 Production Architecture  
**Target Environment:** Multi-Campus Innovation Network (`elevates.live`)  
**Technology Stack:** Next.js 15 (App Router), TypeScript, Supabase PostgreSQL, Tailwind CSS, TipTap Rich Text, Discord Realtime Engine

---

## Table of Contents
1. [Executive Vision & Core Architecture](#1-executive-vision--core-architecture)
2. [User Roles, Hierarchy & Dynamic Permission Engine](#2-user-roles-hierarchy--dynamic-permission-engine)
3. [Domain 1 — Organization & Governance](#3-domain-1--organization--governance)
4. [Domain 2 — Community, Identity & Referral System](#4-domain-2--community-identity--referral-system)
5. [Domain 3 — Events, Form Logic & Multi-Session Attendance](#5-domain-3--events-form-logic--multi-session-attendance)
6. [Domain 4 — Innovation, Clusters & Project Pipeline](#6-domain-4--innovation-clusters--project-pipeline)
7. [Domain 5 — Operations, Governance & Document Pipeline](#7-domain-5--operations-governance--document-pipeline)
8. [Domain 6 — Intelligence, Health Scores & Leaderboards](#8-domain-6--intelligence-health-scores--leaderboards)
9. [Discord Integration & Bot Automation Layer (PRD Specification)](#9-discord-integration--bot-automation-layer-prd-specification)
10. [Developer Portal, Public APIs & Webhook Ecosystem](#10-developer-portal-public-apis--webhook-ecosystem)
11. [Website CMS Hub (`elevates.live`) & UI State Engine](#11-website-cms-hub-elevateslive--ui-state-engine)
12. [Complete Database Schema & Persistence Architecture](#12-complete-database-schema--persistence-architecture)
13. [End-to-End Operational Workflows](#13-end-to-end-operational-workflows)
14. [Design System & Frontend Aesthetics](#14-design-system--frontend-aesthetics)
15. [Roadmap & Version 2 Evolution](#15-roadmap--version-2-evolution)
16. [Comparative Analysis: Elevates OS vs. Other Systems](#16-comparative-analysis-elevates-os-vs-other-systems)

---

## 1. Executive Vision & Core Architecture

### 1.1 Purpose & Vision
Elevates OS is the operating system for student innovation communities. It transcends simple member directories by managing the entire lifecycle of multi-college student chapters: leadership transitions, student talent discovery, cluster-based skill acquisition, hackathons and tech fests, dynamic registration forms, tamper-proof attendance, digital certificates, project incubation, executive reporting, and cross-chapter analytics.

The platform operates on a **federated multi-tenant model**: **Elevates HQ** governs the entire ecosystem, while every college chapter operates within its own scoped workspace.

```
                                ┌─────────────────────────┐
                                │       Elevates HQ       │
                                │   (Global Governance)   │
                                └────────────┬────────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
           ┌─────────┴─────────┐   ┌─────────┴─────────┐   ┌─────────┴─────────┐
           │    EKC Chapter    │   │    MES Chapter    │   │   CUSAT Chapter   │
           │ (Campus Workspace)│   │ (Campus Workspace)│   │ (Campus Workspace)│
           └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                     │                       │                       │
      ┌──────────────┼──────────────┐        │                       │
      │              │              │        │                       │
┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  │                       │
│  Classes  │  │  Events   │  │ Projects  │  │                       │
│ & Cohorts │  │ & Tickets │  │ & Clusters│  │                       │
└───────────┘  └───────────┘  └───────────┘  └───────────────────────┘
```

### 1.2 Core Architectural Axioms
1. **Federated Governance:** HQ sets doctrine, standard operating procedures, templates, and brand kits; chapters execute autonomously within their allocated college workspace.
2. **Zero Hardcoded Permissions:** Access control is strictly dynamic, powered by a database-backed permissions matrix and fine-grained Row Level Security (RLS).
3. **Immutable History:** Academic years, leadership cycles, past executives, and student project records are preserved permanently.
4. **Physical-to-Digital Parity:** Every physical event, workshop checkpoint, and classroom has a live, digital counterpart with instant QR codes, Discord sync, and real-time state management.

---

## 2. User Roles, Hierarchy & Dynamic Permission Engine

### 2.1 Complete Role Hierarchy
The platform classifies participants across five distinct operational tiers:

```
[HQ TIER]
├── Founder (Ultimate authority across all chapters, settings, and database triggers)
├── HQ Admin (Operational oversight, chapter provisioning, guidelines, approvals)
└── HQ Mentor (Cross-chapter technical and leadership advisor)

[CHAPTER EXECUTIVE TIER]
├── Campus Lead (Primary student executive coordinating campus operations & waitlists)
├── Faculty Coordinator (Institutional liaison, official event & report sign-off)
├── Chairman (Chief chapter executive; chapter-wide executive authority)
├── Vice Chairman (Operational second-in-command; team coordination)
├── Secretary (Administrative executive; records, scheduling, reports)
├── Joint Secretary (Assists secretary; logistics, attendance records)
└── Elevates Coordinator (Core community coordinator and facilitator)

[FUNCTIONAL LEADERSHIP TEAMS]
├── Technical Lead & Technical Team (Platform builds, workshops, lab mentorship)
├── Media Lead & Media Team (Documentation, creative assets, social feeds)
└── Innovation Lead & Innovation Team (Project pipelines, hackathon management)

[ACADEMIC COHORT TIER]
└── Class Representative (Classroom liaisons scoped strictly to assigned Dept + Year + Section)

[MEMBER & EXTERNAL TIER]
├── Student (Active chapter member participating in events, projects, and clusters)
├── Alumni (Graduated members providing mentorship and career referrals)
├── Guest (Prospective students or non-chapter attendees)
└── Industry Mentor (External professional reviewing projects and conducting sessions)
```

### 2.2 Dynamic Permissions Matrix (`PermissionKey`)
Access is evaluated at runtime via `hasPermission(roleKey, permissionKey)`. No role has hardcoded privileges:

| Permission Key | Description | Default Authorized Roles |
| :--- | :--- | :--- |
| `org.manage` | Modify global organization settings, branding, CMS | Founder, HQ Admin |
| `chapter.create` | Provision new college chapters and assign initial leads | Founder, HQ Admin |
| `chapter.manage` | Configure chapter profiles, coordinates, sub-teams | Founder, HQ Admin, Campus Lead, Chairman |
| `leadership.manage`| Assign annual terms, review leadership applications | Founder, HQ Admin, Campus Lead, Chairman |
| `class.manage` | Configure chapter departments and class cohorts | Campus Lead, Chairman, Secretary |
| `roles.manage` | Assign or revoke roles and functional team seats | Founder, HQ Admin, Chairman |
| `event.create` | Draft and configure new events, workshops, or hackathons | Chairman, Secretary, Coordinators, Tech Lead |
| `event.approve` | Formally approve chapter events for public launch | Faculty Coordinator, Campus Lead, HQ Admin |
| `event.manage` | Modify event parameters, tickets, visibility, forms | Organizer, Secretary, Chairman |
| `registration.review`| Review incoming student event registrations | Class Representative, Secretary, Coordinator |
| `registration.approve`| Authorize registrations and admit from waitlists | Campus Lead, Secretary, Chairman |
| `attendance.verify`| Check in attendees via QR scanner or manual lookup | Class Rep, Organizer, Attendance Officers |
| `certificate.issue`| Sign and release cryptographic digital certificates | Faculty Coordinator, Chairman, HQ Admin |
| `report.submit` | Authorize and submit official chapter reports to HQ | Secretary, Chairman, Campus Lead |
| `report.approve` | Review, annotate, and approve submitted reports | Faculty Coordinator, HQ Admin, Founder |
| `report.download` | Export formatted reports to DOCX or printable HTML | Faculty, Chairman, Secretary, HQ Admin |
| `task.manage` | Create, assign, and track chapter operational tasks | Chairman, Secretary, Team Leads |
| `resource.upload`| Upload workshop kits, SOPs, and assets to library | HQ Admin, Team Leads, Campus Lead |
| `announcement.publish`| Broadcast announcements across chapter/global audiences | HQ Admin, Chairman, Secretary |
| `analytics.view`| View chapter and organization-wide analytical metrics | Executives, Faculty, HQ Team |
| `student.register`| Onboard students and verify identity documents | Class Representative, Secretary |

### 2.3 Temporary Event-Scoped Permissions (`event_permissions`)
Organizers can delegate temporary authority for specific events without granting permanent chapter-wide roles.
- **Permission Types:** `manage_event`, `take_attendance`, `manage_media`.
- **Properties:** Linked to specific `event_id` and `user_id`, with automatic expiration (`expires_at`) when the event concludes.

### 2.4 Class Representative Scoping & Data Isolation
To prevent data privacy breaches, Class Representatives operate under strict cohort boundaries:
- Class Reps are assigned to a specific **Department + Year + Section** (e.g. *Computer Science - Year 3 - Section B*).
- When reviewing event registrations or taking attendance, Class Reps are cryptographically and query-scoped to only view and verify students registered within their assigned classroom cohort.

---

## 3. Domain 1 — Organization & Governance

### 3.1 HQ Operations Console
The centralized command center for Elevates HQ (`/hq`) provides global governance over all colleges:
- **Global Overview:** Aggregate headcount, active chapters, total events, projects incubated, and system uptime.
- **Chapter Oversight:** Real-time health scores, onboarding pipelines, and executive compliance monitoring.
- **Global Calendar:** Unified timeline of all chapter events to prevent scheduling conflicts.
- **Audit Logging Engine:** Immutable stream of system actions recorded via automated PostgreSQL triggers.
- **Brand Assets Manager (`/hq/brand`):** Curated brand standards (CSS tokens, typography, authorized logos, vector badges).

### 3.2 Chapter Management & Geographic Intelligence
Each physical college institution operates as a distinct chapter record:
- **Identification:** Sequential Chapter ID (`CHP-0001`, `CHP-0002`) and 3-letter Shortcode (e.g., `EKC`, `MES`, `CUS`).
- **Institutional Profile:** College name, university affiliation, city, district, state, geographic coordinates (latitude & longitude), and campus map links.
- **Academic Setup:** Academic departments manager and class cohort directory (`/chapter/[slug]/classes`).
- **Standard Checks (`chapter_standard_checks`):** Institutional audit checklist ensuring chapters meet operational standards (e.g., minimum active clusters, faculty endorsement, quarterly reports).

### 3.3 Annual Leadership Cycles & Applications Portal
Chapter governance changes annually while retaining permanent historical records:
- **Leadership Terms (`leadership_terms`):** Encapsulates an academic year (e.g. *2026 Executive Council*), defined by start date, end date, status (`upcoming`, `active`, `archived`), and outgoing executive handover notes.
- **Leadership Applications Portal (`leadership_applications`):** Students apply for executive positions directly on the platform:
  - Multi-stage pipeline: `applied` → `screening` → `interview` → `selected` → `training` → `rejected`.
  - Application dossier includes statement of intent, prior event attendance, earned points, and portfolio links.
- **Executive Sub-Teams (`executive_sub_teams`):** Modular teams (Technical, Media, Innovation, Operations) with assigned sub-team leads and student contributors.

### 3.4 Operational Playbook & Institutional Doctrine (`/eos`)
The codified operational handbook accessible to all leaders:
- **Core Pillars & Philosophy:** Open community, talent discovery, hands-on build culture, and peer-to-peer mentorship.
- **Chapter Standards:** Detailed benchmarks for running workshops, hackathons, and demo days.
- **Journey Progression:** Formal definition of how a student advances from newcomer to executive.

---

## 4. Domain 2 — Community, Identity & Referral System

### 4.1 Student Profile & Digital Identity
Every student possesses a comprehensive, verified digital passport:
- **Personal Details:** Full name, profile photo/avatar, academic department, graduation year, class section, contact details.
- **Sequential Elevates ID:** Unique permanent identifier (e.g., `ELV-0001`, `ELV-0042`) used in search, ticket issuance, and URLs.
- **Professional Portfolio:** Verified technical skills, interests, GitHub link, LinkedIn URL, portfolio website, resume link, and personal bio.
- **Elevates Engagement Record:**
  - Complete history of attended events and validated check-in timestamps.
  - Cryptographically verifiable digital certificates earned.
  - Active and showcased innovation projects.
  - Lifetime earned points and achievement badges.
- **Discord Identity:** Linked Discord user ID and username.
- **Public Visibility:** Toggle (`isPublic`) allowing students to be discovered on the public talent directory (`elevates.live/team`).

### 4.2 Community Tiers & Student Journey Stages
Student progression is structured across standardized developmental milestones:

```
[COMMUNITY TIERS]
1. Everyone       ── All registered students across colleges
2. Participant    ── Attended at least 1 workshop or event
3. Active         ── Consistent attendee, completed hands-on challenges
4. Cluster        ── Admitted into a dedicated skill cluster
5. Executive      ── Holding an active leadership or coordinator title
6. Campus Lead    ── Managing institutional chapter operations

[JOURNEY STAGES]
Awareness ➔ Workshop ➔ Hands-On ➔ Task ➔ Cluster ➔ Projects ➔ Leadership ➔ Mentorship ➔ Alumni
```

### 4.3 Executive Workspace
Role-tailored cockpits (`/executive`) dynamically rendering tools according to active credentials:
- **Chairman View:** Chapter health indicators, pending approvals, financial/resource requests, executive meeting schedules.
- **Secretary View:** Event management queues, task assignments, coordinator tracking, report drafts.
- **Coordinator View:** Team member rosters, registration reviews, event day attendance rosters.
- **Class Representative View:** Scoped classroom roster, verified student counts, targeted announcements, attendance check-in.

### 4.4 Faculty Portal (`/faculty`)
Dedicated, clean interface designed for faculty advisors and institutional coordinators:
- Review and formally approve planned chapter events.
- Audit executive reports prior to HQ submission.
- Download compliance analytics and student participation records for accreditation (NAAC / KTU Activity Points).

### 4.5 Unified Referrals & Expiring Invite System
A comprehensive viral onboarding mechanism (`/referrals` & `/join`):
- **Institutional Chapter Invite Codes (`chapter_invite_codes`):**
  - Generated by executives with a **3-day auto-expiry** and 3-letter chapter prefix (e.g., `EKC-7K2P`).
  - Tracks total redemptions and records a real-time roster of onboarded students.
- **Personal Student Referral Links:**
  - Unique shareable links rewarding referring students with gamified platform points.
  - Integrated **1-Click WhatsApp Share Button** pre-populating personalized invite copy.
  - Campus referral leaderboards recognizing top student advocates.

---

## 5. Domain 3 — Events, Form Logic & Multi-Session Attendance

### 5.1 Event Architecture & Hierarchy
The event engine accommodates everything from classroom seminars to multi-day campus tech fests:
- **Event Parameters:** Title, banner emoji/image, rich description, venue, startsAt, endsAt, category, visibility (`chapter_only`, `all_chapters`, `public`), and capacity limits.
- **Event Hierarchy:**
  - **Main Events:** Anchor tech fests (e.g., *Vibranium 2026*).
  - **Sub-Events:** Individual hackathons, coding contests, and workshops nested under the parent festival via `parent_event_id` and `sub_event_ids`.
- **Digital Platform Showcases:** Attach custom web applications or tools built for the event directly to the event card.
- **Real-Time Button Toggles:** Live database toggles allowing organizers to open/close registration (`is_registration_open`) or activate the attendance scanner (`is_checkin_active`) in real time.
- **Progression Chains:** Mapping events to EOS developmental stages (`open` → `workshop` → `hands_on` → `challenge` → `cluster_selection` → `sprint` → `demo_day`).

### 5.2 Google Forms-Grade Registration & Visual Logic Builder
Replaces external forms with a native, flexible form builder (`form-builder.tsx`, `form-logic-builder.tsx`):
- **Question Types:** Short text, paragraph, multiple choice, checkboxes, dropdown, linear scale, star rating, date, time, file upload (with MIME type and size limits), and Class Representative selector.
- **Visual Logic Engine (Notion-Style Blocks):**
  - **When:** `answer_change`, `before_next`, `before_submit`.
  - **If:** `always`, `answer_equals`, `answer_not_empty`.
  - **Then:** `show_questions`, `hide_questions`, `go_to_section`, `show_error`, `set_answer`.
- **Public Form URLs:** Standalone accessible routes (`/f/[formId]`) allowing non-authenticated guests to apply.
- **Discord Submission Webhooks:** Alerts dispatched to Discord channels immediately upon submission.
- **Waitlist Management & Campus Lead Approvals:** When capacity is exceeded, applicants enter a managed waitlist queue (`waitlisted`) requiring Campus Lead or Chairman sign-off.

### 5.3 Multi-Session Attendance & Anti-Tamper Security
Engineered to prevent proxy attendance and handle complex event schedules:
- **Multi-Session Checkpoints (`attendance_sessions`):** Multi-day hackathons can mandate multiple check-ins (e.g. *Day 1 Morning*, *Day 1 Midnight Review*, *Day 2 Final Pitch*).
- **Verification Methods:**
  - **Native In-Browser QR Camera Scanner (`qr-scanner.tsx`):** Scans student passes directly from smartphone browsers.
  - **Anti-Tamper Secret Code (`attendance_secret_code`):** Optional verbal passcode required alongside QR scan.
  - **Manual Lookup & Bulk Upload:** Fallback verification for offline or paper-based rosters.
  - **Class Representative Check-In:** Class Reps verify students from their respective cohorts.
- **Attendance Statuses:** `present`, `late`, `absent`, `volunteer`, `speaker`.
- **Student Offline Pass (`/my-qr`):** Student digital wallet card generating a dynamic QR ticket pass.

### 5.4 Cryptographic Digital Certificates
Certificates are generated automatically upon verified attendance:
- **Security Features:** Unique Certificate ID, embedded QR code resolving to public verification URL, and digital cryptographic signature.
- **Public Verification Route:** `/verify/certificate/[id]` enables employers or university officials to instantly validate authenticity.
- **Achievement Categories:** `Participation`, `Winner`, `Runner-up`, `Speaker`, `Volunteer`.
- **Lifecycle Management:** Revocation toggle (`is_revoked`), download counter, and printable PDF exports.

---

## 6. Domain 4 — Innovation, Clusters & Project Pipeline

### 6.1 Skill Clusters
Dedicated technical communities fostering specialized talent within each college:
- **8 Standard Domains:**
  1. Artificial Intelligence & Machine Learning
  2. Cybersecurity & Ethical Hacking
  3. Full-Stack Web & Cloud Systems
  4. Internet of Things (IoT) & Robotics
  5. Automation & DevOps
  6. UI/UX Design & Product Strategy
  7. Media, Content & Digital Marketing
  8. Business, Tech Policy & Entrepreneurship
- **Cluster Structure:** Cluster Lead, Faculty Advisor, Member Roster, and weekly learning roadmap milestones.
- **Access Modes:**
  - `open`: Any chapter student may join.
  - `invite`: Admission through nomination and executive invitation.
  - `challenge`: Requires submission and evaluation of a technical challenge prompt.
- **Discord Integration:** Dedicated Discord voice/text channels and pingable roles per cluster.

### 6.2 Innovation Projects Pipeline
Tracks student software and hardware builds from inception to market launch:
- **6 Pipeline Stages:**
  ```
  Idea ➔ Planning ➔ Building ➔ Testing ➔ Demo ➔ Showcase
  ```
- **Project Classification:** `internal`, `campus`, `open_source`, `community`, `startup`, `industry`.
- **Project Metadata:** Multi-student team rosters, assigned mentors, Git repository URL, live demo URL, progress meter (0–100%), and competition awards.
- **Public Showcase Synchronization:** Showcased projects (`isShowcased`) synchronize automatically to the public portfolio on `elevates.live`.
- **Social Engagement:** Community voting (`vote_count`) and dedicated Discord discussion threads (`discord_thread_id`).

### 6.3 Centralized Resource Library
A cloud repository accessible across all chapters:
- **Curated Asset Categories:** SOPs, Workshop Kits, Presentation Templates, Promotional Posters, Official Logos, Sponsor Pitch Decks, Coding Tutorials, and Recorded Masterclasses.
- **Distribution Model:** Uploaded once by HQ; instantly indexed and accessible to authorized students across all connected colleges.

---

## 7. Domain 5 — Operations, Governance & Document Pipeline

### 7.1 Operational Task Management
Coordinates logistics for chapter events and daily operations:
- **Functional Categories:** `venue`, `marketing`, `registration`, `certificates`, `documentation`.
- **Relational Integrity:** Tasks link directly to parent chapters and specific events (`event_id`).
- **Tracking:** Real-time assignment to executives, priority indicators, due date monitors, and completion statuses (`pending`, `in_progress`, `completed`).

### 7.2 TipTap Rich Text Document Editor & Executive Reports
Elevates OS incorporates a full document editor for formal reporting:
- **Report Types:** `event`, `monthly`, `semester`, `annual`, `budget`, `activity`.
- **TipTap Document Pipeline:** Reports are authored in an interactive rich-text editor, persisting structured JSON (source-of-truth) and rendered HTML.
- **Student Automated Reports (`student_auto`):** System can automatically synthesize attendance data, photos, and metrics into draft event reports.
- **Multi-Image Media Galleries:** Attach event photos, banners, and scanned documents.
- **Export Engine:** One-click export to formatted Word documents (`.docx`) and printable HTML summaries.
- **HQ Approval Flow:** Draft ➔ Submitted ➔ Review (Approve / Request Changes / Reject) with formal HQ feedback comments.

### 7.3 Communication Infrastructure & Outbound Message Queue
Multi-channel notification engine keeping all stakeholders aligned:
- **In-App Targeted Announcements:** Scoped to `global`, `chapter`, `cluster`, `executive`, or `student` audiences.
- **In-App Notification Drawer:** Real-time notifications with unread counts and deep links.
- **Outbound Message Queue (`outbound_messages`):** Asynchronous dispatch table managing queued communications across **Email**, **WhatsApp**, **In-App**, and **Discord** with delivery status tracking (`queued`, `sent`, `failed`).

---

## 8. Domain 6 — Intelligence, Health Scores & Leaderboards

### 8.1 Multi-Tier Analytics Engine
Comprehensive data dashboards providing visibility at both network and campus levels:
- **HQ Network Intelligence (`/hq/analytics`):** Cross-chapter growth trends, student retention curves, aggregate attendance, and cluster output across universities.
- **Chapter Local Intelligence (`/chapter/[slug]/analytics`):** Monthly member acquisition, department breakdown, event registration conversion rates, and executive task velocity.

### 8.2 Algorithmic Chapter Health Score
Every college chapter is assigned an automated, objective health score (0–100%):
- **Computation Metrics:**
  - **Event Frequency (25%):** Regularity of workshops, hackathons, and meetups.
  - **Attendance Consistency (25%):** Ratio of registered attendees to verified check-ins.
  - **Reporting Punctuality (20%):** On-time submission of post-event and monthly reports.
  - **Project & Cluster Vitality (15%):** Active builds in progress and roadmap completion.
  - **Executive Task Velocity (15%):** On-time completion of assigned operational tasks.
- **Health Bands:**
  - `90% - 100%`: Excellent (Tier 1 Exemplar)
  - `75% - 89%`: Healthy (Active Progression)
  - `60% - 74%`: Moderate (Requires HQ Mentorship)
  - `< 60%`: Needs Attention (Intervention Required)

### 8.3 Executive Performance Scoring
Continuous evaluation of chapter officers based on quantifiable metrics:
- Tasks closed before deadlines.
- Events successfully organized and coordinated.
- Accurate attendance check-ins managed.
- Reports submitted and approved without rework.

### 8.4 Multi-Tier Gamified Leaderboards
Public and internal recognition boards filterable by Monthly, Semester, and Annual timeframes:
- **Students Leaderboard:** Ranked by event attendance points, project contributions, and community badges.
- **Class Representatives Leaderboard:** Ranked by student registration volume and cohort attendance rates.
- **Coordinators Leaderboard:** Ranked by successful initiatives delivered.
- **Chapters Leaderboard:** Ranked by aggregate Chapter Health Score and innovation output.
- **Projects & Clusters Leaderboards:** Ranked by milestone completion and community upvotes.

---

## 9. Discord Integration & Bot Automation Layer (PRD Specification)

### 9.1 Purpose & Scope
The ElevatesOS Discord Bot bridges physical chapter membership with the Discord community. It extends the chapter community ("cluster") experience into Discord while keeping ElevatesOS as the single source of truth for all membership, role, attendance, and leadership data.

### 9.2 Server Topography
The system manages two distinct categories of Discord servers:

| Server Type | Count | Access Policy | Core Purpose |
| :--- | :--- | :--- | :--- |
| **Main Server** | 1 (Global) | Open to anyone; no account linking required | Hosts open event-based clusters (weekly/task-based community activity), doubt-clearing, tech discussions, and general announcements. |
| **Chapter Server** | 1 per Chapter | Strictly restricted to verified chapter members | Exclusive campus workspace. Every member is tied to an ElevatesOS User ID; leaving the server automatically updates the active cluster member count. |

---

### 9.3 Goals & Non-Goals

#### Goals
- **Verifiable Identity:** Every chapter server member is verifiably linked to an active ElevatesOS account.
- **Automated Cluster Sync:** Cluster member counts and rosters stay synchronized in real time as members join or leave Discord.
- **Autonomous Local Moderation:** Campus Leads and Class Reps can moderate their own chapter server (`/kick`, `/ban`, `/mute`, `/warn`) without requiring elevated Discord guild ownership or manual admin training.
- **Rapid Chapter Onboarding:** New college chapters are onboarded in minutes via a standardized, reusable Discord Server Template.
- **Open Community Engagement:** The main server fosters unrestricted collaboration around task-based clusters and cross-campus hackathons.

#### Non-Goals (v1 Out-of-Scope)
- **Automated Guild Creation:** Discord's API restricts programmatic guild creation to bots in fewer than 10 servers. Chapter servers are created manually from the template and registered via `/setup-chapter`.
- **Cross-Chapter Leaderboards:** Gamification and competitive cross-server leaderboards are slated for v2.

---

### 9.4 System & Runtime Architecture
A single, always-on Node.js + `discord.js` bot process maintains a persistent WebSocket gateway connection to both the main server and all chapter servers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ElevatesOS Discord Bot                          │
│               (Node.js + discord.js Persistent Gateway)                │
│             Hosted on Railway / Fly.io (Mumbai Region)                 │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ (Authenticated via API Key)     │ (WebSocket Gateway)
                    ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       ElevatesOS Next.js API         │  │     Connected Discord Guilds │
│  - POST /discord/verify              │  │                              │
│  - GET  /discord/guild-config/:id    │  │  [Main Server]               │
│  - POST /discord/guild-config        │  │  - Open /create-cluster      │
│  - POST /discord/unlink              │  │  - #doubts-and-help forum    │
│  - GET  /discord/cluster/:chapterId  │  │                              │
│  - POST /discord/log-event           │  │  [Chapter Servers (1/Campus)]│
│  - POST /discord/warn                │  │  - Unverified -> Verified    │
│  - GET  /discord/warnings/:guild/:usr│  │  - Local Mod Commands        │
└───────────────────┬──────────────────┘  │  - Interactive RSVP Buttons  │
                    │                     └──────────────────────────────┘
                    ▼
┌──────────────────────────────────────┐
│       Supabase PostgreSQL DB         │
│  (guild_config, discord_links,       │
│   discord_events_log, warnings)      │
└──────────────────────────────────────┘
```

#### Key Architecture Principles:
1. **Zero Direct DB Access:** The bot never holds a Supabase service key or database credentials. All reads and writes are mediated by ElevatesOS Next.js API endpoints that enforce validation, rate-limiting, and centralized audit logging.
2. **Dedicated Bot API Key:** The bot authenticates to the ElevatesOS API using a secure shared bearer key.
3. **Branching Guild Behavior:** The bot checks the stored `guild_type` for every interaction:
   - `main`: Bypasses verification; provides a light welcome message and activates `/create-cluster` for task threads.
   - `chapter`: Enforces the Unverified quarantine role, initiates DM verification, synchronizes roles, and logs events.

---

### 9.5 Dedicated Bot Data Model (Supabase)

```sql
-- 1. Maps each Discord server to its type and chapter
CREATE TABLE public.guild_config (
    guild_id TEXT PRIMARY KEY,
    guild_type TEXT NOT NULL CHECK (guild_type IN ('main', 'chapter')),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tracks member verification status per Discord account per guild
CREATE TABLE public.discord_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    discord_username TEXT,
    os_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'unlinked')),
    linked_at TIMESTAMPTZ,
    unlinked_at TIMESTAMPTZ,
    UNIQUE(discord_user_id, guild_id)
);

-- 3. Append-only audit trail of join, leave, verification, and moderation events
CREATE TABLE public.discord_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'join', 'verify_success', 'verify_fail', 'leave', 'mod_action'
    detail JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Moderation warning records
CREATE TABLE public.warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    issued_by TEXT NOT NULL, -- Discord User ID of Campus Lead / Class Rep
    created_at TIMESTAMPTZ DEFAULT now()
);
```

*(Note: These tables work alongside `discord_integrations` and `discord_sync_queue` from migration `009`.)*

---

### 9.6 Core Operational Flows

#### 9.6.1 Chapter Server — Member Join & Verification Flow
1. **Event Trigger:** `guildMemberAdd` fires when a student joins a chapter server.
2. **Server Check:** Bot inspects `guild_config` and confirms the guild is a `chapter` server.
3. **Quarantine Role:** Bot immediately assigns the `Unverified` role (does not rely on Discord's native default-role setting for reliability).
4. **Verification Prompt:** Bot DMs the member requesting their **ElevatesOS User ID** (visible on their `/profile` passport, e.g. `ELV-0142` or UUID). If DMs are closed, bot falls back to mentioning the member in the restricted `#verify-here` channel.
5. **API Verification:** Member replies with their ID. Bot calls `POST /discord/verify` passing the ID, Discord identity, and `guild_id`.
6. **Success Resolution:**
   - Bot strips the `Unverified` role and assigns `Verified Member`.
   - If the student is recorded as a **Campus Lead** or **Class Rep** in ElevatesOS, the bot automatically assigns the corresponding elevated Discord role.
   - Bot renames the member's Discord server nickname to match their verified ElevatesOS full name.
   - Audit entry is dispatched to `#mod-log` and recorded in `discord_events_log`.
7. **Failure Resolution:**
   - If the ID does not match or belongs to a different college, the member is instructed to recheck their ID.
   - After **3 failed attempts** (configurable), the bot flags the Campus Lead in `#mod-log` for manual review.

#### 9.6.2 Chapter Server — Member Leave Flow
1. **Event Trigger:** `guildMemberRemove` fires when a member leaves or is kicked.
2. **Status Flip:** Bot calls `POST /discord/unlink` to update `discord_links.status = 'unlinked'` and records `unlinked_at`. The record is preserved permanently for historical auditing.
3. **Audit Log:** Bot posts to `#mod-log` and logs the leave event to `discord_events_log`.
4. **Cluster Count Refresh:** The chapter's active cluster headcount automatically adjusts because queries only count `status = 'linked'`.

#### 9.6.3 Main Server — Community Clusters Flow
1. **Open Access:** Unrestricted; students from any college or prospective applicants participate freely.
2. **Cluster Creation:** An Admin/HQ member executes `/create-cluster "<title>"` specifying a weekly build theme or hackathon challenge.
3. **Thread Instantiation:** Bot opens a structured forum thread under `#doubts-and-help`.
4. **Community Collaboration:** Questions, discussions, and project submissions occur directly inside the active thread.
5. **Cross-Posting:** Bot automatically broadcasts a rich embed announcement to `#cluster-updates`.

#### 9.6.4 Chapter Server — Localized Moderation Flow
- **Dual Permission Gating:** Moderation commands are protected by Discord's native `default_member_permissions` (hiding commands from regular members) **plus** a mandatory server-side role re-check in the bot process.
- **Zero Cross-Chapter Leakage:** Because Campus Lead and Class Rep roles exist strictly within their respective chapter servers, cross-chapter moderation is impossible by design.
- **Accountability Logging:** Every action (`/kick`, `/ban`, `/unban`, `/mute`, `/warn`) is announced in `#mod-log` with the moderator's name and reason, and logged to `discord_events_log` for HQ audit.

---

### 9.7 Complete Slash Command Reference

| Command | Server Scope | Required Access | Purpose & Behavior |
| :--- | :--- | :--- | :--- |
| `/setup-chapter` | Chapter | Guild Admin (One-time) | Registers the Discord guild with ElevatesOS, linking the `guild_id` to the specified Chapter ID. |
| `/cluster` | Chapter | Anyone (@everyone) | Displays the chapter's verified active member count and roster directory. |
| `/kick` | Chapter | Campus Lead, Class Rep | Removes a member from the chapter server. |
| `/ban` | Chapter | Campus Lead | Permanently bans a member, with an optional parameter to purge recent messages. |
| `/unban` | Chapter | Campus Lead | Reverses a ban using the target user's Discord User ID. |
| `/mute` | Chapter | Campus Lead, Class Rep | Applies a native Discord timeout to a member for a specified duration (e.g. `10m`, `1h`, `1d`). |
| `/warn` | Chapter | Campus Lead, Class Rep | Records a formal warning against a student in `warnings` and DMs the student with the reason. |
| `/warnings` | Chapter | Campus Lead, Class Rep | Displays the full disciplinary warning history for a specified member. |
| `/unlink` | Chapter | Campus Lead | Force-unlinks a member's ElevatesOS binding (e.g., if a user linked an incorrect profile ID). |
| `/create-cluster`| Main | HQ Admin | Instantiates a new event-based task or challenge thread under `#doubts-and-help`. |

---

### 9.8 Reusable Discord Server Template

A pre-configured Discord Server Template guarantees that every new college chapter launches with identical categories, channels, and permission overwrites.

#### Role Hierarchy (Highest to Lowest)
1. **Cluster Bot:** The bot's administrative role (must sit above all roles it manages to assign/strip roles).
2. **Campus Lead:** Full chapter administrative permissions (ban, unban, unlink, setup).
3. **Class Rep:** Executive moderation permissions (kick, mute, warn, view mod logs).
4. **Verified Member:** Standard member role granted automatically upon successful ElevatesOS verification.
5. **Unverified:** Default quarantine role assigned on join; restricted strictly to viewing `#rules` and `#verify-here`.

#### Standard Channel Layout
```
📁 WELCOME
├── 📜 #rules               (Read-only; server guidelines)
├── 🔐 #verify-here         (Restricted chat for unverified members to link their ID)
└── 📢 #announcements       (Read-only; official chapter broadcasts)

📁 GENERAL
├── 💬 #general-chat        (Verified discussion)
└── 👋 #introductions       (New member welcomes)

📁 CLUSTERS & TASKS
├── 🚀 #cluster-updates     (Build progress and weekly updates)
├── ❓ #doubts-and-help      (Forum channel for peer support)
└── 📦 #submissions         (Project and challenge proof-of-work)

📁 EVENTS
├── 🎪 #event-announcements (Event launches and registration links)
└── 📋 #event-planning      (Restricted to Leads and Reps)

📁 ADMIN
├── 🛡️ #mod-log             (Restricted; live audit log of joins, leaves, and mod actions)
└── 🤖 #bot-commands        (Restricted; execution of lead management commands)
```

#### Chapter Onboarding Procedure:
1. **Create Guild:** Campus Lead clicks the standardized Elevates Chapter Template link (`discord.new/...`) and names their campus server.
2. **Authorize Bot:** Campus Lead invites the ElevatesOS bot via its OAuth2 installation link.
3. **Register Guild:** In `#bot-commands`, the Campus Lead runs `/setup-chapter <chapterId>`.
4. **Automated Operation:** From this moment, all student joins, verification DMs, role syncing, and leave tracking execute automatically.

---

### 9.9 Required ElevatesOS API Endpoints
The bot interacts with ElevatesOS exclusively through these authenticated Next.js API endpoints (`src/lib/api.js`):

- **`POST /discord/verify`**  
  *Payload:* `{ osUserId, discordUserId, discordUsername, guildId }`  
  *Response:* `{ success: true, profile: { fullName, elevatesId, roleKey }, chapter: { id, name } }`  
  *Description:* Validates the user exists in the chapter; creates/updates `discord_links`.

- **`GET /discord/guild-config/:guildId`**  
  *Response:* `{ guildId, guildType, chapterId, chapterName }`  
  *Description:* Fetches guild classification and linked chapter metadata.

- **`POST /discord/guild-config`**  
  *Payload:* `{ guildId, guildType, chapterId }`  
  *Description:* Registers a new guild during `/setup-chapter`.

- **`POST /discord/unlink`**  
  *Payload:* `{ discordUserId, guildId, reason }`  
  *Description:* Sets `status = 'unlinked'` and logs timestamp.

- **`GET /discord/cluster/:chapterId`**  
  *Response:* `{ totalMembers, verifiedCount, members: [...] }`  
  *Description:* Provides live cluster stats for `/cluster`.

- **`POST /discord/log-event`**  
  *Payload:* `{ guildId, discordUserId, eventType, detail }`  
  *Description:* Persists an audit entry to `discord_events_log`.

- **`POST /discord/warn`**  
  *Payload:* `{ guildId, discordUserId, reason, issuedBy }`  
  *Description:* Logs a formal disciplinary warning in `warnings`.

- **`GET /discord/warnings/:guildId/:discordUserId`**  
  *Response:* `{ warnings: [...] }`  
  *Description:* Retrieves warning history for `/warnings`.

---

### 9.10 Automated Audit Triggers & Real-Time Sync Queue
In addition to bot slash commands, the system features database-level integration via migration `009_system_state_discord_and_audit_triggers.sql`:
- **Automated Audit Triggers (`record_audit_log`):** Triggers on PostgreSQL tables (`events`, `chapters`, `user_roles`) automatically serialize critical actions into `discord_sync_queue`.
- **Private Stream:** Critical security actions (e.g. role grants, chapter creation, registration toggles) stream directly into the Founder's private `#founder-audit` channel.
- **Interactive Component Buttons:** The bot dispatches interactive Discord message buttons allowing students to click **RSVP Now**, **Live Check-In**, or **Verify Certificate** directly from Discord embeds.

---

## 10. Developer Portal, Public APIs & Webhook Ecosystem

### 10.1 Developer Operations Console (`/hq/developer`)
Provides developers and college ERP administrators with full API management:
- **API Token Management:** Generate secure API tokens with environment scoping (`production`, `staging`, `development`) and expiration dates.
- **Granular Scopes:** `events:read`, `events:write`, `chapters:read`, `projects:read`, `stats:read`, `webhooks:manage`.
- **Interactive Sandbox:** In-browser API runner allowing administrators to execute live requests and inspect JSON responses.

### 10.2 Public REST Endpoints (`/api/public/*`)
High-performance REST endpoints designed for integration with college portals, mobile apps, and digital signage:
- `GET /api/public/events`: Query published events with filters for chapter, mode, and category.
- `GET /api/public/events/[slug]`: Retrieve full event details, ticket availability, and platform links.
- `GET /api/public/chapters`: List active chapters with geographic coordinates and member counts.
- `GET /api/public/projects`: Public directory of showcased student innovation projects.
- `GET /api/public/stats`: Live network counters (total students, active chapters, verified certificates).

---

## 11. Website CMS Hub (`elevates.live`) & UI State Engine

### 11.1 Centralized Website CMS (`/hq/website`)
Controls the content of the public marketing portal (`elevates.live`) directly from the OS:
- **Events Manager:** Curate which flagship hackathons and workshops are featured on the homepage.
- **Projects Showcase:** Manage high-profile student case studies (e.g. *Celestia Build*, *Vibranium*).
- **Founders & Team Directory:** Manage profiles, photos, bios, proof-of-work, and social links for Founders, Core Executives, and Faculty Advisors.
- **For Colleges Hub:** Configure institutional partnership tiers, download links for the institutional deck, and accreditation FAQs.

### 11.2 Real-Time Cross-Platform UI State Engine (`system_ui_states`)
Allows HQ administrators to control the state of buttons, banners, and modals across Web, OS, and Discord:
- **Dynamic Keys:** E.g., `btn_event_rsvp`, `btn_event_checkin`, `banner_maintenance_mode`, `toggle_discord_event_sync`.
- **Properties:** State type (`button`, `toggle`, `banner`, `badge`), visibility toggle, enabled state, custom label, theme tone, and target route.
- **Instant Propagation:** Changes take effect immediately without requiring code redeployments.

---

## 12. Complete Database Schema & Persistence Architecture

The persistent database consists of 26 core tables managed across 18 sequential Supabase PostgreSQL migrations:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ELEVATES OS DATABASE SCHEMA                            │
└─────────────────────────────────────────────────────────────────────────────────┘
 [ORGANIZATION & CHAPTERS]
 ├── organizations             ── Global HQ entity, brandKit JSON
 ├── chapters                  ── College chapters, healthScore, coords, elevatesId, shortCode
 ├── chapter_standard_checks   ── Operational compliance checklists
 └── departments               ── Chapter-scoped academic departments

 [USERS & ACCESS CONTROL]
 ├── profiles                  ── User identities, elevatesId, resumeUrl, points, discordId
 ├── class_cohorts             ── Dept + Year + Section + assigned Class Reps
 ├── roles                     ── System role definitions and scope levels
 ├── permissions               ── Granular permission keys
 ├── role_permissions          ── Role-to-permission mapping matrix
 ├── user_roles                ── Assigned user roles with validity windows
 └── event_permissions         ── Temporary event-scoped permissions with auto-expiry

 [LEADERSHIP & TERMS]
 ├── leadership_terms          ── Academic year cycles, start/end dates, handover notes
 ├── leadership_assignments    ── Executive seats assigned within a term
 └── leadership_applications   ── Multi-stage student leadership application pipeline

 [EVENTS & REGISTRATION]
 ├── events                    ── Events, hierarchy (main/sub), dates, capacity, discord sync
 ├── forms                     ── Dynamic forms, purpose, logicRules JSON, questions JSON
 ├── form_responses            ── Form submission answers
 ├── event_registrations       ── Registered attendees, waitlist status, QR codes
 ├── attendance                ── Check-in records, session checkpoints, verification method
 └── certificates              ── Issued digital certs, verification QR, cryptographic signatures

 [CLUSTERS & PROJECTS]
 ├── clusters                  ── Skill communities, roadmaps, accessMode, discord channels
 ├── cluster_invites           ── Nominations and invitations into selective clusters
 └── projects                  ── Innovation projects, pipeline stage, demo links, discord threads

 [OPERATIONS & MESSAGING]
 ├── tasks                     ── Operational tasks linked to chapters and events
 ├── reports                   ── Executive reports, TipTap bodyJson, bodyHtml, HQ reviews
 ├── announcements             ── Scoped announcements for global/chapter/cluster audiences
 ├── notifications             ── In-app real-time notification records
 ├── outbound_messages         ── Message queue (Email, WhatsApp, Discord, In-App)
 ├── activity_logs             ── Audit log entries recorded via automated triggers
 ├── invite_tokens             ── User invite tokens
 └── chapter_invite_codes      ── 3-day auto-expiring institutional onboarding codes

 [INTEGRATIONS & SYSTEM STATE]
 ├── discord_integrations      ── Discord guild configuration, bot heartbeat, channel mappings
 ├── discord_sync_queue        ── Outbound sync queue for Discord events and alerts
 ├── system_ui_states          ── Real-time cross-platform button and UI state switches
 └── website_sections          ── Dynamic CMS content blocks for elevates.live
```

---

## 13. End-to-End Operational Workflows

### 13.1 Complete Student Journey
```
1. ONBOARDING
   Student receives a 3-Day Chapter Invite Code (e.g. EKC-7K2P) or WhatsApp referral link.
   ↓
2. REGISTRATION & PROFILE
   Signs up via /join; assigned permanent sequential ID (e.g. ELV-0142).
   Completes profile with skills, GitHub, resume link, department, and class section.
   ↓
3. CLUSTER ENROLLMENT
   Browses chapter skill clusters; applies to Web or AI Cluster via challenge prompt.
   ↓
4. EVENT REGISTRATION
   Registers for an upcoming Hackathon; conditional form asks for laptop and team preference.
   Assigned Class Representative reviews and verifies student identity.
   ↓
5. TICKET ISSUANCE & OFFLINE PASS
   QR ticket pass generated and saved to student's /my-qr digital wallet.
   ↓
6. EVENT DAY & CHECK-IN
   Student presents QR code at venue entrance; scanner verifies attendance checkpoint.
   ↓
7. CERTIFICATE RECOGNITION
   Cryptographic certificate generated instantly; added to profile with verification QR.
   ↓
8. PROJECT INCUBATION & DEMO DAY
   Student forms a team, submits project to pipeline (Idea ➔ Building ➔ Showcase).
   Project is showcased on elevates.live; team receives community awards.
   ↓
9. LEADERSHIP ADVANCEMENT
   Student applies for next year's Executive Council through /leadership;
   Advances through screening and interview to become Technical Lead.
```

### 13.2 Event Lifecycle Workflow
```
1. DRAFTING
   Secretary creates event; selects Main Event vs Sub-Event hierarchy; configures dates and venue.
   ↓
2. FORM CONFIGURATION
   Builds registration form using Google Forms-grade builder; defines When/If/Then logic rules.
   ↓
3. FACULTY & CAMPUS LEAD APPROVAL
   Faculty Coordinator reviews event proposal and provides digital endorsement.
   ↓
4. PUBLICATION & DISCORD SYNC
   Event is published; registration button toggled live; scheduled event synced to Discord server.
   ↓
5. REGISTRATION & WAITLISTING
   Students register; Class Reps verify classroom peers; overflows placed on waitlist for Campus Lead review.
   ↓
6. EVENT DAY ATTENDANCE
   Check-in scanner activated; organizers verify multi-session checkpoints via camera QR scanner.
   ↓
7. CERTIFICATE ISSUANCE
   Attendance closes; system bulk-issues verified certificates with public verification URLs.
   ↓
8. EXECUTIVE REPORTING
   Secretary drafts event report in TipTap editor; embeds media gallery; submits to HQ.
   ↓
9. AUDIT & ANALYTICS UPDATE
   HQ reviews and approves report; Chapter Health Score and leaderboards automatically updated.
```

---

## 14. Design System & Frontend Aesthetics

Elevates OS adheres to the **Finexy-light ERP** aesthetic standard:
- **Canvas:** Soft cool gray canvas (`#f3f4f6`), strictly avoiding cream, sand, or dark terminal backgrounds.
- **Brand Accent:** Single intentional accent `#f26430` (sole brand accent for primary CTAs, active nav states, and focus rings; strictly $\le$ 10% of total surface area).
- **Secondary Palette:** Deep charcoal `#2d2d34` for high-contrast primary buttons and text; Indigo `#414066` for secondary metadata; Sage `#5f7560` for positive health scores and confirmations.
- **Product Chrome:** Crisp white floating cards with soft diffuse shadows (`box-shadow`), 18–22px border radius, and clean borders.
- **Typography Standard:**
  - **Headings & Display:** *Syne* (modern geometric display sans).
  - **Body & Product UI:** *Plus Jakarta Sans* (clean, legible ERP sans).
  - **Tabular & Identifiers:** *IBM Plex Mono* (used for sequential IDs, ticket numbers, and timestamps).
- **Interaction Standards:** Smooth 180–240ms ease-out transitions on hover and active states, respecting `prefers-reduced-motion`.

---

## 15. Roadmap & Version 2 Evolution

### 15.1 Comparison: Original `spec.md` V2 Plan vs. Current Implementation
Several capabilities originally scheduled for "Version 2" in `spec.md` have already been engineered into the current platform:

| Original `spec.md` V2 Proposal | Current Codebase Status |
| :--- | :--- |
| **API for College ERP Integration** | **Already Implemented:** Complete Developer Portal, API Token generator, and public REST APIs (`/api/public/*`) are active. |
| **Public Showcase Portal for Projects** | **Already Implemented:** Website CMS Hub (`/hq/website`) directly synchronizes projects to `elevates.live`. |
| **QR-based Member ID Cards** | **Already Implemented:** Student Digital Pass & QR Wallet live at `/my-qr`. |
| **Budget & Finance Module** | **Partially Implemented:** Budget reporting structure incorporated into executive reports. |

### 15.2 Future Roadmap (Remaining V2 Milestones)
The remaining horizon items to be developed in future releases include:
1. **Native Mobile App (iOS & Android):** Native camera barcode scanning and offline Bluetooth mesh check-in.
2. **Startup Incubation & Angel Pipeline:** Tracking institutional IP, patent filings, and seed funding rounds.
3. **Internship & Placement Board:** Matching top-ranked leaderboard students directly with hiring technology partners.
4. **AI Operations Assistant:** Automated drafting of monthly reports from event logs and natural-language query interface for HQ analytics.
5. **Equipment & Campus Lab Booking:** Scheduling physical lab spaces, 3D printers, and IoT development kits across colleges.

---

## 16. Comparative Analysis: Elevates OS vs. Other Systems

### 16.1 The Landscape: Current Campus Tool Fragmentation
Most college innovation communities, clubs, and student chapters operate using an ad-hoc, fragmented patchwork of disconnected consumer tools. This fragmentation causes operational failure: data is lost every academic year, proxy attendance invalidates certificates, students have no permanent verifiable portfolio, and faculty coordinators struggle to extract compliance reports for university accreditation.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    THE AD-HOC FRAGMENTED CAMPUS STACK                      │
│                                                                            │
│  [Registration]         [Communication]         [Data & Attendance]        │
│   Google Forms    ───>   WhatsApp Groups  ───>     Google Sheets           │
│   (No logic, no          (No roles, spam,          (Prone to manual edits, │
│    waitlist queue)        leaks, chaotic)           proxy entries)         │
│                                                                            │
│  [Project Sharing]      [Certificates]          [Leadership Handover]      │
│   Unlinked GitHub ───>   Canva + MailMerge───>     Forgotten Google Drive  │
│   (No showcases or       (Easily forged,           (Files lost, knowledge  │
│    verified team)         no public URL)            wiped every June)      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 16.2 Comprehensive Comparison Matrix

| System Dimension | Traditional Ad-Hoc Stack<br>*(Forms + Sheets + WhatsApp)* | Traditional College ERPs<br>*(TCS iON, Linways, Fedena)* | Standalone Event Platforms<br>*(Luma, Eventbrite, Devfolio)* | Standalone Community Tools<br>*(Discord / Slack / Notion alone)* | **Elevates OS (EOS)**<br>*(This System)* |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Focus** | Quick, ad-hoc event forms | Administrative fee collection, attendance, grading | Single-event ticketing or competitive hackathons | Casual chat or unstructured knowledge base | **Full lifecycle operating system for multi-college innovation chapters** |
| **Multi-Campus Architecture** | None (siloed drives/sheets per club) | Monolithic per institution; zero inter-college connection | Global public marketplace; no institutional hierarchy | Single server or workspace; no federation | **Federated Multi-Tenant:** Central HQ governance + autonomous college chapter workspaces |
| **Student Identity & Portfolio** | None (ad-hoc email entries in spreadsheets) | Roll number + academic marks only; no skills or builds | Basic public profile with past registrations | Chat handle; no verified academic or event history | **Verified Student Passport:** Sequential ID (`ELV-0001`), skills, projects, verified certs, points, badges |
| **Leadership Transitions & Cycles** | Handover files lost every academic year | Static staff assignments; no student council handover | No concept of student leadership terms | Admin role transfers; zero historical handover notes | **Immutable Annual Cycles:** Complete leadership history, handover dossiers, application pipeline |
| **Class Rep Scoping** | No data isolation (all reps see full spreadsheet) | Faculty-only access; reps have no dedicated tooling | No concept of class cohorts | Channel-based only; no database query isolation | **Cryptographic Scoping:** Class Reps strictly scoped to assigned Dept + Year + Section peers |
| **Registration Engine** | Basic flat Google Forms; no conditional branching | Static, rigid course registration forms | Basic ticket tiers; minimal conditional logic | No native forms (requires third-party bots) | **Google Forms-Grade Builder with Visual When/If/Then logic**, templates, standalone URLs |
| **Attendance Verification** | Paper sheets or honor-system Google Form | Manual teacher roll call or biometric gates | Simple door QR scan (single-checkpoint only) | Discord voice presence or slash command check-in | **Multi-Session Checkpoints + Anti-Tamper Passcodes + In-Browser Camera Scanner + Offline Wallet** |
| **Certificates & Verification** | Mail-merged PDFs; easily forged; zero verification | Paper certificates issued months later | Generic PDF certificate; rare online verification | None or third-party image generation bot | **Cryptographic Digital Certificates:** Dynamic QR resolving to `/verify/certificate/[id]`, revocation toggle |
| **Innovation & Projects** | Unindexed personal GitHub repos | None; purely academic coursework | Hackathon submissions only; archived post-event | Shared links in chat; lost in message history | **6-Stage Pipeline:** Idea to Showcase, community voting, Discord threads, auto-sync to `elevates.live` |
| **Executive Reporting** | Informal Word documents emailed to faculty | Rigid, compliance-only academic reports | Basic CSV ticket export | Unstructured chat messages or Notion pages | **TipTap Rich Text Editor:** WYSIWYG editor, student auto-reports, image galleries, DOCX/HTML export |
| **Accreditation Support (NAAC/KTU)** | Manual, painful collation of paper records | Basic academic attendance logs | None | None | **Automated Compliance:** Exportable audit trails, verified hours, faculty sign-off workflows |
| **Discord Automation** | Manual chat links posted in WhatsApp | Zero integration | Webhook announcements only | Native, but disconnected from real-world operations | **Bidirectional Integration:** Bot heartbeat, channel/role sync, interactive RSVP buttons, audit stream |
| **Realtime Remote Controls** | None (forms must be closed manually) | Scheduled portal locks | Registration open/close toggles | Channel locking | **Cross-Platform UI State Engine:** Remote button toggling across Web, OS, and Discord in real time |
| **Extensibility & APIs** | None | Closed proprietary databases | Limited REST APIs; no campus ERP integration | Standard webhooks and bot APIs | **Full Developer Portal:** Scoped tokens (dev/staging/prod), sandbox, `/api/public/*` REST endpoints |

---

### 16.3 Deep-Dive on Key Differentiators

#### 1. Federated Multi-Campus Governance vs. Monolithic/Siloed Tools
- **Other Systems:** Standalone tools either isolate each campus into an unmonitored silo (e.g. separate WhatsApp groups or Google Drives) or lock them into a single institution's closed ERP.
- **Elevates OS:** Provides a true **federated architecture**. Elevates HQ maintains top-down quality control, standardized guidelines, global calendar visibility, and brand assets, while individual college chapters (EKC, MES, CUSAT, etc.) maintain full autonomy over their local events, leadership, and students.

#### 2. Immutable Leadership Succession vs. Annual Data Loss
- **Other Systems:** When senior students graduate, club institutional knowledge vanishes. Spreadsheets are orphaned, passwords are lost, and incoming leaders start from scratch.
- **Elevates OS:** Architecture treats leadership as a formal, recurring cycle. Academic terms (e.g. *2026 Executive Council*) record start/end dates, full historical rosters, and mandatory handover notes. Incoming executives are selected through an in-platform **Leadership Application Pipeline** (`applied` → `screening` → `interview` → `selected`).

#### 3. High-Integrity Attendance Engine vs. Proxy & Paper Sheets
- **Other Systems:** Google Forms or paper sign-in sheets lead to widespread proxy attendance. Standalone event tools only support a single entry check-in.
- **Elevates OS:** Implements **Multi-Session Checkpoints** for multi-day workshops and hackathons (e.g. Morning Keynote + Midnight Review + Pitch Day), **anti-tamper secret passcodes**, camera-based browser QR scanning, and **offline student passes** (`/my-qr`), directly gating certificate issuance.

#### 4. Verified Student Innovation Passport vs. Static Resumes
- **Other Systems:** Resumes and LinkedIn profiles contain unverified claims of club membership, hackathon participation, and technical skills.
- **Elevates OS:** Every student possesses a permanent **Sequential Elevates ID** (`ELV-0001`) backed by an immutable ledger of verified attendance, cryptographic digital certificates, functional leadership seats, and active project codebases.

#### 5. Native Discord Operational Bridge vs. Standalone Chat
- **Other Systems:** Discord communities operate completely detached from student registries, attendance rosters, and official chapter approvals.
- **Elevates OS:** Seamlessly synchronizes database events and roles with Discord servers. Automated PostgreSQL audit triggers stream security alerts to Discord, cluster roles auto-sync with student tiers, and interactive Discord buttons allow students to RSVP and check in without leaving the chat client.

#### 6. Institutional Accreditation Compliance vs. Builder Culture
- **Other Systems:** Force a compromise between boring, administrative college ERPs and casual, unstructured hacker clubs.
- **Elevates OS:** Delivers the best of both worlds: a sleek, modern **Finexy-light ERP interface** that students love using, paired with rigorous reporting, faculty approval workflows, and exportable data meeting university accreditation standards (NAAC, NBA, and KTU student activity points).

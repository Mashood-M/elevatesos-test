-- ============================================================================
-- ELEVATES PLATFORM — MASTER SEED SCRIPT (Elevates Web Data -> Supabase)
-- Full data from Elevates-web (Chapters, Founders, Events, Projects, Peer Labs, Clusters)
-- Deterministic UUIDs for idempotent upserts.
-- ============================================================================

-- 1. ORGANIZATION
insert into organizations (id, name, slug, tagline, brand_kit)
values (
  'e1000000-0000-4000-8000-000000000001',
  'Elevates Foundation',
  'elevates',
  'Engineering Culture, Open Building & Tech Leadership across Campuses',
  '{"primaryColor": "#f26430", "secondaryColor": "#2d2d34", "logoUrl": "/images/logo.png"}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  brand_kit = excluded.brand_kit;

-- 2. CHAPTERS
insert into chapters (
  id, organization_id, name, slug, college, city, district, status, health_score, founded_at, published, member_count, event_count, project_count, notes
)
values (
  'c1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'Eranad Knowledge City Chapter',
  'ekc',
  'Eranad Knowledge City Technical Campus',
  'Manjeri',
  'Malappuram',
  'active',
  98.5,
  '2025-09-01',
  true,
  128,
  15,
  8,
  'First flagship campus chapter. Active departments: CSE, AI&DS, CSBS, ECE, Civil, Mechanical.'
)
on conflict (organization_id, slug) do update set
  name = excluded.name,
  college = excluded.college,
  city = excluded.city,
  district = excluded.district,
  status = excluded.status,
  health_score = excluded.health_score,
  published = excluded.published,
  member_count = excluded.member_count,
  event_count = excluded.event_count,
  project_count = excluded.project_count,
  notes = excluded.notes;

-- 3. PROFILES (Founders, Core Team, Faculty, Leads)
-- Note: In production, profiles reference auth.users. When running seed in development/demo, we upsert into profiles.
insert into profiles (
  id, email, full_name, avatar_url, department, year, chapter_id, skills, interests, github_url, linkedin_url, portfolio_url, points, bio, is_public, status, engagement_tier, journey_stage
)
values
  (
    'd1000000-0000-4000-8000-000000000001',
    'sarhan@elevates.live',
    'Sarhan Qadir KVM',
    '/images/founders/sarhan-qadir.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Systems Architecture'],
    array['Open Source', 'EdTech', 'Engineering Culture', 'Community Building'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/in/sqadirkvm/',
    'https://elevates.live',
    2500,
    'Founder & President · Elevates Foundation. Building open engineering culture.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'naseem@elevates.live',
    'Naseem Shan',
    '/images/founders/naseem-shan.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Backend', 'Systems', 'DevOps', 'Distributed Systems'],
    array['Infrastructure', 'Cloud', 'System Architecture'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/in/naseem-shan-b5039a255/',
    null,
    2100,
    'Founder · Backend Systems & Infrastructure Lead.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'nafih@elevates.live',
    'Muhammed Nafih P',
    '/images/founders/nafih.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['UI/UX Design', 'Figma', 'Brand Identity', 'Product Design', 'Frontend'],
    array['Design Systems', 'Motion Design', 'Typography'],
    null,
    'https://www.linkedin.com/in/muhammed-nafih-8777a2282/',
    null,
    1950,
    'Founder · Design Wizard & Brand Lead.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    'adhinan@elevates.live',
    'Adhinan K',
    null,
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Cybersecurity', 'Kali Linux', 'Penetration Testing', 'CTF', 'Network Defense'],
    array['InfoSec', 'Ethical Hacking', 'Reverse Engineering'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/company/elevates-in',
    null,
    1800,
    'Founder · Cybersecurity Lead & CTF Researcher.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000005',
    'jasira@ekc.edu.in',
    'Jasira KT',
    '/images/advisors/jasira-kt.jpeg',
    'Computer Science & Engineering',
    null,
    'c1000000-0000-4000-8000-000000000001',
    array['Curriculum Development', 'Academic Mentorship', 'Student Affairs'],
    array['Engineering Pedagogy', 'Industry-Academia Bridge'],
    null,
    null,
    null,
    1500,
    'Faculty Coordinator & CSE Faculty Head, Eranad Knowledge City Technical Campus.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000006',
    'danish@ekc.edu.in',
    'Danish Gagarin',
    null,
    'Cyber Security',
    '2nd Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Web Development', 'Bootstrap', 'HTML/CSS', 'Community Operations'],
    array['Web Design', 'Open Source', 'Outreach'],
    'https://github.com/Elevates-Foundation',
    null,
    null,
    1200,
    'Campus Chapter Lead · Eranad Knowledge City.',
    true,
    'active',
    'active',
    'cluster'
  )
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  department = excluded.department,
  year = excluded.year,
  skills = excluded.skills,
  interests = excluded.interests,
  github_url = excluded.github_url,
  linkedin_url = excluded.linkedin_url,
  points = excluded.points,
  bio = excluded.bio,
  is_public = excluded.is_public;

-- 4. CLUSTERS
insert into clusters (
  id, chapter_id, name, slug, description, leader_id, faculty_id, access_mode, roadmap, responsibilities
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Web & Fullstack Engineering',
    'web-dev',
    'Modern web application architecture, Next.js, APIs, state management and cloud deployments.',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'open',
    '[{"week": 1, "topic": "HTML, CSS & Modern JS"}, {"week": 2, "topic": "React & Next.js Basics"}, {"week": 3, "topic": "State & Backend APIs"}, {"week": 4, "topic": "Production Deployments"}]'::jsonb,
    array['Host bi-weekly peer coding sprints', 'Review student pull requests', 'Deploy student projects to Vercel']
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Cybersecurity & CTF',
    'cybersec',
    'Defensive security, Kali Linux, packet inspection, ethical hacking and CTF battles.',
    'd1000000-0000-4000-8000-000000000004',
    'd1000000-0000-4000-8000-000000000005',
    'invite',
    '[{"week": 1, "topic": "Terminal & Kali Linux"}, {"week": 2, "topic": "Wireshark Packet Analysis"}, {"week": 3, "topic": "Web Exploitation Vectors"}, {"week": 4, "topic": "Campus CTF"}]'::jsonb,
    array['Conduct network defense drills', 'Organize internal Capture The Flag competitions', 'Maintain security audit guides']
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'AI, Agents & Automation',
    'ai-agents',
    'LLM workflows, prompt engineering, n8n automations, autonomous agent development.',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'open',
    '[{"week": 1, "topic": "Prompting & LLM Architecture"}, {"week": 2, "topic": "n8n Webhook Automations"}, {"week": 3, "topic": "RAG & Vector Embeddings"}, {"week": 4, "topic": "Agent Deployment"}]'::jsonb,
    array['Build autonomous campus tools', 'Run no-code AI workshops', 'Explore multimodal AI systems']
  )
on conflict (chapter_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  leader_id = excluded.leader_id,
  access_mode = excluded.access_mode,
  roadmap = excluded.roadmap,
  responsibilities = excluded.responsibilities;

-- 5. REAL EVENTS (From src/data/events.ts)
insert into events (
  id, chapter_id, title, slug, summary, description, venue, starts_at, ends_at, capacity, visibility, status, certificate_enabled, category, banner_url, banner_emoji, mode, progress_stage, published_at, organizer_id
)
values
  (
    'd1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'LET''S DECODE LINKEDIN',
    'decode-linkedin-shiju-mishal',
    'The LinkedIn Way · Professional Branding, Networking & Internships',
    'Full-day interactive workshop on unlocking the full potential of LinkedIn for personal branding, recruiter networking, and high-impact internship search with Shiju Roy & Mishal V P.',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-07-22 10:00:00+05:30',
    '2026-07-22 16:00:00+05:30',
    80,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/decode-linkedin-shiju-mishal.jpeg',
    '💼',
    'in_person',
    'completed',
    '2026-07-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'CAREER CATALYST — WORKSHOP',
    'career-catalyst-baiju',
    'Want to Get Hired? Start Here · Employability, Resumes & Mock Interviews',
    'Full-day interactive employability and placement preparation workshop led by Prof. Baiju B S (Placement Head, MEA Engineering College).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-07-15 10:00:00+05:30',
    '2026-07-15 16:00:00+05:30',
    65,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/career-catalyst-baiju.jpeg',
    '🚀',
    'in_person',
    'completed',
    '2026-07-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'VIBE CODING WORKSHOP',
    'vibe-coding-brototype',
    'Build, Create & Innovate · AI-Assisted Rapid Development with Brototype',
    'Full-day hands-on Vibe Coding workshop conducted by Brototype (Jobin Selvanose & Umar Muqthar) and powered by ELEVATES, featuring rapid prototyping with AI tools, Git, and Firebase.',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-26 10:00:00+05:30',
    '2026-03-26 16:00:00+05:30',
    70,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/vibe-coding-brototype.jpeg',
    '⚡',
    'in_person',
    'completed',
    '2026-03-10 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    'c1000000-0000-4000-8000-000000000001',
    'REVAMP OF CSE ASSOCIATION',
    'cse-association-revamp-mehar',
    'Official Association Relaunch · Chief Guest Mehar M P (Co-Founder, TinkerHub)',
    'Official relaunch and revamp of the Computer Science Engineering Association at EKCTC with Chief Guest Mehar M P (Co-Founder & CEO, TinkerHub Foundation).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-25 14:00:00+05:30',
    '2026-03-25 16:00:00+05:30',
    80,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/cse-association-revamp-mehar.jpeg',
    '🌟',
    'in_person',
    'completed',
    '2026-03-15 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000005',
    'c1000000-0000-4000-8000-000000000001',
    'AI & DS ASSOCIATION INAUGURATION',
    'aids-association-inauguration',
    'Inauguration & Industry Keynote · Guests from Elyst AI',
    'Inauguration ceremony of the AI & Data Science Association at EKCTC, featuring keynote sessions by Elyst AI Co-Founders Fathima Shirin P (CEO) and Nihal Anas (CAIO).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-12 10:00:00+05:30',
    '2026-03-12 13:00:00+05:30',
    68,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/aids-association-inauguration.jpeg',
    '🤖',
    'in_person',
    'completed',
    '2026-03-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000006',
    'c1000000-0000-4000-8000-000000000001',
    'ELEVATES CAMPUS LAUNCH',
    'elevates-campus-launch-ekctc',
    'Official Chapter Opening & Leadership Handover · Chief Guest Shibili Rahman KP',
    'Official ELEVATES Campus Chapter Launch and leadership handover ceremony at EKCTC, featuring Chief Guest Shibili Rahman KP (Founder & Chairman, RAC Global).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-04 10:00:00+05:30',
    '2026-03-04 13:00:00+05:30',
    121,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/campus-launch-ekctc.jpeg',
    '🚩',
    'in_person',
    'completed',
    '2026-02-20 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000007',
    'c1000000-0000-4000-8000-000000000001',
    'CYBER RAID — CAPTURE THE FLAG',
    'cyber-raid-ctf',
    'Hack. Solve. Conquer · ₹1500 Prize Pool by ELEVATES',
    'Competitive Capture The Flag battlefield featuring binary exploitation, cryptic challenges, web exploitation, and network defense drills.',
    'Eranad Knowledge City Technical Campus (EKCTC)',
    '2025-10-09 10:00:00+05:30',
    '2025-10-09 16:30:00+05:30',
    45,
    'public',
    'completed',
    true,
    'Challenge',
    '/images/events/adhinan-ctf.jpeg',
    '🛡️',
    'in_person',
    'completed',
    '2025-09-25 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  description = excluded.description,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  capacity = excluded.capacity,
  visibility = excluded.visibility,
  status = excluded.status,
  certificate_enabled = excluded.certificate_enabled,
  category = excluded.category,
  banner_url = excluded.banner_url,
  banner_emoji = excluded.banner_emoji,
  mode = excluded.mode,
  progress_stage = excluded.progress_stage;

-- 6. REAL PROJECTS (From src/data/projects.ts)
insert into projects (
  id, chapter_id, title, slug, description, stage, repository_url, progress, demo_url, awards, is_showcased, project_type
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Celestia — CSE Association Website',
    'celestia',
    'A department website specified, coded, and deployed in 60 minutes with 5 junior builders and launched live on stage via Python gesture recognition.',
    'launched',
    null,
    100,
    'https://celestia-web-lti6.vercel.app',
    array['1-Hour Build Speed Record', 'Stage Gesture Launch'],
    true,
    'flagship'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Vibranium Event Platform',
    'vibranium-event-platform',
    'Full event management and ticketing platform built in 5 days, handling 400,000 requests in 24 hours with zero downtime.',
    'launched',
    'https://github.com/Elevates-Foundation',
    100,
    'https://elevates.live',
    array['400k Requests / 24h', 'Zero Downtime'],
    true,
    'flagship'
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'Elevates OS',
    'elevates-os',
    'Next.js 16 Finexy-style ERP operating system powering chapters, events, attendance, workflows, and automated certificate issuance.',
    'active',
    'https://github.com/Elevates-Foundation',
    95,
    'http://localhost:3001',
    array['Core Infrastructure'],
    true,
    'flagship'
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  stage = excluded.stage,
  repository_url = excluded.repository_url,
  progress = excluded.progress,
  demo_url = excluded.demo_url,
  awards = excluded.awards,
  is_showcased = excluded.is_showcased,
  project_type = excluded.project_type;

-- 7. PEER LABS (From src/data/peer-labs.ts)
insert into peer_labs (
  id, slug, title, track, description, syllabus, status, applications_open, enrolled_count
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'cybersec-defense-lab',
    'Cybersecurity Lab',
    'Cybersecurity',
    '3-Phase Hands-on Kali Linux & Network Defense. Master terminal navigation, network mapping, vulnerability inspection, and defensive security drills.',
    '[{"phase": 1, "title": "Kali Linux & Network Defense"}, {"phase": 2, "title": "Terminal Fundamentals"}, {"phase": 3, "title": "Security & Ethical Hacking"}, {"phase": 4, "title": "Cyber Raid CTF Capstone"}]'::jsonb,
    'active',
    true,
    76
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'operation-java',
    'Operation Java',
    'Software',
    'Multi-week hands-on Java fundamentals, OOP design patterns, and full-stack software development for campus builders.',
    '[{"week": 1, "title": "JVM & Modern Syntax"}, {"week": 2, "title": "OOP Lab & Design Patterns"}, {"week": 3, "title": "Database Interfacing"}, {"week": 4, "title": "Mini Project Sprint"}]'::jsonb,
    'active',
    true,
    45
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'spark-electronics',
    'Spark Electronics Lab',
    'Hardware & IoT',
    'Intro electronics, semiconductor circuits, microcontrollers, and embedded hardware tinkering for campus makers.',
    '[{"week": 1, "title": "Circuits & Passive Components"}, {"week": 2, "title": "Semiconductors & Sensors"}, {"week": 3, "title": "Arduino & ESP32"}, {"week": 4, "title": "Hardware Demo Day"}]'::jsonb,
    'active',
    true,
    32
  )
on conflict (slug) do update set
  title = excluded.title,
  track = excluded.track,
  description = excluded.description,
  syllabus = excluded.syllabus,
  status = excluded.status,
  applications_open = excluded.applications_open,
  enrolled_count = excluded.enrolled_count;

-- 8. SAMPLE VERIFIABLE CERTIFICATE
insert into certificates (
  id, certificate_id, event_id, user_id, issued_at, verification_qr, digital_signature
)
values (
  'f1000000-0000-4000-8000-000000000001',
  'ELV-EKC-2026-90421',
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  '2026-07-22 17:00:00+05:30',
  'https://elevates.live/verify/certificate/ELV-EKC-2026-90421',
  'sig_sha256_elevates_ekc_decode_linkedin_verified'
)
on conflict (certificate_id) do update set
  issued_at = excluded.issued_at,
  verification_qr = excluded.verification_qr,
  digital_signature = excluded.digital_signature;

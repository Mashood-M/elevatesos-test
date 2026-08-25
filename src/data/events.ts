export interface EventOrganizer {
  name: string;
}

export interface EventHost {
  name: string;
  role: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  fullDescription?: string;
  format: string;
  category: "Workshop" | "Challenge" | "Meetup" | "Showcase";
  status: "Completed" | "Upcoming";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isoStartDate: string;
  isoEndDate: string;
  venue: string;
  locationName?: string;
  organizer?: EventOrganizer[];
  hosts?: EventHost[];
  topics?: string[];
  attendeesCount: number;
  coverImage: string;
  featured?: boolean;
  peerLabSlug?: string;
  peerLabTitle?: string;
}

export const EVENTS: EventItem[] = [
  {
    id: "decode-linkedin-shiju-mishal",
    slug: "decode-linkedin-shiju-mishal",
    title: "LET'S DECODE LINKEDIN",
    tagline: "The LinkedIn Way · Professional Branding, Networking & Internships",
    description: "Full-day interactive workshop on unlocking the full potential of LinkedIn for personal branding, recruiter networking, and high-impact internship search.",
    fullDescription: "Elevates - LETS DECODE LINKEDIN (The LinkedIn Way) 🚀\n\n📅 Date: 22nd July 2026 (Wednesday)\n🕙 Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)\n\n🎙️ Speakers:\n• Shiju Roy — LinkedIn Coach\n• Mishal V P — Business Strategist\n\nJoin us for \"Let's Decode LinkedIn – The LinkedIn Way\", an interactive session designed to help students unlock the true potential of LinkedIn. Learn how to build a professional online presence, network effectively, and leverage LinkedIn to discover internships, career opportunities, and industry connections.\n\n🔹 What you'll learn:\n• Creating a professional and ATS-friendly LinkedIn profile\n• Building a strong personal brand & voice\n• Networking with recruiters and industry professionals\n• Finding internships and job opportunities through LinkedIn\n• Optimizing your profile algorithms to increase visibility & reach\n• Practical tips, strategies, and real-world insights from industry experts\n\n💻 Note:\nParticipants are encouraged to bring notebook and pen to follow along with the live demonstrations and optimize their LinkedIn profiles during the session.\n\nWhether you're just getting started or looking to enhance your professional presence, this session will equip you with the knowledge and practical skills to make LinkedIn work for your academic and career growth. 🚀",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Jul 22, 2026",
    endDate: "Jul 22, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-07-22T10:00:00+05:30",
    isoEndDate: "2026-07-22T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" },
    ],
    hosts: [
      { name: "Shiju Roy", role: "LinkedIn Coach" },
      { name: "Mishal V P", role: "Business Strategist" }
    ],
    topics: ["LinkedIn Optimization", "Personal Branding", "Networking Strategies", "Internship Search", "ATS Profile Building", "Career Growth"],
    attendeesCount: 80,
    coverImage: "/images/events/decode-linkedin-shiju-mishal.jpeg",
    featured: true
  },
  {
    id: "career-catalyst-baiju",
    slug: "career-catalyst-baiju",
    title: "CAREER CATALYST — WORKSHOP",
    tagline: "Want to Get Hired? Start Here · Employability, Resumes & Mock Interviews",
    description: "Full-day interactive employability and placement preparation workshop led by Prof. Baiju B S (Placement Head, MEA Engineering College).",
    fullDescription: "🚀 Career Catalyst – Interactive Employability & Placement Workshop\n\nStep into today’s competitive job market with an exclusive hands-on workshop designed to help you become placement-ready.\n\n📅 Date: 15 July 2026 (Wednesday)\n⏰ Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, EKCTC\n\n🎙️ Speaker:\nProf. Baiju B S\nPRO & Placement Head, MEA Engineering College\nPartner Coordinator – MIELES Project, University of Barcelona, Spain 🇪🇸\n\n✨ What you’ll experience:\n• Resume Building & ATS Optimization\n• Interactive Mock Interviews\n• Recruiter & Corporate Hiring Insights\n• Current Tech Job Market Trends\n• Career Guidance & Placement Strategies\n\n📌 Requirements:\n• Active LinkedIn Account 🔗\n• Updated Profile / Draft Resume\n\n⚠️ Limited registrations only.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Jul 15, 2026",
    endDate: "Jul 15, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-07-15T10:00:00+05:30",
    isoEndDate: "2026-07-15T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" }
    ],
    hosts: [
      { name: "Prof. Baiju B S", role: "Placement Head (MEA) · Partner Coord., MIELES (Univ. of Barcelona)" }
    ],
    topics: ["Career Catalyst", "Employability", "Placement Strategies", "Resume Optimization", "Mock Interviews", "LinkedIn Branding"],
    attendeesCount: 65,
    coverImage: "/images/events/career-catalyst-baiju.jpeg",
    featured: true
  },
  {
    id: "vibe-coding-brototype",
    slug: "vibe-coding-brototype",
    title: "VIBE CODING WORKSHOP",
    tagline: "Build, Create & Innovate · AI-Assisted Rapid Development with Brototype",
    description: "Full-day hands-on Vibe Coding workshop conducted by Brototype and powered by ELEVATES, featuring rapid prototyping with AI tools, Git/GitHub, and Firebase.",
    fullDescription: "Elevates - Vibe Coding Workshop Conducted by Brototype ⚡\n\nBuild, Create & Innovate with modern AI-driven developer workflows!\n\n📅 Date: 26th March 2026 (Thursday)\n⏰ Time: 10:00 AM – 4:00 PM\n📍 Venue: Seminar Hall, Eranad Knowledge City (EKC) Technical Campus\n\n🎙️ Speakers & Mentors:\n• Jobin Selvanose — Lead Software Engineer & Content Creator, Brototype\n• Umar Muqthar — Head of Placements at Brototype\n\nOrganized by: ELEVATES\nPartnered by: Brototype\n\n🔹 What you’ll learn:\n• Fundamentals of Vibe Coding & AI-assisted development\n• Accelerating full-stack prototyping with LLM coding agents\n• Version control best practices with Git & GitHub\n• Real-time backend setup & rapid deployment using Firebase\n• Building and shipping functional web applications in hours\n\n💻 Important Instructions & Requirements:\nTo ensure a productive hands-on experience, all participants must adhere to the following:\n• Individual Hardware: Every student must bring their own laptop. Laptop sharing is strictly prohibited due to the nature of the technical sessions.\n• Mandatory Software Installation: Please ensure the following are installed and configured on your system before arriving at the venue:\n  1. Antigravity / AI Coding IDE\n  2. Git\n  3. GitHub Account\n  4. Firebase CLI & Account",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Mar 26, 2026",
    endDate: "Mar 26, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-03-26T10:00:00+05:30",
    isoEndDate: "2026-03-26T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" },
      { name: "Brototype" },
    ],
    hosts: [
      { name: "Jobin Selvanose", role: "Lead Software Engineer & Content Creator, Brototype" },
      { name: "Umar Muqthar", role: "Head of Placements, Brototype" }
    ],
    topics: ["Vibe Coding", "AI-Assisted Coding", "Antigravity", "Git & GitHub", "Firebase Deployment", "Rapid Prototyping"],
    attendeesCount: 70,
    coverImage: "/images/events/vibe-coding-brototype.jpeg",
    featured: true
  },
  {
    id: "cse-association-revamp-mehar",
    slug: "cse-association-revamp-mehar",
    title: "REVAMP OF CSE ASSOCIATION",
    tagline: "Official Association Relaunch · Chief Guest Mehar M P (Co-Founder, TinkerHub)",
    description: "Official relaunch and revamp of the Computer Science Engineering Association at EKCTC with Chief Guest Mehar M P (Co-Founder, TinkerHub).",
    fullDescription: "Revamp of CSE Association – 2026\n\nWe are delighted to announce the official Revamp of the CSE Association, marking a new chapter of innovation, collaboration, and excellence.\n\n📅 Date: 25th March 2026\n⏰ Time: 2:00 PM – 4:00 PM\n📍 Venue: Seminar Hall, EKCTC\n\nWe are honored to welcome Mr. Mehar M P, Co-Founder of TinkerHub, as our Chief Guest, who will share valuable insights and inspire the next generation of tech innovators.\n\nJoin us as we redefine the future of the CSE community and embark on an exciting journey ahead. 🚀",
    format: "Campus Exclusive",
    category: "Meetup",
    status: "Completed",
    startDate: "Mar 25, 2026",
    endDate: "Mar 25, 2026",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    isoStartDate: "2026-03-25T14:00:00+05:30",
    isoEndDate: "2026-03-25T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" },
      { name: "Dept of CSE" },
    ],
    hosts: [
      { name: "Mehar M P", role: "Chief Guest · Co-Founder, TinkerHub" }
    ],
    topics: ["CSE Association", "Celestia", "TinkerHub", "Tech Leadership", "Community Relaunch", "Open Source & Building"],
    attendeesCount: 80,
    coverImage: "/images/events/cse-association-revamp-mehar.jpeg",
    featured: true
  },
  {
    id: "aids-association-inauguration",
    slug: "aids-association-inauguration",
    title: "AI & DS ASSOCIATION INAUGURATION",
    tagline: "Inauguration & Industry Keynote · Guests from Elyst AI",
    description: "Inauguration ceremony of the AI & Data Science Association at EKCTC, featuring keynote sessions by Elyst AI Co-Founders Fathima Shirin P (CEO) and Nihal Anas (CAIO).",
    fullDescription: "✨ A new chapter begins.\n\nThe Department of AI & DS proudly presents the Inauguration of the AI & DS Association, marking the beginning of innovation, collaboration, and future-ready learning.\n\n📅 12 March 2026\n⏰ 10:00 AM\n📍 Seminar Hall, EKCTC\n\nWe are honored to have inspiring guests from Elyst AI joining us for this special occasion:\n🎤 Fathima Shirin P — CEO & Co-Founder, Elyst AI\n🎤 Nihal Anas — Chief AI Officer & Co-Founder, Elyst AI\n\nJoin us as we inaugurate a platform dedicated to innovation, technology, and the future of Artificial Intelligence and Data Science. 🚀",
    format: "Campus Exclusive",
    category: "Meetup",
    status: "Completed",
    startDate: "Mar 12, 2026",
    endDate: "Mar 12, 2026",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    isoStartDate: "2026-03-12T10:00:00+05:30",
    isoEndDate: "2026-03-12T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" },
      { name: "Dept of AI & DS" },
    ],
    hosts: [
      { name: "Fathima Shirin P", role: "CEO & Co-Founder, Elyst AI" },
      { name: "Nihal Anas", role: "Chief AI Officer & Co-Founder, Elyst AI" }
    ],
    topics: ["Artificial Intelligence", "Data Science", "Elyst AI", "AI Startups", "Association Inauguration", "Industry Keynote"],
    attendeesCount: 68,
    coverImage: "/images/events/aids-association-inauguration.jpeg",
    featured: true
  },
  {
    id: "elevates-campus-launch-ekctc",
    slug: "elevates-campus-launch-ekctc",
    title: "ELEVATES CAMPUS LAUNCH",
    tagline: "Official Chapter Opening & Leadership Handover · Chief Guest Shibili Rahman KP",
    description: "Official ELEVATES Campus Chapter Launch and leadership handover ceremony at EKCTC, featuring Chief Guest Shibili Rahman KP (Founder & Chairman, RAC Global).",
    fullDescription: "We are thrilled to announce the Elevates Campus Launch Event at Eranad Knowledge City Technical Campus!\n\n📅 March 04, 2026\n⏰ 10:00 AM\n📍 Seminar Hall, EKCTC\n\nWe are honored to welcome Shibili Rahman KP, Founder & Chairman of RAC Global, as our Chief Guest for this special occasion.\n\nThis is not just a launch.\nThis is the beginning of a new era of innovation, leadership, and student-driven impact.\n\nOfficial campus chapter opening and leadership handover ceremony coordinated by Team Elevates.\n\nBe there. Witness the start.\nLet’s Elevate Together. 🔥",
    format: "Campus Exclusive",
    category: "Meetup",
    status: "Completed",
    startDate: "Mar 04, 2026",
    endDate: "Mar 04, 2026",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    isoStartDate: "2026-03-04T10:00:00+05:30",
    isoEndDate: "2026-03-04T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" }
    ],
    hosts: [
      { name: "Shibili Rahman K P", role: "Chief Guest · Founder & Chairman, RAC Global" },
      { name: "Team Elevates", role: "Campus Chapter Lead" }
    ],
    topics: ["Campus Launch", "Chapter Opening", "Student Leadership", "RAC Global", "Innovation & Impact", "Community Handover"],
    attendeesCount: 121,
    coverImage: "/images/events/campus-launch-ekctc.jpeg",
    featured: true
  },
  {
    id: "basics-of-iot-naval",
    slug: "basics-of-iot-naval",
    title: "BASICS OF IOT WORKSHOP",
    tagline: "Step Into the World of IoT · Sensors, Microcontrollers & Cloud Dashboards",
    description: "Full-day hands-on workshop on smart sensors, microcontroller interfacing, MQTT protocols, and real-time cloud data monitoring.",
    fullDescription: "🚀 Basics of IoT Workshop is here!\n\nA beginner-friendly, hands-on workshop designed to introduce students to the fundamentals of the Internet of Things (IoT) and how smart devices communicate, collect data, and automate real-world processes.\n\nThis session focuses on building a strong foundation in connected systems, embedded technologies, and practical IoT applications that are widely used in industries, startups, and smart environments.\n\n🔹 What you’ll learn:\n• What is IoT and how it works\n• Understanding smart devices and connected systems\n• Basics of sensors and actuators\n• Introduction to microcontrollers (Arduino / ESP-based boards)\n• How devices communicate over the internet\n• IoT architecture and data flow\n• Real-world IoT applications (Smart homes, healthcare monitoring, smart agriculture, industrial automation)\n• Communication protocols (WiFi, Bluetooth, MQTT basics)\n• Cloud integration basics & real-time monitoring concepts\n\n🛠️ Hands-On IoT Session:\n• Setting up a basic IoT project\n• Interfacing sensors with microcontrollers\n• Reading and processing sensor data\n• Sending data to a cloud/dashboard\n• Building a simple smart automation prototype\n\n⚙️ Additional Technical Concepts:\n• Introduction to embedded systems\n• Basics of circuit connections and hardware safety\n• Power management concepts & hardware troubleshooting\n• Career opportunities in IoT and Embedded Systems\n• How IoT integrates with AI, Cybersecurity & Web Applications\n\n💻 Note: Laptop is mandatory for the hands-on session to get maximum practical exposure from the workshop.\n\nWhether you are completely new to IoT or curious about how smart systems work behind the scenes, this workshop will give you a strong practical foundation to explore IoT projects, research, startups, and future career opportunities.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Feb 19, 2026",
    endDate: "Feb 19, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-02-19T10:00:00+05:30",
    isoEndDate: "2026-02-19T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" }
    ],
    hosts: [
      { name: "Naval K Raj", role: "Embedded & IoT Lead (S2 Cyber)" }
    ],
    topics: ["Internet of Things (IoT)", "Embedded Systems", "Sensors & Actuators", "Microcontrollers", "MQTT & Cloud Dashboards", "Hardware Prototyping"],
    attendeesCount: 25,
    coverImage: "/images/events/basics-of-iot-naval.jpeg",
    featured: true
  },
  {
    id: "dgps-land-survey-favad",
    slug: "dgps-land-survey-favad",
    title: "LAND SURVEY USING DGPS — WORKSHOP",
    tagline: "Modern Land Surveying & Differential GPS Technology in Action",
    description: "Practical outdoor hands-on surveying workshop on DGPS (Differential GPS) technology, geospatial data, and precision field mapping.",
    fullDescription: "Land Survey Using DGPS – Workshop is here!\n\nGet introduced to modern land surveying techniques using DGPS (Differential GPS) and understand how real-world surveying is done 📍🛰️\n\n✨ What you’ll learn:\n• Basics of land surveying\n• Introduction to DGPS technology\n• Applications of DGPS in civil & land surveys\n• Practical insights into modern surveying methods\n• Real-world use cases and career relevance\n\n🧑‍🏫 Technical & concept-oriented learning conducted live on the field.\n\n🎯 Exclusive cohort for First Year students.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Jan 19, 2026",
    endDate: "Jan 19, 2026",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    isoStartDate: "2026-01-19T10:00:00+05:30",
    isoEndDate: "2026-01-19T13:00:00+05:30",
    venue: "EKC Volleyball Court (Outdoor Field), EKCTC",
    locationName: "",
    organizer: [
      { name: "ELEVATES" },
      { name: "Dept of Civil Engineering" }
    ],
    hosts: [
      { name: "Favad", role: "Surveying & Civil Lead (S8 Civil)" }
    ],
    topics: ["DGPS Surveying", "Differential GPS", "Civil Engineering", "Geospatial Mapping", "Field Surveying"],
    attendeesCount: 30,
    coverImage: "/images/events/dgps-survey-favad.jpeg",
    featured: true
  },
  {
    id: "modern-web-design-danish",
    slug: "modern-web-design-danish",
    title: "MODERN WEB DESIGN WORKSHOP",
    tagline: "Web Fundamentals, UI/UX, Bootstrap 5 & GitHub Pages Deployment",
    description: "Full-day hands-on workshop covering web fundamentals, responsive Bootstrap 5 design, and live portfolio deployment on GitHub Pages.",
    fullDescription: "A beginner-friendly, hands-on workshop designed to introduce students to modern web development and design, helping them understand how websites are built, designed, deployed, and maintained in real-world scenarios.\n\nThis session focuses on building a strong foundation in web technologies, UI/UX thinking, and practical deployment skills that are essential for academics, personal branding, freelancing, and startup projects.\n\n🔹 What you’ll learn:\n• What a website is and how it works\n• Understanding domains, hosting, and browsers\n• How modern websites function on the internet\n• Core UI/UX design principles\n• Designing user-friendly and visually appealing interfaces\n• Web development fundamentals (HTML, CSS, JavaScript)\n• Responsive web design using Bootstrap 5\n• Making websites mobile-friendly and device-responsive\n\n🛠️ Hands-On Website Building:\n• Creating a personal portfolio website\n• Using professional, industry-style templates\n• Structuring sections like About, Skills, Projects, and Contact\n• Free website hosting using GitHub Pages\n• Deploying your website live on the internet\n• Connecting a custom domain to your website & DNS linking\n\n⚙️ Additional Technical Concepts:\n• Basic SEO techniques\n• Sitemap creation and search engine visibility\n• Introduction to Git & GitHub (commands & version control)\n\n💻 Note: Students are encouraged to bring their laptops for hands-on activities to get the maximum practical benefit from the workshop.\n\nWhether you are completely new to web development or want to build your first professional website, this workshop will give you a solid foundation to apply these skills in academics, personal portfolios, freelancing, startups, and future career opportunities.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Jan 12, 2026",
    endDate: "Jan 12, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-01-12T10:00:00+05:30",
    isoEndDate: "2026-01-12T16:00:00+05:30",
    venue: "Lab 4, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "",
    organizer: [
      { name: "ELEVATES" }
    ],
    hosts: [
      { name: "Danish", role: "Web Design Lead (S2 Cyber)" }
    ],
    topics: ["Web Design", "UI/UX Design", "HTML & CSS", "Bootstrap 5", "GitHub Pages", "Git & GitHub"],
    attendeesCount: 46,
    coverImage: "/images/events/modern-web-design-danish.jpeg",
    featured: true
  },
  {
    id: "no-code-ai-anshiq",
    slug: "no-code-ai-anshiq",
    title: "NO-CODE AI & AUTOMATION WORKSHOP",
    tagline: "Build Powerful AI Automations & Agents with n8n Without Writing Code",
    description: "Full-day hands-on workshop on n8n, AI workflow chaining, webhook triggers, and autonomous agent building without code.",
    fullDescription: "A beginner-friendly and practical workshop designed to introduce students to AI Automation and no-code workflows, helping them understand how modern automation systems and AI agents are built and used in real-world scenarios.\n\n🔹 What you’ll learn:\n• What is AI Automation\n• LLMs → AI Workflows → AI Agents\n• Traditional Automation — reliable backbone\n• Dynamic AI Automation — flexible backbone\n• Where AI Agents fit in automation systems\n\n🛠️ Practical Foundation:\n• n8n fundamentals (nodes, canvas, linear & non-linear workflows)\n• JSON basics for automation\n• APIs — sending data\n• Webhooks — receiving data\n\n⚙️ Live Workflow Builds:\n• Student Data Collector — triggers & data flow\n• Auto Email System — variables & email automation\n• AI Auto-Summary Bot — AI integration\n• Daily Report Automation — full system design\n\n🔹 Additional Concepts:\n• Prompting AI models\n• Test-Driven Development\n• Hosting n8n (Free vs Hostinger)\n\n💻 Note: Participants are requested to bring their laptops for hands-on activities.\n\nWhether you are new to automation or curious about AI-powered workflows, this workshop will provide a strong foundation to apply these skills in academics, projects, startups, and future career opportunities.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Jan 07, 2026",
    endDate: "Jan 07, 2026",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2026-01-07T10:00:00+05:30",
    isoEndDate: "2026-01-07T16:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "Dept of CSBS" },
      { name: "IEDC EKCTC" }
    ],
    hosts: [
      { name: "Anshiq", role: "AI & Automation Lead (S4 CSBS)" }
    ],
    topics: ["n8n Automation", "AI Agents", "LLM Workflows", "Webhooks & APIs", "Workflow Automation"],
    attendeesCount: 72,
    coverImage: "/images/events/no-code-ai-anshiq.jpeg",
    featured: true
  },
  {
    id: "digital-marketing-kalkus",
    slug: "digital-marketing-kalkus",
    title: "DIGITAL MARKETING WORKSHOP",
    tagline: "By Kalkus Studio · Brand Growth, Social Media Strategy, SEO & Ad Analytics",
    description: "A practical beginner-friendly workshop by Kalkus Studio covering digital brand growth, SEO/SEM mechanics, content strategy, and ad analytics.",
    fullDescription: "A beginner-friendly and practical workshop designed to introduce students to the fast-growing world of Digital Marketing — perfect for anyone looking to build skills that are in high demand across all industries.\n\n🔹 What you’ll learn:\n• Fundamentals of Digital Marketing\n• How brands use social media to grow\n• Basics of SEO, SEM & content strategy\n• Understanding ad campaigns and analytics\n• Real-world examples and hands-on insights\n\n💻 Note: Maximum participants are requested to bring their laptops for the hands-on activities.\n\nWhether you’re completely new to digital marketing or looking to strengthen your understanding, this workshop will give you a solid foundation to start your journey into the digital world and help you apply these skills in academics, projects, or even freelance work.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Dec 10, 2025",
    endDate: "Dec 10, 2025",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    isoStartDate: "2025-12-10T10:00:00+05:30",
    isoEndDate: "2025-12-10T13:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "Kalkus Studio" },
      { name: "IEDC EKCTC" }
    ],
    hosts: [
      { name: "Salim Salhaan", role: "Co-Founder & Design Head, Kalkus Studio" },
      { name: "Muhammed Anas", role: "Co-Founder & Technical Head, Kalkus Studio" }
    ],
    topics: ["Digital Marketing", "Social Media Strategy", "SEO & SEM", "Content Strategy", "Ad Analytics"],
    attendeesCount: 71,
    coverImage: "/images/events/digital-marketing-kalkus.jpeg",
    featured: true
  },
  {
    id: "cyber-raid-ctf",
    slug: "cyber-raid-ctf",
    title: "CYBER RAID — CAPTURE THE FLAG",
    tagline: "Hack. Solve. Conquer · ₹1500 Prize Pool by ELEVATES",
    description: "Competitive Capture The Flag battlefield featuring binary exploitation, cryptic challenges, web exploitation, and network defense drills.",
    fullDescription: "The ultimate cybersecurity battlefield where builders race to crack cryptic vulnerability stages, bypass authentication barriers, decode cipher suites, and claim the victory flags.\n\nHosted as the competitive capstone of the Cybersecurity Defense Peer Lab, testing practical terminal defense and exploitation drills with a ₹1,500 prize pool.",
    format: "Campus Exclusive",
    category: "Challenge",
    status: "Completed",
    startDate: "Oct 09, 2025",
    endDate: "Oct 09, 2025",
    startTime: "10:00 AM",
    endTime: "4:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30",
    isoEndDate: "2025-10-09T16:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)",
    organizer: [
      { name: "ELEVATES" }
    ],
    hosts: [
      { name: "Adhinan K", role: "CTF Lead & Cybersecurity Researcher (CSE S7)" }
    ],
    topics: ["CTF (Capture The Flag)", "Reverse Engineering", "Web Exploitation", "Cryptography", "Network Forensics"],
    attendeesCount: 45,
    coverImage: "/images/events/adhinan-ctf.jpeg",
    featured: true,
    peerLabSlug: "cybersec-defense-lab",
    peerLabTitle: "Capstone of 'Cybersecurity Lab'",
    locationName: ""
  },
  {
    id: "buzzer-to-buzzer",
    slug: "buzzer-to-buzzer",
    title: "BUZZER TO BUZZER — TECH QUIZ",
    tagline: "Only the Fastest Mind Wins · High-Stakes Tech Quiz Battle",
    description: "High-stakes head-to-head buzzer quiz battle testing reflexes, logic, and core engineering knowledge during VIBRANIUM 5.0 TechFest.",
    fullDescription: "High-stakes quiz battles where only the fastest mind wins. Hit the buzzer before anyone else, test your reflexes, logic, and core technical knowledge in head-to-head showdowns to claim victory and certificates.\n\nHosted as part of the VIBRANIUM 5.0 TechFest powered by ELEVATES, presented by the Department of Cyber Security and Mechanical Engineering in collaboration with IEDC EKCTC.",
    format: "Campus Exclusive",
    category: "Challenge",
    status: "Completed",
    startDate: "Oct 09, 2025",
    endDate: "Oct 09, 2025",
    startTime: "10:00 AM",
    endTime: "3:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30",
    isoEndDate: "2025-10-09T15:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" },
      { name: "Dept of Cyber Security" },
      { name: "Dept of Mechanical Engineering" }
    ],
    hosts: [
      { name: "Mohammed Mijvad", role: "Event Co-ordinator" }
    ],
    topics: ["Tech Trivia", "Buzzer Battle", "Rapid Logic", "Cybersecurity", "Engineering Fundamentals"],
    attendeesCount: 36,
    coverImage: "/images/events/buzzer-to-buzzer.jpeg",
    featured: false
  },
  {
    id: "vibranium-vibe-coding",
    slug: "vibranium-vibe-coding",
    title: "VIBRANIUM 5.0 — VIBE CODING",
    tagline: "Code & Conquer · ₹250 Prize Pool by ELEVATES",
    description: "Two-hour dynamic vibe coding workshop and speed programming challenge with a ₹250 prize pool during VIBRANIUM 5.0 TechFest.",
    fullDescription: "Ready to dominate the code floor? ELEVATES presents VIBRANIUM 5.0 Vibe Coding! Structured as a 1st-hour basic vibe coding session followed by an intense 2nd-hour live coding challenge. Show off your skills, solve real programming problems, and prove you have the best vibe when it comes to programming.\n\nBrought to you by the Department of Computer Science Engineering at Eranad Knowledge City Technical Campus (EKCTC), with support from IEDC EKC and powered by ELEVATES.",
    format: "Campus Exclusive",
    category: "Challenge",
    status: "Completed",
    startDate: "Oct 09, 2025",
    endDate: "Oct 09, 2025",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30",
    isoEndDate: "2025-10-09T12:00:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" },
      { name: "Dept of Computer Science Engineering" }
    ],
    hosts: [
      { name: "Sarhan Qadir KVM", role: "Event Co-ordinator & Facilitator" }
    ],
    topics: ["Vibe Coding", "AI-Assisted Coding", "Rapid Prototyping", "Speed Coding", "Problem Solving"],
    attendeesCount: 35,
    coverImage: "/images/events/vibe-coding-vibranium.jpeg",
    featured: false
  },
  {
    id: "vibranium-ai-battle",
    slug: "vibranium-ai-battle",
    title: "VIBRANIUM 5.0 — AI BATTLE ARENA",
    tagline: "Where Powerful LLMs Collide · Live AI Chess Duels",
    description: "Interactive AI showcase stall where LLM models (DeepSeek, GPT-OSS, Mistral, Gemini) battle in digital chess duels.",
    fullDescription: "Witness the future of intelligence at the AI Battle Arena! An interactive exhibition stall and demonstration session where powerful AI minds collide in thrilling digital chess duels. Watch DeepSeek Chat V3.1, GPT-OSS-20B, Mistral Small 3.2, and Gemini 2.5 Pro duel in real-time, showcasing algorithmic reasoning, strategic evaluation, and game-tree decision making.\n\nHosted as part of VIBRANIUM 5.0 by the Department of Computer Science and Business Systems (CSBS) in collaboration with IEDC EKC and powered by ELEVATES.",
    format: "Campus Exclusive",
    category: "Showcase",
    status: "Completed",
    startDate: "Oct 09, 2025",
    endDate: "Oct 09, 2025",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30",
    isoEndDate: "2025-10-09T16:00:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" },
      { name: "Dept of Computer Science & Business Systems (CSBS)" }
    ],
    hosts: [
      { name: "Mashood M", role: "Event Co-ordinator & AI Lead" }
    ],
    topics: ["Artificial Intelligence", "LLM Reasoning", "AI Chess Battle", "Autonomous Agents", "DeepSeek vs Gemini"],
    attendeesCount: 35,
    coverImage: "/images/events/ai-battle-vibranium.jpeg",
    featured: false
  },
  {
    id: "vibranium-qr-treasure-hunt",
    slug: "vibranium-qr-treasure-hunt",
    title: "VIBRANIUM 5.0 — QR TREASURE HUNT",
    tagline: "Campus-Wide Cryptic QR Challenge by ELEVATES & Vibranium",
    description: "An interactive campus-wide cryptographic scavenger hunt hosted during Vibranium 5.0 TechFest with algorithmic clues and QR checkpoints.",
    fullDescription: "An interactive campus adventure hosted during the Vibranium 5.0 TechFest. Participants solve cryptic algorithmic riddles, scan geo-distributed QR checkpoints across Eranad Knowledge City, and race against the clock to crack clues and claim the prize pool.\n\nAll event team registrations and checkpoint logs were powered directly by the Vibranium TechFest event platform built by ELEVATES.",
    format: "Campus Exclusive",
    category: "Challenge",
    status: "Completed",
    startDate: "Oct 09, 2025",
    endDate: "Oct 09, 2025",
    startTime: "10:00 AM",
    endTime: "1:30 PM",
    isoStartDate: "2025-10-09T10:00:00+05:30",
    isoEndDate: "2025-10-09T13:30:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" },
      { name: "Dept of AI & Data Science" },
      { name: "Dept of Safety & Fire Engineering" }
    ],
    hosts: [
      { name: "Muhammed Fiyas", role: "Challenge Lead" }
    ],
    topics: ["QR Codes", "Cryptic Clues", "Campus Scavenger", "Logic & Puzzles", "Vibranium Platform"],
    attendeesCount: 30,
    coverImage: "/images/events/qr-tressure-hunt-vibranium.jpeg",
  },
  {
    id: "first-spark-electronics",
    slug: "first-spark-electronics",
    title: "FIRST SPARK — BASICS OF ELECTRONICS",
    tagline: "Circuit Fundamentals & Semiconductors by Sahad Nisham K",
    description: "Beginner-friendly hands-on session covering essential building blocks of electronic systems, passive components, semiconductors, and real-world circuit design.",
    fullDescription: "A beginner-friendly session designed to introduce students to the fascinating world of electronics, covering the essential building blocks that form the heart of every electronic system.\n\nParticipants learn the core concepts of voltage, current, and power, understand passive components (resistors, capacitors, and inductors), explore semiconductor devices (diodes, transistors, and MOSFETs), and discover how these elements connect in real-world functional circuits.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Sep 26, 2025",
    endDate: "Sep 26, 2025",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    isoStartDate: "2025-09-26T10:00:00+05:30",
    isoEndDate: "2025-09-26T16:00:00+05:30",
    venue: "ECE Digital Lab, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" },
      { name: "Electronauts (ECE Dept)" }
    ],
    hosts: [
      { name: "Sahad Nisham K", role: "Electronics Lead (S5 ECE)" }
    ],
    topics: ["Voltage & Current", "Passive Components", "Semiconductors", "Diodes & Transistors", "Circuit Design"],
    attendeesCount: 32,
    coverImage: "/images/events/spark-sahad-nisham.jpeg",
  },
  {
    id: "stap-skill-assessment",
    slug: "stap-skill-assessment",
    title: "STAP — SKILL TASTE ASSESSMENT",
    tagline: "Find Your Skill & Build Your Portfolio by Skilltrai",
    description: "Hands-on assessment workshop exploring AI, data analytics, UI/UX, and digital freelancing to build personal project portfolios.",
    fullDescription: "A hands-on Skill Taste Assessment workshop where participants test in-demand technical domains—including AI prompt workflows, data analysis, UI/UX design, and digital freelancing tracks—using free tools to identify core strengths and build personal project roadmaps.\n\nParticipants are strongly encouraged to bring their laptops for live exercises and mini portfolio outputs.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Sep 22, 2025",
    endDate: "Sep 22, 2025",
    startTime: "2:00 PM",
    endTime: "5:30 PM",
    isoStartDate: "2025-09-22T14:00:00+05:30",
    isoEndDate: "2025-09-22T17:30:00+05:30",
    venue: "Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "Skilltrai Freelance Academy" }
    ],
    hosts: [
      { name: "Ikhlas PV", role: "Founder, AI Engineer" },
      { name: "Mohammed Shareef AT", role: "Co-Founder, COO & Data Analyst" },
      { name: "Muhammed Jasim", role: "Co-Founder, CMO" }
    ],
    topics: ["AI & Prompts", "Data Analytics", "UI/UX Design", "Freelancing", "Portfolio Building"],
    attendeesCount: 72,
    coverImage: "/images/events/stap-by-skilltrai.jpeg",
  },
  {
    id: "cybersec-basics",
    slug: "cybersec-basics",
    title: "CYBERSECURITY WORKSHOP",
    tagline: "Hands-on Kali Linux & Defensive Security by Adhinan K",
    description: "Hands-on cybersecurity workshop covering Kali Linux terminal navigation, network defense, and practical ethical hacking fundamentals.",
    fullDescription: "A hands-on, practical cybersecurity workshop designed to take students from terminal basics to practical network defense. Participants learn Kali Linux command-line workflows, network scanning, packet analysis, and security fundamentals through live interactive drills.\n\nParticipants are requested to bring their laptops (pair sharing up to two students per laptop is supported) with Kali Linux pre-installed for hands-on lab exercises.",
    format: "Campus Exclusive",
    category: "Workshop",
    status: "Completed",
    startDate: "Sep 17, 2025",
    endDate: "Sep 25, 2025",
    startTime: "10:00 AM",
    endTime: "4:10 PM",
    isoStartDate: "2025-09-17T10:00:00+05:30",
    isoEndDate: "2025-09-25T16:10:00+05:30",
    venue: "Eranad Knowledge City Technical Campus (EKCTC)",
    locationName: "Cherukulam, Manjeri, Malappuram",
    organizer: [
      { name: "ELEVATES" },
      { name: "IEDC EKCTC" }
    ],
    hosts: [
      { name: "Adhinan K", role: "Cybersecurity Expert & Lead (CSE S7)" }
    ],
    topics: ["Cybersecurity", "Kali Linux", "Network Security", "Ethical Hacking", "Terminal"],
    attendeesCount: 76,
    coverImage: "/images/events/cybersecurity-workshop.jpeg",
    peerLabSlug: "cybersec-defense-lab",
    peerLabTitle: "Linked with 'Cybersecurity Lab'",
  }
];

export function getEventBySlug(slug: string): EventItem | undefined {
  return EVENTS.find((e) => e.slug === slug || e.id === slug);
}

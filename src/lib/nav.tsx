import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  FormInput,
  GitBranch,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  Megaphone,
  Palette,
  QrCode,
  Scale,
  ScrollText,
  Settings,
  Shield,
  SwatchBook,
  UserCog,
  Users,
  Waypoints,
  Code2,
} from "lucide-react";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { isHqRole, isSuperAdmin } from "@/lib/permissions";
import type { RoleKey } from "@/types";

const iconProps = { size: 18, strokeWidth: 1.5 } as const;

/** One unique Lucide icon per destination — do not reuse within a role's nav. */
const I = {
  home: <LayoutDashboard {...iconProps} />,
  analytics: <BarChart3 {...iconProps} />,
  calendar: <CalendarDays {...iconProps} />,
  chapters: <Building2 {...iconProps} />,
  usersAdmin: <UserCog {...iconProps} />,
  leadership: <Shield {...iconProps} />,
  roles: <Scale {...iconProps} />,
  reports: <FileText {...iconProps} />,
  resources: <Library {...iconProps} />,
  brand: <Palette {...iconProps} />,
  guidelines: <ScrollText {...iconProps} />,
  developer: <Code2 {...iconProps} />,
  certificates: <GraduationCap {...iconProps} />,
  alerts: <Bell {...iconProps} />,
  audit: <Activity {...iconProps} />,
  playbook: <Waypoints {...iconProps} />,
  workflows: <ClipboardList {...iconProps} />,
  design: <SwatchBook {...iconProps} />,
  chapter: <Building2 {...iconProps} />,
  events: <Calendar {...iconProps} />,
  forms: <FormInput {...iconProps} />,
  attendance: <QrCode {...iconProps} />,
  clusters: <Layers {...iconProps} />,
  projects: <FolderKanban {...iconProps} />,
  classes: <GraduationCap {...iconProps} />,
  students: <Users {...iconProps} />,
  tasks: <ClipboardList {...iconProps} />,
  announcements: <Megaphone {...iconProps} />,
  settings: <Settings {...iconProps} />,
  desk: <LayoutDashboard {...iconProps} />,
  myQr: <QrCode {...iconProps} />,
  referrals: <GitBranch {...iconProps} />,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  external?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function navGroupsForRole(
  roleKey: RoleKey,
  chapterSlug = "",
): NavGroup[] {
  const slug = chapterSlug || "";
  const base = slug ? `/chapter/${slug}` : "/chapter";
  const isCampusLeadRole = roleKey === "campus_lead";

  if (isHqRole(roleKey)) {
    const network: NavItem[] = [
      { href: "/hq/chapters", label: "Chapters", icon: I.chapters },
      ...(isSuperAdmin(roleKey)
        ? [{ href: "/hq/users", label: "Users", icon: I.usersAdmin }]
        : []),
      { href: "/hq/leadership", label: "Leadership", icon: I.leadership },
      { href: "/hq/permissions", label: "Roles", icon: I.roles },
      { href: "/hq/reports", label: "Reports", icon: I.reports },
      { href: "/hq/certificates", label: "Certificates", icon: I.certificates },
      { href: `/chapter/${chapterSlug}/clusters`, label: "Clusters", icon: I.clusters },
      { href: "/referrals", label: "Referrals", icon: I.referrals },
    ];

    return [
      {
        label: "Overview",
        items: [
          { href: "/hq", label: "Home", icon: I.home },
          { href: "/hq/analytics", label: "Analytics", icon: I.analytics },
          { href: "/hq/calendar", label: "Calendar", icon: I.calendar },
        ],
      },
      { label: "Network", items: network },
      {
        label: "Website CMS",
        items: [
          { href: "/hq/website/events", label: "Events Manager", icon: I.events },
          { href: "/hq/website/projects", label: "Projects Showcase", icon: I.projects },
          { href: "/hq/website/team", label: "Founders & Team", icon: I.students },
          { href: "/hq/website/for-colleges", label: "For Colleges", icon: I.chapters },
          { href: "/hq/website/peer-labs", label: "Peer Labs", icon: I.playbook },
        ],
      },
      {
        label: "Library",
        items: [
          { href: "/hq/resources", label: "Resources", icon: I.resources },
          { href: "/hq/brand", label: "Brand", icon: I.brand },
          { href: "/hq/guidelines", label: "Guidelines", icon: I.guidelines },
          { href: "/hq/playbook", label: "Playbook", icon: I.playbook },
        ],
      },
      {
        label: "More",
        items: [
          { href: "/hq/developer", label: "Developer API", icon: I.developer },
          { href: "/hq/notifications", label: "Notifications", icon: I.alerts },
          { href: "/hq/settings", label: "Settings", icon: I.settings },
          { href: "/hq/audit", label: "Audit", icon: I.audit },
          { href: "/workflows", label: "Demo loops", icon: I.workflows },
          { href: "/design-system", label: "Design system", icon: I.design },
        ],
      },

    ];
  }

  if (isFacultyRole(roleKey)) {
    return [
      {
        label: "Faculty",
        items: [
          { href: base, label: "Chapter Overview", icon: I.home },
          { href: `${base}/calendar`, label: "Calendar", icon: I.calendar },
          { href: `${base}/events`, label: "Events", icon: I.events },
          { href: `${base}/students`, label: "Students", icon: I.students },
          { href: `${base}/analytics`, label: "Analytics", icon: I.analytics },
          { href: `${base}/reports`, label: "Reports", icon: I.reports },
          { href: `${base}/forms`, label: "Forms", icon: I.forms },
          { href: `${base}/classes`, label: "Classes", icon: I.classes },
        ],
      },
      {
        label: "More",
        items: [
          { href: "/notifications", label: "Notifications", icon: I.alerts },
          { href: "/referrals", label: "Referrals", icon: I.referrals },
          { href: "/eos", label: "Playbook", icon: I.playbook },
        ],
      },
    ];
  }

  if (isExecutiveRole(roleKey)) {
    return [
      {
        label: "Home",
        items: [
          { href: base, label: "Chapter Workspace", icon: I.desk },
          { href: `${base}/analytics`, label: "Analytics", icon: I.analytics },
        ],
      },
      {
        label: "Programs",
        items: [
          { href: `${base}/calendar`, label: "Calendar", icon: I.calendar },
          { href: `${base}/events`, label: "Events", icon: I.events },
          { href: `${base}/forms`, label: "Forms", icon: I.forms },
          { href: `${base}/attendance`, label: "Attendance", icon: I.attendance },
          { href: `${base}/clusters`, label: "Clusters", icon: I.clusters },
          { href: `${base}/projects`, label: "Projects", icon: I.projects },
          { href: `${base}/classes`, label: "Classes", icon: I.classes },
        ],
      },
      {
        label: "People & ops",
        items: [
          { href: `${base}/students`, label: "Student Database & Requests", icon: I.students },
          { href: `${base}/settings`, label: "Chapter Invites & Custom Form", icon: I.forms },
          { href: `${base}/leadership`, label: "Leadership", icon: I.leadership },
          ...(isCampusLeadRole
            ? [{ href: "/hq/users", label: "Manage Roles", icon: I.usersAdmin }]
            : []),
          { href: `${base}/tasks`, label: "Tasks", icon: I.tasks },
          {
            href: `${base}/announcements`,
            label: "Announcements",
            icon: I.announcements,
          },
          { href: `${base}/reports`, label: "Reports", icon: I.reports },
          { href: `${base}/resources`, label: "Resources", icon: I.resources },
        ],
      },
      {
        label: "More",
        items: [
          { href: "/my-qr", label: "My QR Code", icon: I.myQr },
          { href: "/notifications", label: "Notifications", icon: I.alerts },
          { href: "/referrals", label: "Referrals", icon: I.referrals },
          { href: "/eos", label: "Playbook", icon: I.playbook },
        ],
      },
    ];
  }

  // Student
  return [
    {
      label: "Explore",
      items: [
        { href: base, label: "Chapter", icon: I.chapter },
        { href: "/join", label: "🔑 Join Chapter / Code", icon: I.forms },
        { href: `${base}/events`, label: "Events", icon: I.events },
        { href: `${base}/clusters`, label: "Clusters", icon: I.clusters },
        { href: `${base}/projects`, label: "Projects", icon: I.projects },
        { href: `${base}/reports`, label: "Reports", icon: I.reports },
        {
          href: `${base}/announcements`,
          label: "Announcements",
          icon: I.announcements,
        },
        { href: "/notifications", label: "Notifications", icon: I.alerts },
      ],
    },
    {
      label: "My Account",
      items: [
        { href: "/my-qr", label: "My QR Code", icon: I.myQr },
        { href: "/referrals", label: "Referrals", icon: I.referrals },
        { href: "/eos", label: "Playbook", icon: I.playbook },
      ],
    },
  ];
}

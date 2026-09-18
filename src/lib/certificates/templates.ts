import { CertificateTemplate } from "@/types";

export const DEFAULT_CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "tpl-default-recognition",
    name: "Official Recognition (Standard)",
    isDefault: true,
    mainTitle: "CERTIFICATE",
    subTitle: "O F   R E C O G N I T I O N",
    preamble: "T H I S   I S   T O   C E R T I F Y   T H A T",
    achievement: "Participation",
    description:
      "has been an active member of Elevates and has demonstrated dedication, curiosity, and a commitment to learning, building, and creating a better tomorrow.",
    signatory1Name: "Dr. K. S. Radhakrishnan",
    signatory1Role: "P R I N C I P A L",
    signatory2Name: "Prof. Ananya Sen",
    signatory2Role: "F A C U L T Y   A D V I S O R",
    bottomLeftText: "I D E A S   I N T O   I M P A C T",
    bottomRightText: "A   H I G H E R   T O M O R R O W",
    showGridPattern: true,
  },
  {
    id: "tpl-merit-excellence",
    name: "Merit & Excellence Award",
    isDefault: false,
    mainTitle: "CERTIFICATE",
    subTitle: "O F   M E R I T   &   E X C E L L E N C E",
    preamble: "T H I S   H O N O R   I S   A W A R D E D   T O",
    achievement: "Merit & Excellence",
    description:
      "for displaying exceptional technical aptitude, innovation leadership, and superior distinction in community hackathons, workshops, and project incubation.",
    signatory1Name: "Dr. K. S. Radhakrishnan",
    signatory1Role: "P R I N C I P A L",
    signatory2Name: "Prof. Ananya Sen",
    signatory2Role: "F A C U L T Y   A D V I S O R",
    bottomLeftText: "I D E A S   I N T O   I M P A C T",
    bottomRightText: "A   H I G H E R   T O M O R R O W",
    showGridPattern: true,
  },
  {
    id: "tpl-workshop-lead",
    name: "Workshop & Peer Lab Lead",
    isDefault: false,
    mainTitle: "CERTIFICATE",
    subTitle: "O F   A P P R E C I A T I O N",
    preamble: "P R O U D L Y   P R E S E N T E D   T O",
    achievement: "Workshop Lead",
    description:
      "in grateful recognition of distinguished service, technical mentorship, and knowledge dissemination as an authorized Elevates peer lab instructor.",
    signatory1Name: "Dr. K. S. Radhakrishnan",
    signatory1Role: "P R I N C I P A L",
    signatory2Name: "Campus Lead",
    signatory2Role: "E L E V A T E S   E X E C U T I V E",
    bottomLeftText: "I D E A S   I N T O   I M P A C T",
    bottomRightText: "A   H I G H E R   T O M O R R O W",
    showGridPattern: true,
  },
  {
    id: "tpl-hackathon-champion",
    name: "Innovation & Hackathon Champion",
    isDefault: false,
    mainTitle: "CERTIFICATE",
    subTitle: "O F   A C H I E V E M E N T",
    preamble: "T H I S   I S   T O   C O N F E R   U P O N",
    achievement: "Hackathon Winner",
    description:
      "for outstanding performance, high-velocity engineering, and winning distinction at the campus innovation sprint and project showcase.",
    signatory1Name: "Campus Chairman",
    signatory1Role: "E L E V A T E S   C H A I R M A N",
    signatory2Name: "Faculty Coordinator",
    signatory2Role: "F A C U L T Y   A D V I S O R",
    bottomLeftText: "I D E A S   I N T O   I M P A C T",
    bottomRightText: "A   H I G H E R   T O M O R R O W",
    showGridPattern: true,
  },
];

const STORAGE_KEY = "elevates_custom_certificate_templates";

export function getCertificateTemplates(chapterId?: string): CertificateTemplate[] {
  if (typeof window === "undefined") {
    return DEFAULT_CERTIFICATE_TEMPLATES;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CERTIFICATE_TEMPLATES;
    }
    const custom: CertificateTemplate[] = JSON.parse(raw);
    // Combine defaults and custom
    const combined = [...DEFAULT_CERTIFICATE_TEMPLATES];
    for (const item of custom) {
      if (!combined.some((t) => t.id === item.id)) {
        if (!chapterId || !item.chapterId || item.chapterId === chapterId) {
          combined.push(item);
        }
      }
    }
    return combined;
  } catch (err) {
    console.error("Failed to parse certificate templates:", err);
    return DEFAULT_CERTIFICATE_TEMPLATES;
  }
}

export function saveCertificateTemplate(template: CertificateTemplate): CertificateTemplate {
  if (typeof window === "undefined") return template;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: CertificateTemplate[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex((t) => t.id === template.id);

    if (index >= 0) {
      existing[index] = template;
    } else {
      existing.push(template);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return template;
  } catch (err) {
    console.error("Failed to save certificate template:", err);
    return template;
  }
}

export function deleteCertificateTemplate(id: string): boolean {
  if (typeof window === "undefined") return false;

  // Don't delete built-in defaults
  if (DEFAULT_CERTIFICATE_TEMPLATES.some((t) => t.id === id)) {
    return false;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const existing: CertificateTemplate[] = JSON.parse(raw);
    const filtered = existing.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error("Failed to delete certificate template:", err);
    return false;
  }
}

export interface Advisor {
  name: string;
  role: string;
  department: string;
  college: string;
  campusSlug?: string;
  image: string;
}

export const ADVISORS: Advisor[] = [
  {
    name: "Jasira KT",
    role: "Faculty Head",
    department: "Computer Science & Engineering",
    college: "Eranad Knowledge City, Manjeri",
    campusSlug: "eranad-knowledge-city",
    image: "/images/advisors/jasira-kt.jpeg",
  },
  {
    name: "Anu K Soman",
    role: "HOD",
    department: "Computer Science & Engineering",
    college: "Eranad Knowledge City, Manjeri",
    campusSlug: "eranad-knowledge-city",
    image: "/images/advisors/anu-ks.png",
  },
];
